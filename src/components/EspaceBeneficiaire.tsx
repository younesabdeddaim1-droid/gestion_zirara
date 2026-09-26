import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Beneficiaire, Seance, AbsenceRecord, Convocation, Classe, Filiere } from '../types';
import cmedLogo from '../assets/images/cmed_logo.jpeg';
import {
  LayoutDashboard,
  User as UserIcon,
  CalendarDays,
  CheckCircle2,
  XCircle,
  Ticket,
  FileText,
  Bell,
  KeyRound,
  LogOut,
  Clock,
  ShieldCheck,
  School,
  Lock,
  Eye,
  EyeOff,
  Printer,
  Download,
  AlertCircle,
  MapPin,
  Phone,
  Calendar,
  Sparkles,
  BookOpen,
  Check,
  ChevronRight,
  Menu,
  X,
  FileCheck,
  Info,
  Award
} from 'lucide-react';

type BeneficiaireTab =
  | 'dashboard'
  | 'profil'
  | 'planning'
  | 'presences'
  | 'absences'
  | 'billets'
  | 'documents'
  | 'notifications'
  | 'password';

export const EspaceBeneficiaire: React.FC = () => {
  const { currentUser, logout, changeUserPassword } = useAuth();
  const {
    beneficiaires,
    seances,
    absences,
    convocations,
    billetsRetard,
    openPrintModal,
    filieres,
    classes,
    motifs,
    settings,
    isRtl,
    language,
    setLanguage,
    updateBeneficiaire,
    showToast
  } = useApp();

  const [activeTab, setActiveTab] = useState<BeneficiaireTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Password change state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Profile editable fields
  const [editPhone, setEditPhone] = useState('');
  const [editPhone2, setEditPhone2] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [isEditingContact, setIsEditingContact] = useState(false);

  // Document modal preview
  const [previewDoc, setPreviewDoc] = useState<'attestation' | 'releve' | 'billet' | null>(null);
  const [selectedBilletForPrint, setSelectedBilletForPrint] = useState<Convocation | null>(null);

  // Day filter for planning
  const [selectedDay, setSelectedDay] = useState<string>('all');

  // Absence filter
  const [absenceFilter, setAbsenceFilter] = useState<'all' | 'unjustified' | 'justified' | 'retard'>('all');

  // Find linked Beneficiaire record
  const beneficiaire = useMemo<Beneficiaire>(() => {
    if (currentUser) {
      if (currentUser.beneficiaireId) {
        const found = beneficiaires.find(b => b.id === currentUser.beneficiaireId);
        if (found) return found;
      }
      if (currentUser.codeMassar) {
        const found = beneficiaires.find(
          b => b.codeMassar.toLowerCase() === currentUser.codeMassar?.toLowerCase()
        );
        if (found) return found;
      }
      const foundByEmail = beneficiaires.find(
        b => currentUser.email && b.codeMassar.toLowerCase() === currentUser.email.split('@')[0].toLowerCase()
      );
      if (foundByEmail) return foundByEmail;
    }

    // Safe fallback matching current user info
    return {
      id: currentUser?.beneficiaireId || 'ben-current',
      numeroInscription: '001/26',
      codeMassar: currentUser?.codeMassar || 'M130000000',
      nomFr: currentUser?.nom || 'BENNANI',
      prenomFr: currentUser?.prenom || 'Apprenant',
      nomAr: currentUser?.nomCompletAr || 'متعلم',
      prenomAr: '',
      sexe: 'F',
      dateNaissance: '2008-05-14',
      lieuNaissance: 'Zirara',
      telephone: currentUser?.telephone || '+212 6 00 00 00 00',
      niveau: '3 Collège',
      filiereId: currentUser?.filiereId || 'fil-inf',
      classeId: currentUser?.classeId || 'cls-inf-1',
      statut: 'Actif',
      observation: '',
      adresse: 'Zirara, Sidi Kacem',
      dateInscription: '2026-09-01',
      photoUrl: currentUser?.avatar
    };
  }, [currentUser, beneficiaires]);

  // Sync edit form on load
  React.useEffect(() => {
    if (beneficiaire) {
      setEditPhone(beneficiaire.telephone || '');
      setEditPhone2(beneficiaire.telephone2 || '');
      setEditAddress(beneficiaire.adresse || '');
    }
  }, [beneficiaire]);

  // Associated Filière & Classe
  const currentFiliere = useMemo(() => {
    return filieres.find(f => f.id === beneficiaire.filiereId);
  }, [filieres, beneficiaire.filiereId]);

  const currentClasse = useMemo(() => {
    return classes.find(c => c.id === beneficiaire.classeId);
  }, [classes, beneficiaire.classeId]);

  // Beneficiary sessions (filtered by their classe)
  const mySeances = useMemo(() => {
    return seances.filter(s => {
      if (s.classeIds && s.classeIds.length > 0) {
        return s.classeIds.includes(beneficiaire.classeId);
      }
      return s.classeId === beneficiaire.classeId;
    });
  }, [seances, beneficiaire.classeId]);

  // Beneficiary absences and attendance records
  const myAbsenceRecords = useMemo(() => {
    return absences.filter(a => a.beneficiaireId === beneficiaire.id);
  }, [absences, beneficiaire.id]);

  const myPresences = useMemo(() => {
    return myAbsenceRecords.filter(a => a.statut === 'Present');
  }, [myAbsenceRecords]);

  const myAbsences = useMemo(() => {
    return myAbsenceRecords.filter(a => a.statut !== 'Present');
  }, [myAbsenceRecords]);

  const myConvocations = useMemo(() => {
    return convocations.filter(c => c.beneficiaireId === beneficiaire.id);
  }, [convocations, beneficiaire.id]);

  const myBilletsRetard = useMemo(() => {
    return billetsRetard.filter(b => b.beneficiaireId === beneficiaire.id);
  }, [billetsRetard, beneficiaire.id]);

  // Statistics
  const stats = useMemo(() => {
    const totalRecorded = myAbsenceRecords.length;
    const presents = myPresences.length;
    const absents = myAbsences.filter(a => a.statut === 'Absent').length;
    const retards = myAbsences.filter(a => a.statut === 'Retard').length;
    const infractions = myAbsences.filter(a => a.statut === 'Infraction').length;
    const justifiees = myAbsences.filter(a => a.justifie).length;
    const nonJustifiees = myAbsences.filter(a => !a.justifie && a.statut === 'Absent').length;
    const tauxPresence = totalRecorded > 0 ? Math.round((presents / totalRecorded) * 100) : 100;
    const billetsDelivres = myConvocations.length;
    const billetsRetardCount = myBilletsRetard.length;

    return {
      totalRecorded,
      presents,
      absents,
      retards,
      infractions,
      justifiees,
      nonJustifiees,
      tauxPresence,
      billetsDelivres,
      billetsRetardCount
    };
  }, [myAbsenceRecords, myPresences, myAbsences, myConvocations, myBilletsRetard]);

  // Handle saving contact updates
  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (beneficiaire && updateBeneficiaire) {
      updateBeneficiaire({
        ...beneficiaire,
        telephone: editPhone.trim(),
        telephone2: editPhone2.trim() || undefined,
        adresse: editAddress.trim()
      });
      setIsEditingContact(false);
      showToast({
        title: 'Profil mis à jour',
        message: 'Vos coordonnées ont été enregistrées avec succès.',
        type: 'success'
      });
    }
  };

  // Handle password change
  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (!oldPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setPasswordMsg({ type: 'error', text: 'Veuillez remplir tous les champs.' });
      return;
    }

    if (newPassword.trim() !== confirmPassword.trim()) {
      setPasswordMsg({ type: 'error', text: 'Le nouveau mot de passe et sa confirmation ne correspondent pas.' });
      return;
    }

    if (newPassword.trim().length < 4) {
      setPasswordMsg({ type: 'error', text: 'Le mot de passe doit comporter au moins 4 caractères.' });
      return;
    }

    if (currentUser) {
      const res = await changeUserPassword(currentUser.id, oldPassword, newPassword);
      if (res.success) {
        setPasswordMsg({ type: 'success', text: 'Votre mot de passe a été modifié avec succès.' });
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        showToast({
          title: 'Sécurité',
          message: 'Mot de passe modifié avec succès.',
          type: 'success'
        });
      } else {
        setPasswordMsg({ type: 'error', text: res.message });
      }
    }
  };

  // Day filter options
  const daysList = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

  const filteredPlanning = useMemo(() => {
    if (selectedDay === 'all') return mySeances;
    return mySeances.filter(s => s.jour === selectedDay);
  }, [mySeances, selectedDay]);

  const filteredAbsences = useMemo(() => {
    if (absenceFilter === 'all') return myAbsences;
    if (absenceFilter === 'unjustified') return myAbsences.filter(a => !a.justifie && a.statut === 'Absent');
    if (absenceFilter === 'justified') return myAbsences.filter(a => a.justifie);
    if (absenceFilter === 'retard') return myAbsences.filter(a => a.statut === 'Retard');
    return myAbsences;
  }, [myAbsences, absenceFilter]);

  // Notifications feed
  const notificationsList = useMemo(() => {
    const list: Array<{ id: string; title: string; desc: string; date: string; type: 'info' | 'warning' | 'success' }> = [];
    
    // Recent absences notices
    myAbsences.forEach(a => {
      list.push({
        id: `notif-abs-${a.id}`,
        title: a.statut === 'Retard' ? 'Retard enregistré' : 'Absence enregistrée',
        desc: `Séance : ${a.seanceId}. Statut : ${a.justifie ? 'Justifiée' : 'Non justifiée'}.`,
        date: a.dateSaisie,
        type: a.justifie ? 'info' : 'warning'
      });
    });

    // Recent entry slips
    myConvocations.forEach(c => {
      list.push({
        id: `notif-cnv-${c.id}`,
        title: "Billet d'entrée délivré",
        desc: `${c.motif} - Décision : ${c.decision || 'Autorisé en classe'}.`,
        date: c.dateConvocation,
        type: 'success'
      });
    });

    // Welcome notice
    list.push({
      id: 'notif-welcome',
      title: 'Bienvenue sur votre portail apprenant',
      desc: 'Consultez votre emploi du temps, vos présences et vos attestations à tout moment.',
      date: '2026-09-01',
      type: 'info'
    });

    return list;
  }, [myAbsences, myConvocations]);

  // Navigation Items
  const navItems = [
    { id: 'dashboard' as BeneficiaireTab, label: 'Tableau de bord', labelAr: 'لوحة القيادة', icon: LayoutDashboard, badge: null },
    { id: 'profil' as BeneficiaireTab, label: 'Mon profil', labelAr: 'ملفي الشخصي', icon: UserIcon, badge: null },
    { id: 'planning' as BeneficiaireTab, label: 'Mon planning', labelAr: 'جدول حصصي', icon: CalendarDays, badge: `${mySeances.length} cours` },
    { id: 'presences' as BeneficiaireTab, label: 'Mes présences', labelAr: 'حصص الحضور', icon: CheckCircle2, badge: `${stats.presents}` },
    { id: 'absences' as BeneficiaireTab, label: 'Mes absences', labelAr: 'سجل الغياب', icon: XCircle, badge: stats.nonJustifiees > 0 ? `${stats.nonJustifiees} NJ` : null, badgeColor: 'bg-rose-500 text-white' },
    { id: 'billets' as BeneficiaireTab, label: "Billets d'entrée", labelAr: 'أذونات الدخول', icon: Ticket, badge: stats.billetsDelivres > 0 ? `${stats.billetsDelivres}` : null },
    { id: 'documents' as BeneficiaireTab, label: 'Mes documents', labelAr: 'وثائقي الإدارية', icon: FileText, badge: null },
    { id: 'notifications' as BeneficiaireTab, label: 'Notifications', labelAr: 'الإشعارات', icon: Bell, badge: notificationsList.length > 0 ? `${notificationsList.length}` : null },
    { id: 'password' as BeneficiaireTab, label: 'Modifier mot de passe', labelAr: 'تغيير كلمة المرور', icon: KeyRound, badge: null }
  ];

  return (
    <div className={`min-h-screen flex flex-col bg-gradient-to-br from-[#f8fafc] via-[#f0f9ff]/40 to-[#eef6ff] text-[#0a1a44] ${isRtl ? 'font-sans' : 'font-sans'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* 2026 Tech Turquoise & Indigo Background Accents */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0 no-print" aria-hidden="true">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#57e4ff] opacity-15 blur-3xl" />
        <div className="absolute top-1/2 -left-32 w-96 h-96 rounded-full bg-[#0a1a44] opacity-10 blur-3xl" />
        <div className="absolute -bottom-32 right-1/3 w-80 h-80 rounded-full bg-[#02b3bb] opacity-15 blur-3xl" />
      </div>

      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20 gap-3">
            {/* Left: Mobile hamburger & CMED Brand */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(prev => !prev)}
                className="lg:hidden p-2 rounded-2xl text-[#0a1a44] hover:bg-cyan-50 border border-slate-200 transition-colors"
                title="Menu"
              >
                <Menu className="w-5 h-5 text-[#0a1a44]" />
              </button>

              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white p-1 flex items-center justify-center shrink-0 border border-cyan-200/90 shadow-2xs">
                <img
                  src={cmedLogo}
                  alt="CMED"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-900 uppercase tracking-wider">
                    Espace Bénéficiaire
                  </span>
                  <span className="hidden sm:inline-block text-[10px] text-slate-400 font-bold">
                    Année {settings.anneeScolaireCourante || '2026-2027'}
                  </span>
                </div>
                <h1 className="text-xs sm:text-sm font-black text-[#0a1a44] truncate tracking-tight">
                  Centre Deuxième Chance – Nouvelle Génération Zirara
                </h1>
              </div>
            </div>

            {/* Right: Beneficiary profile chip + Logout */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Language toggle */}
              <button
                type="button"
                onClick={() => setLanguage(language === 'fr' ? 'ar' : 'fr')}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:text-[#02b3bb] hover:bg-cyan-50 transition-colors cursor-pointer"
                title="Changer de langue"
              >
                {language === 'fr' ? 'العربية' : 'Français'}
              </button>

              {/* Notification icon button */}
              <button
                type="button"
                onClick={() => setActiveTab('notifications')}
                className="p-2 sm:p-2.5 rounded-2xl border border-slate-200 text-slate-600 hover:text-[#02b3bb] hover:bg-cyan-50 relative transition-colors cursor-pointer"
                title="Mes notifications"
              >
                <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                {notificationsList.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-cyan-600 text-white text-[9px] font-black flex items-center justify-center animate-pulse">
                    {notificationsList.length}
                  </span>
                )}
              </button>

              {/* User Chip */}
              <div className="hidden md:flex items-center gap-2.5 pl-3 border-l border-slate-200">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#02b3bb] to-[#0a1a44] text-white flex items-center justify-center font-black text-xs shadow-2xs overflow-hidden">
                  {beneficiaire.photoUrl ? (
                    <img src={beneficiaire.photoUrl} alt="Photo" className="w-full h-full object-cover" />
                  ) : (
                    <span>{beneficiaire.prenomFr[0]}{beneficiaire.nomFr[0]}</span>
                  )}
                </div>
                <div className="text-left text-xs">
                  <div className="font-black text-[#0a1a44] truncate max-w-[140px]">
                    {beneficiaire.prenomFr} {beneficiaire.nomFr}
                  </div>
                  <div className="text-[10px] text-cyan-700 font-mono font-bold">
                    {beneficiaire.codeMassar}
                  </div>
                </div>
              </div>

              {/* Logout button */}
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-bold transition-all cursor-pointer"
                title="Se déconnecter"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Déconnexion</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 flex gap-6 relative z-10">
        
        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Dedicated Beneficiary Navigation Sidebar */}
        <aside
          className={`fixed lg:static top-0 bottom-0 z-40 bg-[#0a1a44] text-white flex flex-col shrink-0 transition-transform duration-300 w-72 lg:w-64 rounded-3xl p-4 shadow-xl border border-slate-800 ${
            isRtl ? 'right-0' : 'left-0'
          } ${
            mobileMenuOpen ? 'translate-x-0' : isRtl ? 'translate-x-full lg:translate-x-0' : '-translate-x-full lg:translate-x-0'
          } lg:h-[calc(100vh-8rem)] lg:sticky lg:top-24`}
        >
          {/* Mobile close */}
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-700/60 lg:hidden">
            <span className="text-xs font-black uppercase text-[#57e4ff]">Menu Bénéficiaire</span>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Profile mini-card */}
          <div className="p-3 rounded-2xl bg-slate-800/70 border border-slate-700/70 mb-4 flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 flex items-center justify-center font-black text-sm shrink-0 overflow-hidden">
              {beneficiaire.photoUrl ? (
                <img src={beneficiaire.photoUrl} alt="Photo" className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-black text-white truncate">
                {beneficiaire.prenomFr} {beneficiaire.nomFr}
              </div>
              <div className="text-[10px] text-cyan-300 font-mono font-bold truncate">
                {beneficiaire.codeMassar}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {currentClasse?.nomFr || 'Classe A'}
              </div>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="space-y-1.5 flex-1 overflow-y-auto pr-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-[#02b3bb] to-[#0891b2] text-white shadow-md shadow-cyan-900/30'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-cyan-400'}`} />
                    <span className="truncate">{language === 'ar' ? item.labelAr : item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[9px] font-black px-1.5 py-0.5 rounded-md shrink-0 ${
                        item.badgeColor || (isActive ? 'bg-white/20 text-white' : 'bg-cyan-500/20 text-cyan-300')
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Bottom Security Info & Logout */}
          <div className="pt-3 border-t border-slate-800 mt-2">
            <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-[10px] text-slate-400 mb-2">
              <div className="flex items-center gap-1.5 text-cyan-400 font-bold mb-0.5">
                <Lock className="w-3 h-3" />
                <span>Espace sécurisé</span>
              </div>
              <span>Accès strictement réservé à vos données personnelles.</span>
            </div>

            <button
              type="button"
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 p-2.5 rounded-2xl text-xs font-bold text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 border border-rose-900/40 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Déconnexion</span>
            </button>
          </div>
        </aside>

        {/* Dynamic Content View */}
        <main className="flex-1 min-w-0 space-y-6">
          
          {/* ================= TAB 1: TABLEAU DE BORD ================= */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Welcome Banner */}
              <div className="bg-gradient-to-r from-[#0a1a44] via-[#0f2862] to-[#02b3bb] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-white/10 to-transparent pointer-events-none" />
                <div className="relative z-10 max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs text-xs font-bold text-cyan-200 mb-3 border border-white/20">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                    <span>Portail de l'apprenant – Centre Deuxième Chance Zirara</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                    Bonjour, {beneficiaire.prenomFr} {beneficiaire.nomFr} !
                  </h2>
                  <p className="text-xs sm:text-sm text-cyan-100 mt-1 leading-relaxed">
                    Filière : <span className="font-bold text-white">{currentFiliere?.nomFr || 'Informatique'}</span> • Classe : <span className="font-bold text-white">{currentClasse?.nomFr || 'Groupe 1'}</span>
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-2.5 py-1 rounded-xl bg-white/20 text-white font-mono font-bold">
                      Code Massar : {beneficiaire.codeMassar}
                    </span>
                    <span className="px-2.5 py-1 rounded-xl bg-white/20 text-white font-mono font-bold">
                      N° Inscription : {beneficiaire.numeroInscription || '001/26'}
                    </span>
                    <span className="px-2.5 py-1 rounded-xl bg-emerald-500/30 text-emerald-200 font-bold border border-emerald-400/40">
                      Statut : {beneficiaire.statut}
                    </span>
                  </div>
                </div>
              </div>

              {/* KPI Cards Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4">
                {/* Taux de présence */}
                <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-600">Assiduité</span>
                    <Award className="w-5 h-5 text-cyan-600" />
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-black text-[#0a1a44]">
                      {stats.tauxPresence}%
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-cyan-500 to-emerald-500 h-2 rounded-full"
                        style={{ width: `${stats.tauxPresence}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold mt-1.5">
                      {stats.presents} / {stats.totalRecorded} séances suivies
                    </p>
                  </div>
                </div>

                {/* Présences */}
                <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-700">Présences</span>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-black text-emerald-700">
                      {stats.presents}
                    </div>
                    <p className="text-[10px] text-emerald-600 font-bold mt-1">
                      Séances validées
                    </p>
                  </div>
                </div>

                {/* Absences */}
                <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-rose-700">Absences</span>
                    <XCircle className="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-black text-rose-700">
                      {stats.absents}
                    </div>
                    <p className="text-[10px] text-rose-600 font-bold mt-1">
                      {stats.justifiees} justifiées • {stats.nonJustifiees} non justifiées
                    </p>
                  </div>
                </div>

                {/* Billets d'entrée */}
                <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-cyan-700">Billets</span>
                    <Ticket className="w-5 h-5 text-cyan-600" />
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-black text-cyan-800">
                      {stats.billetsDelivres}
                    </div>
                    <p className="text-[10px] text-cyan-700 font-bold mt-1">
                      Autorisations de reprise
                    </p>
                  </div>
                </div>
              </div>

              {/* Today / Upcoming Classes Preview */}
              <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-[#02b3bb]" />
                    <h3 className="text-sm sm:text-base font-black text-[#0a1a44]">
                      Aperçu de mes cours hebdomadaires
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('planning')}
                    className="text-xs font-bold text-cyan-700 hover:text-cyan-900 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>Voir tout mon planning</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {mySeances.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    Aucune séance programmée pour cette classe actuellement.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {mySeances.slice(0, 4).map(seance => (
                      <div
                        key={seance.id}
                        className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-cyan-50/60 transition-colors flex items-center justify-between"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-black text-[#0a1a44] truncate">
                            {seance.intitule}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                            <span className="font-bold text-cyan-800">{seance.jour || 'Lundi'}</span>
                            <span>•</span>
                            <span className="font-mono text-slate-600">{seance.heureDebut} – {seance.heureFin}</span>
                            {seance.salle && (
                              <>
                                <span>•</span>
                                <span className="text-slate-500 truncate">{seance.salle}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-cyan-100 text-cyan-900 shrink-0">
                          Programmée
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Actions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('documents')}
                  className="p-4 rounded-3xl bg-white border border-slate-200/90 hover:border-cyan-400 hover:shadow-md transition-all text-left group cursor-pointer"
                >
                  <FileText className="w-6 h-6 text-cyan-600 mb-2 group-hover:scale-110 transition-transform" />
                  <div className="text-xs font-black text-[#0a1a44]">Télécharger mes attestations</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Certificat de scolarité & relevé d'assiduité</div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('absences')}
                  className="p-4 rounded-3xl bg-white border border-slate-200/90 hover:border-cyan-400 hover:shadow-md transition-all text-left group cursor-pointer"
                >
                  <XCircle className="w-6 h-6 text-rose-600 mb-2 group-hover:scale-110 transition-transform" />
                  <div className="text-xs font-black text-[#0a1a44]">Suivi des absences</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Vérifier les justifications et retards</div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('password')}
                  className="p-4 rounded-3xl bg-white border border-slate-200/90 hover:border-cyan-400 hover:shadow-md transition-all text-left group cursor-pointer"
                >
                  <KeyRound className="w-6 h-6 text-emerald-600 mb-2 group-hover:scale-110 transition-transform" />
                  <div className="text-xs font-black text-[#0a1a44]">Sécurité & Mot de passe</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Mettre à jour mon mot de passe personnel</div>
                </button>
              </div>
            </div>
          )}

          {/* ================= TAB 2: MON PROFIL ================= */}
          {activeTab === 'profil' && (
            <div className="space-y-6">
              {/* Profile Card */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 pb-6 border-b border-slate-100">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br from-[#02b3bb] to-[#0a1a44] p-1 shrink-0 shadow-md">
                    <div className="w-full h-full rounded-[22px] bg-white overflow-hidden flex items-center justify-center">
                      {beneficiaire.photoUrl ? (
                        <img src={beneficiaire.photoUrl} alt="Photo" className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="w-12 h-12 text-[#02b3bb]" />
                      )}
                    </div>
                  </div>

                  <div className="flex-1 text-center sm:text-left min-w-0">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <h2 className="text-xl sm:text-2xl font-black text-[#0a1a44]">
                        {beneficiaire.prenomFr} {beneficiaire.nomFr}
                      </h2>
                      {beneficiaire.prenomAr && (
                        <span className="text-lg font-bold text-slate-600" dir="rtl">
                          ({beneficiaire.prenomAr} {beneficiaire.nomAr})
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-mono font-bold text-[#02b3bb] mt-1">
                      Code Massar : {beneficiaire.codeMassar} • N° Inscription : {beneficiaire.numeroInscription || '001/26'}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <span className="px-3 py-1 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-900 text-xs font-bold">
                        {currentFiliere?.nomFr || 'Filière'}
                      </span>
                      <span className="px-3 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold">
                        {currentClasse?.nomFr || 'Classe'}
                      </span>
                      <span className="px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                        Statut : {beneficiaire.statut}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Important Security Notice Banner */}
                <div className="mt-6 p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
                  <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-black text-amber-900">Données académiques verrouillées</div>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      Votre Code Massar, votre Filière et votre Classe sont gérés exclusivement par la direction du Centre Deuxième Chance Zirara et ne sont pas modifiables directement.
                    </p>
                  </div>
                </div>

                {/* Information Sections Grid */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Academic locked info */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <School className="w-4 h-4 text-[#02b3bb]" />
                      <span>Informations scolaires & inscription</span>
                    </h3>

                    <div className="space-y-3 bg-slate-50/70 p-4 rounded-2xl border border-slate-200">
                      <div>
                        <span className="text-[10px] font-black uppercase text-slate-400 block">Code Massar (Verrouillé)</span>
                        <div className="text-xs font-mono font-bold text-[#0a1a44] mt-0.5 flex items-center justify-between">
                          <span>{beneficiaire.codeMassar}</span>
                          <Lock className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-black uppercase text-slate-400 block">Filière de formation (Verrouillée)</span>
                        <div className="text-xs font-bold text-[#0a1a44] mt-0.5 flex items-center justify-between">
                          <span>{currentFiliere?.nomFr} ({currentFiliere?.code})</span>
                          <Lock className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-black uppercase text-slate-400 block">Classe / Groupe (Verrouillé)</span>
                        <div className="text-xs font-bold text-[#0a1a44] mt-0.5 flex items-center justify-between">
                          <span>{currentClasse?.nomFr} ({currentClasse?.anneeScolaire})</span>
                          <Lock className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-black uppercase text-slate-400 block">Niveau d'origine</span>
                        <div className="text-xs font-bold text-[#0a1a44] mt-0.5">
                          {beneficiaire.niveau || '3 Collège'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Personal & Contact info */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <UserIcon className="w-4 h-4 text-[#02b3bb]" />
                        <span>État civil & Coordonnées</span>
                      </h3>
                      {!isEditingContact && (
                        <button
                          type="button"
                          onClick={() => setIsEditingContact(true)}
                          className="text-xs font-bold text-[#02b3bb] hover:underline cursor-pointer"
                        >
                          Modifier mes coordonnées
                        </button>
                      )}
                    </div>

                    <form onSubmit={handleSaveContact} className="space-y-3 bg-slate-50/70 p-4 rounded-2xl border border-slate-200">
                      <div>
                        <span className="text-[10px] font-black uppercase text-slate-400 block">Date et lieu de naissance</span>
                        <div className="text-xs font-bold text-[#0a1a44] mt-0.5">
                          {beneficiaire.dateNaissance} à {beneficiaire.lieuNaissance || 'Zirara'}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-black uppercase text-slate-400 block">Sexe</span>
                        <div className="text-xs font-bold text-[#0a1a44] mt-0.5">
                          {beneficiaire.sexe === 'F' ? 'Féminin' : 'Masculin'}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-black uppercase text-slate-400 block">Téléphone 1 (Principal)</span>
                        {isEditingContact ? (
                          <input
                            type="text"
                            value={editPhone}
                            onChange={e => setEditPhone(e.target.value)}
                            className="mt-1 w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#02b3bb] bg-white font-semibold font-mono"
                            placeholder="ex: 0612345678"
                          />
                        ) : (
                          <div className="text-xs font-bold text-[#0a1a44] mt-0.5 flex items-center justify-between">
                            <div className="flex items-center gap-1.5 font-mono">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              <span>{beneficiaire.telephone || 'Non renseigné'}</span>
                            </div>
                            {beneficiaire.telephone && (
                              <a
                                href={`tel:${beneficiaire.telephone}`}
                                className="text-[10px] text-cyan-700 font-bold hover:underline"
                              >
                                Appeler
                              </a>
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        <span className="text-[10px] font-black uppercase text-emerald-700 flex items-center gap-1">
                          <span>💬</span>
                          <span>Téléphone 2 / WhatsApp</span>
                        </span>
                        {isEditingContact ? (
                          <input
                            type="text"
                            value={editPhone2}
                            onChange={e => setEditPhone2(e.target.value)}
                            className="mt-1 w-full px-3 py-2 text-xs rounded-xl border border-emerald-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-emerald-50/20 font-semibold font-mono"
                            placeholder="ex: 06XXXXXXXX ou 07XXXXXXXX"
                          />
                        ) : (
                          <div className="text-xs font-bold text-emerald-950 mt-0.5 flex items-center justify-between">
                            <div className="flex items-center gap-1.5 font-mono">
                              <span className="text-emerald-600">💬</span>
                              <span>{beneficiaire.telephone2 || 'Non renseigné'}</span>
                            </div>
                            {beneficiaire.telephone2 && (
                              <a
                                href={`https://wa.me/212${beneficiaire.telephone2.replace(/[^0-9]/g, '').replace(/^0/, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2 py-0.5 rounded-lg bg-[#25D366] text-white text-[10px] font-black hover:bg-[#20ba5a] transition-colors"
                              >
                                WhatsApp
                              </a>
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        <span className="text-[10px] font-black uppercase text-slate-400 block">Adresse de résidence</span>
                        {isEditingContact ? (
                          <input
                            type="text"
                            value={editAddress}
                            onChange={e => setEditAddress(e.target.value)}
                            className="mt-1 w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#02b3bb] bg-white font-semibold"
                            placeholder="Adresse..."
                          />
                        ) : (
                          <div className="text-xs font-bold text-[#0a1a44] mt-0.5 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>{beneficiaire.adresse || 'Zirara, Sidi Kacem'}</span>
                          </div>
                        )}
                      </div>

                      {isEditingContact && (
                        <div className="pt-2 flex items-center gap-2">
                          <button
                            type="submit"
                            className="px-3 py-1.5 rounded-xl bg-[#02b3bb] text-white text-xs font-bold hover:bg-[#0099a8] transition-colors cursor-pointer"
                          >
                            Enregistrer
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsEditingContact(false)}
                            className="px-3 py-1.5 rounded-xl bg-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-300 transition-colors cursor-pointer"
                          >
                            Annuler
                          </button>
                        </div>
                      )}
                    </form>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 3: MON PLANNING ================= */}
          {activeTab === 'planning' && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-lg font-black text-[#0a1a44] flex items-center gap-2">
                      <CalendarDays className="w-5 h-5 text-[#02b3bb]" />
                      <span>Mon emploi du temps hebdomadaire</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Classe : <span className="font-bold text-[#0a1a44]">{currentClasse?.nomFr}</span> • Filière : <span className="font-bold text-[#0a1a44]">{currentFiliere?.nomFr}</span>
                    </p>
                  </div>

                  {/* Day filter pills */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedDay('all')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        selectedDay === 'all'
                          ? 'bg-[#02b3bb] text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Toute la semaine
                    </button>
                    {daysList.map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setSelectedDay(d)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          selectedDay === d
                            ? 'bg-[#02b3bb] text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sessions list */}
                <div className="mt-5 space-y-3">
                  {filteredPlanning.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs">
                      Aucune séance programmée pour {selectedDay === 'all' ? 'cette classe' : selectedDay}.
                    </div>
                  ) : (
                    filteredPlanning.map(s => (
                      <div
                        key={s.id}
                        className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-[#02b3bb] hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-3.5">
                          <div className="w-10 h-10 rounded-2xl bg-cyan-50 border border-cyan-200 text-cyan-900 flex items-center justify-center font-black text-xs shrink-0">
                            {s.jour ? s.jour.substring(0, 3) : 'Lun'}
                          </div>
                          <div>
                            <div className="text-sm font-black text-[#0a1a44]">
                              {s.intitule}
                            </div>
                            {s.intituleAr && (
                              <div className="text-xs text-slate-500 font-bold" dir="rtl">
                                {s.intituleAr}
                              </div>
                            )}
                            <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                              <span className="font-bold text-cyan-800">{s.jour || 'Lundi'}</span>
                              <span>•</span>
                              <span className="font-mono font-semibold text-slate-700">{s.heureDebut} – {s.heureFin}</span>
                              {s.salle && (
                                <>
                                  <span>•</span>
                                  <span className="text-slate-600">{s.salle}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 sm:self-center">
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Séance obligatoire
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 4: MES PRÉSENCES ================= */}
          {activeTab === 'presences' && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-lg font-black text-[#0a1a44] flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span>Historique de mes présences</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Total validé : <span className="font-bold text-emerald-700">{myPresences.length} présences</span> ({stats.tauxPresence}% d'assiduité)
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-2.5">
                  {myPresences.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs">
                      Aucune présence enregistrée pour le moment.
                    </div>
                  ) : (
                    myPresences.map(rec => (
                      <div
                        key={rec.id}
                        className="p-3.5 rounded-2xl border border-slate-200 bg-emerald-50/40 hover:bg-emerald-50/80 transition-colors flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                            <Check className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-black text-[#0a1a44]">
                              Présence confirmée
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              Date : <span className="font-bold text-slate-700">{rec.dateSaisie}</span> • Séance : <span className="font-mono">{rec.seanceId}</span>
                            </div>
                          </div>
                        </div>

                        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-lg bg-emerald-200/80 text-emerald-900 uppercase">
                          Présent
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 5: MES ABSENCES ================= */}
          {activeTab === 'absences' && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-lg font-black text-[#0a1a44] flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-rose-600" />
                      <span>Relevé de mes absences et retards</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {stats.absents} absence(s) • {stats.justifiees} justifiée(s) • {stats.nonJustifiees} non justifiée(s) • {stats.retards} retard(s)
                    </p>
                  </div>

                  {/* Filter tabs */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAbsenceFilter('all')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        absenceFilter === 'all' ? 'bg-[#0a1a44] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Toutes
                    </button>
                    <button
                      type="button"
                      onClick={() => setAbsenceFilter('unjustified')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        absenceFilter === 'unjustified' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Non justifiées ({stats.nonJustifiees})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAbsenceFilter('justified')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        absenceFilter === 'justified' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Justifiées ({stats.justifiees})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAbsenceFilter('retard')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        absenceFilter === 'retard' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Retards ({stats.retards})
                    </button>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {filteredAbsences.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs">
                      Aucune absence trouvée selon les critères sélectionnés.
                    </div>
                  ) : (
                    filteredAbsences.map(rec => {
                      const isJustified = rec.justifie;
                      const isRetard = rec.statut === 'Retard';

                      return (
                        <div
                          key={rec.id}
                          className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isJustified
                              ? 'border-emerald-200 bg-emerald-50/30'
                              : isRetard
                              ? 'border-amber-200 bg-amber-50/30'
                              : 'border-rose-200 bg-rose-50/40'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase ${
                                  isRetard
                                    ? 'bg-amber-100 text-amber-900'
                                    : isJustified
                                    ? 'bg-emerald-100 text-emerald-900'
                                    : 'bg-rose-100 text-rose-900'
                                }`}
                              >
                                {isRetard ? `Retard (${rec.dureeRetardMinutes || 15} min)` : 'Absent'}
                              </span>

                              <span className="text-xs font-bold text-[#0a1a44]">
                                Date : {rec.dateSaisie}
                              </span>
                            </div>

                            <div className="text-xs text-slate-600 mt-1">
                              Motif : <span className="font-bold text-slate-800">{rec.motifLabel || (isJustified ? 'Justifié' : 'Non justifié')}</span>
                              {rec.note && <span className="text-slate-500 italic ml-2">({rec.note})</span>}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`text-[10px] font-black px-2.5 py-1 rounded-xl ${
                                rec.statutValidation === 'Validée'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : rec.statutValidation === 'Refusée'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {rec.statutValidation || 'En attente'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 6: BILLETS DE RETARD & D'ENTRÉE ================= */}
          {activeTab === 'billets' && (
            <div className="space-y-6">
              {/* 1. Mes Billets de Retard Officiels */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
                <div className="pb-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black text-[#0a1a44] flex items-center gap-2">
                      <Clock className="w-5 h-5 text-amber-500" />
                      <span>Mes Billets de Retard — إذن الدخول إثر تأخر</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Générés et transmis automatiquement suite au pointage d'un retard en séance.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-200">
                    {myBilletsRetard.length} billet(s) de retard
                  </span>
                </div>

                <div className="mt-5 space-y-3">
                  {myBilletsRetard.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs bg-slate-50 rounded-2xl border border-slate-100">
                      <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-1" />
                      <p className="font-bold text-slate-700">Aucun billet de retard.</p>
                      <p className="text-slate-400 mt-0.5">Vous n'avez aucun retard enregistré sur vos séances.</p>
                    </div>
                  ) : (
                    myBilletsRetard.map(billet => (
                      <div
                        key={billet.id}
                        className="p-4 rounded-2xl border border-amber-200/90 bg-amber-50/40 hover:bg-amber-50/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-200 text-amber-950 uppercase font-mono">
                              🎫 Billet #{billet.id.substring(0, 10)}
                            </span>
                            <span className="text-xs font-bold text-slate-700">
                              📅 {billet.dateSeance} • ⏰ {billet.heureSeance}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full bg-amber-500 text-white shadow-2xs">
                              <Clock className="w-3 h-3" />
                              <span>{billet.dureeMinutes} min de retard</span>
                            </span>
                          </div>

                          <div className="text-xs text-slate-800">
                            <span className="text-slate-500 font-semibold">Motif : </span>
                            <strong className="text-amber-950">{billet.motif}</strong>
                            {billet.motifAr && <span className="text-slate-500 italic ml-1">({billet.motifAr})</span>}
                          </div>

                          <div className="text-[10px] text-slate-500 flex items-center gap-2">
                            <span>Scolarité : <strong>{billet.classeNom}</strong> ({billet.filiereNom})</span>
                            <span>•</span>
                            <span>Émis le : {billet.dateGeneration}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            openPrintModal('billet_retard', { billet });
                          }}
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-black shadow-xs transition-all cursor-pointer shrink-0"
                        >
                          <Printer className="w-4 h-4" />
                          <span>Télécharger / Imprimer PDF</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* 2. Mes Billets d'Entrée suite à absence / convocation */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
                <div className="pb-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black text-[#0a1a44] flex items-center gap-2">
                      <Ticket className="w-5 h-5 text-cyan-600" />
                      <span>Mes Billets d'entrée & autorisations de reprise</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Délivrés par l'administration du centre pour autoriser la reprise des cours après absence.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-cyan-100 text-cyan-900 border border-cyan-200">
                    {myConvocations.length} billet(s)
                  </span>
                </div>

                <div className="mt-5 space-y-3">
                  {myConvocations.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs bg-slate-50 rounded-2xl border border-slate-100">
                      Aucun billet d'entrée enregistré.
                    </div>
                  ) : (
                    myConvocations.map(billet => (
                      <div
                        key={billet.id}
                        className="p-4 rounded-2xl border border-cyan-200/90 bg-cyan-50/40 hover:bg-cyan-50/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-cyan-200 text-cyan-950 uppercase font-mono">
                              Billet #{billet.id.substring(0, 8)}
                            </span>
                            <span className="text-xs font-bold text-slate-600">
                              Date : {billet.dateConvocation}
                            </span>
                          </div>
                          <div className="text-xs font-black text-[#0a1a44] mt-1">
                            {billet.motif}
                          </div>
                          {billet.decision && (
                            <div className="text-xs text-emerald-800 font-semibold mt-0.5">
                              Décision : {billet.decision}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBilletForPrint(billet);
                            setPreviewDoc('billet');
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-cyan-300 text-cyan-900 hover:bg-cyan-100 text-xs font-bold transition-colors cursor-pointer shrink-0"
                        >
                          <Printer className="w-4 h-4 text-cyan-700" />
                          <span>Visualiser / Imprimer</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 7: MES DOCUMENTS ================= */}
          {activeTab === 'documents' && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
                <div className="pb-4 border-b border-slate-100">
                  <h2 className="text-lg font-black text-[#0a1a44] flex items-center gap-2">
                    <FileText className="w-5 h-5 text-cyan-600" />
                    <span>Mes documents officiels</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Téléchargez ou imprimez vos attestations et relevés officiels du Centre Deuxième Chance.
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Attestation d'inscription */}
                  <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between">
                    <div>
                      <div className="w-10 h-10 rounded-2xl bg-cyan-100 text-cyan-900 flex items-center justify-center font-bold mb-3">
                        <Award className="w-5 h-5" />
                      </div>
                      <h3 className="text-sm font-black text-[#0a1a44]">
                        Attestation d'inscription / Scolarité
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Certificat officiel attestant votre inscription au Centre Deuxième Chance Nouvelle Génération Zirara pour l'année courante.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPreviewDoc('attestation')}
                      className="mt-4 w-full py-2.5 px-3 rounded-xl bg-[#02b3bb] text-white hover:bg-[#0099a8] text-xs font-bold transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Visualiser & Imprimer</span>
                    </button>
                  </div>

                  {/* Relevé d'assiduité */}
                  <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between">
                    <div>
                      <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold mb-3">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <h3 className="text-sm font-black text-[#0a1a44]">
                        Relevé individuel d'assiduité
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Synthèse officielle de vos heures de présence, absences justifiées et taux de participation aux séances de formation.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPreviewDoc('releve')}
                      className="mt-4 w-full py-2.5 px-3 rounded-xl bg-[#0a1a44] text-white hover:bg-slate-800 text-xs font-bold transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Visualiser & Imprimer</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 8: NOTIFICATIONS ================= */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
                <div className="pb-4 border-b border-slate-100">
                  <h2 className="text-lg font-black text-[#0a1a44] flex items-center gap-2">
                    <Bell className="w-5 h-5 text-cyan-600" />
                    <span>Notifications & Alertes</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Messages administratifs et alertes d'assiduité en temps réel.
                  </p>
                </div>

                <div className="mt-5 space-y-3">
                  {notificationsList.map(notif => (
                    <div
                      key={notif.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 flex items-start gap-3.5"
                    >
                      <div className="w-8 h-8 rounded-xl bg-cyan-100 text-cyan-900 flex items-center justify-center shrink-0 mt-0.5">
                        <Info className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-black text-[#0a1a44]">{notif.title}</h4>
                          <span className="text-[10px] text-slate-400 font-mono">{notif.date}</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">{notif.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 9: MODIFIER MOT DE PASSE ================= */}
          {activeTab === 'password' && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs max-w-xl">
                <div className="pb-4 border-b border-slate-100">
                  <h2 className="text-lg font-black text-[#0a1a44] flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-emerald-600" />
                    <span>Modifier mon mot de passe</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Assurez la confidentialité de votre compte apprenant en choisissant un mot de passe sécurisé.
                  </p>
                </div>

                {passwordMsg && (
                  <div
                    className={`mt-4 p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                      passwordMsg.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{passwordMsg.text}</span>
                  </div>
                )}

                <form onSubmit={handleChangePasswordSubmit} className="mt-5 space-y-4">
                  {/* Ancien mot de passe */}
                  <div>
                    <label className="block text-xs font-black text-[#0a1a44] mb-1">
                      Ancien mot de passe
                    </label>
                    <div className="relative">
                      <input
                        type={showOldPass ? 'text' : 'password'}
                        required
                        value={oldPassword}
                        onChange={e => setOldPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#02b3bb] text-xs font-bold"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOldPass(!showOldPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showOldPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Nouveau mot de passe */}
                  <div>
                    <label className="block text-xs font-black text-[#0a1a44] mb-1">
                      Nouveau mot de passe
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPass ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#02b3bb] text-xs font-bold"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirmer nouveau mot de passe */}
                  <div>
                    <label className="block text-xs font-black text-[#0a1a44] mb-1">
                      Confirmer le nouveau mot de passe
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#02b3bb] text-xs font-bold"
                      placeholder="••••••••"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 px-4 rounded-2xl bg-[#02b3bb] text-white text-xs font-black hover:bg-[#0099a8] transition-colors shadow-md cursor-pointer mt-2"
                  >
                    Enregistrer le nouveau mot de passe
                  </button>
                </form>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ================= MODAL DE PRÉVISUALISATION ET IMPRESSION OFFICIELLE ================= */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 relative">
            <button
              type="button"
              onClick={() => {
                setPreviewDoc(null);
                setSelectedBilletForPrint(null);
              }}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Official Moroccan Certificate Header */}
            <div className="text-center pb-4 border-b-2 border-slate-800">
              <div className="w-16 h-16 mx-auto mb-2 bg-white p-1">
                <img src={cmedLogo} alt="CMED" className="w-full h-full object-contain" />
              </div>
              <h3 className="text-xs font-black uppercase text-slate-800">
                Royaume du Maroc • Ministère de l'Éducation Nationale
              </h3>
              <p className="text-[11px] font-bold text-slate-600">
                Direction Provinciale : {settings.directionProvincialeFr}
              </p>
              <p className="text-[11px] font-black text-cyan-800 uppercase">
                {settings.nomCentre || 'Centre Deuxième Chance Nouvelle Génération Zirara'}
              </p>
            </div>

            {/* Document Content */}
            <div className="py-6 space-y-4 text-xs">
              {previewDoc === 'attestation' && (
                <>
                  <div className="text-center py-2">
                    <span className="text-base font-black uppercase tracking-wider text-[#0a1a44] border-b-2 border-[#02b3bb] pb-1">
                      ATTESTATION DE SCOLARITÉ
                    </span>
                  </div>

                  <p className="text-slate-700 leading-relaxed text-sm">
                    Le Directeur du <strong>{settings.nomCentre}</strong> atteste par la présente que :
                  </p>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
                    <div>L'apprenant(e) : <strong>{beneficiaire.prenomFr} {beneficiaire.nomFr}</strong> ({beneficiaire.nomAr} {beneficiaire.prenomAr})</div>
                    <div>Né(e) le : <strong>{beneficiaire.dateNaissance}</strong> à <strong>{beneficiaire.lieuNaissance || 'Zirara'}</strong></div>
                    <div>Code Massar : <strong>{beneficiaire.codeMassar}</strong></div>
                    <div>N° Inscription : <strong>{beneficiaire.numeroInscription || '001/26'}</strong></div>
                    <div>Filière de formation : <strong>{currentFiliere?.nomFr}</strong></div>
                    <div>Classe / Groupe : <strong>{currentClasse?.nomFr}</strong></div>
                    <div>Année de formation : <strong>{settings.anneeScolaireCourante || '2026-2027'}</strong></div>
                  </div>

                  <p className="text-slate-700 text-xs mt-3">
                    Est régulièrement inscrit(e) et poursuit sa formation au sein du centre pour l'année scolaire 2026-2027. La présente attestation lui est délivrée pour servir et valoir ce que de droit.
                  </p>
                </>
              )}

              {previewDoc === 'releve' && (
                <>
                  <div className="text-center py-2">
                    <span className="text-base font-black uppercase tracking-wider text-[#0a1a44] border-b-2 border-emerald-600 pb-1">
                      RELEVÉ INDIVIDUEL D'ASSIDUITÉ
                    </span>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs grid grid-cols-2 gap-3">
                    <div>Élève : <strong>{beneficiaire.prenomFr} {beneficiaire.nomFr}</strong></div>
                    <div>Code Massar : <strong>{beneficiaire.codeMassar}</strong></div>
                    <div>Classe : <strong>{currentClasse?.nomFr}</strong></div>
                    <div>Taux de présence : <strong className="text-emerald-700">{stats.tauxPresence}%</strong></div>
                    <div>Total séances suivies : <strong>{stats.presents}</strong></div>
                    <div>Absences justifiées : <strong>{stats.justifiees}</strong></div>
                    <div>Absences injustifiées : <strong>{stats.nonJustifiees}</strong></div>
                    <div>Retards enregistrés : <strong>{stats.retards}</strong></div>
                  </div>
                </>
              )}

              {previewDoc === 'billet' && selectedBilletForPrint && (
                <>
                  <div className="text-center py-2">
                    <span className="text-base font-black uppercase tracking-wider text-cyan-900 border-b-2 border-cyan-600 pb-1">
                      BILLET D'ENTRÉE EN CLASSE
                    </span>
                  </div>

                  <div className="bg-cyan-50 p-4 rounded-2xl border border-cyan-200 text-xs space-y-2">
                    <div>Apprenant(e) : <strong>{beneficiaire.prenomFr} {beneficiaire.nomFr}</strong> ({beneficiaire.codeMassar})</div>
                    <div>Date d'émission : <strong>{selectedBilletForPrint.dateConvocation}</strong></div>
                    <div>Motif de l'absence : <strong>{selectedBilletForPrint.motif}</strong></div>
                    <div>Décision administrative : <strong className="text-emerald-700">{selectedBilletForPrint.decision || 'Admis en classe'}</strong></div>
                    <div>Statut : <strong>Validé par la Direction</strong></div>
                  </div>
                </>
              )}

              {/* Signatures Footer */}
              <div className="pt-8 flex justify-between items-end text-xs">
                <div>
                  <div className="text-[10px] text-slate-400">Fait à Zirara, le {new Date().toLocaleDateString('fr-FR')}</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-slate-700">Le Directeur du Centre</div>
                  <div className="h-14 flex items-center justify-center text-slate-400 italic text-[11px]">
                    (Signature & Cachet Officiel)
                  </div>
                  <div className="font-mono text-[10px] text-slate-500 font-bold">
                    {settings.nomDirecteur || 'Directeur Zirara'}
                  </div>
                </div>
              </div>
            </div>

            {/* Print Action Buttons */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-3 no-print">
              <button
                type="button"
                onClick={() => {
                  setPreviewDoc(null);
                  setSelectedBilletForPrint(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2.5 rounded-xl text-xs font-black bg-[#02b3bb] text-white hover:bg-[#0099a8] inline-flex items-center gap-2 shadow-md cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimer le document</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
