import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { PWAInstallButton } from './PWAInstallButton';
import cmedLogo from '../assets/images/cmed_logo.jpeg';
import { ActiveModule } from '../types';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  ClipboardCheck,
  FileCheck,
  Ticket,
  BarChart3,
  Settings,
  ShieldCheck,
  School,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
  LogOut
} from 'lucide-react';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile }) => {
  const { currentUser, isAdmin, isAnimateur, logout } = useAuth();
  const {
    activeModule,
    setActiveModule,
    t,
    totals,
    settings,
    isRtl,
    sidebarCollapsed,
    toggleSidebar
  } = useApp();

  const handleSelectModule = (mod: ActiveModule) => {
    setActiveModule(mod);
    onCloseMobile();
  };

  const navItems = [
    {
      id: 'dashboard' as ActiveModule,
      label: t.navDashboard,
      icon: LayoutDashboard,
      badge: null,
      adminOnly: false
    },
    {
      id: 'beneficiaires' as ActiveModule,
      label: t.navBeneficiaires,
      icon: Users,
      badge: totals.actifs,
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
      adminOnly: false
    },
    {
      id: 'absences' as ActiveModule,
      label: t.navAbsences,
      icon: ClipboardCheck,
      badge: totals.absents > 0 ? totals.absents : null,
      badgeColor: 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
      adminOnly: false
    },
    {
      id: 'billets' as ActiveModule,
      label: t.navBillets,
      icon: Ticket,
      badge: totals.convoques > 0 ? totals.convoques : null,
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
      adminOnly: false
    },
    {
      id: 'planning' as ActiveModule,
      label: t.navPlanning,
      icon: CalendarDays,
      badge: null,
      adminOnly: false
    },
    {
      id: 'rapports' as ActiveModule,
      label: t.navRapports,
      icon: BarChart3,
      badge: null,
      adminOnly: false
    },
    {
      id: 'parametrage' as ActiveModule,
      label: t.navParametrage,
      icon: Settings,
      badge: 'Admin',
      badgeColor: 'bg-slate-800 text-slate-300 border border-slate-700',
      adminOnly: true
    },
    {
      id: 'utilisateurs' as ActiveModule,
      label: t.navUsers,
      icon: ShieldCheck,
      badge: null,
      adminOnly: true
    }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Main Sidebar Element (Canva Bleu foncé & Turquoise SaaS 2026) */}
      <aside
        className={`fixed lg:static top-0 bottom-0 z-40 bg-[#0a1a44] text-white flex flex-col shrink-0 transition-all duration-300 ease-in-out print-hide shadow-2xl lg:shadow-none border-r border-[#142140] ${
          isRtl ? 'right-0' : 'left-0'
        } ${
          mobileOpen
            ? 'translate-x-0 w-72'
            : isRtl
            ? 'translate-x-full lg:translate-x-0 ' + (sidebarCollapsed ? 'lg:w-20' : 'lg:w-72')
            : '-translate-x-full lg:translate-x-0 ' + (sidebarCollapsed ? 'lg:w-20' : 'lg:w-72')
        }`}
      >
        {/* Sidebar Brand / Centre Badge */}
        <div className={`p-4 border-b border-[#142140] flex items-center justify-between ${sidebarCollapsed ? 'lg:flex-col lg:gap-3 lg:p-3' : ''}`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl shrink-0 shadow-lg border border-[#57e4ff]/40 bg-white p-1 flex items-center justify-center">
              <img
                src={cmedLogo}
                alt="Logo CMED"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            {/* Show brand text only when expanded */}
            <div className={`min-w-0 ${sidebarCollapsed ? 'lg:hidden' : 'block'}`}>
              <h2 className="text-xs font-black tracking-tight text-white uppercase leading-snug">
                DEUXIÈME CHANCE
              </h2>
              <p className="text-[10px] text-[#57e4ff] font-bold truncate">
                NOUVELLE GÉNÉRATION ZIRARA
              </p>
              <p className="text-[9px] text-slate-400 font-sans truncate" dir="rtl">
                الجيل الجديد زيرارة
              </p>
              <div className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#071332] text-[#57e4ff] border border-[#02b3bb]/40 text-[9px] font-black tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-[#57e4ff] animate-pulse" />
                <span>{settings.anneeScolaireCourante || '2026-2027'}</span>
              </div>
            </div>
          </div>

          {/* Desktop quick collapse/expand button */}
          <button
            type="button"
            onClick={toggleSidebar}
            className={`hidden lg:inline-flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#142140] transition-colors border border-slate-700/50 ${
              sidebarCollapsed ? 'w-9 h-9' : ''
            }`}
            title={sidebarCollapsed ? t.expandNav : t.reduceNav}
            aria-label={sidebarCollapsed ? t.expandNav : t.reduceNav}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-[#57e4ff]" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>

          {/* Mobile close button */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#142140]"
            aria-label="Fermer le menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className={`flex-1 py-4 px-3 space-y-1.5 overflow-y-auto overflow-x-hidden ${sidebarCollapsed ? 'lg:px-2' : ''}`}>
          
          {/* Header row for 'Navigation Principale' */}
          {!sidebarCollapsed ? (
            <div className="px-2 pb-2 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                {t.navigationPrincipale}
              </span>
              <button
                type="button"
                onClick={toggleSidebar}
                className="hidden lg:inline-flex items-center gap-1.5 text-[11px] font-bold text-[#57e4ff] hover:text-white bg-[#071332] hover:bg-[#142140] px-2 py-1 rounded-lg transition-all border border-[#02b3bb]/30 shadow-2xs group"
                title={t.reduceNav}
              >
                <PanelLeftClose className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                <span>Réduire</span>
              </button>
            </div>
          ) : (
            <div className="hidden lg:flex justify-center pb-2">
              <button
                type="button"
                onClick={toggleSidebar}
                className="w-10 h-8 rounded-lg bg-[#071332] hover:bg-[#142140] text-[#57e4ff] hover:text-white flex items-center justify-center transition-all border border-[#02b3bb]/30 shadow-2xs group"
                title={t.expandNav}
                aria-label={t.expandNav}
              >
                <PanelLeftOpen className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </button>
            </div>
          )}

          {navItems.map(item => {
            if (item.adminOnly && !isAdmin) return null;

            const Icon = item.icon;
            const isActive = activeModule === item.id;

            return (
              <div key={item.id} className="relative group">
                <button
                  type="button"
                  onClick={() => handleSelectModule(item.id)}
                  className={`w-full flex items-center rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    sidebarCollapsed
                      ? 'lg:justify-center lg:px-2.5 lg:py-3 px-3.5 py-2.5 justify-between'
                      : 'justify-between px-3.5 py-2.5'
                  } ${
                    isActive
                      ? 'bg-gradient-to-r from-[#02b3bb] to-[#0891b2] text-white shadow-md shadow-cyan-950/50 ring-1 ring-[#57e4ff]/40'
                      : 'text-slate-300 hover:text-white hover:bg-[#142140]/80'
                  }`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <div className={`flex items-center gap-3 min-w-0 ${sidebarCollapsed ? 'lg:gap-0' : ''}`}>
                    <Icon
                      className={`w-5 h-5 shrink-0 transition-colors ${
                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-[#57e4ff]'
                      }`}
                    />
                    <span className={`truncate ${sidebarCollapsed ? 'lg:hidden' : 'block'}`}>
                      {item.label}
                    </span>
                  </div>

                  {/* Badge & Chevron when expanded */}
                  <div className={`flex items-center gap-1.5 shrink-0 ${sidebarCollapsed ? 'lg:hidden' : 'flex'}`}>
                    {item.badge !== null && item.badge !== undefined && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isActive ? 'bg-[#0a1a44] text-[#57e4ff]' : item.badgeColor || 'bg-[#142140] text-slate-300'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight
                      className={`w-4 h-4 transition-transform ${
                        isActive
                          ? isRtl
                            ? '-rotate-180 text-white'
                            : 'rotate-0 text-white'
                          : isRtl
                          ? 'text-slate-500 group-hover:text-slate-300 -rotate-180'
                          : 'text-slate-500 group-hover:text-slate-300'
                      }`}
                    />
                  </div>

                  {/* Compact badge indicator when collapsed */}
                  {sidebarCollapsed && item.badge !== null && item.badge !== undefined && (
                    <span className="hidden lg:flex absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#57e4ff] text-[#0a1a44] font-black text-[9px] items-center justify-center shadow-xs">
                      {typeof item.badge === 'number' && item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </button>

                {/* Floating tooltip on hover when sidebar is collapsed */}
                {sidebarCollapsed && (
                  <div
                    className={`hidden lg:flex pointer-events-none absolute z-50 top-1/2 -translate-y-1/2 ${
                      isRtl ? 'right-full mr-2.5' : 'left-full ml-2.5'
                    } px-3 py-1.5 rounded-xl bg-[#071332] text-white text-xs font-bold whitespace-nowrap shadow-2xl border border-[#02b3bb]/40 opacity-0 group-hover:opacity-100 transition-opacity duration-150 items-center gap-2`}
                  >
                    <span>{item.label}</span>
                    {item.badge !== null && item.badge !== undefined && (
                      <span className="px-1.5 py-0.5 rounded-full bg-[#02b3bb] text-white text-[10px] font-bold">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Profile Info & Footer (Canva Tech Deep Navy) */}
        <div className={`border-t border-[#142140] bg-[#071332] ${sidebarCollapsed ? 'lg:p-2.5 p-4' : 'p-4 space-y-3'}`}>
          {!sidebarCollapsed ? (
            <>
              <PWAInstallButton variant="sidebar" />
              
              <button
                type="button"
                onClick={() => {
                  if (mobileOpen) onCloseMobile();
                  logout();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl text-xs font-bold text-rose-300 hover:text-white bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 transition-all shadow-2xs active:scale-95 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span>Déconnexion</span>
              </button>

              <div className="text-[10px] text-slate-400 text-center flex flex-col items-center gap-1">
                <span className="text-[9px] text-[#57e4ff] font-extrabold uppercase tracking-wider">
                  ASSOCIATION CMED
                </span>
                <span className="text-[9px] text-slate-400 font-medium block truncate max-w-[220px]">
                  {settings.nomCentre}
                </span>
              </div>
            </>
          ) : (
            /* Collapsed compact profile avatar + logout */
            <div className="hidden lg:flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={toggleSidebar}
                className="w-10 h-10 rounded-2xl bg-[#0a1a44] hover:bg-[#142140] text-[#57e4ff] font-bold flex items-center justify-center text-sm border border-[#02b3bb]/40 transition-colors group relative cursor-pointer"
                title={`${currentUser?.nomComplet} (${currentUser?.role}) - Cliquez pour agrandir`}
              >
                {currentUser?.nomComplet.charAt(0)}
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#57e4ff] ring-2 ring-[#071332]" />
              </button>
              
              <button
                type="button"
                onClick={logout}
                className="w-9 h-9 rounded-xl bg-rose-950/40 hover:bg-rose-900 text-rose-400 hover:text-white border border-rose-800/40 flex items-center justify-center transition-colors cursor-pointer"
                title="Déconnexion"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
