import React, { useState } from 'react';
import { Patient, TeleconsultDoctor } from '../../types';

interface TeleconsultModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  doctor: TeleconsultDoctor;
  onCompleteConsult: () => void;
}

export const TeleconsultModal: React.FC<TeleconsultModalProps> = ({
  isOpen,
  onClose,
  patient,
  doctor,
  onCompleteConsult,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [callDuration, setCallDuration] = useState('02:14');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto drishti-modal-backdrop">
      <div className="bg-surface-container-lowest rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col my-auto border border-outline-variant/30 drishti-modal-content">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-inverse-surface text-inverse-on-surface flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
            <div className="flex flex-col">
              <span className="font-bold text-sm text-white">
                Live Tele-Consultation Session · WebRTC Encrypted
              </span>
              <span className="text-[11px] text-slate-300">
                District Hospital Nandurbar ⇄ Vadbare Anganwadi Camp #03 ({callDuration})
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Dual Video Stream Layout */}
        <div className="p-4 lg:p-5 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950">
          {/* Doctor Video Stream */}
          <div className="relative aspect-video rounded-xl bg-black overflow-hidden flex items-center justify-center border border-white/10">
            {isVideoOn ? (
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuB0xwl5lCZgubB9EgN9xZYNMHyRjL224R_vV3VnjKOju-SBMX68inmbFlOCHOTlh8CFiXXL5mled5NB_Tt_msK3trXs9mDto5O759IzLydMOv9Kh34ptgriiz1c28S4VSF78LP90-LWupsTIYa_QbeKUzSTXBI9TAwDH8x_ARkNtKLhdwGSnJBHJ0dUbLz0CD59YuTkGv1y7Mkx7r1_Ffkn1Bd-Cqt0T-xefJvUDw4XHA9OaRslz6QMig"
                alt={doctor.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 text-white">
                <span className="material-symbols-outlined text-4xl text-slate-400">
                  videocam_off
                </span>
                <span className="text-xs">Video Feed Paused</span>
              </div>
            )}
            <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded bg-black/75 text-white text-[11px] flex items-center gap-1.5 backdrop-blur-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="font-semibold">{doctor.name} ({doctor.qualifications})</span>
            </div>
          </div>

          {/* Patient Retinal Stream / Camera */}
          <div className="relative aspect-video rounded-xl bg-black overflow-hidden flex items-center justify-center border border-white/10">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBF1UeIiCE6UGfahELl0KW6AUSlLP20pDn03Oq2bhoablKsnte1BnvqIS7zLsmo1Pfcv1Jj-AVJyeY2wUQNAMlNLlw32KEcENIFkin1Wb0p6WrHZF-b19_BTWjXR__spJ7NAn7NCAHa-7_FZu6xzUTbyuyABtgKvwFfOHOxoCx7m7i_H0t2wa1OM34qiRHIQKS2vdaMn739LIz9rN3v6eV0k_8TE6KA4QMeIwvqOIK1FUzLw5HC3A6SAA"
              alt="Live Retinal DICOM stream"
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded bg-black/75 text-white text-[11px] flex items-center gap-1.5 backdrop-blur-xs">
              <span className="material-symbols-outlined text-xs text-teal-400">
                lens
              </span>
              <span>Patient: {patient.name} (OD/OS Dual Feed)</span>
            </div>
          </div>
        </div>

        {/* Doctor Clinical Orders & Live Directive */}
        <div className="p-4 lg:p-5 flex flex-col gap-3 bg-surface-container-lowest">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Specialist Diagnostic Directive & Prescription:
            </span>
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-slate-900 text-xs flex flex-col gap-1">
              <span className="font-bold text-red-700">
                Clinical Order: Immediate Anti-VEGF Intravitreal Injection (Ranibizumab) scheduled for Friday morning at District Hospital Nandurbar.
              </span>
              <span className="text-slate-600">
                Advise strict glycemic control (RBS: {patient.rbs}), avoid heavy physical lifting. Transportation coordinated via Nandurbar Sub-center free PM-JAY van.
              </span>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-200">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className={`min-h-[42px] px-3.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                  isMuted
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-surface-container-low text-slate-700 border-slate-200 hover:bg-surface-container'
                }`}
              >
                <span className="material-symbols-outlined text-base">
                  {isMuted ? 'mic_off' : 'mic'}
                </span>
                <span>{isMuted ? 'Unmute' : 'Mute Audio'}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsVideoOn(!isVideoOn)}
                className={`min-h-[42px] px-3.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                  !isVideoOn
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-surface-container-low text-slate-700 border-slate-200 hover:bg-surface-container'
                }`}
              >
                <span className="material-symbols-outlined text-base">
                  {isVideoOn ? 'videocam' : 'videocam_off'}
                </span>
                <span>{isVideoOn ? 'Camera On' : 'Camera Off'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onCompleteConsult}
              className="min-h-[44px] px-5 rounded-lg bg-red-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm hover:bg-red-800 active:translate-y-px transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">
                call_end
              </span>
              <span>Complete & Issue Official Tele-Slip</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
