import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Seance, User, Classe, Filiere } from '../types';
import { storageService } from '../services/storage';
import { isSeanceAccessible, filterFilieresForUser, filterClassesForUser } from '../utils/userScope';
import { InstitutionalBanner } from './InstitutionalBanner';
import {
  CalendarDays,
  Plus,
  Clock,
  MapPin,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  ClipboardCheck,
  Printer,
  Trash2,
  Edit,
  X,
  Filter,
  Calendar,
  Layers,
  Eye,
  Lock,
  Search,
  BookOpen,
  School,
  CheckSquare,
  Square,
  LayoutGrid,
  List,
  Check
} from 'lucide-react';

const STANDARD_MATIERES = [
  { nomFr: 'Mathématiques Appliquées & Calcul Professionnel', nomAr: 'الرياضيات التطبيقية والحساب المهني' },
  { nomFr: 'Informatique & Outils Bureautiques', nomAr: 'المعلوميات والمكتبات والرقمنة' },
  { nomFr: 'Français & Communication Professionnelle', nomAr: 'التواصل والتعبير بالفرنسية' },
  { nomFr: 'Langue Arabe & Éducation Civique', nomAr: 'اللغة العربية والتربية المدنية' },
  { nomFr: 'Soft Skills & Développement Personnel', nomAr: 'المهارات الحياتية والتطوير الذاتي' },
  { nomFr: 'Électricité de Bâtiment - Travaux Pratiques', nomAr: 'كهرباء البناء - الأشغال التطبيقية' },
  { nomFr: 'Câblage & Schémas Électriques', nomAr: 'التمديدات والمخططات الكهربائية' },
  { nomFr: 'Coupe, Patronage & Modélisme', nomAr: 'الفصالة ورسم الباترون وتصميم الأزياء' },
  { nomFr: 'Couture & Assemblage Textile', nomAr: 'الخياطة والتجميع والنسيج' },
  { nomFr: 'Soudure & Métallurgie', nomAr: 'اللحام والصناعة المعدنية' },
  { nomFr: 'Hygiène, Sécurité & Environnement (HSE)', nomAr: 'السلامة والصحة المهنية والبيئة' },
  { nomFr: "Initiation à l'Entrepreneuriat", nomAr: 'مدخل إلى الحس المقاولاتي وإنشاء المشاريع' },
  { nomFr: 'Projet Professionnel & Insertion', nomAr: 'المشروع المهني والاندماج' }
];

const JOURS_SEMAINE_FR = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

function getJourFromDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    const dayIdx = d.getDay(); // 0 is Sunday
    const map = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    return map[dayIdx] || '';
  } catch {
    return '';
  }
}

function getJourArFromFr(jourFr: string): string {
  switch (jourFr) {
    case 'Lundi': return 'الإثنين';
    case 'Mardi': return 'الثلاثاء';
    case 'Mercredi': return 'الأربعاء';
    case 'Jeudi': return 'الخميس';
    case 'Vendredi': return 'الجمعة';
    case 'Samedi': return 'السبت';
    case 'Dimanche': return 'الأحد';
    default: return '';
  }
}

export const Planning: React.FC = () => {
  const { currentUser, isAdmin, isAnimateur, hasPermission } = useAuth();
  const {
    seances,
    filieres,
    classes,
    absences,
    addSeance,
    updateSeance,
    deleteSeance,
    setActiveModule,
    openPrintModal,
    getFiliereById,
    getClasseById,
    getUserById,
    showToast,
    askConfirmation,
    t,
    isRtl
  } = useApp();

  const canManagePlanning = isAdmin || hasPermission('gestionPlanning');
  const isReadOnly = isAnimateur || !canManagePlanning;

  const accessibleFilieres = useMemo(() => filterFilieresForUser(filieres, currentUser), [filieres, currentUser]);
  const accessibleClasses = useMemo(() => filterClassesForUser(classes, currentUser), [classes, currentUser]);

  const allUsers: User[] = storageService.getUsers();
  const activeAnimators = allUsers.filter((u: User) => (u.role === 'animateur' || u.role === 'admin') && u.statut === 'actif');
  const allAnimators = allUsers.filter((u: User) => u.role === 'animateur' || u.role === 'admin');

  // Filters & Display State
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedJour, setSelectedJour] = useState('');
  const [selectedAnimateur, setSelectedAnimateur] = useState('');
  const [selectedFiliere, setSelectedFiliere] = useState('');
  const [selectedClasse, setSelectedClasse] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table_grouped' | 'table_per_class'>('cards');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSeance, setEditingSeance] = useState<Seance | null>(null);

  // Form State
  const initialForm = {
    intitule: '',
    intituleAr: '',
    animateurId: currentUser?.role === 'animateur' ? currentUser.id : (activeAnimators[0]?.id || ''),
    filiereId: accessibleFilieres[0]?.id || '',
    classeIds: [] as string[],
    date: new Date().toISOString().split('T')[0],
    jour: getJourFromDate(new Date().toISOString().split('T')[0]) || 'Lundi',
    heureDebut: '09:00',
    heureFin: '10:30',
    salle: 'Séance 1'
  };

  const [formData, setFormData] = useState(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Extract all unique subjects (Matières) across the system
  const existingMatieres = useMemo(() => {
    const list: Array<{ nomFr: string; nomAr?: string }> = [...STANDARD_MATIERES];
    seances.forEach(s => {
      if (s.intitule && !list.some(m => m.nomFr.trim().toLowerCase() === s.intitule.trim().toLowerCase())) {
        list.push({
          nomFr: s.intitule.trim(),
          nomAr: s.intituleAr?.trim()
        });
      }
    });
    return list;
  }, [seances]);

  // Classes actives for the currently selected Filière in the form
  const activeClassesForSelectedFiliere = useMemo(() => {
    if (!formData.filiereId) return [];
    return classes.filter(c => c.filiereId === formData.filiereId && c.statut !== 'inactif');
  }, [classes, formData.filiereId]);

  // Helper to extract all class IDs for any session
  const getSeanceClassIds = (s: Seance): string[] => {
    if (s.classeIds && s.classeIds.length > 0) return s.classeIds;
    if (s.classeId) return [s.classeId];
    return [];
  };

  // Filtered sessions
  const filteredSeances = useMemo(() => {
    return seances.filter(s => {
      // Scope check for animateur
      if (!isSeanceAccessible(s, currentUser)) {
        return false;
      }

      // Filter by selected animator
      if (selectedAnimateur && s.animateurId !== selectedAnimateur) {
        return false;
      }

      // Date constraint
      if (selectedDate && s.date !== selectedDate) {
        return false;
      }

      // Jour constraint
      const jour = s.jour || getJourFromDate(s.date);
      if (selectedJour && jour !== selectedJour) {
        return false;
      }

      // Filière constraint
      if (selectedFiliere && s.filiereId !== selectedFiliere) {
        return false;
      }

      // Classe constraint
      const sClassIds = getSeanceClassIds(s);
      if (selectedClasse && !sClassIds.includes(selectedClasse)) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const filiere = getFiliereById(s.filiereId);
        const anim = getUserById(s.animateurId);
        const classNames = sClassIds.map(cid => getClasseById(cid)?.nomFr || '').join(' ').toLowerCase();
        const classCodes = sClassIds.map(cid => getClasseById(cid)?.code || '').join(' ').toLowerCase();

        const matchIntitule = s.intitule.toLowerCase().includes(q);
        const matchIntituleAr = (s.intituleAr || '').toLowerCase().includes(q);
        const matchSalle = (s.salle || '').toLowerCase().includes(q);
        const matchFiliere = (filiere?.nomFr || '').toLowerCase().includes(q) || (filiere?.code || '').toLowerCase().includes(q);
        const matchAnim = (anim?.nomComplet || '').toLowerCase().includes(q);
        const matchClasses = classNames.includes(q) || classCodes.includes(q);

        if (!matchIntitule && !matchIntituleAr && !matchSalle && !matchFiliere && !matchAnim && !matchClasses) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      // Sort by date desc then by start time
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return a.heureDebut.localeCompare(b.heureDebut);
    });
  }, [seances, selectedAnimateur, selectedDate, selectedJour, selectedFiliere, selectedClasse, searchQuery, currentUser, getFiliereById, getClasseById, getUserById]);

  // Exploded rows for table per class view
  const explodedRows = useMemo(() => {
    const rows: Array<{
      seance: Seance;
      classeId: string;
      filiere: Filiere | undefined;
      classe: Classe | undefined;
      animateur: User | undefined;
      hasAbsences: boolean;
      jour: string;
    }> = [];

    filteredSeances.forEach(s => {
      const cIds = getSeanceClassIds(s);
      const filiere = getFiliereById(s.filiereId);
      const animateur = getUserById(s.animateurId);
      const hasAbsences = absences.some(a => a.seanceId === s.id);
      const jour = s.jour || getJourFromDate(s.date) || 'Lundi';

      if (cIds.length === 0) {
        rows.push({
          seance: s,
          classeId: '',
          filiere,
          classe: undefined,
          animateur,
          hasAbsences,
          jour
        });
      } else {
        cIds.forEach(cid => {
          // If a class filter is active, only show that class row
          if (selectedClasse && cid !== selectedClasse) return;
          const classe = getClasseById(cid);
          rows.push({
            seance: s,
            classeId: cid,
            filiere,
            classe,
            animateur,
            hasAbsences,
            jour
          });
        });
      }
    });

    return rows;
  }, [filteredSeances, absences, selectedClasse, getFiliereById, getClasseById, getUserById]);

  const handleOpenAdd = () => {
    if (!canManagePlanning) return;
    setEditingSeance(null);
    const defaultFiliere = accessibleFilieres[0]?.id || '';
    const matchingActiveClasses = classes.filter(c => c.filiereId === defaultFiliere && c.statut !== 'inactif');
    const today = new Date().toISOString().split('T')[0];

    setFormData({
      ...initialForm,
      animateurId: currentUser?.role === 'animateur' ? currentUser.id : (activeAnimators[0]?.id || ''),
      filiereId: defaultFiliere,
      classeIds: matchingActiveClasses.length > 0 ? [matchingActiveClasses[0].id] : [],
      date: today,
      jour: getJourFromDate(today) || 'Lundi',
      heureDebut: '09:00',
      heureFin: '10:30',
      salle: 'Séance 1'
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: Seance) => {
    if (!canManagePlanning) return;
    setEditingSeance(s);
    const sClassIds = getSeanceClassIds(s);
    const date = s.date || new Date().toISOString().split('T')[0];
    const jour = s.jour || getJourFromDate(date) || 'Lundi';

    setFormData({
      intitule: s.intitule,
      intituleAr: s.intituleAr || '',
      animateurId: s.animateurId,
      filiereId: s.filiereId,
      classeIds: sClassIds,
      date: date,
      jour: jour,
      heureDebut: s.heureDebut,
      heureFin: s.heureFin,
      salle: s.salle || 'Séance 1'
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleToggleClass = (classId: string) => {
    const current = formData.classeIds;
    if (current.includes(classId)) {
      setFormData(prev => ({
        ...prev,
        classeIds: prev.classeIds.filter(id => id !== classId)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        classeIds: [...prev.classeIds, classId]
      }));
    }
    if (errors.classeIds || errors.general) {
      setErrors(prev => ({ ...prev, classeIds: '', general: '' }));
    }
  };

  const handleSelectAllClasses = () => {
    const allIds = activeClassesForSelectedFiliere.map(c => c.id);
    setFormData(prev => ({ ...prev, classeIds: allIds }));
    if (errors.classeIds || errors.general) {
      setErrors(prev => ({ ...prev, classeIds: '', general: '' }));
    }
  };

  const handleDeselectAllClasses = () => {
    setFormData(prev => ({ ...prev, classeIds: [] }));
  };

  const handleMatiereSelect = (matiereNom: string) => {
    const found = existingMatieres.find(m => m.nomFr === matiereNom);
    setFormData(prev => ({
      ...prev,
      intitule: matiereNom,
      intituleAr: found?.nomAr || prev.intituleAr
    }));
    if (errors.intitule) {
      setErrors(prev => ({ ...prev, intitule: '' }));
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.date) errs.date = 'La date est obligatoire.';
    if (!formData.filiereId) errs.filiereId = 'La filière est obligatoire.';
    if (!formData.classeIds || formData.classeIds.length === 0) {
      errs.classeIds = 'Veuillez sélectionner au moins une classe pour cette séance.';
    }
    if (!formData.animateurId) errs.animateurId = "L'animateur est obligatoire.";
    if (!formData.intitule.trim()) errs.intitule = 'La matière / activité est obligatoire.';
    if (!formData.salle.trim()) errs.salle = 'La séance est obligatoire.';
    if (!formData.heureDebut) errs.heureDebut = "L'heure de début est obligatoire.";
    if (!formData.heureFin) errs.heureFin = "L'heure de fin est obligatoire.";
    if (formData.heureDebut && formData.heureFin && formData.heureDebut >= formData.heureFin) {
      errs.heureFin = "L'heure de fin doit être postérieure à l'heure de début.";
    }
    return errs;
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManagePlanning) return;
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    // Duplicate session prevention check:
    // Check if any of the selected classes already has a session at this date & overlapping time
    const isDuplicate = seances.some(s => {
      if (s.id === editingSeance?.id) return false;
      if (s.date !== formData.date) return false;

      // Check time overlap
      const hasTimeOverlap = formData.heureDebut < s.heureFin && formData.heureFin > s.heureDebut;
      if (!hasTimeOverlap) return false;

      const sClassIds = getSeanceClassIds(s);
      const sharesClass = formData.classeIds.some(cid => sClassIds.includes(cid));
      const sameAnimator = s.animateurId === formData.animateurId;

      return sharesClass || sameAnimator;
    });

    if (isDuplicate) {
      setErrors({
        general: '⚠️ Une séance existe déjà pour cette classe ou cet animateur à cette date et à ce créneau horaire.'
      });
      showToast('⚠️ Conflit détecté : séance déjà programmée sur ce créneau horaire.', 'error');
      return;
    }

    const primaryClassId = formData.classeIds[0] || '';
    const jour = formData.jour || getJourFromDate(formData.date) || 'Lundi';

    const payload = {
      intitule: formData.intitule.trim(),
      intituleAr: formData.intituleAr?.trim() || undefined,
      animateurId: formData.animateurId,
      filiereId: formData.filiereId,
      classeId: primaryClassId,
      classeIds: formData.classeIds,
      date: formData.date,
      jour: jour,
      heureDebut: formData.heureDebut,
      heureFin: formData.heureFin,
      salle: formData.salle.trim()
    };

    if (editingSeance) {
      updateSeance({
        ...editingSeance,
        ...payload
      });
      showToast('✅ Séance modifiée avec succès !', 'success');
    } else {
      addSeance(payload);
      showToast('✅ Séance enregistrée avec succès !', 'success');
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Header and Add Session */}
      <InstitutionalBanner
        title={t.planningTitle}
        subtitle={
          isReadOnly
            ? `Planning des séances en lecture seule (${seances.length} séances) • Connecté : ${currentUser?.nomComplet}`
            : `${t.allSessions} (${seances.length} séances programmées)`
        }
        actionButton={
          <div className="flex items-center gap-2">
            {isReadOnly && (
              <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200">
                <Eye className="w-4 h-4 text-emerald-600" />
                <span>Lecture seule</span>
              </div>
            )}

            {canManagePlanning && (
              <button
                type="button"
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black text-white bg-gradient-to-r from-[#02b3bb] to-[#0891b2] hover:from-[#0099a8] hover:to-[#0e7490] active:scale-95 shadow-md shadow-cyan-900/15 transition-all min-h-[40px] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{t.addSeance}</span>
              </button>
            )}

            {hasPermission('imprimerRapports') && (
              <button
                type="button"
                onClick={() => openPrintModal('rapport')}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-black text-[#0a1a44] bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs active:scale-95 transition-all min-h-[40px] cursor-pointer"
              >
                <Printer className="w-4 h-4 text-[#02b3bb]" />
                <span className="hidden sm:inline">{t.printBtn}</span>
              </button>
            )}
          </div>
        }
      />

      {/* Filter & View Switcher Bar (Canva Tech Card) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
        
        {/* Search & View Switcher */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher par matière, classe, filière, animateur ou séance..."
              className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-2xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#02b3bb] bg-slate-50/60 font-medium text-[#0a1a44]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* View Mode Tabs */}
          <div className="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200 shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white text-[#0a1a44] shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Affichage en cartes interactives"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-[#02b3bb]" />
              <span>Cartes</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table_grouped')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'table_grouped'
                  ? 'bg-white text-[#0a1a44] shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Tableau groupé par séance"
            >
              <List className="w-3.5 h-3.5 text-[#02b3bb]" />
              <span>Tableau groupé</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table_per_class')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'table_per_class'
                  ? 'bg-white text-[#0a1a44] shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Tableau détaillé avec 1 ligne par classe"
            >
              <School className="w-3.5 h-3.5 text-[#02b3bb]" />
              <span>Tableau par classe</span>
            </button>
          </div>
        </div>

        {/* Detailed Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2 border-t border-slate-100">
          
          {/* 1. Date Filter */}
          <div>
            <label className="block text-[11px] font-black text-[#0a1a44] uppercase mb-1">
              {t.colDate}
            </label>
            <div className="flex gap-1.5">
              <input
                type="date"
                value={selectedDate}
                onChange={e => {
                  setSelectedDate(e.target.value);
                  if (e.target.value) setSelectedJour('');
                }}
                className="w-full py-2 px-3 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#02b3bb] bg-slate-50/60 font-medium text-[#0a1a44]"
              />
              {selectedDate && (
                <button
                  type="button"
                  onClick={() => setSelectedDate('')}
                  className="px-2 py-1 text-xs text-slate-500 hover:text-slate-800 bg-slate-100 rounded-xl cursor-pointer"
                  title="Effacer la date"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* 2. Jour Filter */}
          <div>
            <label className="block text-[11px] font-black text-[#0a1a44] uppercase mb-1">
              Jour
            </label>
            <select
              value={selectedJour}
              onChange={e => {
                setSelectedJour(e.target.value);
                if (e.target.value) setSelectedDate('');
              }}
              className="w-full py-2 px-3 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#02b3bb] bg-slate-50/60 text-[#0a1a44]"
            >
              <option value="">Tous les jours</option>
              {JOURS_SEMAINE_FR.map(j => (
                <option key={j} value={j}>
                  {j} ({getJourArFromFr(j)})
                </option>
              ))}
            </select>
          </div>

          {/* 3. Filière Filter */}
          <div>
            <label className="block text-[11px] font-black text-[#0a1a44] uppercase mb-1">
              {t.colFiliere}
            </label>
            <select
              value={selectedFiliere}
              onChange={e => {
                setSelectedFiliere(e.target.value);
                setSelectedClasse('');
              }}
              className="w-full py-2 px-3 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#02b3bb] bg-slate-50/60 text-[#0a1a44]"
            >
              <option value="">Toutes les filières</option>
              {accessibleFilieres.map(f => (
                <option key={f.id} value={f.id}>
                  [{f.code}] {f.nomFr}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Classe Filter */}
          <div>
            <label className="block text-[11px] font-black text-[#0a1a44] uppercase mb-1">
              {t.colClasse}
            </label>
            <select
              value={selectedClasse}
              onChange={e => setSelectedClasse(e.target.value)}
              className="w-full py-2 px-3 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#02b3bb] bg-slate-50/60 text-[#0a1a44]"
            >
              <option value="">Toutes les classes</option>
              {accessibleClasses
                .filter(c => !selectedFiliere || c.filiereId === selectedFiliere)
                .map(c => (
                  <option key={c.id} value={c.id}>
                    [{c.code}] {c.nomFr}
                  </option>
                ))}
            </select>
          </div>

          {/* 5. Animateur Filter */}
          <div>
            <label className="block text-[11px] font-black text-[#0a1a44] uppercase mb-1">
              {t.colAnimateur}
            </label>
            <select
              value={selectedAnimateur}
              onChange={e => setSelectedAnimateur(e.target.value)}
              className="w-full py-2 px-3 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#02b3bb] bg-slate-50/60 text-[#0a1a44]"
            >
              <option value="">Tous les animateurs</option>
              {allAnimators.map((a: User) => (
                <option key={a.id} value={a.id}>
                  {a.nomComplet} {a.statut === 'inactif' ? '(Inactif)' : ''}
                </option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. VUE EN CARTES INTERACTIVES                                             */}
      {/* ========================================================================= */}
      {viewMode === 'cards' && (
        <>
          {filteredSeances.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center text-slate-400">
              <CalendarDays className="w-12 h-12 mx-auto text-[#02b3bb]/40 mb-2" />
              <p className="text-sm font-bold text-[#0a1a44]">Aucune séance ne correspond aux critères.</p>
              {isAnimateur && (
                <p className="text-xs text-slate-500 mt-1">
                  Connecté : {currentUser?.nomComplet}. Vous visualisez les séances qui vous sont assignées.
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredSeances.map(seance => {
                const filiere = getFiliereById(seance.filiereId);
                const sClassIds = getSeanceClassIds(seance);
                const sClasses = sClassIds.map(cid => getClasseById(cid)).filter(Boolean) as Classe[];
                const animateur = getUserById(seance.animateurId);
                const hasAbsences = absences.some(a => a.seanceId === seance.id);
                const jour = seance.jour || getJourFromDate(seance.date) || 'Lundi';

                return (
                  <div
                    key={seance.id}
                    className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 p-5 flex flex-col justify-between group"
                  >
                    <div>
                      
                      {/* Top Bar: Date, Jour & Time */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0a1a44] bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span>{jour} • {seance.date}</span>
                        </span>

                        <span className="inline-flex items-center gap-1.5 text-xs font-black text-[#02b3bb] bg-cyan-50 px-3 py-1 rounded-full border border-cyan-200/70">
                          <Clock className="w-3.5 h-3.5 text-[#02b3bb]" />
                          {seance.heureDebut} - {seance.heureFin}
                        </span>
                      </div>

                      {/* Title / Matière */}
                      <h3 className="text-base font-black text-[#0a1a44] line-clamp-2 leading-snug">
                        {seance.intitule}
                      </h3>
                      {seance.intituleAr && (
                        <p className="text-xs text-slate-500 line-clamp-1 mt-0.5 font-sans" dir="rtl">
                          {seance.intituleAr}
                        </p>
                      )}

                      {/* Multi-Classes Display: "Mathématiques — Classe A, Classe B, Classe C" */}
                      <div className="mt-3.5 p-2.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                            <School className="w-3 h-3 text-[#02b3bb]" />
                            <span>{sClasses.length > 1 ? `${sClasses.length} Classes concernées :` : 'Classe :'}</span>
                          </span>
                          <span className="text-[10px] font-bold text-[#02b3bb] bg-cyan-50 px-2 py-0.5 rounded-full border border-cyan-200">
                            {filiere?.code || 'Filière'}
                          </span>
                        </div>

                        {/* List of class badges */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {sClasses.length > 0 ? (
                            sClasses.map(c => (
                              <span
                                key={c.id}
                                className="inline-flex items-center gap-1 text-[11px] font-black text-[#0a1a44] bg-white px-2.5 py-0.5 rounded-lg border border-slate-300 shadow-2xs"
                                title={`Classe : ${c.nomFr} (${c.anneeScolaire})`}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-[#02b3bb]"></span>
                                <span>{c.nomFr}</span>
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400 italic">Aucune classe spécifiée</span>
                          )}
                        </div>
                      </div>

                      {/* Room / Séance Badge */}
                      {seance.salle && (
                        <div className="mt-2.5 flex items-center gap-1.5 text-xs text-slate-600">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-semibold">{seance.salle}</span>
                        </div>
                      )}

                      {/* Animator info */}
                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1.5 font-bold text-[#0a1a44] truncate">
                          <UserIcon className="w-3.5 h-3.5 text-[#02b3bb]" />
                          {animateur?.nomComplet || 'Animateur non assigné'}
                        </span>

                        {hasAbsences ? (
                          <span className="text-[10px] font-black text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            {t.seanceStatusRecorded}
                          </span>
                        ) : (
                          <span className="text-[10px] font-black text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 inline-flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            {t.seanceStatusPending}
                          </span>
                        )}
                      </div>

                    </div>

                    {/* Card Actions Footer */}
                    {isReadOnly ? (
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 text-slate-600 font-bold border border-slate-200 text-xs">
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span>{isRtl ? 'معاينة فقط' : 'Consultation seule'}</span>
                        </div>

                        <button
                          type="button"
                          disabled
                          aria-disabled="true"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 bg-slate-100/80 border border-slate-200/80 cursor-not-allowed select-none"
                          title="Actions désactivées pour le compte animateur (lecture seule)"
                        >
                          <Lock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{isRtl ? 'أزرار معطلة' : 'Boutons désactivés'}</span>
                        </button>
                      </div>
                    ) : (
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        
                        {/* Pointage d'absence button */}
                        <button
                          type="button"
                          onClick={() => {
                            setActiveModule('absences');
                          }}
                          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-black text-white bg-gradient-to-r from-[#02b3bb] to-[#0891b2] hover:from-[#0099a8] hover:to-[#0e7490] active:scale-95 shadow-2xs transition-all min-h-[36px] cursor-pointer"
                        >
                          <ClipboardCheck className="w-4 h-4" />
                          <span>{hasAbsences ? 'Revoir présence' : 'Pointer présence'}</span>
                        </button>

                        <div className="flex items-center gap-1">
                          {/* Print attendance sheet */}
                          {hasPermission('imprimerRapports') && (
                            <button
                              type="button"
                              onClick={() => openPrintModal('seance', seance)}
                              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 active:scale-[0.95] rounded-xl transition-all border border-transparent cursor-pointer"
                              title={t.printAttendanceSheet}
                            >
                              <Printer className="w-4 h-4 text-[#02b3bb]" />
                            </button>
                          )}

                          {/* Edit & Delete */}
                          {canManagePlanning && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(seance)}
                                className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 active:scale-[0.95] rounded-xl transition-all border border-transparent hover:border-blue-200 cursor-pointer"
                                title={t.editSeance}
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  askConfirmation({
                                    title: "Supprimer la séance",
                                    message: `Êtes-vous certain de vouloir supprimer définitivement la séance « ${seance.intitule} » ?`,
                                    confirmLabel: "Supprimer",
                                    variant: "danger",
                                    onConfirm: () => {
                                      deleteSeance(seance.id);
                                      showToast('✅ Suppression réussie', 'success');
                                    }
                                  });
                                }}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 active:scale-[0.95] rounded-xl transition-all border border-transparent hover:border-rose-200 cursor-pointer"
                                title={t.deleteSeance}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>

                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* 2. VUE EN TABLEAU GROUPÉ (1 LIGNE PAR SÉANCE AVEC LISTE DES CLASSES)      */}
      {/* ========================================================================= */}
      {viewMode === 'table_grouped' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-[#0a1a44] font-black uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Matière / Activité</th>
                  <th className="py-3.5 px-4">Filière</th>
                  <th className="py-3.5 px-4">Classes Associées</th>
                  <th className="py-3.5 px-4">Animateur</th>
                  <th className="py-3.5 px-4">Jour & Date</th>
                  <th className="py-3.5 px-4">Heure</th>
                  <th className="py-3.5 px-4">Séance</th>
                  <th className="py-3.5 px-4 text-center">Pointage</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredSeances.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      Aucune séance trouvée.
                    </td>
                  </tr>
                ) : (
                  filteredSeances.map(seance => {
                    const filiere = getFiliereById(seance.filiereId);
                    const sClassIds = getSeanceClassIds(seance);
                    const sClasses = sClassIds.map(cid => getClasseById(cid)).filter(Boolean) as Classe[];
                    const animateur = getUserById(seance.animateurId);
                    const hasAbsences = absences.some(a => a.seanceId === seance.id);
                    const jour = seance.jour || getJourFromDate(seance.date) || 'Lundi';

                    return (
                      <tr key={seance.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-extrabold text-[#0a1a44]">{seance.intitule}</div>
                          {seance.intituleAr && (
                            <div className="text-[11px] text-slate-500 font-sans" dir="rtl">{seance.intituleAr}</div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold text-[#02b3bb] bg-cyan-50 border border-cyan-200">
                            {filiere?.code || '—'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1">
                            {sClasses.map(c => (
                              <span
                                key={c.id}
                                className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold text-[#0a1a44] bg-slate-100 border border-slate-200"
                              >
                                {c.nomFr}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-[#0a1a44]">
                          {animateur?.nomComplet || '—'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-900">{jour}</span>
                          <span className="block text-[11px] text-slate-500 font-mono">{seance.date}</span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-[#02b3bb]">
                          {seance.heureDebut} - {seance.heureFin}
                        </td>
                        <td className="py-3.5 px-4 text-xs font-semibold text-slate-600">
                          {seance.salle || 'Séance 1'}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {hasAbsences ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Pointé
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              <AlertCircle className="w-3 h-3 text-amber-600" />
                              En attente
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {hasPermission('imprimerRapports') && (
                              <button
                                type="button"
                                onClick={() => openPrintModal('seance', seance)}
                                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
                                title="Imprimer la feuille d'émargement"
                              >
                                <Printer className="w-4 h-4 text-[#02b3bb]" />
                              </button>
                            )}
                            {canManagePlanning && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(seance)}
                                  className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                                  title="Modifier"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    askConfirmation({
                                      title: "Supprimer la séance",
                                      message: `Supprimer la séance « ${seance.intitule} » ?`,
                                      confirmLabel: "Supprimer",
                                      variant: "danger",
                                      onConfirm: () => deleteSeance(seance.id)
                                    });
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                                  title="Supprimer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
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
      )}

      {/* ========================================================================= */}
      {/* 3. VUE EN TABLEAU DÉTAILLÉ (1 LIGNE PAR CLASSE CONFORME À LA DEMANDE)      */}
      {/* ========================================================================= */}
      {viewMode === 'table_per_class' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">
              Vue détaillée : <strong>{explodedRows.length} lignes de cours</strong> (1 ligne par classe assignée)
            </span>
            <span className="text-xs font-semibold text-[#02b3bb] bg-cyan-50 px-2.5 py-1 rounded-xl border border-cyan-200">
              Format tableau par classe
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-100/70 border-b border-slate-200 text-[#0a1a44] font-black uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Matière</th>
                  <th className="py-3.5 px-4">Filière</th>
                  <th className="py-3.5 px-4">Classe</th>
                  <th className="py-3.5 px-4">Animateur</th>
                  <th className="py-3.5 px-4">Jour</th>
                  <th className="py-3.5 px-4">Heure</th>
                  <th className="py-3.5 px-4">Séance</th>
                  <th className="py-3.5 px-4 text-center">Statut</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {explodedRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      Aucune séance trouvée.
                    </td>
                  </tr>
                ) : (
                  explodedRows.map((row, idx) => (
                    <tr key={`${row.seance.id}-${row.classeId || idx}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-extrabold text-[#0a1a44]">
                        {row.seance.intitule}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-xs font-bold text-[#02b3bb]">
                          {row.filiere?.nomFr || row.filiere?.code || '—'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-extrabold text-[#0a1a44] bg-slate-100 border border-slate-300">
                          {row.classe?.nomFr || 'Toutes'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {row.animateur?.nomComplet || '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900">{row.jour}</span>
                        <span className="block text-[11px] text-slate-400 font-mono">{row.seance.date}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-[#02b3bb]">
                        {row.seance.heureDebut}–{row.seance.heureFin}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        {row.seance.salle || 'Séance'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {row.hasAbsences ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Pointé
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            En attente
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canManagePlanning && (
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(row.seance)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                              title="Modifier la séance"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODAL AJOUT / MODIFICATION D'UNE SÉANCE (MULTI-CLASSES & MATIÈRE)       */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in duration-150">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-50 to-cyan-50/30">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-cyan-100 text-[#02b3bb] flex items-center justify-center border border-cyan-200">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-[#0a1a44]">
                    {editingSeance ? 'Modifier la séance' : 'Ajouter une séance'}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Une même matière peut être programmée pour une ou plusieurs classes.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* General Error Banner */}
              {errors.general && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errors.general}</span>
                </div>
              )}

              {/* 1. Matière / Activité (Sélecteur de matière existante + sans doublons) */}
              <div>
                <label className="block text-xs font-black text-[#0a1a44] uppercase tracking-wider mb-1">
                  Matière / Activité <span className="text-rose-500">*</span>
                </label>
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.intitule}
                      onChange={e => {
                        setFormData({ ...formData, intitule: e.target.value });
                        if (errors.intitule) setErrors(prev => ({ ...prev, intitule: '' }));
                      }}
                      placeholder="Ex: Mathématiques / Informatique / Électricité de Bâtiment..."
                      list="matieres-suggestions-planning"
                      className={`w-full py-2.5 px-3.5 text-sm rounded-xl border font-bold focus:outline-hidden focus:ring-2 focus:ring-[#02b3bb] ${
                        errors.intitule ? 'border-rose-400 bg-rose-50/50' : 'border-slate-300 bg-white'
                      }`}
                    />
                    <datalist id="matieres-suggestions-planning">
                      {existingMatieres.map((m, idx) => (
                        <option key={idx} value={m.nomFr}>
                          {m.nomAr ? `${m.nomFr} — ${m.nomAr}` : m.nomFr}
                        </option>
                      ))}
                    </datalist>
                  </div>

                  {/* Quick Matière Picker chips */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      📚 Suggestions rapides de matières :
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-200">
                      {existingMatieres.slice(0, 8).map((m, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleMatiereSelect(m.nomFr)}
                          className={`text-[11px] px-2.5 py-1 rounded-lg font-bold border transition-all cursor-pointer ${
                            formData.intitule === m.nomFr
                              ? 'bg-[#02b3bb] text-white border-[#02b3bb] shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-[#02b3bb]/50'
                          }`}
                        >
                          {m.nomFr}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                {errors.intitule && <p className="text-[11px] text-rose-600 font-bold mt-1">{errors.intitule}</p>}
              </div>

              {/* 2. Filière */}
              <div>
                <label className="block text-xs font-black text-[#0a1a44] uppercase tracking-wider mb-1">
                  Filière <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.filiereId}
                  onChange={e => {
                    const fId = e.target.value;
                    const matchingActiveCls = classes.filter(c => c.filiereId === fId && c.statut !== 'inactif');
                    setFormData({
                      ...formData,
                      filiereId: fId,
                      // Automatically select first active class of newly selected filière
                      classeIds: matchingActiveCls.length > 0 ? [matchingActiveCls[0].id] : []
                    });
                    if (errors.filiereId || errors.classeIds || errors.general) {
                      setErrors(prev => ({ ...prev, filiereId: '', classeIds: '', general: '' }));
                    }
                  }}
                  className={`w-full py-2.5 px-3 text-sm rounded-xl border font-bold focus:outline-hidden focus:ring-2 focus:ring-[#02b3bb] ${
                    errors.filiereId ? 'border-rose-400 bg-rose-50/50' : 'border-slate-300 bg-white'
                  }`}
                >
                  <option value="">-- Sélectionner une filière --</option>
                  {accessibleFilieres.map(f => (
                    <option key={f.id} value={f.id}>
                      [{f.code}] {f.nomFr}
                    </option>
                  ))}
                </select>
                {errors.filiereId && <p className="text-[11px] text-rose-600 font-bold mt-1">{errors.filiereId}</p>}
              </div>

              {/* 3. Multi-Classes Selection for this Filière */}
              <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black text-[#0a1a44] uppercase tracking-wider">
                    Classes concernées <span className="text-rose-500">*</span>
                  </label>

                  {/* Select all / Deselect all */}
                  {activeClassesForSelectedFiliere.length > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAllClasses}
                        className="text-[10px] font-black text-[#02b3bb] hover:underline cursor-pointer"
                      >
                        Tout cocher
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={handleDeselectAllClasses}
                        className="text-[10px] font-black text-slate-500 hover:text-slate-800 cursor-pointer"
                      >
                        Tout décocher
                      </button>
                    </div>
                  )}
                </div>

                {activeClassesForSelectedFiliere.length === 0 ? (
                  <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded-xl border border-amber-200 font-medium">
                    ⚠️ Aucune classe active n'est associée à cette filière. Veuillez d'abord ajouter ou activer une classe dans le Paramétrage.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {activeClassesForSelectedFiliere.map(c => {
                      const isSelected = formData.classeIds.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleToggleClass(c.id)}
                          className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-cyan-50/80 border-[#02b3bb] shadow-2xs text-[#0a1a44]'
                              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="text-xs font-extrabold truncate">
                              [{c.code}] {c.nomFr}
                            </div>
                            <div className="text-[10px] text-slate-500 font-medium">
                              {c.niveau || 'Niveau 1'}
                            </div>
                          </div>

                          <div className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-[#02b3bb] border-[#02b3bb] text-white'
                              : 'border-slate-300 bg-white text-transparent'
                          }`}>
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Selected summary */}
                <div className="pt-1 text-[11px] font-bold text-slate-600 flex items-center justify-between">
                  <span>
                    {formData.classeIds.length > 0 ? (
                      <span className="text-[#02b3bb]">
                        ✓ {formData.classeIds.length} classe(s) sélectionnée(s)
                      </span>
                    ) : (
                      <span className="text-rose-600">
                        Aucune classe sélectionnée
                      </span>
                    )}
                  </span>
                </div>

                {errors.classeIds && <p className="text-[11px] text-rose-600 font-bold mt-1">{errors.classeIds}</p>}
              </div>

              {/* 4. Animateur */}
              <div>
                <label className="block text-xs font-black text-[#0a1a44] uppercase tracking-wider mb-1">
                  Animateur <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.animateurId}
                  onChange={e => {
                    setFormData({ ...formData, animateurId: e.target.value });
                    if (errors.animateurId || errors.general) setErrors(prev => ({ ...prev, animateurId: '', general: '' }));
                  }}
                  className={`w-full py-2.5 px-3 text-sm rounded-xl border font-bold focus:outline-hidden focus:ring-2 focus:ring-[#02b3bb] ${
                    errors.animateurId ? 'border-rose-400 bg-rose-50/50' : 'border-slate-300 bg-white'
                  }`}
                >
                  <option value="">-- Sélectionner un animateur --</option>
                  {activeAnimators.map((a: User) => (
                    <option key={a.id} value={a.id}>
                      {a.nomComplet} ({a.specialite?.split('&')[0].trim() || 'Formateur'})
                    </option>
                  ))}
                </select>
                {errors.animateurId && <p className="text-[11px] text-rose-600 font-bold mt-1">{errors.animateurId}</p>}
              </div>

              {/* 5. Date & Jour (Grid 2 cols) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Date */}
                <div>
                  <label className="block text-xs font-black text-[#0a1a44] uppercase tracking-wider mb-1">
                    Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={e => {
                      const newDate = e.target.value;
                      const calculatedJour = getJourFromDate(newDate) || 'Lundi';
                      setFormData({ ...formData, date: newDate, jour: calculatedJour });
                      if (errors.date || errors.general) setErrors(prev => ({ ...prev, date: '', general: '' }));
                    }}
                    className={`w-full py-2.5 px-3.5 text-sm rounded-xl border font-bold focus:outline-hidden focus:ring-2 focus:ring-[#02b3bb] ${
                      errors.date ? 'border-rose-400 bg-rose-50/50' : 'border-slate-300 bg-white'
                    }`}
                  />
                  {errors.date && <p className="text-[11px] text-rose-600 font-bold mt-1">{errors.date}</p>}
                </div>

                {/* Jour */}
                <div>
                  <label className="block text-xs font-black text-[#0a1a44] uppercase tracking-wider mb-1">
                    Jour (Semaine) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.jour}
                    onChange={e => setFormData({ ...formData, jour: e.target.value })}
                    className="w-full py-2.5 px-3.5 text-sm rounded-xl border border-slate-300 bg-white font-bold focus:outline-hidden focus:ring-2 focus:ring-[#02b3bb]"
                  >
                    {JOURS_SEMAINE_FR.map(j => (
                      <option key={j} value={j}>
                        {j} ({getJourArFromFr(j)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 6. Séance */}
              <div>
                <label className="block text-xs font-black text-[#0a1a44] uppercase tracking-wider mb-1">
                  Séance <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={formData.salle}
                    onChange={e => {
                      const val = e.target.value;
                      let debut = formData.heureDebut;
                      let fin = formData.heureFin;
                      if (val === 'Séance 1 (08:30 - 10:00)') { debut = '08:30'; fin = '10:00'; }
                      else if (val === 'Séance 2 (10:15 - 11:45)') { debut = '10:15'; fin = '11:45'; }
                      else if (val === 'Séance 3 (14:30 - 16:00)') { debut = '14:30'; fin = '16:00'; }
                      else if (val === 'Séance 4 (16:15 - 17:45)') { debut = '16:15'; fin = '17:45'; }
                      
                      setFormData({
                        ...formData,
                        salle: val,
                        heureDebut: debut,
                        heureFin: fin
                      });
                      if (errors.salle) setErrors(prev => ({ ...prev, salle: '' }));
                    }}
                    className="w-full py-2.5 px-3 text-sm rounded-xl border border-slate-300 bg-white font-bold focus:outline-hidden focus:ring-2 focus:ring-[#02b3bb]"
                  >
                    <option value="Séance 1">Séance 1</option>
                    <option value="Séance 2">Séance 2</option>
                    <option value="Séance 3">Séance 3</option>
                    <option value="Séance 4">Séance 4</option>
                    <option value="Séance 1 (08:30 - 10:00)">Séance 1 (08:30 - 10:00)</option>
                    <option value="Séance 2 (10:15 - 11:45)">Séance 2 (10:15 - 11:45)</option>
                    <option value="Séance 3 (14:30 - 16:00)">Séance 3 (14:30 - 16:00)</option>
                    <option value="Séance 4 (16:15 - 17:45)">Séance 4 (16:15 - 17:45)</option>
                    <option value="Séance Matinée">Séance Matinée</option>
                    <option value="Séance Après-midi">Séance Après-midi</option>
                    <option value="Atelier Pratique N° 1">Atelier Pratique N° 1</option>
                    <option value="Atelier Pratique N° 2">Atelier Pratique N° 2</option>
                  </select>
                  <input
                    type="text"
                    value={formData.salle}
                    onChange={e => {
                      setFormData({ ...formData, salle: e.target.value });
                      if (errors.salle) setErrors(prev => ({ ...prev, salle: '' }));
                    }}
                    placeholder="Ou intitulé personnalisé..."
                    className={`w-full py-2.5 px-3 text-sm rounded-xl border font-medium focus:outline-hidden focus:ring-2 focus:ring-[#02b3bb] ${
                      errors.salle ? 'border-rose-400 bg-rose-50/50' : 'border-slate-300 bg-white'
                    }`}
                  />
                </div>
                {errors.salle && <p className="text-[11px] text-rose-600 font-bold mt-1">{errors.salle}</p>}
              </div>

              {/* 7. Heure de début & 8. Heure de fin (Grid 2 cols) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Heure début */}
                <div>
                  <label className="block text-xs font-black text-[#0a1a44] uppercase tracking-wider mb-1">
                    Heure de début <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={formData.heureDebut}
                    onChange={e => {
                      setFormData({ ...formData, heureDebut: e.target.value });
                      if (errors.heureDebut || errors.heureFin || errors.general) {
                        setErrors(prev => ({ ...prev, heureDebut: '', heureFin: '', general: '' }));
                      }
                    }}
                    className={`w-full py-2.5 px-3.5 text-sm rounded-xl border font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-[#02b3bb] ${
                      errors.heureDebut ? 'border-rose-400 bg-rose-50/50' : 'border-slate-300 bg-white'
                    }`}
                  />
                  {errors.heureDebut && <p className="text-[11px] text-rose-600 font-bold mt-1">{errors.heureDebut}</p>}
                </div>

                {/* Heure fin */}
                <div>
                  <label className="block text-xs font-black text-[#0a1a44] uppercase tracking-wider mb-1">
                    Heure de fin <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={formData.heureFin}
                    onChange={e => {
                      setFormData({ ...formData, heureFin: e.target.value });
                      if (errors.heureFin || errors.general) {
                        setErrors(prev => ({ ...prev, heureFin: '', general: '' }));
                      }
                    }}
                    className={`w-full py-2.5 px-3.5 text-sm rounded-xl border font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-[#02b3bb] ${
                      errors.heureFin ? 'border-rose-400 bg-rose-50/50' : 'border-slate-300 bg-white'
                    }`}
                  />
                  {errors.heureFin && <p className="text-[11px] text-rose-600 font-bold mt-1">{errors.heureFin}</p>}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] rounded-xl transition-all min-h-[40px] cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs sm:text-sm font-black text-white bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 active:scale-[0.98] rounded-xl shadow-md shadow-emerald-900/15 transition-all min-h-[40px] flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingSeance ? 'Enregistrer les modifications' : 'Enregistrer la séance'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
