import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { StatutPresence, TypeAbsence, Seance, AbsenceRecord, Classe, Beneficiaire, BilletRetard } from '../types';
import { isSeanceAccessible, filterFilieresForUser, filterClassesForUser } from '../utils/userScope';
import { InstitutionalBanner } from './InstitutionalBanner';
import {
  ClipboardCheck,
  Check,
  X,
  Printer,
  Save,
  Users,
  Calendar,
  Clock,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Ticket,
  AlertTriangle,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Download,
  Trash2,
  Eye,
  History
} from 'lucide-react';

interface AttendanceRow {
  beneficiaireId: string;
  statut: StatutPresence;
  typeAbsence?: TypeAbsence;
  dureeRetardMinutes?: number;
  motifLabel?: string;
  motifId?: string;
  justifie: boolean;
  convoqueAdmin: boolean;
  note?: string;
}

const MOTIF_OPTIONS = [
  'Maladie',
  'Autorisation',
  'Motif familial',
  'Rendez-vous médical',
  'Convocation administrative',
  'Infraction disciplinaire',
  'Transport rural',
  'Retard matinal',
  'Panne de transport',
  'Urgence familiale',
  'Autre'
];

const RETARD_MOTIFS = [
  'Transport rural',
  'Retard matinal',
  'Panne de transport',
  'Rendez-vous médical',
  'Urgence familiale',
  'Autre'
];

const RETARD_MINUTES_PRESETS = [5, 10, 15, 20, 30, 45, 60];

export const AbsencesSaisie: React.FC = () => {
  const { currentUser, isAnimateur, isAdmin, hasPermission } = useAuth();
  const {
    seances,
    beneficiaires,
    absences,
    filieres,
    classes,
    billetsRetard,
    deleteBilletRetard,
    saveSeanceAbsences,
    updateAbsenceRecord,
    openPrintModal,
    getFiliereById,
    getClasseById,
    getUserById,
    activeModule,
    setActiveModule,
    showToast,
    settings,
    t
  } = useApp();

  const isAnimateurOnly = isAnimateur && !isAdmin;

  const accessibleFilieres = useMemo(() => filterFilieresForUser(filieres, currentUser), [filieres, currentUser]);
  const accessibleClasses = useMemo(() => filterClassesForUser(classes, currentUser), [classes, currentUser]);

  // Active Tab: 'pointage' | 'retards' | 'validation'
  const [activeTab, setActiveTab] = useState<'pointage' | 'retards' | 'validation'>(() => {
    if (activeModule === 'validation') return 'validation';
    return 'pointage';
  });

  // Sync tab if activeModule changes externally
  useEffect(() => {
    if (activeModule === 'validation') {
      setActiveTab('validation');
    } else if (activeModule === 'absences') {
      setActiveTab('pointage');
    }
  }, [activeModule]);

  // ==========================================
  // 1. POINTAGE TAB STATE & FILTERS
  // ==========================================
  const [pointageFilterDate, setPointageFilterDate] = useState<string>('');
  const [pointageFilterClasse, setPointageFilterClasse] = useState<string>('all');
  const [pointageFilterFiliere, setPointageFilterFiliere] = useState<string>('all');
  const [pointageFilterAnimateur, setPointageFilterAnimateur] = useState<string>('all');
  const [pointageFilterStatut, setPointageFilterStatut] = useState<'all' | 'pending' | 'recorded'>('all');
  const [pointageSearch, setPointageSearch] = useState<string>('');

  // Modal Pointage State
  const [isPointageModalOpen, setIsPointageModalOpen] = useState(false);
  const [selectedSeanceToPoint, setSelectedSeanceToPoint] = useState<Seance | null>(null);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceRow>>({});

  // Filtered Sessions List: strictly filter by accessible scope if Animateur
  const filteredSeances = useMemo(() => {
    return seances
      .filter(s => {
        // Check scope access (Animateur only sees their assigned filières/classes or where they are the animator)
        if (!isSeanceAccessible(s, currentUser)) {
          return false;
        }

        // Animateur filter (for admins)
        if (!isAnimateurOnly && pointageFilterAnimateur !== 'all' && s.animateurId !== pointageFilterAnimateur) {
          return false;
        }

        // Date filter
        if (pointageFilterDate && s.date !== pointageFilterDate) {
          return false;
        }

        // Helper to get class IDs of session
        const sClassIds = s.classeIds && s.classeIds.length > 0 ? s.classeIds : (s.classeId ? [s.classeId] : []);

        // Classe filter
        if (pointageFilterClasse !== 'all' && !sClassIds.includes(pointageFilterClasse)) {
          return false;
        }

        // Filière filter
        if (pointageFilterFiliere !== 'all' && s.filiereId !== pointageFilterFiliere) {
          return false;
        }

        // Statut de pointage filter
        const hasRecords = absences.some(a => a.seanceId === s.id);
        if (pointageFilterStatut === 'recorded' && !hasRecords) return false;
        if (pointageFilterStatut === 'pending' && hasRecords) return false;

        // Search in intitule / salle / classes
        if (pointageSearch.trim()) {
          const q = pointageSearch.toLowerCase();
          const matchIntitule = s.intitule.toLowerCase().includes(q);
          const matchIntituleAr = (s.intituleAr || '').toLowerCase().includes(q);
          const matchSalle = (s.salle || '').toLowerCase().includes(q);
          const matchClass = sClassIds.some(cid => {
            const cl = getClasseById(cid);
            return (cl?.nomFr || '').toLowerCase().includes(q) || (cl?.code || '').toLowerCase().includes(q);
          });
          if (!matchIntitule && !matchIntituleAr && !matchSalle && !matchClass) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const dateComp = b.date.localeCompare(a.date);
        if (dateComp !== 0) return dateComp;
        return a.heureDebut.localeCompare(b.heureDebut);
      });
  }, [
    seances,
    absences,
    isAnimateurOnly,
    currentUser,
    pointageFilterAnimateur,
    pointageFilterDate,
    pointageFilterClasse,
    pointageFilterFiliere,
    pointageFilterStatut,
    pointageSearch,
    getClasseById
  ]);

  // Active Beneficiaires of the active classes for pointage modal
  const activeBeneficiairesForModal = useMemo(() => {
    if (!selectedSeanceToPoint) return [];
    const sClassIds = selectedSeanceToPoint.classeIds && selectedSeanceToPoint.classeIds.length > 0
      ? selectedSeanceToPoint.classeIds
      : (selectedSeanceToPoint.classeId ? [selectedSeanceToPoint.classeId] : []);
    return beneficiaires.filter(b => {
      return b.statut === 'Actif' && sClassIds.includes(b.classeId);
    });
  }, [selectedSeanceToPoint, beneficiaires]);

  // Open Pointage Modal for a session
  const handleOpenPointage = (seance: Seance) => {
    // Security check: Animateur can only open their own session
    if (isAnimateurOnly && currentUser && seance.animateurId !== currentUser.id) {
      showToast("Accès restreint aux séances qui vous sont assignées.", "warning");
      return;
    }

    setSelectedSeanceToPoint(seance);

    const sClassIds = seance.classeIds && seance.classeIds.length > 0
      ? seance.classeIds
      : (seance.classeId ? [seance.classeId] : []);

    // Active students of that pedagogical session's classes
    const classBenefs = beneficiaires.filter(
      b => b.statut === 'Actif' && sClassIds.includes(b.classeId)
    );

    const existingRecords = absences.filter(a => a.seanceId === seance.id);
    const initialMap: Record<string, AttendanceRow> = {};

    classBenefs.forEach(b => {
      const rec = existingRecords.find(r => r.beneficiaireId === b.id);
      if (rec) {
        let statut: StatutPresence = rec.statut;
        if (statut !== 'Present' && statut !== 'Absent' && statut !== 'Retard') {
          statut = rec.typeAbsence === 'Retard' ? 'Retard' : 'Absent';
        }
        initialMap[b.id] = {
          beneficiaireId: b.id,
          statut,
          typeAbsence: statut === 'Retard' ? 'Retard' : statut === 'Absent' ? 'Absent' : undefined,
          dureeRetardMinutes: rec.dureeRetardMinutes && rec.dureeRetardMinutes > 0 ? rec.dureeRetardMinutes : 15,
          motifLabel: rec.motifLabel || (statut === 'Retard' ? 'Transport rural' : 'Maladie'),
          motifId: rec.motifId,
          justifie: rec.justifie,
          convoqueAdmin: rec.convoqueAdmin || statut === 'Absent',
          note: rec.note || ''
        };
      } else {
        // Obligatoire : chaque bénéficiaire a un statut défini par défaut sur Présent
        initialMap[b.id] = {
          beneficiaireId: b.id,
          statut: 'Present',
          typeAbsence: undefined,
          dureeRetardMinutes: 15,
          motifLabel: 'Transport rural',
          justifie: false,
          convoqueAdmin: false,
          note: ''
        };
      }
    });

    setAttendanceMap(initialMap);
    setIsPointageModalOpen(true);
  };

  // Set attendance status (🟢 Present, 🔴 Absent, 🟠 Retard)
  const handleSetStatus = (beneficiaireId: string, statut: 'Present' | 'Absent' | 'Retard') => {
    setAttendanceMap(prev => ({
      ...prev,
      [beneficiaireId]: {
        ...prev[beneficiaireId],
        statut,
        typeAbsence: statut === 'Retard' ? 'Retard' : statut === 'Absent' ? 'Absent' : undefined,
        dureeRetardMinutes: prev[beneficiaireId]?.dureeRetardMinutes || 15,
        motifLabel: prev[beneficiaireId]?.motifLabel || (statut === 'Retard' ? 'Transport rural' : 'Maladie'),
        convoqueAdmin: statut === 'Absent'
      }
    }));
  };

  // Update retard duration and motif
  const handleUpdateRetard = (beneficiaireId: string, duree: number, motif: string) => {
    setAttendanceMap(prev => ({
      ...prev,
      [beneficiaireId]: {
        ...prev[beneficiaireId],
        dureeRetardMinutes: duree,
        motifLabel: motif
      }
    }));
  };

  // Quick mark all in modal
  const handleMarkAll = (statut: 'Present' | 'Absent' | 'Retard') => {
    const updated = { ...attendanceMap };
    activeBeneficiairesForModal.forEach(b => {
      if (updated[b.id]) {
        updated[b.id] = {
          ...updated[b.id],
          statut,
          typeAbsence: statut === 'Retard' ? 'Retard' : statut === 'Absent' ? 'Absent' : undefined,
          dureeRetardMinutes: updated[b.id]?.dureeRetardMinutes || 15,
          motifLabel: updated[b.id]?.motifLabel || (statut === 'Retard' ? 'Transport rural' : 'Maladie'),
          convoqueAdmin: statut === 'Absent'
        };
      }
    });
    setAttendanceMap(updated);
  };

  // SAVE POINTAGE ACTION:
  // 1. Sauvegarder le pointage
  // 2. Actualiser automatiquement les données
  // 3. Afficher : ✅ Pointage enregistré avec succès
  // 4. Fermer automatiquement la fenêtre Présence / Absence
  // 5. Rester dans le module actuel, sans retour au Dashboard
  // 6. Ne créer aucun doublon
  // 7. Générer automatiquement le Billet de Retard pour chaque retard pointé
  const handleSaveSaisie = () => {
    if (!selectedSeanceToPoint || !currentUser) return;

    // Verify that every student has a valid status
    const records = Object.values(attendanceMap);
    const unassigned = activeBeneficiairesForModal.filter(b => !attendanceMap[b.id]?.statut);
    if (unassigned.length > 0) {
      showToast("Le statut d'assiduité est obligatoire pour chaque apprenant.", "warning");
      return;
    }

    saveSeanceAbsences(selectedSeanceToPoint.id, records, currentUser.id);

    // Close the Pointage Modal immediately
    setIsPointageModalOpen(false);
    setSelectedSeanceToPoint(null);
  };

  // Live modal statistics
  const modalSessionStats = useMemo(() => {
    let presents = 0;
    let absents = 0;
    let retards = 0;
    Object.values(attendanceMap).forEach(row => {
      if (row.statut === 'Present') presents++;
      else if (row.statut === 'Absent') absents++;
      else if (row.statut === 'Retard') retards++;
    });
    return { presents, absents, retards, total: activeBeneficiairesForModal.length };
  }, [attendanceMap, activeBeneficiairesForModal]);

  // ==========================================
  // 2. VALIDATION DES ABSENCES TAB STATE & FILTERS (ADMIN ONLY)
  // ==========================================
  const [valSearch, setValSearch] = useState('');
  const [valFilterStatut, setValFilterStatut] = useState<'all' | 'En attente' | 'Validée' | 'Refusée'>('all');
  const [valFilterType, setValFilterType] = useState<'all' | 'Absent' | 'Infraction' | 'Retard'>('all');
  const [valFilterClasse, setValFilterClasse] = useState('all');
  const [valFilterFiliere, setValFilterFiliere] = useState('all');

  // Enriched list of absences / infractions for validation (admin only)
  const validationRecords = useMemo(() => {
    if (isAnimateurOnly) return [];

    return absences
      .filter(a => a.statut === 'Absent' || a.statut === 'Infraction' || a.statut === 'Retard')
      .map(rec => {
        const ben = beneficiaires.find(b => b.id === rec.beneficiaireId);
        const seance = seances.find(s => s.id === rec.seanceId);
        const filiere = ben ? getFiliereById(ben.filiereId) : (seance ? getFiliereById(seance.filiereId) : undefined);
        const classe = ben ? getClasseById(ben.classeId) : (seance ? getClasseById(seance.classeId) : undefined);
        const animateur = seance ? getUserById(seance.animateurId) : undefined;

        return {
          rec,
          ben,
          seance,
          filiere,
          classe,
          animateur,
          date: seance?.date || rec.dateSaisie || new Date().toISOString().split('T')[0],
          type: (rec.statut === 'Infraction' ? 'Infraction' : rec.statut === 'Retard' ? 'Retard' : 'Absent') as 'Absent' | 'Infraction' | 'Retard',
          motif: rec.motifLabel || (rec.statut === 'Infraction' ? 'Infraction disciplinaire' : 'Maladie'),
          statutValidation: rec.statutValidation || 'En attente',
          justifie: rec.justifie
        };
      })
      .filter(item => item.ben !== undefined)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [absences, beneficiaires, seances, getFiliereById, getClasseById, getUserById, isAnimateurOnly]);

  // Filtered validation records
  const filteredValidationRecords = useMemo(() => {
    return validationRecords.filter(item => {
      const ben = item.ben!;
      if (valSearch.trim()) {
        const q = valSearch.toLowerCase();
        const nomFr = `${ben.nomFr} ${ben.prenomFr}`.toLowerCase();
        const nomAr = `${ben.nomAr} ${ben.prenomAr}`.toLowerCase();
        const massar = (ben.codeMassar || '').toLowerCase();
        const insc = (ben.numeroInscription || '').toLowerCase();
        if (!nomFr.includes(q) && !nomAr.includes(q) && !massar.includes(q) && !insc.includes(q)) {
          return false;
        }
      }

      if (valFilterStatut !== 'all' && item.statutValidation !== valFilterStatut) return false;
      if (valFilterType !== 'all' && item.type !== valFilterType) return false;
      if (valFilterClasse !== 'all' && ben.classeId !== valFilterClasse) return false;
      if (valFilterFiliere !== 'all' && ben.filiereId !== valFilterFiliere) return false;

      return true;
    });
  }, [validationRecords, valSearch, valFilterStatut, valFilterType, valFilterClasse, valFilterFiliere]);

  // ==========================================
  // 3. HISTORIQUE DES RETARDS & BILLETS
  // ==========================================
  const [retardsSearch, setRetardsSearch] = useState('');
  const [retardsFilterDate, setRetardsFilterDate] = useState('');
  const [retardsFilterClasse, setRetardsFilterClasse] = useState('all');

  const filteredBilletsRetard = useMemo(() => {
    return billetsRetard.filter(b => {
      // If Animateur only, check if the session or class belongs to them
      if (isAnimateurOnly) {
        const sea = seances.find(s => s.id === b.seanceId);
        if (sea && !isSeanceAccessible(sea, currentUser)) {
          return false;
        }
      }

      if (retardsFilterDate && b.dateSeance !== retardsFilterDate) {
        return false;
      }

      if (retardsFilterClasse !== 'all') {
        const ben = beneficiaires.find(item => item.id === b.beneficiaireId);
        if (ben && ben.classeId !== retardsFilterClasse) {
          return false;
        }
      }

      if (retardsSearch.trim()) {
        const q = retardsSearch.toLowerCase();
        const nomFr = (b.nomPrenomFr || '').toLowerCase();
        const nomAr = (b.nomPrenomAr || '').toLowerCase();
        const massar = (b.codeMassar || '').toLowerCase();
        const filiere = (b.filiereNom || '').toLowerCase();
        const classe = (b.classeNom || '').toLowerCase();
        const motif = (b.motif || '').toLowerCase();

        if (
          !nomFr.includes(q) &&
          !nomAr.includes(q) &&
          !massar.includes(q) &&
          !filiere.includes(q) &&
          !classe.includes(q) &&
          !motif.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [billetsRetard, retardsSearch, retardsFilterDate, retardsFilterClasse, isAnimateurOnly, seances, beneficiaires, currentUser]);

  // Quick stats for validation
  const validationStats = useMemo(() => {
    const total = validationRecords.length;
    const enAttente = validationRecords.filter(r => r.statutValidation === 'En attente').length;
    const validees = validationRecords.filter(r => r.statutValidation === 'Validée').length;
    const refusees = validationRecords.filter(r => r.statutValidation === 'Refusée').length;
    return { total, enAttente, validees, refusees };
  }, [validationRecords]);

  // Handle Validate / Refuse / Reset Absence
  const handleValidateAbsence = (recId: string, newStatut: 'Validée' | 'Refusée' | 'En attente') => {
    if (isAnimateurOnly) {
      showToast("Action non autorisée pour le rôle animateur.", "warning");
      return;
    }
    updateAbsenceRecord(recId, {
      statutValidation: newStatut,
      justifie: newStatut === 'Validée'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Institutional Banner */}
      <InstitutionalBanner
        title={isAnimateurOnly ? "Saisie du Pointage par Séance" : "Gestion de l'Assiduité & Pointage"}
        subtitle={
          isAnimateurOnly
            ? `Pointage de vos séances assignées (Présent 🟢, Absent 🔴, Retard 🟠) • Année scolaire ${settings.anneeScolaireCourante || '2026-2027'}`
            : `Pointage en temps réel des séances, suivi des retards et validation administrative • Année scolaire ${settings.anneeScolaireCourante || '2026-2027'}`
        }
      />

      {/* Top Module Tabs Switcher */}
      <div className="bg-white rounded-3xl p-2 sm:p-2.5 border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Tab 1: Pointage */}
          <button
            type="button"
            onClick={() => setActiveTab('pointage')}
            className={`inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              activeTab === 'pointage'
                ? 'bg-gradient-to-r from-[#02b3bb] to-[#0891b2] text-white shadow-md shadow-cyan-900/15'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>1. Pointage des Séances</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === 'pointage' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {filteredSeances.length}
            </span>
          </button>

          {/* Tab 2: Historique des Retards */}
          <button
            type="button"
            onClick={() => setActiveTab('retards')}
            className={`inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              activeTab === 'retards'
                ? 'bg-gradient-to-r from-[#02b3bb] to-[#0891b2] text-white shadow-md shadow-cyan-900/15'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-500" />
            <span>2. Historique des Retards</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === 'retards' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-900'
            }`}>
              {billetsRetard.length}
            </span>
          </button>

          {/* Tab 3: Validation des Absences (Admin only) */}
          {!isAnimateurOnly && (
            <button
              type="button"
              onClick={() => setActiveTab('validation')}
              className={`inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
                activeTab === 'validation'
                  ? 'bg-gradient-to-r from-[#02b3bb] to-[#0891b2] text-white shadow-md shadow-cyan-900/15'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileCheck className="w-4 h-4" />
              <span>3. Validation des Absences</span>
              {validationStats.enAttente > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
                  {validationStats.enAttente} à valider
                </span>
              ) : (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  activeTab === 'validation' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {validationStats.total}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Global Shortcut for Tickets (Admin only) */}
        {!isAnimateurOnly && (
          <button
            type="button"
            onClick={() => setActiveModule('billets')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all cursor-pointer"
          >
            <Ticket className="w-3.5 h-3.5 text-[#02b3bb]" />
            <span>Billets d'entrée</span>
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: POINTAGE DES SÉANCES                                               */}
      {/* ========================================================================= */}
      {(activeTab === 'pointage' || isAnimateurOnly) && (
        <div className="space-y-5">
          {/* Filters Bar */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#02b3bb]" />
                <h3 className="text-xs font-black uppercase tracking-wider text-[#0a1a44]">
                  {isAnimateurOnly ? "Mes Séances à Pointer" : "Filtres & Sélection des séances"}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPointageFilterDate(new Date().toISOString().split('T')[0])}
                  className="px-3 py-1 text-[11px] font-black rounded-lg bg-cyan-50 text-[#02b3bb] border border-cyan-200 hover:bg-cyan-100 cursor-pointer"
                >
                  Aujourd'hui
                </button>
                {(pointageFilterDate || pointageFilterClasse !== 'all' || pointageFilterFiliere !== 'all' || pointageFilterAnimateur !== 'all' || pointageFilterStatut !== 'all' || pointageSearch) && (
                  <button
                    type="button"
                    onClick={() => {
                      setPointageFilterDate('');
                      setPointageFilterClasse('all');
                      setPointageFilterFiliere('all');
                      setPointageFilterAnimateur('all');
                      setPointageFilterStatut('all');
                      setPointageSearch('');
                    }}
                    className="px-3 py-1 text-[11px] font-bold rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer"
                  >
                    Réinitialiser
                  </button>
                )}
              </div>
            </div>

            <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 ${isAnimateurOnly ? 'lg:grid-cols-4' : 'lg:grid-cols-5'} gap-3`}>
              {/* Date Filter */}
              <div>
                <label className="block text-[10px] font-black text-[#0a1a44] uppercase mb-1">
                  Date de séance
                </label>
                <input
                  type="date"
                  value={pointageFilterDate}
                  onChange={e => setPointageFilterDate(e.target.value)}
                  className="w-full py-2 px-3 text-xs font-bold rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#02b3bb] bg-slate-50 text-[#0a1a44]"
                />
              </div>

              {/* Classe Filter */}
              <div>
                <label className="block text-[10px] font-black text-[#0a1a44] uppercase mb-1">
                  Classe pédagogique
                </label>
                <select
                  value={pointageFilterClasse}
                  onChange={e => setPointageFilterClasse(e.target.value)}
                  className="w-full py-2 px-3 text-xs font-bold rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#02b3bb] bg-slate-50 text-[#0a1a44] cursor-pointer"
                >
                  <option value="all">Toutes les classes</option>
                  {accessibleClasses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nomFr} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Filière Filter */}
              <div>
                <label className="block text-[10px] font-black text-[#0a1a44] uppercase mb-1">
                  Filière / Métier
                </label>
                <select
                  value={pointageFilterFiliere}
                  onChange={e => setPointageFilterFiliere(e.target.value)}
                  className="w-full py-2 px-3 text-xs font-bold rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#02b3bb] bg-slate-50 text-[#0a1a44] cursor-pointer"
                >
                  <option value="all">Toutes les filières</option>
                  {accessibleFilieres.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.nomFr} ({f.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Animateur Filter (Admin only) */}
              {!isAnimateurOnly && (
                <div>
                  <label className="block text-[10px] font-black text-[#0a1a44] uppercase mb-1">
                    Formateur / Animateur
                  </label>
                  <select
                    value={pointageFilterAnimateur}
                    onChange={e => setPointageFilterAnimateur(e.target.value)}
                    className="w-full py-2 px-3 text-xs font-bold rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#02b3bb] bg-slate-50 text-[#0a1a44] cursor-pointer"
                  >
                    <option value="all">Tous les formateurs</option>
                    {seances
                      .map(s => getUserById(s.animateurId))
                      .filter((u, i, arr) => u && arr.findIndex(x => x?.id === u.id) === i)
                      .map(u => u && (
                        <option key={u.id} value={u.id}>
                          {u.nomComplet}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Statut de pointage */}
              <div>
                <label className="block text-[10px] font-black text-[#0a1a44] uppercase mb-1">
                  Statut du pointage
                </label>
                <select
                  value={pointageFilterStatut}
                  onChange={e => setPointageFilterStatut(e.target.value as any)}
                  className="w-full py-2 px-3 text-xs font-bold rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#02b3bb] bg-slate-50 text-[#0a1a44] cursor-pointer"
                >
                  <option value="all">Toutes les séances</option>
                  <option value="pending">⏳ À pointer (En attente)</option>
                  <option value="recorded">✅ Déjà pointées</option>
                </select>
              </div>
            </div>
          </div>

          {/* Sessions Grid */}
          {filteredSeances.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center text-slate-400">
              <Calendar className="w-12 h-12 mx-auto text-[#02b3bb]/40 mb-2" />
              <p className="text-sm font-bold text-[#0a1a44]">Aucune séance ne correspond aux critères sélectionnés.</p>
              <p className="text-xs text-slate-500 mt-1">
                {isAnimateurOnly
                  ? "Vous n'avez aucune séance programmée pour ces critères."
                  : "Modifiez les filtres de date ou de classe ci-dessus pour afficher les séances."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {filteredSeances.map(seance => {
                const filiere = getFiliereById(seance.filiereId);
                const sClassIds = seance.classeIds && seance.classeIds.length > 0
                  ? seance.classeIds
                  : (seance.classeId ? [seance.classeId] : []);
                const sClasses = sClassIds.map(cid => getClasseById(cid)).filter(Boolean) as Classe[];
                const animateur = getUserById(seance.animateurId);
                const sessionAbsences = absences.filter(a => a.seanceId === seance.id);
                const isRecorded = sessionAbsences.length > 0;

                const presentsCount = sessionAbsences.filter(a => a.statut === 'Present').length;
                const absentsCount = sessionAbsences.filter(a => a.statut === 'Absent').length;
                const infractionsCount = sessionAbsences.filter(a => a.statut === 'Infraction').length;

                // Total active students across all classes of the session
                const totalInClass = beneficiaires.filter(
                  b => b.statut === 'Actif' && sClassIds.includes(b.classeId)
                ).length;

                return (
                  <div
                    key={seance.id}
                    className={`bg-white rounded-3xl border transition-all duration-200 p-5 flex flex-col justify-between group shadow-2xs hover:shadow-lg ${
                      isRecorded ? 'border-emerald-200/90 bg-emerald-50/10' : 'border-slate-200/90'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Top Bar: Date, Horaire & Statut Badge */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0a1a44] bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          {seance.date}
                        </span>

                        <span className="inline-flex items-center gap-1.5 text-xs font-black text-[#02b3bb] bg-cyan-50 px-3 py-1 rounded-full border border-cyan-200/70">
                          <Clock className="w-3.5 h-3.5 text-[#02b3bb]" />
                          {seance.heureDebut} - {seance.heureFin}
                        </span>
                      </div>

                      {/* Title */}
                      <div>
                        <h3 className="text-sm sm:text-base font-black text-[#0a1a44] line-clamp-2 leading-snug">
                          {seance.intitule}
                        </h3>
                        {seance.intituleAr && (
                          <p className="text-xs text-slate-500 line-clamp-1 font-sans mt-0.5" dir="rtl">
                            {seance.intituleAr}
                          </p>
                        )}
                      </div>

                      {/* Badges: Classes & Filière */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        {sClasses.map(c => (
                          <span
                            key={c.id}
                            className="font-black text-[#0a1a44] bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200"
                          >
                            🏫 {c.nomFr}
                          </span>
                        ))}
                        <span className="font-bold text-[#02b3bb] bg-cyan-50 px-2.5 py-0.5 rounded-full border border-cyan-200">
                          🛠️ {filiere?.nomFr || filiere?.code || 'Filière'}
                        </span>
                      </div>

                      {/* Animateur */}
                      <div className="text-xs text-slate-600 flex items-center justify-between pt-2 border-t border-slate-100">
                        <span className="truncate font-semibold">
                          👨‍🏫 {animateur?.nomComplet || 'Animateur assigné'}
                        </span>
                        <span className="text-[11px] font-bold text-slate-400">
                          {totalInClass} inscrit(s)
                        </span>
                      </div>

                      {/* Pointage summary status */}
                      <div className="pt-2 border-t border-slate-100">
                        {isRecorded ? (
                          <div className="flex flex-wrap items-center justify-between gap-1 text-xs font-bold">
                            <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full text-[10px] font-black border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                              Pointage effectué
                            </span>
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <span className="text-emerald-700 font-extrabold flex items-center gap-0.5">
                                🟢 {presentsCount} P
                              </span>
                              <span>•</span>
                              <span className="text-rose-700 font-extrabold flex items-center gap-0.5">
                                🔴 {absentsCount} A
                              </span>
                              {infractionsCount > 0 && (
                                <>
                                  <span>•</span>
                                  <span className="text-amber-600 font-extrabold flex items-center gap-0.5">
                                    🟠 {infractionsCount} Inf.
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full text-[10px] font-black border border-amber-300">
                            <AlertCircle className="w-3 h-3 text-amber-700" />
                            En attente de pointage
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions Footer */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenPointage(seance)}
                        className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all active:scale-95 cursor-pointer shadow-2xs flex-1 ${
                          isRecorded
                            ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                            : 'bg-gradient-to-r from-[#02b3bb] to-[#0891b2] hover:from-[#0099a8] hover:to-[#0e7490] text-white shadow-cyan-900/15'
                        }`}
                      >
                        <ClipboardCheck className="w-4 h-4" />
                        <span>{isRecorded ? 'Modifier le pointage' : 'Faire le pointage'}</span>
                      </button>

                      {hasPermission('imprimerRapports') && (
                        <button
                          type="button"
                          onClick={() => openPrintModal('seance', seance)}
                          className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all border border-slate-200"
                          title="Imprimer la feuille d'émargement"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: HISTORIQUE DES RETARDS & BILLETS DE RETARD                         */}
      {/* ========================================================================= */}
      {activeTab === 'retards' && (
        <div className="space-y-5">
          {/* Header Info & KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="block text-[10px] font-black uppercase text-slate-400">Total Billets de Retard</span>
              <span className="text-xl font-black text-[#0a1a44]">{billetsRetard.length}</span>
            </div>
            <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-200 shadow-2xs">
              <span className="block text-[10px] font-black uppercase text-amber-700">Durée cumulée des retards</span>
              <span className="text-xl font-black text-amber-900">
                {billetsRetard.reduce((acc, b) => acc + (b.dureeMinutes || 15), 0)} min
              </span>
            </div>
            <div className="bg-emerald-50/80 p-4 rounded-2xl border border-emerald-200 shadow-2xs">
              <span className="block text-[10px] font-black uppercase text-emerald-700">Envoyés dans l'Espace Apprenant</span>
              <span className="text-xl font-black text-emerald-900">{billetsRetard.length} / {billetsRetard.length} (100%)</span>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* Search */}
              <div className="sm:col-span-2 relative">
                <label className="block text-[10px] font-black text-[#0a1a44] uppercase mb-1">
                  Rechercher un billet de retard
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={retardsSearch}
                    onChange={e => setRetardsSearch(e.target.value)}
                    placeholder="Nom, prénom, Code Massar, motif, filière..."
                    className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 text-[#0a1a44] focus:ring-2 focus:ring-[#02b3bb]"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>

              {/* Date Filter */}
              <div>
                <label className="block text-[10px] font-black text-[#0a1a44] uppercase mb-1">
                  Date de séance
                </label>
                <input
                  type="date"
                  value={retardsFilterDate}
                  onChange={e => setRetardsFilterDate(e.target.value)}
                  className="w-full py-2 px-3 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-[#0a1a44]"
                />
              </div>

              {/* Classe Filter */}
              <div>
                <label className="block text-[10px] font-black text-[#0a1a44] uppercase mb-1">
                  Classe
                </label>
                <select
                  value={retardsFilterClasse}
                  onChange={e => setRetardsFilterClasse(e.target.value)}
                  className="w-full py-2 px-3 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-[#0a1a44] cursor-pointer"
                >
                  <option value="all">Toutes les classes</option>
                  {accessibleClasses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nomFr}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Retards Roster Table */}
          {filteredBilletsRetard.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center text-slate-400">
              <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 mb-2" />
              <p className="text-sm font-bold text-[#0a1a44]">Aucun billet de retard enregistré.</p>
              <p className="text-xs text-slate-500 mt-1">
                Les billets de retard sont automatiquement générés lors du pointage d'un retard en séance.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#0a1a44] text-white uppercase text-[10px] font-black tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Date & Séance</th>
                      <th className="py-3 px-4">Bénéficiaire (FR & AR)</th>
                      <th className="py-3 px-4">Code Massar</th>
                      <th className="py-3 px-4">Classe & Filière</th>
                      <th className="py-3 px-4 text-center">Durée</th>
                      <th className="py-3 px-4">Motif du retard</th>
                      <th className="py-3 px-4 text-center">Génération & Espace</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBilletsRetard.map(billet => {
                      return (
                        <tr key={billet.id} className="hover:bg-amber-50/40 transition-colors">
                          {/* Date & Séance */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-bold text-slate-900">{billet.dateSeance}</div>
                            <div className="text-[11px] text-slate-500 font-mono">{billet.heureSeance}</div>
                          </td>

                          {/* Bénéficiaire */}
                          <td className="py-3 px-4">
                            <div className="font-extrabold text-slate-900">
                              {billet.nomPrenomFr}
                            </div>
                            {billet.nomPrenomAr && (
                              <div className="text-[11px] text-cyan-800 font-sans font-bold" dir="rtl">
                                {billet.nomPrenomAr}
                              </div>
                            )}
                          </td>

                          {/* Code Massar */}
                          <td className="py-3 px-4 font-mono font-bold text-slate-700 whitespace-nowrap">
                            {billet.codeMassar}
                          </td>

                          {/* Classe & Filière */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-bold text-[#0a1a44]">{billet.classeNom}</div>
                            <div className="text-[11px] text-slate-500">{billet.filiereNom}</div>
                          </td>

                          {/* Durée du retard */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black bg-amber-100 text-amber-900 border border-amber-300">
                              <Clock className="w-3 h-3 text-amber-700" />
                              <span>{billet.dureeMinutes} min</span>
                            </span>
                          </td>

                          {/* Motif */}
                          <td className="py-3 px-4 text-slate-800 font-medium">
                            <div className="font-semibold">{billet.motif}</div>
                            {billet.motifAr && (
                              <div className="text-[11px] text-slate-500 italic">{billet.motifAr}</div>
                            )}
                          </td>

                          {/* Date de génération & Espace Bénéficiaire */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <div className="text-[11px] text-slate-500">
                              {billet.dateGeneration}
                            </div>
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 mt-0.5">
                              <Check className="w-3 h-3 text-emerald-600" />
                              📱 Transmis
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  openPrintModal('billet_retard', {
                                    billet
                                  })
                                }
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 shadow-2xs transition-all cursor-pointer"
                                title="Imprimer le Billet de Retard Officiel"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>Imprimer Billet</span>
                              </button>

                              {!isAnimateurOnly && (
                                <button
                                  type="button"
                                  onClick={() => deleteBilletRetard(billet.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Supprimer ce billet de retard"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: VALIDATION DES ABSENCES & INFRACTIONS (ADMIN ONLY)                 */}
      {/* ========================================================================= */}
      {!isAnimateurOnly && activeTab === 'validation' && (
        <div className="space-y-5">
          {/* Validation KPIs Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="block text-[10px] font-black uppercase text-slate-400">Total Signalements</span>
              <span className="text-xl font-black text-[#0a1a44]">{validationStats.total}</span>
            </div>
            <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-200 shadow-2xs">
              <span className="block text-[10px] font-black uppercase text-amber-700">En attente de validation</span>
              <span className="text-xl font-black text-amber-900">{validationStats.enAttente}</span>
            </div>
            <div className="bg-emerald-50/80 p-4 rounded-2xl border border-emerald-200 shadow-2xs">
              <span className="block text-[10px] font-black uppercase text-emerald-700">Absences Validées / Justifiées</span>
              <span className="text-xl font-black text-emerald-900">{validationStats.validees}</span>
            </div>
            <div className="bg-rose-50/80 p-4 rounded-2xl border border-rose-200 shadow-2xs">
              <span className="block text-[10px] font-black uppercase text-rose-700">Refusées / Non Justifiées</span>
              <span className="text-xl font-black text-rose-900">{validationStats.refusees}</span>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              {/* Search */}
              <div className="sm:col-span-2 relative">
                <label className="block text-[10px] font-black text-[#0a1a44] uppercase mb-1">
                  Rechercher un apprenant
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={valSearch}
                    onChange={e => setValSearch(e.target.value)}
                    placeholder="Nom, prénom, Code Massar..."
                    className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 text-[#0a1a44] focus:ring-2 focus:ring-[#02b3bb]"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>

              {/* Validation Status Filter */}
              <div>
                <label className="block text-[10px] font-black text-[#0a1a44] uppercase mb-1">
                  Statut de validation
                </label>
                <select
                  value={valFilterStatut}
                  onChange={e => setValFilterStatut(e.target.value as any)}
                  className="w-full py-2 px-3 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-[#0a1a44] cursor-pointer"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="En attente">⏳ En attente</option>
                  <option value="Validée">✅ Validée</option>
                  <option value="Refusée">❌ Refusée</option>
                </select>
              </div>

              {/* Type Filter */}
              <div>
                <label className="block text-[10px] font-black text-[#0a1a44] uppercase mb-1">
                  Type de signalement
                </label>
                <select
                  value={valFilterType}
                  onChange={e => setValFilterType(e.target.value as any)}
                  className="w-full py-2 px-3 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-[#0a1a44] cursor-pointer"
                >
                  <option value="all">Tous les types</option>
                  <option value="Absent">🔴 Absences</option>
                  <option value="Infraction">🟠 Infractions</option>
                  <option value="Retard">Retards</option>
                </select>
              </div>

              {/* Classe Filter */}
              <div>
                <label className="block text-[10px] font-black text-[#0a1a44] uppercase mb-1">
                  Classe
                </label>
                <select
                  value={valFilterClasse}
                  onChange={e => setValFilterClasse(e.target.value)}
                  className="w-full py-2 px-3 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-[#0a1a44] cursor-pointer"
                >
                  <option value="all">Toutes les classes</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nomFr}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Validation Table */}
          {filteredValidationRecords.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center text-slate-400">
              <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 mb-2" />
              <p className="text-sm font-bold text-[#0a1a44]">Aucun enregistrement d'absence ou infraction à traiter.</p>
              <p className="text-xs text-slate-500 mt-1">
                Tous les signalements enregistrés ont été traités ou aucun critère ne correspond.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#0a1a44] text-white uppercase text-[10px] font-black tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Date & Séance</th>
                      <th className="py-3 px-4">Bénéficiaire (FR & AR)</th>
                      <th className="py-3 px-4">Code Massar</th>
                      <th className="py-3 px-4">Classe & Filière</th>
                      <th className="py-3 px-4 text-center">Statut</th>
                      <th className="py-3 px-4">Motif / Signalement</th>
                      <th className="py-3 px-4 text-center">Statut validation</th>
                      <th className="py-3 px-4 text-center">Actions administratives</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredValidationRecords.map(item => {
                      const isPending = item.statutValidation === 'En attente';
                      const isValidated = item.statutValidation === 'Validée';
                      const isRefused = item.statutValidation === 'Refusée';

                      return (
                        <tr key={item.rec.id} className="hover:bg-slate-50 transition-colors">
                          {/* Date & Séance */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-bold text-slate-900">{item.date}</div>
                            <div className="text-[11px] text-slate-500">{item.seance?.intitule || 'Séance'}</div>
                          </td>

                          {/* Bénéficiaire */}
                          <td className="py-3 px-4">
                            <div className="font-extrabold text-slate-900">
                              {item.ben?.nomFr} {item.ben?.prenomFr}
                            </div>
                            <div className="text-[11px] text-cyan-800 font-sans font-bold" dir="rtl">
                              {item.ben?.nomAr} {item.ben?.prenomAr}
                            </div>
                          </td>

                          {/* Code Massar */}
                          <td className="py-3 px-4 font-mono font-bold text-slate-700 whitespace-nowrap">
                            {item.ben?.codeMassar}
                          </td>

                          {/* Classe & Filière */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-bold text-slate-800">{item.classe?.nomFr || '—'}</div>
                            <div className="text-[10px] text-cyan-700 font-bold">{item.filiere?.nomFr || '—'}</div>
                          </td>

                          {/* Type */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            {item.type === 'Absent' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                                🔴 Absent
                              </span>
                            )}
                            {item.type === 'Infraction' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                                🟠 Infraction
                              </span>
                            )}
                            {item.type === 'Retard' && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                                Retard
                              </span>
                            )}
                          </td>

                          {/* Motif */}
                          <td className="py-3 px-4 font-medium text-slate-700 whitespace-nowrap">
                            {item.motif}
                          </td>

                          {/* Statut validation */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            {isPending && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                                ⏳ En attente
                              </span>
                            )}
                            {isValidated && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                                ✅ Validée (Justifiée)
                              </span>
                            )}
                            {isRefused && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                                ❌ Refusée
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleValidateAbsence(item.rec.id, 'Validée')}
                                className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  isValidated
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                }`}
                                title="Valider comme absence justifiée"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleValidateAbsence(item.rec.id, 'Refusée')}
                                className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  isRefused
                                    ? 'bg-rose-600 text-white'
                                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                                }`}
                                title="Refuser le motif"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleValidateAbsence(item.rec.id, 'En attente')}
                                className="p-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 transition-all cursor-pointer"
                                title="Remettre en attente"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>

                              {/* Print Billet */}
                              <button
                                type="button"
                                onClick={() =>
                                  openPrintModal('billet', {
                                    beneficiaire: item.ben,
                                    seance: item.seance,
                                    record: item.rec,
                                    filiere: item.filiere,
                                    classe: item.classe,
                                    type: item.type,
                                    motif: item.motif,
                                    dateAbsence: item.date
                                  })
                                }
                                className="p-1.5 rounded-lg text-xs font-bold bg-cyan-50 text-[#02b3bb] hover:bg-cyan-100 border border-cyan-200 transition-all cursor-pointer"
                                title="Imprimer le billet d'entrée"
                              >
                                <Ticket className="w-3.5 h-3.5" />
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
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: FORMULAIRE DE POINTAGE PAR SÉANCE (PRÉSENCE / ABSENCE / INFRACTION) */}
      {/* ========================================================================= */}
      {isPointageModalOpen && selectedSeanceToPoint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 my-auto animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black text-[#0a1a44]">
                    Pointage de la séance : {selectedSeanceToPoint.intitule}
                  </h2>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black bg-cyan-50 text-[#02b3bb] border border-cyan-200">
                    {selectedSeanceToPoint.date} • {selectedSeanceToPoint.heureDebut}-{selectedSeanceToPoint.heureFin}
                  </span>
                </div>
                <div className="text-xs text-slate-500 font-medium mt-1 flex flex-wrap items-center gap-2">
                  <span>
                    Classes :{' '}
                    <strong className="text-[#0a1a44]">
                      {(selectedSeanceToPoint.classeIds && selectedSeanceToPoint.classeIds.length > 0
                        ? selectedSeanceToPoint.classeIds
                        : [selectedSeanceToPoint.classeId]
                      )
                        .map(cid => getClasseById(cid)?.nomFr)
                        .filter(Boolean)
                        .join(', ') || 'Classe'}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>
                    Formateur : <strong>{getUserById(selectedSeanceToPoint.animateurId)?.nomComplet}</strong>
                  </span>
                </div>
              </div>

              {/* Live Count Pills: Présents 🟢, Absents 🔴, Retards 🟠 */}
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <span>🟢 Présents :</span>
                  <span>{modalSessionStats.presents}</span>
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-200">
                  <span>🔴 Absents :</span>
                  <span>{modalSessionStats.absents}</span>
                </span>
                {modalSessionStats.retards > 0 && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300">
                    <span>🟠 Retards :</span>
                    <span>{modalSessionStats.retards}</span>
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setIsPointageModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 cursor-pointer ml-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="p-3 bg-slate-100/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 px-5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">
                  {modalSessionStats.total} apprenant(s) inscrit(s) dans cette séance • Statut obligatoire :
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleMarkAll('Present')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black text-emerald-900 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 transition-all active:scale-95 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-700" />
                  <span>🟢 Tous présents</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleMarkAll('Absent')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black text-rose-900 bg-rose-100 hover:bg-rose-200 border border-rose-300 transition-all active:scale-95 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5 text-rose-700" />
                  <span>🔴 Tous absents</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleMarkAll('Retard')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 transition-all active:scale-95 cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  <span>🟠 Tous retards</span>
                </button>
              </div>
            </div>

            {/* Attendance Roster Table */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {activeBeneficiairesForModal.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  Aucun bénéficiaire actif trouvé dans les classes sélectionnées.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs sm:text-sm border-collapse">
                    <thead className="bg-[#0a1a44] text-white uppercase text-[10px] font-black tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Bénéficiaire (FR & AR)</th>
                        <th className="py-3 px-4">Classe</th>
                        <th className="py-3 px-4">Code Massar</th>
                        <th className="py-3 px-4">Filière / Métier</th>
                        <th className="py-3 px-4 text-center min-w-[320px]">
                          Statut d'assiduité (Obligatoire)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeBeneficiairesForModal.map(b => {
                        const row = attendanceMap[b.id] || {
                          beneficiaireId: b.id,
                          statut: 'Present',
                          justifie: false,
                          convoqueAdmin: false
                        };
                        const filiereBen = getFiliereById(b.filiereId);
                        const classeBen = getClasseById(b.classeId);
                        const isPresent = row.statut === 'Present';
                        const isAbsent = row.statut === 'Absent';
                        const isRetard = row.statut === 'Retard';

                        return (
                          <React.Fragment key={b.id}>
                            <tr
                              className={`transition-colors ${
                                isAbsent
                                  ? 'bg-rose-50/70'
                                  : isRetard
                                  ? 'bg-amber-50/70'
                                  : isPresent
                                  ? 'bg-emerald-50/30'
                                  : 'hover:bg-slate-50/70'
                              }`}
                            >
                              {/* Beneficiaire names */}
                              <td className="py-3.5 px-4">
                                <div className="font-extrabold text-slate-900 text-xs sm:text-sm">
                                  {b.nomFr} {b.prenomFr}
                                </div>
                                <div className="text-[11px] text-cyan-800 font-sans font-bold" dir="rtl">
                                  {b.nomAr} {b.prenomAr}
                                </div>
                              </td>

                              {/* Classe Badge */}
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold text-[#0a1a44] bg-slate-100 border border-slate-300">
                                  {classeBen?.nomFr || '—'}
                                </span>
                              </td>

                              {/* Code Massar */}
                              <td className="py-3.5 px-4 font-mono font-bold text-slate-700 whitespace-nowrap text-xs">
                                {b.codeMassar}
                              </td>

                              {/* Filière */}
                              <td className="py-3.5 px-4 text-xs font-semibold text-slate-700 whitespace-nowrap">
                                {filiereBen?.nomFr || '—'}
                              </td>

                              {/* Statut d'assiduité buttons: 🟢 Présent, 🔴 Absent, 🟠 Retard */}
                              <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                <div className="inline-flex items-center p-1 rounded-2xl bg-slate-100 border border-slate-200 gap-1.5 shadow-2xs">
                                  {/* 🟢 Présent */}
                                  <button
                                    type="button"
                                    onClick={() => handleSetStatus(b.id, 'Present')}
                                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                      isPresent
                                        ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-400/40'
                                        : 'text-slate-600 hover:text-emerald-700 hover:bg-slate-200'
                                    }`}
                                  >
                                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                    <span>Présent</span>
                                  </button>

                                  {/* 🔴 Absent */}
                                  <button
                                    type="button"
                                    onClick={() => handleSetStatus(b.id, 'Absent')}
                                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                      isAbsent
                                        ? 'bg-rose-600 text-white shadow-xs ring-2 ring-rose-400/40'
                                        : 'text-slate-600 hover:text-rose-700 hover:bg-slate-200'
                                    }`}
                                  >
                                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                                    <span>Absent</span>
                                  </button>

                                  {/* 🟠 Retard */}
                                  <button
                                    type="button"
                                    onClick={() => handleSetStatus(b.id, 'Retard')}
                                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                      isRetard
                                        ? 'bg-amber-500 text-white shadow-xs ring-2 ring-amber-400/40'
                                        : 'text-slate-600 hover:text-amber-700 hover:bg-slate-200'
                                    }`}
                                  >
                                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                                    <span>Retard</span>
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* En cas de Retard 🟠 : Afficher obligatoirement Durée, Motif et Billet de Retard */}
                            {isRetard && (
                              <tr className="bg-amber-50/90 border-b-2 border-amber-200">
                                <td colSpan={5} className="p-3 sm:p-4">
                                  <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-amber-300 shadow-sm space-y-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-100 pb-2">
                                      <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                                        <span>🟠 Détails obligatoires du Retard — {b.nomFr} {b.prenomFr}</span>
                                      </span>
                                      <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200">
                                        🎫 Billet généré automatiquement à l'enregistrement
                                      </span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                      {/* ⏱️ Durée du retard */}
                                      <div>
                                        <label className="block text-[10px] font-black text-slate-700 uppercase mb-1 flex items-center gap-1">
                                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                                          <span>Durée du retard (minutes) *</span>
                                        </label>
                                        <div className="flex items-center gap-1.5">
                                          <select
                                            value={row.dureeRetardMinutes || 15}
                                            onChange={e =>
                                              handleUpdateRetard(
                                                b.id,
                                                parseInt(e.target.value, 10) || 15,
                                                row.motifLabel || 'Transport rural'
                                              )
                                            }
                                            className="w-full py-1.5 px-3 text-xs font-bold rounded-xl border border-amber-300 bg-amber-50/50 text-[#0a1a44] focus:ring-2 focus:ring-amber-500 cursor-pointer"
                                          >
                                            {RETARD_MINUTES_PRESETS.map(mins => (
                                              <option key={mins} value={mins}>
                                                ⏱️ {mins} minutes
                                              </option>
                                            ))}
                                          </select>
                                        </div>
                                      </div>

                                      {/* 📝 Motif du retard */}
                                      <div>
                                        <label className="block text-[10px] font-black text-slate-700 uppercase mb-1 flex items-center gap-1">
                                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                          <span>Motif du retard *</span>
                                        </label>
                                        <select
                                          value={row.motifLabel || 'Transport rural'}
                                          onChange={e =>
                                            handleUpdateRetard(
                                              b.id,
                                              row.dureeRetardMinutes || 15,
                                              e.target.value
                                            )
                                          }
                                          className="w-full py-1.5 px-3 text-xs font-bold rounded-xl border border-amber-300 bg-amber-50/50 text-[#0a1a44] focus:ring-2 focus:ring-amber-500 cursor-pointer"
                                        >
                                          {RETARD_MOTIFS.map(m => (
                                            <option key={m} value={m}>
                                              {m}
                                            </option>
                                          ))}
                                        </select>
                                      </div>

                                      {/* 🎫 Billet de retard preview / print */}
                                      <div className="flex flex-col justify-end">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const seanceObj = selectedSeanceToPoint;
                                            openPrintModal('billet_retard', {
                                              billet: {
                                                id: `BRT-PREVIEW-${b.id.slice(0, 4)}`,
                                                absenceId: `abs-${b.id}`,
                                                seanceId: seanceObj?.id || '',
                                                beneficiaireId: b.id,
                                                nomPrenomFr: `${b.nomFr} ${b.prenomFr}`,
                                                nomPrenomAr: `${b.nomAr || ''} ${b.prenomAr || ''}`.trim() || undefined,
                                                codeMassar: b.codeMassar,
                                                filiereNom: filiereBen?.nomFr || 'Formation Professionnelle',
                                                classeNom: classeBen?.nomFr || 'Classe',
                                                dateSeance: seanceObj?.date || new Date().toISOString().split('T')[0],
                                                heureSeance: seanceObj ? `${seanceObj.heureDebut} – ${seanceObj.heureFin}` : '09:00 – 11:00',
                                                dureeMinutes: row.dureeRetardMinutes || 15,
                                                motif: row.motifLabel || 'Transport rural',
                                                dateGeneration: `${new Date().toLocaleDateString('fr-FR')} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
                                                creeParUserId: currentUser?.id || '',
                                                creeParNom: currentUser?.nomComplet || 'Administration',
                                                statutValidation: 'Validée'
                                              }
                                            });
                                          }}
                                          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-black shadow-xs transition-all cursor-pointer"
                                        >
                                          <Ticket className="w-3.5 h-3.5" />
                                          <span>🎫 Prévisualiser le Billet de Retard</span>
                                        </button>
                                      </div>
                                    </div>

                                    {/* Explication synchronisation Espace Bénéficiaire */}
                                    <div className="text-[11px] text-amber-800 bg-amber-100/70 p-2 rounded-xl border border-amber-200 flex items-center gap-2">
                                      <span className="font-bold">📱 Espace Bénéficiaire :</span>
                                      <span>Le billet sera automatiquement transmis sur le compte de <strong>{b.nomFr} {b.prenomFr}</strong> dès enregistrement.</span>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer Bar */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsPointageModalOpen(false)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs cursor-pointer"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={handleSaveSaisie}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 rounded-2xl text-xs sm:text-sm font-black text-white bg-gradient-to-r from-[#02b3bb] to-[#0891b2] hover:from-[#0099a8] hover:to-[#0e7490] shadow-md shadow-cyan-900/15 active:scale-[0.98] transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Enregistrer le pointage ({modalSessionStats.total} élèves)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
