/**
 * Retinal Analysis API Client — frontend-only demo mode.
 * Generates structured DR screening results without a backend.
 */

import {
  DiagnosisResult,
  AnalysisError,
  AnalysisErrorCode,
} from '../types';

function makeError(
  code: AnalysisErrorCode,
  message: string,
  retryable = true,
): AnalysisError {
  return { code, message, retryable };
}

function dummyOd(): DiagnosisResult {
  return {
    diagnosis: 'Moderate NPDR',
    confidence: 94.2,
    csmeStatus: 'Absent',
    icdrGrade: 2,
    microaneurysms: '6 identified in 2 quadrants',
    hemorrhages: 'Scattered dot-blot (2 quadrants)',
    exudates: 'Few hard exudates temporal to macula',
    visualAcuityRisk: 'Moderate — monitor closely',
    modelVersion: 'demo-frontend',
    uncertaintyFlag: false,
    qualityAssessment: 'gradable',
    explainabilityNote: 'Microaneurysms and scattered hemorrhages in temporal and inferior fields. No CSME.',
  };
}

function dummyOs(): DiagnosisResult {
  return {
    diagnosis: 'Severe NPDR with CSME',
    confidence: 96.8,
    csmeStatus: 'Present',
    icdrGrade: 3,
    microaneurysms: '12+ identified in 3 quadrants',
    hemorrhages: 'Diffuse (3–4 quadrants)',
    exudates: 'Circinate ring within 500µm of fovea',
    visualAcuityRisk: 'High — urgent review advised',
    modelVersion: 'demo-frontend',
    uncertaintyFlag: false,
    qualityAssessment: 'gradable',
    explainabilityNote: 'Dense hard exudates near fovea consistent with CSME. Severe NPDR features present.',
  };
}

/**
 * Analyze both eyes (frontend demo — always succeeds after short delay).
 */
export async function analyzeRetina(
  _odImageUrl: string,
  _osImageUrl: string,
  signal?: AbortSignal,
): Promise<{ od: DiagnosisResult; os: DiagnosisResult; analyzedAt: string }> {
  // Simulate realistic model latency (~45s) — feels like a real inference backend
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, 45000 + Math.random() * 2000);
    if (signal) {
      signal.addEventListener('abort', () => {
        clearTimeout(t);
        reject(makeError('TIMEOUT', 'Analysis cancelled.', true));
      });
    }
  });

  if (signal?.aborted) {
    throw makeError('TIMEOUT', 'Analysis cancelled.', true);
  }

  return {
    od: dummyOd(),
    os: dummyOs(),
    analyzedAt: new Date().toISOString(),
  };
}

/**
 * Health check — always ok in frontend demo mode.
 */
export async function checkApiHealth(): Promise<{
  ok: boolean;
  modelId?: string;
  hasApiKey?: boolean;
  error?: string;
}> {
  return {
    ok: true,
    modelId: 'demo-frontend',
    hasApiKey: true,
  };
}

export async function sendSmsReferral(
  mobile: string,
  _message: string,
): Promise<{ success: boolean; deliveredTo: string }> {
  await new Promise((r) => setTimeout(r, 600));
  return { success: true, deliveredTo: mobile };
}

export type { AnalysisError };
