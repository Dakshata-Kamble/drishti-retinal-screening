import React, { useState } from 'react';
import {
  CurrentUser,
  Facility,
  ScreenId,
  UserRole,
} from '../../types';
import { DEMO_USERS } from '../../data/mockData';

interface StaffLoginScreenProps {
  onNavigate: (screen: ScreenId) => void;
  facility: Facility | null;
  onLogin: (user: CurrentUser) => void;
}

const ROLE_OPTIONS: {
  role: UserRole;
  title: string;
  description: string;
  icon: string;
}[] = [
  {
    role: 'screening_operator',
    title: 'Screening Staff',
    description: 'Patient registration, retinal capture and screening',
    icon: 'photo_camera',
  },
  {
    role: 'ophthalmologist',
    title: 'Ophthalmologist',
    description: 'AI review, validation and referrals',
    icon: 'medical_services',
  },
];

export const StaffLoginScreen: React.FC<
  StaffLoginScreenProps
> = ({
  onNavigate,
  facility,
  onLogin,
}) => {

  const [selectedRole, setSelectedRole] =
    useState<UserRole>('screening_operator');

  const [employeeId, setEmployeeId] =
    useState('DRS-0042');

  const [pin, setPin] =
    useState('1234');

  const [loading, setLoading] =
    useState(false);

  const handleLogin = () => {

    if (!employeeId || !pin || !facility) {
      return;
    }

    setLoading(true);

    // Use single consistent identity from DEMO_USERS
    const demoUser = DEMO_USERS.find((u) => u.role === selectedRole);

    const user: CurrentUser = demoUser
      ? {
          ...demoUser,
          // Keep facility context from the login selection for screening staff;
          // ophthalmologist always works from their district hospital hub.
          facilityId:
            selectedRole === 'ophthalmologist'
              ? demoUser.facilityId
              : facility.id,
          facilityName:
            selectedRole === 'ophthalmologist'
              ? demoUser.facilityName
              : facility.name,
          facilityLevel:
            selectedRole === 'ophthalmologist'
              ? demoUser.facilityLevel
              : facility.level,
          district: facility.district || demoUser.district,
          state: facility.state || demoUser.state,
          employeeId: employeeId || demoUser.employeeId,
        }
      : {
          id: employeeId,
          name:
            selectedRole === 'ophthalmologist'
              ? 'Dr. Arvind Kulkarni'
              : 'Sunita Devi',
          role: selectedRole,
          facilityId: facility.id,
          facilityName: facility.name,
          facilityLevel: facility.level,
          district: facility.district,
          state: facility.state,
          employeeId,
          qualifications:
            selectedRole === 'ophthalmologist'
              ? 'MS (Ophth), FVRS — Vitreoretinal Specialist'
              : 'Trained Ophthalmic Assistant / NCD Screening Worker',
        };

    setTimeout(() => {

      onLogin(user);

      setLoading(false);

      // Ophthalmologist → doctor review queue; Staff → screening dashboard
      if (selectedRole === 'ophthalmologist') {
        onNavigate('screening-queue');
      } else {
        onNavigate('dashboard');
      }

    }, 500);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-8">

      <div className="w-full max-w-6xl">

        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">

          {/* HEADER */}

          <div className="px-7 sm:px-10 py-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">

            <div className="flex items-center gap-3">

              <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#0d766e] flex items-center justify-center">

                <span className="material-symbols-outlined">
                  visibility
                </span>

              </div>

              <div>

                <p className="font-extrabold text-slate-900">
                  DRISHTI
                </p>

                <p className="text-[10px] text-slate-500">
                  Staff Authentication
                </p>

              </div>

            </div>

            <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">

              <p className="text-[10px] text-slate-500">
                Current Facility
              </p>

              <p className="text-xs font-bold text-slate-800">
                {facility?.name || 'Facility not selected'}
              </p>

            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5">

            {/* LOGIN */}

            <div className="lg:col-span-2 p-7 sm:p-10 border-b lg:border-b-0 lg:border-r border-slate-100">

              <p className="text-xs font-bold uppercase tracking-wider text-[#0d766e]">
                Step 2 of 2
              </p>

              <h2 className="text-3xl font-extrabold text-slate-900 mt-2">
                Staff Login
              </h2>

              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                Enter your staff credentials and select the role
                you are using for this Drishti session.
              </p>

              {/* EMPLOYEE ID */}

              <div className="mt-7">

                <label className="text-xs font-bold text-slate-800">
                  Employee / Staff ID
                </label>

                <div className="relative mt-1.5">

                  <span className="material-symbols-outlined absolute left-3.5 top-3 text-slate-400">
                    badge
                  </span>

                  <input
                    type="text"
                    value={employeeId}
                    onChange={(e) =>
                      setEmployeeId(e.target.value)
                    }
                    className="w-full min-h-[48px] pl-11 pr-3.5 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d766e]"
                  />

                </div>

              </div>

              {/* PIN */}

              <div className="mt-4">

                <label className="text-xs font-bold text-slate-800">
                  Password / PIN
                </label>

                <div className="relative mt-1.5">

                  <span className="material-symbols-outlined absolute left-3.5 top-3 text-slate-400">
                    lock
                  </span>

                  <input
                    type="password"
                    value={pin}
                    onChange={(e) =>
                      setPin(e.target.value)
                    }
                    className="w-full min-h-[48px] pl-11 pr-3.5 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d766e]"
                  />

                </div>

              </div>

              {/* SECURITY */}

              <div className="mt-5 p-3 rounded-xl bg-blue-50 border border-blue-100 flex gap-2.5">

                <span className="material-symbols-outlined text-blue-600">
                  security
                </span>

                <p className="text-[11px] text-blue-800 leading-relaxed">
                  Access is linked to the selected facility and
                  role. Patient information is shown according
                  to the user's assigned permissions.
                </p>

              </div>

              <button
                type="button"
                onClick={handleLogin}
                disabled={
                  loading ||
                  !employeeId ||
                  !pin ||
                  !facility
                }
                className="w-full min-h-[50px] mt-6 rounded-xl bg-[#0d766e] hover:bg-[#005c55] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold flex items-center justify-center gap-2"
              >

                {loading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">
                      refresh
                    </span>

                    Signing in...
                  </>
                ) : (
                  <>
                    Open Drishti Dashboard

                    <span className="material-symbols-outlined">
                      arrow_forward
                    </span>
                  </>
                )}

              </button>

              <button
                type="button"
                onClick={() =>
                  onNavigate('facility-login')
                }
                className="w-full mt-3 min-h-[42px] text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                ← Change Facility
              </button>

            </div>

            {/* ROLE SELECTION */}

            <div className="lg:col-span-3 p-7 sm:p-10">

              <p className="text-xs font-bold uppercase tracking-wider text-[#0d766e]">
                Access Level
              </p>

              <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                Select your role
              </h3>

              <p className="text-xs text-slate-500 mt-1">
                Your dashboard and available actions will depend
                on this role.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">

                {ROLE_OPTIONS.map((item) => {

                  const active =
                    selectedRole === item.role;

                  return (
                    <button
                      key={item.role}
                      type="button"
                      onClick={() =>
                        setSelectedRole(item.role)
                      }
                      className={`p-4 rounded-xl border text-left transition-all ${
                        active
                          ? 'border-[#0d766e] bg-teal-50 shadow-sm'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >

                      <div className="flex items-start gap-3">

                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                            active
                              ? 'bg-[#0d766e] text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >

                          <span className="material-symbols-outlined">
                            {item.icon}
                          </span>

                        </div>

                        <div className="flex-1">

                          <p className="text-xs font-bold text-slate-900">
                            {item.title}
                          </p>

                          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                            {item.description}
                          </p>

                        </div>

                        {active && (
                          <span className="material-symbols-outlined text-[#0d766e] text-lg">
                            check_circle
                          </span>
                        )}

                      </div>

                    </button>
                  );
                })}

              </div>

              {/* SELECTED ROLE */}

              <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200">

                <div className="flex items-center justify-between">

                  <div>

                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                      Selected Role
                    </p>

                    <p className="text-sm font-bold text-slate-900 mt-1">
                      {
                        ROLE_OPTIONS.find(
                          (item) =>
                            item.role === selectedRole
                        )?.title
                      }
                    </p>

                  </div>

                  <span className="material-symbols-outlined text-[#0d766e]">
                    verified_user
                  </span>

                </div>

              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
};