import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ScreenId, Patient, DiagnosisResult } from '../../types';
import { analyzeRetina } from '../../services/retinaApi';
import { downloadScreeningReportPdf } from '../../services/reportPdf';

interface RetinalCaptureScreenProps {
  patient: Patient;
  onNavigate: (screen: ScreenId) => void;
  onOpenFundusModal: (patient: Patient, eye?: 'OD' | 'OS') => void;
  showToast: (msg: string, icon?: string) => void;
  onMarkOsCaptured?: () => void;
  onUpdatePatient?: (updated: Partial<Patient>) => Promise<void>;
}

type LocalPipeline = 'idle' | 'running' | 'done';

export const RetinalCaptureScreen: React.FC<RetinalCaptureScreenProps> = ({
  patient,
  onNavigate,
  onOpenFundusModal,
  showToast,
  onMarkOsCaptured,
  onUpdatePatient,
}) => {
  const [showEtdrsGrid, setShowEtdrsGrid] = useState(true);
  const [isRedFreeFilter, setIsRedFreeFilter] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [osCaptured, setOsCaptured] = useState(!!patient.osScanUrl);
  const [playingAudio, setPlayingAudio] = useState<'mr' | 'hi' | null>(null);
  const [shutterFlash, setShutterFlash] = useState(false);
  const [captureMode, setCaptureMode] = useState<'choose' | 'upload' | 'capture'>('choose');
  const [odUploadPreview, setOdUploadPreview] = useState<string | null>(null);
  const [osUploadPreview, setOsUploadPreview] = useState<string | null>(null);
  const [odFileName, setOdFileName] = useState<string | null>(null);
  const [osFileName, setOsFileName] = useState<string | null>(null);
  const odFileInputRef = useRef<HTMLInputElement>(null);
  const osFileInputRef = useRef<HTMLInputElement>(null);

  // On-page quality → enhancement → analysis → Grad-CAM → report
  const [pipeline, setPipeline] = useState<LocalPipeline>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<{
    od: DiagnosisResult;
    os: DiagnosisResult;
    analyzedAt: string;
  } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const pipelineSectionRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut: Spacebar captures OS
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !osCaptured && !isCapturing) {
        e.preventDefault();
        handleCaptureOs();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [osCaptured, isCapturing]);

  const handleCaptureOs = async () => {
    setIsCapturing(true);
    setShutterFlash(true);

    // Audio beep simulation
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (e) {
      // AudioContext may be restricted by browser policy
    }

    setTimeout(() => {
      setShutterFlash(false);
    }, 200);

    try {
      if (onMarkOsCaptured) await onMarkOsCaptured();
      setOsCaptured(true);
      showToast('OS Fundus captured & persisted to local vault.', 'check_circle');
    } catch (err) {
      showToast('Capture failed to persist. Please retry.', 'error');
    } finally {
      setIsCapturing(false);
    }
  };

  const handlePlayAudio = (lang: 'mr' | 'hi') => {
    if (playingAudio === lang) {
      setPlayingAudio(null);
      return;
    }
    setPlayingAudio(lang);
    showToast(
      lang === 'mr'
        ? 'Playing Marathi verbal coaching: "डोळे उघडे ठेवा, हिरव्या दिव्याकडे सरळ पहा"'
        : 'Playing Hindi verbal coaching: "पलकें न झपकाएं, हरी बत्ती को स्थिर देखें"',
      'record_voice_over'
    );
    setTimeout(() => {
      setPlayingAudio(null);
    }, 4500);
  };

  const handleFundusUpload = (eye: 'OD' | 'OS', file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid fundus image (JPEG, PNG, or TIFF).', 'error');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      showToast('Image exceeds 25 MB limit. Compress or re-capture.', 'error');
      return;
    }
    const url = URL.createObjectURL(file);
    if (eye === 'OD') {
      if (odUploadPreview) URL.revokeObjectURL(odUploadPreview);
      setOdUploadPreview(url);
      setOdFileName(file.name);
      if (onUpdatePatient) {
        onUpdatePatient({
          odScanUrl: url,
          odImageQuality: 'gradable',
          odStatus: 'Uploaded — pending AI',
        });
      }
      showToast(`OD fundus image uploaded: ${file.name}.`, 'upload_file');
    } else {
      if (osUploadPreview) URL.revokeObjectURL(osUploadPreview);
      setOsUploadPreview(url);
      setOsFileName(file.name);
      setOsCaptured(true);
      if (onUpdatePatient) {
        onUpdatePatient({
          osScanUrl: url,
          osImageQuality: 'gradable',
          osStatus: 'Uploaded — pending AI',
        });
      }
      if (onMarkOsCaptured) onMarkOsCaptured();
      showToast(`OS fundus image uploaded: ${file.name}.`, 'upload_file');
    }
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopTimer();
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const runOnPagePipeline = useCallback(async () => {
    const odUrl = odUploadPreview || patient.odScanUrl || '';
    const osUrl = osUploadPreview || patient.osScanUrl || '';
    if (!odUrl && !osUrl) {
      showToast('Upload at least one fundus image first.', 'error');
      return;
    }

    setPipeline('running');
    setElapsedMs(0);
    setAnalysisResult(null);
    stopTimer();
    timerRef.current = setInterval(() => {
      setElapsedMs((ms) => ms + 100);
    }, 100);

    // Scroll pipeline into view
    setTimeout(() => {
      pipelineSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);

    abortRef.current = new AbortController();
    try {
      const result = await analyzeRetina(odUrl || osUrl, osUrl || odUrl, abortRef.current.signal);
      stopTimer();
      setAnalysisResult(result);
      setPipeline('done');

      const maxConf = Math.max(result.od.confidence, result.os.confidence);
      const maxGrade = Math.max(result.od.icdrGrade ?? 0, result.os.icdrGrade ?? 0);
      const hasCsme = result.od.csmeStatus === 'Present' || result.os.csmeStatus === 'Present';
      let risk: 'Normal' | 'Mild' | 'High Risk' | 'Critical' = 'Normal';
      if (maxGrade >= 3 || hasCsme) risk = 'Critical';
      else if (maxGrade === 2) risk = 'High Risk';
      else if (maxGrade === 1) risk = 'Mild';

      if (onUpdatePatient) {
        onUpdatePatient({
          aiDiagnosis: `OD: ${result.od.diagnosis} | OS: ${result.os.diagnosis}`,
          aiConfidence: `${maxConf.toFixed(1)}%`,
          odStatus: `${result.od.diagnosis} (${result.od.confidence.toFixed(1)}%)`,
          osStatus: `${result.os.diagnosis} (${result.os.confidence.toFixed(1)}%)`,
          csmeDetected: hasCsme,
          icdrGradeOd: result.od.icdrGrade as 0 | 1 | 2 | 3 | 4,
          icdrGradeOs: result.os.icdrGrade as 0 | 1 | 2 | 3 | 4,
          microaneurysmsCount:
            parseInt(String(result.od.microaneurysms).match(/\d+/)?.[0] || '0', 10) || undefined,
          hardExudatesNote: [result.od.exudates, result.os.exudates].filter(Boolean).join('; '),
          neovascularization: maxGrade >= 4,
          riskLevel: risk,
          triageStatus: 'Awaiting Ophthalmologist Validation',
          ophthalmologistReviewStatus: 'pending',
          referralStatus:
            risk === 'Normal' || risk === 'Mild' ? 'not_required' : 'pending_review',
          odImageQuality: 'gradable',
          osImageQuality: 'gradable',
          gradCamUrl: odUrl || osUrl,
        });
      }
      showToast('Quality check, enhancement & AI screening complete.', 'check_circle');
    } catch {
      stopTimer();
      setPipeline('idle');
      showToast('Analysis cancelled or failed. Please try again.', 'error');
    }
  }, [odUploadPreview, osUploadPreview, patient.odScanUrl, patient.osScanUrl, onUpdatePatient, showToast]);

  const handleDownloadPdf = () => {
    if (!analysisResult) {
      showToast('Complete analysis first to download the report.', 'info');
      return;
    }
    try {
      downloadScreeningReportPdf({
        patient,
        od: analysisResult.od,
        os: analysisResult.os,
        analyzedAt: analysisResult.analyzedAt,
      });
      showToast('Screening report PDF downloaded.', 'download');
    } catch {
      showToast('Could not generate PDF.', 'error');
    }
  };

  const gradeLabel = (g: number | undefined) => {
    const map: Record<number, string> = {
      0: 'Level 0 — No DR',
      1: 'Level 1 — Mild NPDR',
      2: 'Level 2 — Moderate NPDR',
      3: 'Level 3 — Severe NPDR',
      4: 'Level 4 — Proliferative DR',
    };
    return g !== undefined && map[g] ? map[g] : '—';
  };

  return (
    <div className="flex flex-col w-full select-none">
      <div className="p-4 lg:p-6 flex flex-col gap-5 max-w-7xl mx-auto w-full pb-28">
        {/* Header */}
        <div className="bg-white rounded-xl p-4 sm:p-5 shadow-xs border border-slate-200 flex flex-col gap-4 drishti-entrance drishti-entrance--visible drishti-stagger-1">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-100 text-[#0d766e] flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-2xl">
                  {captureMode === 'upload' ? 'upload_file' : captureMode === 'capture' ? 'photo_camera' : 'visibility'}
                </span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 leading-tight">
                  {captureMode === 'choose'
                    ? 'Retinal Image Acquisition'
                    : captureMode === 'upload'
                      ? 'Upload Fundus Images'
                      : 'Retinal Capture'}
                </h1>
                <p className="text-[11px] text-slate-500 uppercase tracking-wider">
                  {captureMode === 'choose'
                    ? 'Choose how to acquire bilateral fundus images'
                    : 'रेटिनल इमेज • Bilateral Screening Protocol'}
                </p>
              </div>
            </div>
            {captureMode !== 'choose' && (
              <button
                type="button"
                onClick={() => setCaptureMode('choose')}
                className="min-h-[40px] px-3 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-50"
              >
                <span className="material-symbols-outlined text-base">arrow_back</span>
                Change method
              </button>
            )}

            {/* Pipeline Stepper */}
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-1">
              {[
                { n: 1, label: 'Registration', done: true, nav: 'patient-registration' as const },
                { n: 2, label: 'Capture / Upload', done: false, active: true },
                { n: 3, label: 'Quality → Analysis', done: false, nav: 'ai-diagnosis' as const },
                { n: 4, label: 'DR Grade', done: false },
                { n: 5, label: 'Explain & Refer', done: false },
              ].map((s, i, arr) => (
                <React.Fragment key={s.n}>
                  <button
                    type="button"
                    disabled={!s.nav}
                    onClick={() => s.nav && onNavigate(s.nav)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border shrink-0 ${
                      s.done
                        ? 'bg-emerald-50 border-emerald-200'
                        : s.active
                        ? 'bg-[#0d766e] border-[#0d766e] text-white'
                        : 'bg-slate-50 border-slate-200 opacity-70'
                    } ${s.nav ? 'cursor-pointer' : 'cursor-default'}`}
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
                    <span className={`text-[11px] font-bold whitespace-nowrap ${
                      s.done ? 'text-emerald-800' : s.active ? 'text-white' : 'text-slate-600'
                    }`}>
                      {s.label}
                    </span>
                  </button>
                  {i < arr.length - 1 && (
                    <span className="material-symbols-outlined text-slate-300 text-sm shrink-0">chevron_right</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Patient Demographics Strip */}
          <div className="bg-slate-50 rounded-lg p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-teal-100 text-[#0d766e] flex items-center justify-center font-bold text-base shadow-xs">
                RP
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">
                    {patient.name}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 text-[10px] font-bold">
                    {patient.age} Y / {patient.gender}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 text-[10px] font-medium font-mono">
                    ABHA: {patient.abhaId}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-slate-600">
                  <span className="flex items-center gap-1 font-medium text-slate-800">
                    <span className="material-symbols-outlined text-sm text-[#0d766e]">
                      location_on
                    </span>
                    Camp: Vadbare Anganwadi #03
                  </span>
                  <span>•</span>
                  <span className="text-red-700 font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">water_drop</span>
                    Diabetic (8 Yrs)
                  </span>
                  <span>•</span>
                  <span className="font-semibold text-slate-900">RBS: 198 mg/dL</span>
                  <span>•</span>
                  <span className="font-medium text-emerald-700">BP: 132/84 mmHg</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-right hidden xl:block">
                <div className="text-[10px] text-slate-500">Operator Session</div>
                <div className="text-xs font-bold text-[#0d766e]">
                  ASHA Sunita Devi (#4102)
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('patient-registration')}
                className="min-h-[40px] px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-base text-[#0d766e]">
                  medical_information
                </span>
                <span>View Full EHR</span>
              </button>
            </div>
          </div>
        </div>

        {/* STEP 1: Choose acquisition method */}
        {captureMode === 'choose' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 drishti-entrance drishti-entrance--visible">
            <button
              type="button"
              onClick={() => setCaptureMode('upload')}
              className="group text-left bg-white rounded-xl p-6 border-2 border-slate-200 hover:border-[#0d766e] hover:shadow-md transition-all flex flex-col gap-4"
            >
              <div className="w-14 h-14 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center group-hover:bg-[#0d766e] group-hover:text-white transition-colors">
                <span className="material-symbols-outlined text-3xl">upload_file</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-1">Upload Retina Images</h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Select fundus photographs from device storage or portable camera export. Supports JPEG, PNG, and TIFF. Image quality assessment runs after upload.
                </p>
              </div>
              <span className="inline-flex items-center gap-1 text-sm font-bold text-[#0d766e] mt-auto">
                Continue with Upload
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCaptureMode('capture')}
              className="group text-left bg-white rounded-xl p-6 border-2 border-slate-200 hover:border-[#0d766e] hover:shadow-md transition-all flex flex-col gap-4"
            >
              <div className="w-14 h-14 rounded-xl bg-teal-100 text-[#0d766e] flex items-center justify-center group-hover:bg-[#0d766e] group-hover:text-white transition-colors">
                <span className="material-symbols-outlined text-3xl">photo_camera</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-1">Capture with Camera</h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Live acquisition from connected fundus camera. Follow focus, alignment, and quality prompts. Recapture if image is inadequate.
                </p>
              </div>
              <span className="inline-flex items-center gap-1 text-sm font-bold text-[#0d766e] mt-auto">
                Continue with Capture
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </span>
            </button>
          </div>
        )}

        {/* UPLOAD MODE */}
        {captureMode === 'upload' && (
        <div className="bg-white rounded-xl p-4 sm:p-5 shadow-xs border border-slate-200 flex flex-col gap-4 drishti-entrance drishti-entrance--visible drishti-stagger-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">upload_file</span>
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Upload Fundus Images</h2>
                <p className="text-[11px] text-slate-500">
                  JPEG / PNG / TIFF · Max 25 MB · Quality assessment runs after upload
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* OD Upload */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-900">
                  <span className="w-7 h-7 rounded-md bg-teal-100 text-[#0d766e] flex items-center justify-center text-xs font-black">OD</span>
                  Right Eye (OD)
                </span>
                {odFileName && (
                  <span className="text-[11px] font-medium text-emerald-700 truncate max-w-[140px]" title={odFileName}>
                    {odFileName}
                  </span>
                )}
              </div>
              {odUploadPreview ? (
                <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-black aspect-[4/3]">
                  <img src={odUploadPreview} alt="Uploaded OD fundus" className="w-full h-full object-contain" />
                  <button
                    type="button"
                    onClick={() => {
                      if (odUploadPreview) URL.revokeObjectURL(odUploadPreview);
                      setOdUploadPreview(null);
                      setOdFileName(null);
                      if (odFileInputRef.current) odFileInputRef.current.value = '';
                    }}
                    className="absolute top-2 right-2 min-h-[32px] px-2 rounded-md bg-black/60 text-white text-xs font-semibold hover:bg-black/80"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="rounded-lg border-2 border-dashed border-slate-300 bg-white py-8 flex flex-col items-center justify-center gap-2 text-slate-500">
                  <span className="material-symbols-outlined text-3xl text-slate-400">image</span>
                  <span className="text-xs font-medium">No OD image selected</span>
                </div>
              )}
              <input
                ref={odFileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/tiff,image/tif,.jpg,.jpeg,.png,.tif,.tiff"
                className="hidden"
                onChange={(e) => handleFundusUpload('OD', e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => odFileInputRef.current?.click()}
                className="w-full min-h-[44px] px-4 rounded-xl bg-[#0d766e] hover:bg-[#005c55] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-sm"
              >
                <span className="material-symbols-outlined text-lg">upload</span>
                {odUploadPreview ? 'Replace OD Image' : 'Upload OD Fundus Image'}
              </button>
            </div>

            {/* OS Upload */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-900">
                  <span className="w-7 h-7 rounded-md bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-black">OS</span>
                  Left Eye (OS)
                </span>
                {osFileName && (
                  <span className="text-[11px] font-medium text-emerald-700 truncate max-w-[140px]" title={osFileName}>
                    {osFileName}
                  </span>
                )}
              </div>
              {osUploadPreview ? (
                <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-black aspect-[4/3]">
                  <img src={osUploadPreview} alt="Uploaded OS fundus" className="w-full h-full object-contain" />
                  <button
                    type="button"
                    onClick={() => {
                      if (osUploadPreview) URL.revokeObjectURL(osUploadPreview);
                      setOsUploadPreview(null);
                      setOsFileName(null);
                      setOsCaptured(false);
                      if (osFileInputRef.current) osFileInputRef.current.value = '';
                    }}
                    className="absolute top-2 right-2 min-h-[32px] px-2 rounded-md bg-black/60 text-white text-xs font-semibold hover:bg-black/80"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="rounded-lg border-2 border-dashed border-slate-300 bg-white py-8 flex flex-col items-center justify-center gap-2 text-slate-500">
                  <span className="material-symbols-outlined text-3xl text-slate-400">image</span>
                  <span className="text-xs font-medium">No OS image selected</span>
                </div>
              )}
              <input
                ref={osFileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/tiff,image/tif,.jpg,.jpeg,.png,.tif,.tiff"
                className="hidden"
                onChange={(e) => handleFundusUpload('OS', e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => osFileInputRef.current?.click()}
                className="w-full min-h-[44px] px-4 rounded-xl bg-[#0d766e] hover:bg-[#005c55] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-sm"
              >
                <span className="material-symbols-outlined text-lg">upload</span>
                {osUploadPreview ? 'Replace OS Image' : 'Upload OS Fundus Image'}
              </button>
            </div>
          </div>

          {(odUploadPreview || osUploadPreview) && pipeline === 'idle' && (
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <p className="text-xs text-slate-600">
                {odUploadPreview && osUploadPreview
                  ? 'Both eyes uploaded. Run quality check, enhancement & AI analysis below.'
                  : 'Upload the other eye if available, or run analysis on the uploaded eye.'}
              </p>
              <button
                type="button"
                onClick={runOnPagePipeline}
                className="min-h-[48px] px-6 rounded-xl bg-[#0d766e] hover:bg-[#005c55] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-sm"
              >
                <span className="material-symbols-outlined">biotech</span>
                Run Quality Check & AI Analysis
              </button>
            </div>
          )}
        </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            ON-PAGE PIPELINE: Quality → Enhance → Analyse → Grad-CAM → Report
        ═══════════════════════════════════════════════════════════════ */}
        {(pipeline === 'running' || pipeline === 'done') && (
          <div
            ref={pipelineSectionRef}
            className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden"
          >
            <div className="px-4 sm:px-5 py-3 border-b border-slate-100 bg-slate-50/80">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-700">
                Quality-aware screening pipeline
              </p>
              <h2 className="text-base font-bold text-slate-900 mt-0.5">
                {pipeline === 'running'
                  ? 'Checking quality · Enhancing · Analysing'
                  : 'Screening complete'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {patient.id} · {patient.name} · {patient.age} yrs
              </p>
            </div>

            {pipeline === 'running' && (() => {
              const t = elapsedMs / 1000;
              // ~45s total — realistic model latency
              const stageQuality = t >= 3;
              const stageEnhance = t >= 5;
              const stageEnhanceDone = t >= 14;
              const stageStructure = t >= 16;
              const stageLesion = t >= 22;
              const stageGrade = t >= 29;
              const stageGradCam = t >= 34;
              const stageReport = t >= 41;
              const fundusSrc = odUploadPreview || osUploadPreview || patient.odScanUrl || '';
              const showOriginal = t < 5;
              const showEnhancing = t >= 5 && t < 14;
              const showEnhanced = t >= 14 && t < 34;
              const showGradCam = t >= 34;
              const elapsedSec = (elapsedMs / 1000).toFixed(1);

              return (
                <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-900 relative aspect-square max-h-[300px] w-full">
                    {fundusSrc ? (
                      <>
                        <img
                          src={fundusSrc}
                          alt="Fundus analysis"
                          className={`w-full h-full object-cover transition-all duration-700 ${
                            showOriginal
                              ? 'opacity-90 brightness-90 contrast-90 saturate-75'
                              : showEnhancing
                              ? 'opacity-100 brightness-105 contrast-110 saturate-90'
                              : showEnhanced
                              ? 'opacity-100 brightness-110 contrast-125 saturate-100'
                              : 'opacity-100 brightness-105 contrast-120'
                          }`}
                        />
                        {showEnhancing && (
                          <div className="absolute inset-0 pointer-events-none overflow-hidden">
                            <div
                              className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-teal-300/80 to-transparent"
                              style={{
                                top: `${Math.min(90, ((t - 5) / 9) * 100)}%`,
                                boxShadow: '0 0 12px 4px rgba(45, 212, 191, 0.5)',
                              }}
                            />
                          </div>
                        )}
                        {showGradCam && (
                          <div
                            className="absolute inset-0 pointer-events-none mix-blend-screen opacity-70"
                            style={{
                              background:
                                'radial-gradient(ellipse 45% 40% at 42% 48%, rgba(239,68,68,0.75) 0%, rgba(249,115,22,0.45) 35%, rgba(234,179,8,0.2) 55%, transparent 75%), radial-gradient(ellipse 25% 22% at 62% 38%, rgba(239,68,68,0.55) 0%, transparent 70%)',
                            }}
                          />
                        )}
                        <div className="absolute top-2 left-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              showGradCam
                                ? 'bg-red-600 text-white'
                                : showEnhanced || showEnhancing
                                ? 'bg-teal-600 text-white'
                                : 'bg-slate-800/90 text-white'
                            }`}
                          >
                            {showGradCam
                              ? 'Grad-CAM attention'
                              : showEnhanced
                              ? 'Enhanced'
                              : showEnhancing
                              ? 'Enhancing…'
                              : 'Original'}
                          </span>
                        </div>
                        <div className="absolute bottom-2 left-2 right-2">
                          <span className="inline-block px-2 py-0.5 rounded bg-black/70 text-white text-[10px]">
                            {showGradCam
                              ? 'Regions contributing to DR prediction'
                              : showEnhanced
                              ? 'Illumination · contrast · noise corrected'
                              : showEnhancing
                              ? 'Quality enhancement in progress…'
                              : 'Assessing focus · illumination · FOV'}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
                        No image
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    {[
                      { t: '01  Image quality assessment', sub: 'Focus · Illumination · FOV · Clarity', done: stageQuality, active: !stageQuality && t > 0.2, key: false },
                      { t: '02  Image quality enhancement', sub: 'Normalize illumination · Boost contrast · Reduce noise', done: stageEnhanceDone, active: stageEnhance && !stageEnhanceDone, key: true },
                      { t: '03  Retinal structure analysis', sub: 'Optic disc · Fovea · Vessels', done: stageStructure, active: stageStructure && !stageLesion && t < 5.2, key: false },
                      { t: '04  Lesion detection', sub: 'Microaneurysms · Exudates · Hemorrhages', done: stageLesion, active: stageLesion && !stageGrade && t < 6.2, key: false },
                      { t: '05  DR severity (ICDR 0–4)', sub: 'Severity grading', done: stageGrade, active: stageGrade && !stageGradCam && t < 7.0, key: false },
                      { t: '06  Grad-CAM explainability', sub: 'Attention map for the prediction', done: stageGradCam, active: stageGradCam && !stageReport && t < 8.2, key: true },
                      { t: '07  Report ready', sub: 'Clinical screening summary', done: stageReport, active: stageReport, key: false },
                    ].map((step) => (
                      <div
                        key={step.t}
                        className={`flex items-start gap-2 p-2 rounded-lg border text-left ${
                          step.done
                            ? step.key
                              ? 'bg-teal-50 border-teal-300'
                              : 'bg-emerald-50 border-emerald-200'
                            : step.active
                            ? 'bg-teal-50 border-[#0d766e] shadow-sm'
                            : 'bg-slate-50 border-slate-100'
                        }`}
                      >
                        <span
                          className={`material-symbols-outlined text-base shrink-0 ${
                            step.done
                              ? 'text-emerald-600'
                              : step.active
                              ? 'text-[#0d766e] animate-spin'
                              : 'text-slate-300'
                          }`}
                        >
                          {step.done ? 'check_circle' : step.active ? 'progress_activity' : 'radio_button_unchecked'}
                        </span>
                        <div>
                          <span
                            className={`text-[12px] font-semibold block ${
                              step.done || step.active ? 'text-slate-900' : 'text-slate-400'
                            }`}
                          >
                            {step.t}
                            {step.key && (step.done || step.active) && (
                              <span className="ml-1 text-[9px] font-bold uppercase text-teal-700 bg-teal-100 px-1 rounded">
                                Key
                              </span>
                            )}
                          </span>
                          {(step.done || step.active) && (
                            <span className="text-[10px] text-teal-700 block mt-0.5">{step.sub}</span>
                          )}
                        </div>
                      </div>
                    ))}
                    <p className="text-[11px] text-slate-400 font-mono pt-1">Elapsed: {elapsedSec}s</p>
                  </div>
                </div>
              );
            })()}

            {/* CLEAN SCREENING REPORT */}
            {pipeline === 'done' && analysisResult && (
              <div className="p-4 sm:p-6 space-y-5">
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="bg-[#0d766e] text-white px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider opacity-90">
                      DRISHTI · AI-assisted retinal screening report
                    </p>
                    <p className="text-sm font-bold mt-0.5">
                      {patient.id} · {patient.name} · {patient.age} yrs · {patient.gender}
                    </p>
                  </div>

                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white">
                    {/* Image quality */}
                    <div className="rounded-lg border border-slate-100 p-3 bg-slate-50/50">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-2">
                        Image quality
                      </p>
                      <p className="text-sm font-semibold text-emerald-800 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-base">check_circle</span>
                        Acceptable — suitable for analysis
                      </p>
                      <p className="text-xs text-slate-600 mt-1">
                        Focus, illumination, field of view and clarity checked. Enhancement applied
                        (illumination normalization, contrast, noise reduction).
                      </p>
                    </div>

                    {/* Overall classification */}
                    <div className="rounded-lg border border-slate-100 p-3 bg-slate-50/50">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-2">
                        Overall classification
                      </p>
                      {(() => {
                        const maxG = Math.max(
                          analysisResult.od.icdrGrade ?? 0,
                          analysisResult.os.icdrGrade ?? 0,
                        );
                        const referable =
                          maxG >= 2 ||
                          analysisResult.od.csmeStatus === 'Present' ||
                          analysisResult.os.csmeStatus === 'Present';
                        return (
                          <>
                            <p className="text-sm font-bold text-slate-900">
                              {referable ? 'Referable diabetic retinopathy' : 'Non-referable / routine follow-up'}
                            </p>
                            <p className="text-xs text-slate-600 mt-1">
                              Highest ICDR: {gradeLabel(maxG)} · Ophthalmologist review{' '}
                              {referable ? 'recommended' : 'optional'}
                            </p>
                          </>
                        );
                      })()}
                    </div>

                    {/* OD */}
                    <div className="rounded-lg border border-slate-200 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-7 h-7 rounded-md bg-teal-100 text-[#0d766e] flex items-center justify-center text-xs font-black">
                          OD
                        </span>
                        <span className="text-sm font-bold text-slate-900">Right eye</span>
                      </div>
                      <p className="text-base font-bold text-slate-900">{analysisResult.od.diagnosis}</p>
                      <p className="text-xs text-slate-600 mt-1">{gradeLabel(analysisResult.od.icdrGrade)}</p>
                      <p className="text-xs text-slate-600">
                        Confidence: <strong>{analysisResult.od.confidence.toFixed(1)}%</strong>
                        {' · '}CSME: {analysisResult.od.csmeStatus}
                      </p>
                      <ul className="mt-2 text-[11px] text-slate-600 space-y-0.5 list-disc list-inside">
                        <li>Microaneurysms: {analysisResult.od.microaneurysms}</li>
                        <li>Hemorrhages: {analysisResult.od.hemorrhages}</li>
                        <li>Exudates: {analysisResult.od.exudates}</li>
                      </ul>
                    </div>

                    {/* OS */}
                    <div className="rounded-lg border border-slate-200 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-7 h-7 rounded-md bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-black">
                          OS
                        </span>
                        <span className="text-sm font-bold text-slate-900">Left eye</span>
                      </div>
                      <p className="text-base font-bold text-slate-900">{analysisResult.os.diagnosis}</p>
                      <p className="text-xs text-slate-600 mt-1">{gradeLabel(analysisResult.os.icdrGrade)}</p>
                      <p className="text-xs text-slate-600">
                        Confidence: <strong>{analysisResult.os.confidence.toFixed(1)}%</strong>
                        {' · '}CSME: {analysisResult.os.csmeStatus}
                      </p>
                      <ul className="mt-2 text-[11px] text-slate-600 space-y-0.5 list-disc list-inside">
                        <li>Microaneurysms: {analysisResult.os.microaneurysms}</li>
                        <li>Hemorrhages: {analysisResult.os.hemorrhages}</li>
                        <li>Exudates: {analysisResult.os.exudates}</li>
                      </ul>
                    </div>

                    {/* Grad-CAM note */}
                    <div className="md:col-span-2 rounded-lg border border-teal-100 bg-teal-50/40 p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-teal-800 mb-1">
                        Explainability (Grad-CAM)
                      </p>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {analysisResult.od.explainabilityNote ||
                          analysisResult.os.explainabilityNote ||
                          'Highlighted regions on the attention map indicate areas that contributed to the model prediction. Lesion findings above support the ICDR grade.'}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-2">
                        Simulated prototype output for demonstration · Not a clinically validated diagnosis · Final decision rests with the ophthalmologist
                      </p>
                    </div>
                  </div>

                  <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                    <p className="text-xs text-slate-600">
                      Recommendation:{' '}
                      <strong className="text-slate-900">
                        {Math.max(analysisResult.od.icdrGrade ?? 0, analysisResult.os.icdrGrade ?? 0) >= 2 ||
                        analysisResult.od.csmeStatus === 'Present' ||
                        analysisResult.os.csmeStatus === 'Present'
                          ? 'Ophthalmologist review required'
                          : 'Routine screening interval'}
                      </strong>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleDownloadPdf}
                        className="min-h-[44px] px-4 rounded-lg bg-[#0d766e] hover:bg-[#005c55] text-white text-xs font-bold flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
                        Download Report (PDF)
                      </button>
                      <button
                        type="button"
                        onClick={() => onNavigate('ai-diagnosis')}
                        className="min-h-[44px] px-4 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-2"
                      >
                        Full review screen
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPipeline('idle');
                          setAnalysisResult(null);
                        }}
                        className="min-h-[44px] px-4 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold"
                      >
                        Re-run analysis
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* CAPTURE MODE — Dual Retinal Viewfinder */}
        {captureMode === 'capture' && (
        <>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 drishti-entrance drishti-entrance--visible drishti-stagger-2">
          {/* LEFT COLUMN: RIGHT EYE (OD) [Captured & Validated State] */}
          <div className="bg-white rounded-xl p-4 sm:p-5 shadow-xs border border-slate-200 flex flex-col justify-between gap-4 relative overflow-hidden">
            {/* Panel Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-teal-100 text-[#0d766e] flex items-center justify-center font-black text-sm">
                  OD
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">
                      Right Eye (OD)
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">
                        check_circle
                      </span>
                      Captured & Validated
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Oculus Dexter • 45° Posterior Pole Macular-Centered
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowEtdrsGrid(!showEtdrsGrid)}
                  title="Toggle ETDRS Grid Overlay"
                  className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                    showEtdrsGrid
                      ? 'bg-[#0d766e] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">
                    grid_4x4
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsRedFreeFilter(!isRedFreeFilter)}
                  title="Invert / Red-Free Optical Filter"
                  className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                    isRedFreeFilter
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">
                    contrast
                  </span>
                </button>
              </div>
            </div>

            {/* 1:1 Circular Ophthalmology Retinal Matte Viewport */}
            <div className="relative w-full aspect-square max-w-[460px] mx-auto bg-black rounded-2xl flex items-center justify-center overflow-hidden p-2 shadow-inner group">
              <div className="relative w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-black">
                <img
                  alt="High-resolution clinical retinal fundus OD"
                  className={`w-full h-full object-cover scale-[1.03] transition-transform duration-300 ${
                    isRedFreeFilter ? 'filter hue-rotate-90 contrast-125 saturate-50' : ''
                  }`}
                  src={patient.odScanUrl}
                />

                {/* Ophthalmology ETDRS Alignment Reticle / Crosshair Overlay (SVGs) */}
                {showEtdrsGrid && (
                  <svg
                    className="absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-300"
                    viewBox="0 0 400 400"
                    fill="none"
                  >
                    {/* Central 45° FOV circular guide */}
                    <circle
                      cx="200"
                      cy="200"
                      r="190"
                      stroke="rgba(255, 255, 255, 0.25)"
                      strokeWidth="1.5"
                      strokeDasharray="6 4"
                    ></circle>
                    {/* Inner Macular Rings */}
                    <circle
                      cx="195"
                      cy="200"
                      r="45"
                      stroke="rgba(13, 118, 110, 0.7)"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                    ></circle>
                    <circle
                      cx="195"
                      cy="200"
                      r="90"
                      stroke="rgba(13, 118, 110, 0.5)"
                      strokeWidth="1.2"
                      strokeDasharray="4 4"
                    ></circle>
                    {/* Optic Disc Targeting Zone */}
                    <circle
                      cx="280"
                      cy="200"
                      r="38"
                      stroke="rgba(98, 223, 125, 0.85)"
                      strokeWidth="1.8"
                    ></circle>
                    <text
                      x="280"
                      y="150"
                      textAnchor="middle"
                      fill="#7ffc97"
                      fontFamily="Inter"
                      fontSize="10"
                      fontWeight="700"
                    >
                      OPTIC DISC (NASAL)
                    </text>
                    <text
                      x="195"
                      y="142"
                      textAnchor="middle"
                      fill="#a3faef"
                      fontFamily="Inter"
                      fontSize="10"
                      fontWeight="700"
                    >
                      FOVEA CENTRALIS
                    </text>
                    {/* Center Alignment Crosshairs */}
                    <line
                      x1="200"
                      y1="10"
                      x2="200"
                      y2="45"
                      stroke="rgba(255, 255, 255, 0.6)"
                      strokeWidth="1.5"
                    ></line>
                    <line
                      x1="200"
                      y1="355"
                      x2="200"
                      y2="390"
                      stroke="rgba(255, 255, 255, 0.6)"
                      strokeWidth="1.5"
                    ></line>
                    <line
                      x1="10"
                      y1="200"
                      x2="45"
                      y2="200"
                      stroke="rgba(255, 255, 255, 0.6)"
                      strokeWidth="1.5"
                    ></line>
                    <line
                      x1="355"
                      y1="200"
                      x2="390"
                      y2="200"
                      stroke="rgba(255, 255, 255, 0.6)"
                      strokeWidth="1.5"
                    ></line>
                  </svg>
                )}

                {/* Live Edge QA Badge Inside Viewport */}
                <div className="absolute top-4 left-4 flex flex-col gap-1 z-10">
                  <span className="px-2.5 py-1 rounded-md bg-emerald-600/90 text-white backdrop-blur-xs text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-md">
                    <span className="material-symbols-outlined text-xs">
                      verified
                    </span>
                    QA Grade: Excellent (96%)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-black/60 text-teal-200 backdrop-blur-xs text-[10px] font-mono">
                    FOV: 45.2° • Centered
                  </span>
                </div>

                {/* Optical Timestamp Overlay */}
                <div className="absolute bottom-4 right-4 z-10 text-right">
                  <span className="px-2 py-1 rounded bg-black/70 text-teal-200 text-[10px] font-mono backdrop-blur-xs">
                    OD_20241029_090330_RAW.dcm
                  </span>
                </div>
              </div>
            </div>

            {/* Telemetry Metadata Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
              <div className="flex flex-col">
                <span className="text-slate-500 text-[10px]">Focus Plane</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">
                    center_focus_strong
                  </span>
                  0.2D Locked
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-500 text-[10px]">Corneal Glare</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">
                    brightness_7
                  </span>
                  Zero Glare (0%)
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-500 text-[10px]">Pupil Size</span>
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">
                    radio_button_checked
                  </span>
                  4.1 mm (Clear)
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-500 text-[10px]">Cache Status</span>
                <span className="font-bold text-[#0d766e] flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">save</span>
                  Saved (6.4 MB)
                </span>
              </div>
            </div>

            {/* Action Row for Captured Eye */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  showToast('Re-arming optical sensor for OD retake...', 'refresh')
                }
                className="flex-1 min-h-[44px] px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">refresh</span>
                <span>Re-take OD Scan</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenFundusModal(patient, 'OD')}
                className="flex-1 min-h-[44px] px-3 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-[#0d766e] text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">zoom_in</span>
                <span>Inspect Quality (100%)</span>
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: LEFT EYE (OS) [Live Viewfinder Armed] */}
          <div className="bg-white rounded-xl p-4 sm:p-5 shadow-xs border border-slate-200 flex flex-col justify-between gap-4 relative overflow-hidden">
            {/* Panel Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-[#0d766e] text-white flex items-center justify-center font-black text-sm">
                  OS
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">
                      Left Eye (OS)
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 ${
                        osCaptured
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          osCaptured ? 'bg-emerald-600' : 'bg-blue-600 animate-ping'
                        }`}
                      ></span>
                      {osCaptured ? 'Captured & Analyzed' : 'Live Viewfinder Armed'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Oculus Sinister • Real-time Pupil Tracking & Alignment
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <div className="px-2 py-1 rounded bg-slate-100 text-xs text-[#0d766e] font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm text-emerald-600 animate-pulse">
                    videocam
                  </span>
                  <span>60 FPS RAW</span>
                </div>
              </div>
            </div>

            {/* 1:1 Live Camera Viewfinder Simulation with Alignment Ring */}
            <div className="relative w-full aspect-square max-w-[460px] mx-auto bg-black rounded-2xl flex items-center justify-center overflow-hidden p-2 shadow-inner">
              {/* Shutter flash effect */}
              {shutterFlash && (
                <div className="absolute inset-0 bg-white z-30 animate-out fade-out duration-200 pointer-events-none"></div>
              )}

              <div className="relative w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-black">
                {/* Live Preview Retinal Simulation */}
                <img
                  alt="Simulated real-time retinal fundus image"
                  className={`w-full h-full object-cover scale-[1.02] filter contrast-125 brightness-90 transform -scale-x-100 ${
                    !osCaptured && isCapturing ? 'blur-xs' : ''
                  }`}
                  src={patient.osScanUrl || patient.odScanUrl}
                />

                {/* Real-time optical scan line sweep */}
                {(!osCaptured || isCapturing) && (
                  <div className="drishti-scan-line" />
                )}

                {/* Infrared / Pupil Alignment Crosshair UI (Dynamic SVG HUD) */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox="0 0 400 400"
                >
                  {/* Outer Dynamic Target Rings */}
                  <circle
                    className="animate-spin"
                    cx="200"
                    cy="200"
                    r="185"
                    stroke="#007a33"
                    strokeWidth="2"
                    strokeDasharray="10 5"
                    style={{ animationDuration: '24s' }}
                  ></circle>
                  <circle
                    cx="200"
                    cy="200"
                    r="140"
                    stroke="rgba(13, 118, 110, 0.4)"
                    strokeWidth="1.5"
                  ></circle>

                  {/* Green Patient Fixation Target LED Simulation */}
                  <circle
                    className="animate-pulse"
                    cx="200"
                    cy="200"
                    r="6"
                    fill="#7ffc97"
                  ></circle>
                  <circle
                    cx="200"
                    cy="200"
                    r="16"
                    stroke="#7ffc97"
                    strokeWidth="1.5"
                    fill="none"
                    opacity="0.6"
                  ></circle>
                  <circle
                    cx="200"
                    cy="200"
                    r="30"
                    stroke="#7ffc97"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                    fill="none"
                    opacity="0.4"
                  ></circle>

                  {/* 4-Quadrant Alignment Brackets */}
                  <path
                    d="M 120 150 L 120 120 L 150 120"
                    fill="none"
                    stroke="#0d766e"
                    strokeWidth="3"
                  ></path>
                  <path
                    d="M 280 150 L 280 120 L 250 120"
                    fill="none"
                    stroke="#0d766e"
                    strokeWidth="3"
                  ></path>
                  <path
                    d="M 120 250 L 120 280 L 150 280"
                    fill="none"
                    stroke="#0d766e"
                    strokeWidth="3"
                  ></path>
                  <path
                    d="M 280 250 L 280 280 L 250 280"
                    fill="none"
                    stroke="#0d766e"
                    strokeWidth="3"
                  ></path>

                  {/* Distance / Working Distance Guide */}
                  <text
                    x="200"
                    y="325"
                    textAnchor="middle"
                    fill="#a3faef"
                    fontFamily="Inter"
                    fontSize="11"
                    fontWeight="700"
                    letterSpacing="1"
                  >
                    WORKING DISTANCE: 22mm (OPTIMAL)
                  </text>
                </svg>

                {/* Live Alignment Warning / Instruction Banner */}
                <div className="absolute top-4 inset-x-4 flex justify-between items-center z-10">
                  <span className="px-2.5 py-1 rounded-md bg-[#0d766e]/90 text-white backdrop-blur-xs text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md">
                    <span className="w-2 h-2 rounded-full bg-teal-300 animate-ping"></span>
                    Alignment: Optimal (Ready)
                  </span>
                  <span className="px-2 py-1 rounded bg-black/75 text-emerald-300 backdrop-blur-xs text-[10px] font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">adjust</span>
                    LED Fixation: Center
                  </span>
                </div>

                {/* Focus Quality Dial Indicator */}
                <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2">
                  <div className="px-3 py-1.5 rounded-lg bg-black/80 backdrop-blur-xs flex items-center gap-2 shadow-md">
                    <span className="material-symbols-outlined text-base text-emerald-400">
                      check_circle
                    </span>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-300 leading-none">
                        Auto-Focus
                      </span>
                      <span className="text-xs text-emerald-300 font-bold leading-tight">
                        94% Sharpness
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Telemetry Live Parameters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
              <div className="flex flex-col">
                <span className="text-slate-500 text-[10px]">Tracking Status</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">gps_fixed</span>
                  Pupil Locked
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-500 text-[10px]">Pupil Diameter</span>
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">circle</span>
                  3.8 mm (No Mydriasis)
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-500 text-[10px]">Illumination</span>
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">
                    wb_iridescent
                  </span>
                  IR 85% • Flash Ready
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-500 text-[10px]">Corneal Reflection</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">shield</span>
                  Polarized (Low)
                </span>
              </div>
            </div>

            {/* Prominent Primary Shutter Button for OS */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={isCapturing}
                onClick={handleCaptureOs}
                className={`w-full min-h-[52px] px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-3 shadow-md transition-all cursor-pointer active:translate-y-0.5 tracking-wide text-white drishti-btn ${
                  osCaptured
                    ? 'bg-emerald-700 hover:bg-emerald-800'
                    : 'bg-[#0d766e] hover:bg-[#005c55]'
                }`}
              >
                {isCapturing ? (
                  <>
                    <span className="material-symbols-outlined text-xl animate-spin">
                      progress_activity
                    </span>
                    <span>CAPTURING & ANALYZING RETINA...</span>
                  </>
                ) : osCaptured ? (
                  <>
                    <span className="material-symbols-outlined text-xl">
                      check_circle
                    </span>
                    <span>OS CAPTURED (GRADE: 97%) — RE-CAPTURE</span>
                    <span className="px-2 py-0.5 rounded bg-white/20 text-white text-[10px] font-mono uppercase">
                      Spacebar
                    </span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-2xl text-teal-200 animate-pulse">
                      radio_button_checked
                    </span>
                    <span>CAPTURE LEFT EYE (OS)</span>
                    <span className="px-2 py-0.5 rounded bg-white/20 text-white text-[10px] font-mono uppercase">
                      Spacebar
                    </span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() =>
                    showToast('LED Flash duration adjusted to 85% (Non-mydriatic).', 'flash_on')
                  }
                  className="min-h-[40px] px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">
                    flashlight_on
                  </span>
                  <span>Flash Intensity (85%)</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    showToast('Left Eye skipped: Flagged as monocular trauma in patient record.', 'visibility_off')
                  }
                  className="min-h-[40px] px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">
                    visibility_off
                  </span>
                  <span>Skip Left Eye</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Field Voice Guidance Assistant & Hardware Diagnostics Console */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {/* Audio Coach */}
          <div className="xl:col-span-2 bg-white rounded-xl p-4 sm:p-5 shadow-xs border border-slate-200 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#006398] flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">
                    record_voice_over
                  </span>
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Field Patient Audio Coach (ध्वनी सूचना)
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    One-tap vernacular voice instructions played aloud to patient through tablet speaker
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                Speaker Ready (80%)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
              {/* Marathi */}
              <div
                className={`p-3 rounded-lg border transition-colors flex items-center justify-between gap-2 ${
                  playingAudio === 'mr'
                    ? 'bg-teal-50 border-teal-300'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => handlePlayAudio('mr')}
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-xs cursor-pointer ${
                      playingAudio === 'mr'
                        ? 'bg-emerald-600 text-white animate-pulse'
                        : 'bg-[#0d766e] text-white hover:bg-[#005c55]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg">
                      {playingAudio === 'mr' ? 'volume_up' : 'play_arrow'}
                    </span>
                  </button>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      Marathi (मराठी मार्गदर्शक)
                    </span>
                    <span className="text-[11px] text-slate-500 truncate">
                      "डोळे उघडे ठेवा, हिरव्या दिव्याकडे सरळ पहा"
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono text-slate-600">
                  0:04
                </span>
              </div>

              {/* Hindi */}
              <div
                className={`p-3 rounded-lg border transition-colors flex items-center justify-between gap-2 ${
                  playingAudio === 'hi'
                    ? 'bg-teal-50 border-teal-300'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => handlePlayAudio('hi')}
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-xs cursor-pointer ${
                      playingAudio === 'hi'
                        ? 'bg-emerald-600 text-white animate-pulse'
                        : 'bg-[#006398] text-white hover:bg-[#004f7a]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg">
                      {playingAudio === 'hi' ? 'volume_up' : 'play_arrow'}
                    </span>
                  </button>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      Hindi (हिंदी निर्देश)
                    </span>
                    <span className="text-[11px] text-slate-500 truncate">
                      "पलकें न झपकाएं, हरी बत्ती को स्थिर देखें"
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono text-slate-600">
                  0:05
                </span>
              </div>
            </div>
          </div>

          {/* Funduscope Hardware Telemetry */}
          <div className="bg-white rounded-xl p-4 sm:p-5 shadow-xs border border-slate-200 flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#0d766e] text-lg">
                  videocam
                </span>
                <span className="text-xs font-bold text-slate-900 uppercase">
                  Device Health
                </span>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                CALIBRATED
              </span>
            </div>
            <div className="flex flex-col gap-1.5 text-xs">
              <div className="flex items-center justify-between py-1 bg-slate-50 px-2.5 rounded border border-slate-200">
                <span className="text-slate-500">Objective Lens:</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">lens</span>
                  Anti-Fog Heated / Dust Clean
                </span>
              </div>
              <div className="flex items-center justify-between py-1 bg-slate-50 px-2.5 rounded border border-slate-200">
                <span className="text-slate-500">Battery Pack:</span>
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs text-emerald-600">
                    battery_5_bar
                  </span>
                  84% (~5.5 hrs runtime)
                </span>
              </div>
              <div className="flex items-center justify-between py-1 bg-slate-50 px-2.5 rounded border border-slate-200">
                <span className="text-slate-500">Ambient Camp Lux:</span>
                <span className="font-bold text-slate-800">320 Lux (Optimal Shade)</span>
              </div>
            </div>
          </div>
        </div>
        </>
        )}
      </div>

      {/* Bottom Sticky Action Bar — only when a method is selected */}
      {captureMode !== 'choose' && (
      <footer className="fixed bottom-0 left-0 lg:left-72 right-0 z-30 bg-white/95 backdrop-blur-md px-4 lg:px-6 py-3 border-t border-slate-200 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onNavigate('patient-registration')}
            className="w-full sm:w-auto min-h-[46px] px-5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            <span>Back to Registration (Step 1)</span>
          </button>

          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
              {captureMode === 'upload'
                ? (odUploadPreview && osUploadPreview ? '2/2' : odUploadPreview || osUploadPreview ? '1/2' : '0/2')
                : osCaptured
                  ? '2/2'
                  : '1/2'}
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-slate-900 font-bold">
                {captureMode === 'upload'
                  ? odUploadPreview && osUploadPreview
                    ? 'Bilateral Upload Complete (OD & OS)'
                    : 'Upload fundus images for OD and OS'
                  : osCaptured
                    ? 'Bilateral Capture Complete (OD & OS)'
                    : '1 Eye Complete (OD), 1 Ready (OS)'}
              </span>
              <span className="text-[11px] text-slate-500">
                Image quality assessment precedes AI-assisted DR grading
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (captureMode === 'upload' && (odUploadPreview || osUploadPreview || patient.odScanUrl || patient.osScanUrl)) {
                if (pipeline === 'idle') {
                  runOnPagePipeline();
                } else if (pipeline === 'done') {
                  onNavigate('ai-diagnosis');
                }
                return;
              }
              if (captureMode === 'capture' && !osCaptured) {
                showToast('Proceeding with available scan(s).', 'check');
                setOsCaptured(true);
              }
              onNavigate('ai-diagnosis');
            }}
            className="w-full sm:w-auto min-h-[50px] px-6 py-2.5 rounded-xl bg-[#0d766e] hover:bg-[#005c55] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md active:translate-y-px transition-all cursor-pointer"
          >
            <span>
              {captureMode === 'upload' && pipeline === 'done'
                ? 'Open full review'
                : captureMode === 'upload' && (odUploadPreview || osUploadPreview)
                ? 'Run Quality & Analysis'
                : 'Proceed to Quality & Analysis'}
            </span>
            <span className="material-symbols-outlined text-lg">arrow_forward</span>
          </button>
        </div>
      </footer>
      )}
    </div>
  );
};
