import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { storageService } from '../services/storage';
import { User, Filiere, Classe, MotifAbsence, Role, UserStatus } from '../types';
import { InstitutionalBanner } from './InstitutionalBanner';
import { GestionUtilisateurs } from './GestionUtilisateurs';
import { GestionAnimateurs } from './GestionAnimateurs';
import { ConnexionSupabase } from './ConnexionSupabase';
import {
  Settings,
  Building,
  GraduationCap,
  Users,
  Layers,
  Clock,
  AlertCircle,
  Database,
  Sparkles,
  Save,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Download,
  Upload,
  RefreshCw,
  X,
  ShieldAlert,
  BookOpen,
  School,
  Search,
  Eye,
  Lock,
  Unlock,
  Filter
} from 'lucide-react';

export const Parametrage: React.FC = () => {
  const { isAdmin, refreshUsers } = useAuth();
  const {
    settings,
    updateSettings,
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
    motifs,
    addMotif,
    updateMotif,
    deleteMotif,
    resetData,
    reloadFromStorage,
    showToast,
    askConfirmation,
    t
  } = useApp();

  // If user is not admin, deny access
  if (!isAdmin) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center text-red-800">
        <ShieldAlert className="w-12 h-12 mx-auto text-red-600 mb-2" />
        <h2 className="text-lg font-bold">Accès Refusé</h2>
        <p className="text-sm mt-1">{t.restrictedAccess}</p>
      </div>
    );
  }

  // Active Tab in Settings
  const [activeTab, setActiveTab] = useState<'centre' | 'filieres' | 'classes' | 'animateurs' | 'users' | 'motifs' | 'general' | 'data' | 'supabase'>('centre');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Centre Form State
  const [centreForm, setCentreForm] = useState({ ...settings });

  // Users Management State
  const [usersList, setUsersList] = useState<User[]>(() => storageService.getUsers());
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({
    email: '',
    password: '',
    nomComplet: '',
    nomCompletAr: '',
    role: 'animateur' as Role,
    telephone: '',
    specialite: '',
    statut: 'actif' as UserStatus
  });

  // 1. Gestion des Filières State
  const [filiereSearch, setFiliereSearch] = useState('');
  const [filiereStatutFilter, setFiliereStatutFilter] = useState<'all' | 'actif' | 'inactif'>('all');
  const [filiereModalOpen, setFiliereModalOpen] = useState(false);
  const [viewingFiliere, setViewingFiliere] = useState<Filiere | null>(null);
  const [editingFiliere, setEditingFiliere] = useState<Filiere | null>(null);
  const [filiereForm, setFiliereForm] = useState({
    code: '',
    nomFr: '',
    nomAr: '',
    description: '',
    statut: 'actif' as 'actif' | 'inactif'
  });

  // 2. Gestion des Classes State
  const [classeSearch, setClasseSearch] = useState('');
  const [classeFiliereFilter, setClasseFiliereFilter] = useState<string>('all');
  const [classeStatutFilter, setClasseStatutFilter] = useState<'all' | 'actif' | 'inactif'>('all');
  const [classeModalOpen, setClasseModalOpen] = useState(false);
  const [viewingClasse, setViewingClasse] = useState<Classe | null>(null);
  const [editingClasse, setEditingClasse] = useState<Classe | null>(null);
  const [classeForm, setClasseForm] = useState({
    code: '',
    nomFr: '',
    nomAr: '',
    niveau: '1ère Année',
    filiereId: '',
    anneeScolaire: '2026-2027',
    statut: 'actif' as 'actif' | 'inactif'
  });

  // Motif Modal State
  const [motifModalOpen, setMotifModalOpen] = useState(false);
  const [editingMotif, setEditingMotif] = useState<MotifAbsence | null>(null);
  const [motifForm, setMotifForm] = useState({ code: '', libelleFr: '', libelleAr: '', justifieParDefaut: false });

  // Save Centre Settings
  const handleSaveCentre = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(centreForm);
    setSaveSuccess(true);
    showToast('✅ Modification réussie', 'success');
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // User Actions
  const handleOpenAddUser = () => {
    setEditingUser(null);
    setUserForm({
      email: '',
      password: '',
      nomComplet: '',
      nomCompletAr: '',
      role: 'animateur',
      telephone: '',
      specialite: '',
      statut: 'actif'
    });
    setUserModalOpen(true);
  };

  const handleOpenEditUser = (u: User) => {
    setEditingUser(u);
    setUserForm({
      email: u.email,
      password: '',
      nomComplet: u.nomComplet,
      nomCompletAr: u.nomCompletAr || '',
      role: u.role,
      telephone: u.telephone || '',
      specialite: u.specialite || '',
      statut: u.statut
    });
    setUserModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.email.trim() || !userForm.nomComplet.trim()) return;

    const allUsers = storageService.getUsers();
    if (editingUser) {
      const updated = allUsers.map(u => {
        if (u.id === editingUser.id) {
          return {
            ...u,
            ...userForm,
            password: userForm.password ? userForm.password : u.password
          };
        }
        return u;
      });
      storageService.setUsers(updated);
      setUsersList(updated);
      showToast('✅ Modification réussie', 'success');
    } else {
      const newUser: User = {
        id: `usr-${Date.now()}`,
        ...userForm,
        password: userForm.password || '123'
      };
      const updated = [...allUsers, newUser];
      storageService.setUsers(updated);
      setUsersList(updated);
      showToast('✅ Ajout réussi', 'success');
    }
    refreshUsers();
    setUserModalOpen(false);
  };

  const handleDeleteUser = (id: string) => {
    askConfirmation({
      title: "Supprimer l'utilisateur",
      message: "Êtes-vous certain de vouloir supprimer cet utilisateur ?",
      confirmLabel: "Supprimer",
      variant: "danger",
      onConfirm: () => {
        const allUsers = storageService.getUsers();
        const updated = allUsers.filter(u => u.id !== id);
        storageService.setUsers(updated);
        setUsersList(updated);
        refreshUsers();
        showToast('✅ Suppression réussie', 'success');
      }
    });
  };

  // Filières Actions
  const handleOpenAddFiliere = () => {
    setEditingFiliere(null);
    setFiliereForm({
      code: '',
      nomFr: '',
      nomAr: '',
      description: '',
      statut: 'actif'
    });
    setFiliereModalOpen(true);
  };

  const handleOpenEditFiliere = (f: Filiere) => {
    setEditingFiliere(f);
    setFiliereForm({
      code: f.code,
      nomFr: f.nomFr,
      nomAr: f.nomAr || '',
      description: f.description || '',
      statut: f.statut || 'actif'
    });
    setFiliereModalOpen(true);
  };

  const handleSaveFiliere = (e: React.FormEvent) => {
    e.preventDefault();
    if (!filiereForm.code.trim() || !filiereForm.nomFr.trim()) {
      showToast('⚠️ Le code et le nom français sont obligatoires.', 'warning');
      return;
    }
    const cleanCode = filiereForm.code.trim().toUpperCase();
    const isDuplicate = filieres.some(
      f => f.id !== editingFiliere?.id && f.code.trim().toUpperCase() === cleanCode
    );
    if (isDuplicate) {
      showToast('⚠️ Une filière avec ce code existe déjà.', 'error');
      return;
    }

    if (editingFiliere) {
      updateFiliere({
        ...editingFiliere,
        ...filiereForm,
        code: cleanCode
      });
    } else {
      addFiliere({
        ...filiereForm,
        code: cleanCode
      });
    }
    setFiliereModalOpen(false);
  };

  // Classes Actions
  const handleOpenAddClasse = () => {
    setEditingClasse(null);
    const activeFilieres = filieres.filter(f => f.statut !== 'inactif');
    setClasseForm({
      code: '',
      nomFr: '',
      nomAr: '',
      niveau: '1ère Année',
      filiereId: activeFilieres[0]?.id || '',
      anneeScolaire: '2026-2027',
      statut: 'actif'
    });
    setClasseModalOpen(true);
  };

  const handleOpenEditClasse = (c: Classe) => {
    setEditingClasse(c);
    setClasseForm({
      code: c.code,
      nomFr: c.nomFr,
      nomAr: c.nomAr || '',
      niveau: c.niveau || '1ère Année',
      filiereId: c.filiereId,
      anneeScolaire: c.anneeScolaire || '2026-2027',
      statut: c.statut || 'actif'
    });
    setClasseModalOpen(true);
  };

  const handleSaveClasse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!classeForm.code.trim() || !classeForm.nomFr.trim() || !classeForm.filiereId) {
      showToast('⚠️ Le code, le nom et la filière associée sont obligatoires.', 'warning');
      return;
    }
    const cleanCode = classeForm.code.trim().toUpperCase();
    const isDuplicate = classes.some(
      c => c.id !== editingClasse?.id && c.code.trim().toUpperCase() === cleanCode
    );
    if (isDuplicate) {
      showToast('⚠️ Une classe avec ce code existe déjà.', 'error');
      return;
    }

    if (editingClasse) {
      updateClasse({
        ...editingClasse,
        ...classeForm,
        code: cleanCode
      });
    } else {
      addClasse({
        ...classeForm,
        code: cleanCode
      });
    }
    setClasseModalOpen(false);
  };

  // Filtered Filières
  const filteredFilieres = filieres.filter(f => {
    if (filiereStatutFilter !== 'all' && (f.statut || 'actif') !== filiereStatutFilter) {
      return false;
    }
    if (filiereSearch.trim()) {
      const q = filiereSearch.toLowerCase().trim();
      const codeMatch = f.code?.toLowerCase().includes(q);
      const nomFrMatch = f.nomFr?.toLowerCase().includes(q);
      const nomArMatch = f.nomAr?.toLowerCase().includes(q);
      const descMatch = f.description?.toLowerCase().includes(q);
      return codeMatch || nomFrMatch || nomArMatch || descMatch;
    }
    return true;
  });

  // Filtered Classes
  const filteredClasses = classes.filter(c => {
    if (classeStatutFilter !== 'all' && (c.statut || 'actif') !== classeStatutFilter) {
      return false;
    }
    if (classeFiliereFilter !== 'all' && c.filiereId !== classeFiliereFilter) {
      return false;
    }
    if (classeSearch.trim()) {
      const q = classeSearch.toLowerCase().trim();
      const codeMatch = c.code?.toLowerCase().includes(q);
      const nomFrMatch = c.nomFr?.toLowerCase().includes(q);
      const nomArMatch = c.nomAr?.toLowerCase().includes(q);
      const niveauMatch = c.niveau?.toLowerCase().includes(q);
      const filiere = filieres.find(f => f.id === c.filiereId);
      const filiereMatch = filiere && (filiere.code.toLowerCase().includes(q) || filiere.nomFr.toLowerCase().includes(q));
      return codeMatch || nomFrMatch || nomArMatch || niveauMatch || filiereMatch;
    }
    return true;
  });

  // Motifs Actions
  const handleSaveMotif = (e: React.FormEvent) => {
    e.preventDefault();
    if (!motifForm.code || !motifForm.libelleFr) return;
    if (editingMotif) {
      updateMotif({ ...editingMotif, ...motifForm });
      showToast('✅ Modification réussie', 'success');
    } else {
      addMotif(motifForm);
      showToast('✅ Ajout réussi', 'success');
    }
    setMotifModalOpen(false);
  };

  // Backup Export
  const handleExport = () => {
    askConfirmation({
      title: "Exporter la sauvegarde",
      message: "Voulez-vous générer et télécharger la sauvegarde complète du système (JSON) ?",
      confirmLabel: "Exporter",
      variant: "info",
      onConfirm: () => {
        const jsonStr = storageService.exportBackup();
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sauvegarde-centre-zirara-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast({
          title: "Exportation",
          message: "Sauvegarde téléchargée avec succès.",
          type: "success"
        });
      }
    });
  };

  // Backup Import
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const content = evt.target?.result as string;
      if (content) {
        const ok = storageService.importBackup(content);
        if (ok) {
          reloadFromStorage();
          setUsersList(storageService.getUsers());
          showToast('✅ Importation réussie', 'success');
        } else {
          showToast({
            title: "Erreur d'importation",
            message: "Fichier de sauvegarde non valide.",
            type: "error"
          });
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      
      {/* Page Title */}
      <InstitutionalBanner
        title={t.settingsTitle}
        subtitle={t.settingsSubtitle}
        actionButton={
          saveSuccess ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
              {t.settingsSavedSuccess}
            </div>
          ) : undefined
        }
      />

      {/* Navigation Tabs (Canva Tech Segmented Control) */}
      <div className="bg-white rounded-3xl p-2 border border-slate-200/90 shadow-2xs flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setActiveTab('centre')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
            activeTab === 'centre'
              ? 'bg-gradient-to-r from-[#02b3bb] to-[#0891b2] text-white shadow-xs'
              : 'text-slate-600 hover:text-[#0a1a44] hover:bg-slate-100'
          }`}
        >
          <Building className="w-4 h-4" />
          {t.tabCentre}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('filieres')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
            activeTab === 'filieres'
              ? 'bg-gradient-to-r from-[#02b3bb] to-[#0891b2] text-white shadow-xs'
              : 'text-slate-600 hover:text-[#0a1a44] hover:bg-slate-100'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          📚 Gestion des Filières ({filieres.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('classes')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
            activeTab === 'classes'
              ? 'bg-gradient-to-r from-[#02b3bb] to-[#0891b2] text-white shadow-xs'
              : 'text-slate-600 hover:text-[#0a1a44] hover:bg-slate-100'
          }`}
        >
          <School className="w-4 h-4" />
          🏫 Gestion des Classes ({classes.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('animateurs')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
            activeTab === 'animateurs'
              ? 'bg-gradient-to-r from-[#02b3bb] to-[#0891b2] text-white shadow-xs'
              : 'text-slate-600 hover:text-[#0a1a44] hover:bg-slate-100'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          {t.tabAnimateurs || 'Gestion des animateurs'}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
            activeTab === 'users'
              ? 'bg-gradient-to-r from-[#02b3bb] to-[#0891b2] text-white shadow-xs'
              : 'text-slate-600 hover:text-[#0a1a44] hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          {t.tabUsers} ({usersList.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('motifs')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
            activeTab === 'motifs'
              ? 'bg-gradient-to-r from-[#02b3bb] to-[#0891b2] text-white shadow-xs'
              : 'text-slate-600 hover:text-[#0a1a44] hover:bg-slate-100'
          }`}
        >
          <AlertCircle className="w-4 h-4" />
          {t.tabMotifs}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
            activeTab === 'general'
              ? 'bg-gradient-to-r from-[#02b3bb] to-[#0891b2] text-white shadow-xs'
              : 'text-slate-600 hover:text-[#0a1a44] hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          {t.tabGeneral}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('data')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
            activeTab === 'data'
              ? 'bg-gradient-to-r from-[#02b3bb] to-[#0891b2] text-white shadow-xs'
              : 'text-slate-600 hover:text-[#0a1a44] hover:bg-slate-100'
          }`}
        >
          <Database className="w-4 h-4" />
          {t.tabData}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('supabase')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
            activeTab === 'supabase'
              ? 'bg-gradient-to-r from-[#02b3bb] to-[#0891b2] text-white shadow-xs'
              : 'text-slate-600 hover:text-[#0a1a44] hover:bg-slate-100'
          }`}
        >
          <Database className="w-4 h-4 text-emerald-400" />
          <span>🔗 Connexion Supabase</span>
        </button>
      </div>

      {/* Tab 1: Centre Information */}
      {activeTab === 'centre' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs">
          <form onSubmit={handleSaveCentre} className="space-y-4">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Nom officiel du centre (Français) *
                </label>
                <input
                  type="text"
                  value={centreForm.nomCentre}
                  onChange={e => setCentreForm({ ...centreForm, nomCentre: e.target.value })}
                  className="w-full py-2 px-3 text-sm rounded-xl border border-slate-300 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1 text-right">
                  الاسم الرسمي للمركز (بالعربية) *
                </label>
                <input
                  type="text"
                  dir="rtl"
                  value={centreForm.nomCentreAr}
                  onChange={e => setCentreForm({ ...centreForm, nomCentreAr: e.target.value })}
                  className="w-full py-2 px-3 text-sm rounded-xl border border-slate-300 font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ministère de tutelle
                </label>
                <input
                  type="text"
                  value={centreForm.ministereFr}
                  onChange={e => setCentreForm({ ...centreForm, ministereFr: e.target.value })}
                  className="w-full py-2 px-3 text-sm rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Direction Provinciale
                </label>
                <input
                  type="text"
                  value={centreForm.directionProvincialeFr}
                  onChange={e => setCentreForm({ ...centreForm, directionProvincialeFr: e.target.value })}
                  className="w-full py-2 px-3 text-sm rounded-xl border border-slate-300"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ville / Commune
                </label>
                <input
                  type="text"
                  value={centreForm.ville}
                  onChange={e => setCentreForm({ ...centreForm, ville: e.target.value })}
                  className="w-full py-2 px-3 text-sm rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Province
                </label>
                <input
                  type="text"
                  value={centreForm.province}
                  onChange={e => setCentreForm({ ...centreForm, province: e.target.value })}
                  className="w-full py-2 px-3 text-sm rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Année scolaire courante
                </label>
                <input
                  type="text"
                  value={centreForm.anneeScolaireCourante}
                  onChange={e => setCentreForm({ ...centreForm, anneeScolaireCourante: e.target.value })}
                  className="w-full py-2 px-3 text-sm rounded-xl border border-slate-300"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Téléphone du centre
                </label>
                <input
                  type="text"
                  value={centreForm.telephone}
                  onChange={e => setCentreForm({ ...centreForm, telephone: e.target.value })}
                  className="w-full py-2 px-3 text-sm rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email officiel
                </label>
                <input
                  type="email"
                  value={centreForm.email}
                  onChange={e => setCentreForm({ ...centreForm, email: e.target.value })}
                  className="w-full py-2 px-3 text-sm rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Directeur du centre
                </label>
                <input
                  type="text"
                  value={centreForm.nomDirecteur}
                  onChange={e => setCentreForm({ ...centreForm, nomDirecteur: e.target.value })}
                  className="w-full py-2 px-3 text-sm rounded-xl border border-slate-300"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Adresse physique du centre
              </label>
              <input
                type="text"
                value={centreForm.adresse}
                onChange={e => setCentreForm({ ...centreForm, adresse: e.target.value })}
                className="w-full py-2 px-3 text-sm rounded-xl border border-slate-300"
              />
            </div>

            <div className="pt-4 border-t border-slate-200 text-right">
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl text-xs sm:text-sm font-black text-white bg-gradient-to-r from-[#02b3bb] to-[#0891b2] hover:from-[#0099a8] hover:to-[#0e7490] active:scale-95 shadow-md shadow-cyan-900/15 transition-all min-h-[40px] cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {t.saveSettings}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: Animateurs Management */}
      {activeTab === 'animateurs' && (
        <GestionAnimateurs />
      )}

      {/* Tab 3: Users Management */}
      {activeTab === 'users' && (
        <GestionUtilisateurs />
      )}

      {/* Tab: 📚 Gestion des Filières */}
      {activeTab === 'filieres' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-6">
          {/* Header with Title & Add button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-50 text-cyan-700">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-[#0a1a44]">
                    📚 Gestion des Filières
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Gestion et paramétrage des filières professionnelles et métiers de formation.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenAddFiliere}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black text-white bg-gradient-to-r from-[#02b3bb] to-[#0891b2] hover:from-[#0099a8] hover:to-[#0e7490] active:scale-95 shadow-md shadow-cyan-900/15 transition-all cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter une filière</span>
            </button>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={filiereSearch}
                onChange={e => setFiliereSearch(e.target.value)}
                placeholder="Rechercher par Code, Nom FR, Nom AR ou Description..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all bg-slate-50/50"
              />
              {filiereSearch && (
                <button
                  type="button"
                  onClick={() => setFiliereSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-md"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filiereStatutFilter}
                onChange={e => setFiliereStatutFilter(e.target.value as 'all' | 'actif' | 'inactif')}
                className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500/20 bg-white"
              >
                <option value="all">Tous les statuts</option>
                <option value="actif">🟢 Actifs uniquement</option>
                <option value="inactif">⚪ Inactifs uniquement</option>
              </select>
            </div>
          </div>

          {/* Filières Table List */}
          {filteredFilieres.length === 0 ? (
            <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-600">Aucune filière trouvée</p>
              <p className="text-xs text-slate-400 mt-0.5">Modifiez vos critères de recherche ou ajoutez une nouvelle filière.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/90 text-slate-600 font-bold border-b border-slate-200 uppercase text-[11px] tracking-wider">
                    <th className="py-3 px-3.5 text-center w-12">N°</th>
                    <th className="py-3 px-3.5">Code</th>
                    <th className="py-3 px-3.5">Nom Filière (FR)</th>
                    <th className="py-3 px-3.5 text-right">Nom Filière (AR)</th>
                    <th className="py-3 px-3.5 hidden md:table-cell">Description</th>
                    <th className="py-3 px-3.5 text-center">Classes</th>
                    <th className="py-3 px-3.5 text-center">Statut</th>
                    <th className="py-3 px-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredFilieres.map((f, idx) => {
                    const associatedClasses = classes.filter(c => c.filiereId === f.id);
                    const isActif = (f.statut || 'actif') === 'actif';
                    return (
                      <tr
                        key={f.id}
                        className="hover:bg-cyan-50/30 transition-colors group"
                      >
                        <td className="py-3 px-3.5 text-center font-mono text-slate-400 font-bold">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3.5 font-bold">
                          <span className="font-mono px-2 py-0.5 rounded-lg bg-cyan-50 text-cyan-800 border border-cyan-200 text-xs">
                            {f.code}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 font-bold text-slate-900">
                          {f.nomFr}
                        </td>
                        <td className="py-3 px-3.5 text-right font-sans text-slate-800" dir="rtl">
                          {f.nomAr || '—'}
                        </td>
                        <td className="py-3 px-3.5 hidden md:table-cell text-slate-500 max-w-xs truncate">
                          {f.description || '—'}
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          <span className="inline-flex items-center gap-1 font-bold text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg">
                            <School className="w-3 h-3 text-slate-500" />
                            {associatedClasses.length}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              isActif
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isActif ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            {isActif ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* 👁️ Voir */}
                            <button
                              type="button"
                              onClick={() => setViewingFiliere(f)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-700 hover:bg-cyan-50 border border-transparent hover:border-cyan-200 transition-all"
                              title="Voir les détails"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* ✏️ Modifier */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditFiliere(f)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-all"
                              title="Modifier"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* 🔒 Activer / Désactiver */}
                            <button
                              type="button"
                              onClick={() => toggleFiliereStatut(f.id)}
                              className={`p-1.5 rounded-lg border border-transparent transition-all ${
                                isActif
                                  ? 'text-emerald-600 hover:text-rose-700 hover:bg-rose-50 hover:border-rose-200'
                                  : 'text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200'
                              }`}
                              title={isActif ? 'Désactiver la filière' : 'Activer la filière'}
                            >
                              {isActif ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                            </button>

                            {/* 🗑️ Supprimer */}
                            <button
                              type="button"
                              onClick={() => {
                                askConfirmation({
                                  title: "Supprimer la filière",
                                  message: `Êtes-vous certain de vouloir supprimer la filière "${f.nomFr}" (${f.code}) ? Toutes les classes associées perdront leur référence.`,
                                  confirmLabel: "Supprimer",
                                  variant: "danger",
                                  onConfirm: () => {
                                    deleteFiliere(f.id);
                                  }
                                });
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all"
                              title="Supprimer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: 🏫 Gestion des Classes */}
      {activeTab === 'classes' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-6">
          {/* Header with Title & Add button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
                  <School className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-[#0a1a44]">
                    🏫 Gestion des Classes
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Paramétrage des classes, groupes pédagogiques et rattachement aux filières.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenAddClasse}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black text-white bg-gradient-to-r from-[#02b3bb] to-[#0891b2] hover:from-[#0099a8] hover:to-[#0e7490] active:scale-95 shadow-md shadow-cyan-900/15 transition-all cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter une classe</span>
            </button>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={classeSearch}
                onChange={e => setClasseSearch(e.target.value)}
                placeholder="Rechercher par Code, Nom FR, Nom AR, Niveau ou Filière..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all bg-slate-50/50"
              />
              {classeSearch && (
                <button
                  type="button"
                  onClick={() => setClasseSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-md"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter by Filière */}
            <div className="flex items-center gap-2">
              <select
                value={classeFiliereFilter}
                onChange={e => setClasseFiliereFilter(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500/20 bg-white"
              >
                <option value="all">Toutes les filières</option>
                {filieres.map(f => (
                  <option key={f.id} value={f.id}>
                    [{f.code}] {f.nomFr}
                  </option>
                ))}
              </select>

              {/* Filter by Statut */}
              <select
                value={classeStatutFilter}
                onChange={e => setClasseStatutFilter(e.target.value as 'all' | 'actif' | 'inactif')}
                className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500/20 bg-white"
              >
                <option value="all">Tous statuts</option>
                <option value="actif">🟢 Actifs</option>
                <option value="inactif">⚪ Inactifs</option>
              </select>
            </div>
          </div>

          {/* Classes Table List */}
          {filteredClasses.length === 0 ? (
            <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <School className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-600">Aucune classe trouvée</p>
              <p className="text-xs text-slate-400 mt-0.5">Modifiez vos critères de recherche ou ajoutez une nouvelle classe.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/90 text-slate-600 font-bold border-b border-slate-200 uppercase text-[11px] tracking-wider">
                    <th className="py-3 px-3.5 text-center w-12">N°</th>
                    <th className="py-3 px-3.5">Code Classe</th>
                    <th className="py-3 px-3.5">Nom Classe (FR)</th>
                    <th className="py-3 px-3.5 text-right">Nom Classe (AR)</th>
                    <th className="py-3 px-3.5">Niveau</th>
                    <th className="py-3 px-3.5">Filière associée</th>
                    <th className="py-3 px-3.5 text-center">Effectif</th>
                    <th className="py-3 px-3.5 text-center">Statut</th>
                    <th className="py-3 px-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredClasses.map((c, idx) => {
                    const f = filieres.find(fil => fil.id === c.filiereId);
                    const learnersCount = beneficiaires.filter(b => b.classeId === c.id).length;
                    const isActif = (c.statut || 'actif') === 'actif';
                    return (
                      <tr
                        key={c.id}
                        className="hover:bg-blue-50/30 transition-colors group"
                      >
                        <td className="py-3 px-3.5 text-center font-mono text-slate-400 font-bold">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3.5 font-bold">
                          <span className="font-mono px-2 py-0.5 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 text-xs">
                            {c.code}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 font-bold text-slate-900">
                          {c.nomFr}
                        </td>
                        <td className="py-3 px-3.5 text-right font-sans text-slate-800" dir="rtl">
                          {c.nomAr || '—'}
                        </td>
                        <td className="py-3 px-3.5 text-slate-600">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                            {c.niveau || '1ère Année'}
                          </span>
                        </td>
                        <td className="py-3 px-3.5">
                          {f ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                              <BookOpen className="w-3 h-3 text-emerald-600" />
                              <span className="font-mono font-bold">[{f.code}]</span> {f.nomFr}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Non rattachée</span>
                          )}
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          <span className="inline-flex items-center gap-1 font-bold text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg">
                            <Users className="w-3 h-3 text-slate-500" />
                            {learnersCount}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              isActif
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isActif ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            {isActif ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* 👁️ Voir */}
                            <button
                              type="button"
                              onClick={() => setViewingClasse(c)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-all"
                              title="Voir les détails"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* ✏️ Modifier */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditClasse(c)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-all"
                              title="Modifier"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* 🔒 Activer / Désactiver */}
                            <button
                              type="button"
                              onClick={() => toggleClasseStatut(c.id)}
                              className={`p-1.5 rounded-lg border border-transparent transition-all ${
                                isActif
                                  ? 'text-emerald-600 hover:text-rose-700 hover:bg-rose-50 hover:border-rose-200'
                                  : 'text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200'
                              }`}
                              title={isActif ? 'Désactiver la classe' : 'Activer la classe'}
                            >
                              {isActif ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                            </button>

                            {/* 🗑️ Supprimer */}
                            <button
                              type="button"
                              onClick={() => {
                                askConfirmation({
                                  title: "Supprimer la classe",
                                  message: `Êtes-vous certain de vouloir supprimer la classe "${c.nomFr}" (${c.code}) ?`,
                                  confirmLabel: "Supprimer",
                                  variant: "danger",
                                  onConfirm: () => {
                                    deleteClasse(c.id);
                                  }
                                });
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all"
                              title="Supprimer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Motifs d'absence (Canva Tech Card) */}
      {activeTab === 'motifs' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-[#0a1a44]">
              Motifs d'Absence Paramétrables
            </h2>
            <button
              type="button"
              onClick={() => {
                setEditingMotif(null);
                setMotifForm({ code: '', libelleFr: '', libelleAr: '', justifieParDefaut: false });
                setMotifModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-black text-white bg-gradient-to-r from-[#02b3bb] to-[#0891b2] hover:from-[#0099a8] hover:to-[#0e7490] active:scale-95 shadow-md shadow-cyan-900/15 transition-all min-h-[36px] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              {t.addMotif}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {motifs.map(m => (
              <div
                key={m.id}
                className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-cyan-50/20 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                      {m.code}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        m.justifieParDefaut
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {m.justifieParDefaut ? 'Justifié' : 'Non justifié'}
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-900 text-sm mt-2">
                    {m.libelleFr}
                  </h3>
                  <p className="text-xs text-slate-500 font-sans mt-0.5" dir="rtl">
                    {m.libelleAr}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingMotif(m);
                      setMotifForm({ code: m.code, libelleFr: m.libelleFr, libelleAr: m.libelleAr, justifieParDefaut: m.justifieParDefaut });
                      setMotifModalOpen(true);
                    }}
                    className="p-2 rounded-xl text-slate-600 bg-white hover:bg-blue-50 hover:text-blue-700 border border-slate-200 active:scale-[0.98] transition-all shadow-2xs"
                    title="Modifier le motif"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      askConfirmation({
                        title: "Supprimer le motif",
                        message: `Êtes-vous certain de vouloir supprimer le motif "${m.libelleFr}" (${m.code}) ?`,
                        confirmLabel: "Supprimer",
                        variant: "danger",
                        onConfirm: () => {
                          deleteMotif(m.id);
                          showToast({
                            title: "Suppression",
                            message: "Motif supprimé avec succès.",
                            type: "info"
                          });
                        }
                      });
                    }}
                    className="p-2 rounded-xl text-rose-600 bg-white hover:bg-rose-50 border border-rose-200 active:scale-[0.98] transition-all shadow-2xs"
                    title="Supprimer le motif"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: General Settings (Canva Tech Card) */}
      {activeTab === 'general' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs">
          <form onSubmit={handleSaveCentre} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-black text-[#0a1a44] mb-1">
                {t.dayStartTime}
              </label>
              <input
                type="time"
                value={centreForm.heureDebutJournee}
                onChange={e => setCentreForm({ ...centreForm, heureDebutJournee: e.target.value })}
                className="w-full py-2.5 px-3.5 text-sm rounded-2xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#02b3bb] font-semibold text-[#0a1a44]"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-[#0a1a44] mb-1">
                {t.dayEndTime}
              </label>
              <input
                type="time"
                value={centreForm.heureFinJournee}
                onChange={e => setCentreForm({ ...centreForm, heureFinJournee: e.target.value })}
                className="w-full py-2.5 px-3.5 text-sm rounded-2xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#02b3bb] font-semibold text-[#0a1a44]"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-[#0a1a44] mb-1">
                {t.sessionDuration}
              </label>
              <input
                type="number"
                value={centreForm.dureeSeanceMinutes}
                onChange={e => setCentreForm({ ...centreForm, dureeSeanceMinutes: parseInt(e.target.value) || 90 })}
                className="w-full py-2.5 px-3.5 text-sm rounded-2xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#02b3bb] font-semibold text-[#0a1a44]"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-[#0a1a44] mb-1">
                {t.absenceThreshold}
              </label>
              <input
                type="number"
                value={centreForm.seuilConvocationAbsences}
                onChange={e => setCentreForm({ ...centreForm, seuilConvocationAbsences: parseInt(e.target.value) || 3 })}
                className="w-full py-2.5 px-3.5 text-sm rounded-2xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#02b3bb] font-semibold text-[#0a1a44]"
              />
            </div>

            <div className="pt-4 border-t border-slate-200">
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl text-xs sm:text-sm font-black text-white bg-gradient-to-r from-[#02b3bb] to-[#0891b2] hover:from-[#0099a8] hover:to-[#0e7490] active:scale-95 shadow-md shadow-cyan-900/15 transition-all min-h-[40px] cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {t.saveSettings}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 6: Data & Backup (Canva Tech Card) */}
      {activeTab === 'data' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-6 max-w-2xl">
          <div>
            <h2 className="text-base font-black text-[#0a1a44]">
              Sauvegarde et Restauration des Données
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Toutes les données sont stockées de façon normalisée et sécurisée. Vous pouvez exporter un fichier JSON complet ou réinitialiser le centre.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between">
              <div>
                <h3 className="font-black text-sm text-[#0a1a44]">
                  {t.backupExport}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Télécharger un fichier JSON contenant l'intégralité des bénéficiaires, plannings et absences.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExport}
                className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black text-white bg-gradient-to-r from-[#02b3bb] to-[#0891b2] hover:from-[#0099a8] hover:to-[#0e7490] active:scale-95 shadow-2xs transition-all min-h-[38px] cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Télécharger la sauvegarde
              </button>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between">
              <div>
                <h3 className="font-black text-sm text-[#0a1a44]">
                  {t.backupImport}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Restaurer un fichier de sauvegarde JSON préalablement exporté.
                </p>
              </div>
              <label className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black text-[#0a1a44] bg-white border border-slate-200 hover:bg-slate-50 active:scale-95 shadow-2xs cursor-pointer transition-all min-h-[38px]">
                <Upload className="w-4 h-4 text-[#02b3bb]" />
                Sélectionner un fichier JSON
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50">
            <h3 className="font-bold text-sm text-rose-900 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-rose-600" />
              {t.resetData}
            </h3>
            <p className="text-xs text-rose-700 mt-1">
              Cette action réinitialise toutes les données aux valeurs par défaut de démonstration du Centre Deuxième Chance Nouvelle Génération Zirara.
            </p>
            <button
              type="button"
              onClick={() => {
                askConfirmation({
                  title: "Réinitialiser les données",
                  message: t.confirmReset,
                  confirmLabel: "Réinitialiser",
                  variant: "danger",
                  onConfirm: () => {
                    resetData();
                    setUsersList(storageService.getUsers());
                    showToast({
                      title: "Réinitialisation",
                      message: "Données réinitialisées avec succès.",
                      type: "info"
                    });
                  }
                });
              }}
              className="mt-3 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-700 active:scale-[0.98] shadow-md transition-all min-h-[38px]"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Réinitialiser maintenant</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab: Connexion Supabase */}
      {activeTab === 'supabase' && <ConnexionSupabase />}

      {/* User Modal */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-slate-900">
                {editingUser ? t.editUser : t.addUser}
              </h3>
              <button onClick={() => setUserModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveUser} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t.fullName} *</label>
                <input
                  type="text"
                  required
                  value={userForm.nomComplet}
                  onChange={e => setUserForm({ ...userForm, nomComplet: e.target.value })}
                  placeholder="Ex: Hassan El Amrani"
                  className="w-full py-2 px-3 text-sm rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 text-right">الاسم الكامل (بالعربية)</label>
                <input
                  type="text"
                  dir="rtl"
                  value={userForm.nomCompletAr}
                  onChange={e => setUserForm({ ...userForm, nomCompletAr: e.target.value })}
                  placeholder="مثال: حسن العمراني"
                  className="w-full py-2 px-3 text-sm rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t.email} *</label>
                <input
                  type="email"
                  required
                  value={userForm.email}
                  onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                  placeholder="hassan@zirara.ma"
                  className="w-full py-2 px-3 text-sm rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t.password}</label>
                <input
                  type="password"
                  value={userForm.password}
                  onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full py-2 px-3 text-sm rounded-xl border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.role} *</label>
                  <select
                    value={userForm.role}
                    onChange={e => setUserForm({ ...userForm, role: e.target.value as Role })}
                    className="w-full py-2 px-3 text-sm rounded-xl border border-slate-300"
                  >
                    <option value="animateur">{t.roleAnimateur}</option>
                    <option value="admin">{t.roleAdmin}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.userStatus}</label>
                  <select
                    value={userForm.statut}
                    onChange={e => setUserForm({ ...userForm, statut: e.target.value as UserStatus })}
                    className="w-full py-2 px-3 text-sm rounded-xl border border-slate-300"
                  >
                    <option value="actif">Actif</option>
                    <option value="inactif">Inactif</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t.speciality}</label>
                <input
                  type="text"
                  value={userForm.specialite}
                  onChange={e => setUserForm({ ...userForm, specialite: e.target.value })}
                  placeholder="Ex: Électricité de Bâtiment"
                  className="w-full py-2 px-3 text-sm rounded-xl border border-slate-300"
                />
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 active:scale-[0.98] transition-all"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] rounded-xl shadow-2xs transition-all"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{t.save}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filière Modal */}
      {filiereModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-slate-900">
                {editingFiliere ? 'Modifier la filière' : t.addFiliere}
              </h3>
              <button onClick={() => setFiliereModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveFiliere} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t.filiereCode} *</label>
                <input
                  type="text"
                  required
                  value={filiereForm.code}
                  onChange={e => setFiliereForm({ ...filiereForm, code: e.target.value.toUpperCase() })}
                  placeholder="Ex: EB"
                  className="w-full py-2 px-3 text-sm rounded-xl border border-slate-300 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t.filiereNameFr} *</label>
                <input
                  type="text"
                  required
                  value={filiereForm.nomFr}
                  onChange={e => setFiliereForm({ ...filiereForm, nomFr: e.target.value })}
                  placeholder="Ex: Électricité de Bâtiment"
                  className="w-full py-2 px-3 text-sm rounded-xl border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 text-right">{t.filiereNameAr}</label>
                <input
                  type="text"
                  dir="rtl"
                  value={filiereForm.nomAr}
                  onChange={e => setFiliereForm({ ...filiereForm, nomAr: e.target.value })}
                  placeholder="مثال: كهرباء البناء"
                  className="w-full py-2 px-3 text-sm rounded-xl border border-slate-300"
                />
              </div>
              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setFiliereModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 active:scale-[0.98] transition-all"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] rounded-xl shadow-2xs transition-all"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{t.save}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Classe Modal */}
      {classeModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-slate-900">
                {editingClasse ? 'Modifier la classe' : t.addClass}
              </h3>
              <button onClick={() => setClasseModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveClasse} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t.classCode} *</label>
                <input
                  type="text"
                  required
                  value={classeForm.code}
                  onChange={e => setClasseForm({ ...classeForm, code: e.target.value.toUpperCase() })}
                  placeholder="Ex: EB-1"
                  className="w-full py-2 px-3 text-sm rounded-xl border border-slate-300 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t.classNameFr} *</label>
                <input
                  type="text"
                  required
                  value={classeForm.nomFr}
                  onChange={e => setClasseForm({ ...classeForm, nomFr: e.target.value })}
                  placeholder="Ex: Électricité Bâtiment - Groupe 1"
                  className="w-full py-2 px-3 text-sm rounded-xl border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t.colFiliere} *</label>
                <select
                  value={classeForm.filiereId}
                  onChange={e => setClasseForm({ ...classeForm, filiereId: e.target.value })}
                  className="w-full py-2 px-3 text-sm rounded-xl border border-slate-300"
                >
                  {filieres.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.code} - {f.nomFr}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Année scolaire *</label>
                <input
                  type="text"
                  required
                  value={classeForm.anneeScolaire}
                  onChange={e => setClasseForm({ ...classeForm, anneeScolaire: e.target.value })}
                  placeholder="Ex: 2026-2027"
                  className="w-full py-2 px-3 text-sm rounded-xl border border-slate-300 font-mono"
                />
              </div>
              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setClasseModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 active:scale-[0.98] transition-all"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] rounded-xl shadow-2xs transition-all"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{t.save}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Motif Modal */}
      {motifModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-slate-900">
                {editingMotif ? 'Modifier le motif' : t.addMotif}
              </h3>
              <button onClick={() => setMotifModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveMotif} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Code *</label>
                <input
                  type="text"
                  required
                  value={motifForm.code}
                  onChange={e => setMotifForm({ ...motifForm, code: e.target.value.toUpperCase() })}
                  placeholder="Ex: MAL"
                  className="w-full py-2 px-3 text-sm rounded-xl border border-slate-300 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t.motifLabelFr} *</label>
                <input
                  type="text"
                  required
                  value={motifForm.libelleFr}
                  onChange={e => setMotifForm({ ...motifForm, libelleFr: e.target.value })}
                  placeholder="Ex: Maladie avec certificat"
                  className="w-full py-2 px-3 text-sm rounded-xl border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 text-right">{t.motifLabelAr}</label>
                <input
                  type="text"
                  dir="rtl"
                  value={motifForm.libelleAr}
                  onChange={e => setMotifForm({ ...motifForm, libelleAr: e.target.value })}
                  placeholder="مثال: مرض مع شهادة طبية"
                  className="w-full py-2 px-3 text-sm rounded-xl border border-slate-300"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="justifieParDefaut"
                  checked={motifForm.justifieParDefaut}
                  onChange={e => setMotifForm({ ...motifForm, justifieParDefaut: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="justifieParDefaut" className="text-xs font-medium text-slate-700">
                  {t.justifiedByDefault}
                </label>
              </div>
              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMotifModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 active:scale-[0.98] transition-all"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] rounded-xl shadow-2xs transition-all"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{t.save}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
