import React, { useState } from 'react';
import { Facility, FacilityLevel, ScreenId } from '../../types';

interface FacilityLoginScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onFacilitySelect: (facility: Facility) => void;
}

type FacilityType = 'hospital' | 'phc' | 'camp';

const TYPE_OPTIONS: {
  type: FacilityType;
  level: FacilityLevel;
  title: string;
  description: string;
  icon: string;
}[] = [
  {
    type: 'hospital',
    level: 'district_hospital',
    title: 'Hospital',
    description: 'District / Tertiary hospital',
    icon: 'local_hospital',
  },
  {
    type: 'phc',
    level: 'phc',
    title: 'PHC / HWC',
    description: 'Primary Health Centre or Health & Wellness Centre',
    icon: 'medical_services',
  },
  {
    type: 'camp',
    level: 'mobile_camp',
    title: 'Screening Camp',
    description: 'Mobile or outreach screening camp',
    icon: 'camping',
  },
];

export const FacilityLoginScreen: React.FC<FacilityLoginScreenProps> = ({
  onNavigate,
  onFacilitySelect,
}) => {
  const [facilityType, setFacilityType] = useState<FacilityType>('phc');
  const [facilityName, setFacilityName] = useState('');
  const [facilityCode, setFacilityCode] = useState('');
  const [district, setDistrict] = useState('');
  const [stateName, setStateName] = useState('Maharashtra');
  const [campName, setCampName] = useState('');
  const [error, setError] = useState('');

  const selected = TYPE_OPTIONS.find((o) => o.type === facilityType)!;

  const handleContinue = () => {
    setError('');

    if (!facilityName.trim()) {
      setError('Facility name is required.');
      return;
    }
    if (!district.trim()) {
      setError('District is required.');
      return;
    }
    if (facilityType === 'camp' && !campName.trim()) {
      setError('Camp name / location is required for screening camps.');
      return;
    }

    const facility: Facility = {
      id: `FAC-${Date.now().toString(36).toUpperCase()}`,
      name:
        facilityType === 'camp'
          ? `${facilityName.trim()} — ${campName.trim()}`
          : facilityName.trim(),
      level: selected.level,
      district: district.trim(),
      state: stateName.trim() || 'Maharashtra',
      code: facilityCode.trim() || undefined,
    };

    onFacilitySelect(facility);
    onNavigate('staff-login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-6xl">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="px-7 sm:px-10 py-5 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#0d766e] flex items-center justify-center">
              <span className="material-symbols-outlined">visibility</span>
            </div>
            <div>
              <p className="font-extrabold text-slate-900">DRISHTI</p>
              <p className="text-[10px] text-slate-500">Facility Setup</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5">
            <div className="lg:col-span-2 p-7 sm:p-10 border-b lg:border-b-0 lg:border-r border-slate-100">
              <p className="text-xs font-bold uppercase tracking-wider text-[#0d766e]">
                Step 1 of 2
              </p>
              <h2 className="text-3xl font-extrabold text-slate-900 mt-2">
                Select Facility
              </h2>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                Choose where this screening session is running and enter facility details.
              </p>

              <div className="mt-6 space-y-3">
                {TYPE_OPTIONS.map((item) => {
                  const active = facilityType === item.type;
                  return (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => setFacilityType(item.type)}
                      className={`w-full p-4 rounded-xl border text-left transition-all ${
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
                          <span className="material-symbols-outlined">{item.icon}</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-slate-900">{item.title}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{item.description}</p>
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
            </div>

            <div className="lg:col-span-3 p-7 sm:p-10">
              <p className="text-xs font-bold uppercase tracking-wider text-[#0d766e]">
                Facility Details
              </p>
              <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                Enter {selected.title} information
              </h3>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-800">
                    Facility Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={facilityName}
                    onChange={(e) => setFacilityName(e.target.value)}
                    placeholder={
                      facilityType === 'hospital'
                        ? 'e.g. District Hospital Nandurbar'
                        : facilityType === 'phc'
                          ? 'e.g. Vadbare Primary Health Centre'
                          : 'e.g. Vadbare Sub-Centre'
                    }
                    className="w-full min-h-[48px] mt-1.5 px-3.5 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d766e]"
                  />
                </div>

                {facilityType === 'camp' && (
                  <div>
                    <label className="text-xs font-bold text-slate-800">
                      Camp Name / Location <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={campName}
                      onChange={(e) => setCampName(e.target.value)}
                      placeholder="e.g. Anganwadi Camp #03"
                      className="w-full min-h-[48px] mt-1.5 px-3.5 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d766e]"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-800">
                      District <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      placeholder="e.g. Nandurbar"
                      className="w-full min-h-[48px] mt-1.5 px-3.5 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d766e]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-800">State</label>
                    <input
                      type="text"
                      value={stateName}
                      onChange={(e) => setStateName(e.target.value)}
                      placeholder="Maharashtra"
                      className="w-full min-h-[48px] mt-1.5 px-3.5 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d766e]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800">
                    Facility Code (optional)
                  </label>
                  <input
                    type="text"
                    value={facilityCode}
                    onChange={(e) => setFacilityCode(e.target.value)}
                    placeholder="e.g. PHC-VAD-01"
                    className="w-full min-h-[48px] mt-1.5 px-3.5 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d766e]"
                  />
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleContinue}
                  className="w-full min-h-[50px] mt-2 rounded-xl bg-[#0d766e] hover:bg-[#005c55] text-white text-sm font-bold flex items-center justify-center gap-2"
                >
                  Continue to Staff Login
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('start')}
                  className="w-full min-h-[42px] text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  ← Back
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
