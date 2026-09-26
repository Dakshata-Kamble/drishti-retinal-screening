import React, { useState, useRef, useEffect } from 'react';
import { Language, CurrentUser, UserRole } from '../types';

interface HeaderProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onOpenMobileNav: () => void;
  queuedCount: number;
  currentUser: CurrentUser;
  onRoleChange: (role: UserRole) => void;
}

const ROLE_LABELS: Record<UserRole, string> = {
  screening_operator: 'Screening Staff',
  ophthalmologist: 'Ophthalmologist',
  district_manager: 'District Program Manager',
  state_admin: 'State Program Admin',
  system_admin: 'System / IT Admin',
};

export const Header: React.FC<HeaderProps> = ({
  language,
  onLanguageChange,
  onOpenMobileNav,
  currentUser,
  onRoleChange,
}) => {
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setRoleMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const languages: { code: Language; label: string }[] = [
    { code: 'en', label: 'EN' },
    { code: 'hi', label: 'हिं' },
    { code: 'mr', label: 'मर' },
  ];

  return (
    <header className="fixed top-0 left-0 lg:left-72 right-0 h-16 z-40 bg-surface-container-lowest/95 backdrop-blur-sm border-b border-outline-variant/30">
      <div className="h-full px-4 lg:px-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileNav}
            aria-label="Open navigation"
            className="lg:hidden w-10 h-10 rounded-lg bg-surface-container-low border border-slate-200 flex items-center justify-center text-slate-700"
          >
            <span className="material-symbols-outlined text-xl">menu</span>
          </button>

          <span className="material-symbols-outlined text-[#0d766e] text-xl shrink-0">
            health_and_safety
          </span>

          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900 truncate">
              {currentUser.facilityName}
            </div>
            <div className="text-[11px] text-slate-500 truncate">
              {ROLE_LABELS[currentUser.role]}
              {currentUser.district !== '—' ? ` · ${currentUser.district}` : ''}
              {` · ${currentUser.state}`}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex items-center gap-1 p-1 rounded-lg bg-slate-100 border border-slate-200">
            {languages.map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => onLanguageChange(item.code)}
                className={`min-w-[34px] h-8 px-2 rounded-md text-[11px] font-bold transition-all ${
                  language === item.code
                    ? 'bg-white text-teal-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Current user identity + Logout (role change requires re-login) */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setRoleMenuOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 min-h-[40px] px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
              title="Account"
            >
              <span className="material-symbols-outlined text-base">person</span>
              <span className="hidden lg:inline max-w-[140px] truncate">
                {currentUser.name}
              </span>
              <span className="material-symbols-outlined text-sm">expand_more</span>
            </button>

            {roleMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-64 rounded-xl border border-slate-200 bg-white shadow-lg py-1.5 z-50">
                <div className="px-3 py-2 border-b border-slate-100">
                  <div className="text-sm font-semibold text-slate-900 truncate">
                    {currentUser.name}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {ROLE_LABELS[currentUser.role]}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">
                    {currentUser.facilityName}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    // Logout → return to login screen (role switch requires re-auth)
                    onRoleChange(currentUser.role);
                    setRoleMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2.5 flex items-center gap-2.5 hover:bg-slate-50 text-slate-700"
                >
                  <span className="material-symbols-outlined text-base text-slate-500">
                    logout
                  </span>
                  <div>
                    <div className="text-sm font-semibold">Sign out</div>
                    <div className="text-[10px] text-slate-400">
                      Return to login to switch role
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
