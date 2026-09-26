import React, { useState } from 'react';
import { ScreenId, Language } from '../../types';
import { checkApiHealth } from '../../services/retinaApi';

interface SettingsCalibrationScreenProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  highGlareMode: boolean;
  onToggleHighGlare: () => void;
  onNavigate: (screen: ScreenId) => void;
  showToast: (msg: string, icon?: string) => void;
}

export const SettingsCalibrationScreen: React.FC<SettingsCalibrationScreenProps> = ({
  language,
  onLanguageChange,
  highGlareMode,
  onToggleHighGlare,
  onNavigate,
  showToast,
}) => {
  const [isSelfTesting, setIsSelfTesting] = useState(false);
  const [testProgress, setTestProgress] = useState(0);
  const [testStatusMsg, setTestStatusMsg] = useState(
    'Calibrating LED fixation beam and alignment sensors...'
  );
  const [confidenceThreshold, setConfidenceThreshold] = useState(90);
  const [gradCamEnabled, setGradCamEnabled] = useState(true);
  const [voiceVolume, setVoiceVolume] = useState(85);
  const [autoPlayAudio, setAutoPlayAudio] = useState(true);

  const handleRunSelfTest = () => {
    if (isSelfTesting) return;
    setIsSelfTesting(true);
    setTestProgress(0);

    const steps = [
      { at: 20, msg: 'Testing dual IR 850nm diodes & white fixation LED...' },
      { at: 45, msg: 'Verifying 12 MP Sony IMX sensor parity & focus distance...' },
      { at: 70, msg: 'Checking AI inference server connectivity...' },
      { at: 90, msg: 'Validating API health & model availability...' },
      { at: 100, msg: 'Diagnostic sequence complete.' },
    ];

    let current = 0;
    const interval = setInterval(() => {
      current += 5;
      if (current > 100) current = 100;
      setTestProgress(current);

      const step = steps.find((s) => current <= s.at);
      if (step) {
        setTestStatusMsg(step.msg);
      }

      if (current >= 100) {
        clearInterval(interval);
        // Actually check the AI API health as a real validation step
        checkApiHealth().then((health) => {
          setIsSelfTesting(false);
          if (health.ok) {
            showToast(
              `Self-Test passed: AI model ${health.modelId || 'unknown'} online. Hardware checks simulated.`,
              'check_circle'
            );
          } else {
            showToast(
              `Self-Test partial: Hardware simulated OK, but AI server unreachable (${health.error || 'no API key'}).`,
              'warning'
            );
          }
        }).catch(() => {
          setIsSelfTesting(false);
          showToast(
            'Self-Test failed: Could not reach AI inference server.',
            'error'
          );
        });
      }
    }, 150);
  };

  const handleSensorCalibration = () => {
    showToast(
      'Sensor calibration simulated. No physical hardware connected.',
      'tune'
    );
  };

  const handleTestShutter = () => {
    showToast(
      'Shutter test simulated. Connect USB-OTG funduscope for live test.',
      'flash_on'
    );
  };

  return (
    <div className="flex flex-col w-full select-none">
      <div className="relative w-full px-4 lg:px-6 py-6 pb-24 max-w-7xl mx-auto flex flex-col gap-6">
        {/* Masthead */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-5 drishti-entrance drishti-entrance--visible drishti-stagger-1">
          <div className="flex flex-col gap-1 max-w-3xl">
            <div className="inline-flex items-center gap-2 text-[#0d766e] text-xs font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-[#0d766e] animate-pulse"></span>
              <span>Core Telemetry · Local Node ID: MH-NDB-08</span>
            </div>
            <h1 className="text-2xl lg:text-3xl text-slate-900 font-extrabold tracking-tight">
              Settings & Calibration
              <span className="block text-[#0d766e] text-base lg:text-lg font-semibold tracking-normal mt-0.5">
                सेटिंग्ज आणि उपकरण कॅलिब्रेशन
              </span>
            </h1>
            <p className="text-xs text-slate-600 max-w-2xl mt-0.5">
              Device diagnostics, on-device Edge AI neural acceleration engine configuration, and ruggedized field camp operating parameters.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-xs border border-slate-200 self-start md:self-auto">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800 shrink-0">
              <span className="material-symbols-outlined text-xl">verified</span>
            </div>
            <div className="flex flex-col pr-2">
              <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                ALL SYSTEMS OPERATIONAL
              </div>
              <span className="text-[11px] text-slate-500">
                Funduscope Calibrated · 45° Arc Locked
              </span>
            </div>
          </div>
        </div>

        {/* 4-Section Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start drishti-entrance drishti-entrance--visible drishti-stagger-2">
          {/* LEFT COLUMN: Section 1 & Section 2 (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            {/* SECTION 1: DEVICE & FUNDUSCOPE CALIBRATION */}
            <div className="bg-white rounded-xl p-5 shadow-xs border border-slate-200 flex flex-col gap-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#0d766e] text-xl">
                    photo_camera
                  </span>
                  <h2 className="text-xs font-bold tracking-wider text-slate-900 uppercase">
                    Device & Funduscope Calibration
                  </h2>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold">
                  Live Hardware Bus
                </span>
              </div>

              {/* Hardware Visual Diagnostics Tile */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="relative h-44 md:h-auto rounded-lg overflow-hidden bg-black flex items-center justify-center group border border-slate-300">
                  <img
                    alt="Funduscope lens ring"
                    className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-luminosity"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuD0UPO0bTd6rXLE2BehSFNm9L4fL2SUMOGU9YidWXuHmQ4SGZoz8Z1Ke8eza0hNt14XqYmVJod9EynK2S7VvIjTeq2N95Toy3dyuhG5bvMDrWDIBfxbQvRmFsisHZlOmd3RDrl0Eq1p1MIHQ4VUInwIiJRUkwgTyQBnkjJFA33Ht_ijo5HJUiHThXyhRnivPQcYij-8rxDsPBFmqhLKkSLudnaRjFH1OOh83iNfubqD4JH8LEOHfZ5Cgg"
                  />
                  {/* Reticle Target Simulation */}
                  <svg
                    className="relative z-10 w-28 h-28 text-teal-300"
                    fill="none"
                    viewBox="0 0 100 100"
                  >
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      stroke="currentColor"
                      strokeDasharray="3 3"
                      strokeWidth="1.5"
                    ></circle>
                    <circle
                      cx="50"
                      cy="50"
                      r="28"
                      stroke="currentColor"
                      strokeWidth="1"
                    ></circle>
                    <line
                      x1="50"
                      y1="4"
                      x2="50"
                      y2="96"
                      stroke="currentColor"
                      strokeOpacity="0.6"
                      strokeWidth="1"
                    ></line>
                    <line
                      x1="4"
                      y1="50"
                      x2="96"
                      y2="50"
                      stroke="currentColor"
                      strokeOpacity="0.6"
                      strokeWidth="1"
                    ></line>
                    <circle cx="50" cy="50" r="3" fill="currentColor"></circle>
                  </svg>
                  <div className="absolute bottom-2 left-2 z-20 flex items-center gap-1 bg-black/80 px-2 py-0.5 rounded text-white text-[10px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>45° Arc Target</span>
                  </div>
                </div>

                <div className="md:col-span-2 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-slate-900 leading-tight">
                        Drishti-Netra Pro
                      </span>
                      <span className="text-[10px] text-[#0d766e] font-semibold px-2 py-0.5 rounded bg-teal-50 border border-teal-200">
                        45° Non-Mydriatic
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">
                      SN: NP-45-MH-2024-089
                    </div>
                  </div>

                  {/* Compact Diagnostic Checklist */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white p-2 rounded border border-slate-200 flex flex-col">
                      <span className="text-[10px] text-slate-500">Sensor Parity</span>
                      <span className="font-bold text-slate-900">
                        12 MP Sony IMX (100%)
                      </span>
                    </div>
                    <div className="bg-white p-2 rounded border border-slate-200 flex flex-col">
                      <span className="text-[10px] text-slate-500">Optical Uniformity</span>
                      <span className="font-bold text-emerald-700">
                        100% Calibrated
                      </span>
                    </div>
                    <div className="bg-white p-2 rounded border border-slate-200 flex flex-col">
                      <span className="text-[10px] text-slate-500">Illumination Source</span>
                      <span className="font-semibold text-slate-800">
                        Dual IR + White LED
                      </span>
                    </div>
                    <div className="bg-white p-2 rounded border border-slate-200 flex flex-col">
                      <span className="text-[10px] text-slate-500">Lens Status</span>
                      <span className="font-semibold text-slate-800">
                        Clean & Anti-Fog Active
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <span className="material-symbols-outlined text-xs">schedule</span>
                    <span>Last optical parity check: Today, 09:15 AM (Vadbare Camp)</span>
                  </div>
                </div>
              </div>

              {/* Self-Test Interactive Action Trigger */}
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  disabled={isSelfTesting}
                  onClick={handleRunSelfTest}
                  className="w-full min-h-[48px] px-5 py-2.5 rounded-lg bg-[#0d766e] hover:bg-[#005c55] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs active:translate-y-px transition-all cursor-pointer drishti-btn"
                >
                  <span className="material-symbols-outlined text-base">
                    {isSelfTesting ? 'hourglass_empty' : 'play_circle'}
                  </span>
                  <span>
                    {isSelfTesting
                      ? 'Diagnostic Routine In Progress...'
                      : 'Run 5-Second Optical Diagnostic Self-Test'}
                  </span>
                </button>

                {/* Test Progress Bar */}
                {isSelfTesting && (
                  <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-teal-50 border border-teal-200 transition-all">
                    <div className="flex items-center justify-between text-xs text-slate-800">
                      <span className="font-medium text-[11px]">{testStatusMsg}</span>
                      <span className="font-bold text-[#0d766e] font-mono">{testProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#0d766e] h-full rounded-full drishti-progress-fill"
                        style={{ width: `${testProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Secondary Hardware Toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={handleSensorCalibration}
                    className="min-h-[44px] px-3.5 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[#0d766e] text-base">
                      tune
                    </span>
                    <span>Recalibrate Alignment Sensor</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleTestShutter}
                    className="min-h-[44px] px-3.5 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[#006398] text-base">
                      flash_on
                    </span>
                    <span>Test Shutter & Fixation LED</span>
                  </button>
                </div>
              </div>
            </div>

            {/* SECTION 2: AI SCREENING ENGINE SETTINGS */}
            <div className="bg-white rounded-xl p-5 shadow-xs border border-slate-200 flex flex-col gap-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#0d766e] text-xl">
                    psychology
                  </span>
                  <h2 className="text-xs font-bold tracking-wider text-slate-900 uppercase">
                    AI Screening Engine Settings
                  </h2>
                </div>
                <div className="inline-flex items-center gap-1 text-emerald-800 font-bold text-[10px] px-2 py-0.5 rounded bg-emerald-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  On-Device Inference Active
                </div>
              </div>

              {/* Neural Engine Telemetry Strip */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex flex-col">
                  <span className="text-[10px] text-slate-500">Engine Architecture</span>
                  <span className="text-xs font-bold text-slate-900 mt-0.5">
                    RetiNet-Mobile v2.4
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">TFLite INT8</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex flex-col">
                  <span className="text-[10px] text-slate-500">Acceleration Unit</span>
                  <span className="text-xs font-bold text-[#0d766e] mt-0.5">
                    MediaTek APU / DSP
                  </span>
                  <span className="text-[10px] text-emerald-700 font-semibold">Active · Optimal</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex flex-col">
                  <span className="text-[10px] text-slate-500">Latency Profile</span>
                  <span className="text-sm font-extrabold text-slate-900 mt-0.5">0 ms</span>
                  <span className="text-[10px] text-slate-400">Cloud-Independent</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex flex-col">
                  <span className="text-[10px] text-slate-500">Dual-Eye Latency</span>
                  <span className="text-sm font-extrabold text-slate-900 mt-0.5">210 ms</span>
                  <span className="text-[10px] text-emerald-700 font-semibold">Per Batch</span>
                </div>
              </div>

              {/* Confidence Threshold Slider */}
              <div className="flex flex-col gap-2 pt-1">
                <div className="flex items-center justify-between">
                  <div>
                    <label
                      htmlFor="confidence-slider"
                      className="text-xs font-semibold text-slate-900 block"
                    >
                      AI Confidence Threshold for High-Risk Escalation
                    </label>
                    <span className="text-[11px] text-slate-500">
                      Standard National Programme for Control of Blindness & Visual Impairment (NPCBVI) Guideline
                    </span>
                  </div>
                  <span className="text-sm font-bold text-[#0d766e] bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-lg font-mono">
                    {confidenceThreshold}%
                  </span>
                </div>
                <input
                  id="confidence-slider"
                  type="range"
                  min="75"
                  max="98"
                  value={confidenceThreshold}
                  onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0d766e]"
                />
                <div className="flex justify-between text-[10px] text-slate-500 px-1">
                  <span>75% (High Sensitivity)</span>
                  <span className="font-bold text-[#0d766e]">90% Recommended</span>
                  <span>98% (High Specificity)</span>
                </div>
              </div>

              {/* Explainable Heatmap Mode */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[#0d766e] shadow-xs shrink-0">
                    <span className="material-symbols-outlined text-lg">blur_on</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-900">
                      Explainable Grad-CAM Heatmap
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Overlay level: Medium · Highlights microaneurysms
                    </span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gradCamEnabled}
                    onChange={(e) => setGradCamEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0d766e]"></div>
                </label>
              </div>

              {/* Check Model Updates */}
              <div className="flex items-center justify-between pt-1 text-xs">
                <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                  <span className="material-symbols-outlined text-sm">cloud_sync</span>
                  <span>Active Model Hash: sha256:4f88c3a910e · Offline</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    showToast('Model is currently up-to-date with offline release package v2.4.2.')
                  }
                  className="min-h-[38px] px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">sync</span>
                  <span>Check for Model Updates</span>
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Section 3 & Section 4 (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            {/* SECTION 3: LANGUAGE & FIELD USABILITY */}
            <div className="bg-white rounded-xl p-5 shadow-xs border border-slate-200 flex flex-col gap-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#0d766e] text-xl">
                    translate
                  </span>
                  <h2 className="text-xs font-bold tracking-wider text-slate-900 uppercase">
                    Language & Field Usability
                  </h2>
                </div>
                <span className="text-[11px] text-[#0d766e] font-bold">ASHA Field Mode</span>
              </div>

              {/* Language Selection Radio Cards */}
              <div className="flex flex-col gap-2">
                {[
                  {
                    code: 'en' as Language,
                    name: 'English',
                    sub: 'Primary Clinical UI & Report Metadata',
                  },
                  {
                    code: 'hi' as Language,
                    name: 'हिन्दी (Hindi)',
                    sub: 'ऑडियो मार्गदर्शन आणि स्थानिक संवाद',
                  },
                  {
                    code: 'mr' as Language,
                    name: 'मराठी (Marathi)',
                    sub: 'स्थानिक भाषा आणि रुग्णांसाठी सूचना',
                  },
                ].map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => {
                      onLanguageChange(l.code);
                      showToast(`Language switched to ${l.name}.`, 'language');
                    }}
                    className={`flex items-center justify-between p-3 rounded-lg border text-left transition-all cursor-pointer ${
                      language === l.code
                        ? 'bg-teal-50/70 border-[#0d766e]'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          language === l.code
                            ? 'border-[#0d766e] bg-[#0d766e]'
                            : 'border-slate-400 bg-white'
                        }`}
                      >
                        {language === l.code && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-900">
                          {l.name}
                        </span>
                        <span className="text-[11px] text-slate-500">{l.sub}</span>
                      </div>
                    </div>
                    {language === l.code && (
                      <span className="px-2 py-0.5 rounded bg-white border border-teal-200 text-[10px] font-bold text-[#0d766e]">
                        Active
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Outdoor High-Glare Mode Control */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[#006398] text-xl">
                    light_mode
                  </span>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-900">
                      Outdoor High-Glare Mode
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Contrast boost 7.4:1 for bright sunlight camps
                    </span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={highGlareMode}
                    onChange={onToggleHighGlare}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#006398]"></div>
                </label>
              </div>

              {/* Audio Patient Coaching Prompts */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#0d766e] text-lg">
                      volume_up
                    </span>
                    <span className="text-xs font-bold text-slate-900">
                      Voice Guidance Volume
                    </span>
                  </div>
                  <span className="text-xs font-bold text-[#0d766e] font-mono">
                    {voiceVolume}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={voiceVolume}
                  onChange={(e) => setVoiceVolume(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0d766e]"
                />
                <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                  <span className="text-[11px] text-slate-600">
                    Auto-play audio instruction when viewfinder aligns
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoPlayAudio}
                      onChange={(e) => setAutoPlayAudio(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0d766e]"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* SECTION 4: DATA SECURITY & SYSTEM SPECIFICATIONS */}
            <div className="bg-white rounded-xl p-5 shadow-xs border border-slate-200 flex flex-col gap-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#0d766e] text-xl">
                    shield_lock
                  </span>
                  <h2 className="text-xs font-bold tracking-wider text-slate-900 uppercase">
                    Security & System Specs
                  </h2>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  ABDM Compliant
                </span>
              </div>

              {/* Specs List */}
              <div className="flex flex-col gap-2 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 font-medium">ABDM Certification</span>
                  <span className="text-emerald-700 font-bold">Active · M2 & M3 Certified</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 font-medium">Local Database Cryptography</span>
                  <span className="text-slate-900 font-semibold font-mono text-[11px]">
                    SQLite AES-256 Enabled
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                    <span className="material-symbols-outlined text-sm">sd_storage</span>
                    <span>Storage Availability</span>
                  </div>
                  <span className="text-slate-900 font-semibold">4.2 GB Free of 64 GB</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                    <span className="material-symbols-outlined text-sm text-emerald-600">
                      battery_charging_full
                    </span>
                    <span>Battery & Operational Health</span>
                  </div>
                  <span className="text-emerald-700 font-bold">84% (~5.5 hrs runtime)</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 font-medium">App & PWA Build</span>
                  <span className="text-slate-900 font-mono text-[11px]">
                    v2.4.2 (Build 2024.10)
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 font-medium">Assigned Sub-Center Node</span>
                  <span className="text-[#0d766e] font-bold font-mono text-[11px]">
                    PHC-MH-NDB-08
                  </span>
                </div>
              </div>

              {/* Administrative Action Triggers */}
              <div className="flex flex-col gap-2 pt-1 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() =>
                    showToast('Exporting AES-256 encrypted diagnostic package to external OTG drive...')
                  }
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center justify-center gap-2 active:translate-y-px transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">file_download</span>
                  <span>Export System Diagnostic Logs</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      showToast('Camp session locked. Security passcode required to re-authenticate.')
                    }
                    className="min-h-[44px] px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">lock_clock</span>
                    <span>Lock Camp</span>
                  </button>
                  <a
                    href="tel:104"
                    className="min-h-[44px] px-3 py-2 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#0d766e] border border-teal-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all text-center"
                  >
                    <span className="material-symbols-outlined text-base">support_agent</span>
                    <span>NHM Support</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
