import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { isBeneficiaireAccessible, filterFilieresForUser, filterClassesForUser } from '../utils/userScope';
import { InstitutionalBanner } from './InstitutionalBanner';
import {
  Ticket,
  Printer,
  Search,
  Users,
  Calendar,
  Clock,
  Filter,
  CheckCircle2,
  AlertTriangle,
  UserCheck
} from 'lucide-react';

export const BilletsEntree: React.FC = () => {
  const { currentUser } = useAuth();
  const {
    seances,
    beneficiaires,
    absences,
    filieres,
    classes,
    openPrintModal,
    getFiliereById,
    getClasseById,
    settings,
    t
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filiereFilter, setFiliereFilter] = useState('all');
  const [classeFilter, setClasseFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'Absent' | 'Retard'>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const accessibleFilieres = useMemo(() => filterFilieresForUser(filieres, currentUser), [filieres, currentUser]);
  const accessibleClasses = useMemo(() => filterClassesForUser(classes, currentUser), [classes, currentUser]);

  // Enriched absences and delays records
  const absenceRecords = useMemo(() => {
    return absences
      .filter(a => a.statut === 'Absent' || a.statut === 'Retard')
      .map(rec => {
        const ben = beneficiaires.find(b => b.id === rec.beneficiaireId);
        const seance = seances.find(s => s.id === rec.seanceId);
        const filiere = ben ? getFiliereById(ben.filiereId) : (seance ? getFiliereById(seance.filiereId) : undefined);
        const classe = ben ? getClasseById(ben.classeId) : (seance ? getClasseById(seance.classeId) : undefined);
        return {
          rec,
          ben,
          seance,
          filiere,
          classe,
          date: seance?.date || new Date().toISOString().split('T')[0],
          type: rec.statut as 'Absent' | 'Retard',
          motif: rec.motifLabel || (rec.statut === 'Retard' ? 'Autorisation' : 'Régularisation')
        };
      })
      .filter(item => item.ben !== undefined && isBeneficiaireAccessible(item.ben, currentUser))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [absences, beneficiaires, seances, getFiliereById, getClasseById, currentUser]);

  // Filtered list
  const filteredRecords = useMemo(() => {
    return absenceRecords.filter(item => {
      const ben = item.ben!;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const fullNameFr = `${ben.nomFr} ${ben.prenomFr}`.toLowerCase();
        const fullNameAr = `${ben.nomAr} ${ben.prenomAr}`.toLowerCase();
        const massar = (ben.codeMassar || '').toLowerCase();
        if (!fullNameFr.includes(q) && !fullNameAr.includes(q) && !massar.includes(q)) {
          return false;
        }
      }
      if (filiereFilter !== 'all' && ben.filiereId !== filiereFilter) return false;
      if (classeFilter !== 'all' && ben.classeId !== classeFilter) return false;
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;
      return true;
    });
  }, [absenceRecords, searchQuery, filiereFilter, classeFilter, typeFilter]);

  const handlePrintSingle = (item: typeof absenceRecords[0]) => {
    openPrintModal('billet', {
      beneficiaire: item.ben,
      seance: item.seance,
      record: item.rec,
      filiere: item.filiere,
      classe: item.classe,
      type: item.type,
      motif: item.motif,
      dateAbsence: item.date
    });
  };

  const handlePrintCollective = () => {
    const selectedItems = filteredRecords.filter(r => selectedIds.includes(r.rec.id));
    const itemsToPrint = selectedItems.length > 0 ? selectedItems : filteredRecords.slice(0, 3);
    
    if (itemsToPrint.length === 0) return;

    openPrintModal('billets_collectifs', {
      classe: itemsToPrint[0]?.classe,
      filiere: itemsToPrint[0]?.filiere,
      date: itemsToPrint[0]?.date,
      items: itemsToPrint.map(it => ({
        beneficiaire: it.ben,
        record: it.rec,
        computedType: it.type,
        computedMotif: it.motif
      }))
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredRecords.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredRecords.map(r => r.rec.id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <InstitutionalBanner
        title="Billets d'Entrée & de Reprise"
        subtitle={`Délivrance officielle des billets de reprise de cours (Format 19 cm × 5 cm ou A4 x3) • Année ${settings.anneeScolaireCourante || '2026-2027'}`}
        actionButton={
          filteredRecords.length > 0 ? (
            <button
              type="button"
              onClick={handlePrintCollective}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black text-white bg-gradient-to-r from-[#02b3bb] to-[#0891b2] hover:from-[#0099a8] hover:to-[#0e7490] shadow-md shadow-cyan-900/15 transition-all cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>
                Imprimer Billets Collectifs ({selectedIds.length > 0 ? selectedIds.length : Math.min(3, filteredRecords.length)})
              </span>
            </button>
          ) : undefined
        }
      />

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-[#02b3bb] absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher par nom, prénom ou Code Massar..."
              className="w-full pl-10 pr-3 py-2.5 text-xs sm:text-sm rounded-2xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#02b3bb] bg-slate-50/60 text-[#0a1a44] font-medium"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Filter Filière */}
            <select
              value={filiereFilter}
              onChange={e => setFiliereFilter(e.target.value)}
              className="py-2.5 px-3.5 text-xs font-bold rounded-2xl border border-slate-200 bg-white text-[#0a1a44] focus:outline-hidden focus:ring-2 focus:ring-[#02b3bb]"
            >
              <option value="all">Toutes les filières</option>
              {accessibleFilieres.map(f => (
                <option key={f.id} value={f.id}>{f.code} - {f.nomFr}</option>
              ))}
            </select>

            {/* Filter Classe */}
            <select
              value={classeFilter}
              onChange={e => setClasseFilter(e.target.value)}
              className="py-2.5 px-3.5 text-xs font-bold rounded-2xl border border-slate-200 bg-white text-[#0a1a44] focus:outline-hidden focus:ring-2 focus:ring-[#02b3bb]"
            >
              <option value="all">Toutes les classes</option>
              {accessibleClasses.map(c => (
                <option key={c.id} value={c.id}>{c.nomFr}</option>
              ))}
            </select>

            {/* Filter Type */}
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as any)}
              className="py-2.5 px-3.5 text-xs font-bold rounded-2xl border border-slate-200 bg-white text-[#0a1a44] focus:outline-hidden focus:ring-2 focus:ring-[#02b3bb]"
            >
              <option value="all">Tous les motifs</option>
              <option value="Absent">Absences uniquement</option>
              <option value="Retard">Retards uniquement</option>
            </select>
          </div>
        </div>
      </div>

      {/* Records Table (Canva Tech Card) */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {filteredRecords.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Ticket className="w-12 h-12 mx-auto text-[#02b3bb]/40 mb-3" />
            <p className="text-sm font-black text-[#0a1a44]">Aucun bénéficiaire absent ou en retard correspondant</p>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              Les billets de reprise sont générés pour les apprenants ayant fait l'objet d'une absence ou d'un retard.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead className="bg-[#0a1a44] border-b border-[#142140] text-white uppercase text-[10px] font-black tracking-wider">
                <tr>
                  <th className="py-3.5 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length > 0 && selectedIds.length === filteredRecords.length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded text-[#02b3bb] focus:ring-[#02b3bb] cursor-pointer"
                    />
                  </th>
                  <th className="py-3.5 px-3">Bénéficiaire (FR & AR)</th>
                  <th className="py-3.5 px-3">Code Massar</th>
                  <th className="py-3.5 px-3">Classe & Filière</th>
                  <th className="py-3.5 px-3">Séance & Date</th>
                  <th className="py-3.5 px-3 text-center">Statut</th>
                  <th className="py-3.5 px-3">Motif / Justification</th>
                  <th className="py-3.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map(item => {
                  const isSelected = selectedIds.includes(item.rec.id);
                  return (
                    <tr
                      key={item.rec.id}
                      className={`transition-colors hover:bg-slate-50 ${
                        isSelected ? 'bg-cyan-50/50' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(item.rec.id)}
                          className="w-4 h-4 rounded text-[#02b3bb] focus:ring-[#02b3bb] cursor-pointer"
                        />
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-black text-[#0a1a44]">
                          {item.ben?.nomFr} {item.ben?.prenomFr}
                        </div>
                        <div className="text-[11px] text-[#02b3bb] font-bold font-sans" dir="rtl">
                          {item.ben?.nomAr} {item.ben?.prenomAr}
                        </div>
                      </td>

                      <td className="py-3 px-3 font-mono font-bold text-slate-700 text-xs">
                        {item.ben?.codeMassar}
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-bold text-[#0a1a44]">{item.classe?.nomFr || '—'}</div>
                        <div className="text-[10px] text-slate-500 font-medium">{item.filiere?.nomFr}</div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800">{item.seance?.intitule || 'Séance'}</div>
                        <div className="text-[11px] text-[#02b3bb] font-mono font-bold">{item.date}</div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        {item.type === 'Absent' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                            Absent
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                            Retard {item.rec.dureeRetardMinutes ? `(${item.rec.dureeRetardMinutes}m)` : ''}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-slate-700 text-xs font-medium">
                        {item.motif}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handlePrintSingle(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black text-[#02b3bb] bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 transition-all active:scale-95 cursor-pointer shadow-2xs"
                          title="Imprimer Billet Unique (19 cm × 5 cm)"
                        >
                          <Ticket className="w-3.5 h-3.5 text-[#02b3bb]" />
                          <span>Billet Unique (19×5cm)</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
