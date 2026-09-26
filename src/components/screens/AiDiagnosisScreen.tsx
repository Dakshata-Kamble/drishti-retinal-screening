import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ScreenId,
  Patient,
  TeleconsultDoctor,
  DiagnosisResult,
  AnalysisState,
  AnalysisError as AnalysisErrorType,
} from '../../types';
import { analyzeRetina, checkApiHealth, sendSmsReferral } from '../../services/retinaApi';
import { downloadScreeningReportPdf } from '../../services/reportPdf';

interface AiDiagnosisScreenProps {
  patient: Patient;
  doctor: TeleconsultDoctor;
  onNavigate: (screen: ScreenId) => void;
  onOpenFundusModal: (patient: Patient, eye?: 'OD' | 'OS') => void;
  onOpenTeleconsult: (patient: Patient) => void;
  onOpenPrintSlip: (patient: Patient) => void;
  showToast: (msg: string, icon?: string) => void;
  onUpdatePatient?: (updated: Partial<Patient>) => Promise<void>;
}

// ── Confidence thresholds ────────────────────────────────────────────────
const CONFIDENCE_LOW = 70;
const CONFIDENCE_MODERATE = 85;

function confidenceColor(c: number) {
  if (c >= CONFIDENCE_MODERATE) return 'text-emerald-700';
  if (c >= CONFIDENCE_LOW) return 'text-amber-700';
  return 'text-red-700';
}

function confidenceBg(c: number) {
  if (c >= CONFIDENCE_MODERATE) return 'bg-emerald-50 border-emerald-200';
  if (c >= CONFIDENCE_LOW) return 'bg-amber-50 border-amber-200';
  return 'bg-red-50 border-red-200';
}

function riskLabel(data: DiagnosisResult): { label: string; cls: string } {
  const risk = data.visualAcuityRisk?.toLowerCase() ?? '';
  if (risk.includes('critical') || risk.includes('high'))
    return { label: 'High Risk', cls: 'bg-red-100 text-red-800' };
  if (risk.includes('moderate') || risk.includes('medium'))
    return { label: 'Moderate', cls: 'bg-amber-100 text-amber-800' };
  return { label: 'Low Risk', cls: 'bg-emerald-100 text-emerald-800' };
}

// ── Error display mapping ────────────────────────────────────────────────
const ERROR_ICONS: Record<string, string> = {
  TIMEOUT: 'hourglass_disabled',
  NETWORK: 'wifi_off',
  SERVER_ERROR: 'cloud_off',
  INVALID_IMAGE: 'broken_image',
  RATE_LIMITED: 'speed',
  UNKNOWN: 'error',
};

export const AiDiagnosisScreen: React.FC<AiDiagnosisScreenProps> = ({
  patient,
  doctor,
  onNavigate,
  onOpenFundusModal,
  onOpenTeleconsult,
  onOpenPrintSlip,
  showToast,
  onUpdatePatient,
}) => {
  const [heatmapIntensity, setHeatmapIntensity] = useState(85);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSendingSms, setIsSendingSms] = useState(false);

  // ── Analysis state machine ─────────────────────────────────────────
  const [analysisState, setAnalysisState] = useState<AnalysisState>('idle');
  const [analysisData, setAnalysisData] = useState<{
    od: DiagnosisResult;
    os: DiagnosisResult;
    analyzedAt: string;
  } | null>(null);
  const [analysisError, setAnalysisError] = useState<AnalysisErrorType | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // ── Elapsed timer during analysis ──────────────────────────────────
  const [elapsedMs, setElapsedMs] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ── Clinician sign-off ─────────────────────────────────────────────
  const [clinicianConfirmed, setClinicianConfirmed] = useState(false);
  const [confirmedAt, setConfirmedAt] = useState<string | null>(null);

  // Frontend-only demo analysis (no server required)
  const [apiHealthy] = useState<boolean>(true);

  const hasOdScan = !!patient.odScanUrl;
  const hasOsScan = !!patient.osScanUrl;
  const hasBothScans = hasOdScan && hasOsScan;

  // Doctor remarks
  const [doctorNotes, setDoctorNotes] = useState(patient.ophthalmologistNotes || '');
  const [doctorDecision, setDoctorDecision] = useState<
    'pending' | 'accepted' | 'modified' | 'rejected'
  >(patient.ophthalmologistReviewStatus || 'pending');

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  // Preload if patient already has AI results
  useEffect(() => {
    if (
      patient.aiDiagnosis &&
      patient.aiDiagnosis !== '—' &&
      patient.odScanUrl &&
      patient.osScanUrl &&
      analysisState === 'idle'
    ) {
      const odGrade = patient.icdrGradeOd ?? 2;
      const osGrade = patient.icdrGradeOs ?? 3;
      setAnalysisData({
        od: {
          diagnosis: patient.odStatus?.split(' (')[0] || 'Moderate NPDR',
          confidence: parseFloat(patient.aiConfidence) || 94.2,
          csmeStatus: patient.csmeDetected ? 'Present' : 'Absent',
          icdrGrade: odGrade,
          microaneurysms: `${patient.microaneurysmsCount ?? 6} identified`,
          hemorrhages: 'Scattered dot-blot',
          exudates: patient.hardExudatesNote || 'Few hard exudates',
          visualAcuityRisk: patient.riskLevel === 'Critical' ? 'High — urgent review' : 'Moderate',
          modelVersion: 'demo-frontend',
          uncertaintyFlag: false,
        },
        os: {
          diagnosis: patient.osStatus?.split(' (')[0] || 'Severe NPDR with CSME',
          confidence: parseFloat(patient.aiConfidence) || 96.8,
          csmeStatus: patient.csmeDetected ? 'Present' : 'Absent',
          icdrGrade: osGrade,
          microaneurysms: `${(patient.microaneurysmsCount ?? 6) + 4} identified`,
          hemorrhages: 'Diffuse (3–4 quadrants)',
          exudates: patient.hardExudatesNote || 'Circinate ring near fovea',
          visualAcuityRisk: patient.riskLevel === 'Critical' ? 'High — urgent review' : 'Moderate',
          modelVersion: 'demo-frontend',
          uncertaintyFlag: false,
        },
        analyzedAt: new Date().toISOString(),
      });
      setAnalysisState('complete');
    }
  }, [patient.id]);

  const buildFakeResult = (): {
    od: DiagnosisResult;
    os: DiagnosisResult;
    analyzedAt: string;
  } => {
    const od: DiagnosisResult = {
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
      explainabilityNote:
        'Lesion attention focused temporal to macula and superior arcade. Microaneurysms and hard exudates highlighted.',
    };
    const os: DiagnosisResult = {
      diagnosis: 'Severe NPDR with CSME',
      confidence: 96.8,
      csmeStatus: 'Present',
      icdrGrade: 3,
      microaneurysms: '12+ identified in 3 quadrants',
      hemorrhages: 'Diffuse (3–4 quadrants)',
      exudates: 'Circinate lipid ring within 500µm of fovea',
      visualAcuityRisk: 'High — urgent review advised',
      modelVersion: 'demo-frontend',
      uncertaintyFlag: false,
      qualityAssessment: 'gradable',
      explainabilityNote:
        'High lesion probability over central macula (CSME). Circinate exudates and hemorrhage clusters marked on Grad-CAM overlay.',
    };
    return { od, os, analyzedAt: new Date().toISOString() };
  };

  const runAnalysis = useCallback(async () => {
    if (!hasBothScans) {
      setAnalysisError({
        code: 'INVALID_IMAGE',
        message: 'Both OD and OS retinal scans are required.',
        retryable: false,
      });
      setAnalysisState('error');
      return;
    }

    setAnalysisState('analyzing');
    setAnalysisError(null);
    setAnalysisData(null);
    setClinicianConfirmed(false);
    setConfirmedAt(null);
    setElapsedMs(0);

    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedMs(Date.now() - startTime);
    }, 100);

    // Realistic model latency (~45s) — simulates remote inference backend
    await new Promise((r) => setTimeout(r, 45000 + Math.random() * 2000));

    const result = buildFakeResult();
    setAnalysisData(result);
    setAnalysisState('complete');
    setRetryCount(0);
    showToast('AI analysis completed.', 'check_circle');

    if (onUpdatePatient) {
      const od = result.od;
      const os = result.os;
      const maxConf = Math.max(od.confidence, os.confidence);
      const hasCsme = od.csmeStatus === 'Present' || os.csmeStatus === 'Present';
      const maxGrade = Math.max(od.icdrGrade ?? 0, os.icdrGrade ?? 0);
      let risk: 'Normal' | 'Mild' | 'High Risk' | 'Critical' = 'Normal';
      if (maxGrade >= 3 || hasCsme) risk = 'Critical';
      else if (maxGrade === 2) risk = 'High Risk';
      else if (maxGrade === 1) risk = 'Mild';

      onUpdatePatient({
        aiDiagnosis: `OD: ${od.diagnosis} | OS: ${os.diagnosis}`,
        aiConfidence: `${maxConf.toFixed(1)}%`,
        odStatus: `${od.diagnosis} (${od.confidence.toFixed(1)}%)`,
        osStatus: `${os.diagnosis} (${os.confidence.toFixed(1)}%)`,
        csmeDetected: hasCsme,
        icdrGradeOd: od.icdrGrade as 0 | 1 | 2 | 3 | 4,
        icdrGradeOs: os.icdrGrade as 0 | 1 | 2 | 3 | 4,
        microaneurysmsCount:
          parseInt(String(od.microaneurysms).match(/\d+/)?.[0] || '0', 10) || undefined,
        hardExudatesNote: [od.exudates, os.exudates].filter(Boolean).join('; '),
        neovascularization: maxGrade >= 4,
        riskLevel: risk,
        triageStatus: 'Awaiting Ophthalmologist Validation',
        ophthalmologistReviewStatus: 'pending',
        referralStatus:
          risk === 'Normal' || risk === 'Mild' ? 'not_required' : 'pending_review',
        referralUrgency:
          risk === 'Critical' ? 'urgent' : risk === 'High Risk' ? 'routine' : undefined,
        gradCamUrl: patient.odScanUrl,
      });
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [patient.odScanUrl, patient.osScanUrl, hasBothScans, showToast, onUpdatePatient]);

  // ── Cancel in-flight ──────────────────────────────────────────────
  const cancelAnalysis = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    setAnalysisState('idle');
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    showToast('Analysis cancelled.', 'cancel');
  }, [showToast]);

  // ── Retry handler ─────────────────────────────────────────────────
  const handleRetry = useCallback(() => {
    setRetryCount((c) => c + 1);
    runAnalysis();
  }, [runAnalysis]);

  // ── Clinician sign-off ─────────────────────────────────────────────
  const handleClinicianConfirm = () => {
    setClinicianConfirmed(true);
    setConfirmedAt(new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
    showToast('Clinician sign-off recorded. AI findings now confirmed.', 'verified');
    if (onUpdatePatient && analysisData) {
      onUpdatePatient({
        triageStatus: 'Clinician Confirmed',
        aiDiagnosis: analysisData.od.diagnosis, // Using OD as representative for DB schema
        riskLevel: analysisData.od.visualAcuityRisk?.includes('high') ? 'High Risk' : 'Normal', // Simplify mapping
      });
    }
  };

  // ── Download clinical screening report as PDF ──────────────────────
  const handleDownloadPdfReport = useCallback(() => {
    if (!analysisData) {
      showToast('Complete analysis first to generate the report.', 'info');
      return;
    }
    try {
      downloadScreeningReportPdf({
        patient,
        od: analysisData.od,
        os: analysisData.os,
        analyzedAt: analysisData.analyzedAt,
        doctorNotes: doctorNotes || undefined,
        doctorDecision: doctorDecision !== 'pending' ? doctorDecision : undefined,
      });
      showToast('Screening report PDF downloaded.', 'download');
    } catch (err) {
      console.error(err);
      showToast('Could not generate PDF. Please try again.', 'error');
    }
  }, [analysisData, patient, doctorNotes, doctorDecision, showToast]);

  // ── SMS and Sync ───────────────────────────────────────────────────
  const handleSendSms = async () => {
    setIsSendingSms(true);
    showToast(`Transmitting encrypted SMS referral token to ${patient.mobile}...`, 'sms');
    try {
      await sendSmsReferral(
        patient.mobile,
        `DRISHTI: Referral recommended for ${patient.name}. Diagnosis: ${analysisData?.od?.diagnosis || 'Pending'}. Secure token: ${Math.random().toString(36).slice(2, 8).toUpperCase()}`
      );
      showToast(`Referral tele-token dispatched to ${patient.mobile} & registered on ABDM Gateway.`, 'done_all');
    } catch (err) {
      showToast('Failed to send SMS referral token. Gateway timeout.', 'error');
    } finally {
      setIsSendingSms(false);
    }
  };

  const handleSaveAndSync = async () => {
    setIsSyncing(true);
    showToast('Saving diagnostic record...', 'lock');
    try {
      if (onUpdatePatient) {
        await onUpdatePatient({ syncStatus: 'queued' });
      }
      showToast('Screening record saved successfully.', 'verified_user');
    } catch (err) {
      showToast('Failed to save record.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // ── Derived values ─────────────────────────────────────────────────
  const isHighRisk =
    analysisData &&
    (analysisData.od.visualAcuityRisk?.toLowerCase().includes('high') ||
      analysisData.od.visualAcuityRisk?.toLowerCase().includes('critical') ||
      analysisData.os.visualAcuityRisk?.toLowerCase().includes('high') ||
      analysisData.os.visualAcuityRisk?.toLowerCase().includes('critical'));

  const hasUncertainty =
    analysisData &&
    (analysisData.od.uncertaintyFlag || analysisData.os.uncertaintyFlag);

  const elapsedSec = (elapsedMs / 1000).toFixed(1);

  return (
    <div className="flex flex-col w-full select-none">
      <div className="p-4 lg:p-6 max-w-[1600px] mx-auto w-full flex flex-col gap-5 pb-20">
        {/* Progress Pipeline & Patient Meta Strip */}
        <div className="bg-white rounded-xl p-4 sm:p-5 shadow-xs border border-slate-200 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          {/* Patient Identity Group */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#0d766e] text-white flex items-center justify-center font-bold text-lg shadow-xs">
              {patient.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </div>
            <div className="flex flex-col">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-bold text-slate-900">
                  {patient.name}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                  {patient.age} Y / {patient.gender}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 text-xs font-semibold font-mono">
                  ABHA: {patient.abhaId}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-600 text-xs mt-1">
                <span className="flex items-center gap-1 font-medium">
                  <span className="material-symbols-outlined text-sm text-[#0d766e]">
                    pin_drop
                  </span>
                  Vadbare Anganwadi Camp #03
                </span>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm text-emerald-600">
                    memory
                  </span>
                  Today, {patient.screenTime} (Edge NPU Offline)
                </span>
              </div>
            </div>
          </div>

          {/* End-to-End Pipeline Tracker */}
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-1">
            {[
              { n: 1, label: 'Capture', done: hasBothScans, active: false },
              { n: 2, label: 'Quality', done: analysisState === 'complete' || analysisState === 'analyzing', active: analysisState === 'analyzing' },
              { n: 3, label: 'Analysis', done: analysisState === 'complete', active: analysisState === 'analyzing' },
              { n: 4, label: 'DR Grade', done: analysisState === 'complete', active: false },
              { n: 5, label: 'Explain & Refer', done: doctorDecision !== 'pending', active: analysisState === 'complete' && doctorDecision === 'pending' },
            ].map((s, i, arr) => (
              <React.Fragment key={s.n}>
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border shrink-0 ${
                    s.done
                      ? 'bg-emerald-50 border-emerald-200'
                      : s.active
                      ? 'bg-[#0d766e] border-[#0d766e] text-white'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                      s.done
                        ? 'bg-emerald-600 text-white'
                        : s.active
                        ? 'bg-white text-[#0d766e]'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {s.done ? '✓' : s.n}
                  </span>
                  <span
                    className={`text-[11px] font-bold whitespace-nowrap ${
                      s.done
                        ? 'text-emerald-800'
                        : s.active
                        ? 'text-white'
                        : 'text-slate-600'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {i < arr.length - 1 && (
                  <span className="material-symbols-outlined text-slate-300 text-sm shrink-0">
                    chevron_right
                  </span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            STATE: IDLE — Show "Start Analysis" CTA
        ═══════════════════════════════════════════════════════════════ */}
        {analysisState === 'idle' && (
          <div className="flex flex-col items-center justify-center py-12 bg-white rounded-xl border border-slate-200 shadow-xs">
            <span className="material-symbols-outlined text-5xl text-[#0d766e] mb-4">
              biotech
            </span>
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              Run Pipeline Analysis
            </h2>
            <p className="text-sm text-slate-500 mb-4 text-center max-w-lg">
              Image Quality → Lesion Detection → ICDR Grading (0–4) → Grad-CAM Explain → Report & Refer
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-6 max-w-2xl w-full px-4">
              {[
                'Quality Check',
                'Retinal Analysis',
                'DR Grading',
                'Grad-CAM',
                'Report',
              ].map((t) => (
                <div key={t} className="text-center p-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px] font-semibold text-slate-700">
                  {t}
                </div>
              ))}
            </div>

            {/* AI disclaimer */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-800 text-xs font-semibold border border-amber-200 mb-6">
              <span className="material-symbols-outlined text-[14px]">info</span>
              <span>AI-assisted screening only — not a clinical diagnosis. Requires clinician confirmation.</span>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-medium mb-4 text-emerald-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Analysis ready
            </div>

            {!hasBothScans && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs font-semibold mb-4 max-w-md">
                <span className="material-symbols-outlined text-base">
                  warning
                </span>
                <div>
                  {!hasOdScan && !hasOsScan
                    ? 'No retinal scans. Both OD and OS images are required.'
                    : !hasOdScan
                    ? 'OD (Right Eye) scan missing.'
                    : 'OS (Left Eye) scan missing.'}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={!hasBothScans}
                onClick={runAnalysis}
                className={`min-h-[50px] px-8 py-3 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-2 ${
                  hasBothScans
                    ? 'bg-[#0d766e] hover:bg-[#005c55] text-white cursor-pointer active:translate-y-px'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <span className="material-symbols-outlined text-xl">
                  play_arrow
                </span>
                Run AI Analysis
              </button>

              {!hasBothScans && (
                <button
                  type="button"
                  onClick={() => onNavigate('retinal-capture')}
                  className="min-h-[50px] px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer active:translate-y-px"
                >
                  <span className="material-symbols-outlined text-lg text-[#0d766e]">
                    linked_camera
                  </span>
                  Capture Scans
                </button>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            STATE: ANALYZING — Progress with elapsed timer
        ═══════════════════════════════════════════════════════════════ */}
        {analysisState === 'analyzing' && (() => {
          const t = elapsedMs / 1000;
          // Stage timing (total ~45s) — realistic model latency; enhancement & Grad-CAM are the focus
          const stageQuality = t >= 3;
          const stageEnhance = t >= 5;
          const stageEnhanceDone = t >= 14;
          const stageStructure = t >= 16;
          const stageLesion = t >= 22;
          const stageGrade = t >= 29;
          const stageGradCam = t >= 34;
          const stageReport = t >= 41;

          const fundusSrc = patient.odScanUrl || patient.osScanUrl || '';
          // Visual phase for the image panel
          const showOriginal = t < 5;
          const showEnhancing = t >= 5 && t < 14;
          const showEnhanced = t >= 14 && t < 34;
          const showGradCam = t >= 34;

          return (
          <div className="flex flex-col gap-5 py-6 px-4 lg:px-6 bg-white rounded-xl border border-slate-200 shadow-xs">
            <div className="text-center">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-700 mb-1">
                Simulated AI Pipeline · Quality-Aware Screening
              </p>
              <h2 className="text-xl font-bold text-slate-900">
                Retinal Analysis in Progress
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {patient.id} • {patient.name} • {patient.age} yrs
              </p>
            </div>

            {/* ── Visual focus: Image Quality Enhancement + Grad-CAM ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-4xl mx-auto w-full">
              {/* Image viewer */}
              <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-900 relative aspect-square max-h-[320px] mx-auto w-full">
                {fundusSrc ? (
                  <>
                    <img
                      src={fundusSrc}
                      alt="Fundus during analysis"
                      className={`w-full h-full object-cover transition-all duration-700 ${
                        showOriginal
                          ? 'opacity-90 brightness-90 contrast-90 saturate-75'
                          : showEnhancing
                          ? 'opacity-100 brightness-105 contrast-110 saturate-90 scale-[1.02]'
                          : showEnhanced
                          ? 'opacity-100 brightness-110 contrast-125 saturate-100'
                          : 'opacity-100 brightness-105 contrast-120'
                      }`}
                    />
                    {/* Enhancement scan line while enhancing */}
                    {showEnhancing && (
                      <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        <div
                          className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-teal-300/80 to-transparent animate-pulse"
                          style={{
                            top: `${Math.min(90, ((t - 5) / 9) * 100)}%`,
                            boxShadow: '0 0 12px 4px rgba(45, 212, 191, 0.5)',
                          }}
                        />
                        <div className="absolute inset-0 bg-teal-500/5" />
                      </div>
                    )}
                    {/* Grad-CAM heatmap overlay */}
                    {showGradCam && (
                      <div
                        className="absolute inset-0 pointer-events-none mix-blend-screen opacity-70"
                        style={{
                          background:
                            'radial-gradient(ellipse 45% 40% at 42% 48%, rgba(239,68,68,0.75) 0%, rgba(249,115,22,0.45) 35%, rgba(234,179,8,0.2) 55%, transparent 75%), radial-gradient(ellipse 25% 22% at 62% 38%, rgba(239,68,68,0.55) 0%, transparent 70%)',
                        }}
                      />
                    )}
                    {/* Labels */}
                    <div className="absolute top-2 left-2 right-2 flex justify-between gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                        showGradCam
                          ? 'bg-red-600 text-white'
                          : showEnhanced || showEnhancing
                          ? 'bg-teal-600 text-white'
                          : 'bg-slate-800/90 text-white'
                      }`}>
                        {showGradCam
                          ? 'AI Attention · Grad-CAM'
                          : showEnhanced
                          ? 'Enhanced Fundus'
                          : showEnhancing
                          ? 'Enhancing…'
                          : 'Original Capture'}
                      </span>
                    </div>
                    <div className="absolute bottom-2 left-2 right-2">
                      <span className="inline-block px-2 py-0.5 rounded bg-black/70 text-white text-[10px] font-medium">
                        {showGradCam
                          ? 'Highlighted regions drive the DR prediction'
                          : showEnhanced
                          ? 'Illumination normalized · Contrast enhanced · Noise reduced'
                          : showEnhancing
                          ? 'Running quality enhancement pipeline…'
                          : 'Checking focus · illumination · FOV · clarity'}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
                    No fundus image
                  </div>
                )}
              </div>

              {/* Pipeline stages — enhancement & Grad-CAM emphasized */}
              <div className="flex flex-col gap-2 justify-center">
                {[
                  {
                    t: '01  Image Quality Assessment',
                    sub: 'Focus · Illumination · FOV · Clarity',
                    done: stageQuality,
                    active: !stageQuality && t > 0.2,
                    highlight: false,
                  },
                  {
                    t: '02  Image Quality Enhancement',
                    sub: 'Illumination normalization · Contrast · Noise reduction · Region normalization',
                    done: stageEnhanceDone,
                    active: stageEnhance && !stageEnhanceDone,
                    highlight: true,
                  },
                  {
                    t: '03  Retinal Structure Analysis',
                    sub: 'Optic disc · Fovea · Vessel segmentation',
                    done: stageStructure,
                    active: stageStructure && !stageLesion && t < 5.2,
                    highlight: false,
                  },
                  {
                    t: '04  Lesion Detection',
                    sub: 'Microaneurysms · Exudates · Hemorrhages · Neovascularization',
                    done: stageLesion,
                    active: stageLesion && !stageGrade && t < 6.2,
                    highlight: false,
                  },
                  {
                    t: '05  DR Severity Classification',
                    sub: 'ICDR Level 0–4 grading',
                    done: stageGrade,
                    active: stageGrade && !stageGradCam && t < 7.0,
                    highlight: false,
                  },
                  {
                    t: '06  Explainability (Grad-CAM)',
                    sub: 'Attention heatmap · Lesion-level evidence for the prediction',
                    done: stageGradCam,
                    active: stageGradCam && !stageReport && t < 8.2,
                    highlight: true,
                  },
                  {
                    t: '07  Screening Report Generation',
                    sub: 'Structured clinical report ready for download',
                    done: stageReport,
                    active: stageReport,
                    highlight: false,
                  },
                ].map((step) => (
                  <div
                    key={step.t}
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-all ${
                      step.done
                        ? step.highlight
                          ? 'bg-teal-50 border-teal-300'
                          : 'bg-emerald-50 border-emerald-200'
                        : step.active
                        ? step.highlight
                          ? 'bg-teal-50 border-[#0d766e] shadow-md ring-1 ring-teal-200'
                          : 'bg-teal-50/80 border-[#0d766e] shadow-sm'
                        : 'bg-slate-50 border-slate-100'
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-base mt-0.5 shrink-0 ${
                        step.done
                          ? 'text-emerald-600'
                          : step.active
                          ? 'text-[#0d766e] animate-spin'
                          : 'text-slate-300'
                      }`}
                    >
                      {step.done
                        ? 'check_circle'
                        : step.active
                        ? 'progress_activity'
                        : 'radio_button_unchecked'}
                    </span>
                    <div className="min-w-0">
                      <span
                        className={`text-[13px] font-semibold block ${
                          step.done
                            ? 'text-emerald-800'
                            : step.active
                            ? 'text-slate-900'
                            : 'text-slate-400'
                        }`}
                      >
                        {step.t}
                        {step.highlight && (step.active || step.done) && (
                          <span className="ml-1.5 text-[9px] font-bold uppercase tracking-wide text-teal-700 bg-teal-100 px-1.5 py-0.5 rounded">
                            Key
                          </span>
                        )}
                      </span>
                      {(step.done || step.active) && (
                        <span
                          className={`text-[11px] block mt-0.5 leading-snug ${
                            step.done ? 'text-emerald-600' : 'text-teal-700'
                          }`}
                        >
                          {step.sub}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
              <p className="text-xs text-slate-400 font-mono">
                Elapsed: {elapsedSec}s · Frontend simulation · Quality enhancement is central to this pipeline
              </p>
              <button
                type="button"
                onClick={cancelAnalysis}
                className="px-5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
          );
        })()}

        {/* ═══════════════════════════════════════════════════════════════
            STATE: TIMEOUT — Specific timeout UI
        ═══════════════════════════════════════════════════════════════ */}
        {analysisState === 'timeout' && (
          <div className="flex flex-col items-center justify-center py-20 bg-amber-50 rounded-xl border border-amber-200 shadow-xs">
            <span className="material-symbols-outlined text-5xl text-amber-600 mb-4">
              hourglass_disabled
            </span>
            <h2 className="text-xl font-bold text-amber-900 mb-2">
              Analysis Timed Out
            </h2>
            <p className="text-sm text-amber-700 mb-2 text-center max-w-md">
              {analysisError?.message ||
                'The AI service did not respond within 30 seconds. This may be due to high server load or network latency.'}
            </p>
            <p className="text-xs text-amber-600 mb-6 font-mono">
              Elapsed: {elapsedSec}s • Attempts: {retryCount + 1}
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleRetry}
                className="px-6 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center gap-2 cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined">refresh</span>
                Retry Analysis
              </button>
              <button
                type="button"
                onClick={() => setAnalysisState('idle')}
                className="px-5 py-2.5 rounded-lg bg-white border border-amber-300 text-amber-800 text-sm font-semibold hover:bg-amber-50 cursor-pointer transition-all"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            STATE: ERROR — Categorized error display
        ═══════════════════════════════════════════════════════════════ */}
        {analysisState === 'error' && analysisError && (
          <div className="flex flex-col items-center justify-center py-20 bg-red-50 rounded-xl border border-red-200 shadow-xs">
            <span className="material-symbols-outlined text-5xl text-red-600 mb-4">
              {ERROR_ICONS[analysisError.code] || 'error'}
            </span>
            <h2 className="text-xl font-bold text-red-900 mb-2">
              Analysis Failed
            </h2>
            <p className="text-sm text-red-700 mb-2 text-center max-w-md">
              {analysisError.message}
            </p>
            <div className="flex items-center gap-2 text-xs text-red-500 mb-6 font-mono">
              <span>Error: {analysisError.code}</span>
              <span>•</span>
              <span>Attempts: {retryCount + 1}</span>
            </div>

            <div className="flex items-center gap-3">
              {analysisError.retryable && (
                <button
                  type="button"
                  onClick={handleRetry}
                  className="px-6 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold flex items-center gap-2 cursor-pointer transition-all"
                >
                  <span className="material-symbols-outlined">refresh</span>
                  Retry Analysis
                </button>
              )}
              {!analysisError.retryable && analysisError.code === 'INVALID_IMAGE' && (
                <button
                  type="button"
                  onClick={() => onNavigate('retinal-capture')}
                  className="px-6 py-2.5 rounded-lg bg-[#0d766e] hover:bg-[#005c55] text-white font-bold flex items-center gap-2 cursor-pointer transition-all"
                >
                  <span className="material-symbols-outlined">linked_camera</span>
                  Re-capture Scans
                </button>
              )}
              <button
                type="button"
                onClick={() => setAnalysisState('idle')}
                className="px-5 py-2.5 rounded-lg bg-white border border-red-300 text-red-800 text-sm font-semibold hover:bg-red-50 cursor-pointer transition-all"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            STATE: COMPLETE — Full results with AI/Clinician distinction
        ═══════════════════════════════════════════════════════════════ */}
        {analysisState === 'complete' && analysisData && (
          <>
            {/* ── Uncertainty Banner ───────────────────────────────────── */}
            {hasUncertainty && (
              <div className="rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-950 p-4 lg:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <span className="material-symbols-outlined text-2xl">
                      psychology_alt
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-base font-bold text-amber-800 tracking-tight">
                      LOW CONFIDENCE — AI RESULTS UNCERTAIN
                    </span>
                    <p className="text-xs text-amber-700 font-medium mt-1">
                      One or both eyes scored below {CONFIDENCE_LOW}% confidence.
                      Image quality may be insufficient or the condition may be atypical.
                      Manual clinical evaluation is strongly recommended.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ── High Risk Alert Banner ──────────────────────────────── */}
            {isHighRisk && (
              <div className="rounded-xl bg-red-50 border-2 border-red-300 text-red-950 p-4 lg:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <span className="material-symbols-outlined text-2xl">
                      warning
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-bold text-red-700 tracking-tight">
                        URGENT CLINICAL TRIAGE: HIGH RISK — IMMEDIATE REFERRAL REQUIRED
                      </span>
                      <span className="px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-bold uppercase tracking-widest">
                        Priority 1 (Red)
                      </span>
                    </div>
                    <p className="text-xs text-red-900 font-medium mt-1">
                      AI screening indicates high risk with potential threat to central visual acuity.
                      These are <strong>preliminary AI findings</strong> and require clinical confirmation by a qualified ophthalmologist.
                    </p>
                    <div className="inline-flex items-center gap-1.5 mt-1.5 text-red-800 text-xs font-semibold">
                      <span className="material-symbols-outlined text-base">
                        schedule
                      </span>
                      <span>
                        NPCBVI Standard SLA: Eye Care Specialist review mandated
                        within <strong>7 days</strong>.
                      </span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2 w-full md:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      showToast(
                        'Specialist triage alert flagged at District Hospital tele-desk.',
                        'e911_emergency',
                      );
                    }}
                    className="w-full md:w-auto min-h-[46px] px-5 py-2.5 rounded-lg bg-red-700 hover:bg-red-800 text-white text-xs font-bold shadow-xs active:translate-y-px transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-lg">
                      e911_emergency
                    </span>
                    <span>Flag Specialist Team</span>
                  </button>
                </div>
              </div>
            )}

            {/* ── 2. Image Quality Assessment ───────────────────────────── */}
            <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-7 h-7 rounded-lg bg-[#0d766e] text-white text-xs font-bold flex items-center justify-center">2</span>
                <h2 className="text-sm font-bold text-slate-900">Image Quality Assessment</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                  <p className="text-[11px] font-bold text-emerald-800 uppercase">OD (Right)</p>
                  <p className="text-sm font-bold text-slate-900 mt-1">Gradable</p>
                  <p className="text-xs text-slate-600 mt-0.5">Focus · Illumination · FOV adequate</p>
                </div>
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                  <p className="text-[11px] font-bold text-emerald-800 uppercase">OS (Left)</p>
                  <p className="text-sm font-bold text-slate-900 mt-1">Gradable</p>
                  <p className="text-xs text-slate-600 mt-0.5">Focus · Illumination · FOV adequate</p>
                </div>
              </div>
            </div>

            {/* ── 3. Retinal Analysis — Lesions ─────────────────────────── */}
            <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-7 h-7 rounded-lg bg-[#0d766e] text-white text-xs font-bold flex items-center justify-center">3</span>
                <h2 className="text-sm font-bold text-slate-900">Retinal Analysis — Lesion Detection</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-500 uppercase">OD Findings</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 text-xs font-semibold text-slate-800">{analysisData.od.microaneurysms}</span>
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 text-xs font-semibold text-slate-800">{analysisData.od.hemorrhages}</span>
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 text-xs font-semibold text-slate-800">{analysisData.od.exudates}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-500 uppercase">OS Findings</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-red-50 text-xs font-semibold text-red-800">{analysisData.os.microaneurysms}</span>
                    <span className="px-2.5 py-1 rounded-full bg-red-50 text-xs font-semibold text-red-800">{analysisData.os.hemorrhages}</span>
                    <span className="px-2.5 py-1 rounded-full bg-red-50 text-xs font-semibold text-red-800">{analysisData.os.exudates}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── 4. DR Severity Grading ───────────────────────────────── */}
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-[#0d766e] text-white text-xs font-bold flex items-center justify-center">4</span>
              <h2 className="text-sm font-bold text-slate-900">DR Severity Grading (ICDR 0–4)</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className={`rounded-2xl p-5 border-2 shadow-sm ${
                analysisData.od.icdrGrade >= 3 || analysisData.od.csmeStatus === 'Present'
                  ? 'bg-red-50 border-red-300'
                  : analysisData.od.icdrGrade === 2
                  ? 'bg-amber-50 border-amber-300'
                  : 'bg-emerald-50 border-emerald-300'
              }`}>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Right Eye (OD)</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 leading-tight">
                  {analysisData.od.diagnosis}
                </p>
                <p className="text-sm font-semibold mt-2 text-slate-700">
                  ICDR Grade {analysisData.od.icdrGrade} · {analysisData.od.confidence.toFixed(1)}% confidence
                </p>
                <p className="text-xs mt-1 text-slate-600">
                  CSME: <strong>{analysisData.od.csmeStatus}</strong>
                </p>
              </div>
              <div className={`rounded-2xl p-5 border-2 shadow-sm ${
                analysisData.os.icdrGrade >= 3 || analysisData.os.csmeStatus === 'Present'
                  ? 'bg-red-50 border-red-300'
                  : analysisData.os.icdrGrade === 2
                  ? 'bg-amber-50 border-amber-300'
                  : 'bg-emerald-50 border-emerald-300'
              }`}>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Left Eye (OS)</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 leading-tight">
                  {analysisData.os.diagnosis}
                </p>
                <p className="text-sm font-semibold mt-2 text-slate-700">
                  ICDR Grade {analysisData.os.icdrGrade} · {analysisData.os.confidence.toFixed(1)}% confidence
                </p>
                <p className="text-xs mt-1 text-slate-600">
                  CSME: <strong>{analysisData.os.csmeStatus}</strong>
                </p>
              </div>
            </div>

            {/* ── Main Clinical Console ────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* LEFT COLUMN: Retinal Image Workstation (7 Cols) */}
              <div className="lg:col-span-7 flex flex-col gap-4">
                {/* Scans Display Container */}
                <div className="bg-white rounded-xl p-4 sm:p-5 shadow-xs border border-slate-200 flex flex-col gap-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-[#0d766e] text-white text-xs font-bold flex items-center justify-center">5</span>
                      <div>
                        <h2 className="text-sm font-bold text-slate-900">
                          Explain — Grad-CAM & Lesion Evidence
                        </h2>
                        <p className="text-xs text-slate-500">
                          Heatmap shows where damage was detected
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Grad-CAM Opacity & Visibility Interactivity Bar */}
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <label
                        htmlFor="heatmap-slider"
                        className="text-xs font-semibold text-slate-800 flex items-center gap-1.5 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[#0d766e] text-base">
                          layers
                        </span>
                        <span>Grad-CAM Intensity</span>
                      </label>
                      <input
                        id="heatmap-slider"
                        type="range"
                        min="10"
                        max="100"
                        value={heatmapIntensity}
                        onChange={(e) =>
                          setHeatmapIntensity(Number(e.target.value))
                        }
                        className="w-28 accent-[#0d766e] h-2 bg-slate-200 rounded-lg cursor-pointer"
                      />
                      <span className="text-xs font-bold text-[#0d766e] px-2 py-0.5 rounded bg-teal-50 border border-teal-200 font-mono">
                        {heatmapIntensity}%
                      </span>
                    </div>

                    {/* Heatmap Gradient Legend */}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-500">Lesion Prob:</span>
                      <div className="h-3 w-28 rounded-full bg-gradient-to-r from-yellow-300 via-orange-500 to-red-600 shadow-inner" />
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-600">
                        <span>Low</span>
                        <span>•</span>
                        <span>Critical</span>
                      </div>
                    </div>
                  </div>

                  {/* Retinal Image Pair Grid (OD & OS) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* OD: Right Eye */}
                    <EyeCard
                      eyeLabel="OD"
                      eyeName="Right Eye"
                      data={analysisData.od}
                      scanUrl={patient.odScanUrl}
                      heatmapIntensity={heatmapIntensity}
                      onZoom={() => onOpenFundusModal(patient, 'OD')}
                      accentClass="bg-teal-100 text-[#0d766e]"
                    />

                    {/* OS: Left Eye */}
                    <EyeCard
                      eyeLabel="OS"
                      eyeName="Left Eye"
                      data={analysisData.os}
                      scanUrl={patient.osScanUrl}
                      heatmapIntensity={heatmapIntensity}
                      onZoom={() => onOpenFundusModal(patient, 'OS')}
                      accentClass="bg-indigo-100 text-indigo-700"
                    />
                  </div>

                  {/* AI Source Attribution */}
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#0d766e] text-base">
                        auto_fix_high
                      </span>
                      <span>
                        AI-assisted screening. Preliminary results — not a clinical diagnosis.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        showToast(
                          'Full layer audit report requested.',
                          'verified',
                        )
                      }
                      className="text-[#0d766e] font-bold hover:underline shrink-0 cursor-pointer ml-2"
                    >
                      Full Layer Audit
                    </button>
                  </div>
                </div>

                {/* Clinical history (RBS, duration, BP) is entered at registration — not inferred from fundus by AI */}
              </div>

              {/* RIGHT COLUMN: Staging, Clinician Sign-off & Actions (5 Cols) */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                {/* Clinical Classification Scorecard */}
                <div className="bg-white rounded-xl p-4 sm:p-5 shadow-xs border border-slate-200 flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#0d766e]">
                        clinical_notes
                      </span>
                      <span className="text-sm font-bold text-slate-900">
                        ICDR Disease Staging
                      </span>
                    </div>
                    {clinicianConfirmed ? (
                      <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">
                          verified
                        </span>
                        Clinician Confirmed
                      </span>
                    ) : (
                      <span className="text-[11px] text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Awaiting Clinician Sign-off
                      </span>
                    )}
                  </div>

                  {/* Staging Bars */}
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-900">
                          Diabetic Retinopathy (ICDR Scale)
                        </span>
                        <span className="font-bold text-[#0d766e]">
                          Max Grade:{' '}
                          {Math.max(
                            analysisData.od.icdrGrade,
                            analysisData.os.icdrGrade,
                          )}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                        {[0, 1, 2, 3, 4].map((grade) => {
                          const maxGrade = Math.max(
                            analysisData.od.icdrGrade,
                            analysisData.os.icdrGrade,
                          );
                          const isActive = grade === maxGrade;
                          const bg =
                            grade === 0
                              ? 'bg-emerald-600'
                              : grade === 1
                              ? 'bg-sky-500'
                              : grade === 2
                              ? 'bg-amber-500'
                              : grade === 3
                              ? 'bg-orange-600'
                              : 'bg-red-700';
                          return (
                            <div
                              key={grade}
                              className={`${bg} w-1/5 h-full ${
                                isActive ? 'animate-pulse' : 'opacity-20'
                              }`}
                              title={`Grade ${grade}`}
                            />
                          );
                        })}
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500 font-medium pt-0.5">
                        <span>St 0</span>
                        <span>St 1</span>
                        <span>St 2</span>
                        <span>St 3</span>
                        <span>St 4</span>
                      </div>
                    </div>

                    {/* Macular Edema Presence */}
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-[#0d766e]">
                          lens
                        </span>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold">
                            Clinically Significant Macular Edema
                          </span>
                          <span className="text-[11px] text-slate-600">
                            OD: {analysisData.od.csmeStatus} | OS:{' '}
                            {analysisData.os.csmeStatus}
                          </span>
                        </div>
                      </div>
                      <span className="text-base font-black text-[#0d766e]">
                        {analysisData.od.csmeStatus === 'Present' ||
                        analysisData.os.csmeStatus === 'Present'
                          ? 'POS'
                          : 'NEG'}
                      </span>
                    </div>
                  </div>

                  {/* Model Confidence */}
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 flex flex-col gap-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Model:</span>
                      <span className="font-semibold text-slate-900">
                        Gemini {analysisData.od.modelVersion || '2.5 Flash'} API
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>OD Confidence:</span>
                      <span
                        className={`font-semibold ${confidenceColor(
                          analysisData.od.confidence,
                        )}`}
                      >
                        {analysisData.od.confidence}%
                        {analysisData.od.uncertaintyFlag && (
                          <span className="ml-1 text-[10px] text-amber-600">
                            ⚠ Low
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>OS Confidence:</span>
                      <span
                        className={`font-semibold ${confidenceColor(
                          analysisData.os.confidence,
                        )}`}
                      >
                        {analysisData.os.confidence}%
                        {analysisData.os.uncertaintyFlag && (
                          <span className="ml-1 text-[10px] text-amber-600">
                            ⚠ Low
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Analyzed:</span>
                      <span className="font-semibold text-slate-900">
                        {new Date(analysisData.analyzedAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── Automated Report ──────────────────────────────────── */}
                <div className="bg-white rounded-xl p-4 sm:p-5 shadow-xs border border-slate-200 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#0d766e]">description</span>
                    <span className="text-sm font-bold text-slate-900">Automated Report</span>
                  </div>
                  <div className="text-xs text-slate-700 space-y-1.5 leading-relaxed">
                    <p><strong>Patient:</strong> {patient.name} · {patient.age}Y · {patient.gender}</p>
                    <p><strong>Diabetes:</strong> {patient.diabetesStatus || '—'}</p>
                    <p><strong>OD:</strong> {analysisData.od.diagnosis} (ICDR {analysisData.od.icdrGrade}, {analysisData.od.confidence.toFixed(1)}%)</p>
                    <p><strong>OS:</strong> {analysisData.os.diagnosis} (ICDR {analysisData.os.icdrGrade}, {analysisData.os.confidence.toFixed(1)}%)</p>
                    <p><strong>CSME:</strong> OD {analysisData.od.csmeStatus} · OS {analysisData.os.csmeStatus}</p>
                    <p><strong>Referral:</strong>{' '}
                      {Math.max(analysisData.od.icdrGrade, analysisData.os.icdrGrade) >= 2
                        ? 'Recommended (Level 2+) — Ophthalmologist review'
                        : 'Not required — routine follow-up'}
                    </p>
                  </div>
                </div>

                {/* ── Ophthalmologist Review ────────────────────────────── */}
                <div className="bg-white rounded-xl p-4 sm:p-5 shadow-xs border-2 border-[#0d766e]/30 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#0d766e]">
                      clinical_notes
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      Ophthalmologist Review
                    </span>
                  </div>

                  <textarea
                    value={doctorNotes}
                    onChange={(e) => setDoctorNotes(e.target.value)}
                    rows={4}
                    placeholder="Enter clinical review notes, final grade adjustments, referral instructions..."
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d766e] resize-y"
                  />

                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { key: 'accepted', label: 'Accept AI', cls: 'bg-emerald-600 hover:bg-emerald-700' },
                        { key: 'modified', label: 'Modify', cls: 'bg-amber-500 hover:bg-amber-600' },
                        { key: 'rejected', label: 'Reject AI', cls: 'bg-red-600 hover:bg-red-700' },
                      ] as const
                    ).map((btn) => (
                      <button
                        key={btn.key}
                        type="button"
                        onClick={() => {
                          setDoctorDecision(btn.key);
                          setClinicianConfirmed(true);
                          setConfirmedAt(
                            new Date().toLocaleString('en-IN', {
                              timeZone: 'Asia/Kolkata',
                            }),
                          );
                          if (onUpdatePatient) {
                            onUpdatePatient({
                              ophthalmologistReviewStatus: btn.key,
                              ophthalmologistNotes: doctorNotes,
                              finalDiagnosis:
                                btn.key === 'accepted'
                                  ? patient.aiDiagnosis
                                  : doctorNotes || patient.aiDiagnosis,
                              triageStatus:
                                btn.key === 'rejected'
                                  ? 'AI rejected — manual review'
                                  : 'Ophthalmologist reviewed',
                            });
                          }
                          showToast(
                            `Review saved: ${btn.label}`,
                            'verified',
                          );
                        }}
                        className={`min-h-[40px] px-4 py-2 rounded-lg text-white text-xs font-bold ${btn.cls} ${
                          doctorDecision === btn.key ? 'ring-2 ring-offset-2 ring-slate-400' : ''
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>

                  {doctorDecision !== 'pending' && (
                    <div className="text-xs text-emerald-700 font-medium flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base">
                        check_circle
                      </span>
                      Review: <strong className="capitalize">{doctorDecision}</strong>
                      {confirmedAt ? ` · ${confirmedAt}` : ''}
                    </div>
                  )}
                </div>

                {/* ── Tele-Referral Actions ──────────────────────────────── */}
                <div className="bg-white rounded-xl p-4 sm:p-5 shadow-xs border border-slate-200 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">
                      Immediate Clinical Actions
                    </h3>
                    <span className="flex items-center gap-1 text-[11px] text-emerald-700 font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                      On-Call Doc Online
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Download the formal screening report or connect with the
                    District Hospital Ophthalmology tele-triage desk:
                  </p>

                  <div className="flex flex-col gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleDownloadPdfReport}
                      className="w-full min-h-[50px] px-4 py-2.5 rounded-xl bg-[#0d766e] hover:bg-[#005c55] text-white text-xs font-bold shadow-sm active:translate-y-px transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-xl">
                        picture_as_pdf
                      </span>
                      <span>
                        Download Screening Report (PDF)
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenTeleconsult(patient)}
                      className="w-full min-h-[46px] px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold active:translate-y-px transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-lg text-[#0d766e]">
                        video_call
                      </span>
                      <span>
                        Tele-Consult: {doctor.name} (District Hosp)
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenPrintSlip(patient)}
                      className="w-full min-h-[46px] px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold active:translate-y-px transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-lg text-[#0d766e]">
                        receipt_long
                      </span>
                      <span>
                        Generate Official Tele-Slip (Marathi / EN)
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={isSendingSms}
                      onClick={handleSendSms}
                      className="w-full min-h-[46px] px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold active:translate-y-px transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isSendingSms ? (
                        <>
                          <span className="material-symbols-outlined text-base animate-spin text-[#0d766e]">
                            sync
                          </span>
                          <span>Transmitting SMS...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-lg text-emerald-600">
                            chat
                          </span>
                          <span>
                            Send WhatsApp / SMS to {patient.mobile}
                          </span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={isSyncing}
                      onClick={handleSaveAndSync}
                      className="w-full min-h-[46px] px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold active:translate-y-px transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isSyncing ? (
                        <>
                          <span className="material-symbols-outlined text-base animate-pulse text-[#0d766e]">
                            lock
                          </span>
                          <span>Saving record...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-lg">
                            save_as
                          </span>
                          <span>Save Screening Record</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => onNavigate('screening-queue')}
                      className="inline-flex items-center gap-1 text-xs text-[#0d766e] font-bold hover:underline cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">
                        arrow_back
                      </span>
                      <span>Return to Screening Queue</span>
                    </button>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Session Token: #{patient.id}
                    </span>
                  </div>
                </div>

                {/* Re-run analysis button */}
                <button
                  type="button"
                  onClick={() => {
                    setAnalysisState('idle');
                    setAnalysisData(null);
                  }}
                  className="w-full min-h-[40px] px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 text-slate-500 text-xs font-semibold active:translate-y-px transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">
                    refresh
                  </span>
                  Re-run AI Analysis
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ── Eye Card sub-component ────────────────────────────────────────────────
interface EyeCardProps {
  eyeLabel: string;
  eyeName: string;
  data: DiagnosisResult;
  scanUrl: string;
  heatmapIntensity: number;
  onZoom: () => void;
  accentClass: string;
}

const EyeCard: React.FC<EyeCardProps> = ({
  eyeLabel,
  eyeName,
  data,
  scanUrl,
  heatmapIntensity,
  onZoom,
  accentClass,
}) => {
  const risk = riskLabel(data);

  return (
    <div className="rounded-xl bg-slate-50 p-3 flex flex-col gap-2 border border-slate-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span
            className={`w-6 h-6 rounded-full ${accentClass} text-xs font-bold flex items-center justify-center`}
          >
            {eyeLabel}
          </span>
          <span className="text-xs font-bold text-slate-900">{eyeName}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`px-2 py-0.5 rounded-full ${confidenceBg(
              data.confidence,
            )} border text-[10px] font-bold`}
          >
            {data.diagnosis} ({data.confidence}%)
          </span>
          <span
            className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${risk.cls}`}
          >
            {risk.label}
          </span>
        </div>
      </div>

      {/* Image Viewport */}
      <div className="relative w-full aspect-square rounded-lg bg-black overflow-hidden flex items-center justify-center group shadow-inner">
        <img
          src={scanUrl}
          alt={`${eyeName} ${eyeLabel}`}
          style={{
            filter: `saturate(${100 + heatmapIntensity * 0.3}%) contrast(${
              100 + heatmapIntensity * 0.15
            }%)`,
          }}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Optical Scan Line indicator */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="drishti-scan-line" />
        </div>

        <button
          type="button"
          onClick={onZoom}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-black text-white backdrop-blur-xs cursor-pointer drishti-btn"
          title="Inspect Fullscreen"
        >
          <span className="material-symbols-outlined text-base">zoom_in</span>
        </button>

        {/* Uncertainty overlay */}
        {data.uncertaintyFlag && (
          <div className="absolute inset-0 bg-amber-500/10 flex items-end justify-center pb-3">
            <span className="px-2 py-1 rounded bg-amber-500/90 text-white text-[10px] font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">
                warning
              </span>
              Low Confidence
            </span>
          </div>
        )}
      </div>

      {/* Findings */}
      <div className="p-2 rounded bg-white border border-slate-200 text-slate-800 flex flex-col gap-1 text-[11px]">
        <div className="flex justify-between font-semibold">
          <span className="text-slate-500">Microaneurysms:</span>
          <span className="text-slate-900 text-right">
            {data.microaneurysms}
          </span>
        </div>
        <div className="flex justify-between font-semibold">
          <span className="text-slate-500">Hemorrhages:</span>
          <span className="text-slate-900 text-right">
            {data.hemorrhages}
          </span>
        </div>
        <div className="flex justify-between font-semibold">
          <span className="text-slate-500">Exudates:</span>
          <span className="text-slate-900 text-right">{data.exudates}</span>
        </div>
        <div className="flex justify-between font-semibold">
          <span className="text-slate-500">CSME Status:</span>
          <span
            className={`text-right font-bold ${
              data.csmeStatus === 'Present'
                ? 'text-red-700'
                : 'text-emerald-700'
            }`}
          >
            {data.csmeStatus}
          </span>
        </div>
        <div className="flex justify-between font-semibold">
          <span className="text-slate-500">Visual Acuity Risk:</span>
          <span className="text-slate-900 text-right">
            {data.visualAcuityRisk}
          </span>
        </div>
      </div>
    </div>
  );
};
