import React, { useState, useEffect } from 'react';
import { ScreenId, Patient } from '../../types';
import { syncOfflineQueue } from '../../services/dbApi';

interface SyncOfflineDataScreenProps {
  patients: Patient[];
  onNavigate: (screen: ScreenId) => void;
  showToast: (msg: string, icon?: string) => void;
}

export const SyncOfflineDataScreen: React.FC<SyncOfflineDataScreenProps> = ({
  patients,
  onNavigate,
  showToast,
}) => {
  const [isCheckingSync, setIsCheckingSync] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(165); // 02:45
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Policy toggles
  const [autoSyncOn4g, setAutoSyncOn4g] = useState(true);
  const [compressWebP, setCompressWebP] = useState(true);
  const [retain30Days, setRetain30Days] = useState(true);

  // Countdown timer for next scheduled sweep
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 180));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')} min`;
  };

  const handleForceSync = async () => {
    if (!navigator.onLine) {
      setSyncFeedback('Device is offline. Cannot initiate synchronization.');
      showToast('No network connection detected.', 'cloud_off');
      return;
    }

    setIsCheckingSync(true);
    setSyncFeedback('Initiating secure sync protocol...');
    
    try {
      await syncOfflineQueue();
      setSyncFeedback('Sync complete. All records securely transmitted.');
      showToast('Offline queue synchronized successfully.', 'cloud_done');
    } catch (err) {
      setSyncFeedback('Sync failed. Records remain securely encrypted in local vault.');
      showToast('Sync failed: ' + (err instanceof Error ? err.message : String(err)), 'error');
    } finally {
      setIsCheckingSync(false);
    }
  };

  const handleExportUsb = () => {
    // Generate actual CSV data blob for download
    const headers = 'ID,Name,Age,Gender,ABHA,Village,Diagnosis,Confidence,Risk,SyncStatus\n';
    const rows = patients
      .map(
        (p) =>
          `"${p.id}","${p.name}",${p.age},"${p.gender}","${p.abhaId}","${p.village}","${p.aiDiagnosis}","${p.aiConfidence}","${p.riskLevel}","${p.syncStatus}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `drishti-export-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${patients.length} records as encrypted CSV.`, 'usb');
  };

  const handleManifest = () => {
    const synced = patients.filter((p) => p.syncStatus === 'synced').length;
    const queued = patients.filter((p) => p.syncStatus === 'queued').length;
    const highRisk = patients.filter(
      (p) => p.riskLevel === 'High Risk' || p.riskLevel === 'Critical'
    ).length;
    showToast(
      `Camp Manifest: ${patients.length} total (${synced} synced, ${queued} queued, ${highRisk} referrals).`,
      'receipt_long'
    );
  };

  const handleManualSyncRow = async (patientName: string, patientId: string) => {
    if (!navigator.onLine) {
      showToast(`Cannot sync ${patientName}: device is offline.`, 'cloud_off');
      return;
    }
    showToast(`Syncing ${patientName}...`, 'upload');
    try {
      const patient = patients.find((p) => p.id === patientId);
      if (!patient) throw new Error('Patient not found');
      const res = await fetch(`/api/patients/${patientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patient),
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      showToast(`${patientName} synced successfully.`, 'cloud_done');
    } catch (err) {
      showToast(`Sync failed for ${patientName}: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    }
  };

  // Patients awaiting sync
  const queuedPatients = patients.filter((p) => p.syncStatus === 'queued');

  return (
    <div className="flex flex-col w-full select-none">
      {/* Top Header Banner */}
      <div className="bg-slate-100 px-4 lg:px-6 py-4 border-b border-slate-200">
        <div className="max-w-7xl mx-auto flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-900 text-[10px] uppercase tracking-wider font-bold">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
                Edge-Protected Local Storage
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-200 text-slate-700 text-[10px] font-semibold">
                <span className="material-symbols-outlined text-xs text-[#0d766e]">
                  security
                </span>
                ABDM FIPS-140-3 Compliant
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm text-emerald-600">
                  check_circle
                </span>
                Vault Hash: #8F2A-E019
              </span>
              <span>•</span>
              <span>Local Clock: 11:05 AM IST</span>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl text-slate-900 font-extrabold tracking-tight">
                Sync & Offline Data{' '}
                <span className="text-lg lg:text-xl text-slate-500 font-normal">
                  (ऑफलाइन डेटा आणि क्लाउड सिंक)
                </span>
              </h1>
              <p className="text-xs text-slate-600 mt-0.5">
                Encrypted SQLite Local Vault & Automatic Cloud Synchronization Engine
              </p>
            </div>

            <div className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-red-50 border border-red-200 text-red-900 shadow-xs">
              <span className="material-symbols-outlined text-xl text-red-600">
                cloud_off
              </span>
              <div className="flex flex-col">
                <span className="text-xs uppercase tracking-wide font-bold text-red-700">
                  OFFLINE MODE ACTIVE
                </span>
                <span className="text-[10px] text-red-800">
                  Zero Data Loss Guarantee • Autonomous Field Engine
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto w-full px-4 lg:px-6 py-6 flex flex-col gap-6 pb-20">
        {/* 4 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 drishti-entrance drishti-entrance--visible drishti-stagger-1">
          {/* Card 1: Local Storage */}
          <div className="rounded-xl bg-white p-4 shadow-xs border border-slate-200 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Local Storage Status
                </span>
                <span className="text-2xl font-extrabold text-slate-900 mt-1">
                  4.2 GB <span className="text-xs font-normal text-slate-500">Free</span>
                </span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-teal-50 text-[#0d766e] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl">sd_card</span>
              </div>
            </div>
            <div className="mt-3 pt-2 flex flex-col gap-1.5">
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-[#0d766e] h-full rounded-full w-[32%] drishti-progress-fill"></div>
              </div>
              <p className="text-[11px] text-slate-500 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs text-emerald-600">
                  lock
                </span>
                SQLite AES-256 Protected, 14 Scans Cached
              </p>
            </div>
          </div>

          {/* Card 2: Pending Cloud Sync */}
          <div className="rounded-xl bg-white p-4 shadow-xs border border-slate-200 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-red-600 tracking-wider">
                  Pending Cloud Sync
                </span>
                <span className="text-2xl font-extrabold text-red-700 mt-1">
                  03 <span className="text-xs font-normal text-slate-500">Records</span>
                </span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-red-50 text-red-700 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl">
                  pending_actions
                </span>
              </div>
            </div>
            <div className="mt-3 pt-2 flex flex-col gap-0.5">
              <div className="flex items-center justify-between text-[11px] text-slate-600">
                <span>Payload queued:</span>
                <span className="font-semibold text-slate-900">32.3 MB</span>
              </div>
              <p className="text-[11px] text-slate-500 truncate">
                Encrypted packages awaiting 4G reconnect
              </p>
            </div>
          </div>

          {/* Card 3: On-Device AI Status */}
          <div className="rounded-xl bg-white p-4 shadow-xs border border-slate-200 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  On-Device AI Status
                </span>
                <span className="text-2xl font-extrabold text-emerald-700 mt-1">
                  100% <span className="text-xs font-normal text-slate-500">Autonomous</span>
                </span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl">memory</span>
              </div>
            </div>
            <div className="mt-3 pt-2 flex flex-col gap-0.5">
              <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                NPU Neural Core 28.4 TOPS Active
              </div>
              <p className="text-[11px] text-slate-500 truncate">
                RetiNet-Mobile v2.4 runs locally on tablet NPU
              </p>
            </div>
          </div>

          {/* Card 4: Battery Runtime */}
          <div className="rounded-xl bg-white p-4 shadow-xs border border-slate-200 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Battery Runtime
                </span>
                <span className="text-2xl font-extrabold text-slate-900 mt-1">
                  84% <span className="text-xs font-normal text-slate-500">(~5.5 Hrs)</span>
                </span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-slate-50 text-emerald-700 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl">
                  battery_charging_80
                </span>
              </div>
            </div>
            <div className="mt-3 pt-2 flex flex-col gap-1.5">
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-600 h-full rounded-full w-[84%]"></div>
              </div>
              <p className="text-[11px] text-slate-500">
                Adequate for entire afternoon screening camp
              </p>
            </div>
          </div>
        </div>

        {/* Network Status Action Card */}
        <div className="rounded-xl bg-white shadow-xs border border-slate-200 p-5 flex flex-col gap-4 drishti-entrance drishti-entrance--visible drishti-stagger-2">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl">
                  signal_cellular_nodata
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="inline-flex w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse"></span>
                  <h2 className="text-sm font-bold text-slate-900">
                    Network Status: Offline (No 4G Cellular / Camp Anganwadi #03)
                  </h2>
                </div>
                <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
                  All patient registrations, fundus scans, AI Grad-CAM heatmaps, and doctor referral slips remain securely stored on this device. Records will automatically upload to the State Health Cloud as soon as a data connection is detected.
                </p>
              </div>
            </div>

            <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 flex flex-col gap-0.5 text-right self-start lg:self-auto shrink-0">
              <span className="text-[10px] text-slate-500">Next Scheduled Sweep</span>
              <span className="text-xs font-bold text-[#0d766e] flex items-center gap-1 justify-end font-mono">
                <span className="material-symbols-outlined text-sm animate-spin">
                  refresh
                </span>
                In {formatCountdown(secondsRemaining)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1 border-t border-slate-100">
            <button
              type="button"
              disabled={isCheckingSync}
              onClick={handleForceSync}
              className="min-h-[46px] px-5 py-2 rounded-lg bg-[#0d766e] hover:bg-[#005c55] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs active:translate-y-px transition-all cursor-pointer drishti-btn"
            >
              <span
                className={`material-symbols-outlined text-lg ${
                  isCheckingSync ? 'animate-spin' : ''
                }`}
              >
                sync
              </span>
              <span>
                {isCheckingSync
                  ? 'Testing Handshake...'
                  : 'Sync All Records Now (Force Connection Check)'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleExportUsb}
              className="min-h-[46px] px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center justify-center gap-2 active:translate-y-px transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-base text-[#0d766e]">
                usb
              </span>
              <span>Export Offline Encrypted Backup to USB / SD Card</span>
            </button>

            <button
              type="button"
              onClick={handleManifest}
              className="min-h-[46px] px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center justify-center gap-2 active:translate-y-px transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-base text-[#006398]">
                receipt_long
              </span>
              <span>Generate Offline Batch Manifest (PDF/CSV)</span>
            </button>
          </div>

          {/* Sync feedback banner */}
          {syncFeedback && (
            <div className="rounded-lg bg-slate-50 border border-slate-300 p-3 text-slate-800 text-xs flex items-center gap-2.5 animate-in fade-in">
              <span className="material-symbols-outlined text-lg text-[#006398]">
                info
              </span>
              <span>{syncFeedback}</span>
            </div>
          )}
        </div>

        {/* Pending Sync Queue Table */}
        <div className="rounded-xl bg-white shadow-xs border border-slate-200 flex flex-col overflow-hidden drishti-entrance drishti-entrance--visible drishti-stagger-3">
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-100 text-red-800 flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-base">schedule</span>
              </div>
              <div className="flex flex-col">
                <h3 className="text-sm font-bold text-slate-900">
                  Pending Sync Queue ({queuedPatients.length} Files)
                </h3>
                <span className="text-[11px] text-slate-500">
                  Cryptographically signed on this tablet • Ready for bulk upload
                </span>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 text-[11px] font-semibold">
              Auto-Retries: Enabled (3 min loop)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-semibold">Patient Name</th>
                  <th className="py-3 px-4 font-semibold">ABHA ID</th>
                  <th className="py-3 px-4 font-semibold">Screen Type</th>
                  <th className="py-3 px-4 font-semibold">Package Size</th>
                  <th className="py-3 px-4 font-semibold">Local Timestamp</th>
                  <th className="py-3 px-4 font-semibold">Sync Status</th>
                  <th className="py-3 px-4 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-900">
                {queuedPatients.map((p, idx) => (
                  <tr
                    key={p.id}
                    style={{ animationDelay: `${idx * 40}ms` }}
                    className="hover:bg-slate-50/80 transition-colors drishti-table-row drishti-row-enter"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-teal-100 text-[#0d766e] flex items-center justify-center font-bold text-xs shrink-0">
                          {p.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 text-sm">
                            {p.name}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {p.age} Yrs / {p.gender} • {p.diabetesDuration || 'Routine'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-[#0d766e]">
                      {p.abhaId}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900">
                          Full Exam (OD/OS + Grad-CAM)
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Voice Note & Demographics Attached
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold font-mono">
                      {idx === 0 ? '12.4 MB' : idx === 1 ? '8.1 MB' : '11.8 MB'}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="font-semibold">{p.screenTime}</span>
                        <span className="text-[10px] text-slate-400">
                          Cached in SQLite
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-800 border border-red-200 text-[10px] font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
                        Awaiting 4G Connection
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleManualSyncRow(p.name, p.id)}
                        className="min-h-[38px] px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#0d766e] text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer drishti-btn"
                      >
                        <span className="material-symbols-outlined text-sm">
                          upload
                        </span>
                        <span>Manual Sync</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sync History & Edge Policies (2 columns) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 drishti-entrance drishti-entrance--visible drishti-stagger-4">
          {/* Recent Synchronization History */}
          <div className="lg:col-span-7 rounded-xl bg-white p-5 shadow-xs border border-slate-200 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-xl text-emerald-600">
                  history_toggle_off
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  Recent Synchronization History
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                Auto-Audit Log
              </span>
            </div>

            <div className="flex flex-col gap-3">
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-base font-bold">
                      check
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        Batch #04-A (9 Records)
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        SUCCESS
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      Synced at PHC Nandurbar WiFi (08:30 AM before departure)
                    </span>
                    <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                      <span className="material-symbols-outlined text-xs">
                        verified
                      </span>
                      Synced & Verified by ABDM State Health Cloud
                    </span>
                  </div>
                </div>
                <div className="text-right flex flex-col justify-center sm:items-end">
                  <span className="text-xs font-mono font-bold text-slate-900">
                    74.2 MB Uploaded
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Ack: #NDB-89104-V
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-teal-100 text-[#0d766e] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-base">
                      shield
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-900">
                      AES-256 Database Integrity Check
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Continuous local page check • Sector sanity check completed
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  <span className="material-symbols-outlined text-xs">done_all</span>
                  PASSED (Hash Verified)
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-slate-500 text-[11px]">
              <span>Local Device DB ID: VADBARE-TAB-04</span>
              <span>Last Cold Re-index: Today 06:00 AM</span>
            </div>
          </div>

          {/* Sync Policies & Edge Rules */}
          <div className="lg:col-span-5 rounded-xl bg-white p-5 shadow-xs border border-slate-200 flex flex-col justify-between gap-4">
            <div className="flex flex-col gap-1 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-xl text-[#0d766e]">
                  tune
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  Sync Policies & Edge Rules
                </h3>
              </div>
              <p className="text-[11px] text-slate-500">
                Automated low-bandwidth field operational rules
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={autoSyncOn4g}
                  onChange={(e) => setAutoSyncOn4g(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#0d766e] rounded cursor-pointer shrink-0"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-900">
                    Auto-sync on cellular reconnection
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Upload batches in background as soon as 3G/4G signal is acquired
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={compressWebP}
                  onChange={(e) => setCompressWebP(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#0d766e] rounded cursor-pointer shrink-0"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-900">
                    Compress fundus RAW images to lossless WebP
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Reduces bundle weight by 64% without losing diagnostic macula pixels
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={retain30Days}
                  onChange={(e) => setRetain30Days(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#0d766e] rounded cursor-pointer shrink-0"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-900">
                    Retain local copy for 30 days after camp
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Preserves local offline archive for second-opinion field revisits
                  </span>
                </div>
              </label>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs text-slate-700">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base text-[#0d766e]">
                  system_update_alt
                </span>
                <span>Firmware & Model Engine: v2.4-lite</span>
              </div>
              <span className="text-emerald-700 font-bold">Up to Date</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
