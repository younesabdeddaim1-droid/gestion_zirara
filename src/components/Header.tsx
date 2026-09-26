import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { PWAInstallButton } from './PWAInstallButton';
import cmedLogo from '../assets/images/cmed_logo.jpeg';
import {
  School,
  User as UserIcon,
  LogOut,
  Globe,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  Bell,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Ticket
} from 'lucide-react';

interface HeaderProps {
  onToggleMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu }) => {
  const { currentUser, logout, isAdmin } = useAuth();
  const {
    settings,
    language,
    setLanguage,
    nameLanguage,
    setNameLanguage,
    t,
    totals,
    setActiveModule,
    sidebarCollapsed,
    toggleSidebar,
    isRtl,
    getFiliereById,
    getClasseById
  } = useApp();

  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close notifications on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const centreTitleFr = 'Centre de Deuxième Chance – Nouvelle Génération Zirara';
  const centreTitleAr = settings.nomCentreAr || 'مركز الفرصة الثانية – الجيل الجديد زرارة';
  const userDisplayName = currentUser
    ? (language === 'ar' && currentUser.nomCompletAr ? currentUser.nomCompletAr : currentUser.nomComplet)
    : '';

  const totalAlerts = (totals.absents || 0) + (totals.convoques || 0);

  // Compute assigned filieres and classes for the active user badge
  const assignedFilieresNames = (currentUser?.filiereIds || [])
    .map(id => getFiliereById(id)?.code || getFiliereById(id)?.nomFr)
    .filter(Boolean) as string[];

  const assignedClassesNames = (currentUser?.classeIds || [])
    .map(id => getClasseById(id)?.nomFr || getClasseById(id)?.code)
    .filter(Boolean) as string[];

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs print-hide">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-2 sm:gap-4">
          
          {/* Left: Sidebar Toggle + Institutional Logos & Title */}
          <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
            {/* Sidebar toggle button */}
            <button
              type="button"
              onClick={() => {
                if (window.innerWidth < 1024) {
                  onToggleMobileMenu();
                } else {
                  toggleSidebar();
                }
              }}
              className="p-2 sm:p-2.5 rounded-2xl text-[#0a1a44] hover:text-[#02b3bb] hover:bg-cyan-50/60 transition-all border border-slate-200 shrink-0 shadow-2xs group cursor-pointer"
              title={sidebarCollapsed ? t.expandNav : t.reduceNav}
              aria-label={sidebarCollapsed ? t.expandNav : t.reduceNav}
            >
              <Menu className="w-5 h-5 lg:hidden group-hover:scale-105 transition-transform" />
              {sidebarCollapsed ? (
                <PanelLeftOpen className="w-5 h-5 hidden lg:block text-[#02b3bb] group-hover:scale-110 transition-transform" />
              ) : (
                <PanelLeftClose className="w-5 h-5 hidden lg:block text-[#0a1a44] group-hover:text-[#02b3bb] transition-colors" />
              )}
            </button>

            {/* Institutional Logo */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              <div
                className="h-10 sm:h-12 px-2.5 py-1 rounded-2xl bg-white shadow-2xs border border-slate-200 flex items-center justify-center shrink-0 hover:border-cyan-300 transition-colors"
                title="Corps Marocain pour l'Éducation et Développement (CMED)"
              >
                <img
                  src={cmedLogo}
                  alt="CMED Logo"
                  className="h-full w-auto object-contain max-w-[65px] sm:max-w-[85px]"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>

            {/* Title (Bleu foncé #0a1a44 & Turquoise #02b3bb) */}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xs sm:text-sm md:text-base font-black text-[#0a1a44] truncate leading-tight tracking-tight">
                  {centreTitleFr}
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-cyan-50 text-[#0a1a44] border border-cyan-200 shrink-0 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#02b3bb]" />
                  {settings.anneeScolaireCourante || '2026-2027'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] sm:text-xs text-[#02b3bb] font-black font-sans truncate" dir="rtl">
                  {centreTitleAr}
                </p>
                <span className="sm:hidden text-[9px] font-black px-1.5 py-0.2 rounded-full bg-cyan-50 text-[#0a1a44] border border-cyan-200">
                  {settings.anneeScolaireCourante || '2026-2027'}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Controls, Notifications & User Info */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">

            {/* PWA Install Button */}
            <PWAInstallButton variant="header" />

            {/* Language Switcher */}
            <button
              type="button"
              onClick={() => setLanguage(language === 'fr' ? 'ar' : 'fr')}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-2xl text-xs font-black border border-slate-200 hover:border-cyan-400 hover:bg-cyan-50/50 text-[#0a1a44] hover:text-[#02b3bb] transition-all shadow-2xs cursor-pointer active:scale-95"
              title={language === 'fr' ? 'Passer à l\'arabe' : 'Passer au français'}
            >
              <Globe className="w-3.5 h-3.5 text-[#02b3bb] shrink-0" />
              <span className="uppercase text-[11px] font-extrabold">{language === 'fr' ? 'AR' : 'FR'}</span>
            </button>

            {/* Name Display Mode (FR / AR / Both) - Desktop */}
            <div className="hidden xl:flex items-center text-xs bg-slate-100 rounded-xl p-0.5 border border-slate-200">
              <button
                type="button"
                onClick={() => setNameLanguage('fr')}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  nameLanguage === 'fr'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Afficher les noms en Français"
              >
                Nom FR
              </button>
              <button
                type="button"
                onClick={() => setNameLanguage('ar')}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all font-sans cursor-pointer ${
                  nameLanguage === 'ar'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="عرض الأسماء بالعربية"
              >
                الاسم بالعربية
              </button>
              <button
                type="button"
                onClick={() => setNameLanguage('both')}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  nameLanguage === 'both'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Afficher les deux langues"
              >
                FR+ع
              </button>
            </div>

            {/* 🔔 Notifications Dropdown (Requested in En-tête) */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setNotifOpen(prev => !prev)}
                className="relative p-2 sm:p-2.5 rounded-xl text-slate-600 hover:text-cyan-700 hover:bg-cyan-50/60 border border-slate-200 transition-all shadow-2xs cursor-pointer"
                title="Notifications du centre"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                {totalAlerts > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-cyan-600 text-white font-black text-[10px] rounded-full flex items-center justify-center ring-2 ring-white animate-pulse">
                    {totalAlerts}
                  </span>
                )}
              </button>

              {/* Notification Popover */}
              {notifOpen && (
                <div
                  className={`absolute z-50 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-slate-200 shadow-2xl p-4 text-slate-900 ${
                    isRtl ? 'left-0' : 'right-0'
                  }`}
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-cyan-600" />
                      <span className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                        Notifications & Alertes
                      </span>
                    </div>
                    <span className="text-[10px] font-bold bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded-full">
                      {totalAlerts} active{totalAlerts > 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="py-2.5 space-y-2 max-h-72 overflow-y-auto">
                    {totals.absents > 0 ? (
                      <div
                        onClick={() => {
                          setActiveModule('absences');
                          setNotifOpen(false);
                        }}
                        className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-100 hover:bg-rose-100/70 transition-colors cursor-pointer flex items-start gap-2.5"
                      >
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-rose-950">
                            {totals.absents} absence{totals.absents > 1 ? 's' : ''} à justifier
                          </div>
                          <div className="text-[11px] text-rose-700 mt-0.5">
                            Suivi et régularisation des absences signalées.
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {totals.convoques > 0 ? (
                      <div
                        onClick={() => {
                          setActiveModule('billets');
                          setNotifOpen(false);
                        }}
                        className="p-2.5 rounded-xl bg-cyan-50/70 border border-cyan-100 hover:bg-cyan-100/70 transition-colors cursor-pointer flex items-start gap-2.5"
                      >
                        <Ticket className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-cyan-950">
                            {totals.convoques} convocation{totals.convoques > 1 ? 's' : ''} en cours
                          </div>
                          <div className="text-[11px] text-cyan-700 mt-0.5">
                            Billets d'entrée / entretiens administratifs requis.
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-800">
                          Système synchronisé
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Base de données locale et planning opérationnels 2026-2027.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-slate-100 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveModule('dashboard');
                        setNotifOpen(false);
                      }}
                      className="text-xs font-bold text-cyan-600 hover:text-cyan-700 cursor-pointer"
                    >
                      Accéder au Tableau de bord
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Authenticated User Badge & Action */}
            {currentUser && (
              <div className="flex items-center gap-1.5 sm:gap-3 pl-2 sm:pl-3 border-l border-slate-200">
                <div className="text-right flex flex-col items-end max-w-[140px] sm:max-w-[220px]">
                  <div className="text-[11px] sm:text-sm font-extrabold text-[#0a1a44] leading-tight truncate w-full" title={currentUser.nomComplet}>
                    {userDisplayName}
                  </div>
                  <div className="flex items-center justify-end gap-1 mt-0.5 flex-wrap">
                    {isAdmin ? (
                      <span className="inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] font-black text-cyan-800 bg-cyan-100/80 px-1.5 sm:px-2 py-0.2 sm:py-0.5 rounded-md border border-cyan-300">
                        <ShieldCheck className="w-2.5 h-2.5 text-cyan-600" />
                        {t.roleAdmin} • Toutes filières
                      </span>
                    ) : currentUser.role === 'consultation' ? (
                      <span className="inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] font-black text-amber-800 bg-amber-100/80 px-1.5 sm:px-2 py-0.2 sm:py-0.5 rounded-md border border-amber-300">
                        👁️ Consultation
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] font-black text-[#0a1a44] bg-cyan-50 px-1.5 sm:px-2 py-0.2 sm:py-0.5 rounded-md border border-cyan-200">
                        <UserIcon className="w-2.5 h-2.5 text-[#02b3bb]" />
                        {t.roleAnimateur}
                      </span>
                    )}
                  </div>
                  {/* Assigned filières / classes tags for non-admins */}
                  {!isAdmin && (assignedFilieresNames.length > 0 || assignedClassesNames.length > 0) && (
                    <div 
                      className="hidden sm:flex items-center justify-end gap-1 mt-1 text-[9px] text-slate-500 truncate max-w-[200px]"
                      title={`Filières: ${assignedFilieresNames.join(', ')} | Classes: ${assignedClassesNames.join(', ')}`}
                    >
                      <span className="text-[#02b3bb] font-bold truncate">
                        {assignedFilieresNames.join(', ')}
                      </span>
                      {assignedClassesNames.length > 0 && (
                        <span className="text-slate-400 font-semibold truncate">
                          ({assignedClassesNames.join(', ')})
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* User Avatar Circle */}
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#0a1a44] text-[#57e4ff] font-black text-xs sm:text-sm ring-2 ring-[#02b3bb]/20 shadow-2xs flex items-center justify-center shrink-0 border border-[#02b3bb]/30">
                  {currentUser.nomComplet.charAt(0)}
                </div>

                {/* 🚪 Déconnexion Button (Tactile + Icon + Text) */}
                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold text-rose-700 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 hover:border-rose-600 transition-all shadow-2xs cursor-pointer active:scale-95"
                  title={t.logout}
                  aria-label={t.logout}
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-600 hover:text-white shrink-0" />
                  <span className="hidden sm:inline">Déconnexion</span>
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </header>
  );
};

