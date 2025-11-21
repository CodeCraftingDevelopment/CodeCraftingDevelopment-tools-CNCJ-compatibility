import React from 'react';
import { Account, ProcessingResult } from '../types/accounts';
import { StepStatsGrid, StepStat, StepLegend, StepEmptyState } from './components/StepContent';

type ModificationSource = 'step4' | 'step6' | 'step4+step6' | null;

interface SummaryRow {
  id: string;
  title: string;
  originalCode: string;
  correctedCode: string;
  cncjCorrection: string;
  wasModified: boolean;
  modificationSource: ModificationSource;
  isStep4Duplicate: boolean;
  isStep6Conflict: boolean;
  isToCreate: boolean;
}

interface StepFinalSummaryProps {
  clientAccounts: Account[];
  result: ProcessingResult | null;
  cncjConflictResult: ProcessingResult | null;
  replacementCodes: { [key: string]: string };
  cncjConflictCorrections: { [key: string]: string | 'error' };
  mergedClientAccounts: Account[];
  finalFilter: 'all' | 'step4' | 'step6' | 'step4+step6' | 'toCreate';
  onFilterChange: (filter: 'all' | 'step4' | 'step6' | 'step4+step6' | 'toCreate') => void;
}

export const StepFinalSummary: React.FC<StepFinalSummaryProps> = ({
  clientAccounts,
  result,
  cncjConflictResult,
  replacementCodes,
  cncjConflictCorrections,
  mergedClientAccounts,
  finalFilter,
  onFilterChange
}) => {
  // Calculer les données du récapitulatif
  const step4Ids = new Set(result?.duplicates?.map(d => d.id) || []);
  const step6Ids = new Set(cncjConflictResult?.duplicates?.map(d => d.id) || []);
  const toCreateIds = new Set(result?.toCreate?.map(t => t.id) || []);
  
  const finalSummaryData: SummaryRow[] = clientAccounts.map((account): SummaryRow => {
    const mergedAccount = mergedClientAccounts.find(m => m.id === account.id);
    const correctedByCncj = cncjConflictCorrections[account.id];
    
    const isStep4Duplicate = step4Ids.has(account.id);
    const isStep6Conflict = step6Ids.has(account.id);
    const isToCreate = toCreateIds.has(account.id);
    
    let modificationSource = null;
    if (isStep4Duplicate && isStep6Conflict) {
      modificationSource = 'step4+step6';
    } else if (isStep6Conflict) {
      modificationSource = 'step6';
    } else if (isStep4Duplicate) {
      modificationSource = 'step4';
    }
    
    const correctedCode = isStep4Duplicate 
      ? (mergedAccount?.number || account.number)
      : account.number;
    
    return {
      id: account.id,
      title: account.title || 'Sans titre',
      originalCode: account.number,
      correctedCode: correctedCode,
      cncjCorrection: correctedByCncj === 'error' ? 'Erreur' : (correctedByCncj || '-'),
      wasModified: replacementCodes[account.id] !== undefined,
      modificationSource,
      isStep4Duplicate,
      isStep6Conflict,
      isToCreate
    };
  });

  const modifiedCount = finalSummaryData.filter(row => row.wasModified).length;
  const step4Count = finalSummaryData.filter(row => row.isStep4Duplicate).length;
  const step6Count = finalSummaryData.filter(row => row.isStep6Conflict).length;
  const toCreateCount = finalSummaryData.filter(row => row.isToCreate).length;
  const totalCount = finalSummaryData.length;

  const getRowStyle = (source: string | null, isToCreate: boolean) => {
    if (isToCreate) return 'bg-purple-50 border-l-4 border-purple-400';
    switch (source) {
      case 'step4': return 'bg-blue-50 border-l-4 border-blue-400';
      case 'step6': return 'bg-orange-50 border-l-4 border-orange-400';
      case 'step4+step6': return 'bg-purple-50 border-l-4 border-purple-400';
      default: return '';
    }
  };

  const filteredData = finalSummaryData.filter(row => {
    if (finalFilter === 'all') return true;
    if (finalFilter === 'toCreate') return row.isToCreate;
    return row.modificationSource === finalFilter;
  });

  const computeFinalCode = (row: SummaryRow): string => {
    if (row.modificationSource === 'step4+step6') {
      return row.cncjCorrection === 'Erreur' ? row.correctedCode : row.cncjCorrection;
    }
    if (row.modificationSource === 'step4') {
      return row.correctedCode;
    }
    if (row.modificationSource === 'step6') {
      return row.cncjCorrection === 'Erreur' ? row.originalCode : row.cncjCorrection;
    }
    return row.correctedCode || row.originalCode;
  };

  const getFinalCodeClasses = (row: SummaryRow): string => {
    if (row.cncjCorrection === 'Erreur') {
      return 'bg-red-100 text-red-700 border border-red-200';
    }

    switch (row.modificationSource) {
      case 'step4':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'step6':
        return 'bg-orange-100 text-orange-800 border border-orange-200';
      case 'step4+step6':
        return 'bg-purple-100 text-purple-800 border border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const getCardStyles = (row: SummaryRow) => {
    if (row.isToCreate) {
      return {
        cardClass: 'border-purple-200 bg-purple-50',
        accentClass: 'text-purple-700'
      };
    }

    switch (row.modificationSource) {
      case 'step4':
        return { cardClass: 'border-blue-200 bg-blue-50', accentClass: 'text-blue-700' };
      case 'step6':
        return { cardClass: 'border-orange-200 bg-orange-50', accentClass: 'text-orange-700' };
      case 'step4+step6':
        return { cardClass: 'border-purple-200 bg-purple-50', accentClass: 'text-purple-700' };
      default:
        return { cardClass: 'border-gray-200 bg-white', accentClass: 'text-gray-700' };
    }
  };

  const buildBadges = (row: SummaryRow) => {
    const badges: Array<{ label: string; className: string }> = [];

    if (row.isToCreate) {
      badges.push({ label: 'À créer', className: 'bg-purple-600 text-white' });
    }

    if (row.modificationSource === 'step4' || row.modificationSource === 'step4+step6') {
      badges.push({ label: 'Doublon corrigé', className: 'bg-blue-600 text-white' });
    }

    if (row.modificationSource === 'step6' || row.modificationSource === 'step4+step6') {
      badges.push({ label: 'Correction CNCJ', className: 'bg-orange-600 text-white' });
    }

    if (!row.modificationSource && row.wasModified) {
      badges.push({ label: 'Modifié', className: 'bg-green-600 text-white' });
    }

    if (row.cncjCorrection === 'Erreur') {
      badges.push({ label: 'Alerte CNCJ', className: 'bg-red-600 text-white' });
    }

    return badges;
  };

  const formatModificationLabel = (row: SummaryRow): string => {
    switch (row.modificationSource) {
      case 'step4':
        return 'Doublon corrigé (Étape 4)';
      case 'step6':
        return 'Correction CNCJ (Étape 6)';
      case 'step4+step6':
        return 'Doublon & CNCJ corrigés';
      default:
        return row.wasModified ? 'Modifié' : 'Aucune correction';
    }
  };

  const handleExport = () => {
    const csvHeaders = ['account_title', 'original_client_code', 'final_code'];
    
    const csvRows = filteredData.map(row => {
      const finalCode = computeFinalCode(row);
      return [row.title, row.originalCode, finalCode];
    });
    
    const csvContent = [
      csvHeaders.join(';'),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(';'))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'correspondances-comptes.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Statistiques */}
      <StepStatsGrid columns={5}>
        <StepStat value={totalCount} label="Total comptes" color="blue" />
        <StepStat value={modifiedCount} label="Comptes modifiés" color="green" />
        <StepStat value={step4Count} label="Correction doublons" color="blue" />
        <StepStat value={step6Count} label="Corrections CNCJ" color="orange" />
        <StepStat value={toCreateCount} label="À créer" color="purple" />
      </StepStatsGrid>

      {/* Légende */}
      <StepLegend
        items={[
          { color: 'bg-blue-50 border-l-4 border-blue-400', label: 'Correction doublons' },
          { color: 'bg-orange-50 border-l-4 border-orange-400', label: 'Corrections CNCJ' },
          { color: 'bg-purple-50 border-l-4 border-purple-400', label: 'À créer' }
        ]}
      />

      {/* Boutons de filtrage */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex justify-center space-x-2 flex-wrap">
          <button
            onClick={() => onFilterChange('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              finalFilter === 'all' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Tous ({totalCount})
          </button>
          <button
            onClick={() => onFilterChange('step4')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              finalFilter === 'step4' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Doublons corrigés ({step4Count})
          </button>
          <button
            onClick={() => onFilterChange('step6')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              finalFilter === 'step6' 
                ? 'bg-orange-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Corrections CNCJ ({step6Count})
          </button>
          <button
            onClick={() => onFilterChange('toCreate')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              finalFilter === 'toCreate' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            À créer ({toCreateCount})
          </button>
        </div>
      </div>

      {/* Cartes récapitulatives */}
      {filteredData.length === 0 ? (
        <StepEmptyState
          icon="🔍"
          title="Aucun résultat"
          description="Aucun compte ne correspond au filtre sélectionné."
        />
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="max-h-[28rem] overflow-y-auto pr-1">
            <div className="space-y-3">
              {filteredData.map((row) => {
                const finalCode = computeFinalCode(row);
                const finalCodeClasses = getFinalCodeClasses(row);
                const { cardClass } = getCardStyles(row);
                const badges = buildBadges(row);
                const hasClientChange = row.correctedCode !== row.originalCode;
                const hasCncjCorrection = row.cncjCorrection !== '-' && row.cncjCorrection !== 'Erreur';

                return (
                  <div
                    key={row.id}
                    className={`rounded-lg border ${cardClass} p-3 shadow-sm flex flex-col gap-3`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-[10rem]">
                        <h3 className="text-base font-semibold text-gray-900 leading-tight">{row.title}</h3>
                      </div>
                      {badges.length > 0 && (
                        <div className="flex flex-wrap justify-end gap-1">
                          {badges.map((badge, index) => (
                            <span
                              key={index}
                              className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${badge.className}`}
                            >
                              {badge.label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-start gap-3 text-sm text-gray-700">
                      <div className="flex items-start gap-2 min-w-[10rem]">
                        <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-full bg-gray-200 text-gray-700 uppercase">
                          Code original
                        </span>
                        <span className="font-mono text-sm">{row.originalCode}</span>
                      </div>

                      <div className="flex items-start gap-2 min-w-[10rem]">
                        <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-full bg-blue-200 text-blue-800 uppercase">
                          Correction doublon
                        </span>
                        <span className="font-mono text-sm">
                          {hasClientChange ? row.correctedCode : '—'}
                        </span>
                      </div>

                      <div className="flex items-start gap-2 min-w-[10rem]">
                        <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-full bg-orange-200 text-orange-800 uppercase">
                          Correction CNCJ
                        </span>
                        <span className="font-mono text-sm">
                          {row.cncjCorrection === 'Erreur' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 text-xs font-semibold">
                              ⚠️ Erreur
                            </span>
                          ) : (
                            hasCncjCorrection ? row.cncjCorrection : '—'
                          )}
                        </span>
                      </div>

                      <div className="flex items-start gap-2 min-w-[10rem]">
                        <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-full bg-green-200 text-green-800 uppercase">
                          Code final
                        </span>
                        <span className={`font-mono text-sm ${finalCodeClasses.replace('bg-', 'bg-opacity-80 bg-').replace(' text-', ' text-')}`}>
                          {finalCode}
                        </span>
                      </div>
                    </div>

                    {row.cncjCorrection === 'Erreur' && (
                      <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                        Une correction manuelle est nécessaire : la proposition CNCJ est invalide.
                      </div>
                    )}

                    {row.isToCreate && badges.length === 0 && (
                      <div className="px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-700">
                        Compte à créer dans le plan comptable CNCJ.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bouton d'export */}
      <div className="mt-6 text-center">
        <button
          onClick={handleExport}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
        >
          📥 Exporter les correspondances
        </button>
      </div>
    </div>
  );
};
