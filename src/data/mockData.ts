import {
  Patient,
  CampStats,
  TeleconsultDoctor,
  CurrentUser,
  Facility,
  ProgramAnalytics,
} from '../types';
import logoImg from '../assets/logo.png';

export const LOGO_URL = logoImg;

// ── Healthcare Hierarchy (demo: Maharashtra → Nandurbar district) ─────────
export const FACILITIES: Facility[] = [
  {
    id: 'ST-MH',
    name: 'Maharashtra State NCD / Blindness Control Programme',
    level: 'state',
    district: '—',
    state: 'Maharashtra',
    code: 'MH-NCD',
  },
  {
    id: 'DST-NDB',
    name: 'Nandurbar District Eye Care Cell',
    level: 'district',
    parentId: 'ST-MH',
    district: 'Nandurbar',
    state: 'Maharashtra',
    code: 'MH-NDB',
  },
  {
    id: 'PHC-VAD',
    name: 'Vadbare Primary Health Centre',
    level: 'phc',
    parentId: 'DST-NDB',
    district: 'Nandurbar',
    state: 'Maharashtra',
    code: 'PHC-VAD-01',
  },
  {
    id: 'HWC-VAD-SC',
    name: 'Vadbare Health & Wellness Centre / Sub-Centre',
    level: 'hwc',
    parentId: 'PHC-VAD',
    district: 'Nandurbar',
    state: 'Maharashtra',
    code: 'HWC-VAD-SC',
  },
  {
    id: 'CAMP-03',
    name: 'Vadbare Anganwadi Mobile Screening Camp #03',
    level: 'mobile_camp',
    parentId: 'PHC-VAD',
    district: 'Nandurbar',
    state: 'Maharashtra',
    code: 'CAMP-VAD-03',
  },
  {
    id: 'DH-NDB',
    name: 'District Hospital Nandurbar — Tele-Ophthalmology Hub',
    level: 'district_hospital',
    parentId: 'DST-NDB',
    district: 'Nandurbar',
    state: 'Maharashtra',
    code: 'DH-NDB-TO',
  },
];

// ── Demo users for role-based workflows ───────────────────────────────────
export const DEMO_USERS: CurrentUser[] = [
  {
    id: 'USR-OP-01',
    name: 'Sunita Devi',
    role: 'screening_operator',
    facilityId: 'CAMP-03',
    facilityName: 'Vadbare Anganwadi Mobile Screening Camp #03',
    facilityLevel: 'mobile_camp',
    district: 'Nandurbar',
    state: 'Maharashtra',
    employeeId: 'ASHA #4102',
    qualifications: 'Trained Ophthalmic Assistant / NCD Screening Worker',
    avatarUrl:
      'https://lh3.googleusercontent.com/aida/AEtjO1WwM6qxZwAzWVOg43QlKbasfaN4e-jQm5uPnCOJvq5Oi6zJCdJdK2v7-VL_Lj0-OS9sLby7cIxTFV4IEV9HbbUsEZ9vw-coWjt80oamI-WbyU8OtNjwlNhEkKzAsjqgb5sY1brsZ0vvFDM3J2hSaVvK59fs1ZdkBhUgnm5m1WKTmGHcPfZXQrKs1eZxqnQOx5oqnngNhTquisFIMYwhPY-Te3D3CRHRC3u9j2Sr87j5pRhIDUNG1IopBKA',
  },
  {
    id: 'USR-OPH-01',
    name: 'Dr. Arvind Kulkarni',
    role: 'ophthalmologist',
    facilityId: 'DH-NDB',
    facilityName: 'District Hospital Nandurbar — Tele-Ophthalmology Hub',
    facilityLevel: 'district_hospital',
    district: 'Nandurbar',
    state: 'Maharashtra',
    qualifications: 'MS (Ophth), FVRS — Vitreoretinal Specialist',
    employeeId: 'OPH-NDB-07',
    avatarUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuA71TP0T1JS7r4B_FVZdETH9B4R-cBNrocr6TVblyF-oh0KghjjPpMtZghf2viqsMvHJbYn4lPChT2FhUsUe4hFnW6IjNkz0B9Xu2sKETy0Y4eD-YasUJdA6wzDDGlsTWRk6Gl-hlmswPMuAXRWw4Rbq40JRuRFUofBqWzIaYwBCS-BD7NCIYG_xOvj5xzzkjRvSpESegxyaHbm_goFtEwN3BPC2PGiITMhdvg4RhQydUcif_R69ILrvQ',
  },
  {
    id: 'USR-DM-01',
    name: 'Dr. Meena Patil',
    role: 'district_manager',
    facilityId: 'DST-NDB',
    facilityName: 'Nandurbar District Eye Care Cell',
    facilityLevel: 'district',
    district: 'Nandurbar',
    state: 'Maharashtra',
    qualifications: 'District Programme Officer — NPCB & NCD',
    employeeId: 'DPO-NDB-02',
  },
  {
    id: 'USR-SA-01',
    name: 'Dr. Suresh Deshmukh',
    role: 'state_admin',
    facilityId: 'ST-MH',
    facilityName: 'Maharashtra State NCD / Blindness Control Programme',
    facilityLevel: 'state',
    district: '—',
    state: 'Maharashtra',
    qualifications: 'State Programme Officer — DR Screening Initiative',
    employeeId: 'SPO-MH-DR-01',
  },
  {
    id: 'USR-IT-01',
    name: 'Rahul More',
    role: 'system_admin',
    facilityId: 'DST-NDB',
    facilityName: 'Nandurbar District IT Cell',
    facilityLevel: 'district',
    district: 'Nandurbar',
    state: 'Maharashtra',
    qualifications: 'System Administrator — Health Informatics',
    employeeId: 'IT-NDB-03',
  },
];

export const INITIAL_CAMP_STATS: CampStats = {
  screenedToday: 0,
  targetTotal: 25,
  highRiskCount: 0,
  normalCount: 0,
  mildCount: 0,
  pendingSyncCount: 0,
  pendingAiCount: 0,
  pendingOphthalmologistReview: 0,
  referralPendingCount: 0,
  referralCompletedCount: 0,
  imageQualityFailureRate: 0,
  storageFreeGb: 4.2,
  batteryPct: 84,
  targetSlaTime: '04:30 PM',
};

export const DISTRICT_ANALYTICS: ProgramAnalytics = {
  totalScreened: 1842,
  targetCoverage: 2500,
  coveragePct: 73.7,
  referableDrDetected: 187,
  referralCompletionRate: 68.4,
  ungradableRate: 6.2,
  averageAiConfidence: 91.3,
  facilitiesActive: 28,
  facilitiesWithEquipmentIssues: 3,
  pendingReviews: 42,
  workforceCapacityPct: 81,
};

export const STATE_ANALYTICS: ProgramAnalytics = {
  totalScreened: 48210,
  targetCoverage: 75000,
  coveragePct: 64.3,
  referableDrDetected: 4120,
  referralCompletionRate: 61.8,
  ungradableRate: 7.1,
  averageAiConfidence: 90.1,
  facilitiesActive: 412,
  facilitiesWithEquipmentIssues: 27,
  pendingReviews: 890,
  workforceCapacityPct: 74,
};

export const ON_CALL_DOCTOR: TeleconsultDoctor = {
  name: 'Dr. Arvind Kulkarni',
  qualifications: 'MS (Ophth), FVRS',
  role: 'Vitreoretinal Specialist • District Tele-Review Hub',
  hospital: 'District Hospital Nandurbar Tele-Ophthalmology Dept',
  avatarUrl:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuA71TP0T1JS7r4B_FVZdETH9B4R-cBNrocr6TVblyF-oh0KghjjPpMtZghf2viqsMvHJbYn4lPChT2FhUsUe4hFnW6IjNkz0B9Xu2sKETy0Y4eD-YasUJdA6wzDDGlsTWRk6Gl-hlmswPMuAXRWw4Rbq40JRuRFUofBqWzIaYwBCS-BD7NCIYG_xOvj5xzzkjRvSpESegxyaHbm_goFtEwN3BPC2PGiITMhdvg4RhQydUcif_R69ILrvQ',
  status: 'Online',
};

/** Backward-compatible alias used by Navigation / Header */
export const ASHA_WORKER = {
  name: 'Sunita Devi',
  id: 'ASHA #4102',
  center: 'Vadbare Sub-Center, Nandurbar',
  campLocation: 'Vadbare Anganwadi Camp #03',
  supervisingMo: 'Dr. Rajesh Rathod (PHC / DH Nandurbar)',
  avatarUrl: DEMO_USERS[0].avatarUrl!,
};

/** No preloaded patients — application starts empty. Staff must register patients via the UI. */
export const INITIAL_PATIENTS: Patient[] = [];

