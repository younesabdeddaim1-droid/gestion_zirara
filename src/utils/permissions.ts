import { User, UserPermissions, Role } from '../types';

export const DEFAULT_ADMIN_PERMISSIONS: UserPermissions = {
  gestionBeneficiaires: true,
  lectureBeneficiaires: true,
  gestionPlanning: true,
  lecturePlanning: true,
  saisieAbsences: true,
  emettreConvocations: true,
  resoudreConvocations: true,
  imprimerRapports: true,
  gestionParametrage: true,
  gestionUtilisateurs: true,
};

export const DEFAULT_ANIMATEUR_PERMISSIONS: UserPermissions = {
  gestionBeneficiaires: false,
  lectureBeneficiaires: false,
  gestionPlanning: false,
  lecturePlanning: true,
  saisieAbsences: true,
  emettreConvocations: false,
  resoudreConvocations: false,
  imprimerRapports: false,
  gestionParametrage: false,
  gestionUtilisateurs: false,
};

export const DEFAULT_READONLY_PERMISSIONS: UserPermissions = {
  gestionBeneficiaires: false,
  lectureBeneficiaires: true,
  gestionPlanning: false,
  lecturePlanning: true,
  saisieAbsences: false,
  emettreConvocations: false,
  resoudreConvocations: false,
  imprimerRapports: true,
  gestionParametrage: false,
  gestionUtilisateurs: false,
};

export const DEFAULT_COORDONNATEUR_PERMISSIONS: UserPermissions = {
  gestionBeneficiaires: true,
  lectureBeneficiaires: true,
  gestionPlanning: true,
  lecturePlanning: true,
  saisieAbsences: true,
  emettreConvocations: true,
  resoudreConvocations: true,
  imprimerRapports: true,
  gestionParametrage: false,
  gestionUtilisateurs: false,
};

export const DEFAULT_BENEFICIAIRE_PERMISSIONS: UserPermissions = {
  gestionBeneficiaires: false,
  lectureBeneficiaires: false,
  gestionPlanning: false,
  lecturePlanning: false,
  saisieAbsences: false,
  emettreConvocations: false,
  resoudreConvocations: false,
  imprimerRapports: false,
  gestionParametrage: false,
  gestionUtilisateurs: false,
};

export function getDefaultPermissionsForRole(role: Role): UserPermissions {
  if (role === 'admin') {
    return { ...DEFAULT_ADMIN_PERMISSIONS };
  }
  if (role === 'consultation') {
    return { ...DEFAULT_READONLY_PERMISSIONS };
  }
  if (role === 'beneficiaire') {
    return { ...DEFAULT_BENEFICIAIRE_PERMISSIONS };
  }
  return { ...DEFAULT_ANIMATEUR_PERMISSIONS };
}

export function getUserPermissions(user: User | null | undefined): UserPermissions {
  if (!user) {
    return { ...DEFAULT_READONLY_PERMISSIONS };
  }
  if (user.permissions) {
    return {
      // Fallback for any potentially missing keys in legacy objects
      ...getDefaultPermissionsForRole(user.role),
      ...user.permissions,
    };
  }
  return getDefaultPermissionsForRole(user.role);
}

export interface PermissionMeta {
  key: keyof UserPermissions;
  labelFr: string;
  labelAr: string;
  descFr: string;
  descAr: string;
  category: 'beneficiaires' | 'planning' | 'absences' | 'convocations' | 'impressions' | 'admin';
  categoryLabelFr: string;
  categoryLabelAr: string;
}

export const PERMISSION_METAS: PermissionMeta[] = [
  {
    key: 'lectureBeneficiaires',
    labelFr: 'Consulter les bénéficiaires',
    labelAr: 'الاطلاع على المستفيدين',
    descFr: 'Accès en lecture à la liste et aux fiches des apprenants',
    descAr: 'الاطلاع على لائحة المستفيدين وبطاقاتهم الفردية',
    category: 'beneficiaires',
    categoryLabelFr: 'Bénéficiaires',
    categoryLabelAr: 'المستفيدون'
  },
  {
    key: 'gestionBeneficiaires',
    labelFr: 'Gérer les bénéficiaires',
    labelAr: 'إدارة المستفيدين',
    descFr: 'Inscrire, modifier, archiver et supprimer des dossiers de bénéficiaires',
    descAr: 'تسجيل، تعديل، أرشفة وحذف ملفات المستفيدين',
    category: 'beneficiaires',
    categoryLabelFr: 'Bénéficiaires',
    categoryLabelAr: 'المستفيدون'
  },
  {
    key: 'lecturePlanning',
    labelFr: 'Consulter le planning',
    labelAr: 'الاطلاع على جدول الحصص',
    descFr: 'Visualiser l\'emploi du temps et les créneaux de cours',
    descAr: 'معاينة جدول الحصص والتوزيع الأسبوعي',
    category: 'planning',
    categoryLabelFr: 'Planning & Séances',
    categoryLabelAr: 'الحصص والجدول'
  },
  {
    key: 'gestionPlanning',
    labelFr: 'Planifier & modifier les séances',
    labelAr: 'تعديل وبرمجة الحصص',
    descFr: 'Créer, éditer, déplacer et reprogrammer les séances de formation',
    descAr: 'برمجة وتعديل وإلغاء وتوزيع الحصص التدريبية',
    category: 'planning',
    categoryLabelFr: 'Planning & Séances',
    categoryLabelAr: 'الحصص والجدول'
  },
  {
    key: 'saisieAbsences',
    labelFr: 'Pointer les présences & absences',
    labelAr: 'تسجيل الحضور والغياب',
    descFr: 'Accès au formulaire d\'émargement et pointage en direct',
    descAr: 'مسك وتسجيل الحضور والغياب خلال الحصص',
    category: 'absences',
    categoryLabelFr: 'Assiduité & Absences',
    categoryLabelAr: 'المواظبة والغياب'
  },
  {
    key: 'emettreConvocations',
    labelFr: 'Émettre des convocations administratives',
    labelAr: 'إصدار استدعاءات إدارية',
    descFr: 'Convoquer les élèves en cas d\'absences répétées',
    descAr: 'توجيه استدعاءات للمستفيدين بسبب تكرار الغياب',
    category: 'convocations',
    categoryLabelFr: 'Convocations',
    categoryLabelAr: 'الاستدعاءات الإدارية'
  },
  {
    key: 'resoudreConvocations',
    labelFr: 'Clôturer & valider les convocations',
    labelAr: 'تسوية وإغلاق الاستدعاءات',
    descFr: 'Enregistrer la décision administrative et lever la convocation',
    descAr: 'تسجيل القرار الإداري وإغلاق ملف الاستدعاء بعد الحضور',
    category: 'convocations',
    categoryLabelFr: 'Convocations',
    categoryLabelAr: 'الاستدعاءات الإدارية'
  },
  {
    key: 'imprimerRapports',
    labelFr: 'Imprimer rapports & feuilles d\'émargement',
    labelAr: 'طباعة التقارير ولوائح التوقيع',
    descFr: 'Générer les documents officiels aux normes marocaines',
    descAr: 'طباعة لوائح التوقيع الرسمية والتقارير الدورية للمركز',
    category: 'impressions',
    categoryLabelFr: 'Rapports & Documents',
    categoryLabelAr: 'التقارير والوثائق'
  },
  {
    key: 'gestionParametrage',
    labelFr: 'Paramétrage du centre & filières',
    labelAr: 'إعدادات المركز والشعب',
    descFr: 'Modifier les informations officielles, filières, classes et motifs',
    descAr: 'تعديل بيانات المركز الرسمية، الشعب، الفصول وأسباب الغياب',
    category: 'admin',
    categoryLabelFr: 'Administration & Système',
    categoryLabelAr: 'النظام والإدارة'
  },
  {
    key: 'gestionUtilisateurs',
    labelFr: 'Gérer les comptes & droits d\'accès',
    labelAr: 'إدارة حسابات المستخدمين وصلاحياتهم',
    descFr: 'Créer des comptes, réinitialiser les accès et configurer les permissions',
    descAr: 'إنشاء حسابات المستخدمين، تفعيل/تعطيل الحسابات وتعديل الصلاحيات',
    category: 'admin',
    categoryLabelFr: 'Administration & Système',
    categoryLabelAr: 'النظام والإدارة'
  }
];
