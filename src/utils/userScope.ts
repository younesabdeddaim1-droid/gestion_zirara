import { User, Beneficiaire, Seance, Filiere, Classe } from '../types';

/**
 * Utilitaires de portée et de contrôle d'accès pour les filières et classes
 * Règles :
 * - Administrateur : accès complet à toutes les filières et classes.
 * - Animateur / Consultation : accès restreint uniquement aux filières et classes qui lui sont affectées.
 */

export function getUserAssignedFiliereIds(user: User | null | undefined): string[] {
  if (!user) return [];
  if (user.role === 'admin') return []; // L'admin a accès à tout
  if (user.filiereIds && user.filiereIds.length > 0) return user.filiereIds;
  if (user.filiereId) return [user.filiereId];
  return [];
}

export function getUserAssignedClasseIds(user: User | null | undefined): string[] {
  if (!user) return [];
  if (user.role === 'admin') return []; // L'admin a accès à tout
  if (user.classeIds && user.classeIds.length > 0) return user.classeIds;
  if (user.classeId) return [user.classeId];
  return [];
}

export function isFiliereAccessible(filiereId: string, user: User | null | undefined): boolean {
  if (!user || user.role === 'admin') return true;
  const assigned = getUserAssignedFiliereIds(user);
  if (assigned.length === 0) return false;
  return assigned.includes(filiereId);
}

export function isClasseAccessible(
  classeId: string,
  user: User | null | undefined,
  classeFiliereId?: string
): boolean {
  if (!user || user.role === 'admin') return true;
  const assignedClasses = getUserAssignedClasseIds(user);
  const assignedFilieres = getUserAssignedFiliereIds(user);

  if (assignedClasses.length > 0) {
    return assignedClasses.includes(classeId);
  }
  if (assignedFilieres.length > 0 && classeFiliereId) {
    return assignedFilieres.includes(classeFiliereId);
  }
  return false;
}

export function isBeneficiaireAccessible(
  b: Beneficiaire,
  user: User | null | undefined
): boolean {
  if (!user || user.role === 'admin') return true;
  const assignedFilieres = getUserAssignedFiliereIds(user);
  const assignedClasses = getUserAssignedClasseIds(user);

  // Si ni filière ni classe n'est affectée à l'animateur, il ne doit rien voir
  if (assignedFilieres.length === 0 && assignedClasses.length === 0) {
    return false;
  }

  // Vérification de la filière
  if (assignedFilieres.length > 0 && (!b.filiereId || !assignedFilieres.includes(b.filiereId))) {
    return false;
  }

  // Vérification de la classe
  if (assignedClasses.length > 0 && (!b.classeId || !assignedClasses.includes(b.classeId))) {
    return false;
  }

  return true;
}

export function isSeanceAccessible(
  s: Seance,
  user: User | null | undefined
): boolean {
  if (!user || user.role === 'admin') return true;
  if (s.animateurId === user.id) return true;

  const assignedFilieres = getUserAssignedFiliereIds(user);
  const assignedClasses = getUserAssignedClasseIds(user);

  if (assignedFilieres.length === 0 && assignedClasses.length === 0) {
    return false;
  }

  const sClassIds = s.classeIds && s.classeIds.length > 0 ? s.classeIds : (s.classeId ? [s.classeId] : []);

  if (assignedClasses.length > 0 && sClassIds.some(cid => assignedClasses.includes(cid))) {
    return true;
  }

  if (assignedFilieres.length > 0 && s.filiereId && assignedFilieres.includes(s.filiereId)) {
    return true;
  }

  return false;
}

export function filterFilieresForUser(filieres: Filiere[], user: User | null | undefined): Filiere[] {
  if (!user || user.role === 'admin') return filieres;
  const assigned = getUserAssignedFiliereIds(user);
  if (assigned.length === 0) return [];
  return filieres.filter(f => assigned.includes(f.id));
}

export function filterClassesForUser(
  classes: Classe[],
  user: User | null | undefined
): Classe[] {
  if (!user || user.role === 'admin') return classes;
  const assignedClasses = getUserAssignedClasseIds(user);
  const assignedFilieres = getUserAssignedFiliereIds(user);

  if (assignedClasses.length > 0) {
    return classes.filter(c => assignedClasses.includes(c.id));
  }
  if (assignedFilieres.length > 0) {
    return classes.filter(c => assignedFilieres.includes(c.filiereId));
  }
  return [];
}
