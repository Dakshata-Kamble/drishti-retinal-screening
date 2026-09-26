import React from 'react';
import { ScreenId } from '../../types';

interface StartScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  onNavigate,
}) => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">

      <div className="w-full max-w-6xl">

        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">

          <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[620px]">

            {/* LEFT SIDE */}

            <div className="relative bg-[#0d766e] px-8 sm:px-12 lg:px-16 py-12 flex flex-col justify-between overflow-hidden">

              {/* Background decoration */}

              <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-white/10" />

              <div className="absolute -bottom-40 -left-32 w-96 h-96 rounded-full bg-white/5" />

              <div className="relative z-10">

                {/* LOGO */}

                <div className="flex items-center gap-3">

                  <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm">

                    <span className="material-symbols-outlined text-[#0d766e] text-3xl">
                      visibility
                    </span>

                  </div>

                  <div>

                    <h1 className="text-2xl font-extrabold text-white tracking-tight">
                      DRISHTI
                    </h1>

                    <p className="text-xs text-teal-100">
                      Retinal Screening Platform
                    </p>

                  </div>

                </div>

              </div>

              {/* MAIN TEXT */}

              <div className="relative z-10 py-12">

                <p className="text-xs uppercase tracking-[0.25em] text-teal-100 font-bold mb-4">
                  AI-Powered Eye Screening
                </p>

                <h2 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight">
                  Early screening.
                  <br />
                  Better vision.
                </h2>

    

              </div>

              {/* FOOTER */}

              <div className="relative z-10 flex flex-wrap gap-3">


                <div className="px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-xs text-white">
                  Edge AI
                </div>

                <div className="px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-xs text-white">
                  Rural Screening
                </div>

              </div>

            </div>

            {/* RIGHT SIDE */}

            <div className="px-8 sm:px-12 lg:px-16 py-12 flex flex-col justify-center">

              <div className="max-w-md mx-auto w-full">

                <div className="mb-8">

                  <span className="text-xs font-bold uppercase tracking-wider text-[#0d766e]">
                    Welcome
                  </span>

                  <h2 className="text-3xl font-extrabold text-slate-900 mt-2">
                    Start a screening session
                  </h2>

                  <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                    Select facility type and sign in to begin screening.
                  </p>

                </div>

                {/* INFO CARDS */}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">

                    <span className="material-symbols-outlined text-[#0d766e]">
                      local_hospital
                    </span>

                    <p className="text-xs font-bold text-slate-800 mt-2">
                      Facility
                    </p>

                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Hospital / PHC
                    </p>

                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">

                    <span className="material-symbols-outlined text-[#0d766e]">
                      groups
                    </span>

                    <p className="text-xs font-bold text-slate-800 mt-2">
                      Staff
                    </p>

                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Role based access
                    </p>

                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">

                    <span className="material-symbols-outlined text-[#0d766e]">
                      psychology
                    </span>

                    <p className="text-xs font-bold text-slate-800 mt-2">
                      Edge AI
                    </p>

                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Local inference
                    </p>

                  </div>

                </div>

                {/* BUTTON */}

                <button
                  type="button"
                  onClick={() => onNavigate('facility-login')}
                  className="w-full min-h-[54px] rounded-xl bg-[#0d766e] hover:bg-[#005c55] text-white font-bold text-sm flex items-center justify-center gap-3 shadow-md transition-all"
                >

                  <span>
                    Get Started
                  </span>

                  <span className="material-symbols-outlined">
                    arrow_forward
                  </span>

                </button>

                <p className="text-center text-[11px] text-slate-400 mt-5">
                  Drishti Screening System 
                </p>

              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
};