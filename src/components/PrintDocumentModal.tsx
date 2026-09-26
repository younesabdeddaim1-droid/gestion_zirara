import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Beneficiaire, Seance, Classe, BilletRetard } from '../types';
import { Printer, X, Download, School, Check, UserCheck, ShieldCheck } from 'lucide-react';
import moroccanSeal from '../assets/images/moroccan_school_seal_1790038897812.jpg';
import cmedLogo from '../assets/images/cmed_logo.jpeg';

export const PrintDocumentModal: React.FC = () => {
  const { currentUser } = useAuth();
  const {
    printModal,
    closePrintModal,
    settings,
    getFiliereById,
    getClasseById,
    getUserById,
    getMotifById,
    beneficiaires,
    absences,
    convocations,
    t
  } = useApp();

  if (!printModal.isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const currentDate = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const renderFicheBeneficiaire = (b: Beneficiaire) => {
    const filiere = getFiliereById(b.filiereId);
    const classe = getClasseById(b.classeId);
    const printedDate = new Date().toLocaleDateString('fr-FR');
    const printedTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    return (
      <div className="max-w-4xl mx-auto bg-white p-2 sm:p-4 text-slate-800 space-y-6 print:p-0 select-none">
        {/* Modern Header Section */}
        <div className="flex items-center justify-between border-b-2 border-emerald-600 pb-4 gap-4">
          {/* Sceau National Maroc */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden shrink-0 border border-slate-200 bg-white flex items-center justify-center p-1 shadow-2xs">
            <img
              src={moroccanSeal}
              alt="Sceau National Maroc"
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="text-center flex-1 space-y-1">
            <h1 className="text-xs sm:text-sm font-black text-emerald-800 uppercase tracking-tight leading-none">
              مركز الفرصة الثانية – الجيل الجديد زرارة
            </h1>
            <p className="text-[9px] sm:text-[10px] font-bold text-slate-600 tracking-wider">
              CENTRE DE DEUXIÈME CHANCE – NOUVELLE GÉNÉRATION ZIRARA
            </p>
            <div className="h-0.5 bg-gradient-to-r from-transparent via-emerald-600 to-transparent w-24 mx-auto my-1.5"></div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center justify-center gap-2">
              <span className="text-emerald-700">البطاقة الفردية للمستفيد</span>
              <span className="text-slate-300">|</span>
              <span>FICHE INDIVIDUELLE</span>
            </h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              SUIVI INTÉGRÉ • DOSSIER SCOLAIRE • ANNÉE {settings.anneeScolaireCourante || '2026-2027'}
            </p>
          </div>

          {/* CMED Logo */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden shrink-0 border border-slate-200 bg-white flex items-center justify-center p-1 shadow-2xs">
            <img
              src={cmedLogo}
              alt="CMED Logo"
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        {/* Master Two-Column Grid (Main info left, Photo/QR right) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
          
          {/* LEFT/MAIN SIDE: Structured Bilingual Blocks (Spans 3 cols) */}
          <div className="md:col-span-3 space-y-5">
            
            {/* Block 1: Identité / الهوية */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white">
              <div className="bg-slate-50 border-b border-slate-100 px-4 py-2 flex items-center justify-between text-slate-900">
                <span className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider">1. IDENTIFICATION ET ETAT CIVIL</span>
                <span className="text-xs font-bold text-slate-800 font-sans">1. الحالة المدنية والهوية</span>
              </div>
              <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-3.5 text-xs">
                <div className="border-b border-slate-50 pb-2 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 font-semibold block">Nom complet (FR) / الاسم الكامل</span>
                  <span className="text-sm font-extrabold text-slate-900 uppercase">{b.nomFr} {b.prenomFr}</span>
                </div>
                <div className="border-b border-slate-50 pb-2 flex flex-col justify-between text-right">
                  <span className="text-[10px] text-slate-400 font-semibold block">الاسم والنسب الكامل بالعربية</span>
                  <span className="text-sm font-bold text-emerald-950 font-sans">{b.nomAr} {b.prenomAr}</span>
                </div>

                <div className="border-b border-slate-50 pb-2 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 font-semibold block">Sexe / الجنس</span>
                  <span className="text-xs font-extrabold text-slate-800">
                    {b.sexe === 'M' ? '☒ ذكــر / Masculin' : '☐ ذكــر / Masculin'} &nbsp;&nbsp;&nbsp;&nbsp; {b.sexe === 'F' ? '☒ أنثــى / Féminin' : '☐ أنثــى / Féminin'}
                  </span>
                </div>
                <div className="border-b border-slate-50 pb-2 flex flex-col justify-between text-right">
                  <span className="text-[10px] text-slate-400 font-semibold block">تاريخ الازدياد / Date de naissance</span>
                  <span className="text-xs font-bold text-slate-800 font-mono">
                    {b.dateNaissance ? b.dateNaissance.split('-').reverse().join(' / ') : '…… / …… / …………'}
                  </span>
                </div>

                <div className="col-span-2 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 font-semibold block">Lieu de naissance / مكان الازدياد</span>
                  <span className="text-xs font-bold text-slate-800">{b.lieuNaissance || 'Non spécifié / غير محدد'}</span>
                </div>
              </div>
            </div>

            {/* Block 2: Formation / التكوين والشعبة */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white">
              <div className="bg-slate-50 border-b border-slate-100 px-4 py-2 flex items-center justify-between text-slate-900">
                <span className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider">2. PARCOURS SCOLAIRE ET FORMATION</span>
                <span className="text-xs font-bold text-slate-800 font-sans">2. المسار الدراسي والتكوين المتبع</span>
              </div>
              <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-3.5 text-xs">
                <div className="border-b border-slate-50 pb-2">
                  <span className="text-[10px] text-slate-400 font-semibold block">Niveau d'étude / المستوى التعليمي</span>
                  <span className="text-xs font-extrabold text-slate-900">{b.niveau}</span>
                </div>
                <div className="border-b border-slate-50 pb-2 text-right">
                  <span className="text-[10px] text-slate-400 font-semibold block">الشعبة والمسلك / Filière</span>
                  <span className="text-xs font-bold text-emerald-800 font-sans">
                    {filiere ? `${filiere.nomFr} (${filiere.nomAr})` : 'Non spécifiée / غير محددة'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block">Classe pédagogique / القسم المدمج</span>
                  <span className="text-xs font-extrabold text-slate-900">
                    {classe ? `${classe.nomFr} (${classe.code})` : 'Aucun قسم'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-semibold block">الفوج / Groupe d'apprenants</span>
                  <span className="text-xs font-bold text-slate-800">
                    {classe ? `Groupe G${classe.code.slice(-1)}` : 'Non défini / غير محدد'}
                  </span>
                </div>
              </div>
            </div>

            {/* Block 3: Coordonnées / العناوين والاتصال */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white">
              <div className="bg-slate-50 border-b border-slate-100 px-4 py-2 flex items-center justify-between text-slate-900">
                <span className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider">3. COORDONNÉES ET ACCESSIBILITÉ</span>
                <span className="text-xs font-bold text-slate-800 font-sans">3. معلومات الاتصال والعنوان الرئيسي</span>
              </div>
              <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-3.5 text-xs">
                <div className="col-span-2 border-b border-slate-50 pb-2">
                  <span className="text-[10px] text-slate-400 font-semibold block">Adresse postale / العنوان السكني للولي</span>
                  <span className="text-xs font-semibold text-slate-800">{b.adresse || 'Adresse non spécifiée / العنوان غير محدد'}</span>
                </div>

                <div className="col-span-2 grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block">Téléphone 1 (Principal) / الهاتف الرئيسي</span>
                    <span className="text-sm font-black text-emerald-800 font-mono">{b.telephone || 'Non disponible / غير متوفر'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block">Téléphone 2 (WhatsApp) / هاتف الواتساب</span>
                    <span className="text-sm font-black text-emerald-800 font-mono">{b.telephone2 || '—'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Block 4: Situation & Observations */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white">
              <div className="bg-slate-50 border-b border-slate-100 px-4 py-2 flex items-center justify-between text-slate-900">
                <span className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider">4. SITUATION ADMINISTRATIVE & OBSERVATIONS</span>
                <span className="text-xs font-bold text-slate-800 font-sans">4. الوضعية الإدارية والملاحظات التربوية</span>
              </div>
              <div className="p-4 space-y-3 text-xs">
                <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Date d'inscription / تاريخ التسجيل</span>
                    <p className="text-xs font-extrabold text-slate-800 mt-0.5">{b.dateInscription}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Statut scolaire / الوضعية</span>
                    <p className={`text-xs font-black px-2.5 py-0.5 rounded-full mt-0.5 inline-block ${
                      b.statut === 'Actif' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'
                    }`}>
                      {b.statut === 'Actif' ? 'مستفيد نشيط / Actif' : 'غير نشيط / Inactif'}
                    </p>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">Observations pédagogiques / ملاحظات حول التتبع الفردي</span>
                  <p className="text-xs text-slate-700 italic bg-amber-50/20 border border-amber-200/40 p-3 rounded-lg leading-relaxed min-h-[44px]">
                    {b.observation || 'Aucune observation enregistrée à ce jour pour ce bénéficiaire / لا توجد ملاحظات مسجلة حاليا.'}
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT SIDEBAR: Photo, Code Massar Tag, QR Code (Spans 1 col) */}
          <div className="md:col-span-1 flex flex-col items-center gap-5 md:sticky md:top-4">
            
            {/* Elegant Portrait Frame Placeholder */}
            <div className="w-full max-w-[160px] aspect-3/4 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center p-4 text-center shadow-2xs relative group">
              <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 mb-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <span className="text-[11px] font-bold text-slate-700">صورة المستفيد</span>
              <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-tight mt-0.5">Photo de l'élève</span>
              <div className="absolute inset-0 border border-slate-200 rounded-xl pointer-events-none"></div>
            </div>

            {/* Prominent Code Massar badge */}
            <div className="w-full bg-slate-900 text-white rounded-xl p-3 text-center border border-slate-800 shadow-xs">
              <span className="text-[9px] font-extrabold text-emerald-400 uppercase tracking-widest block mb-0.5">رمز مسار / CODE MASSAR</span>
              <span className="text-sm font-black font-mono tracking-wider block">
                {b.codeMassar}
              </span>
            </div>

            {/* Dynamic QR Code */}
            <div className="w-full bg-white rounded-xl border border-slate-200 p-3 flex flex-col items-center gap-2 shadow-2xs">
              <div className="w-24 h-24 p-1 border-2 border-emerald-600 rounded-lg bg-white flex items-center justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(b.codeMassar)}`}
                  alt={`QR Code Massar ${b.codeMassar}`}
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Fiche Numérique QR</span>
            </div>

          </div>

        </div>

        {/* Footer info: Date of print + current user */}
        <div className="pt-4 border-t border-dashed border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-400 gap-2">
          <p className="font-sans" dir="rtl">
            تم استخراج هذه البطاقة بتاريخ <span className="font-bold font-mono">{printedDate}</span> على الساعة <span className="font-bold font-mono">{printedTime}</span> من طرف <span className="font-bold">{currentUser?.nomComplet || 'الإدارة التربوية'}</span>
          </p>
          <p className="font-semibold text-right">
            Fiche éditée le <span className="font-bold font-mono">{printedDate}</span> à <span className="font-bold font-mono">{printedTime}</span> par <span className="font-bold">{currentUser?.nomComplet || 'Équipe Pédagogique'}</span>
          </p>
        </div>
      </div>
    );
  };

  const renderFeuilleEmargement = (seance: Seance) => {
    const sClassIds = seance.classeIds && seance.classeIds.length > 0
      ? seance.classeIds
      : (seance.classeId ? [seance.classeId] : []);
    const sClasses = sClassIds.map(cid => getClasseById(cid)).filter(Boolean) as Classe[];
    const filiere = getFiliereById(seance.filiereId);
    const animateur = getUserById(seance.animateurId);

    const activeStudents = beneficiaires.filter(
      b => b.statut === 'Actif' && sClassIds.includes(b.classeId)
    );
    const sessionAbsences = absences.filter(a => a.seanceId === seance.id);

    return (
      <div className="space-y-6">
        <div className="text-center border-b pb-4">
          <h2 className="text-lg font-extrabold uppercase text-slate-900 tracking-wider">
            {t.officialPresenceSheet}
          </h2>
          <p className="text-xs font-semibold text-emerald-800 mt-1">
            Centre de Deuxième Chance Zirara • Année scolaire {settings.anneeScolaireCourante || '2026-2027'} • Séance : {seance.intitule}
          </p>
        </div>

        {/* Session Details Header */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border p-3 rounded-lg bg-slate-50">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Date & Horaire</span>
            <span className="font-bold text-slate-900">{seance.date} • {seance.heureDebut} - {seance.heureFin}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Filière / Classes</span>
            <span className="font-bold text-slate-900">
              {filiere?.code} - {sClasses.map(c => c.nomFr).join(', ') || 'Classe'}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Animateur / Formateur</span>
            <span className="font-bold text-slate-900">{animateur?.nomComplet}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Salle / Atelier</span>
            <span className="font-bold text-slate-900">{seance.salle || 'Atelier'}</span>
          </div>
        </div>

        {/* Students Table */}
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100 border-b text-[10px] font-bold uppercase text-slate-700">
              <tr>
                <th className="py-2 px-3">N°</th>
                <th className="py-2 px-3">Code Massar</th>
                <th className="py-2 px-3">Nom & Prénom</th>
                <th className="py-2 px-3">Classe</th>
                <th className="py-2 px-3 text-right">الاسم والنسب</th>
                <th className="py-2 px-3 text-center">Présence</th>
                <th className="py-2 px-3">Motif / Observation</th>
                <th className="py-2 px-3 text-center">Émargement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {activeStudents.map((b, idx) => {
                const rec = sessionAbsences.find(a => a.beneficiaireId === b.id);
                const isPresent = rec ? rec.statut === 'Present' : true;
                const motif = rec?.motifId ? getMotifById(rec.motifId) : null;
                const classeBen = getClasseById(b.classeId);

                return (
                  <tr key={b.id} className={!isPresent ? 'bg-amber-50/50' : ''}>
                    <td className="py-2 px-3 text-slate-500 font-mono">{idx + 1}</td>
                    <td className="py-2 px-3 font-mono font-semibold">{b.codeMassar}</td>
                    <td className="py-2 px-3 font-semibold">{b.nomFr} {b.prenomFr}</td>
                    <td className="py-2 px-3 font-bold text-slate-700 text-[11px]">{classeBen?.nomFr || '—'}</td>
                    <td className="py-2 px-3 font-sans text-right">{b.nomAr} {b.prenomAr}</td>
                    <td className="py-2 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isPresent ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {isPresent ? 'PRÉSENT' : 'ABSENT'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-600">
                      {motif ? motif.libelleFr : (rec?.note || '—')}
                    </td>
                    <td className="py-2 px-3 text-center border-l w-24">
                      {/* Signature line placeholder */}
                      <span className="block border-b border-dashed border-slate-300 w-16 mx-auto h-4" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-8 pt-6 border-t text-xs">
          <div className="border p-4 rounded h-28 flex flex-col justify-between">
            <span className="font-bold text-slate-700">Signature de l'Animateur ({animateur?.nomComplet})</span>
            <span className="text-[10px] text-slate-400">Date et heure de transmission</span>
          </div>
          <div className="border p-4 rounded h-28 flex flex-col justify-between text-right">
            <span className="font-bold text-slate-700">{t.signatureDirection}</span>
            <span className="text-[10px] text-slate-400">Cachet officiel</span>
          </div>
        </div>
      </div>
    );
  };

  const renderRapportGlobal = () => {
    // Strictly exclude inactifs
    const activeBeneficiaires = beneficiaires.filter(b => b.statut === 'Actif');
    const activeBeneficiaireMap = new Map<string, Beneficiaire>();
    activeBeneficiaires.forEach(b => activeBeneficiaireMap.set(b.id, b));

    const totalActifs = activeBeneficiaires.length;
    const totalActifsMas = activeBeneficiaires.filter(b => b.sexe === 'M').length;
    const totalActifsFem = activeBeneficiaires.filter(b => b.sexe === 'F').length;

    // Absences for active beneficiaries
    const activeAbsences = absences.filter(a => activeBeneficiaireMap.has(a.beneficiaireId));
    const totalPresents = activeAbsences.filter(a => a.statut === 'Present').length;
    const totalAbsents = activeAbsences.filter(a => a.statut === 'Absent').length;

    // Pending convocations for active beneficiaries only
    const pendingConvs = convocations
      .filter(c => c.statut === 'En attente' && activeBeneficiaireMap.has(c.beneficiaireId))
      .map(c => {
        const b = activeBeneficiaireMap.get(c.beneficiaireId)!;
        const filiere = getFiliereById(b.filiereId);
        const classe = getClasseById(b.classeId);
        return {
          convocation: c,
          beneficiaire: b,
          filiereNomFr: filiere?.nomFr || 'N/A',
          filiereNomAr: filiere?.nomAr || '',
          classeNomFr: classe?.nomFr || 'N/A',
          classeNomAr: classe?.nomAr || '',
          classeCode: classe?.code || ''
        };
      });

    return (
      <div className="space-y-6">
        <div className="text-center border-b pb-4">
          <h2 className="text-lg font-extrabold uppercase text-slate-900 tracking-wider">
            {t.officialAbsenceReport}
          </h2>
          <p className="text-xs text-slate-600 mt-1 font-semibold">
            Centre de Deuxième Chance – Nouvelle Génération ZIRARA • Année scolaire {settings.anneeScolaireCourante || '2026-2027'}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Émis par : <strong>{currentUser?.nomComplet}</strong> le {currentDate}
          </p>
        </div>

        {/* KPI Summary with Real-Time & Mas-Fem totals */}
        <div className="grid grid-cols-3 gap-3 text-center text-xs">
          <div className="border p-3 rounded-lg bg-slate-50">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Bénéficiaires Actifs</span>
            <span className="text-2xl font-extrabold text-blue-700">{totalActifs}</span>
            <span className="block text-[10px] text-slate-600 mt-1 font-semibold">
              Mas : {totalActifsMas} • Fem : {totalActifsFem}
            </span>
          </div>
          <div className="border p-3 rounded-lg bg-emerald-50/50 border-emerald-200">
            <span className="text-[10px] font-bold text-emerald-800 uppercase block">Présents (Pointages)</span>
            <span className="text-2xl font-extrabold text-emerald-700">{totalPresents}</span>
            <span className="block text-[10px] text-emerald-700 mt-1 font-semibold">
              Actifs uniquement
            </span>
          </div>
          <div className="border p-3 rounded-lg bg-amber-50/50 border-amber-200">
            <span className="text-[10px] font-bold text-amber-800 uppercase block">Absents constatés</span>
            <span className="text-2xl font-extrabold text-amber-700">{totalAbsents}</span>
            <span className="block text-[10px] text-amber-700 mt-1 font-semibold">
              Suivi d'assiduité
            </span>
          </div>
        </div>

        {/* Convocations Table separated by Filière and Classe with FR + AR names */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-rose-950">
              ÉLÈVES CONVOQUÉS À L’ADMINISTRATION ({pendingConvs.length})
            </h3>
            <span className="text-[10px] text-slate-500 font-semibold">
              Nom + Prénom en FR & AR • Séparés par Filière et Classe
            </span>
          </div>

          {pendingConvs.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-3 text-center border rounded-lg bg-slate-50">
              Aucune convocation administrative en attente.
            </p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-100 border-b text-[10px] font-bold uppercase text-slate-700">
                  <tr>
                    <th className="py-2.5 px-3">Bénéficiaire (FR & AR)</th>
                    <th className="py-2.5 px-3">Code Massar</th>
                    <th className="py-2.5 px-3">Filière & Classe</th>
                    <th className="py-2.5 px-3">Date convocation</th>
                    <th className="py-2.5 px-3">Motif & Observations</th>
                    <th className="py-2.5 px-3">Décision de la direction</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {pendingConvs.map(({ convocation, beneficiaire, filiereNomFr, filiereNomAr, classeNomFr, classeNomAr, classeCode }) => (
                    <tr key={convocation.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold">
                        <div className="text-slate-900 font-bold">{beneficiaire.nomFr} {beneficiaire.prenomFr}</div>
                        <div className="text-emerald-800 font-sans text-xs" dir="rtl">{beneficiaire.nomAr} {beneficiaire.prenomAr}</div>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-700">{beneficiaire.codeMassar}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900">{filiereNomFr}</div>
                        <div className="text-[10px] text-slate-600 font-medium">Classe : {classeNomFr} ({classeCode})</div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{convocation.dateConvocation}</td>
                      <td className="py-2.5 px-3 text-rose-900 font-medium">{convocation.motif}</td>
                      <td className="py-2.5 px-3 text-slate-500 italic text-[11px]">En attente d'entretien</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-8 pt-8 mt-6 border-t text-xs">
          <div className="border p-4 rounded h-28 flex flex-col justify-between">
            <span className="font-bold text-slate-700">Coordinateur Pédagogique</span>
            <span className="text-[10px] text-slate-400">Date et visa</span>
          </div>
          <div className="border p-4 rounded h-28 flex flex-col justify-between text-right">
            <span className="font-bold text-slate-700">{t.signatureDirection}</span>
            <span className="text-[10px] text-slate-400">Cachet officiel et visa</span>
          </div>
        </div>
      </div>
    );
  };

  const renderBilletEntree = (data: any) => {
    // Extract payload or fallback
    const ben: Beneficiaire | null = data?.beneficiaire || (data?.nomFr ? data : null);
    const record = data?.record;
    const seance: Seance | null = data?.seance || null;
    const filiere = data?.filiere || (ben ? getFiliereById(ben.filiereId) : null);
    const classe = data?.classe || (ben ? getClasseById(ben.classeId) : null);

    const type = data?.computedType || (record?.statut === 'Retard' ? 'Retard' : 'Absent');
    const motif = data?.computedMotif || record?.motifLabel || 'Maladie';
    const duree = record?.dureeRetardMinutes || 15;
    const dateStr = record?.dateSaisie || seance?.date || currentDate;

    // Format Billet Individuel : 1 seul exemplaire (19cm x 5cm)
    const ticketStrips = [1];

    return (
      <div className="space-y-4 select-none">
        <div className="no-print bg-blue-50 border border-blue-200 p-3 rounded-xl text-xs text-blue-900 flex items-center justify-between max-w-[19cm] mx-auto">
          <span className="font-extrabold">📄 Billet Individuel (19 cm × 5 cm)</span>
          <span className="text-[11px] font-bold text-blue-700">1 Exemplaire Unique</span>
        </div>

        <div className="flex flex-col items-center gap-[0.4cm] print:gap-[0.4cm]">
          {ticketStrips.map((stripNum, idx) => (
            <React.Fragment key={stripNum}>
              <div
                style={{ width: '19cm', height: '5cm', boxSizing: 'border-box' }}
                className="ticket-container border-2 border-slate-900 rounded-xl p-2.5 bg-white shadow-2xs relative flex flex-col justify-between overflow-hidden print:shadow-none print:break-inside-avoid text-slate-900"
              >
                {/* Header Strip (Height ~0.8cm) */}
                <div className="flex items-center justify-between border-b border-slate-900 pb-1 gap-1">
                  <div className="text-left leading-tight">
                    <div className="text-[9px] font-black uppercase text-slate-900 truncate max-w-[5.5cm]">
                      {settings.nomCentre}
                    </div>
                    <div className="text-[8px] font-semibold text-emerald-800 truncate max-w-[5.5cm]">
                      {settings.directionProvincialeFr}
                    </div>
                  </div>

                  <div className="text-center px-2 py-0.5 bg-slate-100 rounded border border-slate-300">
                    <span className="block text-[10px] font-black uppercase tracking-wide text-slate-900">
                      🎫 BILLET D'AUTORISATION ET DE REPRISE
                    </span>
                  </div>

                  <div className="text-right font-sans leading-tight" dir="rtl">
                    <div className="text-[9px] font-black text-slate-900 truncate max-w-[5.5cm]">
                      {settings.nomCentreAr || settings.nomCentre}
                    </div>
                    <div className="text-[8px] font-bold text-emerald-800 truncate max-w-[5.5cm]">
                      {settings.directionProvincialeAr}
                    </div>
                  </div>
                </div>

                {/* Body Content Grid (Height ~2.8cm) */}
                <div className="grid grid-cols-3 gap-2 my-1 text-[10px]">
                  {/* Col 1: Student Identification (FR & AR) */}
                  <div className="border-r border-slate-200 pr-1.5 space-y-0.5">
                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Bénéficiaire / المستفيد</div>
                    <div className="font-extrabold uppercase text-[10px] text-slate-900 truncate">
                      {ben?.nomFr} {ben?.prenomFr}
                    </div>
                    <div className="font-bold text-emerald-900 text-[10px] font-sans truncate" dir="rtl">
                      {ben?.nomAr} {ben?.prenomAr}
                    </div>
                    <div className="text-[9px] font-mono text-slate-600 font-bold">
                      Massar: {ben?.codeMassar || '—'}
                    </div>
                  </div>

                  {/* Col 2: Course & Session */}
                  <div className="border-r border-slate-200 pr-1.5 space-y-0.5">
                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Formation & Séance</div>
                    <div className="truncate font-bold text-slate-800 text-[10px]">
                      <span className="text-slate-500 font-normal">Filière:</span> {filiere?.code || filiere?.nomFr || '—'}
                    </div>
                    <div className="truncate font-bold text-slate-800 text-[10px]">
                      <span className="text-slate-500 font-normal">Classe:</span> {classe?.code || classe?.nomFr || '—'}
                    </div>
                    <div className="truncate font-semibold text-slate-800 text-[9px]">
                      {seance?.intitule || 'Séance'} ({dateStr})
                    </div>
                  </div>

                  {/* Col 3: Statut, Durée & Motif */}
                  <div className="space-y-0.5 pl-0.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] font-black text-slate-400 uppercase">Statut:</span>
                        {type === 'Retard' ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                            🟠 RETARD ({duree} min)
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-100 text-rose-900 border border-rose-300">
                            🔴 ABSENT
                          </span>
                        )}
                      </div>
                      <div className="text-[9px] mt-0.5">
                        <span className="text-slate-500 font-bold">Motif:</span> <strong className="text-slate-900">{motif}</strong>
                      </div>
                    </div>

                    <div className="bg-emerald-50 border border-emerald-300 py-0.5 px-1 rounded text-[8px] font-black text-emerald-900 text-center">
                      ✅ AUTORISÉ(E) À RÉINTÉGRER LA CLASSE
                    </div>
                  </div>
                </div>

                {/* Footer Stamp & Visa (Height ~0.8cm) */}
                <div className="pt-1 border-t border-slate-300 flex items-center justify-between text-[8px]">
                  <span className="text-slate-500 font-medium">
                    Année scolaire {settings.anneeScolaireCourante || '2026-2027'} • Exemplaire Unique • Date: {currentDate}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700">Visa & Signature</span>
                    <div className="w-12 h-5 border border-slate-400 rounded bg-slate-50"></div>
                  </div>
                </div>

              </div>

              {/* Dashed Cutting Line between tickets */}
              {idx < ticketStrips.length - 1 && (
                <div className="flex items-center justify-center gap-2 text-[8px] font-mono text-slate-400 select-none w-[19cm] py-0.5">
                  <span className="border-t border-dashed border-slate-400 flex-1"></span>
                  <span className="text-slate-500 font-bold px-1">✂️ Ligne de découpe (19 cm × 5 cm)</span>
                  <span className="border-t border-dashed border-slate-400 flex-1"></span>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  const renderBilletsCollectifs = (data: any) => {
    // Format Billet collectif (Regroupement date + filiere + classe + seance)
    const seance: Seance | null = data?.seance || null;
    const filiere = data?.filiere || (seance ? getFiliereById(seance.filiereId) : null);
    const classe = data?.classe || (seance ? getClasseById(seance.classeId) : null);
    const dateStr = data?.date || seance?.date || currentDate;

    // Array of items or list of beneficiaires
    const items: Array<{
      record?: any;
      beneficiaire: Beneficiaire;
      computedType?: string;
      computedMotif?: string;
    }> = data?.items || (Array.isArray(data) ? data.map(b => ({ beneficiaire: b, computedType: 'Absent', computedMotif: 'Maladie' })) : []);

    const copies = [1, 2, 3];

    return (
      <div className="space-y-4 select-none">
        <div className="no-print bg-blue-50 border border-blue-200 p-3 rounded-xl text-xs text-blue-900 flex items-center justify-between max-w-[19cm] mx-auto">
          <span className="font-extrabold">👥 Billet collectif de groupe ({items.length} bénéficiaires validés)</span>
          <span className="text-[11px] font-bold text-blue-700">Format A4 : 3 billets (19 cm × 5 cm) par page</span>
        </div>

        <div className="flex flex-col items-center gap-[0.4cm] print:gap-[0.4cm]">
          {copies.map((copyNum, idx) => (
            <React.Fragment key={copyNum}>
              <div
                style={{ width: '19cm', height: '5cm', boxSizing: 'border-box' }}
                className="ticket-container border-2 border-slate-900 rounded-xl p-2.5 bg-white shadow-2xs relative flex flex-col justify-between overflow-hidden print:shadow-none print:break-inside-avoid text-slate-900"
              >
                {/* Header Strip */}
                <div className="flex items-center justify-between border-b border-slate-900 pb-1 gap-1">
                  <div className="text-left leading-tight">
                    <div className="text-[9px] font-black uppercase text-slate-900 truncate max-w-[5.5cm]">
                      {settings.nomCentre}
                    </div>
                  </div>

                  <div className="text-center px-2 py-0.5 bg-slate-100 rounded border border-slate-300">
                    <span className="block text-[10px] font-black uppercase tracking-wide text-slate-900">
                      👥 BILLET COLLECTIF DE REPRISE DES COURS
                    </span>
                  </div>

                  <div className="text-right font-sans leading-tight" dir="rtl">
                    <div className="text-[9px] font-black text-slate-900 truncate max-w-[5.5cm]">
                      {settings.nomCentreAr || settings.nomCentre}
                    </div>
                  </div>
                </div>

                {/* Session Bar */}
                <div className="bg-slate-50 border border-slate-200 rounded p-1 my-0.5 flex items-center justify-between text-[9px] font-bold text-slate-800">
                  <span>Filière: <strong className="text-blue-900">{filiere?.code || filiere?.nomFr || '—'}</strong></span>
                  <span>Classe: <strong className="text-blue-900">{classe?.code || classe?.nomFr || '—'}</strong></span>
                  <span>Séance: <strong className="text-blue-900">{seance?.intitule || 'Séance'}</strong></span>
                  <span>Date: <strong className="text-blue-900">{dateStr}</strong></span>
                </div>

                {/* Group Beneficiaries Names (FR + AR) */}
                <div className="overflow-hidden my-0.5 flex-1">
                  <div className="text-[8px] font-black text-slate-400 uppercase mb-0.5">Bénéficiaires Concernés ({items.length}) :</div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[8.5px]">
                    {items.slice(0, 6).map((it, itemIdx) => {
                      const b = it.beneficiaire;
                      const isRetard = it.computedType === 'Retard';
                      return (
                        <div key={itemIdx} className="flex items-center justify-between bg-slate-100 px-1 py-0.5 rounded border border-slate-200 truncate">
                          <span className="font-extrabold text-slate-900 truncate">{itemIdx + 1}. {b?.nomFr} {b?.prenomFr}</span>
                          <span className="font-bold text-emerald-800 font-sans px-1" dir="rtl">{b?.nomAr} {b?.prenomAr}</span>
                          <span className="font-bold text-[8px] text-slate-700">
                            {isRetard ? `🟠 Retard (${it.record?.dureeRetardMinutes || 15}m)` : `🔴 Absent`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer Stamp & Visa */}
                <div className="pt-0.5 border-t border-slate-300 flex items-center justify-between text-[8px]">
                  <span className="text-slate-500 font-medium">
                    Année {settings.anneeScolaireCourante || '2026-2027'} • Ex. {copyNum}/3 • ✅ Bénéficiaires autorisés à réintégrer le cours.
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700">Visa Direction</span>
                    <div className="w-12 h-4 border border-slate-400 rounded bg-slate-50"></div>
                  </div>
                </div>

              </div>

              {/* Dashed Cutting Line between tickets */}
              {idx < copies.length - 1 && (
                <div className="flex items-center justify-center gap-2 text-[8px] font-mono text-slate-400 select-none w-[19cm] py-0.5">
                  <span className="border-t border-dashed border-slate-400 flex-1"></span>
                  <span className="text-slate-500 font-bold px-1">✂️ Ligne de découpe (19 cm × 5 cm)</span>
                  <span className="border-t border-dashed border-slate-400 flex-1"></span>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  const renderBilletRetard = (data: any) => {
    const billet: BilletRetard = data?.billet || data;
    const dateStr = billet?.dateSeance || currentDate;

    return (
      <div className="space-y-4 select-none">
        <div className="no-print bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs text-amber-900 flex items-center justify-between max-w-[19cm] mx-auto">
          <span className="font-extrabold flex items-center gap-1.5">
            <span>🎫</span>
            <span>Billet de Retard Officiel — إذن بالدخول إثر تأخر</span>
          </span>
          <span className="text-[11px] font-bold text-amber-800">Format Standard (19 cm × 6.5 cm)</span>
        </div>

        <div className="flex flex-col items-center">
          <div
            style={{ width: '19cm', minHeight: '6.5cm', boxSizing: 'border-box' }}
            className="ticket-container border-2 border-amber-950 rounded-2xl p-3.5 bg-white shadow-2xs relative flex flex-col justify-between overflow-hidden print:shadow-none print:break-inside-avoid text-slate-900"
          >
            {/* Header Strip */}
            <div className="flex items-center justify-between border-b-2 border-amber-950 pb-2 gap-2">
              <div className="text-left leading-tight">
                <div className="text-[10px] font-black uppercase text-slate-900 truncate max-w-[5.8cm]">
                  {settings.nomCentre}
                </div>
                <div className="text-[8.5px] font-bold text-emerald-800 truncate max-w-[5.8cm]">
                  {settings.directionProvincialeFr}
                </div>
              </div>

              <div className="text-center px-3 py-1 bg-amber-100 rounded-xl border border-amber-400">
                <span className="block text-[11px] font-black uppercase tracking-wide text-amber-950 flex items-center justify-center gap-1">
                  <span>⏱️</span>
                  <span>BILLET DE RETARD / إذن دخول إثر تأخر</span>
                </span>
                <span className="block text-[8px] font-bold text-amber-800 font-mono">
                  Réf : {billet?.id || `BRT-${Date.now()}`}
                </span>
              </div>

              <div className="text-right font-sans leading-tight" dir="rtl">
                <div className="text-[10px] font-black text-slate-900 truncate max-w-[5.8cm]">
                  {settings.nomCentreAr || settings.nomCentre}
                </div>
                <div className="text-[8.5px] font-bold text-emerald-800 truncate max-w-[5.8cm]">
                  {settings.directionProvincialeAr}
                </div>
              </div>
            </div>

            {/* Body Content Grid */}
            <div className="grid grid-cols-3 gap-3 my-2 text-[10.5px]">
              {/* Col 1: Identification de l'Apprenant */}
              <div className="border-r border-slate-200 pr-2 space-y-1">
                <div className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider">
                  Bénéficiaire / المستفيد(ة)
                </div>
                <div className="font-black uppercase text-[11px] text-slate-900 leading-tight">
                  {billet?.nomPrenomFr || 'Nom et Prénom'}
                </div>
                {billet?.nomPrenomAr && (
                  <div className="font-bold text-emerald-950 text-[11px] font-sans" dir="rtl">
                    {billet.nomPrenomAr}
                  </div>
                )}
                <div className="text-[9.5px] font-mono text-slate-700 font-bold bg-slate-100 px-1.5 py-0.5 rounded border inline-block">
                  Massar : {billet?.codeMassar || '—'}
                </div>
              </div>

              {/* Col 2: Filière, Classe & Séance */}
              <div className="border-r border-slate-200 pr-2 space-y-1">
                <div className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider">
                  Scolarité & Séance
                </div>
                <div className="truncate font-bold text-slate-800 text-[10px]">
                  <span className="text-slate-400 font-normal">Filière :</span> {billet?.filiereNom || '—'}
                </div>
                <div className="truncate font-bold text-slate-800 text-[10px]">
                  <span className="text-slate-400 font-normal">Classe :</span> {billet?.classeNom || '—'}
                </div>
                <div className="text-[9.5px] font-semibold text-cyan-900 bg-cyan-50 p-1 rounded border border-cyan-200">
                  📅 {dateStr} • ⏰ {billet?.heureSeance || 'Horaire cours'}
                </div>
              </div>

              {/* Col 3: Détails du Retard & Décision */}
              <div className="space-y-1 pl-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[8.5px] font-black text-slate-400 uppercase">Durée retard :</span>
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-amber-500 text-white shadow-2xs">
                      ⏱️ {billet?.dureeMinutes || 15} MINUTES
                    </span>
                  </div>
                  <div className="text-[9.5px] mt-1 bg-slate-50 p-1 rounded border border-slate-200">
                    <span className="text-slate-500 font-bold">Motif :</span>{' '}
                    <strong className="text-slate-900">{billet?.motif || 'Transport / Retard'}</strong>
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-300 py-1 px-1.5 rounded-lg text-[9px] font-black text-emerald-900 text-center shadow-2xs">
                  ✅ ACCÈS EN CLASSE AUTORISÉ
                </div>
              </div>
            </div>

            {/* Footer Stamp & Visa */}
            <div className="pt-2 border-t border-slate-300 flex items-center justify-between text-[8.5px]">
              <div className="space-y-0.5">
                <span className="text-slate-500 font-medium block">
                  Émis le : <strong>{billet?.dateGeneration || currentDate}</strong> • Par : {billet?.creeParNom || 'Administration'}
                </span>
                <span className="text-[7.5px] text-slate-400 block font-mono">
                  Document officiel Centre 2ème Chance NG Zirara • Envoyé automatiquement dans l'Espace Apprenant
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="font-bold text-slate-700 block">Signature & Cachet</span>
                  <span className="text-[7.5px] text-slate-400">Direction / Formateur</span>
                </div>
                <div className="w-16 h-7 border border-slate-400 rounded-lg bg-slate-50 flex items-center justify-center text-[7px] text-slate-300">
                  Cachet
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  };

  const isTicketDoc = printModal.type === 'billet' || printModal.type === 'billets_collectifs' || printModal.type === 'billet_retard';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0a1a44]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 print:p-0 print:bg-white">
      <div className={`bg-white rounded-3xl w-full shadow-2xl border border-slate-300 overflow-hidden my-6 print-document print:border-none print:shadow-none print:my-0 ${
        isTicketDoc ? 'max-w-[21cm]' : 'max-w-4xl'
      }`}>
        
        {/* Modal Toolbar (hidden on print) */}
        <div className="no-print px-6 py-4 bg-[#0a1a44] border-b border-[#142140] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-[#02b3bb]">
              <Download className="w-4 h-4 text-[#02b3bb]" />
            </div>
            <span className="font-black text-sm tracking-wide">
              {isTicketDoc ? 'Billets d\'Entrée & de Reprise de Cours (19 cm × 5 cm)' : 'Document Officiel — Exportation PDF / Impression'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const prevTitle = document.title;
                document.title = `Impression_${printModal.type}_${currentDate}`;
                handlePrint();
                setTimeout(() => { document.title = prevTitle; }, 1000);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-black text-white bg-white/10 hover:bg-white/20 active:scale-95 transition-all border border-white/10 shadow-2xs min-h-[38px] cursor-pointer"
              title="Ouvrir directement la fenêtre d'impression"
            >
              <Printer className="w-4 h-4 text-[#02b3bb]" />
              <span>🖨️ Imprimer</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const prevTitle = document.title;
                document.title = `Billet_Entree_A4_${currentDate}.pdf`;
                handlePrint();
                setTimeout(() => { document.title = prevTitle; }, 1000);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs sm:text-sm font-black text-white bg-gradient-to-r from-[#02b3bb] to-[#0891b2] hover:from-[#0099a8] hover:to-[#0e7490] active:scale-95 transition-all shadow-md min-h-[38px] cursor-pointer"
              title="Générer le PDF prêt à imprimer / sauvegarder"
            >
              <Download className="w-4 h-4" />
              <span>📄 PDF</span>
            </button>

            <button
              type="button"
              onClick={closePrintModal}
              className="p-2 rounded-2xl text-slate-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all ml-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Content Container */}
        <div className={isTicketDoc ? "p-4 sm:p-6 print:p-0 text-slate-900" : "p-8 sm:p-10 text-slate-900 space-y-6"}>
          
          {/* Institutional Header (for standard documents, excluded for tickets) */}
          {!isTicketDoc && (
            <div className="border-b-2 border-slate-900 pb-5">
              <div className="grid grid-cols-3 items-center text-center">
                
                {/* Left Column (FR) */}
                <div className="text-left space-y-0.5 text-[10px] sm:text-[11px] font-semibold text-slate-800 leading-tight">
                  <p className="font-extrabold">{t.officialHeadingKingdom}</p>
                  <p>{settings.ministereFr}</p>
                  <p>{settings.academieFr}</p>
                  <p>{settings.directionProvincialeFr}</p>
                  <p className="font-bold text-emerald-800 pt-0.5">{settings.nomCentre}</p>
                </div>

                {/* Center Column: Official Centre Emblem */}
                <div className="flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-2xl border-2 border-slate-900 flex flex-col items-center justify-center p-1 bg-slate-50 text-slate-900 shadow-2xs">
                    <School className="w-7 h-7 text-emerald-700" />
                    <span className="text-[8px] font-black uppercase tracking-tighter mt-0.5">
                      E2C-NG
                    </span>
                  </div>
                  <span className="text-[9px] font-bold text-slate-500 mt-1 uppercase">
                    [{t.logoPlaceholder}]
                  </span>
                </div>

                {/* Right Column (AR) */}
                <div className="text-right space-y-0.5 text-[10px] sm:text-[11px] font-semibold text-slate-800 font-sans leading-tight" dir="rtl">
                  <p className="font-extrabold">{t.officialHeadingKingdom}</p>
                  <p>{settings.ministereAr}</p>
                  <p>{settings.academieAr}</p>
                  <p>{settings.directionProvincialeAr}</p>
                  <p className="font-bold text-emerald-800 pt-0.5">{settings.nomCentreAr || settings.nomCentre}</p>
                </div>

              </div>

              {/* Document Meta Line */}
              <div className="mt-4 pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-600">
                <span>
                  {settings.adresse} • Tél : {settings.telephone}
                </span>
                <span>
                  <strong>{t.printDate} :</strong> {currentDate} | <strong>{t.printedBy} :</strong> {currentUser?.nomComplet} ({currentUser?.role === 'admin' ? t.roleAdmin : t.roleAnimateur})
                </span>
              </div>
            </div>
          )}

          {/* Dynamic Body */}
          {printModal.type === 'fiche' && renderFicheBeneficiaire(printModal.data as Beneficiaire)}
          {printModal.type === 'seance' && renderFeuilleEmargement(printModal.data as Seance)}
          {printModal.type === 'rapport' && renderRapportGlobal()}
          {printModal.type === 'billet' && renderBilletEntree(printModal.data as Beneficiaire)}
          {printModal.type === 'billets_collectifs' && renderBilletsCollectifs((printModal.data as Beneficiaire[]) || [])}
          {printModal.type === 'billet_retard' && renderBilletRetard(printModal.data)}

          {/* Document Footer (for standard documents) */}
          {!isTicketDoc && (
            <div className="pt-6 border-t text-center text-[10px] text-slate-500">
              {settings.nomCentre} • Document officiel émis le {currentDate} par {currentUser?.nomComplet}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
