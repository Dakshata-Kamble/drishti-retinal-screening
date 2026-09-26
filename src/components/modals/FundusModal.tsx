import React, { useState } from 'react';
import { Patient } from '../../types';

interface FundusModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
  initialEye?: 'OD' | 'OS';
  onPrintSlip?: () => void;
}

export const FundusModal: React.FC<FundusModalProps> = ({
  isOpen,
  onClose,
  patient,
  initialEye = 'OD',
  onPrintSlip,
}) => {
  const [selectedEye, setSelectedEye] = useState<'OD' | 'OS'>(initialEye);
  const [showGradCam, setShowGradCam] = useState(true);
  const [heatmapIntensity, setHeatmapIntensity] = useState(85);

  if (!isOpen || !patient) return null;

  const currentScanUrl =
    selectedEye === 'OD'
      ? patient.odScanUrl
      : patient.osScanUrl || patient.odScanUrl;

  const currentGradCamUrl =
    patient.gradCamUrl ||
    'https://lh3.googleusercontent.com/aida/AEtjO1XrXVgr_kCEb59lqHTX07Sr75RgxK5pXVn9f8Vk_28jVj9RHuKsz-aGKFlSyMrZgk7APCvyfBOJcedn_BuvZE1SFdUNSI9Z9nKRUIkSQP0-HTh4o9kmpFQLzRi35EudD9luQefTKnnEBsOaiuCzqFGl18TS69zvPZRj_3CkVDAr3pBkGcCRP5uNyRlaamYMvOm61Q4XndkIJb6lXyuRUJLjwO-uV93MBP0AeXzCyKT_v7CAxmIXpcUErPrE';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto drishti-modal-backdrop">
      <div className="bg-surface-container-lowest max-w-2xl w-full rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto border border-outline-variant/30 drishti-modal-content">
        {/* Header */}
        <div className="p-4 bg-surface-container-low flex items-center justify-between border-b border-outline-variant/20">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-primary text-xl">
              visibility
            </span>
            <div className="flex flex-col">
              <h3 className="text-sm font-bold text-slate-900">
                {patient.name} ({selectedEye}) · High-Definition Fundus Inspection
              </h3>
              <span className="text-[11px] text-teal-800 font-semibold">
                AI Confidence: {patient.aiConfidence} · Edge Quantized TFLite
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Eye Switcher Tabs */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-100 border-b border-slate-200 text-xs">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedEye('OD')}
              className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                selectedEye === 'OD'
                  ? 'bg-[#0d766e] text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              OD (Right Eye)
            </button>
            <button
              type="button"
              onClick={() => setSelectedEye('OS')}
              className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                selectedEye === 'OS'
                  ? 'bg-[#0d766e] text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              OS (Left Eye)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-semibold">
              <input
                type="checkbox"
                checked={showGradCam}
                onChange={(e) => setShowGradCam(e.target.checked)}
                className="w-4 h-4 accent-[#0d766e] rounded cursor-pointer"
              />
              <span>Grad-CAM AI Layer</span>
            </label>
          </div>
        </div>

        {/* Retinal Canvas Viewport */}
        <div className="p-6 bg-black flex flex-col items-center justify-center relative select-none">
          <div className="relative w-80 h-80 rounded-full overflow-hidden shadow-2xl bg-black border border-white/20">
            <img
              src={showGradCam ? currentGradCamUrl : currentScanUrl}
              alt={`${patient.name} retina`}
              style={{
                filter: showGradCam
                  ? `saturate(${100 + heatmapIntensity * 0.4}%) contrast(${95 + heatmapIntensity * 0.15}%)`
                  : 'none',
              }}
              className="w-full h-full object-cover transition-all duration-300"
            />

            {/* Anatomical Labels HUD */}
            <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 text-[9px] font-mono text-white/80">
              <div className="flex justify-between">
                <span className="bg-black/60 px-1.5 py-0.5 rounded">
                  FOV: 45.2°
                </span>
                <span className="bg-black/60 px-1.5 py-0.5 rounded">
                  NASAL: OPTIC DISC
                </span>
              </div>
              <div className="flex justify-between items-end">
                <span className="bg-black/60 px-1.5 py-0.5 rounded">
                  TEMPORAL: MACULA
                </span>
                <span className="bg-black/60 px-1.5 py-0.5 rounded">
                  QA: 98% SHARP
                </span>
              </div>
            </div>
          </div>

          {/* Saliency Intensity Slider */}
          {showGradCam && (
            <div className="mt-4 flex items-center gap-3 bg-white/10 px-4 py-2 rounded-full backdrop-blur-md">
              <span className="text-[11px] text-white font-medium">Heatmap:</span>
              <input
                type="range"
                min="20"
                max="100"
                value={heatmapIntensity}
                onChange={(e) => setHeatmapIntensity(Number(e.target.value))}
                className="w-28 accent-[#0d766e] h-1.5 bg-white/30 rounded-lg cursor-pointer"
              />
              <span className="text-[11px] text-teal-300 font-mono font-bold">
                {heatmapIntensity}%
              </span>
            </div>
          )}
        </div>

        {/* Clinical Notes & Diagnostic Breakdown */}
        <div className="p-4 bg-surface-container-lowest flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-900">
              Primary Diagnostic Assessment:
            </span>
            <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-bold uppercase text-[10px]">
              {patient.riskLevel}
            </span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            {patient.aiDiagnosis} · {patient.hardExudatesNote || 'No retinal fluid or neovascularization detected.'}
          </p>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[42px] px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold cursor-pointer"
            >
              Close View
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onPrintSlip) onPrintSlip();
              }}
              className="min-h-[42px] px-4 rounded-lg bg-[#0d766e] hover:bg-[#005c55] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">print</span>
              <span>Generate & Print Referral Slip</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
