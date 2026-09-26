import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';

import {
  ScreenId,
  Language,
  Patient,
  CampStats,
  CurrentUser,
  UserRole,
  Facility,
} from './types';

import {
  INITIAL_CAMP_STATS,
  ON_CALL_DOCTOR,
  DEMO_USERS,
} from './data/mockData';

import { usePrefersReducedMotion } from './hooks/useAnimations';

import { Navigation } from './components/Navigation';
import { Header } from './components/Header';

import { StartScreen } from './components/screens/StartScreen';
import { FacilityLoginScreen } from './components/screens/FacilityLoginScreen';
import { StaffLoginScreen } from './components/screens/StaffLoginScreen';

import { DashboardScreen } from './components/screens/DashboardScreen';
import { PatientRegistrationScreen } from './components/screens/PatientRegistrationScreen';
import { RetinalCaptureScreen } from './components/screens/RetinalCaptureScreen';
import { AiDiagnosisScreen } from './components/screens/AiDiagnosisScreen';
import { ScreeningQueueScreen } from './components/screens/ScreeningQueueScreen';
import { ReferralsTeleConsultScreen } from './components/screens/ReferralsTeleConsultScreen';
import { SyncOfflineDataScreen } from './components/screens/SyncOfflineDataScreen';
import { SettingsCalibrationScreen } from './components/screens/SettingsCalibrationScreen';

import { TeleconsultModal } from './components/modals/TeleconsultModal';
import { FundusModal } from './components/modals/FundusModal';
import { PrintSlipModal } from './components/modals/PrintSlipModal';

import {
  ToastContainer,
  ToastMessage,
} from './components/common/Toast';


export default function App() {

  // ═══════════════════════════════════════════════════════════════════════
  // ENTRY / AUTHENTICATION FLOW
  // ═══════════════════════════════════════════════════════════════════════

  const [currentScreen, setCurrentScreen] =
    useState<ScreenId>('start');

  const [selectedFacility, setSelectedFacility] =
    useState<Facility | null>(null);

  const [language, setLanguage] =
    useState<Language>('en');

  const [highGlareMode, setHighGlareMode] =
    useState<boolean>(false);

  const [isMobileNavOpen, setIsMobileNavOpen] =
    useState<boolean>(false);

  const prefersReduced =
    usePrefersReducedMotion();


  // ═══════════════════════════════════════════════════════════════════════
  // CURRENT USER
  // ═══════════════════════════════════════════════════════════════════════

  const [currentUser, setCurrentUser] =
    useState<CurrentUser>({
      ...DEMO_USERS[0],
    });


  // ═══════════════════════════════════════════════════════════════════════
  // PAGE TRANSITION
  // ═══════════════════════════════════════════════════════════════════════

  const [pageVisible, setPageVisible] =
    useState(true);

  const pageRef =
    useRef<HTMLDivElement>(null);


  const handleScreenChange = useCallback(
    (screen: ScreenId) => {

      if (screen === currentScreen) {
        return;
      }

      /*
       * Authentication screens should not show
       * the main application navigation.
       */

      if (prefersReduced) {

        setCurrentScreen(screen);

        return;
      }

      setPageVisible(false);

      setTimeout(() => {

        setCurrentScreen(screen);

        requestAnimationFrame(() => {
          setPageVisible(true);
        });

      }, 120);

    },
    [
      currentScreen,
      prefersReduced,
    ]
  );


  // ═══════════════════════════════════════════════════════════════════════
  // CLINICAL DATA — single source of truth (React state + localStorage)
  // ═══════════════════════════════════════════════════════════════════════

  const STORAGE_KEY = 'drishti_patients_v1';

  const loadPatientsFromStorage = (): Patient[] => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const persistPatients = (list: Patient[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Failed to persist patients to localStorage', e);
    }
  };

  const computeStats = (list: Patient[]): CampStats => {
    const screened = list.filter(
      (p) => p.aiDiagnosis && p.aiDiagnosis !== '—' && p.aiDiagnosis !== ''
    ).length;
    const highRisk = list.filter(
      (p) => p.riskLevel === 'High Risk' || p.riskLevel === 'Critical'
    ).length;
    const normal = list.filter((p) => p.riskLevel === 'Normal').length;
    const mild = list.filter((p) => p.riskLevel === 'Mild').length;
    const pendingAi = list.filter(
      (p) =>
        (p.odScanUrl || p.osScanUrl) &&
        (!p.aiDiagnosis || p.aiDiagnosis === '—' || p.aiDiagnosis === '')
    ).length;
    const pendingReview = list.filter(
      (p) =>
        p.ophthalmologistReviewStatus === 'pending' ||
        p.triageStatus?.toLowerCase().includes('awaiting')
    ).length;
    const referralPending = list.filter(
      (p) =>
        p.referralStatus === 'pending_review' ||
        p.referralStatus === 'referred'
    ).length;
    const referralCompleted = list.filter(
      (p) => p.referralStatus === 'treatment_completed' || p.referralCompleted
    ).length;
    const pendingSync = list.filter((p) => p.syncStatus === 'queued').length;

    return {
      screenedToday: screened,
      targetTotal: 25,
      highRiskCount: highRisk,
      normalCount: normal,
      mildCount: mild,
      pendingSyncCount: pendingSync,
      pendingAiCount: pendingAi,
      pendingOphthalmologistReview: pendingReview,
      referralPendingCount: referralPending,
      referralCompletedCount: referralCompleted,
      imageQualityFailureRate: 0,
      storageFreeGb: 4.2,
      batteryPct: 84,
      targetSlaTime: '04:30 PM',
    };
  };

  const [patients, setPatients] = useState<Patient[]>(() => loadPatientsFromStorage());

  const [stats, setStats] = useState<CampStats>(() =>
    computeStats(loadPatientsFromStorage())
  );

  const [activePatient, setActivePatient] = useState<Patient | null>(() => {
    const list = loadPatientsFromStorage();
    return list.length > 0 ? list[0] : null;
  });

  // Keep stats in sync whenever patients change
  useEffect(() => {
    setStats(computeStats(patients));
    persistPatients(patients);
  }, [patients]);

  // ═══════════════════════════════════════════════════════════════════════
  // MODALS
  // ═══════════════════════════════════════════════════════════════════════

  const [isTeleconsultOpen, setIsTeleconsultOpen] =
    useState(false);

  const [isFundusModalOpen, setIsFundusModalOpen] =
    useState(false);

  const [isPrintSlipOpen, setIsPrintSlipOpen] =
    useState(false);

  const [modalPatient, setModalPatient] =
    useState<Patient | null>(null);

  const [modalEye, setModalEye] =
    useState<'OD' | 'OS'>('OD');


  // ═══════════════════════════════════════════════════════════════════════
  // TOASTS
  // ═══════════════════════════════════════════════════════════════════════

  const [toasts, setToasts] =
    useState<ToastMessage[]>([]);


  const showToast = (
    message: string,
    icon = 'info'
  ) => {

    const id =
      Date.now().toString() +
      Math.random()
        .toString()
        .slice(2, 6);

    setToasts((previous) => [
      ...previous,
      {
        id,
        message,
        icon,
      },
    ]);

    setTimeout(() => {

      setToasts((previous) =>
        previous.filter(
          (toast) =>
            toast.id !== id
        )
      );

    }, 3800);

  };


  const handleDismissToast = (
    id: string
  ) => {

    setToasts((previous) =>
      previous.filter(
        (toast) =>
          toast.id !== id
      )
    );

  };


  // ═══════════════════════════════════════════════════════════════════════
  // FACILITY SELECTION
  // ═══════════════════════════════════════════════════════════════════════

  const handleFacilitySelect = (
    facility: Facility
  ) => {

    setSelectedFacility(facility);

    showToast(
      `${facility.name} selected.`,
      'location_on'
    );

  };


  // ═══════════════════════════════════════════════════════════════════════
  // STAFF LOGIN
  // ═══════════════════════════════════════════════════════════════════════

  const handleStaffLogin = (
    user: CurrentUser
  ) => {

    setCurrentUser(user);

    showToast(
      `Signed in as ${roleLabel(user.role)}.`,
      'verified_user'
    );

  };


  // ═══════════════════════════════════════════════════════════════════════
  // HIGH GLARE MODE
  // ═══════════════════════════════════════════════════════════════════════

  const handleToggleHighGlare = () => {

    setHighGlareMode((previous) => {

      const next =
        !previous;

      if (next) {

        document.body.classList.add(
          'high-glare-mode'
        );

        showToast(
          'Outdoor High-Glare Mode activated.',
          'light_mode'
        );

      } else {

        document.body.classList.remove(
          'high-glare-mode'
        );

        showToast(
          'Standard Clinical Display mode restored.',
          'wb_sunny'
        );

      }

      return next;

    });

  };


  // ═══════════════════════════════════════════════════════════════════════
  // FUNDUS MODAL
  // ═══════════════════════════════════════════════════════════════════════

  const handleOpenFundusModal = (
    patient: Patient,
    eye: 'OD' | 'OS' = 'OD'
  ) => {

    setModalPatient(patient);

    setModalEye(eye);

    setIsFundusModalOpen(true);

  };


  // ═══════════════════════════════════════════════════════════════════════
  // TELECONSULT
  // ═══════════════════════════════════════════════════════════════════════

  const handleOpenTeleconsult = (
    patient: Patient
  ) => {

    setModalPatient(patient);

    setIsTeleconsultOpen(true);

  };


  // ═══════════════════════════════════════════════════════════════════════
  // PRINT
  // ═══════════════════════════════════════════════════════════════════════

  const handleOpenPrintSlip = (
    patient: Patient
  ) => {

    setModalPatient(patient);

    setIsPrintSlipOpen(true);

  };


  // ═══════════════════════════════════════════════════════════════════════
  // UPDATE PATIENT (central store — shared by staff & ophthalmologist)
  // ═══════════════════════════════════════════════════════════════════════

  const handleUpdateActivePatient =
    async (
      updated: Partial<Patient> & { id?: string }
    ) => {
      const targetId = updated.id || activePatient?.id;
      if (!targetId) return;

      setPatients((previous) =>
        previous.map((patient) =>
          patient.id === targetId
            ? { ...patient, ...updated, id: patient.id }
            : patient
        )
      );

      setActivePatient((prev) => {
        if (prev?.id === targetId) {
          return { ...prev, ...updated, id: prev.id };
        }
        return prev;
      });
      // localStorage persistence is handled by the patients useEffect
    };


  // ═══════════════════════════════════════════════════════════════════════
  // NEW PATIENT (blank record for registration)
  // ═══════════════════════════════════════════════════════════════════════

  const handleCreateNewPatient = () => {
    const nextNum = patients.length + 1;
    const blank: Patient = {
      id: `PT-${String(nextNum).padStart(4, '0')}`,
      abhaId: '',
      name: '',
      age: 0,
      gender: 'Male',
      mobile: '',
      village: '',
      diabetesStatus: '',
      rbs: '',
      rbsStatus: 'Normal',
      bp: '',
      visionComplaint: '',
      previousHistory: '',
      screenTime: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      odScanUrl: '',
      osScanUrl: '',
      odStatus: 'Pending capture',
      osStatus: 'Pending capture',
      aiDiagnosis: '—',
      aiConfidence: '—',
      riskLevel: 'Incomplete',
      triageStatus: 'Registered — Awaiting Image Capture',
      syncStatus: 'queued',
      facilityId: selectedFacility?.id,
      facilityName: selectedFacility?.name,
    };
    setActivePatient(blank);
    setPatients((prev) => [...prev, blank]);
    handleScreenChange('patient-registration');
    showToast('New patient record created.', 'person_add');
  };

  // ═══════════════════════════════════════════════════════════════════════
  // RETINAL CAPTURE (image association only — no premature diagnosis)
  // ═══════════════════════════════════════════════════════════════════════

  const handleMarkOsCaptured =
    async () => {
      if (!activePatient) return;

      const newPatient: Patient = {
        ...activePatient,
        osScanUrl:
          activePatient.osScanUrl ||
          'https://lh3.googleusercontent.com/aida-public/AB6AXuCQVJjJZdcvvYrWTTnBm_guOWvNBFLMS5ZeK2K8xPhixIeJ5ChRIwA_FHv7J6nD56dmRaF4L7hGZJgtNFxVHHhI5a5YOEfK2AOs4tMQ64Womqp4qB3dCGHpBZh1TtbpVQfrhc4aT4uq11J-kqRvm5KO4dSzR1I-bfwswsbVcXmByZgHK0YAuXMVyg87LPdWccsZyuJfXaQkJ8ufZRd1fb1mnzYJu2wMtH0HYK8gOj58BaUrT9hMnjSmiw',
        osStatus: 'Image captured — awaiting analysis',
        triageStatus: 'Image Captured — Ready for AI Analysis',
        riskLevel: 'Incomplete',
      };

      setActivePatient(newPatient);

      setPatients((previous) =>
        previous.map((patient) =>
          patient.id === newPatient.id
            ? newPatient
            : patient
        )
      );
    };


  // ═══════════════════════════════════════════════════════════════════════
  // TELECONSULT COMPLETE
  // ═══════════════════════════════════════════════════════════════════════

  const handleCompleteTeleconsult =
    () => {

      setIsTeleconsultOpen(false);

      showToast(
        'Ophthalmologist validation recorded. Structured referral slip ready for printing & dispatch.',
        'verified'
      );

      setIsPrintSlipOpen(true);

    };


  // ═══════════════════════════════════════════════════════════════════════
  // LOGOUT / ROLE CHANGE — must go through login screen
  // ROLE CHANGE ≠ AUTOMATIC LOGIN. User must re-authenticate.
  // ═══════════════════════════════════════════════════════════════════════

  const handleLogout = () => {
    setActivePatient(null);
    showToast('Signed out. Please log in to continue.', 'logout');
    // Preserve facility selection so staff-login can reuse it
    handleScreenChange(
      selectedFacility ? 'staff-login' : 'start'
    );
  };

  const handleRoleChange = (_role: UserRole) => {
    // Do NOT switch role in-place. Logout and return to login screen.
    handleLogout();
  };


  // ═══════════════════════════════════════════════════════════════════════
  // STATISTICS
  // ═══════════════════════════════════════════════════════════════════════

  const pendingSyncCount =
    patients.filter(
      (patient) =>
        patient.syncStatus === 'queued'
    ).length;

  const highRiskCount =
    patients.filter(
      (patient) =>
        patient.riskLevel === 'High Risk' ||
        patient.riskLevel === 'Critical'
    ).length;


  // ═══════════════════════════════════════════════════════════════════════
  // AUTHENTICATION SCREENS
  // ═══════════════════════════════════════════════════════════════════════

  const isEntryScreen =
    currentScreen === 'start' ||
    currentScreen === 'facility-login' ||
    currentScreen === 'staff-login';


  if (isEntryScreen) {

    return (
      <div
        className="min-h-screen bg-surface font-sans text-on-surface"
        style={{
          opacity: pageVisible ? 1 : 0,
          transition: prefersReduced
            ? 'none'
            : 'opacity 180ms ease',
        }}
      >

        {currentScreen === 'start' && (

          <StartScreen
            onNavigate={handleScreenChange}
          />

        )}

        {currentScreen === 'facility-login' && (

          <FacilityLoginScreen
            onNavigate={handleScreenChange}
            onFacilitySelect={
              handleFacilitySelect
            }
          />

        )}

        {currentScreen === 'staff-login' && (

          <StaffLoginScreen
            onNavigate={handleScreenChange}
            facility={selectedFacility}
            onLogin={handleStaffLogin}
          />

        )}

        <ToastContainer
          toasts={toasts}
          onDismiss={handleDismissToast}
        />

      </div>
    );

  }


  // ═══════════════════════════════════════════════════════════════════════
  // MAIN DRISHTI APPLICATION
  // ═══════════════════════════════════════════════════════════════════════

  return (

    <div className="min-h-screen bg-surface font-sans text-on-surface flex flex-col">

      {/* SIDEBAR */}

      <Navigation
        currentScreen={currentScreen}
        onNavigate={(screen) => {

          handleScreenChange(screen);

          window.scrollTo({
            top: 0,
            behavior:
              prefersReduced
                ? 'auto'
                : 'smooth',
          });

        }}
        pendingSyncCount={
          pendingSyncCount
        }
        highRiskCount={
          highRiskCount
        }
        totalQueueCount={
          patients.length
        }
        isOpenMobile={
          isMobileNavOpen
        }
        onCloseMobile={() =>
          setIsMobileNavOpen(false)
        }
        currentUser={
          currentUser
        }
      />

      {/* MAIN AREA */}

      <div className="lg:pl-72 flex flex-col flex-1 min-h-screen">

        <Header
          language={language}
          onLanguageChange={
            setLanguage
          }
          onOpenMobileNav={() =>
            setIsMobileNavOpen(true)
          }
          queuedCount={
            pendingSyncCount
          }
          currentUser={
            currentUser
          }
          onRoleChange={
            handleRoleChange
          }
        />

        <main className="pt-16 flex-1 flex flex-col">

          <div
            ref={pageRef}
            className="flex-1 flex flex-col"
            style={{
              opacity:
                pageVisible
                  ? 1
                  : 0,

              transform:
                pageVisible
                  ? 'translateY(0)'
                  : 'translateY(6px)',

              transition:
                prefersReduced
                  ? 'none'
                  : 'opacity 180ms cubic-bezier(0.16, 1, 0.3, 1), transform 180ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >

            {/* DASHBOARD */}

            {currentScreen === 'dashboard' && (

              <DashboardScreen
                stats={stats}
                patients={patients}
                currentUser={currentUser}
                onNavigate={
                  handleScreenChange
                }
                onOpenFundusModal={
                  handleOpenFundusModal
                }
                onOpenTeleconsult={
                  handleOpenTeleconsult
                }
                onOpenPrintSlip={
                  handleOpenPrintSlip
                }
                showToast={
                  showToast
                }
                onCreateNewPatient={
                  handleCreateNewPatient
                }
                onSelectPatient={(p) => {
                  setActivePatient(p);
                  handleScreenChange('ai-diagnosis');
                }}
                onUpdatePatient={handleUpdateActivePatient}
              />

            )}


            {/* PATIENT REGISTRATION */}

            {currentScreen ===
              'patient-registration' && activePatient && (

              <PatientRegistrationScreen
                activePatient={
                  activePatient
                }
                onNavigate={
                  handleScreenChange
                }
                showToast={
                  showToast
                }
                onUpdatePatient={
                  handleUpdateActivePatient
                }
              />

            )}

            {currentScreen ===
              'patient-registration' && !activePatient && (
              <div className="p-8 text-center text-slate-600">
                <p className="text-lg font-semibold mb-2">No patient selected</p>
                <p className="text-sm mb-4">Create a new patient record from the dashboard to begin registration.</p>
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium"
                  onClick={handleCreateNewPatient}
                >
                  Register New Patient
                </button>
              </div>
            )}


            {/* RETINAL CAPTURE */}

            {currentScreen ===
              'retinal-capture' && activePatient && (

              <RetinalCaptureScreen
                patient={
                  activePatient
                }
                onNavigate={
                  handleScreenChange
                }
                onOpenFundusModal={
                  handleOpenFundusModal
                }
                showToast={
                  showToast
                }
                onMarkOsCaptured={
                  handleMarkOsCaptured
                }
                onUpdatePatient={
                  handleUpdateActivePatient
                }
              />

            )}

            {currentScreen ===
              'retinal-capture' && !activePatient && (
              <div className="p-8 text-center text-slate-600">
                <p className="text-lg font-semibold mb-2">No patient selected</p>
                <p className="text-sm">Select or register a patient first, then capture retinal images.</p>
              </div>
            )}


            {/* AI DIAGNOSIS */}

            {currentScreen ===
              'ai-diagnosis' && activePatient && (

              <AiDiagnosisScreen
                patient={
                  activePatient
                }
                doctor={
                  ON_CALL_DOCTOR
                }
                onNavigate={
                  handleScreenChange
                }
                onOpenFundusModal={
                  handleOpenFundusModal
                }
                onOpenTeleconsult={
                  handleOpenTeleconsult
                }
                onOpenPrintSlip={
                  handleOpenPrintSlip
                }
                showToast={
                  showToast
                }
                onUpdatePatient={
                  handleUpdateActivePatient
                }
              />

            )}


            {/* SCREENING QUEUE */}

            {currentScreen ===
              'screening-queue' && (

              <ScreeningQueueScreen
                patients={
                  patients
                }
                onNavigate={
                  handleScreenChange
                }
                onOpenFundusModal={
                  handleOpenFundusModal
                }
                onOpenTeleconsult={
                  handleOpenTeleconsult
                }
                onOpenPrintSlip={
                  handleOpenPrintSlip
                }
                showToast={
                  showToast
                }
                currentUser={
                  currentUser
                }
                onRefreshPatients={
                  () => {
                    const list = loadPatientsFromStorage();
                    setPatients(list);
                    showToast('Patient list refreshed.', 'refresh');
                  }
                }
              />

            )}


            {/* REFERRALS */}

            {currentScreen ===
              'referrals-tele-consult' && (

              <ReferralsTeleConsultScreen
                urgentPatient={
                  activePatient
                }
                otherPatients={
                  patients.filter(
                    (patient) =>
                      activePatient ? patient.id !== activePatient.id : true
                  )
                }
                doctor={
                  ON_CALL_DOCTOR
                }
                onNavigate={
                  handleScreenChange
                }
                onOpenFundusModal={
                  handleOpenFundusModal
                }
                onOpenTeleconsult={
                  handleOpenTeleconsult
                }
                onOpenPrintSlip={
                  handleOpenPrintSlip
                }
                showToast={
                  showToast
                }
              />

            )}


            {/* SYNC */}

            {currentScreen ===
              'sync-offline-data' && (

              <SyncOfflineDataScreen
                patients={
                  patients
                }
                onNavigate={
                  handleScreenChange
                }
                showToast={
                  showToast
                }
              />

            )}


            {/* SETTINGS */}

            {currentScreen ===
              'settings-calibration' && (

              <SettingsCalibrationScreen
                language={
                  language
                }
                onLanguageChange={
                  setLanguage
                }
                highGlareMode={
                  highGlareMode
                }
                onToggleHighGlare={
                  handleToggleHighGlare
                }
                onNavigate={
                  handleScreenChange
                }
                showToast={
                  showToast
                }
              />

            )}

          </div>

        </main>

      </div>


      {/* ═══════════════════════════════════════════════════════════════
          MODALS
      ═══════════════════════════════════════════════════════════════ */}

      <TeleconsultModal
        isOpen={
          isTeleconsultOpen
        }
        onClose={() =>
          setIsTeleconsultOpen(false)
        }
        patient={
          modalPatient ||
          activePatient
        }
        doctor={
          ON_CALL_DOCTOR
        }
        onCompleteConsult={
          handleCompleteTeleconsult
        }
      />


      <FundusModal
        isOpen={
          isFundusModalOpen
        }
        onClose={() =>
          setIsFundusModalOpen(false)
        }
        patient={
          modalPatient ||
          activePatient
        }
        initialEye={
          modalEye
        }
        onPrintSlip={() => {

          setIsFundusModalOpen(
            false
          );

          setIsPrintSlipOpen(
            true
          );

        }}
      />


      <PrintSlipModal
        isOpen={
          isPrintSlipOpen
        }
        onClose={() =>
          setIsPrintSlipOpen(false)
        }
        patient={
          modalPatient ||
          activePatient
        }
      />


      <ToastContainer
        toasts={toasts}
        onDismiss={
          handleDismissToast
        }
      />

    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// ROLE LABEL
// ═══════════════════════════════════════════════════════════════════════════

function roleLabel(
  role: UserRole
): string {

  switch (role) {

    case 'screening_operator':
      return 'Screening Staff';

    case 'ophthalmologist':
      return 'Ophthalmologist';

    case 'district_manager':
      return 'District Program Manager';

    case 'state_admin':
      return 'State Program Administrator';

    case 'system_admin':
      return 'System / IT Administrator';

    default:
      return role;
  }
}