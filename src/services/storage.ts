/**
 * Storage Service
 * Handles persistence with localStorage and reactive updates
 */

import {
  CentreSettings,
  User,
  Filiere,
  Classe,
  Beneficiaire,
  Seance,
  AbsenceRecord,
  MotifAbsence,
  Convocation,
  BilletRetard
} from '../types';

import {
  initialSettings,
  initialUsers,
  initialFilieres,
  initialClasses,
  initialBeneficiaires,
  initialSeances,
  initialAbsences,
  initialMotifs,
  initialConvocations
} from '../data/mockData';

const STORAGE_KEYS = {
  SETTINGS: 'e2c_zirara_settings_v3',
  USERS: 'e2c_zirara_users_v10',
  FILIERES: 'e2c_zirara_filieres_v1',
  CLASSES: 'e2c_zirara_classes_v1',
  BENEFICIAIRES: 'e2c_zirara_beneficiaires_v10',
  SEANCES: 'e2c_zirara_seances_v10',
  ABSENCES: 'e2c_zirara_absences_v10',
  MOTIFS: 'e2c_zirara_motifs_v1',
  CONVOCATIONS: 'e2c_zirara_convocations_v10',
  BILLETS_RETARD: 'e2c_zirara_billets_retard_v1',
  CURRENT_USER_ID: 'e2c_zirara_current_user_v1',
  LANGUAGE: 'e2c_zirara_language_v1',
  NAME_LANGUAGE: 'e2c_zirara_name_language_v1',
  MAX_INSCRIPTION_SEQ: 'e2c_zirara_max_inscription_seq_v1'
};

function safeGet<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    return JSON.parse(item) as T;
  } catch (err) {
    console.error(`Error reading ${key} from storage:`, err);
    return fallback;
  }
}

function safeSet<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error saving ${key} to storage:`, err);
  }
}

export const storageService = {
  // Settings
  getSettings: (): CentreSettings => {
    const s = safeGet<CentreSettings>(STORAGE_KEYS.SETTINGS, initialSettings);
    let changed = false;
    if (s && s.nomCentre === "Corps Marocain pour l'Éducation et le Développement") {
      s.nomCentre = "Corps Marocain pour l'Éducation et Développement";
      changed = true;
    }
    if (s && s.directionProvincialeFr && s.directionProvincialeFr.includes("Sidi Kacem")) {
      s.directionProvincialeFr = initialSettings.directionProvincialeFr;
      s.directionProvincialeAr = initialSettings.directionProvincialeAr;
      s.province = initialSettings.province;
      changed = true;
    }
    if (s && (!s.anneeScolaireCourante || s.anneeScolaireCourante === "2025-2026" || s.anneeScolaireCourante === "2025/2026")) {
      s.anneeScolaireCourante = "2026-2027";
      changed = true;
    }
    if (changed) {
      safeSet(STORAGE_KEYS.SETTINGS, s);
    }
    return s;
  },
  setSettings: (settings: CentreSettings) => safeSet(STORAGE_KEYS.SETTINGS, settings),

  // Users
  getUsers: (): User[] => {
    let list = safeGet<User[]>(STORAGE_KEYS.USERS, initialUsers);
    let changed = false;
    const hasAnimateur = list.some(u => u.role === 'animateur');
    if (!hasAnimateur) {
      list = [...list, ...initialUsers.filter(u => u.role === 'animateur')];
      changed = true;
    }
    const hasBeneficiaire = list.some(u => u.role === 'beneficiaire');
    if (!hasBeneficiaire) {
      list = [...list, ...initialUsers.filter(u => u.role === 'beneficiaire')];
      changed = true;
    }
    if (changed) {
      safeSet(STORAGE_KEYS.USERS, list);
    }
    return list;
  },
  setUsers: (users: User[]) => safeSet(STORAGE_KEYS.USERS, users),

  // Filières
  getFilieres: (): Filiere[] => {
    const list = safeGet<Filiere[]>(STORAGE_KEYS.FILIERES, initialFilieres);
    let changed = false;
    const migrated = list.map(f => {
      if (!f.statut) {
        changed = true;
        return { ...f, statut: 'actif' as const };
      }
      return f;
    });
    if (changed) {
      safeSet(STORAGE_KEYS.FILIERES, migrated);
    }
    return migrated;
  },
  setFilieres: (filieres: Filiere[]) => safeSet(STORAGE_KEYS.FILIERES, filieres),

  // Classes
  getClasses: (): Classe[] => {
    const list = safeGet<Classe[]>(STORAGE_KEYS.CLASSES, initialClasses);
    let changed = false;
    const migrated = list.map(c => {
      let updated = { ...c };
      if (!c.anneeScolaire || c.anneeScolaire === '2025-2026' || c.anneeScolaire === '2025/2026') {
        changed = true;
        updated.anneeScolaire = '2026-2027';
      }
      if (!c.statut) {
        changed = true;
        updated.statut = 'actif' as const;
      }
      if (!c.niveau) {
        changed = true;
        updated.niveau = '1ère Année';
      }
      return updated;
    });
    if (changed) {
      safeSet(STORAGE_KEYS.CLASSES, migrated);
    }
    return migrated;
  },
  setClasses: (classes: Classe[]) => safeSet(STORAGE_KEYS.CLASSES, classes),

  // Bénéficiaires
  getNextNumeroInscription: (existingBens?: Beneficiaire[]): string => {
    const bens = existingBens || safeGet<Beneficiaire[]>(STORAGE_KEYS.BENEFICIAIRES, initialBeneficiaires);
    let maxSeq = safeGet<number>(STORAGE_KEYS.MAX_INSCRIPTION_SEQ, 0);

    bens.forEach(b => {
      if (b.numeroInscription) {
        const match = b.numeroInscription.match(/^(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxSeq) {
            maxSeq = num;
          }
        }
      }
    });

    const nextSeq = maxSeq + 1;
    safeSet(STORAGE_KEYS.MAX_INSCRIPTION_SEQ, nextSeq);
    return `${String(nextSeq).padStart(3, '0')}/26`;
  },

  getBeneficiaires: (): Beneficiaire[] => {
    let list = safeGet<Beneficiaire[]>(STORAGE_KEYS.BENEFICIAIRES, initialBeneficiaires);
    if (!list || list.length === 0) {
      list = [...initialBeneficiaires];
      safeSet(STORAGE_KEYS.BENEFICIAIRES, list);
    }
    let changed = false;
    let maxSeq = safeGet<number>(STORAGE_KEYS.MAX_INSCRIPTION_SEQ, 0);

    list.forEach(b => {
      if (b.numeroInscription) {
        const match = b.numeroInscription.match(/^(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxSeq) {
            maxSeq = num;
          }
        }
      }
    });

    const migrated = list.map(b => {
      let updated = { ...b };
      if (!b.numeroInscription) {
        maxSeq++;
        changed = true;
        updated.numeroInscription = `${String(maxSeq).padStart(3, '0')}/26`;
      }
      if (b.id === 'ben-salma-1' && !b.telephone2) {
        updated.telephone2 = '0661998877';
        changed = true;
      }
      if (b.id === 'ben-yassine-2' && !b.telephone2) {
        updated.telephone2 = '0701234567';
        changed = true;
      }
      return updated;
    });

    if (changed) {
      safeSet(STORAGE_KEYS.MAX_INSCRIPTION_SEQ, maxSeq);
      safeSet(STORAGE_KEYS.BENEFICIAIRES, migrated);
    }
    return migrated;
  },

  setBeneficiaires: (bens: Beneficiaire[]) => safeSet(STORAGE_KEYS.BENEFICIAIRES, bens),

  // Suppression atomique groupée dans le stockage persistant (localStorage) avec cascade des orphelins
  deleteBeneficiairesBulk: (beneficiaireIds: string[]): {
    updatedBens: Beneficiaire[];
    updatedAbs: AbsenceRecord[];
    updatedConvs: Convocation[];
  } => {
    const idsSet = new Set(beneficiaireIds);

    // 1. Suppression des bénéficiaires
    const currentBens = safeGet<Beneficiaire[]>(STORAGE_KEYS.BENEFICIAIRES, initialBeneficiaires);
    const updatedBens = currentBens.filter(b => !idsSet.has(b.id));
    safeSet(STORAGE_KEYS.BENEFICIAIRES, updatedBens);

    // 2. Nettoyage automatique en cascade des fiches d'absences orphelines
    const currentAbs = safeGet<AbsenceRecord[]>(STORAGE_KEYS.ABSENCES, initialAbsences);
    const updatedAbs = currentAbs.filter(a => !idsSet.has(a.beneficiaireId));
    safeSet(STORAGE_KEYS.ABSENCES, updatedAbs);

    // 3. Nettoyage automatique en cascade des convocations orphelines
    const currentConvs = safeGet<Convocation[]>(STORAGE_KEYS.CONVOCATIONS, initialConvocations);
    const updatedConvs = currentConvs.filter(c => !idsSet.has(c.beneficiaireId));
    safeSet(STORAGE_KEYS.CONVOCATIONS, updatedConvs);

    return { updatedBens, updatedAbs, updatedConvs };
  },

  // Séances
  getSeances: (): Seance[] => {
    let list = safeGet<Seance[]>(STORAGE_KEYS.SEANCES, initialSeances);
    if (!list || list.length === 0) {
      list = [...initialSeances];
      safeSet(STORAGE_KEYS.SEANCES, list);
    }
    let changed = false;
    const DAYS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const migrated = list.map(s => {
      let updated = { ...s };
      if (!s.classeIds || s.classeIds.length === 0) {
        if (s.classeId) {
          updated.classeIds = [s.classeId];
          changed = true;
        } else {
          updated.classeIds = [];
        }
      }
      if (!updated.classeId && updated.classeIds && updated.classeIds.length > 0) {
        updated.classeId = updated.classeIds[0];
        changed = true;
      }
      if (!updated.jour && updated.date) {
        try {
          const d = new Date(updated.date + 'T00:00:00');
          updated.jour = DAYS_FR[d.getDay()] || 'Lundi';
          changed = true;
        } catch {
          // ignore
        }
      }
      return updated;
    });
    if (changed) {
      safeSet(STORAGE_KEYS.SEANCES, migrated);
    }
    return migrated;
  },
  setSeances: (seances: Seance[]) => safeSet(STORAGE_KEYS.SEANCES, seances),

  // Absences
  getAbsences: (): AbsenceRecord[] => {
    let list = safeGet<AbsenceRecord[]>(STORAGE_KEYS.ABSENCES, initialAbsences);
    if (!list || list.length === 0) {
      list = [...initialAbsences];
      safeSet(STORAGE_KEYS.ABSENCES, list);
    }
    return list;
  },
  setAbsences: (absences: AbsenceRecord[]) => safeSet(STORAGE_KEYS.ABSENCES, absences),

  // Motifs
  getMotifs: (): MotifAbsence[] => safeGet<MotifAbsence[]>(STORAGE_KEYS.MOTIFS, initialMotifs),
  setMotifs: (motifs: MotifAbsence[]) => safeSet(STORAGE_KEYS.MOTIFS, motifs),

  // Convocations
  getConvocations: (): Convocation[] => {
    let list = safeGet<Convocation[]>(STORAGE_KEYS.CONVOCATIONS, initialConvocations);
    if (!list || list.length === 0) {
      list = [...initialConvocations];
      safeSet(STORAGE_KEYS.CONVOCATIONS, list);
    }
    return list;
  },
  setConvocations: (convocations: Convocation[]) => safeSet(STORAGE_KEYS.CONVOCATIONS, convocations),

  // Billets de Retard
  getBilletsRetard: (): BilletRetard[] => {
    const list = safeGet<BilletRetard[]>(STORAGE_KEYS.BILLETS_RETARD, []);
    return list;
  },
  setBilletsRetard: (billets: BilletRetard[]) => safeSet(STORAGE_KEYS.BILLETS_RETARD, billets),

  // Current User Session (Session scoped: starts on Login screen on each fresh startup)
  getCurrentUserId: (): string | null => {
    try {
      return sessionStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID) || null;
    } catch {
      return null;
    }
  },
  setCurrentUserId: (id: string | null) => {
    try {
      if (id) {
        sessionStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, id);
      } else {
        sessionStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
      }
    } catch {
      // ignore
    }
  },

  // Language Preferences
  getLanguage: (): 'fr' | 'ar' => {
    const lang = localStorage.getItem(STORAGE_KEYS.LANGUAGE);
    return lang === 'ar' ? 'ar' : 'fr';
  },
  setLanguage: (lang: 'fr' | 'ar') => {
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
  },

  getNameLanguage: (): 'fr' | 'ar' | 'both' => {
    const nl = localStorage.getItem(STORAGE_KEYS.NAME_LANGUAGE);
    if (nl === 'ar' || nl === 'both') return nl;
    return 'fr';
  },
  setNameLanguage: (lang: 'fr' | 'ar' | 'both') => {
    localStorage.setItem(STORAGE_KEYS.NAME_LANGUAGE, lang);
  },

  // Reset to default data
  resetAllData: () => {
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.USERS);
    localStorage.removeItem(STORAGE_KEYS.FILIERES);
    localStorage.removeItem(STORAGE_KEYS.CLASSES);
    localStorage.removeItem(STORAGE_KEYS.BENEFICIAIRES);
    localStorage.removeItem(STORAGE_KEYS.SEANCES);
    localStorage.removeItem(STORAGE_KEYS.ABSENCES);
    localStorage.removeItem(STORAGE_KEYS.MOTIFS);
    localStorage.removeItem(STORAGE_KEYS.CONVOCATIONS);
  },

  // Export full JSON snapshot
  exportBackup: () => {
    return JSON.stringify({
      version: '1.0',
      exportDate: new Date().toISOString(),
      settings: storageService.getSettings(),
      users: storageService.getUsers(),
      filieres: storageService.getFilieres(),
      classes: storageService.getClasses(),
      beneficiaires: storageService.getBeneficiaires(),
      seances: storageService.getSeances(),
      absences: storageService.getAbsences(),
      motifs: storageService.getMotifs(),
      convocations: storageService.getConvocations()
    }, null, 2);
  },

  // Import JSON snapshot
  importBackup: (jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString);
      if (data.settings) storageService.setSettings(data.settings);
      if (data.users) storageService.setUsers(data.users);
      if (data.filieres) storageService.setFilieres(data.filieres);
      if (data.classes) storageService.setClasses(data.classes);
      if (data.beneficiaires) storageService.setBeneficiaires(data.beneficiaires);
      if (data.seances) storageService.setSeances(data.seances);
      if (data.absences) storageService.setAbsences(data.absences);
      if (data.motifs) storageService.setMotifs(data.motifs);
      if (data.convocations) storageService.setConvocations(data.convocations);
      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  }
};
