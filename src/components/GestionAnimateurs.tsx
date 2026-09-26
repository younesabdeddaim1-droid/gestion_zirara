import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { User, UserStatus } from '../types';
import {
  GraduationCap,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Mail,
  Phone,
  BookOpen,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Layers,
  Sparkles,
  UserCheck,
  UserX,
  X,
  Save,
  Lock,
  MessageSquare,
  Shield,
  HelpCircle,
  Eye
} from 'lucide-react';

export const GestionAnimateurs: React.FC = () => {
  const { users, addUser, updateUser, deleteUser, toggleUserStatus, refreshUsers } = useAuth();
  const { filieres, classes, getFiliereById, getClasseById, showToast, askConfirmation, isRtl } = useApp();

  // -------------------------------------------------------------
  // STATES: FILTERS & SEARCH
  // -------------------------------------------------------------
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | UserStatus>('all');
  const [filiereFilter, setFiliereFilter] = useState<string>('all');
  const [classeFilter, setClasseFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // -------------------------------------------------------------
  // STATES: MODAL (ADD / EDIT)
  // -------------------------------------------------------------
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAnimateur, setEditingAnimateur] = useState<User | null>(null);

  const initialFormState = {
    nom: '',
    prenom: '',
    nomCompletAr: '',
    email: '',
    telephone: '',
    password: '',
    filiereId: '',
    classeId: '',
    statut: 'actif' as UserStatus,
    observation: ''
  };

  const [formData, setFormData] = useState(initialFormState);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // -------------------------------------------------------------
  // FILTERED ANIMATORS LIST
  // Filter all users that have role === 'animateur'
  // -------------------------------------------------------------
  const animateursList = useMemo(() => {
    return users.filter(u => u.role === 'animateur');
  }, [users]);

  const filteredAnimateurs = useMemo(() => {
    return animateursList.filter(anim => {
      // 1. Search Query
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase().trim();
        const fullName = (anim.nomComplet || `${anim.nom || ''} ${anim.prenom || ''}`).toLowerCase();
        const nom = (anim.nom || '').toLowerCase();
        const prenom = (anim.prenom || '').toLowerCase();
        const nomAr = (anim.nomCompletAr || '').toLowerCase();
        const email = (anim.email || '').toLowerCase();
        const tel = (anim.telephone || '').toLowerCase();
        const obs = (anim.observation || '').toLowerCase();
        const filiere = anim.filiereId ? getFiliereById(anim.filiereId)?.nomFr.toLowerCase() || '' : '';
        const classe = anim.classeId ? getClasseById(anim.classeId)?.nomFr.toLowerCase() || '' : '';

        const matchSearch =
          fullName.includes(query) ||
          nom.includes(query) ||
          prenom.includes(query) ||
          nomAr.includes(query) ||
          email.includes(query) ||
          tel.includes(query) ||
          obs.includes(query) ||
          filiere.includes(query) ||
          classe.includes(query);

        if (!matchSearch) return false;
      }

      // 2. Status Filter
      if (statusFilter !== 'all' && anim.statut !== statusFilter) {
        return false;
      }

      // 3. Filière Filter
      if (filiereFilter !== 'all' && anim.filiereId !== filiereFilter) {
        return false;
      }

      // 4. Classe Filter
      if (classeFilter !== 'all' && anim.classeId !== classeFilter) {
        return false;
      }

      return true;
    });
  }, [animateursList, searchTerm, statusFilter, filiereFilter, classeFilter, getFiliereById, getClasseById]);

  // -------------------------------------------------------------
  // KPIS
  // -------------------------------------------------------------
  const kpis = useMemo(() => {
    const total = animateursList.length;
    const actifs = animateursList.filter(a => a.statut === 'actif').length;
    const inactifs = animateursList.filter(a => a.statut === 'inactif').length;
    const filieresAssignees = new Set(
      animateursList.map(a => a.filiereId).filter(Boolean)
    ).size;

    return { total, actifs, inactifs, filieresAssignees };
  }, [animateursList]);

  // -------------------------------------------------------------
  // MODAL HANDLERS
  // -------------------------------------------------------------
  const handleOpenAdd = () => {
    setEditingAnimateur(null);
    setFormData({
      nom: '',
      prenom: '',
      nomCompletAr: '',
      email: '',
      telephone: '',
      password: '',
      filiereId: filieres[0]?.id || '',
      classeId: classes.find(c => c.filiereId === filieres[0]?.id)?.id || '',
      statut: 'actif',
      observation: ''
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const handleOpenEdit = (anim: User) => {
    setEditingAnimateur(anim);
    
    // Parse nom and prenom if they weren't stored separately
    let nom = anim.nom || '';
    let prenom = anim.prenom || '';
    if (!nom && !prenom && anim.nomComplet) {
      const parts = anim.nomComplet.trim().split(' ');
      if (parts.length > 1) {
        nom = parts[0];
        prenom = parts.slice(1).join(' ');
      } else {
        nom = anim.nomComplet;
      }
    }

    setFormData({
      nom,
      prenom,
      nomCompletAr: anim.nomCompletAr || '',
      email: anim.email || '',
      telephone: anim.telephone || '',
      password: '',
      filiereId: anim.filiereId || '',
      classeId: anim.classeId || '',
      statut: anim.statut,
      observation: anim.observation || ''
    });
    setFormErrors({});
    setModalOpen(true);
  };

  // Filière change inside modal -> auto update classe choices
  const handleModalFiliereChange = (fId: string) => {
    const matchingClasses = classes.filter(c => c.filiereId === fId);
    const newClasseId = matchingClasses.length > 0 ? matchingClasses[0].id : '';
    setFormData(prev => ({
      ...prev,
      filiereId: fId,
      classeId: newClasseId
    }));
  };

  const handleSaveAnimateur = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const errors: Record<string, string> = {};
    if (!formData.nom.trim()) {
      errors.nom = 'Le nom est obligatoire';
    }
    if (!formData.prenom.trim()) {
      errors.prenom = 'Le prénom est obligatoire';
    }
    if (!formData.email.trim()) {
      errors.email = "L'adresse email est obligatoire";
    } else if (!formData.email.includes('@') || !formData.email.includes('.')) {
      errors.email = "Format d'email invalide";
    } else {
      // Check duplicate email (excluding currently edited animator)
      const duplicate = users.find(
        u => u.email.toLowerCase().trim() === formData.email.toLowerCase().trim() &&
             (!editingAnimateur || u.id !== editingAnimateur.id)
      );
      if (duplicate) {
        errors.email = 'Cette adresse email est déjà utilisée par un autre compte';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const nomComplet = `${formData.nom.trim().toUpperCase()} ${formData.prenom.trim()}`;
    const selectedFiliere = getFiliereById(formData.filiereId);
    const specialite = selectedFiliere ? selectedFiliere.nomFr : 'Formateur Pédagogique';

    if (editingAnimateur) {
      const updatedUser: User = {
        ...editingAnimateur,
        nom: formData.nom.trim(),
        prenom: formData.prenom.trim(),
        nomComplet,
        nomCompletAr: formData.nomCompletAr.trim() || undefined,
        email: formData.email.trim().toLowerCase(),
        telephone: formData.telephone.trim() || undefined,
        filiereId: formData.filiereId || undefined,
        classeId: formData.classeId || undefined,
        statut: formData.statut,
        observation: formData.observation.trim() || undefined,
        specialite,
        role: 'animateur',
        password: formData.password ? formData.password : editingAnimateur.password
      };

      updateUser(updatedUser);
      refreshUsers();
      showToast(`✅ L'animateur ${nomComplet} a été modifié avec succès`, 'success');
    } else {
      const newUser: User = {
        id: `usr-anim-${Date.now()}`,
        nom: formData.nom.trim(),
        prenom: formData.prenom.trim(),
        nomComplet,
        nomCompletAr: formData.nomCompletAr.trim() || undefined,
        email: formData.email.trim().toLowerCase(),
        telephone: formData.telephone.trim() || undefined,
        filiereId: formData.filiereId || undefined,
        classeId: formData.classeId || undefined,
        statut: formData.statut,
        observation: formData.observation.trim() || undefined,
        specialite,
        role: 'animateur',
        password: formData.password || '123456'
      };

      addUser(newUser);
      refreshUsers();
      showToast(`✅ L'animateur ${nomComplet} a été ajouté avec succès`, 'success');
    }

    setModalOpen(false);
  };

  // -------------------------------------------------------------
  // STATUS TOGGLE & DELETE CONFIRMATIONS
  // -------------------------------------------------------------
  const handleToggleStatusWithConfirm = (anim: User) => {
    const isCurrentlyActive = anim.statut === 'actif';
    const actionName = isCurrentlyActive ? 'Désactiver' : 'Activer';
    const newStatusLabel = isCurrentlyActive ? 'Inactif' : 'Actif';

    askConfirmation({
      title: `${actionName} l'animateur`,
      message: isCurrentlyActive
        ? `Êtes-vous sûr de vouloir désactiver l'animateur "${anim.nomComplet}" ? Il ne sera plus disponible dans les nouvelles saisies de séances et de planning.`
        : `Voulez-vous réactiver l'animateur "${anim.nomComplet}" ? Il sera à nouveau disponible dans le planning et les séances.`,
      confirmLabel: `${actionName} (${newStatusLabel})`,
      cancelText: 'Annuler',
      variant: isCurrentlyActive ? 'warning' : 'primary',
      onConfirm: () => {
        toggleUserStatus(anim.id);
        refreshUsers();
        showToast(
          isCurrentlyActive
            ? `⚪ L'animateur ${anim.nomComplet} a été désactivé (Inactif)`
            : `🟢 L'animateur ${anim.nomComplet} a été réactivé (Actif)`,
          'success'
        );
      }
    });
  };

  const handleDeleteWithConfirm = (anim: User) => {
    askConfirmation({
      title: `Supprimer l'animateur`,
      message: `Êtes-vous sûr de vouloir supprimer définitivement l'animateur "${anim.nomComplet}" ? Cette action est irréversible.`,
      confirmLabel: 'Supprimer définitivement',
      cancelText: 'Annuler',
      variant: 'danger',
      onConfirm: () => {
        deleteUser(anim.id);
        refreshUsers();
        showToast(`🗑️ L'animateur ${anim.nomComplet} a été supprimé`, 'success');
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* 1. SECTION HEADER & KPIS */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-gradient-to-r from-[#0a1a44] via-[#0d2258] to-[#0a1a44] rounded-3xl p-6 sm:p-7 text-white shadow-xl border border-[#142140] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-radial from-[#02b3bb]/15 to-transparent blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#02b3bb] to-[#0891b2] p-0.5 shadow-lg shadow-cyan-950/40 shrink-0 flex items-center justify-center text-white">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-widest text-[#57e4ff] bg-[#57e4ff]/10 px-2.5 py-0.5 rounded-full border border-[#57e4ff]/20">
                  Corps Pédagogique
                </span>
                <span className="text-[11px] text-cyan-200/70 font-sans" dir="rtl">
                  إدارة المنشطين والأساتذة
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                Gestion des Animateurs & Formateurs
              </h2>
              <p className="text-xs sm:text-sm text-cyan-100/70 mt-0.5 max-w-xl">
                Ajoutez, configurez et gérez les animateurs pédagogiques, leurs filières et classes assignées.
              </p>
            </div>
          </div>

          {/* Action Button: ➕ Ajouter un animateur */}
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-[#02b3bb] to-[#0891b2] hover:from-[#0099a8] hover:to-[#0e7490] text-white font-black text-sm shadow-lg shadow-cyan-950/30 transition-all border border-[#57e4ff]/30 active:scale-95 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>➕ Ajouter un animateur</span>
          </button>
        </div>

        {/* KPI Cards Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10">
          <div className="bg-white/5 backdrop-blur-xs rounded-2xl p-3.5 border border-white/10">
            <div className="text-[11px] font-bold text-cyan-200/80">Total Animateurs</div>
            <div className="text-2xl font-black text-white mt-0.5">{kpis.total}</div>
          </div>

          <div className="bg-emerald-500/10 backdrop-blur-xs rounded-2xl p-3.5 border border-emerald-500/20">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Actifs (Planning)</span>
            </div>
            <div className="text-2xl font-black text-emerald-300 mt-0.5">{kpis.actifs}</div>
          </div>

          <div className="bg-slate-500/10 backdrop-blur-xs rounded-2xl p-3.5 border border-slate-400/20">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              <span>Inactifs</span>
            </div>
            <div className="text-2xl font-black text-slate-300 mt-0.5">{kpis.inactifs}</div>
          </div>

          <div className="bg-cyan-500/10 backdrop-blur-xs rounded-2xl p-3.5 border border-cyan-400/20">
            <div className="text-[11px] font-bold text-cyan-300">Filières Couvertes</div>
            <div className="text-2xl font-black text-[#57e4ff] mt-0.5">{kpis.filieresAssignees}</div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. TOOLBAR: SEARCH, FILTERS & VIEW MODE */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          
          {/* Search Box */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="🔎 Rechercher un animateur (Nom, prénom, email, tél...)"
              className="w-full pl-10 pr-9 py-2.5 rounded-2xl border border-slate-300 bg-slate-50/60 focus:bg-white focus:ring-2 focus:ring-[#02b3bb]/30 focus:border-[#02b3bb] text-xs sm:text-sm font-semibold text-slate-900 transition-all placeholder:text-slate-400"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="md:col-span-2">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as 'all' | UserStatus)}
              className="w-full py-2.5 px-3 rounded-2xl border border-slate-300 bg-slate-50/60 text-xs sm:text-sm font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#02b3bb]/30 focus:border-[#02b3bb] cursor-pointer"
            >
              <option value="all">Tous les statuts</option>
              <option value="actif">🟢 Actifs uniquement</option>
              <option value="inactif">⚪ Inactifs uniquement</option>
            </select>
          </div>

          {/* Filière Filter */}
          <div className="md:col-span-3">
            <select
              value={filiereFilter}
              onChange={e => {
                setFiliereFilter(e.target.value);
                setClasseFilter('all');
              }}
              className="w-full py-2.5 px-3 rounded-2xl border border-slate-300 bg-slate-50/60 text-xs sm:text-sm font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#02b3bb]/30 focus:border-[#02b3bb] cursor-pointer"
            >
              <option value="all">Toutes les filières</option>
              {filieres.map(f => (
                <option key={f.id} value={f.id}>
                  {f.code} - {f.nomFr}
                </option>
              ))}
            </select>
          </div>

          {/* Classe Filter */}
          <div className="md:col-span-2">
            <select
              value={classeFilter}
              onChange={e => setClasseFilter(e.target.value)}
              className="w-full py-2.5 px-3 rounded-2xl border border-slate-300 bg-slate-50/60 text-xs sm:text-sm font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#02b3bb]/30 focus:border-[#02b3bb] cursor-pointer"
            >
              <option value="all">Toutes les classes</option>
              {classes
                .filter(c => filiereFilter === 'all' || c.filiereId === filiereFilter)
                .map(c => (
                  <option key={c.id} value={c.id}>
                    {c.code}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* View mode toggle & Results count */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2 font-bold text-slate-700">
            <span className="font-black text-[#0a1a44]">
              {filteredAnimateurs.length} animateur(s) affiché(s)
            </span>
            {(searchTerm || statusFilter !== 'all' || filiereFilter !== 'all' || classeFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setFiliereFilter('all');
                  setClasseFilter('all');
                }}
                className="text-[#02b3bb] hover:underline cursor-pointer"
              >
                (Réinitialiser les filtres)
              </button>
            )}
          </div>

          {/* Table / Cards toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-[#0a1a44] shadow-2xs'
                  : 'text-slate-600 hover:text-[#0a1a44]'
              }`}
            >
              📋 Tableau
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white text-[#0a1a44] shadow-2xs'
                  : 'text-slate-600 hover:text-[#0a1a44]'
              }`}
            >
              🗂️ Cartes
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. DATA VIEW: TABLE OR CARDS */}
      {/* ------------------------------------------------------------- */}
      {filteredAnimateurs.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3 shadow-2xs">
          <GraduationCap className="w-12 h-12 mx-auto text-[#02b3bb]/40" />
          <h3 className="text-base font-black text-[#0a1a44]">Aucun animateur trouvé</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Aucun animateur ne correspond aux filtres actuels. Vous pouvez ajuster vos critères ou ajouter un nouvel animateur.
          </p>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#02b3bb] to-[#0891b2] text-white font-bold text-xs shadow-md hover:opacity-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>➕ Ajouter un animateur</span>
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#0a1a44] text-white font-black uppercase tracking-wider text-[11px] border-b border-[#142140]">
                  <th className="p-4 whitespace-nowrap">Animateur</th>
                  <th className="p-4 whitespace-nowrap">Contact</th>
                  <th className="p-4 whitespace-nowrap">Filière assignée</th>
                  <th className="p-4 whitespace-nowrap">Classe</th>
                  <th className="p-4 whitespace-nowrap text-center">Statut</th>
                  <th className="p-4 whitespace-nowrap">Observation</th>
                  <th className="p-4 whitespace-nowrap text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAnimateurs.map(anim => {
                  const filiere = anim.filiereId ? getFiliereById(anim.filiereId) : undefined;
                  const classe = anim.classeId ? getClasseById(anim.classeId) : undefined;
                  const isActif = anim.statut === 'actif';
                  const initials = anim.nomComplet
                    ? anim.nomComplet
                        .split(' ')
                        .map(n => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()
                    : 'AN';

                  return (
                    <tr
                      key={anim.id}
                      className={`hover:bg-cyan-50/40 transition-colors ${
                        !isActif ? 'bg-slate-50/50 opacity-80' : ''
                      }`}
                    >
                      {/* Animateur: Avatar + Full Names */}
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-[#0a1a44] text-[#57e4ff] font-black text-xs flex items-center justify-center ring-2 ring-[#02b3bb]/40 shadow-xs shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="font-black text-sm text-[#0a1a44]">
                              {anim.nomComplet}
                            </div>
                            {anim.nomCompletAr && (
                              <div className="text-xs font-bold text-cyan-800 font-sans" dir="rtl">
                                {anim.nomCompletAr}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Contact: Email & Tel */}
                      <td className="p-4 whitespace-nowrap space-y-1">
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium font-mono text-[11px]">
                          <Mail className="w-3.5 h-3.5 text-[#02b3bb] shrink-0" />
                          <a href={`mailto:${anim.email}`} className="hover:underline hover:text-[#02b3bb]">
                            {anim.email}
                          </a>
                        </div>
                        {anim.telephone ? (
                          <div className="flex items-center gap-1.5 text-slate-600 font-mono text-[11px]">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <a href={`tel:${anim.telephone}`} className="hover:underline">
                              {anim.telephone}
                            </a>
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-300 italic">Pas de téléphone</div>
                        )}
                      </td>

                      {/* Filière */}
                      <td className="p-4 whitespace-nowrap">
                        {filiere ? (
                          <span className="inline-block px-3 py-1 rounded-xl bg-cyan-50 text-[#02b3bb] font-black border border-cyan-200 shadow-2xs">
                            {filiere.code} - {filiere.nomFr}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-semibold italic">Non assignée</span>
                        )}
                      </td>

                      {/* Classe */}
                      <td className="p-4 whitespace-nowrap">
                        {classe ? (
                          <span className="inline-block px-3 py-1 rounded-xl bg-slate-100 text-[#0a1a44] font-black border border-slate-200">
                            {classe.nomFr}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-semibold italic">Toutes / Aucune</span>
                        )}
                      </td>

                      {/* Statut (Bouton switch interactif avec confirmation) */}
                      <td className="p-4 whitespace-nowrap text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatusWithConfirm(anim)}
                          className="group inline-flex items-center gap-1.5 focus:outline-none cursor-pointer"
                          title="Cliquer pour changer le statut (Actif ↔ Inactif)"
                        >
                          {isActif ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-800 border border-emerald-300 group-hover:bg-emerald-100 transition-colors shadow-2xs">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                              <span>Actif</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-300 group-hover:bg-slate-200 transition-colors shadow-2xs">
                              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                              <span>Inactif</span>
                            </span>
                          )}
                        </button>
                      </td>

                      {/* Observation */}
                      <td className="p-4 max-w-xs">
                        <div className="text-slate-600 truncate text-[11px] font-medium" title={anim.observation || ''}>
                          {anim.observation || '—'}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-4 whitespace-nowrap text-center">
                        <div className="inline-flex items-center justify-center gap-1.5">
                          {/* ✏️ Modifier */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(anim)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 cursor-pointer transition-all active:scale-95"
                            title="✏️ Modifier l'animateur"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                            <span>Modifier</span>
                          </button>

                          {/* 🔄 Désactiver / Activer */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatusWithConfirm(anim)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border cursor-pointer transition-all active:scale-95 ${
                              isActif
                                ? 'text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-200'
                                : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                            }`}
                            title={isActif ? "Désactiver l'animateur" : "Réactiver l'animateur"}
                          >
                            {isActif ? (
                              <>
                                <UserX className="w-3.5 h-3.5 text-amber-600" />
                                <span>Désactiver</span>
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Activer</span>
                              </>
                            )}
                          </button>

                          {/* 🗑️ Supprimer */}
                          <button
                            type="button"
                            onClick={() => handleDeleteWithConfirm(anim)}
                            className="inline-flex items-center gap-1 p-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 cursor-pointer transition-all active:scale-95"
                            title="🗑️ Supprimer définitivement"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* CARDS VIEW (Responsive Smartphone & Tablet) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAnimateurs.map(anim => {
            const filiere = anim.filiereId ? getFiliereById(anim.filiereId) : undefined;
            const classe = anim.classeId ? getClasseById(anim.classeId) : undefined;
            const isActif = anim.statut === 'actif';
            const initials = anim.nomComplet
              ? anim.nomComplet
                  .split(' ')
                  .map(n => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()
              : 'AN';

            return (
              <div
                key={anim.id}
                className={`rounded-3xl border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-2xs hover:shadow-xl ${
                  isActif
                    ? 'bg-white border-slate-200/90 hover:border-[#02b3bb]/60'
                    : 'bg-slate-50 border-slate-200 opacity-80'
                }`}
              >
                {/* Top card header */}
                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-[#0a1a44] text-[#57e4ff] font-black text-sm flex items-center justify-center ring-2 ring-[#02b3bb]/40 shadow-xs shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-black text-[#0a1a44] truncate">
                          {anim.nomComplet}
                        </h4>
                        {anim.nomCompletAr && (
                          <p className="text-xs font-bold text-cyan-800 font-sans truncate" dir="rtl">
                            {anim.nomCompletAr}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Statut Badge */}
                    <button
                      type="button"
                      onClick={() => handleToggleStatusWithConfirm(anim)}
                      className="cursor-pointer"
                      title="Cliquer pour changer le statut"
                    >
                      {isActif ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span>Actif</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                          <span>Inactif</span>
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-1.5 bg-slate-50/80 p-3 rounded-2xl border border-slate-200/60 text-xs">
                    <div className="flex items-center gap-2 text-slate-700 font-mono">
                      <Mail className="w-3.5 h-3.5 text-[#02b3bb] shrink-0" />
                      <a href={`mailto:${anim.email}`} className="truncate hover:underline">
                        {anim.email}
                      </a>
                    </div>
                    {anim.telephone && (
                      <div className="flex items-center gap-2 text-slate-600 font-mono">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <a href={`tel:${anim.telephone}`} className="hover:underline">
                          {anim.telephone}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Filière & Classe Badges */}
                  <div className="flex flex-wrap gap-2 text-xs">
                    {filiere && (
                      <span className="px-2.5 py-1 rounded-xl bg-cyan-50 text-[#02b3bb] font-black border border-cyan-200">
                        {filiere.code} - {filiere.nomFr}
                      </span>
                    )}
                    {classe && (
                      <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-[#0a1a44] font-black border border-slate-200">
                        {classe.nomFr}
                      </span>
                    )}
                  </div>

                  {/* Observation */}
                  {anim.observation && (
                    <p className="text-xs text-slate-500 italic bg-amber-50/50 p-2.5 rounded-xl border border-amber-200/50">
                      "{anim.observation}"
                    </p>
                  )}
                </div>

                {/* Card Action Buttons */}
                <div className="p-4 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(anim)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 shadow-2xs cursor-pointer transition-all active:scale-95"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                    <span>Modifier</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleStatusWithConfirm(anim)}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold border shadow-2xs cursor-pointer transition-all active:scale-95 ${
                      isActif
                        ? 'text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-200'
                        : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                    }`}
                  >
                    {isActif ? (
                      <>
                        <UserX className="w-3.5 h-3.5 text-amber-600" />
                        <span>Désactiver</span>
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Activer</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteWithConfirm(anim)}
                    className="p-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 shadow-2xs cursor-pointer transition-all active:scale-95"
                    title="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. MODAL: AJOUTER / MODIFIER UN ANIMATEUR */}
      {/* ------------------------------------------------------------- */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#0a1a44] to-[#0d2258] p-5 text-white flex items-center justify-between border-b border-[#142140]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-[#57e4ff] border border-white/10">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {editingAnimateur ? "✏️ Modifier l'animateur" : "➕ Ajouter un animateur"}
                  </h3>
                  <p className="text-xs text-cyan-200/80">
                    Renseignez les coordonnées et affectations pédagogiques
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSaveAnimateur} className="p-6 space-y-4">
              
              {/* Row 1: Nom & Prénom */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                    Nom (Français) *
                  </label>
                  <input
                    type="text"
                    value={formData.nom}
                    onChange={e => setFormData({ ...formData, nom: e.target.value })}
                    placeholder="Ex: BENNANI"
                    className={`w-full py-2.5 px-3.5 rounded-2xl border text-xs sm:text-sm font-bold uppercase transition-all ${
                      formErrors.nom ? 'border-red-500 ring-2 ring-red-100 bg-red-50/30' : 'border-slate-300 focus:border-[#02b3bb] focus:ring-2 focus:ring-[#02b3bb]/20'
                    }`}
                  />
                  {formErrors.nom && (
                    <p className="text-xs text-red-600 font-bold mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {formErrors.nom}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                    Prénom (Français) *
                  </label>
                  <input
                    type="text"
                    value={formData.prenom}
                    onChange={e => setFormData({ ...formData, prenom: e.target.value })}
                    placeholder="Ex: Yassine"
                    className={`w-full py-2.5 px-3.5 rounded-2xl border text-xs sm:text-sm font-bold capitalize transition-all ${
                      formErrors.prenom ? 'border-red-500 ring-2 ring-red-100 bg-red-50/30' : 'border-slate-300 focus:border-[#02b3bb] focus:ring-2 focus:ring-[#02b3bb]/20'
                    }`}
                  />
                  {formErrors.prenom && (
                    <p className="text-xs text-red-600 font-bold mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {formErrors.prenom}
                    </p>
                  )}
                </div>
              </div>

              {/* Row 2: Nom et prénom AR */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1 text-right">
                  الاسم الكامل بالعربية (الاسم والنسب)
                </label>
                <input
                  type="text"
                  dir="rtl"
                  value={formData.nomCompletAr}
                  onChange={e => setFormData({ ...formData, nomCompletAr: e.target.value })}
                  placeholder="مثال: ذ. ياسين بناني"
                  className="w-full py-2.5 px-3.5 rounded-2xl border border-slate-300 focus:border-[#02b3bb] focus:ring-2 focus:ring-[#02b3bb]/20 text-xs sm:text-sm font-bold text-slate-900 transition-all font-sans"
                />
              </div>

              {/* Row 3: Email & Téléphone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                    Email de connexion *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      placeholder="animateur@zirara.ma"
                      className={`w-full pl-10 pr-3.5 py-2.5 rounded-2xl border text-xs sm:text-sm font-bold font-mono transition-all ${
                        formErrors.email ? 'border-red-500 ring-2 ring-red-100 bg-red-50/30' : 'border-slate-300 focus:border-[#02b3bb] focus:ring-2 focus:ring-[#02b3bb]/20'
                      }`}
                    />
                  </div>
                  {formErrors.email && (
                    <p className="text-xs text-red-600 font-bold mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {formErrors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                    Téléphone
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={formData.telephone}
                      onChange={e => setFormData({ ...formData, telephone: e.target.value })}
                      placeholder="06 12 34 56 78"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl border border-slate-300 focus:border-[#02b3bb] focus:ring-2 focus:ring-[#02b3bb]/20 text-xs sm:text-sm font-bold font-mono text-slate-900 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Row 4: Mot de passe */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                  Mot de passe {editingAnimateur ? "(laisser vide pour ne pas modifier)" : "(par défaut : 123456)"}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingAnimateur ? "••••••••" : "123456"}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl border border-slate-300 focus:border-[#02b3bb] focus:ring-2 focus:ring-[#02b3bb]/20 text-xs sm:text-sm font-bold transition-all"
                  />
                </div>
              </div>

              {/* Row 5: Filière & Classe */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                    Filière assignée
                  </label>
                  <select
                    value={formData.filiereId}
                    onChange={e => handleModalFiliereChange(e.target.value)}
                    className="w-full py-2.5 px-3.5 rounded-2xl border border-slate-300 bg-slate-50/50 text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#02b3bb]/20 focus:border-[#02b3bb]"
                  >
                    <option value="">Sélectionner une filière...</option>
                    {filieres.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.code} - {f.nomFr}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                    Classe pédagogique
                  </label>
                  <select
                    value={formData.classeId}
                    onChange={e => setFormData({ ...formData, classeId: e.target.value })}
                    className="w-full py-2.5 px-3.5 rounded-2xl border border-slate-300 bg-slate-50/50 text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#02b3bb]/20 focus:border-[#02b3bb]"
                  >
                    <option value="">Toutes les classes / Non spécifique</option>
                    {classes
                      .filter(c => !formData.filiereId || c.filiereId === formData.filiereId)
                      .map(c => (
                        <option key={c.id} value={c.id}>
                          {c.code} - {c.nomFr}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Row 6: Statut */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                  Statut de l'animateur *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, statut: 'actif' })}
                    className={`py-2.5 px-4 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      formData.statut === 'actif'
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-400 ring-2 ring-emerald-200 font-black'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span>🟢 Actif (Apparaît dans le planning)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, statut: 'inactif' })}
                    className={`py-2.5 px-4 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      formData.statut === 'inactif'
                        ? 'bg-slate-200 text-slate-900 border-slate-400 ring-2 ring-slate-300 font-black'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                    <span>⚪ Inactif (Exclu des nouvelles saisies)</span>
                  </button>
                </div>
              </div>

              {/* Row 7: Observation */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                  Observation / Remarques pédagogiques
                </label>
                <textarea
                  rows={2}
                  value={formData.observation}
                  onChange={e => setFormData({ ...formData, observation: e.target.value })}
                  placeholder="Notes optionnelles, créneaux privilégiés, diplômes..."
                  className="w-full py-2 px-3.5 rounded-2xl border border-slate-300 focus:border-[#02b3bb] focus:ring-2 focus:ring-[#02b3bb]/20 text-xs sm:text-sm font-medium text-slate-900 transition-all resize-none"
                />
              </div>

              {/* Form Footer / Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#02b3bb] to-[#0891b2] hover:from-[#0099a8] hover:to-[#0e7490] text-white text-xs font-black shadow-md shadow-cyan-950/20 transition-all cursor-pointer active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingAnimateur ? "Enregistrer les modifications" : "Ajouter l'animateur"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
