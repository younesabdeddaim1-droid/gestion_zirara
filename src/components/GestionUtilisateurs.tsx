import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { User, Role, UserStatus, UserPermissions } from '../types';
import {
  getUserPermissions,
  PERMISSION_METAS,
  DEFAULT_ADMIN_PERMISSIONS,
  DEFAULT_ANIMATEUR_PERMISSIONS,
  DEFAULT_READONLY_PERMISSIONS,
  DEFAULT_COORDONNATEUR_PERMISSIONS,
  getDefaultPermissionsForRole
} from '../utils/permissions';
import {
  ShieldCheck,
  Shield,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Mail,
  Phone,
  Briefcase,
  Check,
  X,
  Sliders,
  Users,
  Eye,
  CheckSquare,
  Square,
  School,
  BookOpen,
  Sparkles,
  Info,
  KeyRound,
  GraduationCap,
  Zap
} from 'lucide-react';

export const GestionUtilisateurs: React.FC = () => {
  const {
    currentUser,
    isAdmin,
    users,
    addUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
    updateUserPermissions,
    switchUser,
    resetUserPassword
  } = useAuth();

  const {
    filieres,
    classes,
    beneficiaires,
    getFiliereById,
    getClasseById,
    isRtl,
    t,
    showToast,
    askConfirmation
  } = useApp();

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | Role>('all');
  const [filiereFilter, setFiliereFilter] = useState<string>('all');
  const [classeFilter, setClasseFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | UserStatus>('all');

  // Permissions Modal
  const [selectedUserForPerms, setSelectedUserForPerms] = useState<User | null>(null);
  const [currentPermsForm, setCurrentPermsForm] = useState<UserPermissions | null>(null);

  // Reset Password Modal
  const [resetPassUser, setResetPassUser] = useState<User | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('123456');

  // User Edit/Add Modal
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({
    email: '',
    codeMassar: '',
    beneficiaireId: '',
    password: '',
    nomComplet: '',
    nomCompletAr: '',
    role: 'animateur' as Role,
    filiereIds: [] as string[],
    classeIds: [] as string[],
    telephone: '',
    specialite: '',
    statut: 'actif' as UserStatus
  });
  const [userFormError, setUserFormError] = useState('');

  // Helper: Extract safe array of filiereIds & classeIds for a user
  const getUserFilieres = (u: User): string[] => {
    if (u.filiereIds && u.filiereIds.length > 0) return u.filiereIds;
    if (u.filiereId) return [u.filiereId];
    return [];
  };

  const getUserClasses = (u: User): string[] => {
    if (u.classeIds && u.classeIds.length > 0) return u.classeIds;
    if (u.classeId) return [u.classeId];
    return [];
  };

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchSearch =
        searchTerm.trim() === '' ||
        u.nomComplet.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.nomCompletAr && u.nomCompletAr.includes(searchTerm)) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.codeMassar && u.codeMassar.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (u.specialite && u.specialite.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (u.telephone && u.telephone.includes(searchTerm));

      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      const matchStatus = statusFilter === 'all' || u.statut === statusFilter;

      // Match filiere
      let matchFiliere = true;
      if (filiereFilter !== 'all') {
        if (u.role === 'admin') {
          matchFiliere = true; // Admin has access to all filieres
        } else {
          const userFils = getUserFilieres(u);
          matchFiliere = userFils.includes(filiereFilter);
        }
      }

      // Match classe
      let matchClasse = true;
      if (classeFilter !== 'all') {
        if (u.role === 'admin') {
          matchClasse = true; // Admin has access to all classes
        } else {
          const userCls = getUserClasses(u);
          matchClasse = userCls.includes(classeFilter);
        }
      }

      return matchSearch && matchRole && matchStatus && matchFiliere && matchClasse;
    });
  }, [users, searchTerm, roleFilter, statusFilter, filiereFilter, classeFilter]);

  // KPIs
  const kpis = useMemo(() => {
    const total = users.length;
    const actifs = users.filter(u => u.statut === 'actif').length;
    const inactifs = users.filter(u => u.statut === 'inactif').length;
    const admins = users.filter(u => u.role === 'admin').length;
    const animateurs = users.filter(u => u.role === 'animateur').length;
    const beneficiairesCount = users.filter(u => u.role === 'beneficiaire').length;
    const consultations = users.filter(u => u.role === 'consultation').length;
    return { total, actifs, inactifs, admins, animateurs, beneficiairesCount, consultations };
  }, [users]);

  // Handler: Open Permissions Modal
  const handleOpenPermissions = (u: User) => {
    setSelectedUserForPerms(u);
    setCurrentPermsForm({ ...getUserPermissions(u) });
  };

  // Handler: Toggle single permission
  const handleToggleSinglePermission = (key: keyof UserPermissions) => {
    if (!currentPermsForm) return;
    setCurrentPermsForm(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [key]: !prev[key]
      };
    });
  };

  // Handler: Apply Preset
  const handleApplyPreset = (preset: 'admin' | 'animateur' | 'coordonnateur' | 'readonly') => {
    if (!currentPermsForm) return;
    let newPerms: UserPermissions;
    switch (preset) {
      case 'admin':
        newPerms = { ...DEFAULT_ADMIN_PERMISSIONS };
        break;
      case 'animateur':
        newPerms = { ...DEFAULT_ANIMATEUR_PERMISSIONS };
        break;
      case 'coordonnateur':
        newPerms = { ...DEFAULT_COORDONNATEUR_PERMISSIONS };
        break;
      case 'readonly':
        newPerms = { ...DEFAULT_READONLY_PERMISSIONS };
        break;
    }
    setCurrentPermsForm(newPerms);
  };

  // Handler: Save Permissions
  const handleSavePermissions = () => {
    if (!selectedUserForPerms || !currentPermsForm) return;
    updateUserPermissions(selectedUserForPerms.id, currentPermsForm);
    showToast('✅ Droits d\'accès mis à jour avec succès', 'success');
    setSelectedUserForPerms(null);
  };

  // Handler: Open Add User Modal
  const handleOpenAddUser = () => {
    setEditingUser(null);
    setUserForm({
      email: '',
      codeMassar: '',
      beneficiaireId: '',
      password: '',
      nomComplet: '',
      nomCompletAr: '',
      role: 'animateur',
      filiereIds: filieres.length > 0 ? [filieres[0].id] : [],
      classeIds: classes.length > 0 ? [classes[0].id] : [],
      telephone: '',
      specialite: '',
      statut: 'actif'
    });
    setUserFormError('');
    setUserModalOpen(true);
  };

  // Handler: Open Edit User Modal
  const handleOpenEditUser = (u: User) => {
    setEditingUser(u);
    const assignedFilieres = getUserFilieres(u);
    const assignedClasses = getUserClasses(u);

    setUserForm({
      email: u.email,
      codeMassar: u.codeMassar || '',
      beneficiaireId: u.beneficiaireId || '',
      password: '',
      nomComplet: u.nomComplet,
      nomCompletAr: u.nomCompletAr || '',
      role: u.role,
      filiereIds: assignedFilieres,
      classeIds: assignedClasses,
      telephone: u.telephone || '',
      specialite: u.specialite || '',
      statut: u.statut
    });
    setUserFormError('');
    setUserModalOpen(true);
  };

  // Handler: Select a beneficiary in form to auto-fill details
  const handleSelectBeneficiaire = (benId: string) => {
    const ben = beneficiaires.find(b => b.id === benId);
    if (!ben) {
      setUserForm(prev => ({
        ...prev,
        beneficiaireId: '',
        codeMassar: ''
      }));
      return;
    }

    setUserForm(prev => ({
      ...prev,
      beneficiaireId: ben.id,
      codeMassar: ben.codeMassar,
      nomComplet: `${ben.prenomFr} ${ben.nomFr}`,
      nomCompletAr: ben.nomAr && ben.prenomAr ? `${ben.prenomAr} ${ben.nomAr}` : prev.nomCompletAr,
      email: `${ben.codeMassar.toLowerCase()}@zirara.ma`,
      telephone: ben.telephone || prev.telephone,
      filiereIds: ben.filiereId ? [ben.filiereId] : prev.filiereIds,
      classeIds: ben.classeId ? [ben.classeId] : prev.classeIds
    }));
  };

  // Handler: Open Reset Password Modal
  const handleOpenResetPassword = (u: User) => {
    setResetPassUser(u);
    setNewPasswordValue(u.role === 'beneficiaire' && u.codeMassar ? u.codeMassar : '123456');
  };

  // Handler: Confirm Reset Password
  const handleConfirmResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPassUser || !newPasswordValue.trim()) return;
    resetUserPassword(resetPassUser.id, newPasswordValue.trim());
    showToast({
      title: 'Mot de passe réinitialisé',
      message: `Le mot de passe de ${resetPassUser.nomComplet} a été réinitialisé avec succès.`,
      type: 'success'
    });
    setResetPassUser(null);
  };

  // Handler: Generate all beneficiary accounts
  const handleGenerateAllBeneficiaryAccounts = () => {
    let createdCount = 0;
    beneficiaires.forEach(b => {
      const alreadyHas = users.some(
        u => (u.beneficiaireId && u.beneficiaireId === b.id) ||
             (u.codeMassar && u.codeMassar.toLowerCase() === b.codeMassar.toLowerCase())
      );
      if (!alreadyHas) {
        const newUser: User = {
          id: `usr-ben-${b.id}`,
          email: `${b.codeMassar.toLowerCase()}@zirara.ma`,
          codeMassar: b.codeMassar,
          beneficiaireId: b.id,
          nomComplet: `${b.prenomFr} ${b.nomFr}`,
          nomCompletAr: b.nomAr && b.prenomAr ? `${b.prenomAr} ${b.nomAr}` : undefined,
          role: 'beneficiaire',
          telephone: b.telephone,
          filiereId: b.filiereId,
          classeId: b.classeId,
          filiereIds: [b.filiereId],
          classeIds: [b.classeId],
          statut: 'actif',
          password: '123',
          avatar: b.photoUrl,
          permissions: getDefaultPermissionsForRole('beneficiaire')
        };
        addUser(newUser);
        createdCount++;
      }
    });

    if (createdCount > 0) {
      showToast({
        title: 'Comptes générés',
        message: `${createdCount} compte(s) bénéficiaire(s) créé(s) avec succès (mot de passe initial : 123).`,
        type: 'success'
      });
    } else {
      showToast({
        title: 'Information',
        message: 'Tous les bénéficiaires disposent déjà d\'un compte utilisateur.',
        type: 'info'
      });
    }
  };

  // Handler: Toggle a filière in the form
  const handleToggleFiliere = (filiereId: string) => {
    setUserForm(prev => {
      const exists = prev.filiereIds.includes(filiereId);
      const newFiliereIds = exists
        ? prev.filiereIds.filter(id => id !== filiereId)
        : [...prev.filiereIds, filiereId];

      // Auto-update classes: if we add a filiere, we can also keep existing classes
      // If we remove a filiere, we optionally remove orphaned classes of that filiere
      let newClasseIds = prev.classeIds;
      if (exists) {
        const classesOfFiliere = classes.filter(c => c.filiereId === filiereId).map(c => c.id);
        newClasseIds = prev.classeIds.filter(id => !classesOfFiliere.includes(id));
      } else {
        // Automatically check the classes belonging to the added filiere if none checked
        const classesOfFiliere = classes.filter(c => c.filiereId === filiereId).map(c => c.id);
        newClasseIds = Array.from(new Set([...prev.classeIds, ...classesOfFiliere]));
      }

      return {
        ...prev,
        filiereIds: newFiliereIds,
        classeIds: newClasseIds
      };
    });
  };

  // Handler: Toggle a class in the form
  const handleToggleClasse = (classeId: string) => {
    setUserForm(prev => {
      const exists = prev.classeIds.includes(classeId);
      const newClasseIds = exists
        ? prev.classeIds.filter(id => id !== classeId)
        : [...prev.classeIds, classeId];

      // If a class is added and its filiere is not checked, automatically check its filiere
      let newFiliereIds = prev.filiereIds;
      if (!exists) {
        const parentClasse = classes.find(c => c.id === classeId);
        if (parentClasse && !prev.filiereIds.includes(parentClasse.filiereId)) {
          newFiliereIds = [...prev.filiereIds, parentClasse.filiereId];
        }
      }

      return {
        ...prev,
        classeIds: newClasseIds,
        filiereIds: newFiliereIds
      };
    });
  };

  // Select all filières
  const handleSelectAllFilieres = () => {
    setUserForm(prev => ({
      ...prev,
      filiereIds: filieres.map(f => f.id),
      classeIds: classes.map(c => c.id)
    }));
  };

  // Deselect all filières
  const handleDeselectAllFilieres = () => {
    setUserForm(prev => ({
      ...prev,
      filiereIds: [],
      classeIds: []
    }));
  };

  // Select all classes of selected filières
  const handleSelectClassesOfSelectedFilieres = () => {
    setUserForm(prev => {
      const targetClasses = classes
        .filter(c => prev.filiereIds.includes(c.filiereId))
        .map(c => c.id);
      return {
        ...prev,
        classeIds: targetClasses
      };
    });
  };

  // Handler: Save User
  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    setUserFormError('');

    if (!userForm.email.trim() || !userForm.nomComplet.trim()) {
      setUserFormError('Veuillez renseigner le nom complet et l\'identifiant (email).');
      return;
    }

    // Validation for animateur/consultation: must have at least one filiere and classe
    if (userForm.role !== 'admin' && userForm.role !== 'beneficiaire') {
      if (userForm.filiereIds.length === 0) {
        setUserFormError('Veuillez affecter au moins une filière à cet animateur / compte consultation.');
        return;
      }
      if (userForm.classeIds.length === 0) {
        setUserFormError('Veuillez affecter au moins une classe pédagogique à cet animateur / compte consultation.');
        return;
      }
    }

    if (userForm.role === 'beneficiaire' && !userForm.beneficiaireId && !userForm.codeMassar) {
      setUserFormError('Veuillez sélectionner un bénéficiaire existant à associer ou renseigner son Code Massar.');
      return;
    }

    // Check duplicate email
    const emailExists = users.some(
      u => u.email.toLowerCase().trim() === userForm.email.toLowerCase().trim() &&
      (!editingUser || u.id !== editingUser.id)
    );

    if (emailExists) {
      setUserFormError('Cette adresse email est déjà attribuée à un autre compte.');
      return;
    }

    if (!editingUser && !userForm.password.trim()) {
      setUserFormError('Veuillez définir un mot de passe initial pour ce nouveau compte.');
      return;
    }

    // If role is admin, filiereIds & classeIds can be empty or all (admin sees everything)
    const finalFiliereIds = userForm.role === 'admin' ? [] : userForm.filiereIds;
    const finalClasseIds = userForm.role === 'admin' ? [] : userForm.classeIds;

    if (editingUser) {
      const updated: User = {
        ...editingUser,
        email: userForm.email.trim(),
        codeMassar: userForm.codeMassar?.trim() || undefined,
        beneficiaireId: userForm.beneficiaireId || undefined,
        nomComplet: userForm.nomComplet.trim(),
        nomCompletAr: userForm.nomCompletAr.trim() || undefined,
        role: userForm.role,
        filiereIds: finalFiliereIds,
        filiereId: finalFiliereIds[0] || undefined,
        classeIds: finalClasseIds,
        classeId: finalClasseIds[0] || undefined,
        telephone: userForm.telephone.trim() || undefined,
        specialite: userForm.specialite.trim() || undefined,
        statut: userForm.statut,
        password: userForm.password ? userForm.password : editingUser.password
      };
      updateUser(updated);
      showToast('✅ Utilisateur modifié avec succès', 'success');
    } else {
      const newUser: User = {
        id: `usr-${Date.now()}`,
        email: userForm.email.trim(),
        codeMassar: userForm.codeMassar?.trim() || undefined,
        beneficiaireId: userForm.beneficiaireId || undefined,
        nomComplet: userForm.nomComplet.trim(),
        nomCompletAr: userForm.nomCompletAr.trim() || undefined,
        role: userForm.role,
        filiereIds: finalFiliereIds,
        filiereId: finalFiliereIds[0] || undefined,
        classeIds: finalClasseIds,
        classeId: finalClasseIds[0] || undefined,
        telephone: userForm.telephone.trim() || undefined,
        specialite: userForm.specialite.trim() || undefined,
        statut: userForm.statut,
        password: userForm.password.trim() || '123456',
        permissions: getDefaultPermissionsForRole(userForm.role)
      };
      addUser(newUser);
      showToast('✅ Utilisateur créé avec succès', 'success');
    }

    setUserModalOpen(false);
  };

  // Handler: Delete User (in-app confirmation, safe for sandboxed iframes)
  const handleDeleteUser = (u: User) => {
    if (u.id === 'usr-admin-1') {
      showToast('Le compte Administrateur principal ne peut pas être supprimé.', 'error');
      return;
    }

    askConfirmation({
      title: "Supprimer l'utilisateur",
      message: `Êtes-vous certain de vouloir supprimer définitivement le compte de ${u.nomComplet} (${u.email}) ? Cette action est irréversible.`,
      confirmLabel: "Supprimer définitivement",
      variant: "danger",
      onConfirm: () => {
        deleteUser(u.id);
        showToast('✅ Utilisateur supprimé avec succès', 'success');
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards (Canva Tech Style) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Total Users */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs flex items-center gap-3.5 hover:shadow-md transition-all">
          <div className="w-11 h-11 rounded-2xl bg-[#0a1a44] text-[#57e4ff] flex items-center justify-center ring-2 ring-[#02b3bb]/40 shadow-xs shrink-0">
            <Users className="w-5 h-5 text-[#02b3bb]" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-[#0a1a44]">{kpis.total}</div>
            <div className="text-[11px] font-bold text-slate-500">Utilisateurs au total</div>
          </div>
        </div>

        {/* Administrateurs */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs flex items-center gap-3.5 hover:shadow-md transition-all">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-700 ring-2 ring-amber-500/30 shadow-xs shrink-0">
            <Shield className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-amber-900">{kpis.admins}</div>
            <div className="text-[11px] font-bold text-slate-500">Administrateurs</div>
          </div>
        </div>

        {/* Animateurs */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs flex items-center gap-3.5 hover:shadow-md transition-all">
          <div className="w-11 h-11 rounded-2xl bg-cyan-50 flex items-center justify-center text-[#02b3bb] ring-2 ring-[#02b3bb]/30 shadow-xs shrink-0">
            <Briefcase className="w-5 h-5 text-[#02b3bb]" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-[#02b3bb]">{kpis.animateurs}</div>
            <div className="text-[11px] font-bold text-slate-500">Animateurs</div>
          </div>
        </div>

        {/* Bénéficiaires */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs flex items-center gap-3.5 hover:shadow-md transition-all">
          <div className="w-11 h-11 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-700 ring-2 ring-purple-500/30 shadow-xs shrink-0">
            <GraduationCap className="w-5 h-5 text-purple-700" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-purple-900">{kpis.beneficiairesCount}</div>
            <div className="text-[11px] font-bold text-slate-500">Bénéficiaires</div>
          </div>
        </div>

        {/* Comptes Actifs */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs flex items-center gap-3.5 hover:shadow-md transition-all">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 ring-2 ring-emerald-500/30 shadow-xs shrink-0">
            <Check className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-emerald-700">
              {kpis.actifs} <span className="text-[10px] font-semibold text-slate-400">/ {kpis.total}</span>
            </div>
            <div className="text-[11px] font-bold text-slate-500">Comptes Actifs</div>
          </div>
        </div>
      </div>

      {/* Main Control Panel & Table (Canva Tech Card) */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
        
        {/* Table Top Bar */}
        <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-black text-[#0a1a44] flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#02b3bb]" />
              <span>Gestion des Utilisateurs & Affectations des Filières / Classes</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Consultez et configurez les administrateurs, animateurs et comptes bénéficiaires.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={handleGenerateAllBeneficiaryAccounts}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-cyan-950 bg-cyan-100 hover:bg-cyan-200 border border-cyan-300 transition-all cursor-pointer shadow-2xs"
                  title="Générer automatiquement un compte utilisateur pour chaque apprenant enregistré"
                >
                  <Zap className="w-4 h-4 text-cyan-700" />
                  <span>⚡ Générer comptes bénéficiaires</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenAddUser}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black text-white bg-gradient-to-r from-[#02b3bb] to-[#0891b2] hover:from-[#0099a8] hover:to-[#0e7490] active:scale-95 shadow-md shadow-cyan-900/15 transition-all min-h-[40px] cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>➕ Nouvel Utilisateur</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Search and Filters Bar */}
        <div className="p-4 sm:p-5 bg-white border-b border-slate-100 flex flex-col lg:flex-row gap-3 items-center justify-between">
          <div className="relative w-full lg:w-80">
            <Search className="w-4 h-4 text-[#02b3bb] absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Rechercher par nom, email, Code Massar..."
              className="w-full pl-10 pr-8 py-2.5 text-xs sm:text-sm rounded-2xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#02b3bb] bg-slate-50/60 text-[#0a1a44] font-medium"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full lg:w-auto">
            {/* Filter Role */}
            <div className="flex items-center gap-1.5 text-xs">
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value as any)}
                className="w-full py-2.5 px-3 text-xs font-bold rounded-2xl border border-slate-200 bg-white text-[#0a1a44] focus:outline-hidden focus:ring-2 focus:ring-[#02b3bb]"
              >
                <option value="all">Tous les rôles</option>
                <option value="admin">👑 Administrateur</option>
                <option value="animateur">👤 Animateur</option>
                <option value="beneficiaire">🎓 Bénéficiaire</option>
                <option value="consultation">👁️ Consultation</option>
              </select>
            </div>

            {/* Filter Filiere */}
            <div className="flex items-center gap-1.5 text-xs">
              <select
                value={filiereFilter}
                onChange={e => setFiliereFilter(e.target.value)}
                className="w-full py-2.5 px-3 text-xs font-bold rounded-2xl border border-slate-200 bg-white text-[#0a1a44] focus:outline-hidden focus:ring-2 focus:ring-[#02b3bb]"
              >
                <option value="all">Toutes les filières</option>
                {filieres.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.code} - {f.nomFr}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Classe */}
            <div className="flex items-center gap-1.5 text-xs">
              <select
                value={classeFilter}
                onChange={e => setClasseFilter(e.target.value)}
                className="w-full py-2.5 px-3 text-xs font-bold rounded-2xl border border-slate-200 bg-white text-[#0a1a44] focus:outline-hidden focus:ring-2 focus:ring-[#02b3bb]"
              >
                <option value="all">Toutes les classes</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nomFr}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Status */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="w-full py-2.5 px-3 text-xs font-bold rounded-2xl border border-slate-200 bg-white text-[#0a1a44] focus:outline-hidden focus:ring-2 focus:ring-[#02b3bb]"
            >
              <option value="all">Tous les statuts</option>
              <option value="actif">🟢 Actifs uniquement</option>
              <option value="inactif">🔴 Inactifs</option>
            </select>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* LISTE : N° | Nom | Identifiant | Rôle | Filière | Classe | Statut | Actions */}
        {/* ------------------------------------------------------------- */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead className="bg-[#0a1a44] border-b border-[#142140] text-white uppercase text-[11px] font-black tracking-wider">
              <tr>
                <th className="py-3.5 px-3 w-12 text-center">N°</th>
                <th className="py-3.5 px-4 min-w-[200px]">Nom</th>
                <th className="py-3.5 px-4 min-w-[170px]">Identifiant</th>
                <th className="py-3.5 px-3 min-w-[130px]">Rôle</th>
                <th className="py-3.5 px-4 min-w-[180px]">Filière</th>
                <th className="py-3.5 px-4 min-w-[170px]">Classe</th>
                <th className="py-3.5 px-3 min-w-[110px] text-center">Statut</th>
                <th className="py-3.5 px-4 text-right min-w-[130px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-sm">Aucun utilisateur ne correspond aux critères.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u, index) => {
                  const isCurrentLogged = currentUser?.id === u.id;
                  const assignedFiliereIds = getUserFilieres(u);
                  const assignedClasseIds = getUserClasses(u);

                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isCurrentLogged ? 'bg-cyan-50/40' : ''
                      }`}
                    >
                      {/* 1. N° */}
                      <td className="py-3.5 px-3 text-center font-bold text-slate-500 text-xs">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-mono text-[11px]">
                          {index + 1}
                        </span>
                      </td>

                      {/* 2. Nom */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl font-black flex items-center justify-center text-xs shadow-2xs shrink-0 ${
                            u.role === 'admin'
                              ? 'bg-amber-600 text-white'
                              : u.role === 'animateur'
                              ? 'bg-[#02b3bb] text-white'
                              : 'bg-slate-700 text-white'
                          }`}>
                            {u.nomComplet.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-[#0a1a44] flex items-center gap-1.5 leading-tight">
                              <span>{u.nomComplet}</span>
                              {isCurrentLogged && (
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full font-black border border-emerald-300">
                                  Vous
                                </span>
                              )}
                            </div>
                            {u.nomCompletAr && (
                              <div className="text-[11px] text-emerald-800 font-sans font-semibold mt-0.5" dir="rtl">
                                {u.nomCompletAr}
                              </div>
                            )}
                            {u.specialite && (
                              <div className="text-[11px] text-slate-500 font-medium">
                                {u.specialite}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 3. Identifiant */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="text-xs font-mono font-bold text-slate-800 flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5 text-[#02b3bb] shrink-0" />
                            <span className="truncate max-w-[180px]" title={u.email}>{u.email}</span>
                          </div>
                          {u.codeMassar && (
                            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-100 text-purple-900 text-[10px] font-mono font-bold">
                              <span>Massar: {u.codeMassar}</span>
                            </div>
                          )}
                          {u.telephone && (
                            <div className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{u.telephone}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 4. Rôle */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {u.role === 'admin' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs">
                            <Shield className="w-3.5 h-3.5 text-amber-600" />
                            <span>Administrateur</span>
                          </span>
                        )}
                        {u.role === 'animateur' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-cyan-50 text-cyan-900 border border-cyan-300 shadow-2xs">
                            <Briefcase className="w-3.5 h-3.5 text-[#02b3bb]" />
                            <span>Animateur</span>
                          </span>
                        )}
                        {u.role === 'beneficiaire' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-purple-50 text-purple-900 border border-purple-300 shadow-2xs">
                            <GraduationCap className="w-3.5 h-3.5 text-purple-700" />
                            <span>Bénéficiaire</span>
                          </span>
                        )}
                        {u.role === 'consultation' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-800 border border-slate-300 shadow-2xs">
                            <Eye className="w-3.5 h-3.5 text-slate-600" />
                            <span>Consultation</span>
                          </span>
                        )}
                      </td>

                      {/* 5. Filière */}
                      <td className="py-3.5 px-4">
                        {u.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black bg-amber-50 text-amber-900 border border-amber-200">
                            👑 Toutes les filières
                          </span>
                        ) : assignedFiliereIds.length === 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            ⚠️ Non affectée
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-[240px]">
                            {assignedFiliereIds.map(fId => {
                              const fil = getFiliereById(fId);
                              return (
                                <span
                                  key={fId}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-[#02b3bb]/10 text-[#0a1a44] border border-[#02b3bb]/30"
                                  title={fil ? fil.nomFr : fId}
                                >
                                  <BookOpen className="w-3 h-3 text-[#02b3bb]" />
                                  <span className="font-extrabold">{fil?.code || 'Filière'}</span>
                                  {fil && <span className="truncate max-w-[110px] hidden sm:inline">- {fil.nomFr}</span>}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </td>

                      {/* 6. Classe */}
                      <td className="py-3.5 px-4">
                        {u.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black bg-amber-50 text-amber-900 border border-amber-200">
                            👑 Toutes les classes
                          </span>
                        ) : assignedClasseIds.length === 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            ⚠️ Non affectée
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-[240px]">
                            {assignedClasseIds.map(cId => {
                              const cls = getClasseById(cId);
                              return (
                                <span
                                  key={cId}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200"
                                  title={cls ? cls.nomFr : cId}
                                >
                                  <School className="w-3 h-3 text-slate-500" />
                                  <span className="font-extrabold">{cls ? cls.nomFr : cId}</span>
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </td>

                      {/* 7. Statut */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          disabled={u.id === 'usr-admin-1' || !isAdmin}
                          onClick={() => {
                            toggleUserStatus(u.id);
                            showToast('Statut utilisateur modifié avec succès', 'success');
                          }}
                          className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full transition-all cursor-pointer active:scale-95 border ${
                            u.statut === 'actif'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                          }`}
                          title={isAdmin && u.id !== 'usr-admin-1' ? 'Cliquer pour basculer le statut' : undefined}
                        >
                          <span className={`w-2 h-2 rounded-full ${u.statut === 'actif' ? 'bg-emerald-500 ring-2 ring-emerald-300' : 'bg-rose-500'}`} />
                          <span>{u.statut === 'actif' ? 'Actif' : 'Inactif'}</span>
                        </button>
                      </td>

                      {/* 8. Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Modifier */}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditUser(u)}
                              className="p-1.5 rounded-xl text-slate-600 hover:text-[#02b3bb] hover:bg-cyan-50 border border-slate-200 transition-colors cursor-pointer"
                              title="Modifier l'utilisateur, rôle, filières et classes"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}

                          {/* Réinitialiser mot de passe */}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleOpenResetPassword(u)}
                              className="p-1.5 rounded-xl text-slate-600 hover:text-amber-700 hover:bg-amber-50 border border-slate-200 transition-colors cursor-pointer"
                              title="Réinitialiser le mot de passe de ce compte"
                            >
                              <KeyRound className="w-4 h-4 text-amber-600" />
                            </button>
                          )}

                          {/* Droits & Permissions */}
                          <button
                            type="button"
                            onClick={() => handleOpenPermissions(u)}
                            className="p-1.5 rounded-xl text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200 transition-colors cursor-pointer"
                            title="Configurer les permissions individuelles"
                          >
                            <Sliders className="w-4 h-4" />
                          </button>

                          {/* Supprimer */}
                          {isAdmin && u.id !== 'usr-admin-1' && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u)}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors cursor-pointer"
                              title="Supprimer cet utilisateur"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODAL : AJOUTER / MODIFIER UN UTILISATEUR                      */}
      {/* ------------------------------------------------------------- */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-4.5 bg-[#0a1a44] text-white flex items-center justify-between border-b border-cyan-900/40">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#02b3bb]/20 flex items-center justify-center text-[#57e4ff] ring-1 ring-[#57e4ff]/30">
                  {editingUser ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-black text-base text-white">
                    {editingUser ? "Modifier l'Utilisateur & Affectations" : "Créer un Nouvel Utilisateur"}
                  </h3>
                  <p className="text-xs text-cyan-200/80">
                    Centre de Deuxième Chance Nouvelle Génération ZIRARA
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setUserModalOpen(false)}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveUser} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {userFormError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-center gap-2">
                  <X className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{userFormError}</span>
                </div>
              )}

              {/* 1. Noms */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-black text-[#0a1a44] uppercase mb-1">
                    Nom Complet (Français) *
                  </label>
                  <input
                    type="text"
                    required
                    value={userForm.nomComplet}
                    onChange={e => setUserForm({ ...userForm, nomComplet: e.target.value })}
                    className="w-full py-2.5 px-3 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#02b3bb] font-bold text-[#0a1a44]"
                    placeholder="Ex: Karim Amrani"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-[#0a1a44] uppercase mb-1 text-right">
                    الاسم الكامل (بالعربية)
                  </label>
                  <input
                    type="text"
                    dir="rtl"
                    value={userForm.nomCompletAr}
                    onChange={e => setUserForm({ ...userForm, nomCompletAr: e.target.value })}
                    className="w-full py-2.5 px-3 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#02b3bb] font-bold text-emerald-900 text-right font-sans"
                    placeholder="مثال: كريم العمراني"
                  />
                </div>
              </div>

              {/* 2. Identifiant (Email) & Mot de passe */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-black text-[#0a1a44] uppercase mb-1">
                    Identifiant de connexion (Email) *
                  </label>
                  <input
                    type="email"
                    required
                    value={userForm.email}
                    onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                    className="w-full py-2.5 px-3 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#02b3bb] font-mono text-[#0a1a44]"
                    placeholder="utilisateur@zirara.ma"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-[#0a1a44] uppercase mb-1">
                    Mot de passe {editingUser ? "(laisser vide pour ne pas modifier)" : "*"}
                  </label>
                  <input
                    type="password"
                    value={userForm.password}
                    onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                    className="w-full py-2.5 px-3 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#02b3bb] font-mono"
                    placeholder={editingUser ? "••••••••" : "Mot de passe sécurisé"}
                  />
                </div>
              </div>

              {/* 3. RÔLE & STATUT */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                {/* Rôle */}
                <div>
                  <label className="block text-xs font-black text-[#0a1a44] uppercase mb-1.5 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-[#02b3bb]" />
                    <span>Rôle Système *</span>
                  </label>
                  <select
                    value={userForm.role}
                    onChange={e => setUserForm({ ...userForm, role: e.target.value as Role })}
                    className="w-full py-2.5 px-3 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#02b3bb] bg-white font-extrabold text-[#0a1a44]"
                  >
                    <option value="admin">👑 Administrateur (Toutes filières & classes)</option>
                    <option value="animateur">👤 Animateur Pédagogique (Filières affectées)</option>
                    <option value="beneficiaire">🎓 Bénéficiaire (Apprenant du centre)</option>
                    <option value="consultation">👁️ Consultation (Lecture seule filières affectées)</option>
                  </select>
                </div>

                {/* Statut */}
                <div>
                  <label className="block text-xs font-black text-[#0a1a44] uppercase mb-1.5 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Statut du Compte *</span>
                  </label>
                  <select
                    value={userForm.statut}
                    onChange={e => setUserForm({ ...userForm, statut: e.target.value as UserStatus })}
                    className="w-full py-2.5 px-3 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#02b3bb] bg-white font-extrabold text-[#0a1a44]"
                  >
                    <option value="actif">🟢 Actif (Accès autorisé)</option>
                    <option value="inactif">🔴 Inactif (Accès suspendu)</option>
                  </select>
                </div>
              </div>

              {/* --------------------------------------------------------- */}
              {/* CAS RÔLE BÉNÉFICIAIRE : ASSOCIER À UN APPRENANT EXISTANT  */}
              {/* --------------------------------------------------------- */}
              {userForm.role === 'beneficiaire' && (
                <div className="p-4 rounded-2xl bg-purple-50/80 border border-purple-200 text-purple-900 text-xs space-y-3">
                  <div className="flex items-center gap-2 font-black text-purple-950">
                    <GraduationCap className="w-5 h-5 text-purple-700" />
                    <span>Associer ce compte à un apprenant existant *</span>
                  </div>
                  <p className="text-[11px] text-purple-800">
                    Sélectionnez le bénéficiaire concerné. Ses données académiques (Code Massar, Nom, Filière, Classe) seront automatiquement pré-remplies et synchronisées.
                  </p>

                  <div>
                    <label className="block text-[11px] font-black uppercase text-purple-950 mb-1">
                      Sélectionner le Bénéficiaire *
                    </label>
                    <select
                      value={userForm.beneficiaireId}
                      onChange={e => handleSelectBeneficiaire(e.target.value)}
                      className="w-full py-2.5 px-3 text-xs rounded-xl border border-purple-300 bg-white font-bold text-[#0a1a44] focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">-- Choisir un apprenant dans la liste --</option>
                      {beneficiaires.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.codeMassar} - {b.nomFr} {b.prenomFr} ({b.classeId})
                        </option>
                      ))}
                    </select>
                  </div>

                  {userForm.codeMassar && (
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-purple-900 bg-white/80 p-2.5 rounded-xl border border-purple-200">
                      <span>Code Massar lié :</span>
                      <span className="px-2 py-0.5 rounded bg-purple-200 text-purple-950 font-black">{userForm.codeMassar}</span>
                    </div>
                  )}
                </div>
              )}

              {/* --------------------------------------------------------- */}
              {/* 4. AFFECTATION DES FILIÈRES ET CLASSES (EXISTANTES)       */}
              {/* --------------------------------------------------------- */}
              {userForm.role === 'admin' ? (
                <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs space-y-1">
                  <div className="flex items-center gap-2 font-black text-amber-950">
                    <Shield className="w-4 h-4 text-amber-700" />
                    <span>Accès Administrateur Global 👑</span>
                  </div>
                  <p className="font-medium text-amber-800">
                    En tant qu'administrateur, cet utilisateur a automatiquement un accès total à <strong>toutes les filières ({filieres.length})</strong> et <strong>toutes les classes ({classes.length})</strong> du centre sans restriction.
                  </p>
                </div>
              ) : userForm.role === 'beneficiaire' ? null : (
                <div className="space-y-4 pt-2 border-t border-slate-200">
                  {/* Notice */}
                  <div className="flex items-start gap-2 p-3 bg-cyan-50/70 border border-cyan-200 rounded-xl text-xs text-[#0a1a44]">
                    <Info className="w-4 h-4 text-[#02b3bb] shrink-0 mt-0.5" />
                    <span>
                      Sélectionnez les filières et classes existantes affectées à cet utilisateur. L'animateur n'aura accès qu'aux apprenants, séances, planning et rapports de ces choix.
                    </span>
                  </div>

                  {/* 4.A FILIÈRE(S) AFFECTÉE(S) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-[#0a1a44] uppercase flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-[#02b3bb]" />
                        <span>Filière(s) affectée(s) * ({userForm.filiereIds.length} sélectionnée{userForm.filiereIds.length > 1 ? 's' : ''})</span>
                      </label>
                      <div className="flex items-center gap-2 text-[11px]">
                        <button
                          type="button"
                          onClick={handleSelectAllFilieres}
                          className="font-bold text-[#02b3bb] hover:underline cursor-pointer"
                        >
                          Tout cocher
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={handleDeselectAllFilieres}
                          className="font-bold text-slate-500 hover:underline cursor-pointer"
                        >
                          Tout décocher
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border border-slate-200 rounded-2xl p-3 bg-slate-50/50 max-h-48 overflow-y-auto">
                      {filieres.map(fil => {
                        const isChecked = userForm.filiereIds.includes(fil.id);
                        return (
                          <div
                            key={fil.id}
                            onClick={() => handleToggleFiliere(fil.id)}
                            className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                              isChecked
                                ? 'bg-cyan-50/80 border-[#02b3bb] text-[#0a1a44] shadow-xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}} // handled by parent div
                              className="rounded text-[#02b3bb] focus:ring-[#02b3bb] cursor-pointer"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="font-extrabold text-xs truncate">
                                <span className="text-[#02b3bb] font-black mr-1">[{fil.code}]</span>
                                {fil.nomFr}
                              </div>
                              {fil.nomAr && (
                                <div className="text-[10px] text-slate-500 font-sans truncate" dir="rtl">
                                  {fil.nomAr}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 4.B CLASSE(S) AFFECTÉE(S) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-[#0a1a44] uppercase flex items-center gap-1.5">
                        <School className="w-3.5 h-3.5 text-[#02b3bb]" />
                        <span>Classe(s) affectée(s) * ({userForm.classeIds.length} sélectionnée{userForm.classeIds.length > 1 ? 's' : ''})</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleSelectClassesOfSelectedFilieres}
                        className="text-[11px] font-bold text-[#02b3bb] hover:underline cursor-pointer"
                        title="Sélectionner toutes les classes appartenant aux filières cochées"
                      >
                        Sélectionner classes des filières cochées
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border border-slate-200 rounded-2xl p-3 bg-slate-50/50 max-h-52 overflow-y-auto">
                      {classes.map(cls => {
                        const isChecked = userForm.classeIds.includes(cls.id);
                        const fil = getFiliereById(cls.filiereId);
                        const isParentFiliereSelected = userForm.filiereIds.includes(cls.filiereId);

                        return (
                          <div
                            key={cls.id}
                            onClick={() => handleToggleClasse(cls.id)}
                            className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                              isChecked
                                ? 'bg-cyan-50/80 border-[#02b3bb] text-[#0a1a44] shadow-xs'
                                : isParentFiliereSelected
                                ? 'bg-white border-cyan-200 text-slate-800 hover:bg-cyan-50/40'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}} // handled by parent div
                              className="rounded text-[#02b3bb] focus:ring-[#02b3bb] cursor-pointer"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="font-extrabold text-xs text-[#0a1a44] truncate">
                                {cls.nomFr}
                              </div>
                              <div className="text-[10px] text-slate-500 font-semibold truncate">
                                {fil ? `${fil.code} - ${fil.nomFr}` : 'Filière'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* 5. Discipline & Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-slate-200">
                <div>
                  <label className="block text-xs font-black text-[#0a1a44] uppercase mb-1">
                    Discipline / Spécialité
                  </label>
                  <input
                    type="text"
                    value={userForm.specialite}
                    onChange={e => setUserForm({ ...userForm, specialite: e.target.value })}
                    className="w-full py-2.5 px-3 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#02b3bb]"
                    placeholder="Ex: Électricité, Couture, Informatique..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-[#0a1a44] uppercase mb-1">
                    Téléphone de contact
                  </label>
                  <input
                    type="text"
                    value={userForm.telephone}
                    onChange={e => setUserForm({ ...userForm, telephone: e.target.value })}
                    className="w-full py-2.5 px-3 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#02b3bb]"
                    placeholder="+212 6..."
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black text-white bg-gradient-to-r from-[#02b3bb] to-[#0891b2] hover:from-[#0099a8] hover:to-[#0e7490] active:scale-95 shadow-md shadow-cyan-900/15 transition-all min-h-[40px] cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingUser ? "Enregistrer les modifications" : "Créer l'utilisateur"}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL : PERMISSIONS INDIVIDUELLES & DROITS D'ACCÈS            */}
      {/* ------------------------------------------------------------- */}
      {selectedUserForPerms && currentPermsForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-6">
            
            {/* Modal Header */}
            <div className="px-6 py-4.5 bg-[#0a1a44] text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#57e4ff]" />
                  <h3 className="font-black text-base">
                    Matrice des Droits & Permissions Individuelles
                  </h3>
                </div>
                <p className="text-xs text-cyan-200/80 mt-0.5">
                  Utilisateur : <strong className="text-white">{selectedUserForPerms.nomComplet}</strong> ({selectedUserForPerms.role})
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedUserForPerms(null)}
                className="p-1.5 text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Quick Presets Bar */}
              <div>
                <label className="block text-xs font-black text-[#0a1a44] uppercase tracking-wider mb-2">
                  Appliquer un profil type de droits :
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('admin')}
                    className="px-3 py-2 text-xs font-black rounded-xl border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 active:scale-95 transition-all text-center cursor-pointer"
                  >
                    👑 Tous les droits (Admin)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('animateur')}
                    className="px-3 py-2 text-xs font-black rounded-xl border border-cyan-300 bg-cyan-50 text-cyan-900 hover:bg-cyan-100 active:scale-95 transition-all text-center cursor-pointer"
                  >
                    🎓 Animateur standard
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('coordonnateur')}
                    className="px-3 py-2 text-xs font-black rounded-xl border border-blue-300 bg-blue-50 text-blue-900 hover:bg-blue-100 active:scale-95 transition-all text-center cursor-pointer"
                  >
                    📋 Coordonnateur
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('readonly')}
                    className="px-3 py-2 text-xs font-black rounded-xl border border-slate-300 bg-slate-50 text-slate-800 hover:bg-slate-100 active:scale-95 transition-all text-center cursor-pointer"
                  >
                    👁️ Consultation seule
                  </button>
                </div>
              </div>

              {/* Individual Permissions Toggles */}
              <div className="space-y-3">
                <label className="block text-xs font-black text-[#0a1a44] uppercase tracking-wider">
                  Matrice détaillée des 10 permissions individuelles :
                </label>

                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                  {PERMISSION_METAS.map(p => {
                    const isGranted = !!currentPermsForm[p.key];
                    return (
                      <div
                        key={p.key}
                        onClick={() => handleToggleSinglePermission(p.key)}
                        className={`p-3.5 flex items-center justify-between gap-4 cursor-pointer transition-colors ${
                          isGranted ? 'bg-cyan-50/30' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs sm:text-sm text-[#0a1a44]">
                              {p.labelFr}
                            </span>
                            <span className="text-xs text-slate-400 font-sans" dir="rtl">
                              {p.labelAr}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {p.descFr}
                          </p>
                        </div>

                        {/* Interactive Toggle Switch */}
                        <div className="shrink-0">
                          <button
                            type="button"
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-hidden ${
                              isGranted ? 'bg-[#02b3bb]' : 'bg-slate-300'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                isGranted ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSelectedUserForPerms(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 active:scale-95 transition-all cursor-pointer"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={handleSavePermissions}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black text-white bg-gradient-to-r from-[#02b3bb] to-[#0891b2] hover:from-[#0099a8] active:scale-95 shadow-md shadow-cyan-900/15 transition-all min-h-[38px] cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Enregistrer les Droits</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL : RÉINITIALISER LE MOT DE PASSE                         */}
      {/* ------------------------------------------------------------- */}
      {resetPassUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4.5 bg-[#0a1a44] text-white flex items-center justify-between border-b border-cyan-900/40">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white">Réinitialiser le mot de passe</h3>
                  <p className="text-[11px] text-cyan-200/80 truncate max-w-[240px]">
                    {resetPassUser.nomComplet}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResetPassUser(null)}
                className="p-1.5 text-slate-300 hover:text-white rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmResetPassword} className="p-6 space-y-4">
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                Vous définissez un nouveau mot de passe pour le compte <strong>{resetPassUser.nomComplet}</strong> ({resetPassUser.role === 'beneficiaire' && resetPassUser.codeMassar ? `Massar : ${resetPassUser.codeMassar}` : resetPassUser.email}).
              </div>

              <div>
                <label className="block text-xs font-black text-[#0a1a44] uppercase mb-1">
                  Nouveau mot de passe *
                </label>
                <input
                  type="text"
                  required
                  value={newPasswordValue}
                  onChange={e => setNewPasswordValue(e.target.value)}
                  className="w-full py-2.5 px-3 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#02b3bb] font-mono font-bold"
                  placeholder="Nouveau mot de passe"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setNewPasswordValue('123456')}
                  className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
                >
                  123456
                </button>
                {resetPassUser.codeMassar && (
                  <button
                    type="button"
                    onClick={() => setNewPasswordValue(resetPassUser.codeMassar!)}
                    className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-purple-100 text-purple-900 hover:bg-purple-200 cursor-pointer"
                  >
                    Utiliser Code Massar
                  </button>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setResetPassUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-amber-600 hover:bg-amber-700 shadow-md transition-all cursor-pointer"
                >
                  Confirmer la réinitialisation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
