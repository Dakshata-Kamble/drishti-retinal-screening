import React, { useState } from 'react';
import { ScreenId, Patient } from '../../types';

interface PatientRegistrationScreenProps {
  onNavigate: (screen: ScreenId) => void;
  showToast: (msg: string, icon?: string) => void;
  activePatient: Patient;
  onUpdatePatient?: (updated: Partial<Patient>) => Promise<void>;
}

export const PatientRegistrationScreen: React.FC<
  PatientRegistrationScreenProps
> = ({
  onNavigate,
  showToast,
  activePatient,
  onUpdatePatient,
}) => {
  // =========================================================
  // PATIENT IDENTIFICATION
  // =========================================================

  const [fullName, setFullName] = useState(activePatient.name);
  const [age, setAge] = useState(activePatient.age.toString());

  const [gender, setGender] = useState<
    'Male' | 'Female' | 'Other'
  >(activePatient.gender);

  const [abhaId, setAbhaId] = useState(
    activePatient.abhaId || '91-4402-8812-3901'
  );

  const [mobile, setMobile] = useState(activePatient.mobile);
  const [village, setVillage] = useState(activePatient.village);

  const [rationId, setRationId] = useState(
    activePatient.rationId || 'MH-NDB-772190'
  );

  // =========================================================
  // DR SCREENING QUESTIONNAIRE
  // =========================================================

  const [diabetesStatus, setDiabetesStatus] = useState(
    activePatient.diabetesStatus
  );

  const [diabetesDiagnosisYear, setDiabetesDiagnosisYear] =
    useState('');

  const [diabetesTreatment, setDiabetesTreatment] =
    useState('');

  const [hba1c, setHba1c] = useState('');

  // Previous Eye History
  const [previousEyeScreening, setPreviousEyeScreening] =
    useState('');

  const [lastEyeScreeningDate, setLastEyeScreeningDate] =
    useState('');

  const [previousDR, setPreviousDR] = useState('');
  const [previousDRLevel, setPreviousDRLevel] = useState('');
  const [laserTreatment, setLaserTreatment] = useState('');
  const [eyeInjection, setEyeInjection] = useState('');
  const [eyeSurgery, setEyeSurgery] = useState('');

  // Vision Symptoms
  const [visionProblems, setVisionProblems] = useState<
    string[]
  >([]);

  // Medical History
  const [hypertension, setHypertension] = useState('');
  const [kidneyDisease, setKidneyDisease] = useState('');
  const [bloodPressure, setBloodPressure] = useState('');
  const [pregnancyStatus, setPregnancyStatus] = useState('');

  // Screening Measurements
  const [rightEyeVA, setRightEyeVA] = useState('');
  const [leftEyeVA, setLeftEyeVA] = useState('');

  // Consent / Saving
  const [consentChecked, setConsentChecked] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // =========================================================
  // ABHA SCANNER
  // =========================================================

  const handleScanAbha = () => {
    showToast(
      'Optical ABHA scanner activated. QR token validated.',
      'qr_code_scanner'
    );
  };

  // =========================================================
  // VISION SYMPTOM TOGGLE
  // =========================================================

  const toggleVisionProblem = (problem: string) => {
    setVisionProblems((prev) =>
      prev.includes(problem)
        ? prev.filter((item) => item !== problem)
        : [...prev, problem]
    );
  };

  // =========================================================
  // SAVE & PROCEED
  // =========================================================

  const handleSaveAndProceed = async () => {
    if (!consentChecked) {
      showToast(
        'Please verify informed consent before proceeding.',
        'warning'
      );
      return;
    }

    setIsSaving(true);

    try {
      if (onUpdatePatient) {
        await onUpdatePatient({
          name: fullName,
          age: parseInt(age) || 0,
          gender,
          abhaId,
          mobile,
          village,
          rationId,
          diabetesStatus,

          bp: bloodPressure,

          visionComplaint:
            visionProblems.length > 0
              ? visionProblems.join(', ')
              : 'No vision complaint reported',

          previousHistory: [
            diabetesDiagnosisYear
              ? `Diabetes diagnosed: ${diabetesDiagnosisYear}`
              : '',
            diabetesTreatment
              ? `Treatment: ${diabetesTreatment}`
              : '',
            hba1c
              ? `Latest HbA1c: ${hba1c}%`
              : '',
            previousEyeScreening
              ? `Previous eye screening: ${previousEyeScreening}`
              : '',
            lastEyeScreeningDate
              ? `Last screening: ${lastEyeScreeningDate}`
              : '',
            previousDR
              ? `Previous DR: ${previousDR}`
              : '',
            previousDRLevel
              ? `Previous DR level: ${previousDRLevel}`
              : '',
            laserTreatment
              ? `Laser treatment: ${laserTreatment}`
              : '',
            eyeInjection
              ? `Eye injection: ${eyeInjection}`
              : '',
            eyeSurgery
              ? `Eye surgery: ${eyeSurgery}`
              : '',
            hypertension
              ? `Hypertension: ${hypertension}`
              : '',
            kidneyDisease
              ? `Kidney disease: ${kidneyDisease}`
              : '',
            pregnancyStatus
              ? `Pregnancy status: ${pregnancyStatus}`
              : '',
            rightEyeVA
              ? `Right eye VA: ${rightEyeVA}`
              : '',
            leftEyeVA
              ? `Left eye VA: ${leftEyeVA}`
              : '',
          ]
            .filter(Boolean)
            .join(' | '),
        });
      }

      showToast(
        'Patient registration saved. Moving to Capture.',
        'save'
      );

      onNavigate('retinal-capture');
    } catch (err) {
      showToast(
        'Failed to save patient record.',
        'error'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col w-full select-none">

      {/* =====================================================
          STEP FLOW HEADER
      ====================================================== */}

      <section className="w-full px-4 lg:px-6 pt-5 pb-4 drishti-entrance drishti-entrance--visible drishti-stagger-1">

        <div className="max-w-7xl mx-auto flex flex-col gap-4">

          {/* HEADER */}

          <div className="flex flex-wrap items-center justify-between gap-3">

            <div>

              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">

                <span className="uppercase tracking-widest text-[#005c55] font-bold">
                  Ayushman Bharat - NPCBVI
                </span>

                <span>/</span>

                <span>
                  Vadbare Anganwadi Camp #03 • Session #04
                </span>

              </div>

              <h1 className="text-2xl lg:text-3xl text-slate-900 font-extrabold tracking-tight">

                Patient Registration{' '}

                <span className="text-lg lg:text-xl text-slate-500 font-normal">
                  (रुग्ण नोंदणी / नया मरीज पंजीकरण)
                </span>

              </h1>

            </div>

            <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl shadow-xs border border-slate-200">

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 text-slate-700">

                <span className="material-symbols-outlined text-[#006398] text-sm">
                  schedule
                </span>

                <span className="text-xs font-semibold">
                  10:42 AM IST
                </span>

              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200">

                <span className="material-symbols-outlined text-emerald-600 text-sm">
                  verified
                </span>

                <span className="text-xs font-bold">
                  ASHA Protocol v2.4
                </span>

              </div>

            </div>

          </div>

          {/* =================================================
              STEPPER
          ================================================== */}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">

            {/* STEP 1 */}

            <div className="relative overflow-hidden bg-white rounded-xl p-3.5 shadow-xs border-2 border-[#0d766e]">

              <div className="flex items-center gap-3">

                <div className="w-9 h-9 rounded-lg bg-[#0d766e] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                  01
                </div>

                <div className="flex flex-col min-w-0">

                  <span className="text-[11px] text-[#0d766e] font-bold uppercase tracking-wider">
                    Step 1 • Current
                  </span>

                  <span className="text-sm text-slate-900 font-bold truncate">
                    Patient Registration
                  </span>

                </div>

              </div>

              <div className="mt-3 w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">

                <div className="h-full bg-[#0d766e] w-3/4 rounded-full" />

              </div>

            </div>

            {/* STEP 2 */}

            <button
              type="button"
              onClick={() => onNavigate('retinal-capture')}
              className="bg-slate-50 rounded-xl p-3.5 flex items-center gap-3 opacity-90 border border-slate-200 text-left hover:bg-slate-100 transition-colors cursor-pointer"
            >

              <div className="w-9 h-9 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm shrink-0">
                02
              </div>

              <div className="flex flex-col min-w-0">

                <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                  Step 2 • Up Next
                </span>

                <span className="text-sm text-slate-700 font-medium truncate">
                  Retinal Capture
                </span>

              </div>

            </button>

            {/* STEP 3 */}

            <button
              type="button"
              onClick={() => onNavigate('ai-diagnosis')}
              className="bg-slate-50 rounded-xl p-3.5 flex items-center gap-3 opacity-75 border border-slate-200 text-left hover:bg-slate-100 transition-colors cursor-pointer"
            >

              <div className="w-9 h-9 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm shrink-0">
                03
              </div>

              <div className="flex flex-col min-w-0">

                <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                  Step 3 • Edge AI
                </span>

                <span className="text-sm text-slate-700 font-medium truncate">
                  AI Diagnosis & Triage
                </span>

              </div>

            </button>

          </div>

        </div>

      </section>

      {/* =====================================================
          MAIN WORKSPACE
          RIGHT COLUMN REMOVED
      ====================================================== */}

      <section className="w-full px-4 lg:px-6 pb-24 drishti-entrance drishti-entrance--visible drishti-stagger-2">

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

          {/* =================================================
              FULL WIDTH LEFT COLUMN
          ================================================== */}

          <div className="lg:col-span-12 flex flex-col gap-5">

            {/* =================================================
                ABHA SCANNER
            ================================================== */}

            <div className="bg-white rounded-xl p-4 sm:p-5 shadow-xs border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">

              <div className="flex items-center gap-3.5">

                <div className="w-12 h-12 rounded-xl bg-teal-50 text-[#0d766e] flex items-center justify-center shrink-0 border border-teal-200">

                  <span className="material-symbols-outlined text-2xl">
                    qr_code_scanner
                  </span>

                </div>

                <div className="flex flex-col">

                  <div className="flex items-center gap-2">

                    <span className="text-sm font-bold text-slate-900">
                      ABHA Instant Auto-Fill
                    </span>

                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      Fast-Track
                    </span>

                  </div>

                  <p className="text-xs text-slate-600 mt-0.5">
                    Scan patient's physical ABHA PVC card or Digital QR in
                    PM-JAY / Aarogya Setu app to auto-populate records
                    without typing errors.
                  </p>

                </div>

              </div>

              <button
                type="button"
                onClick={handleScanAbha}
                className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-lg bg-[#006398] hover:bg-[#004f7a] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs active:translate-y-px transition-all shrink-0 cursor-pointer"
              >

                <span className="material-symbols-outlined text-lg">
                  camera
                </span>

                <span>
                  Scan ABHA Card
                </span>

              </button>

            </div>

            {/* =================================================
                1. PATIENT IDENTIFICATION
            ================================================== */}

            <div className="bg-white rounded-xl p-5 sm:p-6 shadow-xs border border-slate-200 flex flex-col gap-5">

              <div className="flex items-center justify-between border-b border-slate-100 pb-3">

                <div className="flex items-center gap-2.5">

                  <span className="w-2.5 h-5 rounded-full bg-[#0d766e]" />

                  <h2 className="text-base font-bold text-slate-900">
                    1. Patient Identification
                  </h2>

                </div>

                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  * Mandatory Fields
                </span>

              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* FULL NAME */}

                <div className="flex flex-col gap-1.5 md:col-span-2">

                  <label className="text-xs font-bold text-slate-800 flex items-center justify-between">

                    <span>
                      Full Name (नाव / पूरा नाम) *
                    </span>

                    <span className="text-[#0d766e] text-[11px] font-normal">
                      Autofilled via Ration ID
                    </span>

                  </label>

                  <div className="relative">

                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) =>
                        setFullName(e.target.value)
                      }
                      className="w-full min-h-[46px] px-3.5 pr-24 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d766e] transition-all"
                    />

                    <span className="absolute right-3.5 top-3.5 text-xs text-slate-500 font-medium">
                      रमेश पाटील
                    </span>

                  </div>

                </div>

                {/* AGE */}

                <div className="flex flex-col gap-1.5">

                  <label className="text-xs font-bold text-slate-800">
                    Age (वय) *
                  </label>

                  <div className="relative">

                    <input
                      type="number"
                      value={age}
                      onChange={(e) =>
                        setAge(e.target.value)
                      }
                      className="w-full min-h-[46px] px-3.5 pr-14 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d766e] transition-all"
                    />

                    <span className="absolute right-3.5 top-3.5 text-xs text-slate-500">
                      Years
                    </span>

                  </div>

                </div>

                {/* GENDER */}

                <div className="flex flex-col gap-1.5">

                  <label className="text-xs font-bold text-slate-800">
                    Gender (लिंग) *
                  </label>

                  <div className="grid grid-cols-3 gap-2">

                    {(['Male', 'Female', 'Other'] as const).map(
                      (g) => (

                        <button
                          key={g}
                          type="button"
                          onClick={() => setGender(g)}
                          className={`min-h-[46px] px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                            gender === g
                              ? 'bg-[#0d766e] text-white shadow-xs'
                              : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >

                          <span className="material-symbols-outlined text-base">

                            {g === 'Male'
                              ? 'male'
                              : g === 'Female'
                              ? 'female'
                              : 'transgender'}

                          </span>

                          <span>
                            {g}
                          </span>

                        </button>

                      )
                    )}

                  </div>

                </div>

                {/* ABHA ID */}

                <div className="flex flex-col gap-1.5">

                  <label className="text-xs font-bold text-slate-800 flex items-center justify-between">

                    <span>
                      ABHA ID (Ayushman Card)
                    </span>

                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">

                      <span className="material-symbols-outlined text-xs">
                        verified
                      </span>

                      ABHA Verified

                    </span>

                  </label>

                  <input
                    type="text"
                    value={abhaId}
                    onChange={(e) =>
                      setAbhaId(e.target.value)
                    }
                    className="w-full min-h-[46px] px-3.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d766e] transition-all"
                  />

                </div>

                {/* MOBILE */}

                <div className="flex flex-col gap-1.5">

                  <label className="text-xs font-bold text-slate-800">
                    Mobile Phone (मोबाईल क्र.) *
                  </label>

                  <div className="relative">

                    <input
                      type="tel"
                      value={mobile}
                      onChange={(e) =>
                        setMobile(e.target.value)
                      }
                      className="w-full min-h-[46px] px-3.5 pr-10 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d766e] transition-all"
                    />

                    <span className="material-symbols-outlined absolute right-3.5 top-3.5 text-emerald-600 text-base">
                      check_circle
                    </span>

                  </div>

                </div>

                {/* VILLAGE */}

                <div className="flex flex-col gap-1.5">

                  <label className="text-xs font-bold text-slate-800">
                    Village / Hamlet (गाव / पाडा) *
                  </label>

                  <input
                    type="text"
                    value={village}
                    onChange={(e) =>
                      setVillage(e.target.value)
                    }
                    className="w-full min-h-[46px] px-3.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d766e] transition-all"
                  />

                </div>

                {/* RATION ID */}

                <div className="flex flex-col gap-1.5">

                  <label className="text-xs font-bold text-slate-800">
                    Ration / NFSA ID No.
                  </label>

                  <input
                    type="text"
                    value={rationId}
                    onChange={(e) =>
                      setRationId(e.target.value)
                    }
                    className="w-full min-h-[46px] px-3.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d766e] transition-all"
                  />

                </div>

              </div>

            </div>

            {/* =================================================
                2. DR SCREENING QUESTIONNAIRE
            ================================================== */}

            <div className="bg-white rounded-xl p-5 sm:p-6 shadow-xs border border-slate-200 flex flex-col gap-5">

              <div className="flex items-center justify-between border-b border-slate-100 pb-3">

                <div className="flex items-center gap-2.5">

                  <span className="w-2.5 h-5 rounded-full bg-[#006398]" />

                  <h2 className="text-base font-bold text-slate-900">
                    2. DR Screening Questionnaire
                  </h2>

                </div>

                <span className="px-2.5 py-1 rounded bg-blue-100 text-blue-900 text-[11px] font-semibold">
                  Retinopathy Screening
                </span>

              </div>

              {/* =================================================
                  DIABETES INFORMATION
              ================================================== */}

              <div>

                <h3 className="text-xs font-bold text-[#006398] uppercase tracking-wide mb-3">
                  Diabetes Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* DIABETES STATUS */}

                  <div className="flex flex-col gap-1.5">

                    <label className="text-xs font-bold text-slate-800">
                      Diabetes Status *
                    </label>

                    <select
                      value={diabetesStatus}
                      onChange={(e) =>
                        setDiabetesStatus(e.target.value)
                      }
                      className="w-full min-h-[46px] px-3.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d766e] cursor-pointer"
                    >

                      <option value="">
                        Select Status
                      </option>

                      <option value="Type 1 Diabetes">
                        Type 1 Diabetes
                      </option>

                      <option value="Type 2 Diabetes">
                        Type 2 Diabetes
                      </option>

                      <option value="Gestational Diabetes">
                        Gestational Diabetes
                      </option>

                      <option value="Non-Diabetic">
                        Non-Diabetic / Screening Only
                      </option>

                      <option value="Pre-Diabetic">
                        Borderline / Pre-Diabetic
                      </option>

                      <option value="Unknown">
                        Unknown
                      </option>

                    </select>

                  </div>

                  {/* DIAGNOSIS YEAR */}

                  <div className="flex flex-col gap-1.5">

                    <label className="text-xs font-bold text-slate-800">
                      Year of Diabetes Diagnosis
                    </label>

                    <input
                      type="number"
                      placeholder="e.g. 2018"
                      value={diabetesDiagnosisYear}
                      onChange={(e) =>
                        setDiabetesDiagnosisYear(
                          e.target.value
                        )
                      }
                      className="w-full min-h-[46px] px-3.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d766e]"
                    />

                  </div>

                  {/* TREATMENT */}

                  <div className="flex flex-col gap-1.5">

                    <label className="text-xs font-bold text-slate-800">
                      Current Diabetes Treatment
                    </label>

                    <select
                      value={diabetesTreatment}
                      onChange={(e) =>
                        setDiabetesTreatment(
                          e.target.value
                        )
                      }
                      className="w-full min-h-[46px] px-3.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d766e] cursor-pointer"
                    >

                      <option value="">
                        Select Treatment
                      </option>

                      <option value="Tablets">
                        Tablets
                      </option>

                      <option value="Insulin">
                        Insulin
                      </option>

                      <option value="Both">
                        Tablets + Insulin
                      </option>

                      <option value="None">
                        No Treatment
                      </option>

                      <option value="Unknown">
                        Unknown
                      </option>

                    </select>

                  </div>

                  {/* HBA1C */}

                  <div className="flex flex-col gap-1.5">

                    <label className="text-xs font-bold text-slate-800">

                      Latest HbA1c

                      <span className="font-normal text-slate-400">
                        {' '}
                        (if available)
                      </span>

                    </label>

                    <div className="relative">

                      <input
                        type="text"
                        placeholder="e.g. 7.2"
                        value={hba1c}
                        onChange={(e) =>
                          setHba1c(e.target.value)
                        }
                        className="w-full min-h-[46px] px-3.5 pr-12 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d766e]"
                      />

                      <span className="absolute right-3.5 top-3.5 text-xs text-slate-500">
                        %
                      </span>

                    </div>

                  </div>

                </div>

              </div>

              {/* =================================================
                  PREVIOUS EYE HISTORY
              ================================================== */}

              <div className="border-t border-slate-100 pt-5">

                <h3 className="text-xs font-bold text-[#006398] uppercase tracking-wide mb-3">
                  Previous Eye History
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* PREVIOUS SCREENING */}

                  <div className="flex flex-col gap-1.5">

                    <label className="text-xs font-bold text-slate-800">
                      Previous Diabetic Eye Screening?
                    </label>

                    <select
                      value={previousEyeScreening}
                      onChange={(e) =>
                        setPreviousEyeScreening(
                          e.target.value
                        )
                      }
                      className="w-full min-h-[46px] px-3.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d766e]"
                    >

                      <option value="">
                        Select
                      </option>

                      <option value="Yes">
                        Yes
                      </option>

                      <option value="No">
                        No
                      </option>

                      <option value="Unknown">
                        Unknown
                      </option>

                    </select>

                  </div>

                  {/* LAST SCREENING */}

                  <div className="flex flex-col gap-1.5">

                    <label className="text-xs font-bold text-slate-800">
                      Last Eye Screening Date
                    </label>

                    <input
                      type="date"
                      value={lastEyeScreeningDate}
                      onChange={(e) =>
                        setLastEyeScreeningDate(
                          e.target.value
                        )
                      }
                      className="w-full min-h-[46px] px-3.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d766e]"
                    />

                  </div>

                  {/* PREVIOUS DR */}

                  <div className="flex flex-col gap-1.5">

                    <label className="text-xs font-bold text-slate-800">
                      Previously Diagnosed with DR?
                    </label>

                    <select
                      value={previousDR}
                      onChange={(e) =>
                        setPreviousDR(e.target.value)
                      }
                      className="w-full min-h-[46px] px-3.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d766e]"
                    >

                      <option value="">
                        Select
                      </option>

                      <option value="Yes">
                        Yes
                      </option>

                      <option value="No">
                        No
                      </option>

                      <option value="Unknown">
                        Unknown
                      </option>

                    </select>

                  </div>

                  {/* DR LEVEL */}

                  <div className="flex flex-col gap-1.5">

                    <label className="text-xs font-bold text-slate-800">
                      Previous DR Level
                    </label>

                    <select
                      value={previousDRLevel}
                      onChange={(e) =>
                        setPreviousDRLevel(
                          e.target.value
                        )
                      }
                      className="w-full min-h-[46px] px-3.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d766e]"
                    >

                      <option value="">
                        Select if known
                      </option>

                      <option value="Mild NPDR">
                        Mild NPDR
                      </option>

                      <option value="Moderate NPDR">
                        Moderate NPDR
                      </option>

                      <option value="Severe NPDR">
                        Severe NPDR
                      </option>

                      <option value="Proliferative DR">
                        Proliferative DR
                      </option>

                      <option value="Unknown">
                        Unknown
                      </option>

                    </select>

                  </div>

                  {/* LASER */}

                  <div className="flex flex-col gap-1.5">

                    <label className="text-xs font-bold text-slate-800">
                      Previous Laser Treatment?
                    </label>

                    <select
                      value={laserTreatment}
                      onChange={(e) =>
                        setLaserTreatment(
                          e.target.value
                        )
                      }
                      className="w-full min-h-[46px] px-3.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d766e]"
                    >

                      <option value="">
                        Select
                      </option>

                      <option value="Yes">
                        Yes
                      </option>

                      <option value="No">
                        No
                      </option>

                      <option value="Unknown">
                        Unknown
                      </option>

                    </select>

                  </div>

                  {/* INJECTION */}

                  <div className="flex flex-col gap-1.5">

                    <label className="text-xs font-bold text-slate-800">
                      Previous Eye Injection?
                    </label>

                    <select
                      value={eyeInjection}
                      onChange={(e) =>
                        setEyeInjection(
                          e.target.value
                        )
                      }
                      className="w-full min-h-[46px] px-3.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d766e]"
                    >

                      <option value="">
                        Select
                      </option>

                      <option value="Yes">
                        Yes
                      </option>

                      <option value="No">
                        No
                      </option>

                      <option value="Unknown">
                        Unknown
                      </option>

                    </select>

                  </div>

                  {/* SURGERY */}

                  <div className="flex flex-col gap-1.5 md:col-span-2">

                    <label className="text-xs font-bold text-slate-800">
                      Previous Retinal / Eye Surgery?
                    </label>

                    <select
                      value={eyeSurgery}
                      onChange={(e) =>
                        setEyeSurgery(e.target.value)
                      }
                      className="w-full min-h-[46px] px-3.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d766e]"
                    >

                      <option value="">
                        Select
                      </option>

                      <option value="Yes">
                        Yes
                      </option>

                      <option value="No">
                        No
                      </option>

                      <option value="Unknown">
                        Unknown
                      </option>

                    </select>

                  </div>

                </div>

              </div>

              {/* =================================================
                  CURRENT VISION & SYMPTOMS
              ================================================== */}

              <div className="border-t border-slate-100 pt-5">

                <div className="flex items-center justify-between mb-3">

                  <h3 className="text-xs font-bold text-[#006398] uppercase tracking-wide">
                    Current Vision & Symptoms
                  </h3>

                  <span className="text-[10px] text-slate-400">
                    Select all that apply
                  </span>

                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">

                  {[
                    'No vision problem',
                    'Blurred vision',
                    'Difficulty reading',
                    'New floaters / spots',
                    'Flashes of light',
                    'Sudden change / loss of vision',
                    'Other',
                  ].map((problem) => (

                    <button
                      key={problem}
                      type="button"
                      onClick={() =>
                        toggleVisionProblem(problem)
                      }
                      className={`min-h-[44px] px-3 rounded-lg text-xs font-semibold text-left flex items-center gap-2 border transition-all ${
                        visionProblems.includes(problem)
                          ? 'bg-teal-50 border-[#0d766e] text-[#0d766e]'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >

                      <span
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          visionProblems.includes(problem)
                            ? 'bg-[#0d766e] border-[#0d766e] text-white'
                            : 'border-slate-300'
                        }`}
                      >

                        {visionProblems.includes(problem) && (

                          <span className="material-symbols-outlined text-xs">
                            check
                          </span>

                        )}

                      </span>

                      {problem}

                    </button>

                  ))}

                </div>

                {/* URGENT WARNING */}

                {visionProblems.includes(
                  'Sudden change / loss of vision'
                ) && (

                  <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2.5">

                    <span className="material-symbols-outlined text-red-600">
                      warning
                    </span>

                    <div>

                      <p className="text-xs font-bold text-red-800">
                        Urgent Clinical Assessment Required
                      </p>

                      <p className="text-[11px] text-red-700 mt-0.5">
                        Sudden major vision loss should be referred
                        for urgent clinical assessment and should
                        not be treated as routine screening.
                      </p>

                    </div>

                  </div>

                )}

              </div>

              {/* =================================================
                  RELEVANT MEDICAL HISTORY
              ================================================== */}

              <div className="border-t border-slate-100 pt-5">

                <h3 className="text-xs font-bold text-[#006398] uppercase tracking-wide mb-3">
                  Relevant Medical History
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* HYPERTENSION */}

                  <div className="flex flex-col gap-1.5">

                    <label className="text-xs font-bold text-slate-800">
                      Hypertension / High BP
                    </label>

                    <select
                      value={hypertension}
                      onChange={(e) =>
                        setHypertension(e.target.value)
                      }
                      className="w-full min-h-[46px] px-3.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d766e]"
                    >

                      <option value="">
                        Select
                      </option>

                      <option value="Yes">
                        Yes
                      </option>

                      <option value="No">
                        No
                      </option>

                      <option value="Unknown">
                        Unknown
                      </option>

                    </select>

                  </div>

                  {/* KIDNEY */}

                  <div className="flex flex-col gap-1.5">

                    <label className="text-xs font-bold text-slate-800">
                      Kidney Disease
                    </label>

                    <select
                      value={kidneyDisease}
                      onChange={(e) =>
                        setKidneyDisease(
                          e.target.value
                        )
                      }
                      className="w-full min-h-[46px] px-3.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d766e]"
                    >

                      <option value="">
                        Select
                      </option>

                      <option value="Yes">
                        Yes
                      </option>

                      <option value="No">
                        No
                      </option>

                      <option value="Unknown">
                        Unknown
                      </option>

                    </select>

                  </div>

                  {/* BP */}

                  <div className="flex flex-col gap-1.5">

                    <label className="text-xs font-bold text-slate-800">
                      Latest Blood Pressure
                    </label>

                    <div className="relative">

                      <input
                        type="text"
                        placeholder="e.g. 128 / 82"
                        value={bloodPressure}
                        onChange={(e) =>
                          setBloodPressure(
                            e.target.value
                          )
                        }
                        className="w-full min-h-[46px] px-3.5 pr-16 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d766e]"
                      />

                      <span className="absolute right-3.5 top-3.5 text-xs text-slate-500">
                        mmHg
                      </span>

                    </div>

                  </div>

                  {/* PREGNANCY */}

                  <div className="flex flex-col gap-1.5">

                    <label className="text-xs font-bold text-slate-800">
                      Pregnancy Status
                    </label>

                    <select
                      value={pregnancyStatus}
                      onChange={(e) =>
                        setPregnancyStatus(
                          e.target.value
                        )
                      }
                      className="w-full min-h-[46px] px-3.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d766e]"
                    >

                      <option value="">
                        Select
                      </option>

                      <option value="Not Applicable">
                        Not Applicable
                      </option>

                      <option value="No">
                        No
                      </option>

                      <option value="Yes">
                        Yes
                      </option>

                      <option value="Planning Pregnancy">
                        Planning Pregnancy
                      </option>

                    </select>

                  </div>

                </div>

              </div>

              {/* =================================================
                  SCREENING MEASUREMENTS
              ================================================== */}

              <div className="border-t border-slate-100 pt-5">

                <div className="flex items-center justify-between mb-3">

                  <div>

                    <h3 className="text-xs font-bold text-[#006398] uppercase tracking-wide">
                      Screening Measurements
                    </h3>

                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Record before retinal image capture
                    </p>

                  </div>

                  <span className="px-2 py-1 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold">
                    Both Eyes
                  </span>

                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* RIGHT EYE */}

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">

                    <div className="flex items-center gap-2 mb-3">

                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">

                        <span className="material-symbols-outlined text-base">
                          visibility
                        </span>

                      </div>

                      <div>

                        <p className="text-xs font-bold text-slate-900">
                          Right Eye
                        </p>

                        <p className="text-[10px] text-slate-500">
                          Visual Acuity
                        </p>

                      </div>

                    </div>

                    <input
                      type="text"
                      placeholder="e.g. 6/6"
                      value={rightEyeVA}
                      onChange={(e) =>
                        setRightEyeVA(e.target.value)
                      }
                      className="w-full min-h-[44px] px-3 rounded-lg bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d766e]"
                    />

                  </div>

                  {/* LEFT EYE */}

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">

                    <div className="flex items-center gap-2 mb-3">

                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">

                        <span className="material-symbols-outlined text-base">
                          visibility
                        </span>

                      </div>

                      <div>

                        <p className="text-xs font-bold text-slate-900">
                          Left Eye
                        </p>

                        <p className="text-[10px] text-slate-500">
                          Visual Acuity
                        </p>

                      </div>

                    </div>

                    <input
                      type="text"
                      placeholder="e.g. 6/6"
                      value={leftEyeVA}
                      onChange={(e) =>
                        setLeftEyeVA(e.target.value)
                      }
                      className="w-full min-h-[44px] px-3 rounded-lg bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d766e]"
                    />

                  </div>

                </div>

                {/* FUNDUS STATUS */}

                <div className="mt-4 p-3 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-between">

                  <div className="flex items-center gap-2.5">

                    <span className="material-symbols-outlined text-[#0d766e]">
                      photo_camera
                    </span>

                    <div>

                      <p className="text-xs font-bold text-slate-900">
                        Fundus Photography
                      </p>

                      <p className="text-[10px] text-slate-600">
                        Right and left retinal images will be captured
                        in Step 2.
                      </p>

                    </div>

                  </div>

                  <span className="px-2 py-1 rounded-full bg-white border border-teal-200 text-[#0d766e] text-[10px] font-bold">
                    Step 2
                  </span>

                </div>

              </div>

            </div>

            {/* =================================================
                3. INFORMED CONSENT
            ================================================== */}

            <div className="bg-white rounded-xl p-4 sm:p-5 shadow-xs border border-slate-200">

              <label className="flex items-start gap-3 cursor-pointer">

                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(e) =>
                    setConsentChecked(e.target.checked)
                  }
                  className="w-5 h-5 rounded accent-[#0d766e] text-[#0d766e] cursor-pointer mt-0.5"
                />

                <div className="flex flex-col">

                  <span className="text-sm text-slate-900 font-bold">
                    Informed Consent Verified
                    {' '}
                    (संमती पत्र प्राप्त झाले)
                  </span>

                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Informed verbal and signed/thumb consent obtained
                    in Marathi/Hindi for non-mydriatic digital fundus
                    photography, AI triage inference, and potential
                    tele-ophthalmology referral under the National
                    Programme for Control of Blindness & Visual
                    Impairment (NPCBVI) and Ayushman Bharat Digital
                    Mission (ABDM).
                  </p>

                  <div className="flex items-center gap-3 mt-2 text-[#0d766e] text-xs font-semibold">

                    <span className="flex items-center gap-1">

                      <span className="material-symbols-outlined text-sm">
                        thumb_up
                      </span>

                      Thumb Impression Stamped

                    </span>

                    <span>
                      •
                    </span>

                    <span className="flex items-center gap-1">

                      <span className="material-symbols-outlined text-sm">
                        translate
                      </span>

                      Marathi Form Explaining Edge AI

                    </span>

                  </div>

                </div>

              </label>

            </div>

          </div>

        </div>

      </section>

      {/* =====================================================
    STICKY BOTTOM ACTION BAR
====================================================== */}

<footer className="fixed bottom-0 left-0 lg:left-72 right-0 z-30 bg-white/95 backdrop-blur-md px-4 lg:px-6 py-3 border-t border-slate-200 shadow-lg">

  <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">

    {/* LEFT SIDE */}
    <div className="flex items-center">

      <button
        type="button"
        onClick={() => onNavigate('dashboard')}
        className="min-h-[50px] px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-sm flex items-center justify-center transition-colors cursor-pointer"
      >
        Cancel / Return to Queue
      </button>

    </div>

    {/* RIGHT SIDE */}
    <div className="flex items-center">

      <button
        type="button"
        onClick={handleSaveAndProceed}
        disabled={isSaving || !consentChecked}
        className="min-h-[50px] px-7 py-2.5 rounded-xl bg-[#0d766e] hover:bg-[#005c55] text-white font-bold text-sm flex items-center justify-center gap-3 shadow-md active:translate-y-px transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed drishti-btn"
      >

        {isSaving ? (
          <>
            <span>
              Saving...
            </span>

            <span className="material-symbols-outlined text-lg animate-spin">
              refresh
            </span>
          </>
        ) : (
          <>
            <span>
              Save & Proceed to Retinal Capture (Step 2)
            </span>

            <span className="material-symbols-outlined text-xl">
              arrow_forward
            </span>
          </>
        )}

      </button>

      </div>

    </div>

  </footer>
</div>
  );
};