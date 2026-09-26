import {
  CentreSettings,
  User,
  Filiere,
  Classe,
  Beneficiaire,
  Seance,
  AbsenceRecord,
  MotifAbsence,
  Convocation
} from '../types';

export const initialSettings: CentreSettings = {
  nomCentre: "Corps Marocain pour l'Éducation et Développement",
  nomCentreAr: "الهيئة المغربية للتربية والتنمية",
  ministereFr: "Ministère de l'Éducation Nationale, du Préscolaire et des Sports",
  ministereAr: "وزارة التربية الوطنية والتعليم الأولي والرياضة",
  academieFr: "Académie Régionale d'Éducation et de Formation – Rabat-Salé-Kénitra",
  academieAr: "الأكاديمية الجهوية للتربية والتكوين – جهة الرباط سلا القنيطرة",
  directionProvincialeFr: "Centre de Deuxième Chance – Nouvelle Génération ZIRARA",
  directionProvincialeAr: "مركز الفرصة الثانية الجيل الجديد زيرارة",
  adresse: "Centre Deuxième Chance N.G., Centre Urbain Zirara, Route Nationale 4",
  adresseAr: "مركز الفرصة الثانية الجيل الجديد، مركز جماعة زيرارة، الطريق الوطنية رقم 4",
  ville: "Zirara",
  province: "Skhirat - Témara",
  telephone: "+212 5 37 59 12 34",
  email: "contact@e2c-zirara.ma",
  nomDirecteur: "Directeur du Centre Zirara",
  heureDebutJournee: "08:30",
  heureFinJournee: "17:00",
  dureeSeanceMinutes: 90,
  seuilConvocationAbsences: 3,
  anneeScolaireCourante: "2026-2027"
};

export const initialUsers: User[] = [
  // 2 ADMINISTRATORS
  {
    id: "usr-admin-1",
    email: "admin@zirara.ma",
    password: "admin",
    nom: "Younes",
    prenom: "Directeur",
    nomComplet: "Directeur Younes Administrateur",
    nomCompletAr: "المدير يونس المشرف الإداري",
    role: "admin",
    telephone: "+212 6 61 23 45 67",
    specialite: "Direction Pédagogique & Coordination",
    statut: "actif",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80"
  },
  {
    id: "usr-admin-ali",
    email: "ali-adm@zirara.com",
    password: "admin",
    nom: "Ali",
    prenom: "Administrateur",
    nomComplet: "Ali Administrateur",
    nomCompletAr: "علي المشرف الإداري",
    role: "admin",
    telephone: "+212 6 61 00 00 00",
    specialite: "Administration & Gestion Centre",
    statut: "actif",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80"
  },
  {
    id: "usr-admin-younes",
    email: "younesabdeddaim1@gmail.com",
    password: "admin",
    nom: "Younes",
    prenom: "Abdeddaim",
    nomComplet: "Younes Abdeddaim",
    nomCompletAr: "يونس عبد الدائم",
    role: "admin",
    telephone: "+212 6 61 00 00 01",
    specialite: "Direction Générale",
    statut: "actif",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80"
  }
];

export const initialFilieres: Filiere[] = [
  {
    id: "fil-eb",
    code: "EB",
    nomFr: "Électricité de Bâtiment & Domotique",
    nomAr: "كهرباء البناء والأنظمة المنزلية الذكية",
    description: "Formation professionnelle aux installations électriques résidentielles et de sécurité."
  },
  {
    id: "fil-cc",
    code: "CC",
    nomFr: "Coupe, Couture & Confection",
    nomAr: "الفصالة والخياطة والنسيج",
    description: "Apprentissage des techniques de coupe artisanale et moderne, modélisme et broderie."
  },
  {
    id: "fil-inf",
    code: "INF",
    nomFr: "Informatique, Bureautique & Digital",
    nomAr: "المعلوميات والمكتبات والرقمنة",
    description: "Compétences numériques fondamentales, saisie de données et maintenance de base."
  }
];

export const initialClasses: Classe[] = [
  {
    id: "cls-eb-1",
    code: "EB-1",
    nomFr: "Électricité Bâtiment - Groupe 1",
    nomAr: "كهرباء البناء - الفوج 1",
    filiereId: "fil-eb",
    anneeScolaire: "2026-2027"
  },
  {
    id: "cls-cc-1",
    code: "CC-1",
    nomFr: "Couture & Confection - Groupe 1",
    nomAr: "الفصالة والخياطة - الفوج 1",
    filiereId: "fil-cc",
    anneeScolaire: "2026-2027"
  },
  {
    id: "cls-inf-1",
    code: "INF-1",
    nomFr: "Informatique & Bureautique - Groupe 1",
    nomAr: "المعلوميات والمكتبات - الفوج 1",
    filiereId: "fil-inf",
    anneeScolaire: "2026-2027"
  }
];

export const initialMotifs: MotifAbsence[] = [
  {
    id: "mtf-1",
    code: "NJ",
    libelleFr: "Non justifié",
    libelleAr: "غياب غير مبرر",
    justifieParDefaut: false
  },
  {
    id: "mtf-2",
    code: "MAL",
    libelleFr: "Maladie (Certificat médical)",
    libelleAr: "مرض مع شهادة طبية",
    justifieParDefaut: true
  },
  {
    id: "mtf-3",
    code: "FAM",
    libelleFr: "Urgence familiale majeure",
    libelleAr: "ظروف عائلية قاهرة",
    justifieParDefaut: true
  },
  {
    id: "mtf-4",
    code: "TRP",
    libelleFr: "Problème de transport rural",
    libelleAr: "صعوبة في النقل القروي",
    justifieParDefaut: true
  },
  {
    id: "mtf-5",
    code: "ADM",
    libelleFr: "Démarche administrative officielle",
    libelleAr: "إجراءات إدارية رسمية",
    justifieParDefaut: true
  }
];

// Clean Production Slate - Test records are cleared
export const initialBeneficiaires: Beneficiaire[] = [];
export const initialSeances: Seance[] = [];
export const initialAbsences: AbsenceRecord[] = [];
export const initialConvocations: Convocation[] = [];
