import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';

// Initialize PDF.js worker
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
} catch (e) {
  console.warn('PDF.js worker setup fallback:', e);
}

import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { storageService } from '../services/storage';
import {
  Beneficiaire,
  NiveauScolaire,
  Sexe,
  BeneficiaireStatus
} from '../types';
import {
  isBeneficiaireAccessible,
  filterFilieresForUser,
  filterClassesForUser
} from '../utils/userScope';
import {
  Users,
  UserPlus,
  Search,
  Printer,
  Edit2,
  Trash2,
  Eye,
  Upload,
  Download,
  FileSpreadsheet,
  FileText,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Phone,
  Calendar,
  School,
  Building2,
  UserCheck,
  UserX,
  Shield,
  Filter,
  Check,
  Info,
  List,
  LayoutGrid,
  User,
  Lock,
  Unlock,
  MessageCircle
} from 'lucide-react';
import moroccanSeal from '../assets/images/moroccan_school_seal_1790038897812.jpg';
import cmedLogo from '../assets/images/cmed_logo.jpeg';

/**
 * Normalise et formate un numéro de téléphone marocain pour un lien WhatsApp direct (wa.me)
 * Accepte: 06XXXXXXXX, 07XXXXXXXX, 05XXXXXXXX, +2126XXXXXXXX, 002126XXXXXXXX, etc.
 * Retourne le lien wa.me/212...
 */
export const getMoroccanWhatsAppUrl = (phone?: string, defaultMessage?: string): string => {
  if (!phone || !phone.trim()) return '';
  let digits = phone.replace(/[^0-9]/g, '');
  if (!digits) return '';

  if (digits.startsWith('00212')) {
    digits = digits.substring(2);
  } else if (digits.startsWith('212')) {
    // already 212...
  } else if (digits.startsWith('0')) {
    digits = '212' + digits.substring(1);
  } else if (digits.length === 9) {
    digits = '212' + digits;
  }

  const base = `https://wa.me/${digits}`;
  if (defaultMessage) {
    return `${base}?text=${encodeURIComponent(defaultMessage)}`;
  }
  return base;
};

/**
 * Vérifie si le numéro est un numéro marocain valide ou acceptable
 */
export const isAcceptableMoroccanPhone = (phone?: string): boolean => {
  if (!phone || !phone.trim()) return true; // facultatif
  const digits = phone.replace(/[^0-9]/g, '');
  return /^(0[5-7]\d{8}|[5-7]\d{8}|212[5-7]\d{8}|00212[5-7]\d{8})$/.test(digits) || (digits.length >= 9 && digits.length <= 13);
};

type SortField = 'numeroInscription' | 'nomFr' | 'prenomFr' | 'codeMassar' | 'sexe' | 'codeFiliere' | 'codeClasse' | 'dateNaissance' | 'statut';
type SortDirection = 'asc' | 'desc';

interface ImportSummary {
  importedCount: number;
  duplicateCount: number;
  errorCount: number;
  errors: Array<{ line: number; field: string; message: string }>;
}

export const Beneficiaires: React.FC = () => {
  const { currentUser, isAdmin, hasPermission } = useAuth();
  const {
    beneficiaires,
    filieres,
    classes,
    addBeneficiaire,
    updateBeneficiaire,
    deleteBeneficiaire,
    deleteBeneficiairesBulk,
    addBeneficiairesBulk,
    toggleBeneficiaireStatut,
    openPrintModal,
    getFiliereById,
    getClasseById,
    askConfirmation,
    showToast,
    reloadFromStorage,
    settings,
    isRtl
  } = useApp();

  // Permission checks
  const canManage = isAdmin || hasPermission('gestionBeneficiaires');

  // View mode (Liste vs Cartes) with persistence
  const [viewMode, setViewMode] = useState<'list' | 'cards'>(() => {
    try {
      const saved = localStorage.getItem('zirara_beneficiaires_view_mode');
      return saved === 'cards' ? 'cards' : 'list';
    } catch {
      return 'list';
    }
  });

  const handleSetViewMode = (mode: 'list' | 'cards') => {
    setViewMode(mode);
    try {
      localStorage.setItem('zirara_beneficiaires_view_mode', mode);
    } catch (e) {
      console.error(e);
    }
  };

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFiliere, setSelectedFiliere] = useState<string>('all');
  const [selectedClasse, setSelectedClasse] = useState<string>('all');
  const [selectedNiveau, setSelectedNiveau] = useState<string>('all');
  const [selectedSexe, setSelectedSexe] = useState<string>('all');
  const [selectedStatut, setSelectedStatut] = useState<string>('all');

  // Multi-Selection State
  const [selectedBeneficiaireIds, setSelectedBeneficiaireIds] = useState<string[]>([]);

  // Sort state (Default: Nom A → Z)
  const [sortField, setSortField] = useState<SortField>('nomFr');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingBeneficiaire, setEditingBeneficiaire] = useState<Beneficiaire | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [viewingBeneficiaire, setViewingBeneficiaire] = useState<Beneficiaire | null>(null);

  const [isExcelImportModalOpen, setIsExcelImportModalOpen] = useState(false);
  const [isPdfImportModalOpen, setIsPdfImportModalOpen] = useState(false);
  const [isPdfExportModalOpen, setIsPdfExportModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    codeMassar: '',
    nomFr: '',
    prenomFr: '',
    nomAr: '',
    prenomAr: '',
    sexe: 'M' as Sexe,
    dateNaissance: '',
    lieuNaissance: '',
    telephone: '',
    telephone2: '',
    adresse: '',
    niveau: 'Primaire' as NiveauScolaire,
    filiereId: '',
    classeId: '',
    statut: 'Actif' as BeneficiaireStatus,
    observation: ''
  });
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  // Import states & summaries
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [isProcessingImport, setIsProcessingImport] = useState(false);
  const fileInputExcelRef = useRef<HTMLInputElement>(null);
  const fileInputPdfRef = useRef<HTMLInputElement>(null);

  // PDF Export options inside custom PDF modal
  const [pdfScope, setPdfScope] = useState<'filtered' | 'all' | 'actifs' | 'inactifs'>('filtered');
  const [pdfGrouping, setPdfGrouping] = useState<'none' | 'classe' | 'filiere' | 'classe_filiere' | 'filiere_classe'>('none');

  // Accessible filieres & classes for current user
  const accessibleFilieres = useMemo(() => filterFilieresForUser(filieres, currentUser), [filieres, currentUser]);
  const accessibleClasses = useMemo(() => filterClassesForUser(classes, currentUser), [classes, currentUser]);

  // Filtered & Sorted beneficiaries
  const filteredAndSortedBeneficiaires = useMemo(() => {
    return beneficiaires
      .filter(b => {
        // Enforce user scope (Animateur only sees their assigned filières/classes)
        if (!isBeneficiaireAccessible(b, currentUser)) {
          return false;
        }

        // Search filter across: N° Inscription, Code Massar, Nom, Prénom, Nom AR, Prénom AR, Téléphone, Filière, Classe, Niveau, Statut
        if (searchTerm.trim()) {
          const query = searchTerm.toLowerCase().trim();
          const filiere = getFiliereById(b.filiereId);
          const classe = getClasseById(b.classeId);

          const matchesNum = b.numeroInscription?.toLowerCase().includes(query);
          const matchesCode = b.codeMassar?.toLowerCase().includes(query);
          const matchesNomFr = b.nomFr?.toLowerCase().includes(query);
          const matchesPrenomFr = b.prenomFr?.toLowerCase().includes(query);
          const matchesNomAr = b.nomAr?.includes(query);
          const matchesPrenomAr = b.prenomAr?.includes(query);
          const matchesTel = b.telephone?.includes(query) || b.telephone2?.includes(query);
          const matchesFiliere = filiere?.nomFr?.toLowerCase().includes(query) || filiere?.nomAr?.includes(query);
          const matchesClasse = classe?.nomFr?.toLowerCase().includes(query) || classe?.nomAr?.includes(query);
          const matchesNiveau = b.niveau?.toLowerCase().includes(query);
          const matchesStatut = b.statut?.toLowerCase().includes(query);

          if (
            !matchesNum &&
            !matchesCode &&
            !matchesNomFr &&
            !matchesPrenomFr &&
            !matchesNomAr &&
            !matchesPrenomAr &&
            !matchesTel &&
            !matchesFiliere &&
            !matchesClasse &&
            !matchesNiveau &&
            !matchesStatut
          ) {
            return false;
          }
        }

        // Filière filter
        if (selectedFiliere !== 'all' && b.filiereId !== selectedFiliere) {
          return false;
        }

        // Classe filter
        if (selectedClasse !== 'all' && b.classeId !== selectedClasse) {
          return false;
        }

        // Niveau filter
        if (selectedNiveau !== 'all' && b.niveau !== selectedNiveau) {
          return false;
        }

        // Sexe filter
        if (selectedSexe !== 'all' && b.sexe !== selectedSexe) {
          return false;
        }

        // Statut filter
        if (selectedStatut !== 'all' && b.statut !== selectedStatut) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        let comp = 0;
        if (sortField === 'numeroInscription') {
          comp = (a.numeroInscription || '').localeCompare(b.numeroInscription || '', undefined, { numeric: true });
        } else if (sortField === 'nomFr') {
          comp = (a.nomFr || '').localeCompare(b.nomFr || '', 'fr', { sensitivity: 'base' });
        } else if (sortField === 'prenomFr') {
          comp = (a.prenomFr || '').localeCompare(b.prenomFr || '', 'fr', { sensitivity: 'base' });
        } else if (sortField === 'codeMassar') {
          comp = (a.codeMassar || '').localeCompare(b.codeMassar || '');
        } else if (sortField === 'sexe') {
          comp = (a.sexe || '').localeCompare(b.sexe || '');
        } else if (sortField === 'codeFiliere') {
          const filA = getFiliereById(a.filiereId)?.code || getFiliereById(a.filiereId)?.nomFr || '';
          const filB = getFiliereById(b.filiereId)?.code || getFiliereById(b.filiereId)?.nomFr || '';
          comp = filA.localeCompare(filB, 'fr');
        } else if (sortField === 'codeClasse') {
          const clsA = getClasseById(a.classeId)?.code || getClasseById(a.classeId)?.nomFr || '';
          const clsB = getClasseById(b.classeId)?.code || getClasseById(b.classeId)?.nomFr || '';
          comp = clsA.localeCompare(clsB, 'fr');
        } else if (sortField === 'dateNaissance') {
          comp = (a.dateNaissance || '').localeCompare(b.dateNaissance || '');
        } else if (sortField === 'statut') {
          comp = (a.statut || '').localeCompare(b.statut || '');
        }

        return sortDirection === 'asc' ? comp : -comp;
      });
  }, [
    beneficiaires,
    searchTerm,
    selectedFiliere,
    selectedClasse,
    selectedNiveau,
    selectedSexe,
    selectedStatut,
    sortField,
    sortDirection,
    getFiliereById,
    getClasseById
  ]);

  // Handle Sort header toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedFiliere('all');
    setSelectedClasse('all');
    setSelectedNiveau('all');
    setSelectedSexe('all');
    setSelectedStatut('all');
  };

  // Open Create Form Modal
  const handleOpenCreateModal = () => {
    const defaultFiliere = accessibleFilieres[0]?.id || filieres[0]?.id || '';
    const defaultClassesForFiliere = accessibleClasses.filter(c => c.filiereId === defaultFiliere);
    const defaultClasse = defaultClassesForFiliere[0]?.id || accessibleClasses[0]?.id || classes[0]?.id || '';

    setFormData({
      codeMassar: '',
      nomFr: '',
      prenomFr: '',
      nomAr: '',
      prenomAr: '',
      sexe: 'M',
      dateNaissance: '2008-01-01',
      lieuNaissance: 'Zirara',
      telephone: '',
      telephone2: '',
      adresse: '',
      niveau: '1 Collège',
      filiereId: defaultFiliere,
      classeId: defaultClasse,
      statut: 'Actif',
      observation: ''
    });
    setFormErrors({});
    setEditingBeneficiaire(null);
    setIsFormModalOpen(true);
  };

  // Open Edit Form Modal
  const handleOpenEditModal = (b: Beneficiaire) => {
    setEditingBeneficiaire(b);
    setFormData({
      codeMassar: b.codeMassar || '',
      nomFr: b.nomFr || '',
      prenomFr: b.prenomFr || '',
      nomAr: b.nomAr || '',
      prenomAr: b.prenomAr || '',
      sexe: b.sexe || 'M',
      dateNaissance: b.dateNaissance || '',
      lieuNaissance: b.lieuNaissance || '',
      telephone: b.telephone || '',
      telephone2: b.telephone2 || '',
      adresse: b.adresse || '',
      niveau: b.niveau || '1 Collège',
      filiereId: b.filiereId || filieres[0]?.id || '',
      classeId: b.classeId || classes[0]?.id || '',
      statut: b.statut || 'Actif',
      observation: b.observation || ''
    });
    setFormErrors({});
    setIsFormModalOpen(true);
  };

  // Open Detail / View Modal
  const handleOpenDetailModal = (b: Beneficiaire) => {
    setViewingBeneficiaire(b);
    setIsDetailModalOpen(true);
  };

  // Validate Form inputs
  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!formData.codeMassar.trim()) {
      errors.codeMassar = 'Le code Massar est obligatoire.';
    } else {
      // Check duplicate Code Massar
      const massarNormalized = formData.codeMassar.trim().toUpperCase();
      const duplicate = beneficiaires.find(
        b => b.codeMassar.trim().toUpperCase() === massarNormalized && (!editingBeneficiaire || b.id !== editingBeneficiaire.id)
      );
      if (duplicate) {
        errors.codeMassar = `Ce code Massar est déjà attribué à ${duplicate.nomFr} ${duplicate.prenomFr}.`;
      }
    }

    if (!formData.nomFr.trim()) {
      errors.nomFr = 'Le nom de famille est obligatoire.';
    }

    if (!formData.prenomFr.trim()) {
      errors.prenomFr = 'Le prénom est obligatoire.';
    }

    if (!formData.filiereId) {
      errors.filiereId = 'Veuillez sélectionner une filière.';
    }

    if (!formData.classeId) {
      errors.classeId = 'Veuillez sélectionner une classe.';
    }

    // Validation Téléphone 2 / WhatsApp (doit accepter un numéro marocain valide si renseigné)
    if (formData.telephone2.trim() && !isAcceptableMoroccanPhone(formData.telephone2.trim())) {
      errors.telephone2 = 'Veuillez saisir un numéro marocain valide (ex: 06XXXXXXXX ou 07XXXXXXXX).';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Form (Ajout ou Modification)
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (editingBeneficiaire) {
      // Update existing
      const updated: Beneficiaire = {
        ...editingBeneficiaire,
        codeMassar: formData.codeMassar.trim().toUpperCase(),
        nomFr: formData.nomFr.trim().toUpperCase(),
        prenomFr: formData.prenomFr.trim(),
        nomAr: formData.nomAr.trim(),
        prenomAr: formData.prenomAr.trim(),
        sexe: formData.sexe,
        dateNaissance: formData.dateNaissance,
        lieuNaissance: formData.lieuNaissance.trim(),
        telephone: formData.telephone.trim(),
        telephone2: formData.telephone2.trim() || undefined,
        adresse: formData.adresse.trim(),
        niveau: formData.niveau,
        filiereId: formData.filiereId,
        classeId: formData.classeId,
        statut: formData.statut,
        observation: formData.observation.trim()
      };
      updateBeneficiaire(updated);
      showToast('✅ Modification réussie', 'success');
    } else {
      // Create new
      const nouveau: Omit<Beneficiaire, 'id'> = {
        codeMassar: formData.codeMassar.trim().toUpperCase(),
        nomFr: formData.nomFr.trim().toUpperCase(),
        prenomFr: formData.prenomFr.trim(),
        nomAr: formData.nomAr.trim(),
        prenomAr: formData.prenomAr.trim(),
        sexe: formData.sexe,
        dateNaissance: formData.dateNaissance,
        lieuNaissance: formData.lieuNaissance.trim(),
        telephone: formData.telephone.trim(),
        telephone2: formData.telephone2.trim() || undefined,
        adresse: formData.adresse.trim(),
        niveau: formData.niveau,
        filiereId: formData.filiereId,
        classeId: formData.classeId,
        statut: formData.statut,
        observation: formData.observation.trim(),
        dateInscription: new Date().toISOString().split('T')[0]
      };
      addBeneficiaire(nouveau);
      showToast('✅ Ajout réussi', 'success');
    }

    setIsFormModalOpen(false);
  };

  // Toggle status with explicit confirmation
  const handleToggleStatut = (b: Beneficiaire) => {
    const nextStatut = b.statut === 'Actif' ? 'Inactif' : 'Actif';
    askConfirmation({
      title: 'Changer le statut du bénéficiaire',
      message: `Voulez-vous vraiment changer le statut de ${b.nomFr} ${b.prenomFr} de "${b.statut}" à "${nextStatut}" ? ${
        nextStatut === 'Inactif' ? 'Le bénéficiaire restera archivé mais sera exclu de la saisie quotidienne des absences.' : 'Le bénéficiaire redeviendra actif pour les présences.'
      }`,
      confirmLabel: `Passer à ${nextStatut}`,
      variant: nextStatut === 'Inactif' ? 'warning' : 'primary',
      onConfirm: () => {
        toggleBeneficiaireStatut(b.id);
      }
    });
  };

  // Delete Beneficiary with strict confirmation
  const handleDeleteBeneficiaire = (b: Beneficiaire) => {
    if (!canManage) {
      showToast("Vous n'avez pas l'autorisation de supprimer ce bénéficiaire.", 'error');
      return;
    }

    askConfirmation({
      title: 'Confirmation de suppression',
      message: `Êtes-vous sûr de vouloir supprimer définitivement ${b.nomFr} ${b.prenomFr} (Code: ${b.codeMassar}) ? Note : Pour préserver l'historique de présence, il est plutôt recommandé de définir son statut sur "Inactif".`,
      confirmLabel: 'Supprimer définitivement',
      cancelText: 'Annuler',
      variant: 'danger',
      onConfirm: () => {
        deleteBeneficiaire(b.id);
        setSelectedBeneficiaireIds(prev => prev.filter(id => id !== b.id));
      }
    });
  };

  // -------------------------------------------------------------
  // MULTI-SELECTION & SUPPRESSION GROUPÉE
  // -------------------------------------------------------------
  const handleToggleSelect = (id: string) => {
    setSelectedBeneficiaireIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllVisible = () => {
    const visibleIds = filteredAndSortedBeneficiaires.map(b => b.id);
    if (visibleIds.length === 0) return;
    const allSelected = visibleIds.every(id => selectedBeneficiaireIds.includes(id));
    if (allSelected) {
      setSelectedBeneficiaireIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      const merged = new Set([...selectedBeneficiaireIds, ...visibleIds]);
      setSelectedBeneficiaireIds(Array.from(merged));
    }
  };

  const handleDeleteSelected = () => {
    if (!canManage) {
      showToast("Vous n'avez pas l'autorisation de supprimer des bénéficiaires.", 'error');
      return;
    }

    if (selectedBeneficiaireIds.length === 0) {
      showToast("Veuillez sélectionner au moins un bénéficiaire à supprimer.", 'warning');
      return;
    }

    const count = selectedBeneficiaireIds.length;
    const idsToDelete = [...selectedBeneficiaireIds];

    askConfirmation({
      title: `Confirmation de suppression groupée (${count} sélectionné${count > 1 ? 's' : ''})`,
      message: `Êtes-vous sûr de vouloir supprimer définitivement les ${count} bénéficiaire${count > 1 ? 's' : ''} sélectionné${count > 1 ? 's' : ''} ? Cette action est irréversible et supprimera automatiquement en cascade l'ensemble de leurs fiches d'absences et convocations orphelines associées.`,
      confirmLabel: `Supprimer la sélection (${count})`,
      cancelText: 'Annuler',
      variant: 'danger',
      onConfirm: () => {
        // Vidage immédiat de la liste des identifiants sélectionnés (selectedBeneficiaireIds: []) dès la confirmation
        setSelectedBeneficiaireIds([]);
        // Suppression atomique groupée dans le stockage persistant (localStorage) et dans l'état avec cascade
        deleteBeneficiairesBulk(idsToDelete);
      }
    });
  };

  // -------------------------------------------------------------
  // EXPORT EXCEL
  // -------------------------------------------------------------
  const handleExportExcel = () => {
    const dataToExport = filteredAndSortedBeneficiaires.map(b => {
      const filiere = getFiliereById(b.filiereId);
      const classe = getClasseById(b.classeId);
      return {
        'N° Inscription': b.numeroInscription || '',
        'Code Massar': b.codeMassar || '',
        'Nom': b.nomFr || '',
        'Prénom': b.prenomFr || '',
        'Nom AR': b.nomAr || '',
        'Prénom AR': b.prenomAr || '',
        'Sexe': b.sexe || '',
        'Date naissance': b.dateNaissance || '',
        'Téléphone 1 (Principal)': b.telephone || '',
        'Téléphone 2 / WhatsApp': b.telephone2 || '',
        'Filière': filiere?.nomFr || '',
        'Classe': classe?.nomFr || '',
        'Niveau': b.niveau || '',
        'Statut': b.statut || '',
        'Observation': b.observation || ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Bénéficiaires');

    const fileName = `Beneficiaires_Zirara_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    showToast(`✅ Export Excel réussi (${dataToExport.length} bénéficiaires exportés)`, 'success');
  };

  // -------------------------------------------------------------
  // TÉLÉCHARGER LE MODÈLE EXCEL
  // -------------------------------------------------------------
  const handleDownloadExcelTemplate = () => {
    const sampleRows = [
      {
        'N° Inscription': '001/26',
        'Code Massar': 'M130000001',
        'Nom': 'BENANI',
        'Prénom': 'Mehdi',
        'Nom AR': 'بناني',
        'Prénom AR': 'مهدي',
        'Sexe': 'M',
        'Date naissance': '2008-04-15',
        'Téléphone 1 (Principal)': '0612345678',
        'Téléphone 2 / WhatsApp': '0661998877',
        'Filière / Métier': filieres[0]?.nomFr || 'Informatique & Bureautique',
        'Classe pédagogique': classes[0]?.nomFr || 'Classe A',
        'Niveau': '2 Collège',
        'Statut': 'Actif',
        'Observation': 'Inscription rentrée 2026-2027'
      },
      {
        'N° Inscription': '002/26',
        'Code Massar': 'M130000002',
        'Nom': 'EL AMRANI',
        'Prénom': 'Fatima',
        'Nom AR': 'العمراني',
        'Prénom AR': 'فاطمة',
        'Sexe': 'F',
        'Date naissance': '2007-09-21',
        'Téléphone 1 (Principal)': '0698765432',
        'Téléphone 2 / WhatsApp': '0701234567',
        'Filière / Métier': filieres[1]?.nomFr || filieres[0]?.nomFr || 'Électricité de Bâtiment',
        'Classe pédagogique': classes[0]?.nomFr || 'Classe A',
        'Niveau': '3 Collège',
        'Statut': 'Actif',
        'Observation': 'Même classe pédagogique, filière différente'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Modele_Beneficiaires');

    XLSX.writeFile(workbook, 'modele_import_beneficiaires_zirara.xlsx');
    showToast('📥 Modèle Excel téléchargé avec succès.', 'success');
  };

  // -------------------------------------------------------------
  // IMPORT EXCEL (Reads ALL non-empty lines, detailed error reporting)
  // -------------------------------------------------------------
  const handleExcelFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingImport(true);
    const reader = new FileReader();

    reader.onload = evt => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json<any>(worksheet, { defval: '' });

        if (!rawData || rawData.length === 0) {
          showToast('Le fichier sélectionné est vide.', 'error');
          setIsProcessingImport(false);
          return;
        }

        let importedCount = 0;
        let duplicateCount = 0;
        let errorCount = 0;
        const errorsList: Array<{ line: number; field: string; message: string }> = [];

        // Build quick lookup maps
        const existingMassarMap = new Map<string, Beneficiaire>();
        beneficiaires.forEach(b => {
          if (b.codeMassar) {
            existingMassarMap.set(b.codeMassar.trim().toUpperCase(), b);
          }
        });

        const newBeneficiairesToAdd: Beneficiaire[] = [];
        const fileSeenMassar = new Set<string>();

        // Iterate through ALL rows (1-indexed based on Excel row = index + 2)
        rawData.forEach((row, idx) => {
          const lineNumber = idx + 2;

          // Normalize row keys (case-insensitive & accent-free)
          const keys = Object.keys(row);
          const getVal = (possibleKeys: string[]): string => {
            for (const pk of possibleKeys) {
              const matched = keys.find(k => k.trim().toLowerCase() === pk.toLowerCase());
              if (matched && row[matched] !== undefined && row[matched] !== null) {
                return String(row[matched]).trim();
              }
            }
            return '';
          };

          const rawMassar = getVal(['Code Massar', 'CodeMassar', 'Massar', 'CNE', 'code_massar']);
          const rawNom = getVal(['Nom', 'Nom FR', 'nom_fr', 'NomFr']);
          const rawPrenom = getVal(['Prénom', 'Prenom', 'Prénom FR', 'prenom_fr', 'PrenomFr']);
          const rawNomAr = getVal(['Nom AR', 'nom_ar', 'NomAr', 'النسب']);
          const rawPrenomAr = getVal(['Prénom AR', 'prenom_ar', 'PrenomAr', 'الاسم']);
          const rawSexe = getVal(['Sexe', 'Genre', 'sexe', 'الجنس']).toUpperCase();
          const rawDateNais = getVal(['Date naissance', 'Date de naissance', 'DateNaissance', 'date_naissance', 'تاريخ الازدياد']);
          const rawNumInscription = getVal(['N° Inscription', 'No Inscription', 'Numero Inscription', 'numeroInscription', 'رقم التسجيل']);
          const rawTel = getVal(['Téléphone 1 (Principal)', 'Téléphone 1', 'Telephone 1', 'Téléphone', 'Telephone', 'Tel', 'GSM', 'telephone', 'الهاتف']);
          const rawTel2 = getVal(['Téléphone 2 / WhatsApp', 'Téléphone 2', 'Telephone 2', 'WhatsApp', 'Tel 2', 'GSM 2', 'telephone2', 'telephone_whatsapp', 'واتساب']);
          const rawFiliere = getVal(['Filière / Métier', 'Filiere / Metier', 'Filière / Métier d’apprentissage', 'Filière', 'Filiere', 'filiere', 'Métier', 'Metier', 'الشعبة', 'المهنة', 'التخصص']);
          const rawClasse = getVal(['Classe pédagogique', 'Classe pedagogique', 'Classe', 'classe', 'القسم', 'الفصل التربوي', 'الفوج']);
          const rawNiveau = getVal(['Niveau', 'Niveau scolaire', 'niveau', 'المستوى']);
          const rawStatut = getVal(['Statut', 'statut', 'الحالة']);
          const rawObs = getVal(['Observation', 'Remarque', 'observation', 'ملاحظات']);

          // Skip completely empty lines
          if (!rawMassar && !rawNom && !rawPrenom && !rawTel) {
            return;
          }

          // Validation 1: Code Massar must not be empty
          if (!rawMassar) {
            errorCount++;
            errorsList.push({
              line: lineNumber,
              field: 'Code Massar',
              message: 'Code Massar absent ou vide.'
            });
            return;
          }

          const massarNormalized = rawMassar.toUpperCase();

          // Validation 2: Nom required
          if (!rawNom) {
            errorCount++;
            errorsList.push({
              line: lineNumber,
              field: 'Nom',
              message: 'Le nom de famille est obligatoire.'
            });
            return;
          }

          // Validation 3: Prénom required
          if (!rawPrenom) {
            errorCount++;
            errorsList.push({
              line: lineNumber,
              field: 'Prénom',
              message: 'Le prénom est obligatoire.'
            });
            return;
          }

          // Check duplicate in file
          if (fileSeenMassar.has(massarNormalized)) {
            duplicateCount++;
            errorsList.push({
              line: lineNumber,
              field: 'Code Massar',
              message: `Doublon détecté dans le fichier Excel (Code: ${massarNormalized}). Ligne ignorée.`
            });
            return;
          }
          fileSeenMassar.add(massarNormalized);

          // Check duplicate in database
          if (existingMassarMap.has(massarNormalized)) {
            duplicateCount++;
            errorsList.push({
              line: lineNumber,
              field: 'Code Massar',
              message: `Le bénéficiaire avec le Code Massar ${massarNormalized} existe déjà dans la base (${existingMassarMap.get(massarNormalized)?.nomFr} ${existingMassarMap.get(massarNormalized)?.prenomFr}).`
            });
            return;
          }

          // Sexe resolution
          let resolvedSexe: Sexe = 'M';
          if (rawSexe === 'F' || rawSexe === 'FEMININ' || rawSexe === 'FEMELLE' || rawSexe.includes('أنثى')) {
            resolvedSexe = 'F';
          }

          // Filière / Métier resolution (Independent)
          let matchedFiliere = filieres.find(
            f =>
              f.nomFr.toLowerCase() === rawFiliere.toLowerCase() ||
              f.code.toLowerCase() === rawFiliere.toLowerCase() ||
              (f.nomAr && f.nomAr.includes(rawFiliere))
          );
          if (!matchedFiliere) matchedFiliere = filieres[0];

          // Classe pédagogique resolution (Independent — Never derived from filière)
          let matchedClasse = classes.find(
            c =>
              c.nomFr.toLowerCase() === rawClasse.toLowerCase() ||
              c.code.toLowerCase() === rawClasse.toLowerCase() ||
              (c.nomAr && c.nomAr.includes(rawClasse))
          );
          if (!matchedClasse) {
            matchedClasse = classes[0];
          }

          // Niveau resolution
          let resolvedNiveau: NiveauScolaire = '1 Collège';
          const nivClean = rawNiveau.toLowerCase();
          if (nivClean.includes('primaire') || nivClean.includes('ابتدائي')) resolvedNiveau = 'Primaire';
          else if (nivClean.includes('2') || nivClean.includes('ثانية')) resolvedNiveau = '2 Collège';
          else if (nivClean.includes('3') || nivClean.includes('ثالثة')) resolvedNiveau = '3 Collège';
          else if (nivClean.includes('autre') || nivClean.includes('أخرى')) resolvedNiveau = 'Autre';

          // Statut resolution
          const resolvedStatut: BeneficiaireStatus = rawStatut.toLowerCase().includes('inactif') ? 'Inactif' : 'Actif';

          // Date format normalize if excel serialized number
          let finalDateNaissance = rawDateNais;
          if (typeof rawDateNais === 'number' || (!isNaN(Number(rawDateNais)) && Number(rawDateNais) > 20000)) {
            const dateObj = XLSX.SSF.parse_date_code(Number(rawDateNais));
            if (dateObj) {
              const m = String(dateObj.m).padStart(2, '0');
              const d = String(dateObj.d).padStart(2, '0');
              finalDateNaissance = `${dateObj.y}-${m}-${d}`;
            }
          }

          const assignedNumInscription =
            rawNumInscription && /^\d{3}\/\d{2}$/.test(rawNumInscription)
              ? rawNumInscription
              : storageService.getNextNumeroInscription([...beneficiaires, ...newBeneficiairesToAdd]);

          const newBen: Beneficiaire = {
            id: `ben-imp-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
            numeroInscription: assignedNumInscription,
            codeMassar: massarNormalized,
            nomFr: rawNom.toUpperCase(),
            prenomFr: rawPrenom,
            nomAr: rawNomAr || '',
            prenomAr: rawPrenomAr || '',
            sexe: resolvedSexe,
            dateNaissance: finalDateNaissance || '2008-01-01',
            lieuNaissance: 'Zirara',
            telephone: rawTel || '',
            telephone2: rawTel2 || undefined,
            adresse: 'Zirara',
            niveau: resolvedNiveau,
            filiereId: matchedFiliere?.id || filieres[0]?.id || '',
            classeId: matchedClasse?.id || classes[0]?.id || '',
            statut: resolvedStatut,
            observation: rawObs || '',
            dateInscription: new Date().toISOString().split('T')[0]
          };

          newBeneficiairesToAdd.push(newBen);
          importedCount++;
        });

        // Save imported records to database without removing existing ones
        if (newBeneficiairesToAdd.length > 0) {
          addBeneficiairesBulk(newBeneficiairesToAdd);
        }

        setImportSummary({
          importedCount,
          duplicateCount,
          errorCount,
          errors: errorsList
        });

        setIsProcessingImport(false);
        if (fileInputExcelRef.current) fileInputExcelRef.current.value = '';
      } catch (err) {
        console.error('Erreur lecture Excel:', err);
        showToast("Erreur lors de la lecture du fichier Excel. Vérifiez l'extension et le format.", 'error');
        setIsProcessingImport(false);
      }
    };

    reader.readAsBinaryString(file);
  };

  // -------------------------------------------------------------
  // IMPORT PDF (Text & Massar extraction from official PDF lists)
  // -------------------------------------------------------------
  const handlePdfFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingImport(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      let extractedFullText = '';
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        extractedFullText += `\n${pageText}`;
      }

      // Parse lines
      const lines = extractedFullText.split(/\r?\n/).filter(l => l.trim().length > 0);

      // Massar regex matcher (Letter + 9 or 10 digits/letters)
      const massarPattern = /\b([A-Za-z]\d{8,10})\b/g;

      let importedCount = 0;
      let duplicateCount = 0;
      let errorCount = 0;
      const errorsList: Array<{ line: number; field: string; message: string }> = [];

      const existingMassarMap = new Map<string, Beneficiaire>();
      beneficiaires.forEach(b => {
        if (b.codeMassar) existingMassarMap.set(b.codeMassar.trim().toUpperCase(), b);
      });

      const newPdfBeneficiaires: Beneficiaire[] = [];
      const seenCodes = new Set<string>();

      // Look through text tokens or lines for Massar codes
      lines.forEach((line, idx) => {
        let match;
        while ((match = massarPattern.exec(line)) !== null) {
          const codeFound = match[1].toUpperCase();
          if (seenCodes.has(codeFound)) {
            duplicateCount++;
            continue;
          }
          seenCodes.add(codeFound);

          if (existingMassarMap.has(codeFound)) {
            duplicateCount++;
            errorsList.push({
              line: idx + 1,
              field: 'Code Massar',
              message: `Code Massar ${codeFound} déjà existant dans le centre.`
            });
            continue;
          }

          // Try to extract nearby names around the match
          const cleanTokens = line
            .replace(codeFound, '')
            .split(/[\s,;|]+/)
            .filter(t => t.length > 1 && !/\d/.test(t));

          const nom = cleanTokens[0] ? cleanTokens[0].toUpperCase() : `CANDIDAT`;
          const prenom = cleanTokens[1] ? cleanTokens[1] : `${importedCount + 1}`;

          const newBen: Beneficiaire = {
            id: `ben-pdf-${Date.now()}-${importedCount}-${Math.random().toString(36).slice(2, 6)}`,
            numeroInscription: storageService.getNextNumeroInscription([...beneficiaires, ...newPdfBeneficiaires]),
            codeMassar: codeFound,
            nomFr: nom,
            prenomFr: prenom,
            nomAr: '',
            prenomAr: '',
            sexe: 'M',
            dateNaissance: '2008-01-01',
            lieuNaissance: 'Zirara',
            telephone: '',
            adresse: 'Zirara',
            niveau: '1 Collège',
            filiereId: filieres[0]?.id || '',
            classeId: classes[0]?.id || '',
            statut: 'Actif',
            observation: 'Importé depuis fichier PDF',
            dateInscription: new Date().toISOString().split('T')[0]
          };

          newPdfBeneficiaires.push(newBen);
          importedCount++;
        }
      });

      if (newPdfBeneficiaires.length > 0) {
        const merged = [...beneficiaires, ...newPdfBeneficiaires];
        storageService.setBeneficiaires(merged);
        reloadFromStorage();
        showToast('✅ Importation réussie', 'success');
      }

      setImportSummary({
        importedCount,
        duplicateCount,
        errorCount,
        errors: errorsList
      });

      setIsProcessingImport(false);
      if (fileInputPdfRef.current) fileInputPdfRef.current.value = '';
    } catch (err) {
      console.error('Erreur traitement PDF:', err);
      showToast('Erreur lors du traitement du fichier PDF.', 'error');
      setIsProcessingImport(false);
    }
  };

  // -------------------------------------------------------------
  // EXPORT PDF / IMPRESSION PREPARATION
  // -------------------------------------------------------------
  const pdfExportBeneficiaires = useMemo(() => {
    if (pdfScope === 'all') return beneficiaires;
    if (pdfScope === 'actifs') return beneficiaires.filter(b => b.statut === 'Actif');
    if (pdfScope === 'inactifs') return beneficiaires.filter(b => b.statut === 'Inactif');
    return filteredAndSortedBeneficiaires;
  }, [pdfScope, beneficiaires, filteredAndSortedBeneficiaires]);

  const handlePrintPdfDocument = () => {
    window.print();
  };

  return (
    <div className={`space-y-6 ${selectedBeneficiaireIds.length > 0 ? 'pb-28 sm:pb-24' : ''}`}>
      {/* 3. ACTION BAR (LARGE BUTTONS WITH ICON + TEXT) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Add button - Canva Tech Turquoise */}
          {canManage && (
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#02b3bb] to-[#0891b2] hover:from-[#0099a8] hover:to-[#0e7490] text-white font-black text-sm shadow-md shadow-cyan-900/15 transition-all cursor-pointer active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>➕ Ajouter un bénéficiaire</span>
            </button>
          )}

          {/* Import Excel */}
          {canManage && (
            <>
              <button
                onClick={() => setIsExcelImportModalOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white hover:bg-slate-50 text-[#0a1a44] font-bold text-sm transition-all cursor-pointer border border-slate-300 shadow-2xs hover:border-[#02b3bb]/50"
              >
                <Upload className="w-4 h-4 text-[#02b3bb]" />
                <span>📥 Importer Excel</span>
              </button>

              <button
                onClick={handleDownloadExcelTemplate}
                className="inline-flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm transition-all cursor-pointer border border-slate-300 shadow-2xs"
                title="Télécharger le canevas type avec colonnes standardisées"
              >
                <Download className="w-4 h-4 text-slate-500" />
                <span>Modèle Excel</span>
              </button>
            </>
          )}

          {/* Import PDF */}
          {canManage && (
            <button
              onClick={() => setIsPdfImportModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white hover:bg-slate-50 text-[#0a1a44] font-bold text-sm transition-all cursor-pointer border border-slate-300 shadow-2xs hover:border-[#02b3bb]/50"
            >
              <FileText className="w-4 h-4 text-rose-500" />
              <span>📄 Importer PDF</span>
            </button>
          )}
        </div>

        {/* Exports */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white hover:bg-slate-50 text-[#0a1a44] border border-slate-300 font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-2xs hover:border-[#02b3bb]/50"
            title="Exporter la liste filtrée au format Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#02b3bb]" />
            <span>📤 Exporter Excel</span>
          </button>

          <button
            onClick={() => setIsPdfExportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-[#0a1a44] hover:bg-[#071332] text-white font-extrabold text-xs sm:text-sm shadow-xs transition-all cursor-pointer"
            title="Générer la liste officielle des bénéficiaires au format PDF (A4)"
          >
            <Printer className="w-4 h-4 text-[#57e4ff]" />
            <span>📋 Liste des bénéficiaires (PDF)</span>
          </button>
        </div>
      </div>

      {/* 4. SEARCH & FILTERS CONTROLS (Top of the list) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
        {/* Row 1: Search Bar + Direct PDF Export */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          {/* Instant Search Bar */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-5 h-5 text-[#02b3bb]" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="🔎 Rechercher un bénéficiaire (Code Massar, Nom, Prénom, Code Filière, Code Classe, N°)..."
              className="w-full pl-10 pr-10 py-3 rounded-2xl border border-slate-200 bg-slate-50/60 text-[#0a1a44] text-sm focus:outline-none focus:ring-2 focus:ring-[#02b3bb] focus:bg-white transition-all placeholder:text-slate-400 font-medium"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* 📄 Exporter PDF */}
          <button
            onClick={() => setIsPdfExportModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-[#0a1a44] hover:bg-[#071332] text-white font-extrabold text-xs sm:text-sm shadow-md transition-all cursor-pointer shrink-0"
            title="Générer la liste officielle des bénéficiaires au format PDF (A4)"
          >
            <Printer className="w-4 h-4 text-[#57e4ff]" />
            <span>📄 Exporter PDF</span>
          </button>
        </div>

        {/* Row 2: Filters Grid (Filière | Classe | Statut) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
          {/* Filtrer par Filière */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-[#0a1a44] mb-1">
              📁 Filtrer par Filière
            </label>
            <select
              value={selectedFiliere}
              onChange={e => setSelectedFiliere(e.target.value)}
              className="w-full px-3 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs sm:text-sm font-semibold text-[#0a1a44] focus:outline-none focus:ring-2 focus:ring-[#02b3bb]"
            >
              <option value="all">Toutes les filières</option>
              {accessibleFilieres.map(f => (
                <option key={f.id} value={f.id}>
                  {f.code ? `[${f.code}] ${f.nomFr}` : f.nomFr}
                </option>
              ))}
            </select>
          </div>

          {/* Filtrer par Classe */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-[#0a1a44] mb-1">
              🏫 Filtrer par Classe
            </label>
            <select
              value={selectedClasse}
              onChange={e => setSelectedClasse(e.target.value)}
              className="w-full px-3 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs sm:text-sm font-semibold text-[#0a1a44] focus:outline-none focus:ring-2 focus:ring-[#02b3bb]"
            >
              <option value="all">Toutes les classes</option>
              {accessibleClasses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.code ? `[${c.code}] ${c.nomFr}` : c.nomFr}
                </option>
              ))}
            </select>
          </div>

          {/* Filtrer par Statut */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-[#0a1a44] mb-1">
              🏷️ Filtrer par Statut
            </label>
            <select
              value={selectedStatut}
              onChange={e => setSelectedStatut(e.target.value)}
              className="w-full px-3 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs sm:text-sm font-semibold text-[#0a1a44] focus:outline-none focus:ring-2 focus:ring-[#02b3bb]"
            >
              <option value="all">Tous les statuts</option>
              <option value="Actif">🟢 Actif</option>
              <option value="Inactif">⚪ Inactif</option>
            </select>
          </div>
        </div>

        {/* Filter Summary & Reset Bar */}
        <div className="flex flex-wrap items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-600 gap-2">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-[#0a1a44]">
              Affichage de {filteredAndSortedBeneficiaires.length} sur {beneficiaires.length} bénéficiaires
            </span>
            {(searchTerm || selectedFiliere !== 'all' || selectedClasse !== 'all' || selectedStatut !== 'all') && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black bg-cyan-50 text-[#02b3bb] border border-cyan-200">
                Filtres actifs
              </span>
            )}
          </div>

          {(searchTerm || selectedFiliere !== 'all' || selectedClasse !== 'all' || selectedStatut !== 'all') && (
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 text-xs font-black text-[#02b3bb] hover:text-cyan-700 hover:underline cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>🔄 Réinitialiser les filtres</span>
            </button>
          )}
        </div>
      </div>

      {/* 5. DATA VIEW HEADER: CONTROLS & MODE SELECTOR */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 text-xs sm:text-sm">
          <span className="font-black text-[#0a1a44]">
            {filteredAndSortedBeneficiaires.length} bénéficiaire(s) affiché(s)
          </span>

          {selectedBeneficiaireIds.length > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs animate-in fade-in">
              {selectedBeneficiaireIds.length} sélectionné(s)
            </span>
          )}

          {/* Bouton Supprimer Sélection */}
          {canManage && (
            <button
              type="button"
              onClick={handleDeleteSelected}
              disabled={selectedBeneficiaireIds.length === 0}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                selectedBeneficiaireIds.length > 0
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer active:scale-95'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
              }`}
              title={
                selectedBeneficiaireIds.length > 0
                  ? `Supprimer définitivement les ${selectedBeneficiaireIds.length} bénéficiaire(s) sélectionné(s)`
                  : 'Cochez un ou plusieurs bénéficiaires pour les supprimer'
              }
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>
                Supprimer sélection {selectedBeneficiaireIds.length > 0 ? `(${selectedBeneficiaireIds.length})` : ''}
              </span>
            </button>
          )}

          {canManage && filteredAndSortedBeneficiaires.length > 0 && (
            <button
              type="button"
              onClick={handleSelectAllVisible}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-[#02b3bb] underline cursor-pointer"
            >
              {filteredAndSortedBeneficiaires.every(b => selectedBeneficiaireIds.includes(b.id))
                ? 'Tout désélectionner'
                : 'Tout sélectionner'}
            </button>
          )}

          <span className="text-slate-300 hidden sm:inline">•</span>
          <span className="text-slate-500 text-xs">
            Tri actuel : <span className="font-black text-[#0a1a44]">
              {sortField === 'numeroInscription' ? 'N°' :
               sortField === 'nomFr' ? 'Nom' :
               sortField === 'prenomFr' ? 'Prénom' :
               sortField === 'codeMassar' ? 'Code Massar' :
               sortField === 'sexe' ? 'Sexe' :
               sortField === 'codeFiliere' ? 'Code Filière' :
               sortField === 'codeClasse' ? 'Code Classe' :
               sortField === 'dateNaissance' ? 'Date de naissance' :
               'Statut'}
            </span> ({sortDirection === 'asc' ? 'A→Z / Croissant ↑' : 'Z→A / Décroissant ↓'})
          </span>
        </div>

        {/* View Mode Selector: 📋 Vue Liste | 🗂️ Vue Cartes */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 shrink-0">
          <button
            type="button"
            onClick={() => handleSetViewMode('list')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              viewMode === 'list'
                ? 'bg-gradient-to-r from-[#02b3bb] to-[#0891b2] text-white shadow-xs'
                : 'text-slate-600 hover:text-[#0a1a44]'
            }`}
          >
            <List className={`w-4 h-4 ${viewMode === 'list' ? 'text-white' : 'text-slate-600'}`} />
            <span>📋 Vue Liste</span>
          </button>

          <button
            type="button"
            onClick={() => handleSetViewMode('cards')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              viewMode === 'cards'
                ? 'bg-gradient-to-r from-[#02b3bb] to-[#0891b2] text-white shadow-xs'
                : 'text-slate-600 hover:text-[#0a1a44]'
            }`}
          >
            <LayoutGrid className={`w-4 h-4 ${viewMode === 'cards' ? 'text-white' : 'text-slate-600'}`} />
            <span>🗂️ Vue Cartes</span>
          </button>
        </div>
      </div>

      {/* DATA VIEW CONTAINER */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {filteredAndSortedBeneficiaires.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <Users className="w-12 h-12 mx-auto text-slate-300" />
            <p className="text-base font-bold text-slate-700">Aucun bénéficiaire trouvé</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Aucun apprenant ne correspond à vos critères de recherche ou aux filtres appliqués.
            </p>
            <button
              onClick={handleResetFilters}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Réinitialiser les critères</span>
            </button>
          </div>
        ) : viewMode === 'list' ? (
          /* ========================================================================= */
          /* 1. 📋 VUE LISTE (COLONNES EXACTES : N° | Nom + Prénom | Code Massar | Sexe | Code Filière | Code Classe | Date de naissance | Action) */
          /* ========================================================================= */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#0a1a44] border-b border-[#142140] text-white font-black uppercase tracking-wider text-[11px]">
                  {/* 1. N° avec sélection globale */}
                  <th className="p-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {canManage && (
                        <input
                          type="checkbox"
                          checked={
                            filteredAndSortedBeneficiaires.length > 0 &&
                            filteredAndSortedBeneficiaires.every(b => selectedBeneficiaireIds.includes(b.id))
                          }
                          onChange={handleSelectAllVisible}
                          className="w-4 h-4 rounded text-[#02b3bb] focus:ring-[#02b3bb] border-slate-300 cursor-pointer accent-[#02b3bb]"
                          title="Sélectionner tous les bénéficiaires affichés"
                        />
                      )}
                      <div
                        onClick={() => handleSort('numeroInscription')}
                        className="flex items-center gap-1 cursor-pointer hover:text-[#57e4ff] transition-colors"
                      >
                        <span>N°</span>
                        {sortField === 'numeroInscription' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#57e4ff]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#57e4ff]" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </th>

                  {/* 2. Nom + Prénom */}
                  <th
                    onClick={() => handleSort('nomFr')}
                    className="p-3.5 cursor-pointer hover:bg-[#142140] transition-colors whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      <span>Nom + Prénom</span>
                      {sortField === 'nomFr' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#57e4ff]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#57e4ff]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      )}
                    </div>
                  </th>

                  {/* 3. Code Massar */}
                  <th
                    onClick={() => handleSort('codeMassar')}
                    className="p-3.5 cursor-pointer hover:bg-[#142140] transition-colors whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      <span>Code Massar</span>
                      {sortField === 'codeMassar' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#57e4ff]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#57e4ff]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      )}
                    </div>
                  </th>

                  {/* 4. Sexe */}
                  <th
                    onClick={() => handleSort('sexe')}
                    className="p-3.5 cursor-pointer hover:bg-[#142140] transition-colors whitespace-nowrap text-center"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Sexe</span>
                      {sortField === 'sexe' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#57e4ff]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#57e4ff]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      )}
                    </div>
                  </th>

                  {/* 5. Code Filière */}
                  <th
                    onClick={() => handleSort('codeFiliere')}
                    className="p-3.5 cursor-pointer hover:bg-[#142140] transition-colors whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      <span>Code Filière</span>
                      {sortField === 'codeFiliere' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#57e4ff]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#57e4ff]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      )}
                    </div>
                  </th>

                  {/* 6. Code Classe */}
                  <th
                    onClick={() => handleSort('codeClasse')}
                    className="p-3.5 cursor-pointer hover:bg-[#142140] transition-colors whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      <span>Code Classe</span>
                      {sortField === 'codeClasse' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#57e4ff]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#57e4ff]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      )}
                    </div>
                  </th>

                  {/* 7. Date de naissance */}
                  <th
                    onClick={() => handleSort('dateNaissance')}
                    className="p-3.5 cursor-pointer hover:bg-[#142140] transition-colors whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      <span>Date de naissance</span>
                      {sortField === 'dateNaissance' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#57e4ff]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#57e4ff]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      )}
                    </div>
                  </th>

                  {/* 8. Action */}
                  <th className="p-3.5 whitespace-nowrap text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAndSortedBeneficiaires.map((b, idx) => {
                  const filiere = getFiliereById(b.filiereId);
                  const classe = getClasseById(b.classeId);
                  const isActif = b.statut === 'Actif';
                  const isSelected = selectedBeneficiaireIds.includes(b.id);
                  const filiereCode = filiere?.code || filiere?.nomFr || '—';
                  const classeCode = classe?.code || classe?.nomFr || '—';
                  const formattedDate = b.dateNaissance
                    ? b.dateNaissance.split('-').reverse().join('/')
                    : '—';

                  return (
                    <tr
                      key={b.id}
                      className={`hover:bg-cyan-50/40 transition-colors ${
                        isSelected ? 'bg-cyan-50/70 border-l-4 border-l-[#02b3bb]' : ''
                      } ${
                        !isActif ? 'bg-slate-50/40 opacity-75' : ''
                      }`}
                    >
                      {/* 1. N° avec Checkbox individuelle */}
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {canManage && (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(b.id)}
                              className="w-4 h-4 rounded text-[#02b3bb] focus:ring-[#02b3bb] border-slate-300 cursor-pointer accent-[#02b3bb]"
                              title={`Sélectionner ${b.nomFr} ${b.prenomFr}`}
                            />
                          )}
                          <span className="font-mono font-black text-xs px-2.5 py-1 rounded-xl bg-[#0a1a44]/5 text-[#0a1a44] border border-[#0a1a44]/15 shadow-2xs inline-block">
                            {idx + 1}
                          </span>
                        </div>
                      </td>

                      {/* 2. Nom + Prénom */}
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="font-black text-[#0a1a44] text-xs sm:text-sm uppercase">
                          {b.nomFr} {b.prenomFr}
                        </div>
                        {(b.nomAr || b.prenomAr) && (
                          <div className="text-[11px] text-slate-500 font-sans font-bold" dir="rtl">
                            {b.nomAr} {b.prenomAr}
                          </div>
                        )}
                        {/* Coordonnées & Bouton 💬 WhatsApp visible dans la liste si présent */}
                        {(b.telephone || b.telephone2) && (
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {b.telephone && (
                              <a
                                href={`tel:${b.telephone}`}
                                className="font-mono text-[10px] text-slate-500 hover:text-cyan-800 flex items-center gap-1 font-semibold"
                                title={`Téléphone 1 principal : ${b.telephone}`}
                              >
                                <Phone className="w-2.5 h-2.5" />
                                <span>{b.telephone}</span>
                              </a>
                            )}
                            {b.telephone2 && (
                              <a
                                href={getMoroccanWhatsAppUrl(b.telephone2, `Bonjour ${b.prenomFr}, Centre Deuxième Chance Zirara : `)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#25D366] hover:bg-[#20ba5a] text-white font-black text-[10px] shadow-2xs transition-all active:scale-95 cursor-pointer"
                                title={`Téléphone 2 / WhatsApp : ${b.telephone2} — Cliquer pour ouvrir la conversation WhatsApp`}
                                onClick={e => e.stopPropagation()}
                              >
                                <span>💬</span>
                                <span>WhatsApp</span>
                              </a>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 3. Code Massar */}
                      <td className="p-3.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                        <span className="bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                          {b.codeMassar}
                        </span>
                      </td>

                      {/* 4. Sexe */}
                      <td className="p-3.5 whitespace-nowrap text-center">
                        <span
                          className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-black border shadow-2xs ${
                            b.sexe === 'F'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-sky-50 text-sky-800 border-sky-200'
                          }`}
                        >
                          {b.sexe === 'F' ? 'F' : 'M'}
                        </span>
                      </td>

                      {/* 5. Code Filière */}
                      <td className="p-3.5 whitespace-nowrap">
                        <span
                          className="inline-block px-2.5 py-1 rounded-xl bg-cyan-50 text-[#02b3bb] font-black border border-cyan-200/80 font-mono text-xs"
                          title={filiere?.nomFr || ''}
                        >
                          {filiereCode}
                        </span>
                      </td>

                      {/* 6. Code Classe */}
                      <td className="p-3.5 whitespace-nowrap">
                        <span
                          className="inline-block px-2.5 py-1 rounded-xl bg-slate-100 text-[#0a1a44] font-black border border-slate-200 font-mono text-xs"
                          title={classe?.nomFr || ''}
                        >
                          {classeCode}
                        </span>
                      </td>

                      {/* 7. Date de naissance */}
                      <td className="p-3.5 whitespace-nowrap text-slate-700 font-medium">
                        <span className="inline-block font-mono text-xs">
                          {formattedDate}
                        </span>
                      </td>

                      {/* 8. Action (✏️ Modifier, 👁️ Voir, 🔒 Activer / Désactiver) */}
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <div className="inline-flex items-center justify-center gap-1.5">
                          {/* ✏️ Modifier */}
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(b)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 cursor-pointer transition-all shadow-2xs"
                              title="✏️ Modifier le bénéficiaire"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                              <span>Modifier</span>
                            </button>
                          )}

                          {/* 👁️ Voir */}
                          <button
                            type="button"
                            onClick={() => handleOpenDetailModal(b)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-cyan-800 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200/80 cursor-pointer transition-all shadow-2xs"
                            title="👁️ Voir la fiche détaillée"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#02b3bb]" />
                            <span>Voir</span>
                          </button>

                          {/* 🔒 Activer / Désactiver */}
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => handleToggleStatut(b)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-2xs ${
                                isActif
                                  ? 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border-emerald-300'
                                  : 'text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-300'
                              }`}
                              title={isActif ? "🔒 Cliquer pour Désactiver" : "🔓 Cliquer pour Activer"}
                            >
                              {isActif ? (
                                <>
                                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Désactiver</span>
                                </>
                              ) : (
                                <>
                                  <Unlock className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Activer</span>
                                </>
                              )}
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
        ) : (
          /* ========================================================================= */
          /* 2. 🗂️ VUE CARTES (MODÈLE CANVA TECH 2026 : RESPONSIVE PC & SMARTPHONE)      */
          /* ========================================================================= */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-5 p-5 sm:p-6 bg-slate-50/50">
            {filteredAndSortedBeneficiaires.map(b => {
              const filiere = getFiliereById(b.filiereId);
              const classe = getClasseById(b.classeId);
              const isActif = b.statut === 'Actif';
              const isSelected = selectedBeneficiaireIds.includes(b.id);
              const initials = `${b.prenomFr?.charAt(0) || ''}${b.nomFr?.charAt(0) || ''}`.toUpperCase();

              return (
                <div
                  key={b.id}
                  className={`rounded-3xl border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-2xs hover:shadow-xl hover:-translate-y-0.5 ${
                    isSelected
                      ? 'bg-cyan-50/40 border-[#02b3bb] ring-2 ring-[#02b3bb]/40'
                      : isActif
                      ? 'bg-white border-slate-200/90 hover:border-[#02b3bb]/60'
                      : 'bg-slate-50/80 border-slate-200/80 opacity-80 hover:border-slate-300'
                  }`}
                >
                  {/* Top card header with avatar and high-tech badge */}
                  <div className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      {/* Checkbox + Avatar with luminous turquoise ring */}
                      <div className="flex items-center gap-3 min-w-0">
                        {canManage && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(b.id)}
                            className="w-4 h-4 rounded text-[#02b3bb] focus:ring-[#02b3bb] border-slate-300 cursor-pointer accent-[#02b3bb] shrink-0"
                            title={`Sélectionner ${b.nomFr} ${b.prenomFr}`}
                          />
                        )}
                        <div className="w-12 h-12 rounded-2xl bg-[#0a1a44] text-[#57e4ff] ring-2 ring-[#02b3bb]/50 shadow-md flex items-center justify-center font-black text-sm shrink-0 tracking-wider">
                          {initials || <User className="w-5 h-5 text-[#02b3bb]" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="text-sm sm:text-base font-black text-[#0a1a44] tracking-tight truncate">
                              {b.nomFr} {b.prenomFr}
                            </h3>
                            <span
                              className={`shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                                b.sexe === 'F' ? 'bg-purple-100 text-purple-800' : 'bg-cyan-100 text-cyan-800'
                              }`}
                            >
                              {b.sexe}
                            </span>
                          </div>
                          {(b.nomAr || b.prenomAr) && (
                            <div className="text-xs font-bold text-slate-500 font-sans mt-0.5 truncate">
                              {b.nomAr} {b.prenomAr}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Statut Pill */}
                      <button
                        type="button"
                        onClick={() => handleToggleStatut(b)}
                        className="shrink-0 cursor-pointer focus:outline-none"
                        title="Cliquer pour basculer Actif ↔ Inactif"
                      >
                        {isActif ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-cyan-50 text-[#0a1a44] border border-[#02b3bb]/40 hover:bg-cyan-100 transition-colors shadow-2xs">
                            <span className="w-2 h-2 rounded-full bg-[#02b3bb] animate-pulse"></span>
                            <span>Actif</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200 transition-colors">
                            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                            <span>Inactif</span>
                          </span>
                        )}
                      </button>
                    </div>

                    {/* Metadata details tags */}
                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
                      <div>
                        <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 block">
                          N° Inscription
                        </span>
                        <span className="font-mono font-black text-cyan-700 bg-cyan-50 px-1.5 py-0.5 rounded border border-cyan-200 inline-block text-[11px]">
                          {b.numeroInscription || '—'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 block">
                          Code Massar
                        </span>
                        <span className="font-mono font-bold text-[#0a1a44]">{b.codeMassar}</span>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 block">
                          Niveau
                        </span>
                        <span className="font-bold text-slate-700">{b.niveau}</span>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 block">
                          Classe pédagogique
                        </span>
                        <span className="font-black text-[#0a1a44] truncate block">
                          {classe?.nomFr || '—'}
                        </span>
                      </div>

                      <div className="col-span-2">
                        <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 block">
                          Filière / Métier
                        </span>
                        <span className="font-bold text-[#02b3bb] truncate block" title={filiere?.nomFr}>
                          {filiere?.nomFr || '—'}
                        </span>
                      </div>

                      <div className="col-span-2 flex items-center justify-between pt-2 border-t border-slate-200/60 text-[11px] flex-wrap gap-1.5">
                        <span className="text-slate-500 font-medium flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {b.dateNaissance || 'Date naiss.'}
                        </span>

                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          {b.telephone ? (
                            <a
                              href={`tel:${b.telephone}`}
                              className="font-mono text-[#02b3bb] font-black hover:underline flex items-center gap-1 text-[11px]"
                              title={`Téléphone 1 (Principal) : ${b.telephone}`}
                            >
                              <Phone className="w-3 h-3" />
                              <span>{b.telephone}</span>
                            </a>
                          ) : (
                            <span className="text-slate-300 font-mono text-[10px]">Sans tél.</span>
                          )}

                          {/* 💬 WhatsApp direct button (visible uniquement si deuxième numéro renseigné) */}
                          {b.telephone2 && (
                            <a
                              href={getMoroccanWhatsAppUrl(b.telephone2, `Bonjour ${b.prenomFr}, Centre Deuxième Chance Zirara : `)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#25D366] hover:bg-[#20ba5a] text-white font-black text-[10px] shadow-2xs transition-all active:scale-95 cursor-pointer"
                              title={`Téléphone 2 / WhatsApp : ${b.telephone2} — Cliquer pour ouvrir la conversation WhatsApp`}
                              onClick={e => e.stopPropagation()}
                            >
                              <span>💬</span>
                              <span>WhatsApp</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Observation */}
                    {b.observation && (
                      <div className="px-3 py-1.5 rounded-xl bg-amber-50/70 border border-amber-200/60 text-[11px] text-amber-900 truncate" title={b.observation}>
                        <span className="font-bold">Obs :</span> {b.observation}
                      </div>
                    )}
                  </div>

                  {/* Card Action footer (Canva Tech Rounded Buttons) */}
                  <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenDetailModal(b)}
                      className="flex-1 py-2 px-2.5 rounded-xl bg-white hover:bg-slate-100 text-[#0a1a44] font-black text-xs flex items-center justify-center gap-1 cursor-pointer border border-slate-200 shadow-2xs transition-colors"
                      title="Voir la fiche détaillée"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#02b3bb]" />
                      <span>Voir</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openPrintModal('fiche', b)}
                      className="p-2 rounded-xl bg-white hover:bg-slate-100 text-[#0a1a44] border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                      title="Imprimer la fiche individuelle"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>

                    {canManage && (
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(b)}
                        className="flex-1 py-2 px-2.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-[#02b3bb] font-black text-xs flex items-center justify-center gap-1 cursor-pointer border border-cyan-200 transition-colors"
                        title="Modifier ce bénéficiaire"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-[#02b3bb]" />
                        <span>Modifier</span>
                      </button>
                    )}

                    {canManage && (
                      <button
                        type="button"
                        onClick={() => handleDeleteBeneficiaire(b)}
                        className="p-2 rounded-xl bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-200 hover:border-red-200 transition-colors cursor-pointer"
                        title="Supprimer ce bénéficiaire"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. MODAL: AJOUTER / MODIFIER UN BÉNÉFICIAIRE */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 rounded-t-2xl">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  {editingBeneficiaire ? <Edit2 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    {editingBeneficiaire ? 'Modifier le bénéficiaire' : 'Ajouter un nouveau bénéficiaire'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Renseignez les champs ci-dessous puis validez pour enregistrer immédiatement
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {/* Section 1: IDENTITÉ */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-200 text-emerald-800">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-black uppercase tracking-wider">1. Identité & État Civil</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  {/* Code Massar */}
                  <div className="col-span-1 sm:col-span-2 md:col-span-1">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Code Massar <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.codeMassar}
                      onChange={e => setFormData({ ...formData, codeMassar: e.target.value })}
                      placeholder="Ex: M130000001"
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm font-mono uppercase focus:outline-none focus:ring-2 ${
                        formErrors.codeMassar
                          ? 'border-red-400 bg-red-50/30 focus:ring-red-500'
                          : 'border-slate-300 focus:ring-emerald-500'
                      }`}
                    />
                    {formErrors.codeMassar && (
                      <p className="text-[11px] text-red-600 font-semibold mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {formErrors.codeMassar}
                      </p>
                    )}
                  </div>

                  {/* Nom FR */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nom (FR) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nomFr}
                      onChange={e => setFormData({ ...formData, nomFr: e.target.value })}
                      placeholder="Ex: EL AMRANI"
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm uppercase focus:outline-none focus:ring-2 ${
                        formErrors.nomFr
                          ? 'border-red-400 bg-red-50/30 focus:ring-red-500'
                          : 'border-slate-300 focus:ring-emerald-500'
                      }`}
                    />
                    {formErrors.nomFr && (
                      <p className="text-[11px] text-red-600 font-semibold mt-1">{formErrors.nomFr}</p>
                    )}
                  </div>

                  {/* Prénom FR */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Prénom (FR) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.prenomFr}
                      onChange={e => setFormData({ ...formData, prenomFr: e.target.value })}
                      placeholder="Ex: Yassine"
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 ${
                        formErrors.prenomFr
                          ? 'border-red-400 bg-red-50/30 focus:ring-red-500'
                          : 'border-slate-300 focus:ring-emerald-500'
                      }`}
                    />
                    {formErrors.prenomFr && (
                      <p className="text-[11px] text-red-600 font-semibold mt-1">{formErrors.prenomFr}</p>
                    )}
                  </div>

                  {/* Nom AR */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 text-right">
                      النسب بالعربية
                    </label>
                    <input
                      type="text"
                      dir="rtl"
                      value={formData.nomAr}
                      onChange={e => setFormData({ ...formData, nomAr: e.target.value })}
                      placeholder="العمراني"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-right font-sans"
                    />
                  </div>

                  {/* Prénom AR */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 text-right">
                      الاسم بالعربية
                    </label>
                    <input
                      type="text"
                      dir="rtl"
                      value={formData.prenomAr}
                      onChange={e => setFormData({ ...formData, prenomAr: e.target.value })}
                      placeholder="ياسين"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-right font-sans"
                    />
                  </div>

                  {/* Sexe */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Sexe</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, sexe: 'M' })}
                        className={`py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                          formData.sexe === 'M'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        Garçon (M)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, sexe: 'F' })}
                        className={`py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                          formData.sexe === 'F'
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        Fille (F)
                      </button>
                    </div>
                  </div>

                  {/* Date de naissance */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Date de naissance
                    </label>
                    <input
                      type="date"
                      value={formData.dateNaissance}
                      onChange={e => setFormData({ ...formData, dateNaissance: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Lieu de naissance */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Lieu de naissance
                    </label>
                    <input
                      type="text"
                      value={formData.lieuNaissance}
                      onChange={e => setFormData({ ...formData, lieuNaissance: e.target.value })}
                      placeholder="Zirara"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: CONTACT & COORDONNÉES */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-200 text-emerald-800">
                  <Phone className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-black uppercase tracking-wider">2. Contact & Coordonnées téléphoniques</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {/* Téléphone 1 : Numéro principal */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span>Téléphone 1 (Principal)</span>
                      </span>
                    </label>
                    <input
                      type="tel"
                      value={formData.telephone}
                      onChange={e => setFormData({ ...formData, telephone: e.target.value })}
                      placeholder="06XXXXXXXX ou 05XXXXXXXX"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">Numéro d'appel direct principal</span>
                  </div>

                  {/* Téléphone 2 / WhatsApp : Deuxième numéro */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className="text-emerald-600 font-bold">💬</span>
                        <span className="text-emerald-800 font-black">Téléphone 2 / WhatsApp</span>
                      </span>
                    </label>
                    <input
                      type="tel"
                      value={formData.telephone2}
                      onChange={e => {
                        setFormData({ ...formData, telephone2: e.target.value });
                        if (formErrors.telephone2) {
                          setFormErrors(prev => {
                            const copy = { ...prev };
                            delete copy.telephone2;
                            return copy;
                          });
                        }
                      }}
                      placeholder="06XXXXXXXX ou 07XXXXXXXX"
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm font-mono focus:outline-none focus:ring-2 ${
                        formErrors.telephone2
                          ? 'border-red-500 focus:ring-red-400 bg-red-50/40'
                          : 'border-emerald-300 focus:ring-emerald-500 bg-emerald-50/20'
                      }`}
                    />
                    {formErrors.telephone2 ? (
                      <span className="text-[10px] text-red-600 font-bold mt-1 block">{formErrors.telephone2}</span>
                    ) : (
                      <span className="text-[10px] text-emerald-700 mt-1 block font-medium">Deuxième contact marocain (WhatsApp)</span>
                    )}
                  </div>

                  {/* Adresse de résidence */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Adresse de résidence
                    </label>
                    <input
                      type="text"
                      value={formData.adresse}
                      onChange={e => setFormData({ ...formData, adresse: e.target.value })}
                      placeholder="Quartier, Zirara"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">Ville, quartier ou douar</span>
                  </div>
                </div>
              </div>

              {/* Section 3: SCOLARITÉ / FORMATION */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-200 text-emerald-800">
                  <School className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-black uppercase tracking-wider">
                    3. Scolarité / Formation
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {/* Niveau */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Niveau scolaire <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.niveau}
                      onChange={e => setFormData({ ...formData, niveau: e.target.value as NiveauScolaire })}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Primaire">Primaire</option>
                      <option value="1 Collège">1 Collège</option>
                      <option value="2 Collège">2 Collège</option>
                      <option value="3 Collège">3 Collège</option>
                      <option value="Autre">Autre</option>
                    </select>
                  </div>

                  {/* Filière / Métier */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Filière / Métier d'apprentissage <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.filiereId}
                      onChange={e => {
                        const newFiliereId = e.target.value;
                        const matchingClasses = accessibleClasses.filter(c => c.filiereId === newFiliereId && c.statut !== 'inactif');
                        setFormData({
                          ...formData,
                          filiereId: newFiliereId,
                          classeId: matchingClasses.length > 0 ? matchingClasses[0].id : ''
                        });
                      }}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">-- Sélectionner une filière --</option>
                      {accessibleFilieres.filter(f => f.statut !== 'inactif').map(f => (
                        <option key={f.id} value={f.id}>
                          [{f.code}] {f.nomFr}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Classe pédagogique */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Classe pédagogique <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.classeId}
                      onChange={e => setFormData({ ...formData, classeId: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">-- Sélectionner une classe --</option>
                      {accessibleClasses
                        .filter(c => (!formData.filiereId || c.filiereId === formData.filiereId) && c.statut !== 'inactif')
                        .map(c => (
                          <option key={c.id} value={c.id}>
                            [{c.code}] {c.nomFr}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 4: SITUATION */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-200 text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-black uppercase tracking-wider">4. Situation & Observation</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Statut</label>
                    <select
                      value={formData.statut}
                      onChange={e => setFormData({ ...formData, statut: e.target.value as BeneficiaireStatus })}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Actif">🟢 Actif</option>
                      <option value="Inactif">⚪ Inactif</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Observation</label>
                    <input
                      type="text"
                      value={formData.observation}
                      onChange={e => setFormData({ ...formData, observation: e.target.value })}
                      placeholder="Remarque, suivi particulier, dossier médical..."
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer actions */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-sm cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-xs hover:shadow transition-all cursor-pointer flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingBeneficiaire ? 'Enregistrer les modifications' : 'Enregistrer le bénéficiaire'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL: DÉTAIL / FICHE BÉNÉFICIAIRE */}
      {isDetailModalOpen && viewingBeneficiaire && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full flex flex-col shadow-2xl border border-slate-200 my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-black text-base">
                  {viewingBeneficiaire.nomFr.charAt(0)}
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 leading-tight">
                    {viewingBeneficiaire.nomFr} {viewingBeneficiaire.prenomFr}
                  </h2>
                  <p className="text-xs text-slate-500 font-mono">
                    Code Massar : <span className="font-bold text-slate-800">{viewingBeneficiaire.codeMassar}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
              {/* Arabic Name banner */}
              {(viewingBeneficiaire.nomAr || viewingBeneficiaire.prenomAr) && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-right">
                  <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                    الاسم الكامل بالعربية
                  </span>
                  <span className="text-lg font-bold text-emerald-950 font-sans">
                    {viewingBeneficiaire.nomAr} {viewingBeneficiaire.prenomAr}
                  </span>
                </div>
              )}

              {/* Grid Information */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Statut</span>
                  <span
                    className={`inline-flex items-center gap-1 font-bold ${
                      viewingBeneficiaire.statut === 'Actif' ? 'text-emerald-700' : 'text-slate-500'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        viewingBeneficiaire.statut === 'Actif' ? 'bg-emerald-600' : 'bg-slate-400'
                      }`}
                    ></span>
                    {viewingBeneficiaire.statut}
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Sexe</span>
                  <span className="font-bold text-slate-800">
                    {viewingBeneficiaire.sexe === 'F' ? 'Féminin (F)' : 'Masculin (M)'}
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Niveau</span>
                  <span className="font-bold text-slate-800">{viewingBeneficiaire.niveau}</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Date de naissance</span>
                  <span className="font-semibold text-slate-800">
                    {viewingBeneficiaire.dateNaissance || '—'}
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Filière / Métier</span>
                  <span className="font-bold text-slate-800">
                    {getFiliereById(viewingBeneficiaire.filiereId)?.nomFr || '—'}
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Classe pédagogique</span>
                  <span className="font-bold text-emerald-800">
                    {getClasseById(viewingBeneficiaire.classeId)?.nomFr || '—'}
                  </span>
                </div>

                {/* 📞 Numéros de contact : Téléphone 1 & Téléphone 2 / WhatsApp */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 col-span-2 sm:col-span-3 space-y-2.5">
                  <span className="text-[10px] uppercase font-black text-slate-500 block tracking-wider">
                    Coordonnées téléphoniques & Communication directe
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Téléphone 1 (Principal) */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">
                          Téléphone 1 (Principal)
                        </span>
                        <div className="font-mono font-black text-slate-900 text-xs sm:text-sm mt-0.5 truncate">
                          {viewingBeneficiaire.telephone || 'Non renseigné'}
                        </div>
                      </div>
                      {viewingBeneficiaire.telephone && (
                        <a
                          href={`tel:${viewingBeneficiaire.telephone}`}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-colors shrink-0 shadow-2xs"
                          title="Appeler le numéro principal"
                        >
                          <Phone className="w-3.5 h-3.5 text-slate-600" />
                          <span>Appeler</span>
                        </a>
                      )}
                    </div>

                    {/* Téléphone 2 / WhatsApp */}
                    <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-2xs flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] font-black text-emerald-700 uppercase flex items-center gap-1">
                          <span>💬</span>
                          <span>Téléphone 2 / WhatsApp</span>
                        </span>
                        <div className="font-mono font-black text-emerald-950 text-xs sm:text-sm mt-0.5 truncate">
                          {viewingBeneficiaire.telephone2 || 'Non renseigné'}
                        </div>
                      </div>
                      {viewingBeneficiaire.telephone2 ? (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <a
                            href={`tel:${viewingBeneficiaire.telephone2}`}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                            title="Appeler ce deuxième numéro"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                          <a
                            href={getMoroccanWhatsAppUrl(viewingBeneficiaire.telephone2, `Bonjour ${viewingBeneficiaire.prenomFr}, Centre Deuxième Chance Nouvelle Génération Zirara : `)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-black text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                            title="Ouvrir directement une conversation avec ce numéro sur WhatsApp"
                          >
                            <span>💬</span>
                            <span>WhatsApp</span>
                          </a>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Non renseigné</span>
                      )}
                    </div>
                  </div>
                </div>

                {viewingBeneficiaire.observation && (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 col-span-2 sm:col-span-3">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Observation</span>
                    <p className="text-slate-700 mt-0.5">{viewingBeneficiaire.observation}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50/50 rounded-b-2xl">
              <button
                onClick={() => {
                  setIsDetailModalOpen(false);
                  openPrintModal('fiche', viewingBeneficiaire);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimer la fiche individuelle</span>
              </button>

              <div className="flex items-center gap-2">
                {canManage && (
                  <button
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      handleOpenEditModal(viewingBeneficiaire);
                    }}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Modifier</span>
                  </button>
                )}
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 font-semibold text-xs cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. MODAL: IMPORTATION EXCEL */}
      {isExcelImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full flex flex-col shadow-2xl border border-slate-200 my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-2xl">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">Importer des bénéficiaires via Excel</h2>
                  <p className="text-xs text-slate-500">
                    Téléversez un fichier .xlsx ou .xls conforme au modèle standard
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsExcelImportModalOpen(false);
                  setImportSummary(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
              {!importSummary ? (
                <>
                  <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-8 text-center transition-colors bg-slate-50/50">
                    <FileSpreadsheet className="w-12 h-12 mx-auto text-emerald-600 mb-3" />
                    <p className="text-sm font-bold text-slate-800 mb-1">
                      Sélectionnez votre fichier Excel de bénéficiaires
                    </p>
                    <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
                      Toutes les lignes non vides seront analysées. Les codes Massar déjà existants seront
                      détectés sans écraser vos données.
                    </p>

                    <input
                      ref={fileInputExcelRef}
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleExcelFileSelect}
                      className="hidden"
                      id="excel-file-upload"
                      disabled={isProcessingImport}
                    />

                    <label
                      htmlFor="excel-file-upload"
                      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm cursor-pointer shadow-xs ${
                        isProcessingImport ? 'opacity-50 pointer-events-none' : ''
                      }`}
                    >
                      <Upload className="w-4 h-4" />
                      <span>{isProcessingImport ? 'Traitement en cours...' : 'Choisir le fichier Excel'}</span>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-3.5 bg-slate-100 rounded-xl text-xs text-slate-700">
                    <span className="font-medium">Vous n'avez pas encore le format exact ?</span>
                    <button
                      type="button"
                      onClick={handleDownloadExcelTemplate}
                      className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:underline cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Télécharger le modèle Excel</span>
                    </button>
                  </div>
                </>
              ) : (
                /* Post Import Summary */
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-center">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                      <div className="text-2xl font-black text-emerald-900">
                        {importSummary.importedCount}
                      </div>
                      <div className="text-xs font-bold text-emerald-700">Importés avec succès</div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-center">
                      <AlertTriangle className="w-5 h-5 text-amber-600 mx-auto mb-1" />
                      <div className="text-2xl font-black text-amber-900">
                        {importSummary.duplicateCount}
                      </div>
                      <div className="text-xs font-bold text-amber-700">Doublons ignorés</div>
                    </div>

                    <div className="bg-red-50 border border-red-200 p-3 rounded-xl text-center">
                      <XCircle className="w-5 h-5 text-red-600 mx-auto mb-1" />
                      <div className="text-2xl font-black text-red-900">{importSummary.errorCount}</div>
                      <div className="text-xs font-bold text-red-700">Erreurs détectées</div>
                    </div>
                  </div>

                  {importSummary.errors.length > 0 && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden text-xs max-h-56 overflow-y-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold sticky top-0">
                          <tr>
                            <th className="p-2.5">Ligne Excel</th>
                            <th className="p-2.5">Champ</th>
                            <th className="p-2.5">Explication</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {importSummary.errors.map((err, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="p-2.5 font-mono font-bold text-slate-800">Ligne #{err.line}</td>
                              <td className="p-2.5 font-bold text-slate-700">{err.field}</td>
                              <td className="p-2.5 text-slate-600">{err.message}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 flex items-center justify-end bg-slate-50/50 rounded-b-2xl">
              <button
                onClick={() => {
                  setIsExcelImportModalOpen(false);
                  setImportSummary(null);
                }}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. MODAL: IMPORTATION PDF */}
      {isPdfImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full flex flex-col shadow-2xl border border-slate-200 my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-2xl">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">Importer depuis un document PDF</h2>
                  <p className="text-xs text-slate-500">
                    Extraction automatique des codes Massar et noms depuis les listes scolaires PDF
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsPdfImportModalOpen(false);
                  setImportSummary(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
              {!importSummary ? (
                <div className="border-2 border-dashed border-slate-300 hover:border-red-500 rounded-2xl p-8 text-center transition-colors bg-slate-50/50">
                  <FileText className="w-12 h-12 mx-auto text-red-600 mb-3" />
                  <p className="text-sm font-bold text-slate-800 mb-1">
                    Sélectionnez un document PDF d'inscrits
                  </p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
                    Le module analyse l'intégralité des pages du PDF et extrait chaque identifiant Massar
                    détecté.
                  </p>

                  <input
                    ref={fileInputPdfRef}
                    type="file"
                    accept=".pdf"
                    onChange={handlePdfFileSelect}
                    className="hidden"
                    id="pdf-file-upload"
                    disabled={isProcessingImport}
                  />

                  <label
                    htmlFor="pdf-file-upload"
                    className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm cursor-pointer shadow-xs ${
                      isProcessingImport ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  >
                    <Upload className="w-4 h-4" />
                    <span>{isProcessingImport ? 'Extraction PDF en cours...' : 'Choisir le fichier PDF'}</span>
                  </label>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-center">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                      <div className="text-2xl font-black text-emerald-900">
                        {importSummary.importedCount}
                      </div>
                      <div className="text-xs font-bold text-emerald-700">Importés</div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-center">
                      <AlertTriangle className="w-5 h-5 text-amber-600 mx-auto mb-1" />
                      <div className="text-2xl font-black text-amber-900">
                        {importSummary.duplicateCount}
                      </div>
                      <div className="text-xs font-bold text-amber-700">Doublons</div>
                    </div>

                    <div className="bg-red-50 border border-red-200 p-3 rounded-xl text-center">
                      <XCircle className="w-5 h-5 text-red-600 mx-auto mb-1" />
                      <div className="text-2xl font-black text-red-900">{importSummary.errorCount}</div>
                      <div className="text-xs font-bold text-red-700">Erreurs</div>
                    </div>
                  </div>

                  {importSummary.errors.length > 0 && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden text-xs max-h-48 overflow-y-auto p-2 bg-slate-50">
                      {importSummary.errors.map((err, i) => (
                        <div key={i} className="py-1 text-slate-700 border-b border-slate-200/60 last:border-none">
                          <span className="font-bold text-slate-900">{err.field}:</span> {err.message}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 flex items-center justify-end bg-slate-50/50 rounded-b-2xl">
              <button
                onClick={() => {
                  setIsPdfImportModalOpen(false);
                  setImportSummary(null);
                }}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. MODAL: EXPORT PDF OFFICIEL (LISTE DES BÉNÉFICIAIRES - FORMAT A4) */}
      {isPdfExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static">
          <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 my-auto animate-in fade-in zoom-in-95 duration-150 print:border-none print:shadow-none print:max-h-none print:rounded-none">
            {/* Header controls (no-print) */}
            <div className="p-4 border-b border-slate-200 bg-slate-50/90 rounded-t-3xl no-print space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#0a1a44] text-[#57e4ff]">
                    <Printer className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-[#0a1a44]">
                      Liste des bénéficiaires — Document officiel (PDF A4)
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      {pdfExportBeneficiaires.length} bénéficiaire(s) sélectionné(s) selon les filtres
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrintPdfDocument}
                    className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#02b3bb] to-[#0891b2] hover:from-[#0099a8] hover:to-[#0e7490] text-white font-black text-xs sm:text-sm flex items-center gap-2 cursor-pointer shadow-md shadow-cyan-900/15 transition-all active:scale-95"
                  >
                    <Printer className="w-4 h-4" />
                    <span>🖨️ Imprimer / Enregistrer en PDF</span>
                  </button>
                  <button
                    onClick={() => setIsPdfExportModalOpen(false)}
                    className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200/80 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Real-time PDF Interactive Filters: Filière | Classe | Statut */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-200/80">
                {/* 1. Filière Filter */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#0a1a44] mb-1">
                    📁 Filière
                  </label>
                  <select
                    value={selectedFiliere}
                    onChange={e => setSelectedFiliere(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-[#0a1a44] focus:ring-2 focus:ring-[#02b3bb]"
                  >
                    <option value="all">Toutes les filières</option>
                    {accessibleFilieres.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.nomFr} ({f.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Classe Filter */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#0a1a44] mb-1">
                    🏫 Classe
                  </label>
                  <select
                    value={selectedClasse}
                    onChange={e => setSelectedClasse(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-[#0a1a44] focus:ring-2 focus:ring-[#02b3bb]"
                  >
                    <option value="all">Toutes les classes</option>
                    {accessibleClasses.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.nomFr}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Statut Filter */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#0a1a44] mb-1">
                    🏷️ Statut
                  </label>
                  <select
                    value={selectedStatut}
                    onChange={e => setSelectedStatut(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-[#0a1a44] focus:ring-2 focus:ring-[#02b3bb]"
                  >
                    <option value="all">Tous les statuts</option>
                    <option value="Actif">🟢 Actif uniquement</option>
                    <option value="Inactif">⚪ Inactif uniquement</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Printable Document Body (Strict A4 Layout) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-white print:p-0 print:overflow-visible">
              <div className="max-w-4xl mx-auto space-y-5 print:space-y-4 text-slate-900 font-sans">
                {/* Official Institutional Header */}
                <div className="flex items-center justify-between border-b-2 border-[#0a1a44] pb-4 gap-4">
                  {/* Moroccan Seal */}
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden shrink-0 border border-slate-200 bg-white p-1 flex items-center justify-center shadow-2xs">
                    <img
                      src={moroccanSeal}
                      alt="Royaume du Maroc"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {/* Header Titles */}
                  <div className="text-center flex-1 space-y-1">
                    <h1 className="text-xs sm:text-sm font-black text-[#0a1a44] uppercase tracking-tight leading-none">
                      المملكة المغربية • وزارة التربية الوطنية والتعليم الأولي والرياضة
                    </h1>
                    <h2 className="text-sm sm:text-base font-extrabold text-[#0a1a44] tracking-tight">
                      Centre de Deuxième Chance – Nouvelle Génération Zirara
                    </h2>
                    <p className="text-[11px] sm:text-xs font-black text-cyan-800 tracking-wider">
                      مركز الفرصة الثانية – الجيل الجديد زرارة
                    </p>
                    <div className="h-0.5 bg-gradient-to-r from-transparent via-[#02b3bb] to-transparent w-40 mx-auto my-1"></div>
                    <div className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-widest bg-slate-100 py-1 px-3 rounded-lg inline-block border border-slate-200">
                      LISTE DES BÉNÉFICIAIRES / لائحة المستفيدين والمستفيدات
                    </div>
                  </div>

                  {/* CMED Logo */}
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden shrink-0 border border-slate-200 bg-white p-1 flex items-center justify-center shadow-2xs">
                    <img src={cmedLogo} alt="CMED" className="w-full h-full object-contain" />
                  </div>
                </div>

                {/* Metadata & Applied Filter Summary Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-700">
                  <div>
                    <span className="font-bold text-[#0a1a44]">Filière :</span>{' '}
                    <span className="font-black text-slate-900">
                      {selectedFiliere === 'all' ? 'Toutes les filières' : getFiliereById(selectedFiliere)?.nomFr || selectedFiliere}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-[#0a1a44]">Classe :</span>{' '}
                    <span className="font-black text-slate-900">
                      {selectedClasse === 'all' ? 'Toutes les classes' : getClasseById(selectedClasse)?.nomFr || selectedClasse}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-[#0a1a44]">Statut :</span>{' '}
                    <span className="font-black text-slate-900">
                      {selectedStatut === 'all' ? 'Tous' : selectedStatut}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-[#0a1a44]">Total :</span>{' '}
                    <span className="font-black text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded-md border border-cyan-200">
                      {pdfExportBeneficiaires.length} apprenant(s)
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 px-1">
                  <span>Année scolaire : <strong>{settings.anneeScolaireCourante || '2026-2027'}</strong></span>
                  <span>Date d'édition : <strong>{new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</strong></span>
                </div>

                {/* Official Table: N° | Nom + Prénom | Code Massar | Filière | Classe | Statut */}
                <div className="border border-slate-300 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-[#0a1a44] text-white font-extrabold uppercase tracking-wider text-[10px]">
                        <th className="p-2.5 border-r border-slate-700/60 w-10 text-center">N°</th>
                        <th className="p-2.5 border-r border-slate-700/60">Nom + Prénom</th>
                        <th className="p-2.5 border-r border-slate-700/60 text-center whitespace-nowrap">Code Massar</th>
                        <th className="p-2.5 border-r border-slate-700/60">Filière</th>
                        <th className="p-2.5 border-r border-slate-700/60">Classe</th>
                        <th className="p-2.5 text-center w-20">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {pdfExportBeneficiaires.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-400 font-bold italic">
                            Aucun bénéficiaire ne correspond aux critères sélectionnés (Filière, Classe, Statut).
                          </td>
                        </tr>
                      ) : (
                        pdfExportBeneficiaires.map((b, idx) => {
                          const filiere = getFiliereById(b.filiereId);
                          const classe = getClasseById(b.classeId);

                          return (
                            <tr key={b.id} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                              {/* 1. N° */}
                              <td className="p-2 border-r border-slate-200 text-center font-bold text-slate-600">
                                {idx + 1}
                              </td>

                              {/* 2. Nom + Prénom */}
                              <td className="p-2 border-r border-slate-200">
                                <div className="font-black text-[#0a1a44] uppercase">
                                  {b.nomFr} {b.prenomFr}
                                </div>
                                {(b.nomAr || b.prenomAr) && (
                                  <div className="text-[10px] font-bold text-slate-500 font-sans">
                                    {b.nomAr} {b.prenomAr}
                                  </div>
                                )}
                              </td>

                              {/* 3. Code Massar */}
                              <td className="p-2 border-r border-slate-200 font-mono font-black text-center text-slate-900 whitespace-nowrap">
                                {b.codeMassar}
                              </td>

                              {/* 4. Filière */}
                              <td className="p-2 border-r border-slate-200 font-medium text-slate-800">
                                {filiere?.nomFr || '—'}
                              </td>

                              {/* 5. Classe */}
                              <td className="p-2 border-r border-slate-200 font-bold text-[#0a1a44]">
                                {classe?.nomFr || '—'}
                              </td>

                              {/* 6. Statut */}
                              <td className="p-2 text-center">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black ${
                                    b.statut === 'Actif'
                                      ? 'text-emerald-800 bg-emerald-100/90 border border-emerald-300'
                                      : 'text-slate-600 bg-slate-100 border border-slate-300'
                                  }`}
                                >
                                  {b.statut === 'Actif' ? 'Actif' : 'Inactif'}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Signatures & Stamps Footer */}
                <div className="grid grid-cols-2 pt-6 text-xs text-slate-800 break-inside-avoid">
                  <div className="text-center p-3 border border-slate-200 rounded-xl bg-slate-50/50">
                    <p className="font-bold text-[#0a1a44] uppercase tracking-wider text-[11px]">
                      L'Administration Pédagogique
                    </p>
                    <div className="h-16"></div>
                    <p className="text-[10px] text-slate-400 font-medium">Signature et cachet</p>
                  </div>
                  <div className="text-center p-3 border border-slate-200 rounded-xl bg-slate-50/50 ml-4">
                    <p className="font-bold text-[#0a1a44] uppercase tracking-wider text-[11px]">
                      La Direction du Centre
                    </p>
                    <div className="h-16"></div>
                    <p className="text-[10px] text-slate-400 font-medium">Signature et cachet</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 🚀 BARRE D'ACTION FLOTTANTE ERGONOMIQUE (SÉLECTION MULTIPLE)   */}
      {/* ------------------------------------------------------------- */}
      {canManage && selectedBeneficiaireIds.length > 0 && (
        <div
          role="region"
          aria-label="Actions groupées sur les bénéficiaires sélectionnés"
          className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-2xl animate-in fade-in slide-in-from-bottom-5 duration-300 pointer-events-auto"
        >
          <div className="bg-[#0a1a44]/95 backdrop-blur-md text-white rounded-2xl sm:rounded-full px-4 sm:px-6 py-3 sm:py-3.5 border border-[#02b3bb]/50 shadow-2xl shadow-[#0a1a44]/60 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 ring-1 ring-cyan-400/20">
            {/* Côté gauche : Compteur & Bouton d'annulation de sélection */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 px-2.5 rounded-full bg-gradient-to-r from-[#02b3bb] to-[#0891b2] text-white font-black text-xs items-center justify-center shadow-xs">
                  {selectedBeneficiaireIds.length}
                </span>
                <div className="leading-tight">
                  <span className="font-extrabold text-xs sm:text-sm text-white block">
                    {selectedBeneficiaireIds.length} bénéficiaire{selectedBeneficiaireIds.length > 1 ? 's' : ''} sélectionné{selectedBeneficiaireIds.length > 1 ? 's' : ''}
                  </span>
                  <span className="text-[10px] text-cyan-200/80 hidden sm:block">
                    sur {filteredAndSortedBeneficiaires.length} affiché{filteredAndSortedBeneficiaires.length > 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Vider immédiatement la sélection */}
              <button
                type="button"
                onClick={() => setSelectedBeneficiaireIds([])}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-full transition-colors cursor-pointer active:scale-95"
                title="Désélectionner tout"
              >
                <X className="w-3.5 h-3.5" />
                <span>Désélectionner</span>
              </button>
            </div>

            {/* Côté droit : Action de suppression & sélection globale */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {filteredAndSortedBeneficiaires.length > selectedBeneficiaireIds.length && (
                <button
                  type="button"
                  onClick={handleSelectAllVisible}
                  className="hidden md:inline-flex items-center gap-1 text-[11px] font-bold text-cyan-300 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                  title="Sélectionner tous les bénéficiaires visibles"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Tout cocher ({filteredAndSortedBeneficiaires.length})</span>
                </button>
              )}

              {/* Bouton de suppression groupée flottant */}
              <button
                type="button"
                onClick={handleDeleteSelected}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl sm:rounded-full bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-500 hover:to-red-600 text-white font-black text-xs sm:text-sm shadow-lg shadow-rose-950/50 hover:shadow-rose-600/30 transition-all cursor-pointer active:scale-95 border border-rose-400/40"
              >
                <Trash2 className="w-4 h-4 text-rose-100" />
                <span>Supprimer la sélection ({selectedBeneficiaireIds.length})</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
