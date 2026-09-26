import React, { useState } from 'react';
import { ScreenId, Patient, TeleconsultDoctor } from '../../types';

interface ReferralsTeleConsultScreenProps {
  urgentPatient: Patient;
  otherPatients: Patient[];
  doctor: TeleconsultDoctor;
  onNavigate: (screen: ScreenId) => void;
  onOpenFundusModal: (patient: Patient, eye?: 'OD' | 'OS') => void;
  onOpenTeleconsult: (patient: Patient) => void;
  onOpenPrintSlip: (patient: Patient) => void;
  showToast: (msg: string, icon?: string) => void;
}

export const ReferralsTeleConsultScreen: React.FC<ReferralsTeleConsultScreenProps> = ({
  urgentPatient,
  otherPatients,
  doctor,
  onNavigate,
  onOpenFundusModal,
  onOpenTeleconsult,
  onOpenPrintSlip,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'dr' | 'glaucoma'>('all');

  const scheduledReferrals = otherPatients.filter(
    (p) => p.riskLevel === 'High Risk'
  );

  const handleWhatsAppSon = () => {
    showToast(
      'WhatsApp digital referral slip transmitted to Suresh Patil (+91 94220-88419).',
      'chat'
    );
  };

  const handleBatchSaveQr = () => {
    showToast(
      'Offline Buffer Secured: All 3 referral tokens cryptographically signed with ECDSA-256 and cached in SQLite.',
      'download_done'
    );
  };

  return (
    <div className="flex flex-col w-full select-none">
      {/* Top Header & Triage Ribbon */}
      <div className="px-4 lg:px-6 py-4 bg-white shadow-xs border-b border-slate-200 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 text-[10px] font-bold uppercase tracking-wide">
                Emergency Tele-Triage
              </span>
              <span className="text-slate-500 text-xs font-mono">
                DH-NDB-OPHTH-2024-09
              </span>
            </div>
            <div className="flex items-baseline gap-3 flex-wrap">
              <h1 className="text-2xl lg:text-3xl text-slate-900 font-extrabold tracking-tight">
                Referrals & Tele-Consult
              </h1>
              <span className="text-lg lg:text-xl text-[#0d766e] font-semibold">
                (टेलि-सल्ला आणि रुग्ण संदर्भ)
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Connected Tele-Ophthalmology Link with District Hospital Nandurbar (DH Nandurbar) • Secure WebRTC DICOM Tunnel
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping"></span>
              <span>Specialist Link Online</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-800 text-xs font-semibold flex items-center gap-1.5 border border-slate-200">
              <span className="material-symbols-outlined text-base text-[#0d766e]">
                hub
              </span>
              <span>Sub-Center: Vadbare #03</span>
            </div>
          </div>
        </div>

        {/* Tele-Triage Metrics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 drishti-entrance drishti-entrance--visible drishti-stagger-1">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase font-bold">
                Active Specialist Room
              </span>
              <span className="text-lg font-extrabold text-slate-900">
                1 Doctor Live
              </span>
            </div>
            <span className="material-symbols-outlined text-2xl text-[#0d766e]">
              video_camera_front
            </span>
          </div>

          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-950 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] text-red-700 font-bold uppercase">
                Urgent Tele-Consult
              </span>
              <span className="text-lg font-extrabold text-red-700">
                1 Critical Case
              </span>
            </div>
            <span className="material-symbols-outlined text-2xl text-red-600">
              priority_high
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase font-bold">
                Camp Referrals Pending
              </span>
              <span className="text-lg font-extrabold text-slate-900">
                3 Actionable
              </span>
            </div>
            <span className="material-symbols-outlined text-2xl text-[#006398]">
              assignment_ind
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase font-bold">
                Local QR Stamped Slips
              </span>
              <span className="text-lg font-extrabold text-emerald-700">
                100% Offline Valid
              </span>
            </div>
            <span className="material-symbols-outlined text-2xl text-emerald-600">
              qr_code_2
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="p-4 lg:p-6 flex flex-col xl:flex-row gap-5 items-start max-w-7xl mx-auto w-full pb-20">
        {/* Left Column: Consult Room + Patient Queues (8 Cols) */}
        <div className="w-full xl:w-8/12 flex flex-col gap-5 min-w-0">
          {/* Specialist Tele-Desk Hero Card */}
          <div className="w-full bg-white rounded-xl p-5 shadow-xs border border-slate-200 flex flex-col gap-4 drishti-entrance drishti-entrance--visible drishti-stagger-2">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="relative">
                  <img
                    alt={doctor.name}
                    className="w-16 h-16 rounded-xl object-cover ring-2 ring-emerald-500/20"
                    src={doctor.avatarUrl}
                  />
                  <span
                    className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-white"
                    title="Specialist Online"
                  ></span>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-slate-900">
                      {doctor.name}, {doctor.qualifications}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">
                      Online & Active
                    </span>
                  </div>
                  <span className="text-xs text-slate-600">{doctor.role}</span>
                  <span className="text-xs font-semibold text-[#0d766e]">
                    {doctor.hospital}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:items-end gap-1">
                <span className="text-[11px] text-slate-500">
                  Local Camp Medical Officer:
                </span>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-200">
                  <span className="material-symbols-outlined text-base text-[#0d766e]">
                    stethoscope
                  </span>
                  <span>Dr. Rajesh Rathod (On-site Vadbare)</span>
                </div>
              </div>
            </div>

            {/* Connection Latency & Protocol Box */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-emerald-600">
                  lock
                </span>
                <span>WebRTC 256-bit Encrypted Audio/Video</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-[#006398]">
                  lan
                </span>
                <span>Direct Fundus Feed: 4K UHD DICOM</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-[#0d766e]">
                  timelapse
                </span>
                <span>
                  Queue: <strong className="text-slate-900">1 in room ({urgentPatient.name})</strong>
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100">
              <p className="text-xs text-slate-600 max-w-md">
                Clicking initiate will launch dual-stream Funduscope feed alongside two-way high-gain audio optimized for rural low-bandwidth relays.
              </p>
              <button
                type="button"
                onClick={() => onOpenTeleconsult(urgentPatient)}
                className="min-h-[46px] px-5 py-2.5 rounded-lg bg-[#0d766e] hover:bg-[#005c55] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer drishti-btn"
              >
                <span className="material-symbols-outlined text-lg">
                  video_call
                </span>
                <span>Start Live Tele-Consultation with Dr. Kulkarni</span>
              </button>
            </div>
          </div>

          {/* Urgent Priority Tele-Triage Case Card */}
          <div className="w-full bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden flex flex-col drishti-entrance drishti-entrance--visible drishti-stagger-3">
            {/* Urgent Case Banner */}
            <div className="px-4 py-2.5 bg-red-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs tracking-wide uppercase font-bold">
                <span className="material-symbols-outlined text-base animate-bounce">
                  warning
                </span>
                <span>Urgent Case #01: Immediate Specialist Review Required</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-white text-red-700 text-[10px] font-black uppercase">
                CRITICAL PRIORITY
              </span>
            </div>

            <div className="p-5 flex flex-col gap-4">
              {/* Patient Metadata Header */}
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-lg font-bold text-slate-900">
                      {urgentPatient.name}
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                      {urgentPatient.age} Y / {urgentPatient.gender}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 text-xs font-bold font-mono">
                      ID: {urgentPatient.id}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-500 text-xs mt-1">
                    <span>
                      ABHA ID: <strong className="text-slate-800">{urgentPatient.abhaId}</strong>
                    </span>
                    <span>•</span>
                    <span>Vadbare Village, Pada #2, Nandurbar</span>
                    <span>•</span>
                    <span>Screened: Today, 10:14 AM</span>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">
                    Target Facility
                  </span>
                  <span className="text-xs font-bold text-[#0d766e]">
                    Dept. of Vitreoretina, DH Nandurbar
                  </span>
                </div>
              </div>

              {/* Diagnostic Split View: Grad-CAM Retinal Preview + Clinical Insights */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                {/* Retinal Heatmap Image Frame (5 Cols) */}
                <div className="lg:col-span-5 flex flex-col gap-2">
                  <div className="relative aspect-square w-full bg-black rounded-lg overflow-hidden flex items-center justify-center group shadow-inner">
                    <img
                      src={urgentPatient.gradCamUrl || urgentPatient.odScanUrl}
                      alt="Ramesh Patil Retina"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/75 text-white text-[10px] backdrop-blur-xs">
                      OD • Right Eye (Macula-Centered)
                    </div>
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-bold">
                      AI Conf: {urgentPatient.aiConfidence}
                    </div>
                    <div className="absolute bottom-2 inset-x-2 p-1.5 rounded bg-black/80 text-white text-[10px] flex items-center justify-between">
                      <span>Grad-CAM Saliency: High Edema Risk</span>
                      <button
                        type="button"
                        onClick={() => onOpenFundusModal(urgentPatient, 'OD')}
                        className="text-teal-300 hover:underline flex items-center gap-0.5 cursor-pointer font-semibold"
                      >
                        <span className="material-symbols-outlined text-xs">zoom_in</span> Fullscreen
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                    <span>Lens: 45° Non-Mydriatic Fundus</span>
                    <span className="text-emerald-700 flex items-center gap-1 font-semibold">
                      <span className="material-symbols-outlined text-xs">check_circle</span> Quality: Optimal
                    </span>
                  </div>
                </div>

                {/* Clinical Assessment & Triage Telemetry (7 Cols) */}
                <div className="lg:col-span-7 flex flex-col justify-between gap-3">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-red-600 text-base">
                        medical_information
                      </span>
                      <span className="text-xs font-bold text-slate-900">
                        Primary AI Diagnosis:
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-white border border-slate-200 flex flex-col gap-1">
                      <span className="text-xs font-bold text-red-700">
                        {urgentPatient.aiDiagnosis}
                      </span>
                      <p className="text-[11px] text-slate-600 leading-snug">
                        Dense circinate lipid exudates within 500μm of foveal center, flame hemorrhages across all 4 quadrants, severe microvascular anomalies. Immediate Anti-VEGF / Focal Laser evaluation advised.
                      </p>
                    </div>

                    {/* Bio-telemetry checklist */}
                    <div className="grid grid-cols-2 gap-2 mt-1 text-xs">
                      <div className="p-2 rounded bg-white border border-slate-200 flex flex-col">
                        <span className="text-slate-500 text-[10px]">Random Blood Sugar (RBS)</span>
                        <span className="font-bold text-red-700 text-xs">286 mg/dL (Uncontrolled)</span>
                      </div>
                      <div className="p-2 rounded bg-white border border-slate-200 flex flex-col">
                        <span className="text-slate-500 text-[10px]">Visual Acuity (Right OD)</span>
                        <span className="font-bold text-red-700 text-xs">6/36 (Reduced)</span>
                      </div>
                      <div className="p-2 rounded bg-white border border-slate-200 flex flex-col">
                        <span className="text-slate-500 text-[10px]">Patient Attendant Contact</span>
                        <span className="font-bold text-slate-800 text-xs truncate">Suresh Patil (Son): +91 94220-88419</span>
                      </div>
                      <div className="p-2 rounded bg-white border border-slate-200 flex flex-col">
                        <span className="text-slate-500 text-[10px]">Emergency Transport</span>
                        <span className="font-bold text-emerald-700 text-xs">108 Patient Van Confirmed</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => onOpenTeleconsult(urgentPatient)}
                      className="flex-1 min-h-[44px] px-3.5 py-2 rounded-lg bg-red-700 text-white hover:bg-red-800 text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer drishti-btn"
                    >
                      <span className="material-symbols-outlined text-base">videocam</span>
                      <span>Initiate Immediate Video Tele-Consult</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenPrintSlip(urgentPatient)}
                      className="min-h-[44px] px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer drishti-btn"
                    >
                      <span className="material-symbols-outlined text-base text-[#0d766e]">print</span>
                      <span>Print Pre-Stamped Slip</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleWhatsAppSon}
                      className="min-h-[44px] px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer drishti-btn"
                      title="Send WhatsApp Digital Slip"
                    >
                      <span className="material-symbols-outlined text-base text-emerald-600">chat</span>
                      <span>WhatsApp Son</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Secondary High-Risk Referrals Queue Table */}
          <div className="w-full bg-white rounded-xl shadow-xs border border-slate-200 p-5 flex flex-col gap-4 drishti-entrance drishti-entrance--visible drishti-stagger-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#0d766e] text-xl">
                  folder_shared
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  Scheduled Tele-Referral Queue
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[11px] font-bold">
                  {scheduledReferrals.length} Pending Today
                </span>
              </div>
            </div>

            {scheduledReferrals.map((p) => (
              <div
                key={p.id}
                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 drishti-table-row"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-lg bg-teal-100 text-[#0d766e] flex items-center justify-center font-bold text-sm shrink-0">
                    {p.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-900 truncate">
                        {p.name}
                      </span>
                      <span className="text-slate-500 text-xs">
                        {p.age} Y / {p.gender[0]}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 text-[10px] font-mono">
                        ABHA: {p.abhaId}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 text-[10px] font-bold">
                        AI: {p.aiConfidence}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-600">
                      <span className="font-medium text-slate-800">
                        {p.aiDiagnosis}
                      </span>
                      <span>•</span>
                      <span>SLA: 14 Days</span>
                      <span>•</span>
                      <span className="text-[#0d766e] font-semibold">
                        Laser / Hospital Triage
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <button
                    type="button"
                    onClick={() => onOpenPrintSlip(p)}
                    className="min-h-[40px] px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-xs drishti-btn"
                  >
                    <span className="material-symbols-outlined text-sm text-[#0d766e]">
                      print
                    </span>
                    <span>Print Slip</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenFundusModal(p, 'OD')}
                    className="min-h-[40px] px-3.5 py-1.5 rounded-lg bg-[#0d766e] hover:bg-[#005c55] text-white text-xs font-semibold flex items-center gap-1 shadow-xs cursor-pointer drishti-btn"
                  >
                    <span className="material-symbols-outlined text-sm">
                      visibility
                    </span>
                    <span>View Case</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Transport Logistics, Offline Digital QR Token, & Village Map (4 Cols) */}
        <div className="w-full xl:w-4/12 flex flex-col gap-5">
          {/* Camp Transport & Logistics Card */}
          <div className="w-full bg-white rounded-xl shadow-xs border border-slate-200 p-5 flex flex-col gap-4 drishti-entrance drishti-entrance--visible drishti-stagger-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-blue-100 text-[#006398] flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">
                  airport_shuttle
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-900">
                  Camp Transport & Logistics
                </span>
                <span className="text-[11px] text-slate-500">
                  Sub-Center Vadbare ⇄ DH Nandurbar
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-col gap-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Scheduled PHC Van:</span>
                <span className="font-bold text-[#0d766e]">
                  Every Thursday, 08:30 AM
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Distance to District Hospital:</span>
                <span className="font-bold text-slate-900">
                  42 km (Approx. 1h 15m)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Fare Coverage:</span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                  100% Free (PM-JAY)
                </span>
              </div>
            </div>

            {/* Embedded Transit Route Map Graphic */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] text-slate-500 uppercase font-bold">
                Referral Transit Route
              </span>
              <div
                className="w-full h-36 bg-cover bg-center rounded-lg shadow-inner flex flex-col justify-end p-2.5 relative overflow-hidden border border-slate-200"
                style={{
                  backgroundImage:
                    "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDVjzmiT8aZ-nanEv19F3qXu24ui3SCM2PHMdOcoEUTZ3lYvNvIaNnPugV_gaHdIr49crbxDXAlhmEoOSfCI2SlPUKn8uJ2WN2Hydp5majLCe1IP8bvYAB0wEl79h8X7W1N9aICWCs7KsKC3obpPCXiFxQZsuc_7H-hobMP3-Fh1Clp3cWLP7RDtm87OPR6oVWZ3YSTDtyMk8MFIgH_tKPE0LGC6axddQXFj2OyNFUkviaO3GXnsWCsLw')",
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent"></div>
                <div className="relative z-10 flex items-center justify-between text-white text-[11px]">
                  <span className="flex items-center gap-1 font-bold">
                    <span className="material-symbols-outlined text-sm text-teal-300">
                      location_on
                    </span>
                    Vadbare → DH Nandurbar Route
                  </span>
                  <span className="bg-black/70 px-2 py-0.5 rounded text-[10px] font-mono">
                    NH-753B
                  </span>
                </div>
              </div>
            </div>

            {/* Emergency 108 Dispatch Direct Action */}
            <div className="flex flex-col gap-2 pt-1 border-t border-slate-100">
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Critical Amb Assistance:</span>
                <span className="font-semibold text-red-700">
                  Ambulance Base: PHC Dhanora
                </span>
              </div>
              <a
                href="tel:108"
                className="min-h-[44px] w-full px-4 py-2 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer text-center drishti-btn hover:bg-red-100"
              >
                <span className="material-symbols-outlined text-base text-red-600">
                  call
                </span>
                <span>Dispatch 108 Ambulance Unit</span>
              </a>
            </div>
          </div>

          {/* Offline Tamper-Proof Slip & Encrypted QR Buffer */}
          <div className="w-full bg-white rounded-xl shadow-xs border border-slate-200 p-5 flex flex-col gap-3.5 drishti-entrance drishti-entrance--visible drishti-stagger-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600 text-lg">
                  verified_user
                </span>
                <span className="text-xs font-bold text-slate-900 uppercase">
                  Offline Tamper-Proof Slip
                </span>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                ECDSA-256
              </span>
            </div>

            {/* Visual Pre-Stamped Tele-Slip Hologram Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center text-center gap-3">
              <div className="p-3 bg-white rounded-lg shadow-xs border border-slate-200 flex items-center justify-center">
                <svg className="w-24 h-24 text-slate-900" viewBox="0 0 120 120" fill="currentColor">
                  <rect x="10" y="10" width="30" height="30" rx="3" />
                  <rect x="16" y="16" width="18" height="18" fill="white" />
                  <rect x="20" y="20" width="10" height="10" />
                  <rect x="80" y="10" width="30" height="30" rx="3" />
                  <rect x="86" y="16" width="18" height="18" fill="white" />
                  <rect x="90" y="20" width="10" height="10" />
                  <rect x="10" y="80" width="30" height="30" rx="3" />
                  <rect x="16" y="86" width="18" height="18" fill="white" />
                  <rect x="20" y="90" width="10" height="10" />
                  <rect x="50" y="15" width="8" height="8" />
                  <rect x="65" y="15" width="6" height="6" />
                  <rect x="50" y="30" width="12" height="6" />
                  <rect x="15" y="55" width="8" height="8" />
                  <rect x="30" y="60" width="14" height="6" />
                  <rect x="50" y="50" width="20" height="20" rx="2" />
                  <rect x="75" y="55" width="12" height="6" />
                  <rect x="95" y="50" width="10" height="10" />
                  <rect x="55" y="80" width="8" height="14" />
                  <rect x="70" y="85" width="16" height="8" />
                  <rect x="90" y="80" width="15" height="15" />
                  <circle cx="60" cy="60" r="3" fill="white" />
                </svg>
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold text-slate-900">
                  Token #DH-9402-PATIL
                </span>
                <span className="text-[10px] text-slate-500">
                  Embeds: Demographics • OD/OS Grad-CAM • AI Triage
                </span>
              </div>

              <div className="w-full text-left p-2.5 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-600 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                  <span className="material-symbols-outlined text-xs">offline_pin</span>
                  <span>Zero-Connectivity Guaranteed</span>
                </div>
                <p>
                  Tele-slips are stamped with encrypted digital verification QR codes that work offline even if the hospital has no network during patient arrival.
                </p>
              </div>

              <button
                type="button"
                onClick={handleBatchSaveQr}
                className="min-h-[44px] w-full px-4 py-2 rounded-lg bg-[#0d766e] hover:bg-[#005c55] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs cursor-pointer drishti-btn"
              >
                <span className="material-symbols-outlined text-base">download_done</span>
                <span>Batch Save Offline Certificates</span>
              </button>
            </div>
          </div>

          {/* Ayushman Bharat Scheme Information Widget */}
          <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-3 drishti-entrance drishti-entrance--visible drishti-stagger-4">
            <div className="w-9 h-9 rounded-full bg-teal-100 text-[#0d766e] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-lg">shield</span>
            </div>
            <div className="flex flex-col text-xs">
              <span className="font-bold text-slate-900">
                PM-JAY Gold Card Entitlement
              </span>
              <span className="text-[11px] text-slate-600">
                Retinal Laser & Vitrectomy cashless coverage confirmed up to ₹5,00,000.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
