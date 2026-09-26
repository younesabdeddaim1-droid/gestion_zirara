import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Beneficiaires } from './components/Beneficiaires';
import { Planning } from './components/Planning';
import { AbsencesSaisie } from './components/AbsencesSaisie';
import { BilletsEntree } from './components/BilletsEntree';
import { GestionUtilisateurs } from './components/GestionUtilisateurs';
import { Parametrage } from './components/Parametrage';
import { PrintDocumentModal } from './components/PrintDocumentModal';
import { FeedbackSystem } from './components/FeedbackSystem';
import { PWAInstallButton } from './components/PWAInstallButton';
import { EspaceBeneficiaire } from './components/EspaceBeneficiaire';
import cmedLogo from './assets/images/cmed_logo.jpeg';
import {
  School,
  Lock,
  Mail,
  UserCheck,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  LayoutDashboard,
  Users,
  CalendarDays,
  ClipboardCheck,
  Settings,
  LogIn,
  Ticket,
  Eye,
  EyeOff,
  User as UserIcon,
  GraduationCap,
  AlertCircle,
  Github
} from 'lucide-react';
import { storageService } from './services/storage';

type LoginRoleTab = 'admin' | 'animateur' | 'beneficiaire';

const LoginView: React.FC = () => {
  const { login, loginWithGitHub } = useAuth();
  const [activeTab, setActiveTab] = useState<LoginRoleTab>('beneficiaire');
  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGitHubConnecting, setIsGitHubConnecting] = useState(false);

  // Listen for OAuth message from GitHub popup
  React.useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const ghUser = event.data.user;
        if (ghUser) {
          setIsLoading(true);
          try {
            await loginWithGitHub(ghUser);
          } catch (err: any) {
            setError(err?.message || 'Erreur lors de la connexion via GitHub.');
          } finally {
            setIsLoading(false);
          }
        }
      } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
        setError(event.data.error || 'Échec de l\'authentification GitHub.');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [loginWithGitHub]);

  // Handle GitHub OAuth button click
  const handleGitHubLogin = async () => {
    setError('');
    setIsGitHubConnecting(true);
    try {
      const res = await fetch(`/api/auth/github/url?origin=${encodeURIComponent(window.location.origin)}`);
      const data = await res.json();

      if (!res.ok || !data.url) {
        throw new Error(data.message || 'Impossible d\'obtenir l\'URL d\'authentification GitHub.');
      }

      // Open OAuth provider in popup directly
      const width = 600;
      const height = 750;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const authWindow = window.open(
        data.url,
        'github_login_popup',
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,status=1`
      );

      if (!authWindow) {
        setError('Veuillez autoriser les fenêtres pop-up dans votre navigateur pour vous connecter avec GitHub.');
      }
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de la tentative de connexion GitHub.');
    } finally {
      setIsGitHubConnecting(false);
    }
  };

  // Load real existing users for demonstration and testing
  const allUsers = storageService.getUsers().filter(u => u.statut === 'actif');
  const tabUsers = allUsers.filter(u => u.role === activeTab);

  const handleTabChange = (newTab: LoginRoleTab) => {
    setActiveTab(newTab);
    setLoginInput('');
    setPassword('');
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Strict validation: Login and password are required
    if (!loginInput.trim() || !password.trim()) {
      setError(
        activeTab === 'beneficiaire'
          ? 'Veuillez saisir votre Code Massar et votre mot de passe.'
          : 'Veuillez saisir votre identifiant et votre mot de passe.'
      );
      return;
    }

    setIsLoading(true);
    login(loginInput.trim(), password.trim(), activeTab).then((success) => {
      setIsLoading(false);

      if (!success) {
        // Check if user exists but inactive or wrong password
        const usersList = storageService.getUsers();
        const user = usersList.find(
          u => u.email.toLowerCase().trim() === loginInput.toLowerCase().trim() ||
               (u.codeMassar && u.codeMassar.toLowerCase().trim() === loginInput.toLowerCase().trim()) ||
               u.nomComplet.toLowerCase().trim() === loginInput.toLowerCase().trim()
        );
        if (user && user.statut === 'inactif') {
          setError('Ce compte est actuellement désactivé. Veuillez contacter l\'administration.');
        } else {
          setError(
            activeTab === 'beneficiaire'
              ? 'Code Massar ou mot de passe incorrect. Veuillez vérifier vos identifiants.'
              : 'Identifiants incorrects. Veuillez vérifier votre login et votre mot de passe.'
          );
        }
      }
    }).catch((err) => {
      setIsLoading(false);
      setError('Une erreur de connexion est survenue. Veuillez réessayer.');
      console.error(err);
    });
  };

  const handleQuickSelect = async (uIdentifier: string, uPass: string) => {
    setLoginInput(uIdentifier);
    setPassword(uPass);
    setError('');
    setIsLoading(true);
    try {
      const success = await login(uIdentifier, uPass, activeTab);
      if (!success) {
        setError('Échec de la connexion rapide. Veuillez vérifier vos identifiants ou recharger la page.');
      }
    } catch (err: any) {
      setError(err?.message || 'Une erreur est survenue lors de la connexion rapide.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-6 sm:py-10 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-[#f8fafc] via-[#f0f9ff]/50 to-[#e6f4f8] text-[#0a1a44] relative overflow-hidden">
      {/* Decorative Canva Tech Abstract Background Shapes */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0" aria-hidden="true">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#57e4ff] opacity-25 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-[#0a1a44] opacity-15 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full border border-[#57e4ff] opacity-20" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        
        {/* Official CMED Logo Badge */}
        <div className="mx-auto w-24 h-16 sm:w-28 sm:h-20 rounded-3xl bg-white p-2 flex items-center justify-center shadow-xl shadow-cyan-950/10 mb-4 border border-cyan-200/90">
          <img
            src={cmedLogo}
            alt="Corps Marocain pour l'Éducation et Développement (CMED)"
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
          />
        </div>

        <h1 className="text-xl sm:text-2xl font-black text-[#0a1a44] tracking-tight leading-snug">
          GESTION CENTRE
        </h1>
        <p className="text-xs sm:text-sm font-extrabold text-[#02b3bb] uppercase tracking-wider mt-0.5">
          Deuxième Chance – Nouvelle Génération Zirara
        </p>
        <p className="text-xs text-slate-500 font-sans mt-1" dir="rtl">
          مركز الفرصة الثانية - الجيل الجديد زيرارة
        </p>
      </div>

      <div className="mt-6 sm:mt-7 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <PWAInstallButton variant="login" />
        
        <div className="bg-white py-6 sm:py-8 px-5 sm:px-8 shadow-xl shadow-slate-200/60 rounded-3xl border border-slate-200/90 text-[#0a1a44] relative overflow-hidden">
          {/* Top turquoise Canva Tech accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0a1a44] via-[#02b3bb] to-[#57e4ff]" />
          
          {/* 3 Profile Tabs: Administrateur | Animateur | Bénéficiaire */}
          <div className="mb-5">
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-slate-100 border border-slate-200/80">
              <button
                type="button"
                onClick={() => handleTabChange('admin')}
                className={`py-2 px-1 text-center rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-[#0a1a44] text-[#57e4ff] shadow-sm'
                    : 'text-slate-600 hover:text-[#0a1a44]'
                }`}
              >
                👑 Admin
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('animateur')}
                className={`py-2 px-1 text-center rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeTab === 'animateur'
                    ? 'bg-[#02b3bb] text-white shadow-sm'
                    : 'text-slate-600 hover:text-[#0a1a44]'
                }`}
              >
                👨‍🏫 Animateur
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('beneficiaire')}
                className={`py-2 px-1 text-center rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeTab === 'beneficiaire'
                    ? 'bg-purple-700 text-white shadow-sm'
                    : 'text-slate-600 hover:text-[#0a1a44]'
                }`}
              >
                🎓 Bénéficiaire
              </button>
            </div>
          </div>

          <div className="mb-4 pb-2 border-b border-slate-100 text-center">
            <h2 className="text-base sm:text-lg font-black text-[#0a1a44]">
              {activeTab === 'beneficiaire'
                ? 'Espace Apprenant'
                : activeTab === 'animateur'
                ? 'Espace Formateur / Animateur'
                : 'Espace Administration'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeTab === 'beneficiaire'
                ? 'Connectez-vous avec votre Code Massar et mot de passe'
                : 'Saisissez vos identifiants pour accéder à votre espace'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-start gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 👤 Login / Code Massar Input */}
            <div>
              <label className="block text-xs font-black text-[#0a1a44] uppercase tracking-wide mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  {activeTab === 'beneficiaire' ? (
                    <School className="w-3.5 h-3.5 text-purple-600" />
                  ) : (
                    <UserIcon className="w-3.5 h-3.5 text-[#02b3bb]" />
                  )}
                  <span>{activeTab === 'beneficiaire' ? 'Code Massar' : 'Login (Email ou Identifiant)'}</span>
                </span>
                <span className="text-[10px] text-rose-500 font-bold">* Obligatoire</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={loginInput}
                  onChange={e => setLoginInput(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 text-sm sm:text-base rounded-2xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#02b3bb] focus:border-transparent bg-slate-50 text-[#0a1a44] transition-all font-semibold min-h-[48px]"
                  placeholder={
                    activeTab === 'beneficiaire'
                      ? 'ex: M130024589 ou R140056782'
                      : activeTab === 'animateur'
                      ? 'ex: amrani.anim@zirara.ma'
                      : 'ex: admin@zirara.ma'
                  }
                  autoComplete={activeTab === 'beneficiaire' ? 'off' : 'username'}
                />
                {activeTab === 'beneficiaire' ? (
                  <School className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                ) : (
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                )}
              </div>
            </div>

            {/* 🔒 Mot de passe Input + ☑️ Afficher / masquer */}
            <div>
              <label className="block text-xs font-black text-[#0a1a44] uppercase tracking-wide mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#02b3bb]" />
                  <span>Mot de passe</span>
                </span>
                <span className="text-[10px] text-rose-500 font-bold">* Obligatoire</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-11 py-3 text-sm sm:text-base rounded-2xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#02b3bb] focus:border-transparent bg-slate-50 text-[#0a1a44] transition-all font-semibold min-h-[48px]"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                
                {/* Inline Toggle Password Button */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#02b3bb] p-1.5 rounded-xl transition-colors cursor-pointer focus:outline-hidden"
                  title={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Explicit Checkbox: ☑️ Afficher / masquer le mot de passe */}
              <div className="flex items-center justify-between mt-2 px-1">
                <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={e => setShowPassword(e.target.checked)}
                    className="w-4 h-4 rounded-md border-slate-300 text-[#02b3bb] focus:ring-[#02b3bb] cursor-pointer"
                  />
                  <span>Afficher le mot de passe</span>
                </label>
              </div>
            </div>

            {/* 🔐 Se connecter Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl text-sm sm:text-base font-black text-white focus:outline-hidden focus:ring-2 focus:ring-offset-2 shadow-lg transition-all mt-3 active:scale-[0.98] cursor-pointer min-h-[48px] ${
                activeTab === 'beneficiaire'
                  ? 'bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 focus:ring-purple-600 shadow-purple-900/20'
                  : activeTab === 'animateur'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 focus:ring-emerald-600 shadow-emerald-900/20'
                  : 'bg-gradient-to-r from-[#02b3bb] to-[#0891b2] hover:from-[#0099a8] hover:to-[#0e7490] focus:ring-[#02b3bb] shadow-cyan-900/20'
              }`}
            >
              <LogIn className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>
                {activeTab === 'beneficiaire' ? 'Accéder à mon espace apprenant' : 'Se connecter'}
              </span>
            </button>

            {/* Séparateur ou GitHub */}
            {activeTab !== 'beneficiaire' && (
              <div className="pt-2">
                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-slate-200"></div>
                  <span className="shrink-0 mx-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">ou</span>
                  <div className="flex-grow border-t border-slate-200"></div>
                </div>

                <button
                  type="button"
                  onClick={handleGitHubLogin}
                  disabled={isGitHubConnecting || isLoading}
                  className="w-full inline-flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl text-xs sm:text-sm font-black text-white bg-[#24292f] hover:bg-[#1a1e22] active:scale-[0.98] transition-all shadow-md cursor-pointer min-h-[46px]"
                >
                  <Github className="w-4 h-4 text-white" />
                  <span>{isGitHubConnecting ? 'Ouverture de GitHub...' : 'Continuer avec GitHub'}</span>
                </button>
              </div>
            )}
          </form>

          {/* Quick Real Profiles Selectors (Testing & Demonstration) */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <span className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2.5 text-center">
              {activeTab === 'beneficiaire'
                ? 'Comptes apprenants disponibles (Test rapide)'
                : activeTab === 'animateur'
                ? 'Comptes animateurs disponibles (Test rapide)'
                : 'Comptes administrateurs disponibles (Test rapide)'}
            </span>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {tabUsers.map(u => {
                const isAdminRole = u.role === 'admin';
                const isBenRole = u.role === 'beneficiaire';
                const selectIdentifier = isBenRole && u.codeMassar ? u.codeMassar : u.email;

                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleQuickSelect(selectIdentifier, u.password || (isBenRole ? '123' : 'admin'))}
                    className={`w-full p-2.5 rounded-2xl border text-left transition-all flex items-center justify-between group cursor-pointer active:scale-[0.98] ${
                      isBenRole
                        ? 'border-purple-200/90 bg-purple-50/70 hover:bg-purple-100/90 text-purple-950'
                        : isAdminRole
                        ? 'border-cyan-200/90 bg-cyan-50/70 hover:bg-cyan-100/90 text-[#0a1a44]'
                        : 'border-slate-200/90 bg-slate-50/70 hover:bg-slate-100/90 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs font-bold text-xs ${
                          isBenRole
                            ? 'bg-purple-700 text-white'
                            : isAdminRole
                            ? 'bg-[#0a1a44] text-[#57e4ff] border border-[#02b3bb]/40'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {isBenRole ? (
                          <School className="w-4 h-4" />
                        ) : isAdminRole ? (
                          <ShieldCheck className="w-4 h-4" />
                        ) : (
                          <GraduationCap className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-black truncate flex items-center gap-1.5">
                          <span>{u.nomComplet}</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded-md font-bold uppercase ${
                              isBenRole
                                ? 'bg-purple-200 text-purple-950'
                                : isAdminRole
                                ? 'bg-cyan-200/80 text-cyan-950'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isBenRole ? 'Bénéficiaire' : isAdminRole ? 'Admin' : 'Animateur'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 truncate font-mono">
                          {isBenRole && u.codeMassar ? `Massar : ${u.codeMassar}` : u.email}
                        </div>
                      </div>
                    </div>
                    <ArrowRight
                      className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 shrink-0 ${
                        isBenRole ? 'text-purple-600' : isAdminRole ? 'text-[#02b3bb]' : 'text-emerald-600'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

const MainAppContent: React.FC = () => {
  const { isAuthenticated, isAdmin, isAnimateur, isBeneficiaire } = useAuth();
  const {
    activeModule,
    setActiveModule,
    t,
    isRtl,
    toasts,
    dismissToast,
    confirmModal,
    closeConfirm
  } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  React.useEffect(() => {
    if (!isAdmin && (activeModule === 'utilisateurs' || activeModule === 'parametrage')) {
      setActiveModule('dashboard');
    }
  }, [isAdmin, activeModule, setActiveModule]);

  if (!isAuthenticated) {
    return <LoginView />;
  }

  // Strictly isolate Beneficiary space
  if (isBeneficiaire) {
    return <EspaceBeneficiaire />;
  }

  return (
    <div
      className={`min-h-screen flex flex-col relative overflow-x-hidden bg-gradient-to-br from-[#f8fafc] via-[#f0f9ff]/50 to-[#e6f4f8] text-[#0a1a44] ${
        isRtl ? 'font-sans' : 'font-sans'
      }`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Modern 2026 Canva Tech Decorative Abstract Shapes */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0 no-print" aria-hidden="true">
        {/* Abstract shape 1: Top Right Tech Turquoise Orb */}
        <div className="absolute -top-32 -right-32 w-[32rem] h-[32rem] rounded-full bg-[#57e4ff] opacity-[0.14] blur-3xl" />
        {/* Abstract shape 2: Mid Left Deep Navy Soft Curved Shape */}
        <div className="absolute top-1/3 -left-32 w-[28rem] h-[28rem] rounded-full bg-[#0a1a44] opacity-[0.06] blur-3xl" />
        {/* Abstract shape 3: Bottom Right Accent */}
        <div className="absolute -bottom-28 right-1/4 w-[26rem] h-[26rem] rounded-full bg-[#02b3bb] opacity-[0.10] blur-3xl" />
        {/* Abstract shape 4: Subtle Geometric Ring Accent */}
        <div className="absolute top-2/3 left-1/3 w-72 h-72 rounded-full border border-[#57e4ff] opacity-[0.15] rotate-45" />
      </div>

      {/* Fixed Moroccan Institutional & User Header */}
      <div className="relative z-10">
        <Header onToggleMobileMenu={() => setMobileMenuOpen(prev => !prev)} />
      </div>

      <div className="flex-1 flex overflow-hidden relative z-10">
        {/* Navigation Sidebar */}
        <Sidebar mobileOpen={mobileMenuOpen} onCloseMobile={() => setMobileMenuOpen(false)} />

        {/* Primary Workspace Content View */}
        <main className="flex-1 overflow-y-auto p-3.5 sm:p-6 lg:p-8 pb-24 md:pb-8">
          <div className="max-w-7xl mx-auto">
            {activeModule === 'dashboard' && <Dashboard />}
            {activeModule === 'beneficiaires' && <Beneficiaires />}
            {activeModule === 'planning' && <Planning />}
            {activeModule === 'absences' && <AbsencesSaisie />}
            {activeModule === 'validation' && <AbsencesSaisie />}
            {activeModule === 'billets' && <BilletsEntree />}
            {activeModule === 'rapports' && <Dashboard />}
            {activeModule === 'utilisateurs' && <GestionUtilisateurs />}
            {activeModule === 'parametrage' && <Parametrage />}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Canva Tech Turquoise & Deep Navy) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-3 py-2 flex items-center justify-around shadow-xl">
        <button
          type="button"
          onClick={() => setActiveModule('dashboard')}
          className={`flex flex-col items-center py-1.5 px-3 rounded-2xl text-[10px] font-black transition-all active:scale-95 cursor-pointer ${
            activeModule === 'dashboard' ? 'text-[#02b3bb] bg-cyan-50 font-black ring-1 ring-[#02b3bb]/30' : 'text-slate-500 hover:text-[#0a1a44]'
          }`}
        >
          <LayoutDashboard className={`w-5 h-5 mb-0.5 ${activeModule === 'dashboard' ? 'text-[#02b3bb]' : 'text-slate-500'}`} />
          <span>{t.navDashboard}</span>
        </button>

        {isAnimateur ? (
          <button
            type="button"
            onClick={() => setActiveModule('planning')}
            className={`flex flex-col items-center py-1.5 px-3 rounded-2xl text-[10px] font-black transition-all active:scale-95 cursor-pointer ${
              activeModule === 'planning' ? 'text-[#02b3bb] bg-cyan-50 font-black ring-1 ring-[#02b3bb]/30' : 'text-slate-500 hover:text-[#0a1a44]'
            }`}
          >
            <CalendarDays className={`w-5 h-5 mb-0.5 ${activeModule === 'planning' ? 'text-[#02b3bb]' : 'text-slate-500'}`} />
            <span>{t.navPlanning}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setActiveModule('beneficiaires')}
            className={`flex flex-col items-center py-1.5 px-3 rounded-2xl text-[10px] font-black transition-all active:scale-95 cursor-pointer ${
              activeModule === 'beneficiaires' ? 'text-[#02b3bb] bg-cyan-50 font-black ring-1 ring-[#02b3bb]/30' : 'text-slate-500 hover:text-[#0a1a44]'
            }`}
          >
            <Users className={`w-5 h-5 mb-0.5 ${activeModule === 'beneficiaires' ? 'text-[#02b3bb]' : 'text-slate-500'}`} />
            <span>{t.navBeneficiaires}</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveModule('absences')}
          className={`flex flex-col items-center py-1.5 px-3 rounded-2xl text-[10px] font-black transition-all relative active:scale-95 cursor-pointer ${
            activeModule === 'absences' ? 'text-[#02b3bb] bg-cyan-50 font-black ring-1 ring-[#02b3bb]/30' : 'text-slate-500 hover:text-[#0a1a44]'
          }`}
        >
          <ClipboardCheck className={`w-5 h-5 mb-0.5 ${activeModule === 'absences' ? 'text-[#02b3bb]' : 'text-slate-500'}`} />
          <span>{t.navAbsences}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveModule('billets')}
          className={`flex flex-col items-center py-1.5 px-3 rounded-2xl text-[10px] font-black transition-all active:scale-95 cursor-pointer ${
            activeModule === 'billets' ? 'text-[#02b3bb] bg-cyan-50 font-black ring-1 ring-[#02b3bb]/30' : 'text-slate-500 hover:text-[#0a1a44]'
          }`}
        >
          <Ticket className={`w-5 h-5 mb-0.5 ${activeModule === 'billets' ? 'text-[#02b3bb]' : 'text-slate-500'}`} />
          <span>Billets</span>
        </button>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setActiveModule('parametrage')}
            className={`flex flex-col items-center py-1.5 px-3 rounded-2xl text-[10px] font-black transition-all active:scale-95 cursor-pointer ${
              activeModule === 'parametrage' ? 'text-[#02b3bb] bg-cyan-50 font-black ring-1 ring-[#02b3bb]/30' : 'text-slate-500 hover:text-[#0a1a44]'
            }`}
          >
            <Settings className={`w-5 h-5 mb-0.5 ${activeModule === 'parametrage' ? 'text-[#02b3bb]' : 'text-slate-500'}`} />
            <span>{t.navParametrage}</span>
          </button>
        )}
      </nav>

      {/* Modern 2026 Feedback Toast & Confirmation System */}
      <FeedbackSystem
        toasts={toasts}
        onDismissToast={dismissToast}
        confirmModal={confirmModal}
        onCloseConfirm={closeConfirm}
        isRtl={isRtl}
      />

      {/* Official Moroccan Institutional Print Document Modal */}
      <PrintDocumentModal />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <MainAppContent />
      </AppProvider>
    </AuthProvider>
  );
}
