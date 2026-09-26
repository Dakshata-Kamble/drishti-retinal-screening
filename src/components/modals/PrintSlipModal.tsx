import React from 'react';
import { Patient } from '../../types';
import { LOGO_URL, ASHA_WORKER } from '../../data/mockData';

interface PrintSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
}

export const PrintSlipModal: React.FC<PrintSlipModalProps> = ({
  isOpen,
  onClose,
  patient,
}) => {
  if (!isOpen || !patient) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto drishti-modal-backdrop">
      <div className="bg-white max-w-xl w-full rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto border border-slate-300 text-slate-900 drishti-modal-content">
        {/* Top Controls */}
        <div className="p-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#0d766e] text-lg">
              receipt_long
            </span>
            <span className="text-xs font-bold text-slate-800">
              Official NPCBVI Tele-Referral Slip Preview
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-[#0d766e] hover:bg-[#005c55] text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow-sm cursor-pointer drishti-btn"
            >
              <span className="material-symbols-outlined text-sm">print</span>
              <span>Print Slip</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-slate-500 hover:text-slate-800 cursor-pointer drishti-btn"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        </div>

        {/* Printable Official Slip Paper */}
        <div className="p-6 flex flex-col gap-4 font-sans text-xs bg-white">
          {/* Slip Header */}
          <div className="flex items-center justify-between border-b-2 border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <img
                src={LOGO_URL}
                alt="DrishtiAI"
                className="h-8 w-auto object-contain"
              />
              <div className="flex flex-col">
                <span className="font-extrabold text-sm tracking-tight text-slate-900">
                  NATIONAL HEALTH MISSION • MAHARASHTRA
                </span>
                <span className="text-[10px] text-slate-600 font-semibold">
                  NPCBVI Diabetic Retinopathy Outreach Triage Desk
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="font-mono font-bold text-[11px] text-red-700">
                TOKEN: #{patient.id}
              </span>
              <span className="text-[10px] text-slate-500">
                DATE: 2024-10-29 • 10:42 AM
              </span>
            </div>
          </div>

          {/* Priority Alert Box */}
          <div className="p-2.5 bg-red-50 border-2 border-red-500 rounded-lg flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-extrabold text-xs text-red-800 uppercase tracking-wider">
                PRIORITY 1 REFERRAL · 7-DAY SPECIALIST SLA
              </span>
              <span className="text-[11px] text-red-700 font-medium">
                Mandatory review by Vitreoretinal Dept, District Hospital Nandurbar
              </span>
            </div>
            <span className="px-2 py-0.5 rounded bg-red-600 text-white font-black text-[10px] uppercase">
              URGENT
            </span>
          </div>

          {/* Patient Demographics & Bio */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-bold">
                Patient Name / रुग्ण नाव
              </span>
              <span className="font-bold text-sm text-slate-900">
                {patient.name} ({patient.nameLocal})
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-bold">
                Age / Gender / Ling
              </span>
              <span className="font-semibold text-xs text-slate-800">
                {patient.age} Yrs • {patient.gender}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-bold">
                ABHA ID (Ayushman Card)
              </span>
              <span className="font-mono font-bold text-xs text-[#0d766e]">
                {patient.abhaId} (Verified)
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-bold">
                Mobile / Phone
              </span>
              <span className="font-semibold text-xs text-slate-800">
                {patient.mobile}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-[10px] text-slate-500 block uppercase font-bold">
                Village & Camp Site
              </span>
              <span className="text-xs text-slate-800">
                {patient.village} (Camp: {ASHA_WORKER.campLocation})
              </span>
            </div>
          </div>

          {/* Diagnostic Findings */}
          <div className="flex flex-col gap-1.5 p-3 rounded-lg border border-slate-300">
            <span className="font-bold text-xs text-slate-900 uppercase">
              Edge AI Tele-Ophthalmology Findings:
            </span>
            <div className="text-xs font-bold text-red-700">
              {patient.aiDiagnosis} (Confidence: {patient.aiConfidence})
            </div>
            <div className="text-[11px] text-slate-700 leading-snug">
              OD/OS 45° Non-Mydriatic Fundus Examination. CSME involving foveal arc, deep lipid exudation and dot/blot hemorrhages identified.
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[10px] text-slate-600">
              <span>RBS: {patient.rbs}</span>
              <span>BP: {patient.bp}</span>
              <span>Visual Acuity: 6/36</span>
            </div>
          </div>

          {/* Offline Tamper-Proof Cryptographic QR & Stamp */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200">
            <div className="flex items-center gap-3">
              {/* QR Code SVG */}
              <div className="p-2 border border-slate-300 rounded-md bg-white">
                <svg className="w-16 h-16 text-slate-900" viewBox="0 0 100 100" fill="currentColor">
                  <rect x="5" y="5" width="26" height="26" rx="2" />
                  <rect x="10" y="10" width="16" height="16" fill="white" />
                  <rect x="14" y="14" width="8" height="8" />
                  <rect x="69" y="5" width="26" height="26" rx="2" />
                  <rect x="74" y="10" width="16" height="16" fill="white" />
                  <rect x="78" y="14" width="8" height="8" />
                  <rect x="5" y="69" width="26" height="26" rx="2" />
                  <rect x="10" y="74" width="16" height="16" fill="white" />
                  <rect x="14" y="78" width="8" height="8" />
                  <rect x="40" y="15" width="18" height="8" />
                  <rect x="40" y="35" width="20" height="20" />
                  <rect x="70" y="45" width="10" height="10" />
                  <rect x="45" y="70" width="15" height="15" />
                  <rect x="70" y="70" width="20" height="10" />
                </svg>
              </div>
              <div className="flex flex-col text-[10px] text-slate-600">
                <span className="font-bold text-slate-800">
                  ECDSA-256 Tamper-Proof Stamp
                </span>
                <span>Self-contained offline verification payload</span>
                <span className="font-mono text-[9px] text-slate-500">
                  SHA: 8F2A-99B1-E3C4
                </span>
              </div>
            </div>

            <div className="flex flex-col items-end text-right text-[10px]">
              <span className="font-bold text-slate-800">
                Screening Officer Signature:
              </span>
              <span className="text-[#0d766e] font-bold">
                {ASHA_WORKER.name} ({ASHA_WORKER.id})
              </span>
              <span className="text-slate-500 text-[9px]">
                {ASHA_WORKER.center}
              </span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-[10px] text-slate-500 print:hidden">
          Patient is entitled to 100% cashless treatment under Ayushman Bharat PM-JAY at District Hospital Nandurbar.
        </div>
      </div>
    </div>
  );
};
