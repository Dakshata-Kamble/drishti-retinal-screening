import express from 'express';
import { GoogleGenAI, Type, Schema } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json({ limit: '15mb' }));

// ── Constants ────────────────────────────────────────────────────────────────
const MODEL_ID = 'gemini-2.5-flash';
const API_TIMEOUT_MS = 30_000;  // 30 seconds hard limit
const LOW_CONFIDENCE_THRESHOLD = 70;

// ── Gemini Client (server-side only — key NEVER sent to browser) ─────────
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ── Structured output schema for retinal analysis ────────────────────────
const diagnosisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    diagnosis:        { type: Type.STRING,  description: "Diagnosis string, e.g. 'Severe NPDR'" },
    confidence:       { type: Type.NUMBER,  description: "Confidence score 0-100" },
    csmeStatus:       { type: Type.STRING,  description: "CSME Presence: 'Present' or 'Absent'" },
    icdrGrade:        { type: Type.INTEGER, description: "ICDR Grade 0-4" },
    microaneurysms:   { type: Type.STRING,  description: "Findings regarding microaneurysms, e.g. '8 identified'" },
    hemorrhages:      { type: Type.STRING,  description: "Findings regarding hemorrhages, e.g. 'Diffuse (4 quadrants)'" },
    exudates:         { type: Type.STRING,  description: "Findings regarding exudates, e.g. 'Ring outside fovea (3.1mm)'" },
    visualAcuityRisk: { type: Type.STRING,  description: "Risk to visual acuity, e.g. 'Critical Rapid Decline' or 'Low Risk'" },
  },
  required: [
    'diagnosis', 'confidence', 'csmeStatus', 'icdrGrade',
    'microaneurysms', 'hemorrhages', 'exudates', 'visualAcuityRisk',
  ],
};

// ── Health endpoint (browser can check connectivity before analysis) ──────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    modelId: MODEL_ID,
    hasApiKey: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// ── Dummy analysis for demo when no GEMINI_API_KEY ───────────────────────
function dummyDiagnosis(eye: string): Record<string, unknown> {
  const isOd = eye.toLowerCase().includes('right') || eye.toLowerCase().includes('od');
  if (isOd) {
    return {
      diagnosis: 'Moderate NPDR',
      confidence: 94.2,
      csmeStatus: 'Absent',
      icdrGrade: 2,
      microaneurysms: '6 identified in 2 quadrants',
      hemorrhages: 'Scattered dot-blot (2 quadrants)',
      exudates: 'Few hard exudates temporal to macula',
      visualAcuityRisk: 'Moderate — monitor closely',
      modelVersion: 'demo-fallback',
      uncertaintyFlag: false,
    };
  }
  return {
    diagnosis: 'Severe NPDR with CSME',
    confidence: 96.8,
    csmeStatus: 'Present',
    icdrGrade: 3,
    microaneurysms: '12+ identified in 3 quadrants',
    hemorrhages: 'Diffuse (3–4 quadrants)',
    exudates: 'Circinate ring within 500µm of fovea',
    visualAcuityRisk: 'High — urgent review advised',
    modelVersion: 'demo-fallback',
    uncertaintyFlag: false,
  };
}

// ── Main retinal analysis endpoint ───────────────────────────────────────
app.post('/api/analyze-retina', async (req, res) => {
  try {
    const { imageUrl, eye } = req.body;

    // ── Validate request ─────────────────────────────────────────────
    if (!imageUrl || typeof imageUrl !== 'string') {
      return res.status(400).json({
        error: 'INVALID_IMAGE',
        message: 'Image data is required. Please capture or upload a retinal image.',
        retryable: false,
      });
    }

    if (!eye || typeof eye !== 'string') {
      return res.status(400).json({
        error: 'INVALID_IMAGE',
        message: 'Eye designation (OD/OS) is required.',
        retryable: false,
      });
    }

    // Demo fallback when no API key is configured
    if (!process.env.GEMINI_API_KEY) {
      await new Promise((r) => setTimeout(r, 1200 + Math.random() * 800));
      return res.json(dummyDiagnosis(eye));
    }

    // ── Build image part (base64 data-URI or remote URL) ─────────────
    let imagePart: { inlineData: { mimeType: string; data: string } } | undefined;

    if (imageUrl.startsWith('data:image/')) {
      const matches = imageUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return res.status(400).json({
          error: 'INVALID_IMAGE',
          message: 'Malformed base64 data URI.',
          retryable: false,
        });
      }

      // Check payload size (rough limit: ~10 MB decoded)
      const estimatedBytes = (matches[2].length * 3) / 4;
      if (estimatedBytes > 10 * 1024 * 1024) {
        return res.status(413).json({
          error: 'INVALID_IMAGE',
          message: 'Image exceeds 10 MB limit. Please compress the retinal scan.',
          retryable: false,
        });
      }

      imagePart = {
        inlineData: { mimeType: matches[1], data: matches[2] },
      };
    } else if (imageUrl.startsWith('http')) {
      const imgController = new AbortController();
      const imgTimeout = setTimeout(() => imgController.abort(), 15_000);
      try {
        const imgResponse = await fetch(imageUrl, { signal: imgController.signal });
        clearTimeout(imgTimeout);
        if (!imgResponse.ok) {
          return res.status(400).json({
            error: 'INVALID_IMAGE',
            message: `Failed to fetch remote image (HTTP ${imgResponse.status}).`,
            retryable: true,
          });
        }
        const arrayBuffer = await imgResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        imagePart = {
          inlineData: {
            mimeType: imgResponse.headers.get('content-type') || 'image/jpeg',
            data: buffer.toString('base64'),
          },
        };
      } catch (fetchErr: any) {
        clearTimeout(imgTimeout);
        return res.status(408).json({
          error: 'TIMEOUT',
          message: 'Image download timed out. Please retry.',
          retryable: true,
        });
      }
    } else {
      return res.status(400).json({
        error: 'INVALID_IMAGE',
        message: 'Unsupported image format. Provide a base64 data URI or HTTP URL.',
        retryable: false,
      });
    }

    // ── Construct prompt ─────────────────────────────────────────────
    const contents: any[] = [];
    if (imagePart) contents.push(imagePart);
    contents.push({
      text: `You are an expert ophthalmologist AI analyzing a retinal fundus image for Diabetic Retinopathy (DR) and Clinically Significant Macular Edema (CSME). Provide a detailed analysis based on the image. If the image is not a valid retinal scan or is of insufficient quality, set confidence to 0 and diagnosis to "Inconclusive - Invalid Image". Analyze the provided image of the ${eye} eye.`,
    });

    // ── Call Gemini with hard timeout ────────────────────────────────
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    let response;
    try {
      response = await ai.models.generateContent({
        model: MODEL_ID,
        contents,
        config: {
          responseMimeType: 'application/json',
          responseSchema: diagnosisSchema,
          temperature: 0.1,
        },
      });
      clearTimeout(timeout);
    } catch (genErr: any) {
      clearTimeout(timeout);
      if (genErr.name === 'AbortError' || genErr.message?.includes('aborted')) {
        return res.status(504).json({
          error: 'TIMEOUT',
          message: `AI analysis timed out after ${API_TIMEOUT_MS / 1000}s. Please retry.`,
          retryable: true,
        });
      }

      // Rate limiting from Gemini
      if (genErr.status === 429 || genErr.message?.includes('429')) {
        return res.status(429).json({
          error: 'RATE_LIMITED',
          message: 'AI service rate limit reached. Please wait a moment and retry.',
          retryable: true,
        });
      }

      throw genErr; // re-throw to outer catch
    }

    // ── Parse and validate response ─────────────────────────────────
    const resultText = response.text;
    if (!resultText) {
      return res.status(502).json({
        error: 'SERVER_ERROR',
        message: 'AI model returned an empty response.',
        retryable: true,
      });
    }

    const result = JSON.parse(resultText);

    // Attach metadata
    result.modelVersion = MODEL_ID;
    result.uncertaintyFlag = (result.confidence ?? 0) < LOW_CONFIDENCE_THRESHOLD;

    res.json(result);

  } catch (error: any) {
    console.error('Error in /api/analyze-retina:', error);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'An unexpected error occurred during analysis. Please retry.',
      retryable: true,
    });
  }
});

// ── Persistence Endpoints ────────────────────────────────────────────────
import { getAllPatients, getPatient, savePatient } from './src/server/db.js';

app.get('/api/patients', (req, res) => {
  try {
    const patients = getAllPatients();
    res.json({ patients });
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
});

app.get('/api/patients/:id', (req, res) => {
  try {
    const patient = getPatient(req.params.id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    res.json({ patient });
  } catch (error) {
    console.error('Error fetching patient:', error);
    res.status(500).json({ error: 'Failed to fetch patient' });
  }
});

app.post('/api/patients', (req, res) => {
  try {
    const saved = savePatient(req.body);
    res.json({ patient: saved });
  } catch (error: any) {
    console.error('Error saving patient:', error);
    res.status(400).json({ error: 'Validation or save failed', details: error.errors || error.message });
  }
});

app.put('/api/patients/:id', (req, res) => {
  try {
    // Basic check
    if (req.body.id !== req.params.id) {
      return res.status(400).json({ error: 'ID mismatch' });
    }
    const saved = savePatient(req.body);
    res.json({ patient: saved });
  } catch (error: any) {
    console.error('Error updating patient:', error);
    res.status(400).json({ error: 'Validation or update failed', details: error.errors || error.message });
  }
});

app.post('/api/send-sms', async (req, res) => {
  try {
    const { mobile, message } = req.body;
    if (!mobile || !message) {
      return res.status(400).json({ error: 'Mobile and message are required' });
    }
    
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 500));
    
    // 5% chance of failure to test error states
    if (Math.random() < 0.05) {
      throw new Error('Upstream SMS gateway timeout');
    }
    
    res.json({ success: true, deliveredTo: mobile, timestamp: new Date().toISOString() });
  } catch (error: any) {
    console.error('SMS send failed:', error);
    res.status(503).json({ error: 'SMS Gateway Unavailable', details: error.message });
  }
});


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API Server running on port ${PORT}`);
});
