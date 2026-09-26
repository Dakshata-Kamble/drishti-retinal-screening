import React, { useState } from 'react';
import { ScreenId, Patient, CurrentUser } from '../../types';
import { useCountUp, useAnimatedProgress } from '../../hooks/useAnimations';

interface ScreeningQueueScreenProps {
  patients: Patient[];
  onNavigate: (screen: ScreenId) => void;
  onOpenFundusModal: (patient: Patient, eye?: 'OD' | 'OS') => void;
  onOpenTeleconsult: (patient: Patient) => void;
  onOpenPrintSlip: (patient: Patient) => void;
  showToast: (msg: string, icon?: string) => void;
  onRefreshPatients?: () => Promise<void>;
  currentUser?: CurrentUser;
}

export const ScreeningQueueScreen: React.FC<ScreeningQueueScreenProps> = ({
  patients,
  onNavigate,
  onOpenFundusModal,
  onOpenTeleconsult,
  onOpenPrintSlip,
  showToast,
  onRefreshPatients,
  currentUser,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Real counts from patient store — zero when no patients registered
  const totalPatients = patients.length;
  const highRiskCount = patients.filter(
    (p) => p.riskLevel === 'High Risk' || p.riskLevel === 'Critical'
  ).length;
  const normalCount = patients.filter(
    (p) => p.riskLevel === 'Normal' || p.riskLevel === 'Mild'
  ).length;
  const pendingReviewCount = patients.filter(
    (p) =>
      p.ophthalmologistReviewStatus === 'pending' ||
      p.triageStatus?.toLowerCase().includes('awaiting') ||
      (p.aiDiagnosis &&
        p.aiDiagnosis !== '—' &&
        p.aiDiagnosis !== '' &&
        p.ophthalmologistReviewStatus !== 'accepted' &&
        p.ophthalmologistReviewStatus !== 'modified' &&
        p.ophthalmologistReviewStatus !== 'rejected')
  ).length;
  const pendingAiCount = patients.filter(
    (p) => p.riskLevel === 'Incomplete' || !p.aiDiagnosis || p.aiDiagnosis === '—' || p.aiDiagnosis === ''
  ).length;
  const reviewedCount = patients.filter(
    (p) =>
      p.ophthalmologistReviewStatus === 'accepted' ||
      p.ophthalmologistReviewStatus === 'modified' ||
      p.ophthalmologistReviewStatus === 'rejected'
  ).length;

  const animatedScreened = useCountUp(totalPatients, true);
  const animatedHighRisk = useCountUp(highRiskCount, true);
  const animatedPendingReview = useCountUp(pendingReviewCount, true);
  const animatedReviewed = useCountUp(reviewedCount, true);
  const progressPct = totalPatients > 0 ? Math.min(100, Math.round((totalPatients / 25) * 100)) : 0;
  const animatedProgress = useAnimatedProgress(progressPct, true);

  const handleRefresh = async () => {
    if (!onRefreshPatients) {
       showToast('Unable to refresh patient list.', 'error');
       return;
    }
    setIsRefreshing(true);
    try {
      await onRefreshPatients();
      showToast('Patient list refreshed.', 'check_circle');
    } catch (err) {
      showToast('Failed to refresh patient records.', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExportCsv = () => {
    showToast('Exporting local CSV register for PHC Medical Officer...', 'file_download');
    // Generate simple data CSV download
    const headers = 'ID,Name,Age,Gender,ABHA,Mobile,Village,Diagnosis,Confidence,Risk,SyncStatus\n';
    const rows = patients
      .map(
        (p) =>
          `"${p.id}","${p.name}",${p.age},"${p.gender}","${p.abhaId}","${p.mobile}","${p.village}","${p.aiDiagnosis}","${p.aiConfidence}","${p.riskLevel}","${p.syncStatus}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `DrishtiAI_Screening_Register_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter patients
  const filteredPatients = patients.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.abhaId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.mobile || '').includes(searchQuery) ||
      (p.village || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === 'high-risk') {
      return p.riskLevel === 'High Risk' || p.riskLevel === 'Critical';
    }
    if (filterType === 'pending-ai') {
      return p.riskLevel === 'Incomplete' || !p.aiDiagnosis || p.aiDiagnosis === '—' || p.aiDiagnosis === '';
    }
    if (filterType === 'normal') {
      return p.riskLevel === 'Normal' || p.riskLevel === 'Mild';
    }
    if (filterType === 'pending-review') {
      return (
        p.ophthalmologistReviewStatus === 'pending' ||
        p.triageStatus?.toLowerCase().includes('awaiting') ||
        (p.aiDiagnosis &&
          p.aiDiagnosis !== '—' &&
          p.aiDiagnosis !== '' &&
          p.ophthalmologistReviewStatus !== 'accepted' &&
          p.ophthalmologistReviewStatus !== 'modified' &&
          p.ophthalmologistReviewStatus !== 'rejected')
      );
    }
    return true;
  });

  return (
    <div className="flex flex-col w-full select-none">
      {/* Main View Container — starts cleanly with clinical workflow */}
      <div className="p-4 lg:p-6 flex flex-col gap-5 max-w-7xl mx-auto w-full pb-20">
        {/* Top Header Area with Rural Mission Context */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-900 text-[10px] font-bold uppercase tracking-wider">
                Camp Register
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Shift: 08:30 AM – 02:00 PM IST
              </span>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="text-2xl lg:text-3xl text-slate-900 font-extrabold tracking-tight">
                Screening Queue & Roster
              </h1>
              <span className="text-lg lg:text-xl text-slate-500 font-normal">
                (आजची तपासणी यादी)
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <span className="flex items-center gap-1 font-medium text-[#0d766e]">
                <span className="material-symbols-outlined text-sm">home_pin</span>
                {currentUser?.facilityName || 'Nandurbar District'}
              </span>
              {currentUser && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">stethoscope</span>
                    {currentUser.name}
                    {currentUser.qualifications
                      ? ` · ${currentUser.qualifications.split('—')[0].trim()}`
                      : ''}
                  </span>
                </>
              )}
              <span>•</span>
              <span className="flex items-center gap-1 font-semibold text-emerald-700">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                Review Queue Active
              </span>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportCsv}
              className="min-h-[44px] px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5 shadow-xs hover:bg-slate-50 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-base text-slate-600">
                file_download
              </span>
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={handleRefresh}
              className="min-h-[44px] px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5 shadow-xs hover:bg-slate-50 transition-all cursor-pointer"
            >
              <span
                className={`material-symbols-outlined text-base text-slate-600 ${
                  isRefreshing ? 'animate-spin' : ''
                }`}
              >
                refresh
              </span>
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('patient-registration')}
              className="min-h-[44px] px-4 py-2 rounded-lg bg-[#0d766e] hover:bg-[#005c55] text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">person_add</span>
              <span>+ Add New Walk-in</span>
            </button>
          </div>
        </div>

        {/* Summary KPI Metric Strip — based only on real patient records */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 drishti-entrance drishti-entrance--visible drishti-stagger-1">
          {/* Card 1: Total Patients */}
          <div className="p-4 bg-white rounded-xl shadow-xs border border-slate-200 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">
                  Total Patients
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-extrabold text-slate-900 leading-none">
                    {animatedScreened}
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-teal-50 text-[#0d766e] flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">groups</span>
              </div>
            </div>
            <div className="mt-3 pt-2 flex flex-col gap-1.5">
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#0d766e] h-full rounded-full drishti-progress-fill"
                  style={{ width: `${animatedProgress}%` }}
                ></div>
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-500">
                <span>
                  {totalPatients === 0
                    ? 'No patients registered yet'
                    : `${Math.round(animatedProgress)}% of camp target`}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Pending Review */}
          <div className="p-4 bg-white rounded-xl shadow-xs border border-slate-200 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-amber-700 tracking-wider uppercase">
                  Pending Review
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-extrabold text-amber-800 leading-none">
                    {animatedPendingReview}
                  </span>
                  <span className="text-xs text-amber-700 font-semibold">Cases</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">rate_review</span>
              </div>
            </div>
            <div className="mt-3 pt-2 flex items-center justify-between text-[11px]">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-bold">
                Awaiting ophthalmologist
              </span>
            </div>
          </div>

          {/* Card 3: High-Risk */}
          <div className="p-4 bg-white rounded-xl shadow-xs border border-slate-200 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-red-600 tracking-wider uppercase flex items-center gap-1">
                  High-Risk / Referrals
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-extrabold text-red-700 leading-none">
                    {animatedHighRisk}
                  </span>
                  <span className="text-xs text-red-700 font-semibold">Flagged</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-red-50 text-red-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">warning</span>
              </div>
            </div>
            <div className="mt-3 pt-2 flex items-center justify-between text-[11px]">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 font-bold">
                Requires specialist attention
              </span>
            </div>
          </div>

          {/* Card 4: Reviewed */}
          <div className="p-4 bg-white rounded-xl shadow-xs border border-slate-200 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-emerald-700 tracking-wider uppercase">
                  Reviewed
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-extrabold text-emerald-700 leading-none">
                    {animatedReviewed}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">Cases</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">task_alt</span>
              </div>
            </div>
            <div className="mt-3 pt-2 flex items-center justify-between text-[11px]">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                {normalCount} Normal / Mild
              </span>
            </div>
          </div>
        </div>

        {/* Tactical Filtering & Search Strip */}
        <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between drishti-entrance drishti-entrance--visible drishti-stagger-2">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[280px]">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by patient name, ABHA ID, mobile number, or village..."
              className="w-full min-h-[44px] pl-10 pr-4 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-[#0d766e] transition-all"
            />
          </div>

          {/* Filter Tabs / Pills — counts from real patient store */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer drishti-btn ${
                filterType === 'all'
                  ? 'bg-[#0d766e] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All ({totalPatients})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('high-risk')}
              className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer drishti-btn ${
                filterType === 'high-risk'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-slate-100 text-red-700 hover:bg-red-50'
              }`}
            >
              High Risk ({highRiskCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('pending-review')}
              className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer drishti-btn ${
                filterType === 'pending-review'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 text-amber-800 hover:bg-amber-50'
              }`}
            >
              Pending Review ({pendingReviewCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('pending-ai')}
              className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer drishti-btn ${
                filterType === 'pending-ai'
                  ? 'bg-[#006398] text-white shadow-xs'
                  : 'bg-slate-100 text-blue-700 hover:bg-blue-50'
              }`}
            >
              Pending AI / Capture ({pendingAiCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('normal')}
              className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer drishti-btn ${
                filterType === 'normal'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 text-emerald-800 hover:bg-emerald-50'
              }`}
            >
              Normal / Mild ({normalCount})
            </button>
          </div>
        </div>

        {/* Patient Screening Table Container */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden flex flex-col drishti-entrance drishti-entrance--visible drishti-stagger-3">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-xs font-bold tracking-wider uppercase border-b border-slate-200">
                  <th scope="col" className="py-3 px-4">
                    Fundus Scan
                  </th>
                  <th scope="col" className="py-3 px-4">
                    Patient Demographics
                  </th>
                  <th scope="col" className="py-3 px-4">
                    ABHA ID / Contact
                  </th>
                  <th scope="col" className="py-3 px-4">
                    Screen Time
                  </th>
                  <th scope="col" className="py-3 px-4">
                    AI Diagnostic Inference
                  </th>
                  <th scope="col" className="py-3 px-4">
                    Risk Level
                  </th>
                  <th scope="col" className="py-3 px-4">
                    Triage Status
                  </th>
                  <th scope="col" className="py-3 px-4 text-right">
                    Clinical Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-900">
                {filteredPatients.map((p, pIdx) => {
                  const isCritical = p.riskLevel === 'Critical';
                  return (
                    <tr
                      key={p.id}
                      style={{ animationDelay: `${pIdx * 40}ms` }}
                      className={`hover:bg-slate-50/80 transition-colors drishti-table-row drishti-row-enter ${
                        isCritical ? 'bg-red-50/20' : ''
                      }`}
                    >
                      {/* Fundus Scan */}
                      <td className="py-3.5 px-4 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onOpenFundusModal(p, 'OD')}
                            className="relative w-11 h-11 rounded-lg bg-black overflow-hidden shadow-xs shrink-0 cursor-pointer group border border-slate-300"
                            title="View OD Fundus"
                          >
                            <img
                              src={isCritical && p.gradCamUrl ? p.gradCamUrl : p.odScanUrl}
                              alt="OD"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <span className="absolute bottom-0.5 right-0.5 px-1 bg-black/80 text-white text-[8px] rounded font-bold">
                              OD
                            </span>
                          </button>

                          {p.osScanUrl ? (
                            <button
                              type="button"
                              onClick={() => onOpenFundusModal(p, 'OS')}
                              className="relative w-11 h-11 rounded-lg bg-black overflow-hidden shadow-xs shrink-0 cursor-pointer group border border-slate-300"
                              title="View OS Fundus"
                            >
                              <img
                                src={p.osScanUrl}
                                alt="OS"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                              <span className="absolute bottom-0.5 right-0.5 px-1 bg-black/80 text-white text-[8px] rounded font-bold">
                                OS
                              </span>
                            </button>
                          ) : (
                            <div className="relative w-11 h-11 rounded-lg bg-slate-100 flex flex-col items-center justify-center text-slate-500 shadow-inner shrink-0 border border-dashed border-slate-300">
                              <span className="material-symbols-outlined text-base text-[#0d766e] animate-pulse">
                                add_a_photo
                              </span>
                              <span className="text-[8px] font-bold">OS Wait</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Patient Demographics */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col min-w-[140px]">
                          <span className="font-bold text-slate-900 text-sm">
                            {p.name}
                          </span>
                          <span className="text-slate-500">
                            {p.age} Y • {p.gender}
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5">
                            {p.diabetesDuration || 'Routine Screening'}
                          </span>
                        </div>
                      </td>

                      {/* ABHA ID / Contact */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col min-w-[120px]">
                          <span className="font-mono font-bold text-[#0d766e]">
                            {p.abhaId}
                          </span>
                          <span className="text-slate-600">{p.mobile}</span>
                          <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                            {p.village}
                          </span>
                        </div>
                      </td>

                      {/* Screen Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900">
                            {p.screenTime}
                          </span>
                          {p.syncStatus === 'queued' ? (
                            <span className="text-[10px] text-blue-700 font-semibold flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-xs">
                                cloud_queue
                              </span>
                              Queued (Local)
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-xs">
                                done_all
                              </span>
                              Cloud Synced
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Diagnostic AI Inference */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col min-w-[180px]">
                          <span
                            className={`font-semibold ${
                              isCritical
                                ? 'text-red-700 font-bold'
                                : p.riskLevel === 'Normal'
                                ? 'text-emerald-700 font-bold'
                                : 'text-slate-900'
                            }`}
                          >
                            {p.aiDiagnosis}
                          </span>
                          <span className="text-[11px] text-slate-500 truncate max-w-[200px]">
                            {p.hardExudatesNote || p.visionComplaint}
                          </span>
                          <span className="text-[10px] text-[#0d766e] font-semibold mt-0.5">
                            Edge AI Conf: {p.aiConfidence}
                          </span>
                        </div>
                      </td>

                      {/* Risk Level */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isCritical ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-red-600 text-white text-[10px] font-bold uppercase tracking-wide shadow-xs animate-pulse">
                            <span className="material-symbols-outlined text-xs">
                              emergency
                            </span>
                            Critical Risk
                          </span>
                        ) : p.riskLevel === 'High Risk' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-red-100 text-red-800 text-[10px] font-bold uppercase tracking-wide">
                            <span className="material-symbols-outlined text-xs">
                              warning
                            </span>
                            High Risk
                          </span>
                        ) : p.riskLevel === 'Mild' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-100 text-amber-900 text-[10px] font-bold uppercase tracking-wide">
                            <span className="material-symbols-outlined text-xs">
                              schedule
                            </span>
                            Mild / Follow-up
                          </span>
                        ) : p.riskLevel === 'Incomplete' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-100 text-blue-900 text-[10px] font-bold uppercase tracking-wide">
                            <span className="material-symbols-outlined text-xs">
                              pending
                            </span>
                            Incomplete
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wide">
                            <span className="material-symbols-outlined text-xs">
                              verified
                            </span>
                            Normal / Healthy
                          </span>
                        )}
                      </td>

                      {/* Triage Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span
                            className={`font-semibold text-xs flex items-center gap-1 ${
                              isCritical
                                ? 'text-red-700'
                                : p.riskLevel === 'Normal'
                                ? 'text-emerald-700'
                                : 'text-slate-800'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isCritical
                                  ? 'bg-red-600'
                                  : p.riskLevel === 'Normal'
                                  ? 'bg-emerald-600'
                                  : 'bg-amber-500'
                              }`}
                            ></span>
                            {p.triageStatus}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {isCritical ? 'Assigned: Dr. Rathod' : 'Local Registry'}
                          </span>
                        </div>
                      </td>

                      {/* Clinical Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {isCritical ? (
                            <>
                              <button
                                type="button"
                                onClick={() => onOpenTeleconsult(p)}
                                className="min-h-[40px] px-3 rounded-lg bg-red-700 hover:bg-red-800 text-white font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-sm">
                                  video_call
                                </span>
                                <span>Tele-Consult</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => onOpenPrintSlip(p)}
                                className="min-h-[40px] p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer"
                                title="Print Slip"
                              >
                                <span className="material-symbols-outlined text-base">
                                  print
                                </span>
                              </button>
                            </>
                          ) : p.riskLevel === 'High Risk' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => onOpenPrintSlip(p)}
                                className="min-h-[40px] px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-sm text-[#0d766e]">
                                  print
                                </span>
                                <span>Print Slip</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => onOpenFundusModal(p, 'OD')}
                                className="min-h-[40px] px-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[#0d766e] text-xs font-semibold flex items-center gap-1 hover:bg-slate-100 cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-sm">
                                  description
                                </span>
                                <span>Report</span>
                              </button>
                            </>
                          ) : p.riskLevel === 'Normal' ? (
                            <button
                              type="button"
                              onClick={() =>
                                showToast(
                                  `1-Year Normal Eye Health Certificate issued for ${p.name}`,
                                  'verified'
                                )
                              }
                              className="min-h-[40px] px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-sm">
                                badge
                              </span>
                              <span>Issue Certificate</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onNavigate('retinal-capture')}
                              className="min-h-[40px] px-3 rounded-lg bg-[#0d766e] hover:bg-[#005c55] text-white text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-base">
                                photo_camera
                              </span>
                              <span>Resume OS</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span>
                Showing <strong className="text-slate-900">1 to {filteredPatients.length}</strong> of{' '}
                <strong className="text-slate-900">14</strong> patient records
              </span>
              <span>•</span>
              <span className="font-semibold text-[#0d766e]">
                Camp Batch #01 (Active)
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="min-h-[38px] px-3 rounded-lg bg-white border border-slate-200 text-slate-500 font-semibold shadow-xs disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                className={`min-h-[38px] w-9 rounded-lg font-bold shadow-xs cursor-pointer ${
                  currentPage === 1
                    ? 'bg-[#0d766e] text-white'
                    : 'bg-white border border-slate-200 text-slate-800'
                }`}
              >
                1
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(2)}
                className={`min-h-[38px] w-9 rounded-lg font-bold shadow-xs cursor-pointer ${
                  currentPage === 2
                    ? 'bg-[#0d766e] text-white'
                    : 'bg-white border border-slate-200 text-slate-800'
                }`}
              >
                2
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(3)}
                className={`min-h-[38px] w-9 rounded-lg font-bold shadow-xs cursor-pointer ${
                  currentPage === 3
                    ? 'bg-[#0d766e] text-white'
                    : 'bg-white border border-slate-200 text-slate-800'
                }`}
              >
                3
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrentPage((p) => Math.min(3, p + 1));
                  showToast('Loaded page 2 of screening records.', 'navigate_next');
                }}
                className="min-h-[38px] px-3 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold shadow-xs transition-colors cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Empty state when no patients */}
        {totalPatients === 0 && (
          <div className="p-8 rounded-xl bg-white border border-slate-200 shadow-xs text-center">
            <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">person_off</span>
            <p className="text-sm font-semibold text-slate-700">No patients registered yet</p>
            <p className="text-xs text-slate-500 mt-1">
              Patients will appear here after Screening Staff registers and screens them.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
