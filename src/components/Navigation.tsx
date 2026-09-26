import React from 'react';
import { ScreenId, CurrentUser, UserRole } from '../types';
import logoImg from '../assets/logo.png';

interface NavigationProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  pendingSyncCount: number;
  highRiskCount: number;
  totalQueueCount: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  currentUser: CurrentUser;
}

type NavItem = {
  id: ScreenId;
  label: string;
  icon: string;
  step?: string;
  badge?: { text: string; type: 'counter' | 'urgent' | 'sync' };
  roles: UserRole[];
};

export const Navigation: React.FC<NavigationProps> = ({
  currentScreen,
  onNavigate,
  pendingSyncCount,
  highRiskCount,
  totalQueueCount,
  isOpenMobile,
  onCloseMobile,
  currentUser,
}) => {
  const allNavItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: 'dashboard',
      roles: ['screening_operator', 'ophthalmologist'],
    },
    {
      id: 'patient-registration',
      label: 'Registration',
      icon: 'person_add',
      step: '1',
      roles: ['screening_operator'],
    },
    {
      id: 'retinal-capture',
      label: 'Capture / Upload',
      icon: 'photo_camera',
      step: '2',
      roles: ['screening_operator'],
    },
    {
      id: 'ai-diagnosis',
      label: 'Analysis & Report',
      icon: 'psychology',
      step: '3–5',
      roles: ['screening_operator', 'ophthalmologist'],
    },
    {
      id: 'screening-queue',
      label: 'Patient Queue',
      icon: 'format_list_bulleted',
      badge: { text: `${totalQueueCount}`, type: 'counter' },
      roles: ['screening_operator', 'ophthalmologist'],
    },
  ];

  const navItems = allNavItems.filter((item) => item.roles.includes(currentUser.role));

  const handleNavClick = (screen: ScreenId) => {
    onNavigate(screen);
    if (onCloseMobile) onCloseMobile();
  };

  const roleDisplay = (() => {
    switch (currentUser.role) {
      case 'screening_operator':
        return 'Screening Staff';
      case 'ophthalmologist':
        return 'Ophthalmologist';
      case 'district_manager':
        return 'District Program Manager';
      case 'state_admin':
        return 'State Program Admin';
      case 'system_admin':
        return 'System Administrator';
      default:
        return currentUser.role;
    }
  })();

  const navContent = (
    <div className="h-full w-72 bg-surface-container-lowest flex flex-col justify-between shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-r border-outline-variant/30 select-none">
      <div className="flex flex-col p-4 overflow-y-auto">
        {/* Brand */}
        <div className="flex items-center gap-2.5 mb-2">
          <img alt="DRISHTI Logo" className="h-8 w-auto object-contain" src={logoImg} />
          <div className="flex flex-col">
            <span className="font-bold text-base text-on-surface tracking-tight leading-tight">
              DRISHTI
            </span>
            <span className="text-[10px] text-on-surface-variant leading-tight">
              AI-Assisted DR Screening
            </span>
          </div>
        </div>

        {/* Hierarchy context */}
        <div className="mb-5 px-1 py-2 rounded-lg bg-teal-50/80 border border-teal-100">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-teal-800/70 mb-0.5">
            Facility Context
          </div>
          <div className="text-xs font-semibold text-teal-900 truncate">
            {currentUser.facilityName}
          </div>
          <div className="text-[11px] text-teal-700/80 truncate">
            {currentUser.district !== '—' ? `${currentUser.district} · ` : ''}
            {currentUser.state}
          </div>
        </div>

        <nav aria-label="Primary Navigation" className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = currentScreen === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`
                  flex items-center justify-between
                  min-h-[46px] px-3.5 rounded-lg drishti-nav-item text-left w-full cursor-pointer
                  ${
                    isActive
                      ? 'bg-[#0d766e] text-white font-semibold shadow-sm'
                      : 'text-slate-700 hover:bg-surface-container-high hover:text-on-surface'
                  }
                `}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`material-symbols-outlined text-base shrink-0 ${
                      isActive ? 'text-white' : 'text-slate-500'
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span className="text-sm font-medium truncate">{item.label}</span>
                </div>

                {item.step && (
                  <span
                    className={`text-[11px] px-1.5 py-0.5 rounded font-medium shrink-0 ${
                      isActive ? 'bg-white/20 text-white' : 'bg-surface-container text-on-surface-variant'
                    }`}
                  >
                    {item.step}
                  </span>
                )}

                {item.badge && item.badge.type === 'counter' && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-bold shrink-0 ${
                      isActive ? 'bg-white/20 text-white' : 'bg-surface-container-high text-on-surface'
                    }`}
                  >
                    {item.badge.text}
                  </span>
                )}

                {item.badge && item.badge.type === 'urgent' && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-bold shrink-0 ${
                      isActive ? 'bg-red-500 text-white' : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {item.badge.text}
                  </span>
                )}

                {item.badge && item.badge.type === 'sync' && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-bold shrink-0 ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : pendingSyncCount > 0
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-surface-container-high text-on-surface'
                    }`}
                  >
                    {item.badge.text}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User identity footer — disclaimer removed */}
      <div className="p-4 border-t border-outline-variant/30">
        <div className="flex items-center gap-3">
          {currentUser.avatarUrl ? (
            <img
              src={currentUser.avatarUrl}
              alt=""
              className="w-9 h-9 rounded-full object-cover border border-slate-200"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center text-teal-800 font-bold text-sm">
              {currentUser.name.charAt(0)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-on-surface truncate">{currentUser.name}</div>
            <div className="text-[11px] text-on-surface-variant truncate">{roleDisplay}</div>
            {currentUser.employeeId && (
              <div className="text-[10px] text-on-surface-variant/80 truncate">
                {currentUser.employeeId}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 z-50">{navContent}</aside>

      {/* Mobile drawer */}
      {isOpenMobile && (
        <div className="lg:hidden fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={onCloseMobile}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-xl">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
};