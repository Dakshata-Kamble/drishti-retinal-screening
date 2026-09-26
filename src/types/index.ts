// ═══════════════════════════════════════════════════════════════════════════
// DRISHTI
// Explainable AI-Assisted Diabetic Retinopathy Screening & Referral
// Government-scale public-health screening infrastructure types
// ═══════════════════════════════════════════════════════════════════════════

export type ScreenId =
  // NEW ENTRY FLOW
  | 'start'
  | 'facility-login'
  | 'staff-login'

  // EXISTING DRISHTI SCREENS
  | 'dashboard'
  | 'patient-registration'
  | 'retinal-capture'
  | 'ai-diagnosis'
  | 'screening-queue'
  | 'referrals-tele-consult'
  | 'sync-offline-data'
  | 'settings-calibration'
  | 'ophthalmologist-review'
  | 'program-analytics'
  | 'facility-management';

export type Language = 'en' | 'hi' | 'mr';

/**
 * User roles aligned to the public-health hierarchy
 */
export type UserRole =
  | 'screening_operator'
  | 'ophthalmologist'
  | 'district_manager'
  | 'state_admin'
  | 'system_admin';

/**
 * Healthcare facility hierarchy levels
 */
export type FacilityLevel =
  | 'national'
  | 'state'
  | 'district'
  | 'block'
  | 'phc'
  | 'hwc'
  | 'chc'
  | 'vision_centre'
  | 'mobile_camp'
  | 'district_hospital'
  | 'tertiary';

export interface Facility {
  id: string;
  name: string;
  level: FacilityLevel;
  parentId?: string;
  district: string;
  state: string;
  code?: string;
}

export interface CurrentUser {
  id: string;
  name: string;
  role: UserRole;
  facilityId: string;
  facilityName: string;
  facilityLevel: FacilityLevel;
  district: string;
  state: string;
  qualifications?: string;
  employeeId?: string;
  avatarUrl?: string;
}

/**
 * ICDR / internationally recognized DR severity scale
 */
export type IcdrGrade = 0 | 1 | 2 | 3 | 4;

export type ImageQualityStatus =
  | 'gradable'
  | 'borderline'
  | 'inadequate'
  | 'ungradable';

export type ReferralUrgency =
  | 'routine'
  | 'urgent'
  | 'emergency';

export type ReferralStatus =
  | 'not_required'
  | 'pending_review'
  | 'referred'
  | 'appointment_scheduled'
  | 'examined'
  | 'treatment_started'
  | 'treatment_completed'
  | 'lost_to_followup'
  | 'declined';

export type ScreeningOutcome =
  | 'no_dr'
  | 'mild_npdr'
  | 'moderate_npdr'
  | 'severe_npdr'
  | 'pdr'
  | 'csme'
  | 'ungradable'
  | 'incomplete'
  | 'pending_ai'
  | 'pending_ophthalmologist';

/**
 * Longitudinal patient record
 */
export interface Patient {
  id: string;
  abhaId: string;
  name: string;
  nameLocal?: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  mobile: string;
  village: string;
  rationId?: string;
  avatarUrl?: string;

  // Diabetes & clinical context
  diabetesStatus: string;
  diabetesType?:
    | 'Type 1'
    | 'Type 2'
    | 'Gestational'
    | 'Other'
    | 'Unknown';

  diabetesDuration?: string;

  rbs: string;

  rbsStatus:
    | 'Normal'
    | 'Elevated'
    | 'Critical';

  bp: string;

  visionComplaint: string;

  previousHistory: string;

  // Visual acuity
  vaRight?: string;
  vaLeft?: string;

  // Imaging & AI
  screenTime: string;

  odScanUrl: string;
  osScanUrl: string;

  gradCamUrl?: string;

  odImageQuality?: ImageQualityStatus;
  osImageQuality?: ImageQualityStatus;

  odStatus: string;
  osStatus: string;

  aiDiagnosis: string;
  aiConfidence: string;

  riskLevel:
    | 'Normal'
    | 'Mild'
    | 'High Risk'
    | 'Critical'
    | 'Incomplete';

  triageStatus: string;

  syncStatus:
    | 'synced'
    | 'queued';

  // Explainable AI evidence
  csmeDetected?: boolean;
  microaneurysmsCount?: number;
  hardExudatesNote?: string;
  neovascularization?: boolean;

  icdrGradeOd?: IcdrGrade;
  icdrGradeOs?: IcdrGrade;

  // Ophthalmologist validation
  ophthalmologistReviewStatus?:
    | 'pending'
    | 'accepted'
    | 'modified'
    | 'rejected';

  ophthalmologistNotes?: string;

  finalGradeOd?: IcdrGrade;
  finalGradeOs?: IcdrGrade;

  finalDiagnosis?: string;

  // Referral
  referralStatus?: ReferralStatus;
  referralUrgency?: ReferralUrgency;
  referralFacility?: string;
  referralDate?: string;
  referralCompleted?: boolean;
  specialistExamDate?: string;
  treatmentSummary?: string;

  // Longitudinal
  previousScreeningDate?: string;
  previousDrClassification?: string;
  nextScreeningDue?: string;

  facilityId?: string;
  facilityName?: string;
}

export interface CampStats {
  screenedToday: number;
  targetTotal: number;
  highRiskCount: number;
  normalCount: number;
  mildCount: number;
  pendingSyncCount: number;
  pendingAiCount: number;
  pendingOphthalmologistReview?: number;
  referralPendingCount?: number;
  referralCompletedCount?: number;
  imageQualityFailureRate?: number;
  storageFreeGb: number;
  batteryPct: number;
  targetSlaTime: string;
}

/**
 * District / State program analytics
 */
export interface ProgramAnalytics {
  totalScreened: number;
  targetCoverage: number;
  coveragePct: number;
  referableDrDetected: number;
  referralCompletionRate: number;
  ungradableRate: number;
  averageAiConfidence: number;
  facilitiesActive: number;
  facilitiesWithEquipmentIssues: number;
  pendingReviews: number;
  workforceCapacityPct: number;
}

export interface TeleconsultDoctor {
  name: string;
  qualifications: string;
  role: string;
  hospital: string;
  avatarUrl: string;
  status:
    | 'Online'
    | 'In Consult'
    | 'Offline';
}

// ═══════════════════════════════════════════════════════════════════════════
// AI-ASSISTED SCREENING PIPELINE
// ═══════════════════════════════════════════════════════════════════════════

export interface DiagnosisResult {
  diagnosis: string;
  confidence: number;

  csmeStatus:
    | 'Present'
    | 'Absent';

  icdrGrade: number;

  microaneurysms: string;
  hemorrhages: string;
  exudates: string;

  visualAcuityRisk: string;

  uncertaintyFlag?: boolean;

  modelVersion?: string;

  qualityAssessment?: ImageQualityStatus;

  explainabilityNote?: string;
}

export type AnalysisErrorCode =
  | 'TIMEOUT'
  | 'NETWORK'
  | 'SERVER_ERROR'
  | 'INVALID_IMAGE'
  | 'RATE_LIMITED'
  | 'UNKNOWN';

export interface AnalysisError {
  code: AnalysisErrorCode;
  message: string;
  retryable: boolean;
}

export type AnalysisState =
  | 'idle'
  | 'analyzing'
  | 'complete'
  | 'error'
  | 'timeout';

export interface AnalysisPayload {
  od: DiagnosisResult | null;
  os: DiagnosisResult | null;
  analyzedAt: string;
}

export interface ImageQualityFeedback {
  status: ImageQualityStatus;
  issues: string[];
  guidance: string;
  enhancementApplied?: boolean;
}