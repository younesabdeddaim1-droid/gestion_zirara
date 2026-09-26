import React, { useState, useEffect } from 'react';
import {
  supabase,
  supabaseUrl,
  supabaseKey,
  updateSupabaseCredentials,
  resetSupabaseCredentials
} from '../utils/supabase/client';
import { useApp } from '../context/AppContext';
import { storageService } from '../services/storage';
import {
  Database,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ExternalLink,
  ShieldCheck,
  Server,
  Layers,
  Table as TableIcon,
  HardDrive,
  Copy,
  Check,
  Activity,
  AlertCircle,
  Key,
  Link,
  Save,
  RotateCcw,
  Eye,
  EyeOff
} from 'lucide-react';

interface TableCheckResult {
  label: string;
  tableName: string;
  category: string;
  status: 'ok' | 'rls_restricted' | 'missing' | 'error' | 'pending';
  count: number | null;
  errorMessage?: string;
}

export const ConnexionSupabase: React.FC = () => {
  const { showToast, reloadFromStorage } = useApp();

  // Connection State
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking' | 'idle'>('idle');
  const [dbState, setDbState] = useState<'operational' | 'error' | 'unknown'>('unknown');
  const [lastCheckTime, setLastCheckTime] = useState<string>(() => {
    return localStorage.getItem('supabase_last_check') || '';
  });
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => {
    return localStorage.getItem('supabase_last_sync') || '';
  });
  const [lastSyncCount, setLastSyncCount] = useState<number>(() => {
    const saved = localStorage.getItem('supabase_last_sync_count');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Custom Credentials Configuration State
  const [currentUrl, setCurrentUrl] = useState<string>(supabaseUrl);
  const [currentKey, setCurrentKey] = useState<string>(supabaseKey);
  const [inputUrl, setInputUrl] = useState<string>(supabaseUrl);
  const [inputKey, setInputKey] = useState<string>(supabaseKey);
  const [showKey, setShowKey] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // Table Status State
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const initialTablesList: TableCheckResult[] = [
    { label: 'Bénéficiaires', tableName: 'beneficiaires', category: 'Apprenants', status: 'pending', count: null },
    { label: 'Filières', tableName: 'filieres', category: 'Pédagogie', status: 'pending', count: null },
    { label: 'Classes', tableName: 'classes', category: 'Pédagogie', status: 'pending', count: null },
    { label: 'Utilisateurs & Animateurs', tableName: 'users', category: 'Gestion Équipe', status: 'pending', count: null },
    { label: 'Planning & Séances', tableName: 'seances', category: 'Emploi du temps', status: 'pending', count: null },
    { label: 'Absences & Pointages', tableName: 'absences', category: 'Assiduité', status: 'pending', count: null },
    { label: 'Billets d’entrée / Retards', tableName: 'billets', category: 'Discipline', status: 'pending', count: null },
    { label: 'Convocations & Validations', tableName: 'convocations', category: 'Discipline', status: 'pending', count: null },
    { label: 'Motifs d’absence', tableName: 'motifs', category: 'Pédagogie', status: 'pending', count: null },
    { label: 'Paramètres du Centre', tableName: 'settings', category: 'Configuration', status: 'pending', count: null },
  ];

  const [tablesStatus, setTablesStatus] = useState<TableCheckResult[]>(initialTablesList);

  // Extract Supabase Project Reference from URL
  const projectRef = React.useMemo(() => {
    try {
      if (!currentUrl) return 'Non configuré';
      const parsed = new URL(currentUrl);
      const parts = parsed.hostname.split('.');
      return parts.length > 0 ? parts[0] : 'Inconnu';
    } catch {
      return 'Inconnu';
    }
  }, [currentUrl]);

  // Mask Anon Key for security: show only first 12 and last 4 characters
  const maskedAnonKey = React.useMemo(() => {
    if (!currentKey) return 'Aucune clé configurée';
    if (currentKey.length <= 16) return '••••••••••••••••';
    const start = currentKey.slice(0, 14);
    const end = currentKey.slice(-6);
    return `${start}••••••••••••••••${end}`;
  }, [currentKey]);

  // Handler to Save & Apply new Supabase Credentials
  const handleSaveCredentials = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputUrl.trim()) {
      showToast({
        title: 'URL requise',
        message: 'Veuillez saisir une URL Supabase valide (ex: https://xyz.supabase.co).',
        type: 'error'
      });
      return;
    }
    if (!inputKey.trim()) {
      showToast({
        title: 'Clé Publique requise',
        message: 'Veuillez renseigner la clé anon publique de votre projet Supabase.',
        type: 'error'
      });
      return;
    }

    try {
      new URL(inputUrl.trim());
    } catch {
      showToast({
        title: 'Format d\'URL invalide',
        message: 'L\'URL doit commencer par https:// ou http:// et être bien formatée.',
        type: 'error'
      });
      return;
    }

    updateSupabaseCredentials(inputUrl.trim(), inputKey.trim());
    setCurrentUrl(inputUrl.trim());
    setCurrentKey(inputKey.trim());
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);

    showToast({
      title: 'Identifiants enregistrés',
      message: 'Les nouveaux paramètres Supabase ont été pris en compte. Lancement du test de connexion...',
      type: 'success'
    });

    // Auto-trigger connection test with new parameters
    setTimeout(() => {
      handleTestConnection();
    }, 200);
  };

  // Reset to default credentials
  const handleResetCredentials = () => {
    resetSupabaseCredentials();
    setCurrentUrl(supabaseUrl);
    setCurrentKey(supabaseKey);
    setInputUrl(supabaseUrl);
    setInputKey(supabaseKey);
    showToast({
      title: 'Paramètres réinitialisés',
      message: 'Les paramètres par défaut du projet ont été rétablis.',
      type: 'info'
    });
    setTimeout(() => {
      handleTestConnection();
    }, 200);
  };

  // Format Date Helper
  const formatDateFr = (isoOrDate: string | Date) => {
    if (!isoOrDate) return 'Jamais';
    try {
      const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
      if (isNaN(d.getTime())) return 'Date invalide';
      return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).format(d);
    } catch {
      return 'Date invalide';
    }
  };

  // Copy URL to clipboard
  const handleCopyUrl = () => {
    if (!currentUrl) return;
    navigator.clipboard.writeText(currentUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  // Check Table Status Helper
  const checkSingleTable = async (item: TableCheckResult): Promise<TableCheckResult> => {
    try {
      const { count, error } = await supabase
        .from(item.tableName)
        .select('*', { count: 'exact', head: true });

      if (error) {
        const msg = error.message?.toLowerCase() || '';
        const code = error.code || '';

        // Check if table is missing/not found
        if (
          code === '42P01' ||
          msg.includes('relation') ||
          msg.includes('does not exist') ||
          msg.includes('not found') ||
          code === 'PGRST116' ||
          code === 'PGRST204'
        ) {
          return {
            ...item,
            status: 'missing',
            count: null,
            errorMessage: `Table absente dans le schéma Supabase (${error.message || code})`
          };
        }

        // Check if access is restricted by RLS (Row Level Security)
        if (code === '42501' || msg.includes('permission denied') || msg.includes('row-level security') || msg.includes('policy')) {
          return {
            ...item,
            status: 'rls_restricted',
            count: 0,
            errorMessage: 'Accès restreint par les règles de sécurité RLS (Lecture directe anonyme non autorisée)'
          };
        }

        return {
          ...item,
          status: 'error',
          count: null,
          errorMessage: error.message || `Code d'erreur : ${code}`
        };
      }

      return {
        ...item,
        status: 'ok',
        count: count ?? 0,
        errorMessage: undefined
      };
    } catch (err: any) {
      return {
        ...item,
        status: 'error',
        count: null,
        errorMessage: err.message || 'Erreur réseau inattendue'
      };
    }
  };

  // 1. Tester la connexion
  const handleTestConnection = async () => {
    setIsTesting(true);
    setConnectionStatus('checking');
    setErrorMessage('');
    const startTime = performance.now();

    try {
      if (!currentUrl || !currentKey) {
        throw new Error("L'URL Supabase et la Clé Publique (Anon) doivent être renseignées pour tester la connexion.");
      }

      // Step 1: Test reachability via light ping / select
      let isReachable = false;
      let reachabilityError: string | null = null;

      try {
        const pingRes = await Promise.race([
          supabase.from('settings').select('id').limit(1),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Délai d’attente dépassé (timeout 10s)')), 10000))
        ]);

        if (pingRes && (!pingRes.error || pingRes.error.code !== 'PGRST301')) {
          // If returned data or PostgreSQL error like table missing/RLS, server is definitely reachable
          isReachable = true;
        } else if (pingRes?.error) {
          reachabilityError = pingRes.error.message || `Code: ${pingRes.error.code}`;
        }
      } catch (err: any) {
        reachabilityError = err?.message || 'Erreur réseau';
      }

      if (!isReachable) {
        // Double check with auth session endpoint
        try {
          const { error: authErr } = await supabase.auth.getSession();
          if (!authErr) {
            isReachable = true;
          } else {
            reachabilityError = reachabilityError || authErr.message;
          }
        } catch (err: any) {
          reachabilityError = reachabilityError || err?.message;
        }
      }

      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);

      if (!isReachable) {
        throw new Error(
          reachabilityError?.includes('fetch failed') || reachabilityError?.includes('ENOTFOUND')
            ? `Serveur Supabase injoignable (${currentUrl}). Veuillez vérifier l’URL de votre projet ou votre clé publique.`
            : reachabilityError || 'Impossible de contacter le serveur Supabase.'
        );
      }

      setLatencyMs(latency);

      // Verify tables in parallel
      const testedTables = await Promise.all(
        initialTablesList.map(table => checkSingleTable(table))
      );
      setTablesStatus(testedTables);

      // Analyze overall database state
      const hasMissing = testedTables.some(t => t.status === 'missing');
      const hasErrors = testedTables.some(t => t.status === 'error');

      setConnectionStatus('connected');
      setDbState(hasErrors ? 'error' : hasMissing ? 'operational' : 'operational');

      const nowIso = new Date().toISOString();
      setLastCheckTime(nowIso);
      localStorage.setItem('supabase_last_check', nowIso);

      showToast({
        title: 'Connexion Supabase réussie',
        message: `🟢 Connecté au projet (${latency} ms). Tables testées avec succès.`,
        type: 'success'
      });
    } catch (err: any) {
      const msg = err.message || 'Erreur inconnue lors du test de connexion.';
      setConnectionStatus('disconnected');
      setDbState('error');
      setErrorMessage(msg);
      setLatencyMs(null);

      const nowIso = new Date().toISOString();
      setLastCheckTime(nowIso);
      localStorage.setItem('supabase_last_check', nowIso);

      showToast({
        title: 'Échec de connexion à Supabase',
        message: `🔴 ${msg}`,
        type: 'error'
      });
    } finally {
      setIsTesting(false);
    }
  };

  // 2. Synchronisation / Actualiser les données sans doublons
  const handleSyncData = async () => {
    setIsSyncing(true);
    setSyncStatus('syncing');

    try {
      let totalRecords = 0;
      let syncLog: string[] = [];

      // A. Beneficiaires
      try {
        const { data: remoteBens, error: errBen } = await supabase.from('beneficiaires').select('*');
        if (!errBen && remoteBens && remoteBens.length > 0) {
          const localBens = storageService.getBeneficiaires();
          const benMap = new Map<string, any>();
          // Existing local
          localBens.forEach(b => benMap.set(b.id, b));
          // Merge remote without duplicates
          remoteBens.forEach((rb: any) => {
            benMap.set(rb.id, {
              ...rb,
              codeMassar: rb.codeMassar || rb.code_massar,
              nomFr: rb.nomFr || rb.nom_fr,
              prenomFr: rb.prenomFr || rb.prenom_fr,
              nomAr: rb.nomAr || rb.nom_ar,
              prenomAr: rb.prenomAr || rb.prenom_ar,
              dateNaissance: rb.dateNaissance || rb.date_naissance,
              lieuNaissance: rb.lieuNaissance || rb.lieu_naissance,
              filiereId: rb.filiereId || rb.filiere_id,
              classeId: rb.classeId || rb.classe_id,
              numeroInscription: rb.numeroInscription || rb.numero_inscription,
              dateInscription: rb.dateInscription || rb.date_inscription
            });
          });
          const merged = Array.from(benMap.values());
          storageService.setBeneficiaires(merged);
          totalRecords += remoteBens.length;
          syncLog.push(`${remoteBens.length} bénéficiaires`);
        }
      } catch (e) {
        console.warn('Sync beneficiaires fallback:', e);
      }

      // B. Filieres
      try {
        const { data: remoteFil, error: errFil } = await supabase.from('filieres').select('*');
        if (!errFil && remoteFil && remoteFil.length > 0) {
          const localFil = storageService.getFilieres();
          const filMap = new Map<string, any>();
          localFil.forEach(f => filMap.set(f.id, f));
          remoteFil.forEach((rf: any) => {
            filMap.set(rf.id, {
              ...rf,
              nomFr: rf.nomFr || rf.nom_fr,
              nomAr: rf.nomAr || rf.nom_ar
            });
          });
          storageService.setFilieres(Array.from(filMap.values()));
          totalRecords += remoteFil.length;
          syncLog.push(`${remoteFil.length} filières`);
        }
      } catch (e) {
        console.warn('Sync filieres fallback:', e);
      }

      // C. Classes
      try {
        const { data: remoteCls, error: errCls } = await supabase.from('classes').select('*');
        if (!errCls && remoteCls && remoteCls.length > 0) {
          const localCls = storageService.getClasses();
          const clsMap = new Map<string, any>();
          localCls.forEach(c => clsMap.set(c.id, c));
          remoteCls.forEach((rc: any) => {
            clsMap.set(rc.id, {
              ...rc,
              nomFr: rc.nomFr || rc.nom_fr,
              nomAr: rc.nomAr || rc.nom_ar,
              filiereId: rc.filiereId || rc.filiere_id,
              anneeScolaire: rc.anneeScolaire || rc.annee_scolaire
            });
          });
          storageService.setClasses(Array.from(clsMap.values()));
          totalRecords += remoteCls.length;
          syncLog.push(`${remoteCls.length} classes`);
        }
      } catch (e) {
        console.warn('Sync classes fallback:', e);
      }

      // D. Users
      try {
        const { data: remoteUsr, error: errUsr } = await supabase.from('users').select('*');
        if (!errUsr && remoteUsr && remoteUsr.length > 0) {
          const localUsr = storageService.getUsers();
          const usrMap = new Map<string, any>();
          localUsr.forEach(u => usrMap.set(u.id, u));
          remoteUsr.forEach((ru: any) => {
            usrMap.set(ru.id, {
              ...ru,
              nomComplet: ru.nomComplet || ru.nom_complet,
              nomCompletAr: ru.nomCompletAr || ru.nom_complet_ar,
              filiereIds: ru.filiereIds || ru.filiere_ids,
              classeIds: ru.classeIds || ru.classe_ids
            });
          });
          storageService.setUsers(Array.from(usrMap.values()));
          totalRecords += remoteUsr.length;
          syncLog.push(`${remoteUsr.length} utilisateurs`);
        }
      } catch (e) {
        console.warn('Sync users fallback:', e);
      }

      // E. Seances
      try {
        const { data: remoteSea, error: errSea } = await supabase.from('seances').select('*');
        if (!errSea && remoteSea && remoteSea.length > 0) {
          const localSea = storageService.getSeances();
          const seaMap = new Map<string, any>();
          localSea.forEach(s => seaMap.set(s.id, s));
          remoteSea.forEach((rs: any) => {
            seaMap.set(rs.id, {
              ...rs,
              intituleAr: rs.intituleAr || rs.intitule_ar,
              animateurId: rs.animateurId || rs.animateur_id,
              filiereId: rs.filiereId || rs.filiere_id,
              classeId: rs.classeId || rs.classe_id,
              classeIds: rs.classeIds || rs.classe_ids,
              heureDebut: rs.heureDebut || rs.heure_debut,
              heureFin: rs.heureFin || rs.heure_fin
            });
          });
          storageService.setSeances(Array.from(seaMap.values()));
          totalRecords += remoteSea.length;
          syncLog.push(`${remoteSea.length} séances`);
        }
      } catch (e) {
        console.warn('Sync seances fallback:', e);
      }

      // F. Absences
      try {
        const { data: remoteAbs, error: errAbs } = await supabase.from('absences').select('*');
        if (!errAbs && remoteAbs && remoteAbs.length > 0) {
          const localAbs = storageService.getAbsences();
          const absMap = new Map<string, any>();
          localAbs.forEach(a => absMap.set(a.id, a));
          remoteAbs.forEach((ra: any) => {
            absMap.set(ra.id, {
              ...ra,
              seanceId: ra.seanceId || ra.seance_id,
              beneficiaireId: ra.beneficiaireId || ra.beneficiaire_id,
              typeAbsence: ra.typeAbsence || ra.type_absence,
              dureeRetardMinutes: ra.dureeRetardMinutes || ra.duree_retard_minutes,
              statutValidation: ra.statutValidation || ra.statut_validation,
              dateSaisie: ra.dateSaisie || ra.date_saisie,
              saisiParUserId: ra.saisiParUserId || ra.saisi_par_user_id
            });
          });
          storageService.setAbsences(Array.from(absMap.values()));
          totalRecords += remoteAbs.length;
          syncLog.push(`${remoteAbs.length} absences`);
        }
      } catch (e) {
        console.warn('Sync absences fallback:', e);
      }

      // G. Settings
      try {
        const { data: remoteSet, error: errSet } = await supabase.from('settings').select('*').limit(1);
        if (!errSet && remoteSet && remoteSet.length > 0) {
          const rs = remoteSet[0];
          storageService.setSettings({
            ...storageService.getSettings(),
            nomCentre: rs.nomCentre || rs.nom_centre || storageService.getSettings().nomCentre,
            nomCentreAr: rs.nomCentreAr || rs.nom_centre_ar || storageService.getSettings().nomCentreAr,
            ministereFr: rs.ministereFr || rs.ministere_fr || storageService.getSettings().ministereFr,
            ministereAr: rs.ministereAr || rs.ministere_ar || storageService.getSettings().ministereAr,
            academieFr: rs.academieFr || rs.academie_fr || storageService.getSettings().academieFr,
            academieAr: rs.academieAr || rs.academie_ar || storageService.getSettings().academieAr,
            directionProvincialeFr: rs.directionProvincialeFr || rs.direction_provinciale_fr || storageService.getSettings().directionProvincialeFr,
            directionProvincialeAr: rs.directionProvincialeAr || rs.direction_provinciale_ar || storageService.getSettings().directionProvincialeAr,
            adresse: rs.adresse || storageService.getSettings().adresse,
            adresseAr: rs.adresseAr || rs.adresse_ar || storageService.getSettings().adresseAr,
            ville: rs.ville || storageService.getSettings().ville,
            province: rs.province || storageService.getSettings().province,
            telephone: rs.telephone || storageService.getSettings().telephone,
            email: rs.email || storageService.getSettings().email,
            nomDirecteur: rs.nomDirecteur || rs.nom_directeur || storageService.getSettings().nomDirecteur,
            heureDebutJournee: rs.heureDebutJournee || rs.heure_debut_journee || storageService.getSettings().heureDebutJournee,
            heureFinJournee: rs.heureFinJournee || rs.heure_fin_journee || storageService.getSettings().heureFinJournee,
            dureeSeanceMinutes: rs.dureeSeanceMinutes || rs.duree_seance_minutes || storageService.getSettings().dureeSeanceMinutes,
            seuilConvocationAbsences: rs.seuilConvocationAbsences || rs.seuil_convocation_absences || storageService.getSettings().seuilConvocationAbsences,
            anneeScolaireCourante: rs.anneeScolaireCourante || rs.annee_scolaire_courante || storageService.getSettings().anneeScolaireCourante
          });
          totalRecords += 1;
        }
      } catch (e) {
        console.warn('Sync settings fallback:', e);
      }

      // Propagate to reactive app context
      reloadFromStorage();

      const nowIso = new Date().toISOString();
      setLastSyncTime(nowIso);
      setLastSyncCount(totalRecords);
      localStorage.setItem('supabase_last_sync', nowIso);
      localStorage.setItem('supabase_last_sync_count', totalRecords.toString());
      setSyncStatus('success');

      showToast({
        title: 'Synchronisation réussie',
        message: `Données rechargées depuis Supabase sans doublons (${totalRecords} enregistrements récupérés).`,
        type: 'success'
      });
    } catch (err: any) {
      setSyncStatus('error');
      showToast({
        title: 'Erreur lors de la synchronisation',
        message: err.message || 'Impossible de synchroniser avec Supabase.',
        type: 'error'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Check on mount if not checked yet
  useEffect(() => {
    if (!lastCheckTime) {
      handleTestConnection();
    }
  }, []);

  const missingTables = tablesStatus.filter(t => t.status === 'missing');

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0a1a44] via-[#0f2d6b] to-[#02b3bb] rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner shrink-0">
              <Database className="w-7 h-7 text-[#02b3bb]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">Connexion Supabase</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                  PostgreSQL Cloud
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-200 font-medium mt-1">
                Supervision de l'état de liaison, test de latence et synchronisation des données de l'établissement.
              </p>
            </div>
          </div>

          {/* Quick status pill */}
          <div className="flex items-center self-start sm:self-auto gap-2 bg-black/25 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/15">
            <span className="relative flex h-3 w-3">
              {connectionStatus === 'connected' ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </>
              ) : connectionStatus === 'checking' ? (
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-400 animate-pulse"></span>
              ) : (
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
              )}
            </span>
            <span className="text-xs font-bold text-white">
              {connectionStatus === 'connected'
                ? '🟢 Connecté'
                : connectionStatus === 'checking'
                ? '🟡 Vérification...'
                : '🔴 Non connecté'}
            </span>
          </div>
        </div>
      </div>

      {/* Missing Tables Alert Banner (Required by user: don't auto-create, show alert) */}
      {missingTables.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 text-amber-900 shadow-sm flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-200 flex items-center justify-center shrink-0 text-amber-800">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h4 className="font-black text-sm text-amber-950">
              ⚠️ Attention : {missingTables.length} table(s) absente(s) dans le projet Supabase
            </h4>
            <p className="text-xs text-amber-800 font-medium mt-1">
              Les tables suivantes ne sont pas encore créées dans votre schéma Supabase :{' '}
              <span className="font-bold underline">
                {missingTables.map(t => t.tableName).join(', ')}
              </span>.
              Conformément à la politique de sécurité, aucune table n'est générée automatiquement. Veuillez appliquer les migrations ou configurer votre schéma de base de données.
            </p>
          </div>
        </div>
      )}

      {/* Section de Configuration & Saisie Manuelle de l'URL et de la Clé Anon */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-base font-black text-[#0a1a44] flex items-center gap-2">
              <Key className="w-5 h-5 text-[#02b3bb]" />
              Configuration des Identifiants Supabase (URL & Clé Publique)
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Renseignez ou modifiez directement ici votre <span className="font-semibold text-slate-700">URL Supabase</span> et votre <span className="font-semibold text-slate-700">Clé Publique (Anon)</span> puis cliquez sur Enregistrer & Tester.
            </p>
          </div>

          <button
            type="button"
            onClick={handleResetCredentials}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            title="Réinitialiser aux valeurs d'origine"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Réinitialiser
          </button>
        </div>

        <form onSubmit={handleSaveCredentials} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Input URL Supabase */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                URL Supabase du Projet
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Link className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="https://votre-projet.supabase.co"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-mono text-[#0a1a44] focus:outline-none focus:ring-2 focus:ring-[#02b3bb] focus:border-transparent transition-all"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Exemple : <code className="text-slate-600 font-bold">https://mcdudiiqjzsnthhbtgbm.supabase.co</code>
              </p>
            </div>

            {/* Input Clé Publique (Anon) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Clé Publique Supabase (Anon Key)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Key className="w-4 h-4" />
                </div>
                <input
                  type={showKey ? 'text' : 'password'}
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  placeholder="sb_publishable_... ou eyJhbGciOi..."
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-mono text-[#0a1a44] focus:outline-none focus:ring-2 focus:ring-[#02b3bb] focus:border-transparent transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  title={showKey ? 'Masquer la clé' : 'Afficher la clé'}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Utilisez uniquement la clé <span className="font-semibold text-slate-600">anon public</span> (ne jamais saisir la clé service_role).
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="text-xs text-slate-500">
              {isSaved ? (
                <span className="text-emerald-600 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Identifiants sauvegardés avec succès !
                </span>
              ) : (
                <span>Les identifiants sont sauvegardés localement et appliqués immédiatement.</span>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="submit"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-black text-white bg-gradient-to-r from-[#02b3bb] to-[#0891b2] hover:from-[#0099a8] hover:to-[#0e7490] active:scale-95 shadow-sm transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Enregistrer & Tester</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Main Connection Information Cards (Section 1) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 1: URL Supabase & Project */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">URL Supabase Active</span>
            <ExternalLink className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-center gap-2">
            <code className="text-xs font-mono font-bold text-[#0a1a44] bg-slate-100 px-2 py-1 rounded-lg truncate flex-1" title={currentUrl}>
              {currentUrl || 'Non définie'}
            </code>
            <button
              type="button"
              onClick={handleCopyUrl}
              className="p-1.5 rounded-lg text-slate-600 hover:text-[#02b3bb] hover:bg-slate-100 transition-colors cursor-pointer"
              title="Copier l'URL"
            >
              {copiedUrl ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Projet connecté :</span>
            <span className="font-black text-[#0a1a44] bg-[#02b3bb]/10 text-[#0891b2] px-2 py-0.5 rounded-md font-mono">
              {projectRef}
            </span>
          </div>
        </div>

        {/* Card 2: Clé Anon & État de la Base de données */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Clé Publique (Anon)</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded-lg truncate" title={currentKey}>
            {maskedAnonKey}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">État Base de données :</span>
            <span className="font-bold flex items-center gap-1.5">
              {dbState === 'operational' ? (
                <span className="text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Opérationnelle
                </span>
              ) : dbState === 'error' ? (
                <span className="text-rose-700 flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  Inaccessible
                </span>
              ) : (
                <span className="text-slate-500">Non vérifiée</span>
              )}
            </span>
          </div>
        </div>

        {/* Card 3: Vérification & Latence */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow md:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Dernière vérification</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xs font-bold text-[#0a1a44]">
            {lastCheckTime ? formatDateFr(lastCheckTime) : 'Aucun test effectué'}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Temps de réponse (latence) :</span>
            <span className="font-black text-[#0a1a44]">
              {latencyMs !== null ? `${latencyMs} ms` : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons: Tester & Synchroniser (Sections 2 & 3) */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-2xs">
        <h2 className="text-base font-black text-[#0a1a44] mb-1">
          Actions de Contrôle et Synchronisation
        </h2>
        <p className="text-xs text-slate-500 font-medium mb-6">
          Testez en temps réel la liaison réseau ou déclenchez une actualisation sécurisée des données sans doublons.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Bouton 1: Tester la connexion */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#02b3bb]" />
                <h3 className="text-sm font-black text-[#0a1a44]">Vérification du lien Supabase</h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Interroge l'API REST Supabase avec la clé anon et teste les privilèges RLS sur vos tables.
              </p>
            </div>

            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-black text-white bg-gradient-to-r from-[#02b3bb] to-[#0891b2] hover:from-[#0099a8] hover:to-[#0e7490] active:scale-95 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'Test en cours...' : '🔄 Tester la connexion'}</span>
            </button>
          </div>

          {/* Bouton 2: Actualiser les données */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-black text-[#0a1a44]">Synchronisation des Données</h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Recharge les données depuis Supabase et fusionne les enregistrements sans créer de doublons.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSyncData}
              disabled={isSyncing}
              className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-black text-white bg-gradient-to-r from-[#0a1a44] to-[#1e3a8a] hover:from-[#06102c] hover:to-[#172554] active:scale-95 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Synchronisation en cours...' : '🔄 Actualiser les données'}</span>
            </button>
          </div>
        </div>

        {/* Sync Summary & Status Feedback */}
        <div className="mt-5 p-4 rounded-2xl bg-slate-100/70 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Dernière synchronisation :</span>
            <span className="text-[#0a1a44] font-black">
              {lastSyncTime ? formatDateFr(lastSyncTime) : 'Aucune synchronisation récente'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div>
              <span className="text-slate-500">Enregistrements récupérés : </span>
              <span className="font-black text-emerald-700">{lastSyncCount}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Statut : </span>
              {syncStatus === 'success' ? (
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Synchronisé
                </span>
              ) : syncStatus === 'syncing' ? (
                <span className="text-[#02b3bb] font-bold animate-pulse">En cours...</span>
              ) : syncStatus === 'error' ? (
                <span className="text-rose-600 font-bold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Erreur
                </span>
              ) : (
                <span className="text-slate-600 font-medium">Prêt</span>
              )}
            </div>
          </div>
        </div>

        {/* Error message detail if present */}
        {errorMessage && (
          <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
            <span className="font-bold">Détail de l'erreur :</span> {errorMessage}
          </div>
        )}
      </div>

      {/* Table Status Audit (Section 4: Test des Tables Existantes) */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-black text-[#0a1a44] flex items-center gap-2">
              <TableIcon className="w-4 h-4 text-[#02b3bb]" />
              État des Tables Existantes dans Supabase
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Vérification des tables requises par l'application pour le fonctionnement du centre de deuxième chance.
            </p>
          </div>

          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="self-start sm:self-auto text-xs font-bold text-[#0891b2] hover:text-[#02b3bb] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
            Re-tester les tables
          </button>
        </div>

        {/* Responsive Table Grid */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Rubrique & Données</th>
                <th className="py-3 px-4">Table Supabase</th>
                <th className="py-3 px-4">Catégorie</th>
                <th className="py-3 px-4 text-center">Statut</th>
                <th className="py-3 px-4 text-right">Lignes Détectées</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tablesStatus.map((t, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-bold text-[#0a1a44]">
                    {t.label}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600">
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                      {t.tableName}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500">
                    {t.category}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {t.status === 'ok' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Accessible
                      </span>
                    ) : t.status === 'rls_restricted' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200" title={t.errorMessage}>
                        <ShieldCheck className="w-3 h-3 text-amber-600" />
                        RLS Actif
                      </span>
                    ) : t.status === 'missing' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200" title={t.errorMessage}>
                        <XCircle className="w-3 h-3 text-rose-600" />
                        Table Absente
                      </span>
                    ) : t.status === 'error' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200" title={t.errorMessage}>
                        <AlertCircle className="w-3 h-3 text-rose-600" />
                        Erreur
                      </span>
                    ) : (
                      <span className="text-slate-400 font-medium">En attente</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-[#0a1a44]">
                    {t.count !== null ? t.count : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security notice (Section 5) */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-xs text-slate-600 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-bold text-[#0a1a44]">Directives de Sécurité et Confidentialité</h4>
          <p>
            • Cette interface utilise exclusivement le jeton anonyme public (<code className="font-bold">VITE_SUPABASE_ANON_KEY</code>).
          </p>
          <p>
            • La clé d'administration (<code className="font-bold">service_role</code>) n'est jamais exposée ni injectée côté client web.
          </p>
          <p>
            • L'accès aux données respecte rigoureusement les stratégies de sécurité au niveau des lignes (RLS) définies sur votre projet Supabase.
          </p>
        </div>
      </div>
    </div>
  );
};
