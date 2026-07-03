import React from 'react';
import { Account, ProcessingResult, CncjConflictResult } from '../types/accounts';
import { StepStatsGrid, StepStat, StepLegend, StepEmptyState } from './components/StepContent';
import { getDisplayCode } from '../utils/accountUtils';

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
  isForced: boolean;
  isSvv: boolean;
}

interface Step7FinalSummaryProps {
  clientAccounts: Account[];
  result: ProcessingResult | null;
  cncjConflictResult: CncjConflictResult | null;
  replacementCodes: { [key: string]: string };
  cncjReplacementCodes: { [key: string]: string };
  cncjConflictCorrections: { [key: string]: string | 'error' };
  cncjForcedValidations: Set<string>;
  mergedClientAccounts: Account[];
  generalAccounts: Account[];
  svvCorrespondences: { [compteEncheres: string]: string };
  finalFilter: 'all' | 'step4' | 'step6' | 'step4+step6' | 'toCreate' | 'svv';
  onFilterChange: (filter: 'all' | 'step4' | 'step6' | 'step4+step6' | 'toCreate' | 'svv') => void;
  pcgManualOverrides?: { [accountCode: string]: Partial<Record<string, string | number | boolean | null>> };
  onPcgManualOverrideChange?: (accountCode: string, overrides: Partial<Record<string, string | number | boolean | null>>) => void;
}

export const Step7FinalSummary: React.FC<Step7FinalSummaryProps> = ({
  clientAccounts,
  result,
  cncjConflictResult,
  replacementCodes,
  cncjReplacementCodes,
  cncjConflictCorrections,
  cncjForcedValidations,
  mergedClientAccounts,
  generalAccounts,
  svvCorrespondences,
  finalFilter,
  onFilterChange
}) => {
  // Normaliser un code à 7 chiffres
  const normalizeForDisplay = (code: string): string => {
    if (!code || code === '-' || code === 'Erreur') return code;
    return code.length > 7 ? code.slice(0, 7) : code.padEnd(7, '0');
  };

  // Résoudre le code final d'une ligne (source unique de vérité pour affichage + « à créer »)
  const resolveFinalCode = (
    modificationSource: ModificationSource,
    correctedCode: string,
    cncjCorrection: string,
    isForced: boolean,
    originalCode: string
  ): string => {
    if (modificationSource === 'step4+step6') {
      if (isForced && cncjCorrection === '-') return correctedCode;
      return cncjCorrection === 'Erreur' ? correctedCode : cncjCorrection;
    }
    if (modificationSource === 'step4') return correctedCode;
    if (modificationSource === 'step6') {
      if (isForced) return correctedCode;
      return cncjCorrection === 'Erreur' ? originalCode : cncjCorrection;
    }
    return correctedCode || originalCode;
  };

  // Un compte est « à créer » si son code FINAL n'existe pas dans le PCG (cohérent avec l'étape 8)
  const pcgCodes = new Set(generalAccounts.map(a => normalizeForDisplay(a.number)));

  // Calculer les données du récapitulatif
  const step4Ids = new Set(result?.duplicates?.map(d => d.id) || []);
  const step6Ids = new Set(cncjConflictResult?.conflicts?.map(d => d.id) || []);

  const finalSummaryData: SummaryRow[] = clientAccounts.map((account): SummaryRow => {
    const mergedAccount = mergedClientAccounts.find(m => m.id === account.id);
    const correctedByCncj = cncjReplacementCodes[account.id]; // Utiliser les valeurs saisies à l'étape 6
    const hasCncjError = cncjConflictCorrections[account.id] === 'error'; // Garder la validation des erreurs
    
    const isStep4Duplicate = step4Ids.has(account.id);
    const isStep6Conflict = step6Ids.has(account.id);
    const isForced = cncjForcedValidations.has(account.id);
    const isSvv = !!svvCorrespondences[account.originalNumber || ''];

    let modificationSource: ModificationSource = null;
    if (isStep4Duplicate && isStep6Conflict) {
      modificationSource = 'step4+step6';
    } else if (isStep6Conflict) {
      modificationSource = 'step6';
    } else if (isStep4Duplicate) {
      modificationSource = 'step4';
    }
    
    const correctedCode = isStep4Duplicate 
      ? (mergedAccount ? mergedAccount.number : account.number)
      : account.number;
    
    // Priorité aux saisies manuelles : si l'utilisateur a saisi une valeur, l'utiliser même si validation auto dit 'error'.
    // Une validation forcée accepte le compte tel quel : elle annule l'erreur d'auto-correction CNCJ.
    const cncjCorrection = correctedByCncj !== undefined && correctedByCncj !== ''
      ? correctedByCncj
      : (isForced ? '-' : (hasCncjError ? 'Erreur' : '-'));

    const originalCode = getDisplayCode(account);
    const finalCode = normalizeForDisplay(resolveFinalCode(modificationSource, correctedCode, cncjCorrection, isForced, originalCode));
    const isToCreate = !pcgCodes.has(finalCode);

    return {
      id: account.id,
      title: account.title || 'Sans titre',
      originalCode: originalCode,
      correctedCode: correctedCode,
      cncjCorrection: cncjCorrection,
      wasModified: replacementCodes[account.id] !== undefined || cncjReplacementCodes[account.id] !== undefined || isForced || isSvv,
      modificationSource,
      isStep4Duplicate,
      isStep6Conflict,
      isToCreate,
      isForced,
      isSvv
    };
  });

  // Les transferts SVV forment leur propre catégorie : exclus des « doublons » et « CNCJ »
  const modifiedCount = finalSummaryData.filter(row => row.wasModified).length;
  const step4Count = finalSummaryData.filter(row => row.isStep4Duplicate && !row.isSvv).length;
  const step6Count = finalSummaryData.filter(row => row.isStep6Conflict && !row.isSvv).length;
  const toCreateCount = finalSummaryData.filter(row => row.isToCreate).length;
  const svvCount = finalSummaryData.filter(row => row.isSvv).length;
  const totalCount = finalSummaryData.length;

  const filteredData = finalSummaryData.filter(row => {
    if (finalFilter === 'all') return true;
    if (finalFilter === 'toCreate') return row.isToCreate;
    if (finalFilter === 'svv') return row.isSvv;
    if (finalFilter === 'step4') return row.isStep4Duplicate && !row.isSvv;
    if (finalFilter === 'step6') return row.isStep6Conflict && !row.isSvv;
    return row.modificationSource === finalFilter;
  });

  const computeFinalCode = (row: SummaryRow): string =>
    resolveFinalCode(row.modificationSource, row.correctedCode, row.cncjCorrection, row.isForced, row.originalCode);

  const getFinalCodeClasses = (row: SummaryRow): string => {
    if (row.cncjCorrection === 'Erreur') {
      return 'bg-red-100 text-red-700 border border-red-200';
    }
    if (row.isSvv) {
      return 'bg-indigo-100 text-indigo-800 border border-indigo-200';
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
    if (row.isSvv) {
      return {
        cardClass: 'border-indigo-200 bg-indigo-50',
        accentClass: 'text-indigo-700'
      };
    }
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

    if (row.isSvv) {
      // Pour un transfert SVV, le doublon (consolidation) et le conflit CNCJ sont des
      // conséquences internes du mappage : on n'affiche que le badge SVV (+ forçage éventuel).
      badges.push({ label: '🔁 Transfert SVV', className: 'bg-indigo-600 text-white' });
      if (row.isForced) {
        badges.push({ label: '🔒 Validation forcée', className: 'bg-blue-600 text-white' });
      }
      return badges;
    }

    if (row.isToCreate) {
      badges.push({ label: 'À créer', className: 'bg-purple-600 text-white' });
    }

    if (row.modificationSource === 'step4' || row.modificationSource === 'step4+step6') {
      badges.push({ label: 'Doublon corrigé', className: 'bg-blue-600 text-white' });
    }

    if (row.modificationSource === 'step6' || row.modificationSource === 'step4+step6') {
      badges.push({ label: 'Correction CNCJ', className: 'bg-orange-600 text-white' });
    }

    if (row.isForced) {
      badges.push({ label: '🔒 Validation forcée', className: 'bg-blue-600 text-white' });
    }

    if (!row.modificationSource && row.wasModified) {
      badges.push({ label: 'Modifié', className: 'bg-green-600 text-white' });
    }

    if (row.cncjCorrection === 'Erreur') {
      badges.push({ label: 'Alerte CNCJ', className: 'bg-red-600 text-white' });
    }

    return badges;
  };

  return (
    <div className="space-y-4">
      {/* Statistiques */}
      <StepStatsGrid columns={svvCount > 0 ? 6 : 5}>
        <StepStat value={totalCount} label="Total comptes" color="blue" />
        <StepStat value={modifiedCount} label="Comptes modifiés" color="green" />
        <StepStat value={step4Count} label="Correction doublons" color="blue" />
        <StepStat value={step6Count} label="Corrections CNCJ" color="orange" />
        {svvCount > 0 && <StepStat value={svvCount} label="Transferts SVV" color="indigo" />}
        <StepStat value={toCreateCount} label="À créer" color="purple" />
      </StepStatsGrid>

      {/* Légende */}
      <StepLegend
        items={[
          { color: 'bg-blue-50 border-l-4 border-blue-400', label: 'Correction doublons' },
          { color: 'bg-orange-50 border-l-4 border-orange-400', label: 'Corrections CNCJ' },
          { color: 'bg-purple-50 border-l-4 border-purple-400', label: 'À créer' },
          ...(svvCount > 0 ? [{ color: 'bg-indigo-50 border-l-4 border-indigo-400', label: 'Transfert SVV' }] : [])
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
          {svvCount > 0 && (
            <button
              onClick={() => onFilterChange('svv')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                finalFilter === 'svv'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              🔁 Transferts SVV ({svvCount})
            </button>
          )}
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

                      {row.isSvv ? (
                        <div className="flex items-start gap-2 min-w-[10rem]">
                          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-full bg-indigo-200 text-indigo-800 uppercase">
                            Mappage SVV
                          </span>
                          <span className="font-mono text-sm">→ {normalizeForDisplay(row.correctedCode)}</span>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start gap-2 min-w-[10rem]">
                            <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-full bg-blue-200 text-blue-800 uppercase">
                              Correction doublon
                            </span>
                            <span className="font-mono text-sm">
                              {row.isStep4Duplicate ? normalizeForDisplay(row.correctedCode) : '—'}
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
                                hasCncjCorrection ? normalizeForDisplay(row.cncjCorrection) : '—'
                              )}
                            </span>
                          </div>
                        </>
                      )}

                      <div className="flex items-start gap-2 min-w-[10rem]">
                        <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-full bg-green-200 text-green-800 uppercase">
                          Code final
                        </span>
                        <span className={`font-mono text-sm ${finalCodeClasses.replace('bg-', 'bg-opacity-80 bg-').replace(' text-', ' text-')}`}>
                          {normalizeForDisplay(finalCode)}
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
    </div>
  );
};