import React, { useMemo, useState } from 'react';
import { Patient, CampStats, ScreenId, CurrentUser } from '../../types';
import { useCountUp } from '../../hooks/useAnimations';
import { DISTRICT_ANALYTICS, STATE_ANALYTICS } from '../../data/mockData';

interface DashboardScreenProps {
  stats: CampStats;
  patients: Patient[];
  currentUser?: CurrentUser;
  onNavigate: (screen: ScreenId) => void;
  onOpenFundusModal: (patient: Patient, eye?: 'OD' | 'OS') => void;
  onOpenTeleconsult: (patient: Patient) => void;
  onOpenPrintSlip: (patient: Patient) => void;
  showToast: (msg: string, icon?: string) => void;
  onCreateNewPatient?: () => void;
  onSelectPatient?: (patient: Patient) => void;
  onUpdatePatient?: (updated: Partial<Patient> & { id?: string }) => Promise<void>;
}

function isDoctorAttended(p: Patient): boolean {
  const s = p.ophthalmologistReviewStatus;
  return s === 'accepted' || s === 'modified' || s === 'rejected';
}

function isInDoctorQueue(p: Patient): boolean {
  // Has screening activity and not yet closed by doctor
  const hasAi =
    !!(p.aiDiagnosis && p.aiDiagnosis !== '—' && p.aiDiagnosis !== '') ||
    !!(p.odScanUrl || p.osScanUrl);
  return hasAi && !isDoctorAttended(p);
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  stats,
  patients,
  currentUser,
  onNavigate,
  onOpenFundusModal,
  onOpenTeleconsult,
  onOpenPrintSlip,
  showToast,
  onCreateNewPatient,
  onSelectPatient,
  onUpdatePatient,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'high' | 'draft' | 'normal'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const animatedScreened = useCountUp(stats.screenedToday, true);
  const animatedHighRisk = useCountUp(stats.highRiskCount || 0, true);
  const animatedNormal = useCountUp((stats.normalCount || 0) + (stats.mildCount || 0), true);
  const animatedPendingSync = useCountUp(stats.pendingSyncCount, true);

  const role = currentUser?.role || 'screening_operator';
  const isProgramView = role === 'district_manager' || role === 'state_admin';
  const isOphthalmologist = role === 'ophthalmologist';
  const analytics = role === 'state_admin' ? STATE_ANALYTICS : DISTRICT_ANALYTICS;

  // Doctor workspace state
  const [doctorTab, setDoctorTab] = useState<'queue' | 'attended'>('queue');
  const [selectedDoctorPatientId, setSelectedDoctorPatientId] = useState<string | null>(null);
  const [docNotes, setDocNotes] = useState('');
  const [docDecision, setDocDecision] = useState<'accepted' | 'modified' | 'rejected' | 'refer'>('accepted');

  const queuePatients = useMemo(
    () => patients.filter(isInDoctorQueue),
    [patients],
  );
  const attendedPatients = useMemo(
    () => patients.filter(isDoctorAttended),
    [patients],
  );

  const selectedDoctorPatient =
    patients.find((p) => p.id === selectedDoctorPatientId) || null;

  const openDoctorPatient = (p: Patient) => {
    setSelectedDoctorPatientId(p.id);
    setDocNotes(p.ophthalmologistNotes || '');
    if (p.ophthalmologistReviewStatus === 'modified') setDocDecision('modified');
    else if (p.ophthalmologistReviewStatus === 'rejected') setDocDecision('rejected');
    else if (p.referralStatus === 'referred') setDocDecision('refer');
    else setDocDecision('accepted');
  };

  const submitDoctorReview = async () => {
    if (!selectedDoctorPatient || !onUpdatePatient) {
      showToast('Unable to save review.', 'error');
      return;
    }
    const reviewStatus =
      docDecision === 'refer'
        ? 'accepted'
        : docDecision === 'accepted'
        ? 'accepted'
        : docDecision === 'modified'
        ? 'modified'
        : 'rejected';
    const referred = docDecision === 'refer' || (selectedDoctorPatient.riskLevel === 'Critical' || selectedDoctorPatient.riskLevel === 'High Risk') && docDecision === 'accepted';
    await onUpdatePatient({
      id: selectedDoctorPatient.id,
      ophthalmologistReviewStatus: reviewStatus,
      ophthalmologistNotes: docNotes.trim() || undefined,
      finalDiagnosis:
        docDecision === 'modified' || docDecision === 'rejected'
          ? docNotes.trim() || selectedDoctorPatient.aiDiagnosis
          : selectedDoctorPatient.aiDiagnosis,
      triageStatus:
        docDecision === 'rejected'
          ? 'AI rejected — manual review'
          : docDecision === 'refer'
          ? 'Referred by ophthalmologist'
          : 'Ophthalmologist reviewed',
      referralStatus: docDecision === 'refer' || referred ? 'referred' : selectedDoctorPatient.referralStatus === 'pending_review' && docDecision === 'accepted' ? 'not_required' : selectedDoctorPatient.referralStatus,
      referralCompleted: docDecision === 'refer' ? false : undefined,
    } as Partial<Patient>);
    showToast(
      docDecision === 'refer'
        ? 'Patient marked referred. Staff can see this review.'
        : 'Review saved. Visible to screening staff.',
      'verified',
    );
    setDoctorTab('attended');
  };

  const urgentPatient = patients.find((p) => p.riskLevel === 'Critical') || patients[0] || null;

  const filteredPatients = patients.filter((patient) => {
    const matchesSearch =
      patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.abhaId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.village.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterCategory === 'high') {
      return patient.riskLevel === 'High Risk' || patient.riskLevel === 'Critical';
    }
    if (filterCategory === 'draft') {
      return patient.riskLevel === 'Incomplete';
    }
    if (filterCategory === 'normal') {
      return patient.riskLevel === 'Normal' || patient.riskLevel === 'Mild';
    }
    return true;
  });

  return (
    <div className="p-4 lg:p-6 flex flex-col gap-5 max-w-[1720px] mx-auto w-full select-none">
      {isProgramView && (
        <section className="rounded-xl bg-slate-900 text-white px-4 py-4 lg:px-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-teal-300/90 mb-1">
                {role === 'state_admin' ? 'State Programme Dashboard' : 'District Programme Dashboard'}
              </div>
              <h2 className="text-lg font-bold leading-tight">
                {role === 'state_admin'
                  ? 'Maharashtra — DR Screening Initiative'
                  : 'Nandurbar District Eye Care Cell'}
              </h2>
              <p className="text-sm text-slate-300 mt-1">
                Aggregated public-health indicators · Clinical detail restricted to authorized clinicians
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Screened', value: analytics.totalScreened.toLocaleString(), sub: `${analytics.coveragePct}% of target` },
              { label: 'Referable DR', value: analytics.referableDrDetected.toLocaleString(), sub: 'AI-flagged + validated' },
              { label: 'Referral completion', value: `${analytics.referralCompletionRate}%`, sub: 'Specialist examination' },
              { label: 'Ungradable rate', value: `${analytics.ungradableRate}%`, sub: 'Image quality failures' },
              { label: 'Active facilities', value: String(analytics.facilitiesActive), sub: `${analytics.facilitiesWithEquipmentIssues} equipment issues` },
              { label: 'Pending reviews', value: String(analytics.pendingReviews), sub: 'Ophthalmologist queue' },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-lg bg-white/5 border border-white/10 px-3 py-2.5">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">{kpi.label}</div>
                <div className="text-xl font-bold tabular-nums">{kpi.value}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{kpi.sub}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {!isProgramView && urgentPatient && (
      <section
        aria-labelledby="urgent-triage-heading"
        className="relative rounded-xl bg-red-50/95 border border-red-200 px-4 py-3.5 lg:px-5 lg:py-3.5 shadow-sm drishti-entrance drishti-entrance--visible drishti-stagger-1"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-red-100">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
              PRIORITY REVIEW
            </span>
          </div>
          <span className="px-2 py-0.5 rounded bg-white text-slate-700 border border-red-200 text-xs font-semibold">
            ID: {urgentPatient.id}
          </span>
        </div>

        <div className="pt-2.5 flex flex-col xl:flex-row xl:items-center justify-between gap-3 lg:gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <span className="material-symbols-outlined text-xl">crisis_alert</span>
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex flex-wrap items-baseline gap-2">
                <h2
                  className="text-base font-bold text-slate-900 tracking-tight leading-snug"
                  id="urgent-triage-heading"
                >
                  {urgentPatient.name}
                </h2>
                <span className="text-xs text-slate-600 font-medium">
                  ({urgentPatient.age} Y / {urgentPatient.gender} • ABHA: {urgentPatient.abhaId})
                </span>
              </div>
              <div className="text-sm font-bold text-red-700 leading-snug">
                {urgentPatient.aiDiagnosis}
              </div>
              <div className="text-xs text-slate-700 flex flex-wrap items-center gap-1.5 mt-0.5">
                <span className="font-bold text-red-700">
                  AI Confidence: {urgentPatient.aiConfidence}
                </span>
                <span className="text-slate-400">•</span>
                <span>
                  Referral:{' '}
                  <strong className="text-slate-900 font-semibold">
                    District Hospital Nandurbar
                  </strong>{' '}
                  (Immediate review queued)
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onOpenFundusModal(urgentPatient, 'OD')}
                className="w-12 h-12 rounded-lg overflow-hidden border-2 border-red-400 shadow-xs relative shrink-0 hover:scale-105 transition-transform cursor-pointer"
                title="View OD Grad-CAM"
              >
                <img
                  alt="OD Grad-CAM"
                  className="w-full h-full object-cover"
                  src={urgentPatient.gradCamUrl || urgentPatient.odScanUrl}
                />
                <span className="absolute bottom-0 inset-x-0 bg-red-600 text-[8px] text-white font-bold text-center leading-3 py-0.5">
                  OD Grad-CAM
                </span>
              </button>

              <button
                type="button"
                onClick={() => onOpenFundusModal(urgentPatient, 'OS')}
                className="w-12 h-12 rounded-lg overflow-hidden border border-slate-300 shadow-xs relative shrink-0 hover:scale-105 transition-transform cursor-pointer"
                title="View OS Raw"
              >
                <img
                  alt="OS Raw"
                  className="w-full h-full object-cover"
                  src={urgentPatient.osScanUrl}
                />
                <span className="absolute bottom-0 inset-x-0 bg-slate-900/80 text-[8px] text-white font-bold text-center leading-3 py-0.5">
                  OS Raw
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onOpenFundusModal(urgentPatient, 'OD')}
                className="min-h-[44px] px-3 rounded-lg bg-red-700 text-white hover:bg-red-800 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer drishti-btn"
              >
                <span className="material-symbols-outlined text-base">4k</span>
                <span>Review Grad-CAM</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenTeleconsult(urgentPatient)}
                className="min-h-[44px] px-3 rounded-lg bg-[#0d766e] text-white hover:bg-[#005c55] text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer drishti-btn"
              >
                <span className="material-symbols-outlined text-base">video_call</span>
                <span>Initiate Tele-Consult</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenPrintSlip(urgentPatient)}
                className="min-h-[44px] px-3 rounded-lg bg-white text-slate-800 hover:bg-slate-50 border border-slate-300 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer drishti-btn"
              >
                <span className="material-symbols-outlined text-base">receipt_long</span>
                <span>Print Tele-Slip</span>
              </button>
            </div>
          </div>
        </div>
      </section>
      )}

      <section
        aria-labelledby="screening-launchpad-heading"
        className="grid grid-cols-1 lg:grid-cols-12 gap-4 drishti-entrance drishti-entrance--visible drishti-stagger-2"
      >
        <div className="lg:col-span-12 bg-surface-container-lowest rounded-xl p-5 lg:p-6 flex flex-col justify-between gap-4 shadow-sm border border-outline-variant/30">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-900 text-xs font-bold uppercase tracking-wider">
                TODAY&apos;S SCREENING
              </span>
            </div>
            <h1
              className="text-2xl lg:text-3xl font-bold text-on-surface tracking-tight"
              id="screening-launchpad-heading"
            >
              {role === 'ophthalmologist' ? 'Patient Review' : 'Screening Dashboard'}
            </h1>
            <p className="text-xs text-on-surface-variant">
              {currentUser?.facilityName || 'Screening session'} • {currentUser?.district || ''} • {currentUser?.name || ''}
            </p>
          </div>

          {role !== 'ophthalmologist' && (
          <div className="py-1">
            <button
              type="button"
              onClick={() => {
                if (onCreateNewPatient) onCreateNewPatient();
                else onNavigate('patient-registration');
              }}
              className="group w-full min-h-[54px] bg-[#0d766e] hover:bg-[#005c55] text-white px-5 py-3 rounded-xl shadow-md transition-all flex items-center justify-between text-left cursor-pointer drishti-btn"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-2xl text-white group-hover:scale-110 transition-transform">
                    add_circle
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-base lg:text-lg font-bold tracking-tight text-white leading-tight">
                    + Start New Screening
                  </span>
                  <span className="text-[11px] text-teal-100 tracking-wider uppercase font-semibold">
                    STEP 1 OF 3: REGISTRATION → CAPTURE → ON-DEVICE AI
                  </span>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2.5">
                <span className="text-xs px-2.5 py-1 rounded bg-white/20 font-semibold text-white">
                  नया परीक्षण शुरू करें
                </span>
                <span className="material-symbols-outlined text-xl text-white group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </div>
            </button>
          </div>
          )}
        </div>
      </section>

      {/* ═══════════════ OPHTHALMOLOGIST WORKSPACE ═══════════════ */}
      {isOphthalmologist && (
        <section className="flex flex-col gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <p className="text-[11px] font-bold uppercase text-slate-500">In queue</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">{queuePatients.length}</p>
              <p className="text-[11px] text-slate-500">Awaiting your review</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <p className="text-[11px] font-bold uppercase text-slate-500">Attended</p>
              <p className="text-2xl font-extrabold text-emerald-700 mt-1">{attendedPatients.length}</p>
              <p className="text-[11px] text-slate-500">Reviewed by you</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <p className="text-[11px] font-bold uppercase text-slate-500">Total patients</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">{patients.length}</p>
              <p className="text-[11px] text-slate-500">From screening staff</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <p className="text-[11px] font-bold uppercase text-slate-500">Referrals</p>
              <p className="text-2xl font-extrabold text-red-700 mt-1">
                {patients.filter((p) => p.referralStatus === 'referred' || p.referralStatus === 'pending_review').length}
              </p>
              <p className="text-[11px] text-slate-500">Pending / confirmed</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left: day-wise list */}
            <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col max-h-[640px]">
              <div className="flex border-b border-slate-100">
                <button
                  type="button"
                  onClick={() => setDoctorTab('queue')}
                  className={`flex-1 px-4 py-3 text-xs font-bold ${
                    doctorTab === 'queue'
                      ? 'text-[#0d766e] border-b-2 border-[#0d766e] bg-teal-50/50'
                      : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  Patient queue ({queuePatients.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDoctorTab('attended')}
                  className={`flex-1 px-4 py-3 text-xs font-bold ${
                    doctorTab === 'attended'
                      ? 'text-[#0d766e] border-b-2 border-[#0d766e] bg-teal-50/50'
                      : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  Attended ({attendedPatients.length})
                </button>
              </div>

              <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
                <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                  Today · {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>

              <div className="overflow-y-auto flex-1">
                {(doctorTab === 'queue' ? queuePatients : attendedPatients).length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500">
                    {doctorTab === 'queue'
                      ? patients.length === 0
                        ? 'No patients yet. Cases registered by screening staff will appear here.'
                        : 'No patients in queue. All screened cases have been reviewed, or none are ready yet.'
                      : 'No attended patients yet. Submit a review to move a case here.'}
                  </div>
                ) : (
                  (doctorTab === 'queue' ? queuePatients : attendedPatients).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => openDoctorPatient(p)}
                      className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-teal-50/40 transition-colors ${
                        selectedDoctorPatientId === p.id ? 'bg-teal-50 border-l-4 border-l-[#0d766e]' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-slate-900">{p.name || 'Unnamed'}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {p.id} · {p.age} Y / {p.gender}
                            {p.screenTime ? ` · ${p.screenTime}` : ''}
                          </p>
                          <p className="text-[11px] text-slate-600 mt-1 line-clamp-1">
                            {p.aiDiagnosis && p.aiDiagnosis !== '—'
                              ? p.aiDiagnosis
                              : p.odScanUrl || p.osScanUrl
                              ? 'Images uploaded — analysis pending / complete'
                              : 'Registered — awaiting images'}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {isDoctorAttended(p) ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">
                              Checked
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase">
                              Queue
                            </span>
                          )}
                          {(p.riskLevel === 'Critical' || p.riskLevel === 'High Risk') && (
                            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
                              {p.riskLevel}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Right: detail + review */}
            <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
              {!selectedDoctorPatient ? (
                <div className="h-full flex flex-col items-center justify-center p-10 text-center text-slate-500">
                  <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">clinical_notes</span>
                  <p className="text-sm font-semibold text-slate-700">Select a patient</p>
                  <p className="text-xs mt-1 max-w-xs">
                    Open a case from the queue to view fundus images, AI screening report, and submit your clinical review.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80">
                    <p className="text-base font-bold text-slate-900">
                      {selectedDoctorPatient.name}{' '}
                      <span className="text-sm font-normal text-slate-500">
                        · {selectedDoctorPatient.id} · {selectedDoctorPatient.age} Y / {selectedDoctorPatient.gender}
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {selectedDoctorPatient.village || '—'}
                      {selectedDoctorPatient.diabetesStatus
                        ? ` · ${selectedDoctorPatient.diabetesStatus}`
                        : ''}
                    </p>
                  </div>

                  <div className="p-4 space-y-4 overflow-y-auto max-h-[560px]">
                    {/* Fundus images */}
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-2">
                        Fundus images (staff upload)
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        {(['OD', 'OS'] as const).map((eye) => {
                          const url =
                            eye === 'OD'
                              ? selectedDoctorPatient.odScanUrl
                              : selectedDoctorPatient.osScanUrl;
                          return (
                            <button
                              key={eye}
                              type="button"
                              disabled={!url}
                              onClick={() => url && onOpenFundusModal(selectedDoctorPatient, eye)}
                              className="rounded-lg border border-slate-200 overflow-hidden bg-slate-900 aspect-square relative disabled:opacity-50"
                            >
                              {url ? (
                                <img src={url} alt={`${eye} fundus`} className="w-full h-full object-cover" />
                              ) : (
                                <span className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs">
                                  No {eye} image
                                </span>
                              )}
                              <span className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[10px] font-bold text-center py-0.5">
                                {eye}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* AI report summary */}
                    <div className="rounded-lg border border-slate-200 p-3 bg-slate-50/50">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-2">
                        AI screening report
                      </p>
                      {selectedDoctorPatient.aiDiagnosis && selectedDoctorPatient.aiDiagnosis !== '—' ? (
                        <>
                          <p className="text-sm font-bold text-slate-900">{selectedDoctorPatient.aiDiagnosis}</p>
                          <p className="text-xs text-slate-600 mt-1">
                            Confidence: {selectedDoctorPatient.aiConfidence || '—'}
                            {' · '}Risk: {selectedDoctorPatient.riskLevel}
                          </p>
                          <p className="text-xs text-slate-600 mt-1">
                            ICDR OD: {selectedDoctorPatient.icdrGradeOd ?? '—'} · OS:{' '}
                            {selectedDoctorPatient.icdrGradeOs ?? '—'}
                            {selectedDoctorPatient.csmeDetected ? ' · CSME detected' : ''}
                          </p>
                          {(selectedDoctorPatient.hardExudatesNote ||
                            selectedDoctorPatient.microaneurysmsCount != null) && (
                            <p className="text-[11px] text-slate-500 mt-2">
                              Evidence: MA count {selectedDoctorPatient.microaneurysmsCount ?? '—'}
                              {selectedDoctorPatient.hardExudatesNote
                                ? ` · ${selectedDoctorPatient.hardExudatesNote}`
                                : ''}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-slate-500">
                          AI report not generated yet. Staff may still be capturing or analysing.
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (onSelectPatient) onSelectPatient(selectedDoctorPatient);
                          else {
                            onNavigate('ai-diagnosis');
                          }
                        }}
                        className="mt-2 text-xs font-semibold text-[#0d766e] hover:underline"
                      >
                        Open full analysis screen →
                      </button>
                    </div>

                    {/* Doctor review form */}
                    <div className="rounded-lg border border-teal-200 p-3 bg-teal-50/30">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-teal-800 mb-2">
                        Your clinical review
                      </p>
                      <p className="text-[11px] text-slate-600 mb-2">
                        This review is shared with screening staff on their dashboard.
                      </p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {(
                          [
                            { key: 'accepted' as const, label: 'Confirm AI' },
                            { key: 'modified' as const, label: 'Modify finding' },
                            { key: 'refer' as const, label: 'Refer patient' },
                            { key: 'rejected' as const, label: 'Request recapture' },
                          ] as const
                        ).map((btn) => (
                          <button
                            key={btn.key}
                            type="button"
                            onClick={() => setDocDecision(btn.key)}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border ${
                              docDecision === btn.key
                                ? 'bg-[#0d766e] text-white border-[#0d766e]'
                                : 'bg-white text-slate-700 border-slate-200'
                            }`}
                          >
                            {btn.label}
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={docNotes}
                        onChange={(e) => setDocNotes(e.target.value)}
                        placeholder="Doctor notes (visible to screening staff)…"
                        rows={3}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#0d766e] bg-white"
                      />
                      <button
                        type="button"
                        onClick={submitDoctorReview}
                        className="mt-3 w-full min-h-[44px] rounded-xl bg-[#0d766e] hover:bg-[#005c55] text-white text-sm font-bold"
                      >
                        Submit review · mark attended
                      </button>
                      {isDoctorAttended(selectedDoctorPatient) && (
                        <p className="mt-2 text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">check_circle</span>
                          Already reviewed
                          {selectedDoctorPatient.ophthalmologistNotes
                            ? `: “${selectedDoctorPatient.ophthalmologistNotes}”`
                            : ''}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {!isOphthalmologist && (
      <>
      <section
        aria-label="Screening Metrics"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 drishti-entrance drishti-entrance--visible drishti-stagger-3"
      >
        <div className="bg-surface-container-lowest rounded-xl p-4 flex flex-col justify-between shadow-sm border border-outline-variant/30 min-h-[128px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Screenings Today
            </span>
            <span className="w-7 h-7 rounded-lg bg-teal-50 text-[#0d766e] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-base">person_search</span>
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-[30px] font-extrabold text-slate-900 tracking-tight leading-none">
              {animatedScreened}
            </span>
            <span className="text-[15px] font-semibold text-slate-500">Screened today</span>
          </div>
          <div className="text-xs text-slate-500 truncate mt-1">
            Updated from today&apos;s screening register
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl p-4 flex flex-col justify-between shadow-sm border border-outline-variant/30 min-h-[128px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-red-600">
              High-Risk Referrals
            </span>
            <span className="w-7 h-7 rounded-lg bg-red-50 text-red-700 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-base">warning</span>
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[30px] font-extrabold text-red-700 tracking-tight leading-none">
              {animatedHighRisk.toString().padStart(2, '0')}
            </span>
            <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold uppercase tracking-wider">
              ACTIONABLE
            </span>
          </div>
          <div className="text-xs text-slate-500 truncate mt-1">
            Referral review required
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl p-4 flex flex-col justify-between shadow-sm border border-outline-variant/30 min-h-[128px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Normal / Mild
            </span>
            <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-base">verified</span>
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-[30px] font-extrabold text-emerald-700 tracking-tight leading-none">
              {animatedNormal}
            </span>
          </div>
          <div className="text-xs text-slate-500 truncate mt-1">
            9 Normal • 2 Mild
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl p-4 flex flex-col justify-between shadow-sm border border-outline-variant/30 min-h-[128px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
              Pending Review
            </span>
            <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-base">rate_review</span>
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[30px] font-extrabold text-indigo-700 tracking-tight leading-none">
              {animatedPendingSync.toString().padStart(2, '0')}
            </span>
            <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold uppercase tracking-wider">
              Ophthalmologist
            </span>
          </div>
          <div className="text-xs text-slate-500 truncate mt-1">
            Cases awaiting specialist validation
          </div>
        </div>
      </section>

      <section
        aria-labelledby="screening-register-heading"
        className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden flex flex-col drishti-entrance drishti-entrance--visible drishti-stagger-4"
      >
        <div className="p-4 flex flex-col gap-3 bg-surface-container-lowest border-b border-outline-variant/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2
                className="text-lg font-bold text-on-surface"
                id="screening-register-heading"
              >
                Today&apos;s Screening Register
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200 text-xs font-bold">
                {stats.screenedToday} Assessed
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  showToast(
                    'Exporting local CSV register for PHC Medical Officer...',
                    'file_download'
                  )
                }
                className="min-h-[44px] px-3 rounded-lg bg-surface-container-low border border-slate-200 hover:bg-surface-container text-on-surface text-xs flex items-center gap-1 font-semibold transition-all cursor-pointer drishti-btn"
              >
                <span className="material-symbols-outlined text-sm">download</span>
                <span>Export CSV</span>
              </button>
              <button
                type="button"
                aria-label="Refresh Queue"
                onClick={() =>
                  showToast('Refreshing patient records...', 'sync')
                }
                className="w-11 h-11 rounded-lg bg-surface-container-low border border-slate-200 hover:bg-surface-container text-on-surface flex items-center justify-center transition-all cursor-pointer drishti-btn"
              >
                <span className="material-symbols-outlined text-base">refresh</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base pointer-events-none">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, ABHA, phone..."
                className="w-full min-h-[44px] pl-10 pr-4 rounded-lg bg-slate-50 border border-slate-200 text-on-surface placeholder:text-slate-400 text-xs focus:outline-none focus:bg-white focus:border-[#0d766e] transition-all"
              />
            </div>

            <div className="flex items-center overflow-x-auto p-1 bg-slate-100 rounded-lg gap-1 shrink-0 border border-slate-200">
              <button
                type="button"
                onClick={() => setFilterCategory('all')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  filterCategory === 'all'
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({patients.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterCategory('high')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  filterCategory === 'high'
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                High Risk ({patients.filter((p) => p.riskLevel === 'High Risk' || p.riskLevel === 'Critical').length})
              </button>
              <button
                type="button"
                onClick={() => setFilterCategory('draft')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  filterCategory === 'draft'
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pending AI ({patients.filter((p) => p.riskLevel === 'Incomplete' || !p.aiDiagnosis || p.aiDiagnosis === '—').length})
              </button>
              <button
                type="button"
                onClick={() => setFilterCategory('normal')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  filterCategory === 'normal'
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Normal / Mild ({patients.filter((p) => p.riskLevel === 'Normal' || p.riskLevel === 'Mild').length})
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left" id="screeningTable">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase border-b border-slate-200">
              <tr>
                <th scope="col" className="py-3 px-4 font-semibold">Patient & Fundus</th>
                <th scope="col" className="py-3 px-4 font-semibold">AI Screening Result</th>
                <th scope="col" className="py-3 px-4 font-semibold">Risk Triage</th>
                <th scope="col" className="py-3 px-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-on-surface text-xs">
              {filteredPatients.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-16 text-center">
                    <p className="text-base font-semibold text-slate-700 mb-1">No patients registered yet</p>
                    <p className="text-sm text-slate-500 mb-4">
                      Patients registered by screening staff will appear here.
                    </p>
                    {onCreateNewPatient && (
                      <button
                        type="button"
                        onClick={onCreateNewPatient}
                        className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold"
                      >
                        Register New Patient
                      </button>
                    )}
                  </td>
                </tr>
              )}
              {filteredPatients.slice(0, 20).map((p, pIdx) => {
                const isUrgent = p.riskLevel === 'Critical';
                return (
                  <tr
                    key={p.id}
                    style={{ animationDelay: `${pIdx * 50}ms` }}
                    className={`patient-row drishti-table-row drishti-row-enter transition-colors ${
                      isUrgent
                        ? 'bg-red-50/25 hover:bg-red-50/50'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => onOpenFundusModal(p, 'OD')}
                          className={`relative w-12 h-12 rounded-lg overflow-hidden bg-slate-900 shrink-0 shadow-xs cursor-pointer ${
                            isUrgent ? 'border-2 border-red-400' : 'border border-slate-200'
                          }`}
                          title="Inspect Fundus"
                        >
                          <img
                            alt={p.name}
                            className="w-full h-full object-cover"
                            src={isUrgent && p.gradCamUrl ? p.gradCamUrl : p.odScanUrl}
                          />
                          <span
                            className={`absolute bottom-0 inset-x-0 text-white text-[8px] text-center leading-3 py-0.5 font-bold ${
                              isUrgent ? 'bg-red-600' : 'bg-slate-900/80'
                            }`}
                          >
                            {isUrgent ? 'Grad-CAM' : 'OD 45°'}
                          </span>
                        </button>

                        <div className="flex flex-col min-w-0">
                          <button
                            type="button"
                            onClick={() => {
                              if (onSelectPatient) onSelectPatient(p);
                              else onNavigate('ai-diagnosis');
                            }}
                            className={`text-sm font-bold flex items-center gap-1.5 text-left hover:underline ${
                              isUrgent ? 'text-red-700' : 'text-slate-900'
                            }`}
                          >
                            <span>{p.name}</span>
                            {isUrgent && (
                              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                            )}
                          </button>
                          <span className="text-xs text-slate-500">
                            {p.age} Y • {p.gender}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium">
                            ABHA: {p.abhaId}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span
                          className={`text-xs font-semibold ${
                            isUrgent ? 'text-red-700 font-bold' : 'text-slate-900'
                          }`}
                        >
                          {p.aiDiagnosis}
                        </span>
                        <span
                          className={`text-[11px] font-semibold mt-0.5 ${
                            isUrgent
                              ? 'text-red-700 font-bold'
                              : p.riskLevel === 'Normal'
                              ? 'text-emerald-700'
                              : 'text-[#0d766e]'
                          }`}
                        >
                          AI Conf: {p.aiConfidence}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {isUrgent ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-600 text-white text-xs font-bold uppercase tracking-wider animate-pulse shadow-xs">
                          <span className="material-symbols-outlined text-xs">emergency</span>
                          Urgent
                        </span>
                      ) : p.riskLevel === 'High Risk' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-100 text-red-800 text-xs font-bold uppercase tracking-wider">
                          <span className="material-symbols-outlined text-xs">warning</span>
                          High Risk
                        </span>
                      ) : p.riskLevel === 'Mild' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold uppercase tracking-wider">
                          <span className="material-symbols-outlined text-xs">schedule</span>
                          Mild
                        </span>
                      ) : p.riskLevel === 'Incomplete' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold uppercase tracking-wider">
                          <span className="material-symbols-outlined text-xs">hourglass_top</span>
                          Pending AI
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider">
                          <span className="material-symbols-outlined text-xs">check_circle</span>
                          Normal
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {isUrgent ? (
                        <button
                          type="button"
                          onClick={() => onNavigate('retinal-capture')}
                          className="min-h-[44px] px-3.5 rounded-lg bg-[#0d766e] text-white hover:bg-[#005c55] text-xs inline-flex items-center gap-1 font-semibold transition-all shadow-xs cursor-pointer drishti-btn"
                        >
                          <span className="material-symbols-outlined text-sm">camera_alt</span>
                          <span>Resume Scan OS</span>
                        </button>
                      ) : p.riskLevel === 'High Risk' ? (
                        <button
                          type="button"
                          onClick={() => onOpenPrintSlip(p)}
                          className="min-h-[44px] px-3.5 rounded-lg bg-surface-container-low border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs inline-flex items-center gap-1 font-semibold transition-all cursor-pointer drishti-btn"
                        >
                          <span className="material-symbols-outlined text-sm">print</span>
                          <span>Print Slip</span>
                        </button>
                      ) : p.riskLevel === 'Normal' ? (
                        <button
                          type="button"
                          onClick={() =>
                            showToast(
                              `Issued 1-Year Routine Eye Health Certificate (${p.name})`,
                              'verified'
                            )
                          }
                          className="min-h-[44px] px-3.5 rounded-lg bg-surface-container-low border border-slate-200 hover:bg-slate-100 text-emerald-700 text-xs inline-flex items-center gap-1 font-semibold transition-all cursor-pointer drishti-btn"
                        >
                          <span className="material-symbols-outlined text-sm">verified_user</span>
                          <span>Issue Certificate</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onNavigate('retinal-capture')}
                          className="min-h-[44px] px-3.5 rounded-lg bg-surface-container-low border border-slate-200 hover:bg-slate-100 text-[#0d766e] text-xs inline-flex items-center gap-1 font-semibold transition-all cursor-pointer drishti-btn"
                        >
                          <span className="material-symbols-outlined text-sm">photo_camera</span>
                          <span>Capture OS</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-on-surface-variant">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-600 font-medium">
              Showing {filteredPatients.length} of {patients.length} patients
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-800 font-bold">Local screening records</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="min-h-[40px] px-3 rounded-lg bg-white border border-slate-200 text-slate-400 font-semibold disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed drishti-btn"
            >
              Previous
            </button>
            <span className="px-2 font-bold text-slate-800">
              Page {currentPage}
            </span>
            <button
              type="button"
              onClick={() => {
                setCurrentPage((p) => p + 1);
                showToast('End of local patient list.', 'info');
              }}
              className="min-h-[40px] px-3 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold transition-all cursor-pointer drishti-btn"
            >
              Next
            </button>
          </div>
        </div>
      </section>
      </>
      )}

      {/* Staff sees ophthalmologist reviews on shared patient store */}
      {!isOphthalmologist && !isProgramView && attendedPatients.length > 0 && (
        <section className="bg-white rounded-xl border border-emerald-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-100">
            <p className="text-sm font-bold text-emerald-900">
              Doctor reviews received ({attendedPatients.length})
            </p>
            <p className="text-[11px] text-emerald-700">
              Ophthalmologist feedback on cases you screened
            </p>
          </div>
          <ul className="divide-y divide-slate-100">
            {attendedPatients.map((p) => (
              <li
                key={p.id}
                className="px-4 py-3 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2"
              >
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {p.name}{' '}
                    <span className="font-normal text-slate-500">· {p.id}</span>
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    AI: {p.aiDiagnosis || '—'} · Review:{' '}
                    <span className="font-semibold capitalize">
                      {p.ophthalmologistReviewStatus || 'reviewed'}
                    </span>
                    {p.referralStatus === 'referred' ? ' · Referred' : ''}
                  </p>
                  {p.ophthalmologistNotes && (
                    <p className="text-xs text-slate-700 mt-1 bg-slate-50 rounded-lg px-2 py-1.5 border border-slate-100">
                      “{p.ophthalmologistNotes}”
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (onSelectPatient) onSelectPatient(p);
                  }}
                  className="text-xs font-semibold text-[#0d766e] shrink-0"
                >
                  Open case
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};
