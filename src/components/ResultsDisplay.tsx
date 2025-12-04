import React, { useEffect, useMemo, useState } from 'react';
import { ProcessingResult, Account } from '../types/accounts';
import { useDragAndDrop } from '../hooks/useDragAndDrop';
import { useCorrectionsImport } from '../hooks/useCorrectionsImport';
import { DropZone } from './DropZone';
import { DuplicateRow } from './DuplicateRow';
import { ReviewView } from './ReviewView';
import { calculateSuggestionsWithDetails, suggestNextCodeWithDetails, SuggestionResult } from '../utils/codeSuggestions';
import { getDisplayCode, normalizeAccountCode } from '../utils/accountUtils';
import { sanitizeCsvValue } from '../utils/fileUtils';

interface ResultsDisplayProps {
  result: ProcessingResult | null;
  loading?: boolean;
  showOnly?: 'duplicates' | 'all' | 'review';
  replacementCodes?: { [key: string]: string };
  onReplacementCodeChange?: (accountId: string, code: string) => void;
  conflictType?: 'duplicates' | 'cncj-conflicts';
  corrections?: { [key: string]: string | 'error' };
  cncjCodes?: Set<string>;
  cncjForcedValidations?: Set<string>;
  onCncjForcedValidationChange?: (accountId: string, forced: boolean) => void;
  mergedClientAccounts?: Account[];
  originalClientAccounts?: Account[];
  duplicateIdsFromStep4?: Set<string>;
  // Données de l'étape 4 pour l'export combiné à l'étape 6
  step4Duplicates?: Account[];
  step4Suggestions?: Map<string, SuggestionResult>;
  step4ReplacementCodes?: { [key: string]: string };
}

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ 
  result, 
  loading = false, 
  showOnly = 'all', 
  replacementCodes = {}, 
  onReplacementCodeChange,
  conflictType = 'duplicates',
  corrections = {},
  cncjCodes,
  cncjForcedValidations = new Set(),
  onCncjForcedValidationChange,
  mergedClientAccounts,
  originalClientAccounts,
  duplicateIdsFromStep4,
  step4Duplicates,
  step4Suggestions,
  step4ReplacementCodes
}) => {
  // Déclarer les variables avant le useCallback
  const { duplicates = [], uniqueClients = [], matches = [], unmatchedClients = [], toCreate = [] } = result || {};
  
  // Suggestions INITIALES (calculées une seule fois, sans tenir compte des replacementCodes)
  // Ces suggestions sont utilisées pour le modal de détails et l'export CSV
  const initialSuggestions = useMemo(() => {
    if (conflictType !== 'duplicates' || duplicates.length === 0) {
      return new Map<string, SuggestionResult>();
    }
    
    const existingCodes = new Set([
      ...uniqueClients.map(acc => acc.number),
      ...matches.map(acc => acc.number),
      ...unmatchedClients.map(acc => acc.number)
    ]);
    
    // Calculer sans les replacementCodes pour garder les détails originaux
    return calculateSuggestionsWithDetails(duplicates, existingCodes, {}, cncjCodes);
  }, [duplicates, uniqueClients, matches, unmatchedClients, conflictType, cncjCodes]);

  // Suggestions DYNAMIQUES (mises à jour avec les replacementCodes)
  // Ces suggestions sont utilisées pour les boutons d'action
  const suggestions = useMemo(() => {
    if (conflictType !== 'duplicates' || duplicates.length === 0) {
      return new Map<string, SuggestionResult>();
    }
    
    const existingCodes = new Set([
      ...uniqueClients.map(acc => acc.number),
      ...matches.map(acc => acc.number),
      ...unmatchedClients.map(acc => acc.number)
    ]);
    
    return calculateSuggestionsWithDetails(duplicates, existingCodes, replacementCodes, cncjCodes);
  }, [duplicates, uniqueClients, matches, unmatchedClients, replacementCodes, conflictType, cncjCodes]);

  // Suggestions INITIALES pour les conflits CNCJ (étape 6)
  const initialCncjSuggestions = useMemo(() => {
    if (conflictType !== 'cncj-conflicts' || duplicates.length === 0 || !cncjCodes) {
      return new Map<string, SuggestionResult>();
    }
    
    const suggestionsMap = new Map<string, SuggestionResult>();
    const usedCodes = new Set([...cncjCodes]);
    
    // Codes clients existants (pour différencier des doublons)
    const existingClientCodes = new Set<string>();
    if (mergedClientAccounts) {
      mergedClientAccounts.forEach(acc => {
        usedCodes.add(acc.number);
        existingClientCodes.add(acc.number);
      });
    }
    
    duplicates.forEach(duplicate => {
      const result = suggestNextCodeWithDetails(duplicate.number, usedCodes, cncjCodes, existingClientCodes);
      suggestionsMap.set(duplicate.id, result);
      
      if (result.code) {
        usedCodes.add(result.code);
      }
    });
    
    return suggestionsMap;
  }, [duplicates, cncjCodes, conflictType, mergedClientAccounts]);

  // Suggestions DYNAMIQUES pour les conflits CNCJ (étape 6)
  const cncjSuggestions = useMemo(() => {
    if (conflictType !== 'cncj-conflicts' || duplicates.length === 0 || !cncjCodes) {
      return new Map<string, SuggestionResult>();
    }
    
    const suggestionsMap = new Map<string, SuggestionResult>();
    const usedCodes = new Set([...cncjCodes]);
    
    // Codes clients existants (pour différencier des doublons)
    const existingClientCodes = new Set<string>();
    if (mergedClientAccounts) {
      mergedClientAccounts.forEach(acc => {
        usedCodes.add(acc.number);
        existingClientCodes.add(acc.number);
      });
    }
    
    Object.values(replacementCodes).forEach(code => {
      if (code?.trim()) {
        usedCodes.add(code.trim());
      }
    });
    
    duplicates.forEach(duplicate => {
      const currentReplacement = replacementCodes[duplicate.id]?.trim();
      if (currentReplacement) {
        suggestionsMap.set(duplicate.id, { code: null, reason: 'Code de remplacement déjà saisi' });
        return;
      }
      
      const result = suggestNextCodeWithDetails(duplicate.number, usedCodes, cncjCodes, existingClientCodes);
      suggestionsMap.set(duplicate.id, result);
      
      if (result.code) {
        usedCodes.add(result.code);
      }
    });
    
    return suggestionsMap;
  }, [duplicates, cncjCodes, replacementCodes, conflictType, mergedClientAccounts]);
  
  // Utiliser le hook personnalisé pour les corrections
  const { correctionsFileInfo, processCorrectionsFile, handleClearCorrectionsFile } = useCorrectionsImport({
    duplicates,
    _uniqueClients: uniqueClients,
    _matches: matches,
    _unmatchedClients: unmatchedClients,
    _replacementCodes: replacementCodes || {},
    onReplacementCodeChange
  });
  
  // Réinitialiser le fichier de corrections quand de nouveaux fichiers sont chargés
  useEffect(() => {
    handleClearCorrectionsFile();
  }, [originalClientAccounts, handleClearCorrectionsFile]);
  
  
  const { dragState, fileInputRef, handlers } = useDragAndDrop({
    disabled: false,
    onDrop: processCorrectionsFile,
    acceptedTypes: ['.csv']
  });

  // State pour afficher le modal de détails des suggestions
  const [showSuggestionDetails, setShowSuggestionDetails] = useState(false);
  // State pour inclure les données de l'étape 4 dans l'export de l'étape 6
  const [includeStep4InExport, setIncludeStep4InExport] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Traitement en cours...</span>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Veuillez charger les fichiers CSV pour voir les résultats</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Résumé */}
      {showOnly === 'duplicates' ? (
        duplicates.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{duplicates.length}</div>
              <div className="text-gray-600">{conflictType === 'cncj-conflicts' ? 'Conflits CNCJ identifiés' : 'Doublons détectés'}</div>
            </div>
          </div>
        )
      ) : showOnly !== 'review' ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Résumé du traitement</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{uniqueClients.length}</div>
              <div className="text-gray-600">Comptes clients uniques</div>
            </div>
            {duplicates.length > 0 && (
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{duplicates.length}</div>
                <div className="text-gray-600">{conflictType === 'cncj-conflicts' ? 'Conflits CNCJ identifiés' : 'Doublons détectés'}</div>
              </div>
            )}
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{matches.length}</div>
              <div className="text-gray-600">Correspondances CNCJ</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{unmatchedClients.length}</div>
              <div className="text-gray-600">Sans correspondance</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{toCreate.length}</div>
              <div className="text-gray-600">À créer</div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Export des doublons - entre résumé et détails */}
      {showOnly === 'duplicates' && duplicates.length > 0 && (
        <div className="flex justify-center mb-6 gap-4 flex-wrap">
          {/* Bouton pour voir les détails des suggestions */}
          <button
            onClick={() => setShowSuggestionDetails(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            title="Afficher le détail du calcul des suggestions"
          >
            🔍 Détails des suggestions
          </button>
          
          <button
            onClick={() => {
              // Export CSV pour les doublons (step 4) ou conflits CNCJ (step 6)
              const csvHeaders = conflictType === 'cncj-conflicts' 
                ? ['code client', 'code 7 chiffres', 'titre', 'code remplacement']
                : ['code client', 'code 7 chiffres', 'titre', 'code remplacement', 'suggestion', 'détail calcul'];
              const csvRows = duplicates.map(d => {
                const codeClient = getDisplayCode(d); // Code 8 chiffres original ou fallback
                const code7Chiffres = d.number.padStart(7, '0');
                const titre = d.title || '';
                const codeRemplacement = replacementCodes[d.id] || '';
                // Utiliser les suggestions INITIALES pour conserver les détails du calcul original
                const suggestionResult = conflictType === 'cncj-conflicts' 
                  ? initialCncjSuggestions.get(d.id) 
                  : initialSuggestions.get(d.id);
                const suggestionCode = suggestionResult?.code || '';
                const suggestionDetail = suggestionResult?.reason || '';
                
                const rowData = [codeClient, code7Chiffres, titre, codeRemplacement];
                if (conflictType !== 'cncj-conflicts') {
                  rowData.push(suggestionCode, suggestionDetail);
                }
                
                return rowData;
              });
              
              const csvContent = [
                csvHeaders.join(';'),
                ...csvRows.map(row => row.map(cell => `"${sanitizeCsvValue(cell).replace(/"/g, '""')}"`).join(';'))
              ].join('\n');
              
              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = conflictType === 'cncj-conflicts' ? 'correction_conflits.csv' : 'correction_doublons.csv';
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            📥 {conflictType === 'cncj-conflicts' ? 'Exporter les conflits' : 'Exporter les doublons'}
          </button>
          
          {/* Bouton pour valider toutes les suggestions - étape 4 et étape 6 */}
          <button
            onClick={() => {
              if (!onReplacementCodeChange) return;
              
              // Utiliser les bonnes suggestions selon le type de conflit
              const currentSuggestions = conflictType === 'cncj-conflicts' ? cncjSuggestions : suggestions;
              
              // Appliquer toutes les suggestions disponibles
              currentSuggestions.forEach((suggestionResult, accountId) => {
                // Appliquer uniquement si :
                // 1. Il y a une suggestion (code pas null)
                // 2. Le champ est vide (pas déjà rempli)
                if (suggestionResult?.code && !replacementCodes[accountId]?.trim()) {
                  onReplacementCodeChange(accountId, suggestionResult.code);
                }
              });
            }}
            disabled={(() => {
              // Utiliser les bonnes suggestions selon le type de conflit
              const currentSuggestions = conflictType === 'cncj-conflicts' ? cncjSuggestions : suggestions;
              // Désactiver si aucune suggestion disponible
              const availableSuggestions = Array.from(currentSuggestions.entries()).filter(
                ([accountId, suggestionResult]) => suggestionResult?.code && !replacementCodes[accountId]?.trim()
              );
              return availableSuggestions.length === 0;
            })()}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            title={(() => {
              // Utiliser les bonnes suggestions selon le type de conflit
              const currentSuggestions = conflictType === 'cncj-conflicts' ? cncjSuggestions : suggestions;
              const availableSuggestions = Array.from(currentSuggestions.entries()).filter(
                ([accountId, suggestionResult]) => suggestionResult?.code && !replacementCodes[accountId]?.trim()
              );
              return availableSuggestions.length > 0 
                ? `Appliquer ${availableSuggestions.length} suggestion(s) automatique(s)`
                : 'Aucune suggestion disponible';
            })()}
          >
            ✨ Valider les suggestions
          </button>
        </div>
      )}

      {/* Review Table - Tableau des corrections */}
      {showOnly === 'review' && (
        <ReviewView
          mergedClientAccounts={mergedClientAccounts || []}
          originalClientAccounts={originalClientAccounts || []}
          replacementCodes={replacementCodes || {}}
          duplicateIdsFromStep4={duplicateIdsFromStep4 || new Set()}
        />
      )}

      {/* Doublons */}
      {duplicates.length > 0 && showOnly !== 'review' ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-red-900 mb-3">
            ⚠️ {conflictType === 'cncj-conflicts' ? 'Conflits CNCJ identifiés' : 'Doublons détectés'} ({duplicates.length})
          </h3>
          {conflictType === 'duplicates' && (
            <div className="mb-3 p-3 bg-amber-50 border border-amber-300 rounded-lg">
              <p className="text-amber-800 text-sm">
                <span className="font-semibold">⚠️ Important :</span> Allez jusqu'à l'étape 6 pour vérifier les conflits CNCJ avant de transmettre les corrections de doublons au client.
              </p>
            </div>
          )}
          <div className={`${showOnly === 'duplicates' ? 'max-h-96' : 'max-h-40'} overflow-y-auto`}>
            <div className="space-y-3">
              {(() => {
                // Optimisation: calculer les détections de doublons une seule fois
                const codeOccurrences: { [key: string]: string[] } = {};
                Object.entries(replacementCodes).forEach(([accountId, code]) => {
                  const trimmedCode = code?.trim();
                  if (trimmedCode) {
                    const normalizedCode = normalizeAccountCode(trimmedCode);
                    if (!codeOccurrences[normalizedCode]) {
                      codeOccurrences[normalizedCode] = [];
                    }
                    codeOccurrences[normalizedCode].push(accountId);
                  }
                });
                
                // Obtenir tous les codes clients originaux (sauf les doublons)
                // Pour l'étape 6 (cncj-conflicts), inclure aussi les codes des comptes clients fusionnés
                const allOriginalCodes = new Set([
                  ...uniqueClients.map(acc => acc.number),
                  ...matches.map(acc => acc.number), 
                  ...unmatchedClients.map(acc => acc.number),
                  ...(conflictType === 'cncj-conflicts' && mergedClientAccounts ? mergedClientAccounts.map(acc => acc.number) : [])
                ]);
                
                return duplicates.map((account) => {
                  const currentCode = replacementCodes[account.id]?.trim();
                  const normalizedCurrentCode = currentCode ? normalizeAccountCode(currentCode) : '';
                  const isDuplicateWithOriginal = !!currentCode && allOriginalCodes.has(normalizedCurrentCode);
                  const isDuplicateWithReplacement = !!currentCode && (codeOccurrences[normalizedCurrentCode]?.length || 0) > 1;
                  const isDuplicateCode = isDuplicateWithOriginal || isDuplicateWithReplacement;
                  
                  // Validation CNCJ : vérifier si le code existe dans les codes CNCJ (normaliser à 7 chiffres)
                  // À l'étape 4, on affiche un warning si le code est CNCJ (mais pas bloquant)
                  // À l'étape 6, c'est une erreur bloquante
                  const isCncjCode = !!(currentCode && cncjCodes?.has(normalizedCurrentCode));
                  
                  // Récupérer la suggestion initiale pour comparer avec le code saisi
                  const initialSuggestion = conflictType === 'cncj-conflicts' 
                    ? initialCncjSuggestions.get(account.id) 
                    : initialSuggestions.get(account.id);
                  
                  return (
                    <DuplicateRow
                      key={account.id}
                      account={account}
                      replacementCode={currentCode || ''}
                      onReplacementCodeChange={onReplacementCodeChange || (() => {})}
                      isDuplicateCode={isDuplicateCode}
                      isCncjCode={isCncjCode}
                      conflictType={conflictType}
                      corrections={corrections}
                      suggestion={conflictType === 'cncj-conflicts' ? cncjSuggestions.get(account.id) : suggestions.get(account.id)}
                      initialSuggestion={initialSuggestion}
                      cncjForcedValidations={cncjForcedValidations}
                      onCncjForcedValidationChange={onCncjForcedValidationChange}
                    />
                  );
                });
              })()}
            </div>
          </div>
        </div>
      ) : showOnly === 'duplicates' ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-green-900 mb-3">
            ✅ Aucun conflit trouvé
          </h3>
          <p className="text-green-700">
            Aucun compte client ne correspond à un compte CNCJ.
          </p>
        </div>
      ) : null}

      {/* Correspondances */}
      {showOnly === 'all' && matches.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-green-900 mb-3">
            ✅ Comptes avec correspondance CNCJ ({matches.length})
          </h3>
          <div className="max-h-40 overflow-y-auto">
            <div className="space-y-2">
              {matches.map((account) => (
                <div key={account.id} className="grid grid-cols-2 gap-2 text-sm">
                  <div className="font-mono bg-green-100 px-2 py-1 rounded">
                    {getDisplayCode(account)}
                  </div>
                  <div className="bg-green-50 px-2 py-1 rounded">
                    {account.title || 'Sans titre'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sans correspondance */}
      {showOnly === 'all' && unmatchedClients.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-orange-900 mb-3">
            ❌ Comptes sans correspondance CNCJ ({unmatchedClients.length})
          </h3>
          <div className="max-h-40 overflow-y-auto">
            <div className="space-y-2">
              {unmatchedClients.map((account) => (
                <div key={account.id} className="grid grid-cols-2 gap-2 text-sm">
                  <div className="font-mono bg-orange-100 px-2 py-1 rounded">
                    {getDisplayCode(account)}
                  </div>
                  <div className="bg-orange-50 px-2 py-1 rounded">
                    {account.title || 'Sans titre'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* À créer */}
      {showOnly === 'all' && toCreate.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-purple-900 mb-3">
            🔧 Comptes à créer ({toCreate.length})
          </h3>
          <div className="max-h-40 overflow-y-auto">
            <div className="space-y-2">
              {toCreate.map((account) => (
                <div key={account.id} className="grid grid-cols-2 gap-2 text-sm">
                  <div className="font-mono bg-purple-100 px-2 py-1 rounded">
                    {getDisplayCode(account)}
                  </div>
                  <div className="bg-purple-50 px-2 py-1 rounded">
                    {account.title || 'Sans titre'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Actions - seulement s'il y a du contenu à afficher */}
      {(showOnly === 'all' || showOnly === 'duplicates') && (
        <div className="flex gap-4 justify-center">
        {showOnly === 'all' && (
          <button
            onClick={() => {
              // Export JSON pour les résultats complets
              const data = {
                duplicates: duplicates.map(d => d.number),
                matches: matches.map(m => m.number),
                unmatched: unmatchedClients.map(u => u.number),
                toCreate: toCreate.map(t => t.number)
              };
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'resultats-comptes.json';
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            📥 Exporter les résultats
          </button>
        )}

        {showOnly === 'duplicates' && (conflictType === 'duplicates' || conflictType === 'cncj-conflicts') && (
          <div className="w-full max-w-2xl">
            <DropZone
              dragState={dragState}
              disabled={false}
              loading={correctionsFileInfo?.loadStatus === 'loading'}
              fileInfo={correctionsFileInfo}
              onDragOver={handlers.handleDragOver}
              onDragLeave={handlers.handleDragLeave}
              onDrop={handlers.handleDrop}
              onClick={!correctionsFileInfo ? handlers.handleButtonClick : undefined}
              onKeyDown={(e) => handlers.handleKeyDown(e, !correctionsFileInfo ? handlers.handleButtonClick : undefined)}
              ariaLabel={!correctionsFileInfo
                ? (conflictType === 'cncj-conflicts'
                    ? "Zone de dépôt pour les corrections CNCJ. Glissez-déposez un fichier CSV ou cliquez pour parcourir"
                    : "Zone de dépôt pour les corrections. Glissez-déposez un fichier CSV ou cliquez pour parcourir")
                : `Fichier de corrections: ${correctionsFileInfo?.name}`}
            >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handlers.handleFileChange}
                      className="hidden"
                    />
                    
                    {!correctionsFileInfo && (
                      <div className="space-y-2">
                        <div className="mx-auto w-8 h-8 text-gray-400">
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </div>
                        <div className="text-sm text-gray-600">
                          <p className="font-medium text-xs sm:text-sm">
                            {conflictType === 'cncj-conflicts'
                              ? 'Glissez-déposez votre fichier de corrections CNCJ (CSV)'
                              : 'Glissez-déposez votre fichier de corrections CSV'}
                          </p>
                          <p className="text-xs">ou cliquez pour parcourir</p>
                        </div>
                      </div>
                    )}
                    
                    {correctionsFileInfo?.loadStatus === 'loading' && (
                      <div className="space-y-2">
                        <div className="mx-auto w-6 h-6 border-b-2 border-blue-600 rounded-full animate-spin"></div>
                        <p className="text-sm text-blue-600">Import des corrections...</p>
                      </div>
                    )}
                    
                    {correctionsFileInfo && (correctionsFileInfo.loadStatus === 'success' || correctionsFileInfo.loadStatus === 'error') && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                              correctionsFileInfo.loadStatus === 'success' ? 'bg-green-100 text-green-600' :
                              'bg-red-100 text-red-600'
                            }`}>
                              {correctionsFileInfo.loadStatus === 'success' ? (
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              ) : (
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                            <div className="text-left flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{correctionsFileInfo?.name}</p>
                              <p className="text-xs text-gray-500">{correctionsFileInfo?.size}</p>
                            </div>
                          </div>
                          
                          <button
                            type="button"
                            onClick={handleClearCorrectionsFile}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                        
                        <div className={`text-sm ${
                          correctionsFileInfo.loadStatus === 'success' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {correctionsFileInfo.loadStatus === 'success' ? 'Corrections importées avec succès' : 'Échec de l\'import'}
                        </div>
                        
                        <div className="flex justify-center space-x-2">
                          <button
                            type="button"
                            onClick={handlers.handleButtonClick}
                            className="px-3 py-1 text-xs bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors"
                          >
                            Changer le fichier
                          </button>
                        </div>
                      </div>
                    )}
                  </DropZone>
                </div>
            )}
            
                    </div>
      )}

      {/* Modal de détails des suggestions */}
      {showSuggestionDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center bg-purple-50">
              <h3 className="text-lg font-semibold text-purple-900">
                🔍 Détails des suggestions 
                {includeStep4InExport && conflictType === 'cncj-conflicts' && step4Duplicates ? (
                  <span> ({step4Duplicates.length} doublons + {duplicates.length} conflits CNCJ)</span>
                ) : (
                  <span> ({duplicates.length} {conflictType === 'cncj-conflicts' ? 'conflits' : 'doublons'})</span>
                )}
              </h3>
              <button
                onClick={() => setShowSuggestionDetails(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {/* Légende en haut du tableau (si case cochée) */}
              {includeStep4InExport && conflictType === 'cncj-conflicts' && (
                <div className="mb-4 flex gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-amber-200 border border-amber-400"></span>
                    <span className="text-gray-700">📋 Doublon (étape 4) : {step4Duplicates?.length || 0}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-red-200 border border-red-400"></span>
                    <span className="text-gray-700">⚠️ Conflit CNCJ (étape 6) : {duplicates.length}</span>
                  </div>
                </div>
              )}

              {/* Tableau combiné (mixé et trié par code 7 chiffres) */}
              {(() => {
                // Préparer les données combinées
                type CombinedRow = {
                  type: 'doublon' | 'cncj';
                  account: typeof duplicates[0];
                  suggestionDoublon: SuggestionResult | undefined;
                  suggestionCncj: SuggestionResult | undefined;
                  finalCode: string;
                };
                
                let combinedData: CombinedRow[] = [];
                const isCombined = includeStep4InExport && conflictType === 'cncj-conflicts';
                
                // Ajouter les données de l'étape actuelle
                duplicates.forEach(d => {
                  const suggestionResult = conflictType === 'cncj-conflicts' 
                    ? initialCncjSuggestions.get(d.id) 
                    : initialSuggestions.get(d.id);
                  combinedData.push({
                    type: conflictType === 'cncj-conflicts' ? 'cncj' : 'doublon',
                    account: d,
                    suggestionDoublon: conflictType === 'cncj-conflicts' ? undefined : suggestionResult,
                    suggestionCncj: conflictType === 'cncj-conflicts' ? suggestionResult : undefined,
                    finalCode: replacementCodes[d.id] || ''
                  });
                });
                
                // Si case cochée et étape 6, ajouter aussi les doublons de l'étape 4
                if (isCombined && step4Duplicates) {
                  step4Duplicates.forEach(d => {
                    combinedData.push({
                      type: 'doublon',
                      account: d,
                      suggestionDoublon: step4Suggestions?.get(d.id),
                      suggestionCncj: undefined,
                      finalCode: step4ReplacementCodes?.[d.id] || ''
                    });
                  });
                }
                
                // Trier par code 7 chiffres, puis par code original si égaux
                combinedData.sort((a, b) => {
                  const cmp = a.account.number.localeCompare(b.account.number);
                  if (cmp !== 0) return cmp;
                  // Si codes 7 chiffres égaux, trier par code original
                  const codeA = getDisplayCode(a.account);
                  const codeB = getDisplayCode(b.account);
                  return codeA.localeCompare(codeB);
                });
                
                return (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Code original</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Code 7 chiffres</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Titre</th>
                        {isCombined ? (
                          <>
                            <th className="px-3 py-2 text-left font-semibold text-amber-700 bg-amber-50">Suggestion Doublon</th>
                            <th className="px-3 py-2 text-left font-semibold text-red-700 bg-red-50">Suggestion CNCJ</th>
                          </>
                        ) : (
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">Suggestion</th>
                        )}
                        {isCombined && (
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">Code final</th>
                        )}
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Détail du calcul</th>
                      </tr>
                    </thead>
                    <tbody>
                      {combinedData.map((row, index) => {
                        const rowBgClass = isCombined 
                          ? (row.type === 'doublon' ? 'bg-amber-50' : 'bg-red-50')
                          : (index % 2 === 0 ? 'bg-white' : 'bg-gray-50');
                        
                        const currentSuggestion = row.type === 'doublon' ? row.suggestionDoublon : row.suggestionCncj;
                        
                        return (
                          <tr key={`${row.type}-${row.account.id}`} className={rowBgClass}>
                            <td className="px-3 py-2 font-mono text-xs">{getDisplayCode(row.account)}</td>
                            <td className="px-3 py-2 font-mono text-xs">{row.account.number}</td>
                            <td className="px-3 py-2 text-xs truncate max-w-[120px]" title={row.account.title}>{row.account.title || '-'}</td>
                            {isCombined ? (
                              <>
                                <td className="px-3 py-2 bg-amber-50/50">
                                  {row.suggestionDoublon?.code ? (
                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-xs font-mono border border-amber-300">
                                      {row.suggestionDoublon.code}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 text-xs">-</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 bg-red-50/50">
                                  {row.suggestionCncj?.code ? (
                                    <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded text-xs font-mono border border-red-300">
                                      {row.suggestionCncj.code}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 text-xs">-</span>
                                  )}
                                </td>
                              </>
                            ) : (
                              <td className="px-3 py-2">
                                {currentSuggestion?.code ? (
                                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-mono">
                                    {currentSuggestion.code}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded text-xs">
                                    Aucune
                                  </span>
                                )}
                              </td>
                            )}
                            {isCombined && (
                              <td className="px-3 py-2">
                                {row.finalCode ? (
                                  <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-mono">
                                    {row.finalCode}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 text-xs">-</span>
                                )}
                              </td>
                            )}
                            <td className="px-3 py-2 text-xs text-gray-600">
                              {currentSuggestion?.reason || '-'}
                              {currentSuggestion?.blockedBy && (
                                <span className={`ml-1 px-1.5 py-0.5 rounded text-xs ${
                                  currentSuggestion.blockedBy === 'cncj' ? 'bg-red-100 text-red-700' :
                                  currentSuggestion.blockedBy === 'client' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-purple-100 text-purple-700'
                                }`}>
                                  {currentSuggestion.blockedBy === 'cncj' ? 'CNCJ' :
                                   currentSuggestion.blockedBy === 'client' ? 'Client' : 'CNCJ+Client'}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                );
              })()}
            </div>
            <div className="p-4 border-t bg-gray-50 flex flex-col gap-3">
              {/* Case à cocher pour inclure l'étape 4 (seulement à l'étape 6) */}
              {conflictType === 'cncj-conflicts' && step4Duplicates && step4Duplicates.length > 0 && (
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeStep4InExport}
                    onChange={(e) => setIncludeStep4InExport(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span>Inclure les données de l'étape 4 (doublons) dans l'export</span>
                  <span className="text-xs text-gray-500">({step4Duplicates.length} doublons)</span>
                </label>
              )}
              
              <div className="flex justify-between">
                <button
                  onClick={() => {
                    // Export CSV des détails de suggestions (mixé et trié si case cochée)
                    type ExportRow = {
                      type: 'doublon' | 'cncj';
                      code7: string;
                      suggestionDoublon: string;
                      suggestionCncj: string;
                      data: string[];
                    };
                    
                    let allRows: ExportRow[] = [];
                    const isCombined = includeStep4InExport && conflictType === 'cncj-conflicts';
                    
                    // Ajouter les données de l'étape actuelle
                    duplicates.forEach(d => {
                      const suggestionResult = conflictType === 'cncj-conflicts' 
                        ? initialCncjSuggestions.get(d.id) 
                        : initialSuggestions.get(d.id);
                      const finalCode = replacementCodes[d.id] || '';
                      
                      if (isCombined) {
                        // Pour CNCJ, la suggestion va dans la colonne CNCJ
                        allRows.push({
                          type: 'cncj',
                          code7: d.number,
                          suggestionDoublon: '',
                          suggestionCncj: suggestionResult?.code || '',
                          data: [
                            getDisplayCode(d),
                            d.number,
                            d.title || '',
                            '', // Suggestion Doublon (vide pour CNCJ)
                            suggestionResult?.code || '', // Suggestion CNCJ
                            finalCode,
                            suggestionResult?.reason || '',
                            suggestionResult?.blockedBy || ''
                          ]
                        });
                      } else {
                        allRows.push({
                          type: conflictType === 'cncj-conflicts' ? 'cncj' : 'doublon',
                          code7: d.number,
                          suggestionDoublon: conflictType !== 'cncj-conflicts' ? (suggestionResult?.code || '') : '',
                          suggestionCncj: conflictType === 'cncj-conflicts' ? (suggestionResult?.code || '') : '',
                          data: [
                            getDisplayCode(d),
                            d.number,
                            d.title || '',
                            suggestionResult?.code || '',
                            suggestionResult?.reason || '',
                            suggestionResult?.blockedBy || ''
                          ]
                        });
                      }
                    });
                    
                    // Si case cochée et étape 6, ajouter aussi les doublons de l'étape 4
                    if (isCombined && step4Duplicates && step4Suggestions) {
                      step4Duplicates.forEach(d => {
                        const suggestionResult = step4Suggestions.get(d.id);
                        const finalCode = step4ReplacementCodes?.[d.id] || '';
                        
                        // Pour Doublon, la suggestion va dans la colonne Doublon
                        allRows.push({
                          type: 'doublon',
                          code7: d.number,
                          suggestionDoublon: suggestionResult?.code || '',
                          suggestionCncj: '',
                          data: [
                            getDisplayCode(d),
                            d.number,
                            d.title || '',
                            suggestionResult?.code || '', // Suggestion Doublon
                            '', // Suggestion CNCJ (vide pour Doublon)
                            finalCode,
                            suggestionResult?.reason || '',
                            suggestionResult?.blockedBy || ''
                          ]
                        });
                      });
                    }
                    
                    // Trier par code 7 chiffres, puis par code original si égaux
                    allRows.sort((a, b) => {
                      const cmp = a.code7.localeCompare(b.code7);
                      if (cmp !== 0) return cmp;
                      // Si codes 7 chiffres égaux, trier par code original (2ème élément du data)
                      return a.data[0].localeCompare(b.data[0]);
                    });
                    
                    // Construire le CSV
                    const headers = isCombined
                      ? ['code original', 'code 7 chiffres', 'titre', 'suggestion doublon', 'suggestion CNCJ', 'code final', 'détail calcul', 'source blocage']
                      : ['code original', 'code 7 chiffres', 'titre', 'suggestion', 'détail calcul', 'source blocage'];
                    
                    let csvContent = headers.join(';') + '\n';
                    csvContent += allRows.map(row => row.data.map(cell => `"${sanitizeCsvValue(cell).replace(/"/g, '""')}"`).join(';')).join('\n');
                    
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = isCombined 
                      ? 'details_suggestions_complet.csv' 
                      : (conflictType === 'cncj-conflicts' ? 'details_suggestions_cncj.csv' : 'details_suggestions_doublons.csv');
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  📥 Exporter CSV
                </button>
                <button
                  onClick={() => setShowSuggestionDetails(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
