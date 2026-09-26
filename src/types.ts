/**
 * GESTION CENTRE – DEUXIÈME CHANCE – NOUVELLE GÉNÉRATION ZIRARA
 * Types & Normalized Data Models
 */

export type Role = 'admin' | 'animateur' | 'beneficiaire' | 'consultation';

export type UserStatus = 'actif' | 'inactif';

export interface UserPermissions {
  gestionBeneficiaires: boolean;
  lectureBeneficiaires: boolean;
  gestionPlanning: boolean;
  lecturePlanning: boolean;
  saisieAbsences: boolean;
  emettreConvocations: boolean;
  resoudreConvocations: boolean;
  imprimerRapports: boolean;
  gestionParametrage: boolean;
  gestionUtilisateurs: boolean;
}

export interface User {
  id: string;
  email: string;
  codeMassar?: string;
  beneficiaireId?: string;
  password?: string;
  nom?: string;
  prenom?: string;
  nomComplet: string;
  nomCompletAr?: string;
  role: Role;
  telephone?: string;
  specialite?: string;
  filiereId?: string; // rétro-compatibilité
  classeId?: string;  // rétro-compatibilité
  filiereIds?: string[]; // filières affectées
  classeIds?: string[];  // classes affectées
  statut: UserStatus;
  observation?: string;
  avatar?: string;
  permissions?: UserPermissions;
}

export type Sexe = 'M' | 'F';

export type NiveauScolaire = 'Primaire' | '1 Collège' | '2 Collège' | '3 Collège' | 'Autre';

export type BeneficiaireStatus = 'Actif' | 'Inactif';

export interface Beneficiaire {
  id: string;
  numeroInscription?: string;
  codeMassar: string;
  nomFr: string;
  prenomFr: string;
  nomAr: string;
  prenomAr: string;
  sexe: Sexe;
  dateNaissance: string; // YYYY-MM-DD
  lieuNaissance: string;
  telephone: string; // Téléphone 1 : numéro principal
  telephone2?: string; // Téléphone 2 / WhatsApp : deuxième numéro de contact
  niveau: NiveauScolaire;
  filiereId: string;
  classeId: string;
  statut: BeneficiaireStatus;
  observation: string;
  adresse: string;
  photoUrl?: string;
  dateInscription: string;
}

export interface Filiere {
  id: string;
  code: string;
  nomFr: string;
  nomAr: string;
  description?: string;
  statut?: 'actif' | 'inactif';
}

export interface Classe {
  id: string;
  code: string;
  nomFr: string;
  nomAr: string;
  niveau?: string;
  filiereId: string;
  anneeScolaire: string;
  statut?: 'actif' | 'inactif';
}

export interface Seance {
  id: string;
  intitule: string;
  intituleAr?: string;
  animateurId: string; // foreign key to User
  filiereId: string; // foreign key to Filiere
  classeId: string; // foreign key to primary/first Classe (for backward compatibility)
  classeIds?: string[]; // foreign keys to multiple Classes
  date: string; // YYYY-MM-DD
  jour?: string; // Jour de la semaine (ex: Lundi)
  heureDebut: string; // HH:mm
  heureFin: string; // HH:mm
  salle?: string;
}

export type StatutPresence = 'Present' | 'Absent' | 'Retard' | 'Infraction';

export type TypeAbsence = 'Absent' | 'Retard' | 'Infraction';

export type StatutValidationAbsence = 'En attente' | 'Validée' | 'Refusée';

export interface AbsenceRecord {
  id: string;
  seanceId: string;
  beneficiaireId: string;
  statut: StatutPresence;
  typeAbsence?: TypeAbsence;
  dureeRetardMinutes?: number;
  statutValidation?: StatutValidationAbsence;
  motifLabel?: string;
  motifId?: string;
  justifie: boolean;
  convoqueAdmin: boolean;
  dateSaisie: string;
  saisiParUserId: string;
  note?: string;
}

export interface MotifAbsence {
  id: string;
  code: string;
  libelleFr: string;
  libelleAr: string;
  justifieParDefaut: boolean;
}

export type StatutConvocation = 'En attente' | 'Présenté' | 'Résolu' | 'Non résolu';

export interface Convocation {
  id: string;
  beneficiaireId: string;
  seanceId?: string;
  dateConvocation: string;
  motif: string;
  motifAr?: string;
  statut: StatutConvocation;
  creeParUserId: string;
  dateResolution?: string;
  decision?: string;
}

export interface BilletRetard {
  id: string;
  absenceId: string;
  seanceId: string;
  beneficiaireId: string;
  nomPrenomFr: string;
  nomPrenomAr?: string;
  codeMassar: string;
  filiereNom: string;
  classeNom: string;
  dateSeance: string;
  heureSeance: string;
  dureeMinutes: number;
  motif: string;
  motifAr?: string;
  dateGeneration: string;
  creeParUserId: string;
  creeParNom?: string;
  statutValidation?: 'Validée' | 'En attente' | 'Refusée';
}

export interface CentreSettings {
  nomCentre: string;
  nomCentreAr: string;
  ministereFr: string;
  ministereAr: string;
  academieFr: string;
  academieAr: string;
  directionProvincialeFr: string;
  directionProvincialeAr: string;
  adresse: string;
  adresseAr: string;
  ville: string;
  province: string;
  telephone: string;
  email: string;
  nomDirecteur: string;
  heureDebutJournee: string;
  heureFinJournee: string;
  dureeSeanceMinutes: number;
  seuilConvocationAbsences: number;
  anneeScolaireCourante: string;
}

export type ActiveModule =
  | 'dashboard'
  | 'beneficiaires'
  | 'absences'
  | 'validation'
  | 'billets'
  | 'planning'
  | 'rapports'
  | 'parametrage'
  | 'utilisateurs';

export type Language = 'fr' | 'ar';
