import { pgTable, text, integer, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. settings table
export const settings = pgTable('settings', {
  id: text('id').primaryKey(), // 'current_settings'
  nomCentre: text('nom_centre').notNull(),
  nomCentreAr: text('nom_centre_ar').notNull(),
  ministereFr: text('ministere_fr').notNull(),
  ministereAr: text('ministere_ar').notNull(),
  academieFr: text('academie_fr').notNull(),
  academieAr: text('academie_ar').notNull(),
  directionProvincialeFr: text('direction_provinciale_fr').notNull(),
  directionProvincialeAr: text('direction_provinciale_ar').notNull(),
  adresse: text('adresse').notNull(),
  adresseAr: text('adresse_ar').notNull(),
  ville: text('ville').notNull(),
  province: text('province').notNull(),
  telephone: text('telephone').notNull(),
  email: text('email').notNull(),
  nomDirecteur: text('nom_directeur').notNull(),
  heureDebutJournee: text('heure_debut_journee').notNull(),
  heureFinJournee: text('heure_fin_journee').notNull(),
  dureeSeanceMinutes: integer('duree_seance_minutes').notNull(),
  seuilConvocationAbsences: integer('seuil_convocation_absences').notNull(),
  anneeScolaireCourante: text('annee_scolaire_courante').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 2. users table
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  codeMassar: text('code_massar'),
  beneficiaireId: text('beneficiaire_id'),
  password: text('password'),
  nom: text('nom'),
  prenom: text('prenom'),
  nomComplet: text('nom_complet').notNull(),
  nomCompletAr: text('nom_complet_ar'),
  role: text('role').notNull(), // 'admin' | 'animateur' | 'beneficiaire' | 'consultation'
  telephone: text('telephone'),
  specialite: text('specialite'),
  filiereId: text('filiere_id'),
  classeId: text('classe_id'),
  filiereIds: jsonb('filiere_ids'), // array of strings
  classeIds: jsonb('classe_ids'),   // array of strings
  statut: text('statut').notNull(), // 'actif' | 'inactif'
  observation: text('observation'),
  avatar: text('avatar'),
  permissions: jsonb('permissions'), // UserPermissions json
  createdAt: timestamp('created_at').defaultNow(),
});

// 3. filieres table
export const filieres = pgTable('filieres', {
  id: text('id').primaryKey(),
  code: text('code').notNull(),
  nomFr: text('nom_fr').notNull(),
  nomAr: text('nom_ar').notNull(),
  description: text('description'),
  statut: text('statut').default('actif'), // 'actif' | 'inactf'
});

// 4. classes table
export const classes = pgTable('classes', {
  id: text('id').primaryKey(),
  code: text('code').notNull(),
  nomFr: text('nom_fr').notNull(),
  nomAr: text('nom_ar').notNull(),
  niveau: text('niveau'),
  filiereId: text('filiere_id').notNull(),
  anneeScolaire: text('annee_scolaire').notNull(),
  statut: text('statut').default('actif'), // 'actif' | 'inactif'
});

// 5. beneficiaires table
export const beneficiaires = pgTable('beneficiaires', {
  id: text('id').primaryKey(),
  numeroInscription: text('numero_inscription'),
  codeMassar: text('code_massar').notNull().unique(),
  nomFr: text('nom_fr').notNull(),
  prenomFr: text('prenom_fr').notNull(),
  nomAr: text('nom_ar').notNull(),
  prenomAr: text('prenom_ar').notNull(),
  sexe: text('sexe').notNull(), // 'M' | 'F'
  dateNaissance: text('date_naissance').notNull(),
  lieuNaissance: text('lieu_naissance').notNull(),
  telephone: text('telephone').notNull(),
  telephone2: text('telephone2'),
  niveau: text('niveau').notNull(),
  filiereId: text('filiere_id').notNull(),
  classeId: text('classe_id').notNull(),
  statut: text('statut').notNull(), // 'Actif' | 'Inactif'
  observation: text('observation').notNull(),
  adresse: text('adresse').notNull(),
  photoUrl: text('photo_url'),
  dateInscription: text('date_inscription').notNull(),
});

// 6. seances table
export const seances = pgTable('seances', {
  id: text('id').primaryKey(),
  intitule: text('intitule').notNull(),
  intituleAr: text('intitule_ar'),
  animateurId: text('animateur_id').notNull(),
  filiereId: text('filiere_id').notNull(),
  classeId: text('classe_id').notNull(),
  classeIds: jsonb('classe_ids'), // array of strings
  date: text('date').notNull(),
  jour: text('jour'),
  heureDebut: text('heure_debut').notNull(),
  heureFin: text('heure_fin').notNull(),
  salle: text('salle'),
});

// 7. absences table
export const absences = pgTable('absences', {
  id: text('id').primaryKey(),
  seanceId: text('seance_id').notNull(),
  beneficiaireId: text('beneficiaire_id').notNull(),
  statut: text('statut').notNull(), // 'Present' | 'Absent' | 'Retard' | 'Infraction'
  typeAbsence: text('type_absence'), // 'Absent' | 'Retard' | 'Infraction'
  dureeRetardMinutes: integer('duree_retard_minutes'),
  statutValidation: text('statut_validation'), // 'En attente' | 'Validée' | 'Refusée'
  motifLabel: text('motif_label'),
  motifId: text('motif_id'),
  justifie: boolean('justifie').notNull(),
  convoqueAdmin: boolean('convoque_admin').notNull(),
  dateSaisie: text('date_saisie').notNull(),
  saisiParUserId: text('saisi_par_user_id').notNull(),
  note: text('note'),
});

// 8. motifs table
export const motifs = pgTable('motifs', {
  id: text('id').primaryKey(),
  code: text('code').notNull(),
  libelleFr: text('libelle_fr').notNull(),
  libelleAr: text('libelle_ar').notNull(),
  justifieParDefaut: boolean('justifie_par_defaut').notNull(),
});

// 9. convocations table
export const convocations = pgTable('convocations', {
  id: text('id').primaryKey(),
  beneficiaireId: text('beneficiaire_id').notNull(),
  seanceId: text('seance_id'),
  dateConvocation: text('date_convocation').notNull(),
  motif: text('motif').notNull(),
  motifAr: text('motif_ar'),
  statut: text('statut').notNull(), // 'En attente' | 'Présenté' | 'Résolu' | 'Non résolu'
  creeParUserId: text('cree_par_user_id').notNull(),
  dateResolution: text('date_resolution'),
  decision: text('decision'),
});

// 10. billets table
export const billets = pgTable('billets', {
  id: text('id').primaryKey(),
  absenceId: text('absence_id').notNull(),
  seanceId: text('seance_id').notNull(),
  beneficiaireId: text('beneficiaire_id').notNull(),
  nomPrenomFr: text('nom_prenom_fr').notNull(),
  nomPrenomAr: text('nom_prenom_ar'),
  codeMassar: text('code_massar').notNull(),
  filiereNom: text('filiere_nom').notNull(),
  classeNom: text('classe_nom').notNull(),
  dateSeance: text('date_seance').notNull(),
  heureSeance: text('heure_seance').notNull(),
  dureeMinutes: integer('duree_minutes').notNull(),
  motif: text('motif').notNull(),
  motifAr: text('motif_ar'),
  dateGeneration: text('date_generation').notNull(),
  creeParUserId: text('cree_par_user_id').notNull(),
  creeParNom: text('cree_par_nom'),
  statutValidation: text('statut_validation').default('Validée'), // 'Validée' | 'En attente' | 'Refusée'
});
