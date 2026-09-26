import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Beneficiaire, Convocation, Classe } from '../types';
import { isBeneficiaireAccessible, isSeanceAccessible } from '../utils/userScope';
import {
  Users,
  UserCheck,
  UserX,
  AlertTriangle,
  Calendar,
  Clock,
  ArrowRight,
  ClipboardList,
  PlusCircle,
  Printer,
  CheckCircle2,
  AlertCircle,
  User as UserIcon,
  ShieldCheck,
  GraduationCap,
  Layers,
  ChevronRight,
  Search,
  Filter,
  FileText,
  School
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { currentUser, isAdmin, isAnimateur } = useAuth();
  const {
    t,
    totals,
    seances,
    absences,
    convocations,
    beneficiaires,
    setActiveModule,
    openPrintModal,
    getClasseById,
    getFiliereById,
    getUserById,
    getBeneficiaireById,
    resolveConvocation,
    askConfirmation,
    showToast,
    settings,
    isRtl
  } = useApp();

  const todayStr = new Date().toISOString().split('T')[0];

  // Search & filter state for convocations
  const [convocationFiliereFilter, setConvocationFiliereFilter] = useState<string>('all');
  const [convocationSearch, setConvocationSearch] = useState<string>('');

  // 1. ÉLÈVES CONVOQUÉS À L'ADMINISTRATION
  // Must exclude inactifs, show French + Arabic name, separated by Filière and Classe
  const activeConvocations = useMemo(() => {
    // Only pending convocations
    const pending = convocations.filter(c => c.statut === 'En attente');
    
    // Join with active beneficiary
    const enriched: Array<{
      convocation: Convocation;
      beneficiaire: Beneficiaire;
      filiereNomFr: string;
      filiereNomAr: string;
      filiereCode: string;
      classeNomFr: string;
      classeNomAr: string;
      classeCode: string;
    }> = [];

    pending.forEach(c => {
      const ben = beneficiaires.find(b => b.id === c.beneficiaireId);
      // Strictly exclude inactifs and non-accessible
      if (!ben || ben.statut !== 'Actif' || !isBeneficiaireAccessible(ben, currentUser)) return;

      const filiere = getFiliereById(ben.filiereId);
      const classe = getClasseById(ben.classeId);

      enriched.push({
        convocation: c,
        beneficiaire: ben,
        filiereNomFr: filiere?.nomFr || 'Filière non spécifiée',
        filiereNomAr: filiere?.nomAr || 'شعبة غير محددة',
        filiereCode: filiere?.code || 'N/A',
        classeNomFr: classe?.nomFr || 'Classe',
        classeNomAr: classe?.nomAr || 'فصل',
        classeCode: classe?.code || 'N/A'
      });
    });

    return enriched;
  }, [convocations, beneficiaires, getFiliereById, getClasseById, currentUser]);

  // Grouped by Filière / Classe
  const groupedConvocations = useMemo(() => {
    let filtered = activeConvocations;

    if (convocationFiliereFilter !== 'all') {
      filtered = filtered.filter(item => item.beneficiaire.filiereId === convocationFiliereFilter);
    }

    if (convocationSearch.trim()) {
      const q = convocationSearch.toLowerCase();
      filtered = filtered.filter(item => {
        const nomFr = `${item.beneficiaire.nomFr} ${item.beneficiaire.prenomFr}`.toLowerCase();
        const nomAr = `${item.beneficiaire.nomAr} ${item.beneficiaire.prenomAr}`.toLowerCase();
        const massar = item.beneficiaire.codeMassar.toLowerCase();
        return nomFr.includes(q) || nomAr.includes(q) || massar.includes(q);
      });
    }

    // Grouping by "filiereId_classeId"
    const groups: {
      [key: string]: {
        filiereNomFr: string;
        filiereNomAr: string;
        filiereCode: string;
        classeNomFr: string;
        classeNomAr: string;
        classeCode: string;
        items: typeof activeConvocations;
      };
    } = {};

    filtered.forEach(item => {
      const key = `${item.beneficiaire.filiereId}__${item.beneficiaire.classeId}`;
      if (!groups[key]) {
        groups[key] = {
          filiereNomFr: item.filiereNomFr,
          filiereNomAr: item.filiereNomAr,
          filiereCode: item.filiereCode,
          classeNomFr: item.classeNomFr,
          classeNomAr: item.classeNomAr,
          classeCode: item.classeCode,
          items: []
        };
      }
      groups[key].items.push(item);
    });

    return groups;
  }, [activeConvocations, convocationFiliereFilter, convocationSearch]);

  // Unique filieres in convocations for filter dropdown
  const uniqueFilieresInConvocations = useMemo(() => {
    const map = new Map<string, string>();
    activeConvocations.forEach(c => {
      map.set(c.beneficiaire.filiereId, c.filiereNomFr);
    });
    return Array.from(map.entries()).map(([id, nom]) => ({ id, nom }));
  }, [activeConvocations]);

  // Today sessions based on current user role & scope
  const todaySessions = useMemo(() => {
    return seances
      .filter(s => s.date === todayStr)
      .filter(s => isSeanceAccessible(s, currentUser));
  }, [seances, todayStr, currentUser]);

  return (
    <div className="space-y-6">

      {/* Modern 2026 Header Banner with School Year (Canva Tech Style) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-2xs relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0a1a44] via-[#02b3bb] to-[#57e4ff]" />

        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-[#02b3bb] shrink-0 shadow-2xs">
            <School className="w-6 h-6 text-[#02b3bb]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-black text-[#0a1a44] tracking-tight">
                Tableau de Bord Pédagogique & Assiduité
              </h1>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-cyan-50 text-[#0a1a44] border border-cyan-200 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[#02b3bb]" />
                Année {settings.anneeScolaireCourante || '2026-2027'}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Centre de Deuxième Chance Nouvelle Génération Zirara • Suivi quotidien en temps réel
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isAdmin && (
            <button
              type="button"
              onClick={() => openPrintModal('rapport')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-extrabold text-[#0a1a44] bg-white hover:bg-slate-50 border border-slate-300 shadow-2xs hover:shadow-xs transition-all cursor-pointer active:scale-95"
            >
              <FileText className="w-3.5 h-3.5 text-[#02b3bb]" />
              <span>Rapport d'assiduité</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. SECTION PRIORITAIRE EN HAUT : ÉLÈVES CONVOQUÉS À L'ADMINISTRATION     */}
      {/* ========================================================================= */}
      <section id="section-convocations" className="bg-white rounded-3xl border-2 border-rose-200 shadow-sm overflow-hidden scroll-mt-24">
        
        {/* Section Header */}
        <div className="bg-rose-50/80 border-b border-rose-100 px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-xs shrink-0 animate-pulse">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-rose-950 uppercase tracking-tight">
                  ÉLÈVES CONVOQUÉS À L’ADMINISTRATION
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-600 text-white">
                  {activeConvocations.length}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Filters for Convocations */}
          <div className="flex items-center gap-2 flex-wrap">
            {uniqueFilieresInConvocations.length > 1 && (
              <select
                value={convocationFiliereFilter}
                onChange={e => setConvocationFiliereFilter(e.target.value)}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-rose-200 bg-white text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-rose-500"
              >
                <option value="all">Toutes les filières</option>
                {uniqueFilieresInConvocations.map(f => (
                  <option key={f.id} value={f.id}>{f.nom}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Content: Grouped by Filière / Classe */}
        <div className="p-4 sm:p-6">
          {activeConvocations.length === 0 ? (
            <div className="text-center py-8 px-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 border border-emerald-200">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">
                Aucun élève convoqué à l'administration
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Toutes les assiduités sont régulières ou les convocations précédentes ont été résolues avec succès.
              </p>
            </div>
          ) : Object.keys(groupedConvocations).length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-500">
              Aucun élève ne correspond aux critères de filtre sélectionnés.
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedConvocations).map(([groupKey, group]) => (
                <div
                  key={groupKey}
                  className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50/50 shadow-2xs"
                >
                  {/* Filière / Classe Header Banner */}
                  <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-emerald-700 shrink-0" />
                      <div className="text-xs font-bold text-slate-900">
                        <span className="text-emerald-800 uppercase font-black tracking-wide">
                          Filière : {group.filiereNomFr}
                        </span>
                        <span className="text-slate-500 mx-1.5">•</span>
                        <span className="text-slate-800 font-extrabold">
                          Classe : {group.classeNomFr} ({group.classeCode})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2" dir="rtl">
                      <span className="text-xs font-bold text-emerald-900 font-sans">
                        {group.filiereNomAr}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="text-xs text-slate-700 font-sans font-semibold">
                        {group.classeNomAr}
                      </span>
                      <span className="text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full mr-1.5">
                        {group.items.length} convoqué{group.items.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* List of Convocated Students Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-white">
                    {group.items.map(({ convocation, beneficiaire }) => {
                      const animateur = getUserById(convocation.creeParUserId);

                      return (
                        <div
                          key={convocation.id}
                          className="p-4 rounded-xl border border-rose-200/80 bg-rose-50/30 hover:bg-rose-50/70 transition-all shadow-2xs space-y-2"
                        >
                          {/* Names FR & AR */}
                          <div className="space-y-0.5">
                            <div className="text-sm font-extrabold text-slate-900">
                              {beneficiaire.nomFr} {beneficiaire.prenomFr}
                            </div>
                            <div className="text-sm font-bold text-emerald-800 font-sans" dir="rtl">
                              {beneficiaire.nomAr} {beneficiaire.prenomAr}
                            </div>
                          </div>

                          {/* Filière & Classe */}
                          <div className="text-xs font-semibold text-slate-700 space-y-0.5 border-t border-rose-100 pt-2">
                            <div><strong className="text-slate-900">Filière :</strong> {group.filiereNomFr} ({group.filiereCode})</div>
                            <div><strong className="text-slate-900">Classe :</strong> {group.classeNomFr} ({group.classeCode})</div>
                          </div>

                          {/* Date & Action */}
                          <div className="flex items-center justify-between gap-2 pt-1">
                            <span className="text-[11px] text-slate-500 font-medium">
                              Convoqué le {convocation.dateConvocation}
                            </span>

                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => {
                                  askConfirmation({
                                    title: "Valider la clôture du dossier",
                                    message: `Voulez-vous valider et clôturer la convocation administrative de ${beneficiaire.nomFr} ${beneficiaire.prenomFr} ?`,
                                    confirmText: "Valider la clôture",
                                    cancelText: "Annuler",
                                    variant: "success",
                                    onConfirm: () => {
                                      resolveConvocation(
                                        convocation.id,
                                        "Entretien d'assiduité effectué par la direction avec le bénéficiaire."
                                      );
                                    }
                                  });
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200 border border-emerald-300 transition-all shrink-0"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Clôturer</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. STATISTIQUES EN TEMPS RÉEL (CANVA TECH 2026 AVEC CHIFFRES EN TURQUOISE) */}
      {/* Total bénéficiaires actifs | Présents aujourd'hui / mas-fem | Absents / mas-fem */}
      {/* ========================================================================= */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-5">

        {/* 1. Total Bénéficiaires Actifs */}
        <div
          onClick={() => setActiveModule('beneficiaires')}
          className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs hover:border-[#02b3bb]/50 hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-[#0a1a44]">
              Total Bénéficiaires Actifs
            </span>
            <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-[#02b3bb] flex items-center justify-center group-hover:scale-110 transition-transform border border-cyan-200 shadow-2xs">
              <Users className="w-6 h-6 text-[#02b3bb]" />
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <span className="text-4xl sm:text-5xl font-black text-[#02b3bb] tracking-tight">
                {totals.actifs}
              </span>
              <span className="text-xs font-black text-[#02b3bb] group-hover:underline flex items-center gap-1">
                {t.viewAll} <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>

            {/* Mas / Fem Detailed Breakdown */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 text-slate-600 font-bold">
                <span className="w-2 h-2 rounded-full bg-[#02b3bb]" />
                Masculin : <strong className="text-[#0a1a44]">{totals.actifsMas}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5 text-slate-600 font-bold">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                Féminin : <strong className="text-[#0a1a44]">{totals.actifsFem}</strong>
              </span>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400 font-medium">
              Inactifs exclus du décompte
            </p>
          </div>
        </div>

        {/* 2. Présents Aujourd'hui / mas-fem */}
        <div
          onClick={() => setActiveModule('absences')}
          className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs hover:border-emerald-300 hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-[#0a1a44]">
              Présents Aujourd’hui
            </span>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform border border-emerald-200 shadow-2xs">
              <UserCheck className="w-6 h-6 text-emerald-600" />
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <span className="text-4xl sm:text-5xl font-black text-emerald-600 tracking-tight">
                {totals.presents}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
                Temps réel
              </span>
            </div>

            {/* Mas / Fem Detailed Breakdown */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 text-slate-600 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                Mas : <strong className="text-[#0a1a44]">{totals.presentsMas}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5 text-slate-600 font-bold">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                Fem : <strong className="text-[#0a1a44]">{totals.presentsFem}</strong>
              </span>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400 font-medium">
              Pointages des bénéficiaires actifs
            </p>
          </div>
        </div>

        {/* 3. Absents Aujourd'hui / mas-fem */}
        <div
          onClick={() => setActiveModule('absences')}
          className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs hover:border-rose-300 hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-[#0a1a44]">
              Absents Aujourd’hui
            </span>
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-110 transition-transform border border-rose-200 shadow-2xs">
              <UserX className="w-6 h-6 text-rose-600" />
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <span className="text-4xl sm:text-5xl font-black text-rose-600 tracking-tight">
                {totals.absents}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-black text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 shadow-2xs">
                Assiduité
              </span>
            </div>

            {/* Mas / Fem Detailed Breakdown */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 text-slate-600 font-bold">
                <span className="w-2 h-2 rounded-full bg-rose-600" />
                Mas : <strong className="text-[#0a1a44]">{totals.absentsMas}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5 text-slate-600 font-bold">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                Fem : <strong className="text-[#0a1a44]">{totals.absentsFem}</strong>
              </span>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400 font-medium">
              À régulariser par l’administration
            </p>
          </div>
        </div>

      </section>

      {/* ========================================================================= */}
      {/* 3. SÉANCES DU JOUR EN PLEINE LARGEUR                                       */}
      {/* ========================================================================= */}
      <div>

        {/* Sessions du jour (Canva Card) */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-black text-[#0a1a44] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#02b3bb]" />
                <span>{t.todaySessions}</span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {isAnimateur ? t.mySessionsOnly : t.allSessions} • Date : {todayStr}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveModule('planning')}
              className="text-xs font-black text-[#02b3bb] hover:text-cyan-700 flex items-center gap-1 cursor-pointer"
            >
              {t.viewAll} <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {todaySessions.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              {t.noSessionToday}
            </div>
          ) : (
            <div className="space-y-3">
              {todaySessions.map(seance => {
                const sClassIds = seance.classeIds && seance.classeIds.length > 0
                  ? seance.classeIds
                  : (seance.classeId ? [seance.classeId] : []);
                const sClasses = sClassIds.map(cid => getClasseById(cid)).filter(Boolean) as Classe[];
                const filiere = getFiliereById(seance.filiereId);
                const animateur = getUserById(seance.animateurId);
                const hasAbsences = absences.some(a => a.seanceId === seance.id);

                return (
                  <div
                    key={seance.id}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-300 transition-colors bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {seance.heureDebut} - {seance.heureFin}
                        </span>
                        <span className="text-xs font-semibold text-slate-700">
                          {sClasses.map(c => c.nomFr).join(', ') || 'Classe'} ({filiere?.code || 'Filière'})
                        </span>
                        <span className="text-xs text-slate-500">
                          • {seance.salle || 'Atelier'}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 mt-1 truncate">
                        {seance.intitule}
                      </h3>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Formateur : <strong>{animateur?.nomComplet}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {hasAbsences ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Pointé
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          En attente
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
