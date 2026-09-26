import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  CentreSettings,
  User,
  Filiere,
  Classe,
  Beneficiaire,
  Seance,
  AbsenceRecord,
  StatutPresence,
  TypeAbsence,
  MotifAbsence,
  Convocation,
  BilletRetard,
  ActiveModule,
  Language
} from '../types';
import { storageService } from '../services/storage';
import { translations } from '../locales/translations';
import { ToastItem, ConfirmModalState } from '../components/FeedbackSystem';
import { db, auth } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';

export interface PrintModalConfig {
  isOpen: boolean;
  type: 'fiche' | 'seance' | 'rapport' | 'billet' | 'billets_collectifs' | 'billet_retard';
  data?: any;
}

interface AppContextType {
  // Settings
  settings: CentreSettings;
  updateSettings: (newSettings: CentreSettings) => Promise<void>;

  // Feedback & Notifications
  toasts: ToastItem[];
  showToast: (
    messageOrConfig: string | { title?: string; message: string; type?: 'success' | 'warning' | 'error' | 'info'; description?: string },
    type?: 'success' | 'warning' | 'error' | 'info',
    description?: string
  ) => void;
  dismissToast: (id: string) => void;
  confirmModal: ConfirmModalState;
  askConfirmation: (config: {
    title: string;
    message: string;
    confirmText?: string;
    confirmLabel?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'primary' | 'success' | 'info';
    onConfirm: () => void;
    onCancel?: () => void;
  }) => void;
  closeConfirm: () => void;

  // Language & UI
  language: Language;
  setLanguage: (lang: Language) => void;
  nameLanguage: 'fr' | 'ar' | 'both';
  setNameLanguage: (nl: 'fr' | 'ar' | 'both') => void;
  t: typeof translations.fr;
  isRtl: boolean;

  // Navigation
  activeModule: ActiveModule;
  setActiveModule: (module: ActiveModule) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  toggleSidebar: () => void;

  // Filières & Classes
  filieres: Filiere[];
  classes: Classe[];
  addFiliere: (filiere: Omit<Filiere, 'id'>) => Promise<void>;
  updateFiliere: (filiere: Filiere) => Promise<void>;
  deleteFiliere: (id: string) => Promise<void>;
  toggleFiliereStatut: (id: string) => Promise<void>;
  addClasse: (classe: Omit<Classe, 'id'>) => Promise<void>;
  updateClasse: (classe: Classe) => Promise<void>;
  deleteClasse: (id: string) => Promise<void>;
  toggleClasseStatut: (id: string) => Promise<void>;

  // Bénéficiaires
  beneficiaires: Beneficiaire[];
  addBeneficiaire: (beneficiaire: Omit<Beneficiaire, 'id'>) => Promise<void>;
  updateBeneficiaire: (beneficiaire: Beneficiaire) => Promise<void>;
  deleteBeneficiaire: (id: string) => Promise<void>;
  deleteBeneficiairesBulk: (ids: string[], customMessage?: string) => Promise<void>;
  addBeneficiairesBulk: (newBens: Beneficiaire[]) => Promise<void>;
  toggleBeneficiaireStatut: (id: string) => Promise<void>;

  // Séances / Planning
  seances: Seance[];
  addSeance: (seance: Omit<Seance, 'id'>) => Promise<void>;
  updateSeance: (seance: Seance) => Promise<void>;
  deleteSeance: (id: string) => Promise<void>;

  // Absences
  absences: AbsenceRecord[];
  saveSeanceAbsences: (
    seanceId: string,
    records: Array<{
      beneficiaireId: string;
      statut: StatutPresence;
      typeAbsence?: TypeAbsence;
      dureeRetardMinutes?: number;
      statutValidation?: 'En attente' | 'Validée' | 'Refusée';
      motifLabel?: string;
      motifId?: string;
      justifie: boolean;
      convoqueAdmin: boolean;
      note?: string;
    }>,
    userId: string
  ) => Promise<void>;
  updateAbsenceRecord: (
    id: string,
    updates: Partial<Pick<AbsenceRecord, 'statutValidation' | 'motifLabel' | 'statut' | 'typeAbsence' | 'dureeRetardMinutes' | 'justifie'>>
  ) => Promise<void>;

  // Motifs
  motifs: MotifAbsence[];
  addMotif: (motif: Omit<MotifAbsence, 'id'>) => Promise<void>;
  updateMotif: (motif: MotifAbsence) => Promise<void>;
  deleteMotif: (id: string) => Promise<void>;

  // Convocations
  convocations: Convocation[];
  resolveConvocation: (id: string, decision?: string) => Promise<void>;
  addConvocation: (convocation: Omit<Convocation, 'id'>) => Promise<void>;

  // Billets de Retard
  billetsRetard: BilletRetard[];
  addBilletRetard: (billet: BilletRetard) => Promise<void>;
  deleteBilletRetard: (id: string) => Promise<void>;

  // Live Totals for Dashboard
  totals: {
    actifs: number;
    actifsMas: number;
    actifsFem: number;
    presents: number;
    presentsMas: number;
    presentsFem: number;
    absents: number;
    absentsMas: number;
    absentsFem: number;
    convoques: number;
  };

  // Print Document Modal
  printModal: PrintModalConfig;
  openPrintModal: (type: 'fiche' | 'seance' | 'rapport' | 'billet' | 'billets_collectifs' | 'billet_retard', data?: any) => void;
  closePrintModal: () => void;

  // Helpers
  getFiliereById: (id: string) => Filiere | undefined;
  getClasseById: (id: string) => Classe | undefined;
  getUserById: (id: string) => User | undefined;
  getMotifById: (id: string) => MotifAbsence | undefined;
  getBeneficiaireById: (id: string) => Beneficiaire | undefined;
  getSeanceById: (id: string) => Seance | undefined;
  getBeneficiaireDisplayName: (b: Beneficiaire) => string;

  // Backup & Reset
  resetData: () => void;
  reloadFromStorage: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load state initially from cache for fast startup
  const [settings, setSettingsState] = useState<CentreSettings>(() => storageService.getSettings());
  const [language, setLanguageState] = useState<Language>(() => storageService.getLanguage());
  const [nameLanguage, setNameLanguageState] = useState<'fr' | 'ar' | 'both'>(() => storageService.getNameLanguage());
  const [activeModule, setActiveModule] = useState<ActiveModule>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsedState] = useState<boolean>(() => {
    try {
      return localStorage.getItem('e2c_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setSidebarCollapsedState(prev => {
      const next = !prev;
      try {
        localStorage.setItem('e2c_sidebar_collapsed', String(next));
      } catch (err) {
        console.error(err);
      }
      return next;
    });
  };

  const setSidebarCollapsed = (collapsed: boolean | ((prev: boolean) => boolean)) => {
    setSidebarCollapsedState(prev => {
      const next = typeof collapsed === 'function' ? collapsed(prev) : collapsed;
      try {
        localStorage.setItem('e2c_sidebar_collapsed', String(next));
      } catch (err) {
        console.error(err);
      }
      return next;
    });
  };

  const [filieres, setFilieresState] = useState<Filiere[]>(() => storageService.getFilieres());
  const [classes, setClassesState] = useState<Classe[]>(() => storageService.getClasses());
  const [beneficiaires, setBeneficiairesState] = useState<Beneficiaire[]>(() => storageService.getBeneficiaires());
  const [seances, setSeancesState] = useState<Seance[]>(() => storageService.getSeances());
  const [absences, setAbsencesState] = useState<AbsenceRecord[]>(() => storageService.getAbsences());
  const [motifs, setMotifsState] = useState<MotifAbsence[]>(() => storageService.getMotifs());
  const [convocations, setConvocationsState] = useState<Convocation[]>(() => storageService.getConvocations());
  const [billetsRetard, setBilletsRetardState] = useState<BilletRetard[]>(() => storageService.getBilletsRetard());

  // Toast Notifications State
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = (
    messageOrConfig: string | { title?: string; message: string; type?: 'success' | 'warning' | 'error' | 'info'; description?: string },
    type: 'success' | 'warning' | 'error' | 'info' = 'success',
    description?: string
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    let newToast: ToastItem;

    if (typeof messageOrConfig === 'object') {
      newToast = {
        id,
        title: messageOrConfig.title,
        message: messageOrConfig.message,
        type: messageOrConfig.type || 'success',
        description: messageOrConfig.description
      };
    } else {
      newToast = {
        id,
        message: messageOrConfig,
        type,
        description
      };
    }

    setToasts(prev => [...prev.slice(-3), newToast]); // keep max 4 toasts

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirmer',
    cancelText: 'Annuler',
    variant: 'danger',
    onConfirm: () => {}
  });

  const askConfirmation = (config: {
    title: string;
    message: string;
    confirmText?: string;
    confirmLabel?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'primary' | 'success' | 'info';
    onConfirm: () => void;
    onCancel?: () => void;
  }) => {
    setConfirmModal({
      isOpen: true,
      title: config.title,
      message: config.message,
      confirmText: config.confirmText || config.confirmLabel || (config.variant === 'danger' ? 'Supprimer' : 'Confirmer'),
      confirmLabel: config.confirmLabel || config.confirmText,
      cancelText: config.cancelText || 'Annuler',
      variant: config.variant || 'danger',
      onConfirm: config.onConfirm,
      onCancel: config.onCancel
    });
  };

  const closeConfirm = () => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
  };

  // Print Modal
  const [printModal, setPrintModal] = useState<PrintModalConfig>({
    isOpen: false,
    type: 'rapport'
  });

  const isRtl = language === 'ar';
  const t = useMemo(() => translations[language], [language]);

  // Sync language with HTML dir attribute
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
  }, [language, isRtl]);

  const setLanguage = (lang: Language) => {
    storageService.setLanguage(lang);
    setLanguageState(lang);
  };

  const setNameLanguage = (nl: 'fr' | 'ar' | 'both') => {
    storageService.setNameLanguage(nl);
    setNameLanguageState(nl);
  };

  // ---------------------------------------------------------
  // PostgreSQL Live Synchronizer & Reloading
  // ---------------------------------------------------------
  const reloadFromApi = async () => {
    try {
      const [
        resSettings,
        resFilieres,
        resClasses,
        resBeneficiaires,
        resSeances,
        resAbsences,
        resMotifs,
        resConvocations,
        resBillets
      ] = await Promise.all([
        fetch('/api/settings').then(r => r.json()).catch(() => ({})),
        fetch('/api/filieres').then(r => r.json()).catch(() => []),
        fetch('/api/classes').then(r => r.json()).catch(() => []),
        fetch('/api/beneficiaires').then(r => r.json()).catch(() => []),
        fetch('/api/seances').then(r => r.json()).catch(() => []),
        fetch('/api/absences').then(r => r.json()).catch(() => []),
        fetch('/api/motifs').then(r => r.json()).catch(() => []),
        fetch('/api/convocations').then(r => r.json()).catch(() => []),
        fetch('/api/billets').then(r => r.json()).catch(() => [])
      ]);

      if (resSettings && resSettings.nomCentre) {
        setSettingsState(resSettings);
        storageService.setSettings(resSettings);
      }
      if (Array.isArray(resFilieres)) {
        setFilieresState(resFilieres);
        storageService.setFilieres(resFilieres);
      }
      if (Array.isArray(resClasses)) {
        setClassesState(resClasses);
        storageService.setClasses(resClasses);
      }
      if (Array.isArray(resBeneficiaires)) {
        setBeneficiairesState(resBeneficiaires);
        storageService.setBeneficiaires(resBeneficiaires);
      }
      if (Array.isArray(resSeances)) {
        setSeancesState(resSeances);
        storageService.setSeances(resSeances);
      }
      if (Array.isArray(resAbsences)) {
        setAbsencesState(resAbsences);
        storageService.setAbsences(resAbsences);
      }
      if (Array.isArray(resMotifs)) {
        setMotifsState(resMotifs);
        storageService.setMotifs(resMotifs);
      }
      if (Array.isArray(resConvocations)) {
        setConvocationsState(resConvocations);
        storageService.setConvocations(resConvocations);
      }
      if (Array.isArray(resBillets)) {
        setBilletsRetardState(resBillets);
        storageService.setBilletsRetard(resBillets);
      }
    } catch (err) {
      console.error("Error reloading from PostgreSQL API:", err);
    }
  };

  useEffect(() => {
    let intervalId: any;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("AppContext: User authenticated, initializing PostgreSQL background sync...");
        reloadFromApi();
        // Polling every 5 seconds for real-time collaboration feel
        intervalId = setInterval(reloadFromApi, 5000);
      } else {
        console.log("AppContext: No user authenticated, paused live sync.");
        if (intervalId) clearInterval(intervalId);
      }
    });

    return () => {
      unsubscribeAuth();
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  const reloadFromStorage = () => {
    reloadFromApi();
  };

  const updateSettings = async (newSettings: CentreSettings) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
      if (res.ok) {
        showToast("✅ Modification réussie", "success");
        await reloadFromApi();
      } else {
        throw new Error();
      }
    } catch (e: any) {
      showToast("❌ Erreur lors de l'enregistrement", "error");
      console.error(e);
    }
  };

  // Filières CRUD
  const addFiliere = async (filiere: Omit<Filiere, 'id'>) => {
    try {
      const newId = `fil-${Date.now()}`;
      const item: Filiere = { ...filiere, id: newId, statut: filiere.statut || 'actif' };
      const res = await fetch('/api/filieres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      if (res.ok) {
        showToast("✅ Filière ajoutée avec succès", "success");
        await reloadFromApi();
      } else {
        throw new Error();
      }
    } catch (e: any) {
      showToast("❌ Erreur lors de l'ajout", "error");
      console.error(e);
    }
  };

  const updateFiliere = async (filiere: Filiere) => {
    try {
      const res = await fetch('/api/filieres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filiere),
      });
      if (res.ok) {
        showToast("✅ Filière modifiée avec succès", "success");
        await reloadFromApi();
      } else {
        throw new Error();
      }
    } catch (e: any) {
      showToast("❌ Erreur lors de la modification", "error");
      console.error(e);
    }
  };

  const toggleFiliereStatut = async (id: string) => {
    try {
      const f = filieres.find(item => item.id === id);
      if (!f) return;
      const next = f.statut === 'inactif' ? 'actif' : 'inactif';
      const updated = { ...f, statut: next };
      const res = await fetch('/api/filieres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        showToast("✅ Statut de la filière mis à jour", "success");
        await reloadFromApi();
      } else {
        throw new Error();
      }
    } catch (e: any) {
      showToast("❌ Erreur de mise à jour", "error");
      console.error(e);
    }
  };

  const deleteFiliere = async (id: string) => {
    try {
      const res = await fetch(`/api/filieres/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast("✅ Filière supprimée avec succès", "success");
        await reloadFromApi();
      } else {
        throw new Error();
      }
    } catch (e: any) {
      showToast("❌ Erreur de suppression", "error");
      console.error(e);
    }
  };

  // Classes CRUD
  const addClasse = async (classe: Omit<Classe, 'id'>) => {
    try {
      const newId = `cls-${Date.now()}`;
      const item: Classe = { ...classe, id: newId, statut: classe.statut || 'actif' };
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      if (res.ok) {
        showToast("✅ Classe ajoutée avec succès", "success");
        await reloadFromApi();
      } else {
        throw new Error();
      }
    } catch (e: any) {
      showToast("❌ Erreur de création", "error");
      console.error(e);
    }
  };

  const updateClasse = async (classe: Classe) => {
    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(classe),
      });
      if (res.ok) {
        showToast("✅ Classe modifiée avec succès", "success");
        await reloadFromApi();
      } else {
        throw new Error();
      }
    } catch (e: any) {
      showToast("❌ Erreur de modification", "error");
      console.error(e);
    }
  };

  const toggleClasseStatut = async (id: string) => {
    try {
      const c = classes.find(item => item.id === id);
      if (!c) return;
      const next = c.statut === 'inactif' ? 'actif' : 'inactif';
      const updated = { ...c, statut: next };
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        showToast("✅ Statut de la classe mis à jour", "success");
        await reloadFromApi();
      } else {
        throw new Error();
      }
    } catch (e: any) {
      showToast("❌ Erreur de modification", "error");
      console.error(e);
    }
  };

  const deleteClasse = async (id: string) => {
    try {
      const res = await fetch(`/api/classes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast("✅ Classe supprimée avec succès", "success");
        await reloadFromApi();
      } else {
        throw new Error();
      }
    } catch (e: any) {
      showToast("❌ Erreur de suppression", "error");
      console.error(e);
    }
  };

  // Bénéficiaires CRUD
  const addBeneficiaire = async (beneficiaire: Omit<Beneficiaire, 'id'>) => {
    try {
      // Deduplication check based on Code Massar
      const cleanMassar = beneficiaire.codeMassar?.trim().toUpperCase();
      if (cleanMassar) {
        const isDuplicate = beneficiaires.some(
          b => b.codeMassar?.trim().toUpperCase() === cleanMassar
        );
        if (isDuplicate) {
          showToast(`⚠️ Erreur : Le Code Massar "${cleanMassar}" est déjà utilisé par un autre bénéficiaire.`, "error");
          return;
        }
      }

      const newId = `ben-${Date.now()}`;
      const numInscription = beneficiaire.numeroInscription || storageService.getNextNumeroInscription(beneficiaires);
      const newBen: Beneficiaire = {
        ...beneficiaire,
        id: newId,
        numeroInscription: numInscription
      };
      const res = await fetch('/api/beneficiaires', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBen),
      });
      if (res.ok) {
        showToast("✅ Ajout réussi", "success");
        await reloadFromApi();
      } else {
        throw new Error();
      }
    } catch (e: any) {
      showToast("❌ Erreur lors de l'ajout", "error");
      console.error(e);
    }
  };

  const updateBeneficiaire = async (beneficiaire: Beneficiaire) => {
    try {
      // Deduplication check based on Code Massar
      const cleanMassar = beneficiaire.codeMassar?.trim().toUpperCase();
      if (cleanMassar) {
        const isDuplicate = beneficiaires.some(
          b => b.id !== beneficiaire.id && b.codeMassar?.trim().toUpperCase() === cleanMassar
        );
        if (isDuplicate) {
          showToast(`⚠️ Erreur : Le Code Massar "${cleanMassar}" est déjà utilisé par un autre bénéficiaire.`, "error");
          return;
        }
      }

      const res = await fetch('/api/beneficiaires', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(beneficiaire),
      });
      if (res.ok) {
        showToast("✅ Modification réussie", "success");
        await reloadFromApi();
      } else {
        throw new Error();
      }
    } catch (e: any) {
      showToast("❌ Erreur lors de l'enregistrement", "error");
      console.error(e);
    }
  };

  const toggleBeneficiaireStatut = async (id: string) => {
    try {
      const b = beneficiaires.find(item => item.id === id);
      if (!b) return;
      const nextStatut: 'Actif' | 'Inactif' = b.statut === 'Actif' ? 'Inactif' : 'Actif';
      const updated = { ...b, statut: nextStatut };
      const res = await fetch('/api/beneficiaires', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        showToast("✅ Statut modifié", "success");
        await reloadFromApi();
      } else {
        throw new Error();
      }
    } catch (e: any) {
      showToast("❌ Erreur", "error");
      console.error(e);
    }
  };

  const deleteBeneficiairesBulk = async (ids: string[], customMessage?: string) => {
    if (!ids || ids.length === 0) return;
    const count = ids.length;

    try {
      const res = await fetch('/api/beneficiaires/delete-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (res.ok) {
        const message = customMessage || `✅ ${count} bénéficiaire(s) supprimé(s) avec succès.`;
        showToast(message, 'success');
        await reloadFromApi();
      } else {
        throw new Error();
      }
    } catch (e: any) {
      showToast("❌ Erreur de suppression groupée", "error");
      console.error(e);
    }
  };

  const addBeneficiairesBulk = async (newBens: Beneficiaire[]) => {
    if (!newBens || newBens.length === 0) return;
    try {
      const res = await fetch('/api/beneficiaires/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBens),
      });
      if (res.ok) {
        showToast(`✅ ${newBens.length} bénéficiaire(s) importé(s) avec succès sur PostgreSQL.`, "success");
        await reloadFromApi();
      } else {
        throw new Error();
      }
    } catch (e: any) {
      showToast("❌ Erreur lors de l'enregistrement de l'importation sur PostgreSQL", "error");
      console.error(e);
    }
  };

  const deleteBeneficiaire = async (id: string) => {
    await deleteBeneficiairesBulk([id], "✅ Suppression réussie");
  };

  // Séances CRUD
  const addSeance = async (seance: Omit<Seance, 'id'>) => {
    try {
      const newId = `sea-${Date.now()}`;
      const DAYS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
      let jour = seance.jour;
      if (!jour && seance.date) {
        try {
          const d = new Date(seance.date + 'T00:00:00');
          jour = DAYS_FR[d.getDay()] || 'Lundi';
        } catch {
          jour = 'Lundi';
        }
      }
      const classeIds = seance.classeIds && seance.classeIds.length > 0 ? seance.classeIds : (seance.classeId ? [seance.classeId] : []);
      const classeId = seance.classeId || (classeIds[0] || '');
      const newSeanceItem: Seance = {
        ...seance,
        id: newId,
        jour,
        classeIds,
        classeId
      };
      const res = await fetch('/api/seances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSeanceItem),
      });
      if (res.ok) {
        showToast("✅ Ajout réussi", "success");
        await reloadFromApi();
      } else {
        throw new Error();
      }
    } catch (e: any) {
      showToast("❌ Erreur", "error");
      console.error(e);
    }
  };

  const updateSeance = async (seance: Seance) => {
    try {
      const DAYS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
      let jour = seance.jour;
      if (!jour && seance.date) {
        try {
          const d = new Date(seance.date + 'T00:00:00');
          jour = DAYS_FR[d.getDay()] || 'Lundi';
        } catch {
          jour = 'Lundi';
        }
      }
      const classeIds = seance.classeIds && seance.classeIds.length > 0 ? seance.classeIds : (seance.classeId ? [seance.classeId] : []);
      const classeId = seance.classeId || (classeIds[0] || '');
      const updatedSeanceItem: Seance = {
        ...seance,
        jour,
        classeIds,
        classeId
      };
      const res = await fetch('/api/seances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSeanceItem),
      });
      if (res.ok) {
        showToast("✅ Modification réussie", "success");
        await reloadFromApi();
      } else {
        throw new Error();
      }
    } catch (e: any) {
      showToast("❌ Erreur", "error");
      console.error(e);
    }
  };

  const deleteSeance = async (id: string) => {
    try {
      const res = await fetch(`/api/seances/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast("✅ Suppression réussie", "success");
        await reloadFromApi();
      } else {
        throw new Error();
      }
    } catch (e: any) {
      showToast("❌ Erreur", "error");
      console.error(e);
    }
  };

  // Absences Saisie & Validation
  const saveSeanceAbsences = async (
    seanceId: string,
    records: Array<{
      beneficiaireId: string;
      statut: StatutPresence;
      typeAbsence?: TypeAbsence;
      dureeRetardMinutes?: number;
      statutValidation?: 'En attente' | 'Validée' | 'Refusée';
      motifLabel?: string;
      motifId?: string;
      justifie: boolean;
      convoqueAdmin: boolean;
      note?: string;
    }>,
    userId: string
  ) => {
    try {
      const now = new Date().toISOString().split('T')[0];
      const newAbsences: AbsenceRecord[] = records.map((rec, idx) => {
        const computedType: TypeAbsence | undefined =
          rec.typeAbsence ||
          (rec.statut === 'Infraction'
            ? 'Infraction'
            : rec.statut === 'Retard'
            ? 'Retard'
            : rec.statut === 'Absent'
            ? 'Absent'
            : undefined);

        const isInfraction = rec.statut === 'Infraction';
        const isAbsent = rec.statut === 'Absent';
        const isRetard = rec.statut === 'Retard';

        return {
          id: `abs-${Date.now()}-${idx}`,
          seanceId,
          beneficiaireId: rec.beneficiaireId,
          statut: rec.statut,
          typeAbsence: computedType,
          dureeRetardMinutes: isRetard ? (rec.dureeRetardMinutes ?? 15) : undefined,
          statutValidation: isAbsent || isInfraction || isRetard ? (rec.statutValidation || 'En attente') : undefined,
          motifLabel:
            rec.motifLabel ||
            (isInfraction
              ? 'Infraction disciplinaire'
              : isRetard
              ? 'Autorisation'
              : isAbsent
              ? 'Maladie'
              : undefined),
          motifId: rec.motifId,
          justifie: rec.justifie,
          convoqueAdmin: rec.convoqueAdmin || isAbsent || isInfraction,
          dateSaisie: now,
          saisiParUserId: userId,
          note: rec.note
        };
      });

      // Save absences
      const resAbs = await fetch('/api/absences/bulk-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seanceId, records: newAbsences, userId }),
      });

      if (!resAbs.ok) throw new Error("Absences bulk save failed");

      // 3. Automated Convocations
      const absentsToConvoque = records.filter(r => r.statut === 'Absent' || r.typeAbsence === 'Absent');
      const infractionsToConvoque = records.filter(r => r.statut === 'Infraction' || r.typeAbsence === 'Infraction');

      if (absentsToConvoque.length > 0 || infractionsToConvoque.length > 0) {
        const currentConvs = [...convocations];

        for (const nc of absentsToConvoque) {
          const exists = currentConvs.some(
            c => c.beneficiaireId === nc.beneficiaireId && c.statut === 'En attente' && c.seanceId === seanceId
          );
          if (!exists) {
            const convId = `cnv-${Date.now()}-${nc.beneficiaireId}`;
            await fetch('/api/convocations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: convId,
                beneficiaireId: nc.beneficiaireId,
                seanceId,
                dateConvocation: now,
                motif: nc.note || `Absence enregistrée en séance — transmise pour validation administrative.`,
                motifAr: `غياب مسجل في الحصة يستوجب المتابعة الإدارية.`,
                statut: 'En attente',
                creeParUserId: userId
              })
            });
          }
        }

        for (const nc of infractionsToConvoque) {
          const exists = currentConvs.some(
            c => c.beneficiaireId === nc.beneficiaireId && c.statut === 'En attente' && c.seanceId === seanceId && c.motif.includes('Infraction')
          );
          if (!exists) {
            const convId = `infr-${Date.now()}-${nc.beneficiaireId}`;
            await fetch('/api/convocations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: convId,
                beneficiaireId: nc.beneficiaireId,
                seanceId,
                dateConvocation: now,
                motif: nc.note || `Infraction disciplinaire / comportementale signalée par l'animateur en séance.`,
                motifAr: `مخالفة انضباطية مسجلة من طرف المنشط تستوجب المتابعة الإدارية.`,
                statut: 'En attente',
                creeParUserId: userId
              })
            });
          }
        }
      }

      // 4. Automated Late Billet Generation
      const retardsToBillet = records.filter(r => r.statut === 'Retard' || r.typeAbsence === 'Retard');
      if (retardsToBillet.length > 0) {
        const seanceObj = seances.find(s => s.id === seanceId);
        const userObj = storageService.getUsers().find(u => u.id === userId);

        for (const ret of retardsToBillet) {
          const ben = beneficiaires.find(b => b.id === ret.beneficiaireId);
          if (!ben) continue;
          const filiere = getFiliereById(ben.filiereId) || (seanceObj ? getFiliereById(seanceObj.filiereId) : undefined);
          const classe = getClasseById(ben.classeId) || (seanceObj ? getClasseById(seanceObj.classeId) : undefined);

          const dureeMinutes = ret.dureeRetardMinutes && ret.dureeRetardMinutes > 0 ? ret.dureeRetardMinutes : 15;
          const motif = ret.motifLabel && ret.motifLabel.trim() ? ret.motifLabel.trim() : 'Transport / Retard';
          const dateGenFormatted = `${now} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;

          const billetId = `brt-${seanceId}-${ben.id}`;
          const billetData: BilletRetard = {
            id: billetId,
            absenceId: `abs-${seanceId}-${ben.id}`,
            seanceId,
            beneficiaireId: ben.id,
            nomPrenomFr: `${ben.nomFr} ${ben.prenomFr}`,
            nomPrenomAr: `${ben.nomAr || ''} ${ben.prenomAr || ''}`.trim() || undefined,
            codeMassar: ben.codeMassar,
            filiereNom: filiere?.nomFr || 'Formation Professionnelle',
            classeNom: classe?.nomFr || 'Classe',
            dateSeance: seanceObj?.date || now,
            heureSeance: seanceObj ? `${seanceObj.heureDebut} – ${seanceObj.heureFin}` : '09:00 – 11:00',
            dureeMinutes,
            motif,
            motifAr: ret.note || undefined,
            dateGeneration: dateGenFormatted,
            creeParUserId: userId,
            creeParNom: userObj?.nomComplet || 'Administration',
            statutValidation: 'Validée'
          };

          await fetch('/api/billets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(billetData)
          });
        }
      }

      showToast("✅ Pointage enregistré avec succès", "success");
      await reloadFromApi();
    } catch (e: any) {
      showToast("❌ Erreur lors du pointage", "error");
      console.error(e);
    }
  };

  const addBilletRetard = async (billet: BilletRetard) => {
    try {
      await fetch('/api/billets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(billet)
      });
      await reloadFromApi();
    } catch (e) {
      console.error(e);
    }
  };

  const deleteBilletRetard = async (id: string) => {
    try {
      const res = await fetch(`/api/billets/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast("Billet de retard supprimé", "info");
        await reloadFromApi();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const updateAbsenceRecord = async (
    id: string,
    updates: Partial<Pick<AbsenceRecord, 'statutValidation' | 'motifLabel' | 'statut' | 'typeAbsence' | 'dureeRetardMinutes' | 'justifie'>>
  ) => {
    try {
      const a = absences.find(item => item.id === id);
      if (!a) return;
      const updated = {
        ...a,
        ...updates
      };
      const res = await fetch('/api/absences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        showToast("✅ Statut modifié", "success");
        await reloadFromApi();
      }
    } catch (e: any) {
      showToast("❌ Erreur de modification", "error");
      console.error(e);
    }
  };

  // Motifs CRUD
  const addMotif = async (motif: Omit<MotifAbsence, 'id'>) => {
    try {
      const newId = `mtf-${Date.now()}`;
      const res = await fetch('/api/motifs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...motif, id: newId })
      });
      if (res.ok) {
        showToast("✅ Ajout réussi", "success");
        await reloadFromApi();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const updateMotif = async (motif: MotifAbsence) => {
    try {
      const res = await fetch('/api/motifs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(motif)
      });
      if (res.ok) {
        showToast("✅ Modification réussie", "success");
        await reloadFromApi();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteMotif = async (id: string) => {
    try {
      const res = await fetch(`/api/motifs/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast("✅ Suppression réussie", "success");
        await reloadFromApi();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Convocations
  const resolveConvocation = async (id: string, decision?: string) => {
    try {
      const now = new Date().toISOString().split('T')[0];
      const c = convocations.find(item => item.id === id);
      if (!c) return;
      const updated: Convocation = {
        ...c,
        statut: 'Résolu' as const,
        dateResolution: now,
        decision: decision || 'Entretien réalisé avec la direction.'
      };
      const res = await fetch('/api/convocations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        await reloadFromApi();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const addConvocation = async (conv: Omit<Convocation, 'id'>) => {
    try {
      const newId = `cnv-${Date.now()}`;
      const res = await fetch('/api/convocations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...conv, id: newId })
      });
      if (res.ok) {
        await reloadFromApi();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Reset all
  const resetData = () => {
    storageService.resetAllData();
    reloadFromStorage();
  };

  // Live Totals calculation for the dashboard strictly excluding inactifs
  const totals = useMemo(() => {
    const activeBeneficiaires = beneficiaires.filter(b => b.statut === 'Actif');
    const actifs = activeBeneficiaires.length;
    const actifsMas = activeBeneficiaires.filter(b => b.sexe === 'M').length;
    const actifsFem = activeBeneficiaires.filter(b => b.sexe === 'F').length;

    const activeBeneficiaireMap = new Map<string, Beneficiaire>();
    activeBeneficiaires.forEach(b => activeBeneficiaireMap.set(b.id, b));

    const todayStr = new Date().toISOString().split('T')[0];

    const todayAbsencesForActifs = absences.filter(a => {
      if (!activeBeneficiaireMap.has(a.beneficiaireId)) return false;
      if (a.dateSaisie && a.dateSaisie.startsWith(todayStr)) return true;
      const seance = seances.find(s => s.id === a.seanceId);
      if (seance && seance.date === todayStr) return true;
      return a.dateSaisie === todayStr;
    });

    const presentsRecords = todayAbsencesForActifs.filter(a => a.statut === 'Present');
    const presents = presentsRecords.length;
    let presentsMas = 0;
    let presentsFem = 0;
    presentsRecords.forEach(rec => {
      const ben = activeBeneficiaireMap.get(rec.beneficiaireId);
      if (ben?.sexe === 'F') presentsFem++;
      else presentsMas++;
    });

    const absentsRecords = todayAbsencesForActifs.filter(a => a.statut === 'Absent');
    const absents = absentsRecords.length;
    let absentsMas = 0;
    let absentsFem = 0;
    absentsRecords.forEach(rec => {
      const ben = activeBeneficiaireMap.get(rec.beneficiaireId);
      if (ben?.sexe === 'F') absentsFem++;
      else absentsMas++;
    });

    const convoques = convocations.filter(c => c.statut === 'En attente' && activeBeneficiaireMap.has(c.beneficiaireId)).length;

    return {
      actifs,
      actifsMas,
      actifsFem,
      presents,
      presentsMas,
      presentsFem,
      absents,
      absentsMas,
      absentsFem,
      convoques
    };
  }, [beneficiaires, absences, convocations, seances]);

  // Helpers
  const getFiliereById = (id: string) => filieres.find(f => f.id === id);
  const getClasseById = (id: string) => classes.find(c => c.id === id);
  const getUserById = (id: string) => storageService.getUsers().find(u => u.id === id);
  const getMotifById = (id: string) => motifs.find(m => m.id === id);
  const getBeneficiaireById = (id: string) => beneficiaires.find(b => b.id === id);
  const getSeanceById = (id: string) => seances.find(s => s.id === id);

  const getBeneficiaireDisplayName = (b: Beneficiaire): string => {
    if (nameLanguage === 'ar') {
      return `${b.nomAr} ${b.prenomAr}`.trim() || `${b.nomFr} ${b.prenomFr}`;
    }
    if (nameLanguage === 'both') {
      return `${b.nomFr} ${b.prenomFr} (${b.nomAr} ${b.prenomAr})`;
    }
    return `${b.nomFr} ${b.prenomFr}`;
  };

  const openPrintModal = (type: 'fiche' | 'seance' | 'rapport' | 'billet' | 'billets_collectifs' | 'billet_retard', data?: any) => {
    setPrintModal({
      isOpen: true,
      type,
      data
    });
  };

  const closePrintModal = () => {
    setPrintModal(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <AppContext.Provider
      value={{
        settings,
        updateSettings,
        toasts,
        showToast,
        dismissToast,
        confirmModal,
        askConfirmation,
        closeConfirm,
        language,
        setLanguage,
        nameLanguage,
        setNameLanguage,
        t,
        isRtl,
        activeModule,
        setActiveModule,
        sidebarCollapsed,
        setSidebarCollapsed,
        toggleSidebar,
        filieres,
        classes,
        addFiliere,
        updateFiliere,
        deleteFiliere,
        toggleFiliereStatut,
        addClasse,
        updateClasse,
        deleteClasse,
        toggleClasseStatut,
        beneficiaires,
        addBeneficiaire,
        updateBeneficiaire,
        deleteBeneficiaire,
        deleteBeneficiairesBulk,
        addBeneficiairesBulk,
        toggleBeneficiaireStatut,
        seances,
        addSeance,
        updateSeance,
        deleteSeance,
        absences,
        saveSeanceAbsences,
        updateAbsenceRecord,
        motifs,
        addMotif,
        updateMotif,
        deleteMotif,
        convocations,
        resolveConvocation,
        addConvocation,
        billetsRetard,
        addBilletRetard,
        deleteBilletRetard,
        totals,
        printModal,
        openPrintModal,
        closePrintModal,
        getFiliereById,
        getClasseById,
        getUserById,
        getMotifById,
        getBeneficiaireById,
        getSeanceById,
        getBeneficiaireDisplayName,
        resetData,
        reloadFromStorage
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
