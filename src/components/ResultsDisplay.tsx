import React, { useEffect, useMemo } from 'react';
import { ProcessingResult, Account } from '../types/accounts';
import { useDragAndDrop } from '../hooks/useDragAndDrop';
import { useCorrectionsImport } from '../hooks/useCorrectionsImport';
import { DropZone } from './DropZone';
import { DuplicateRow } from './DuplicateRow';
import { ReviewView } from './ReviewView';
import { calculateSuggestions } from '../utils/codeSuggestions';
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
  mergedClientAccounts?: Account[];
  originalClientAccounts?: Account[];
  duplicateIdsFromStep4?: Set<string>;
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
  mergedClientAccounts,
  originalClientAccounts,
  duplicateIdsFromStep4
}) => {
  // Déclarer les variables avant le useCallback
  const { duplicates = [], uniqueClients = [], matches = [], unmatchedClients = [], toCreate = [] } = result || {};
  
  // Calculer les suggestions pour les doublons (seulement pour l'étape 4)
  const suggestions = useMemo(() => {
    if (conflictType !== 'duplicates' || duplicates.length === 0) {
      return new Map<string, string | null>();
    }
    
    // Obtenir tous les codes originaux (sauf les doublons)
    const existingCodes = new Set([
      ...uniqueClients.map(acc => acc.number),
      ...matches.map(acc => acc.number),
      ...unmatchedClients.map(acc => acc.number)
    ]);
    
    // DEBUG: Logger la source des codes 467001*
    const filter467001 = (accounts: Account[]) => 
      accounts.filter(a => a.number.startsWith('467001')).map(a => a.number);
    
    const unique467001 = filter467001(uniqueClients);
    const matches467001 = filter467001(matches);
    const unmatched467001 = filter467001(unmatchedClients);
    
    if (unique467001.length > 0 || matches467001.length > 0 || unmatched467001.length > 0) {
      // Source des codes 467001*:
      // uniqueClients:
      // matches:
      // unmatchedClients:
    }
    
    return calculateSuggestions(duplicates, existingCodes, replacementCodes);
  }, [duplicates, uniqueClients, matches, unmatchedClients, replacementCodes, conflictType]);
  
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
        <div className="flex justify-center mb-6 gap-4">
          <button
            onClick={() => {
              // Export CSV pour les doublons (step 4) ou conflits CNCJ (step 6)
              const csvHeaders = conflictType === 'cncj-conflicts' 
                ? ['code client', 'code 7 chiffres', 'titre', 'code remplacement']
                : ['code client', 'code 7 chiffres', 'titre', 'code remplacement', 'suggestion'];
              const csvRows = duplicates.map(d => {
                const codeClient = getDisplayCode(d); // Code 8 chiffres original ou fallback
                const code7Chiffres = d.number.padStart(7, '0');
                const titre = d.title || '';
                const codeRemplacement = replacementCodes[d.id] || '';
                const suggestion = suggestions.get(d.id) || '';
                
                const rowData = [codeClient, code7Chiffres, titre, codeRemplacement];
                if (conflictType !== 'cncj-conflicts') {
                  rowData.push(suggestion);
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
          
          {/* Bouton pour valider toutes les suggestions - uniquement pour l'étape 4 */}
          {conflictType === 'duplicates' && (
            <button
              onClick={() => {
                if (!onReplacementCodeChange) return;
                
                // Appliquer toutes les suggestions disponibles
                suggestions.forEach((suggestedCode, accountId) => {
                  // Appliquer uniquement si :
                  // 1. Il y a une suggestion (pas null)
                  // 2. Le champ est vide (pas déjà rempli)
                  if (suggestedCode && !replacementCodes[accountId]?.trim()) {
                    onReplacementCodeChange(accountId, suggestedCode);
                  }
                });
              }}
              disabled={(() => {
                // Désactiver si aucune suggestion disponible
                const availableSuggestions = Array.from(suggestions.entries()).filter(
                  ([accountId, suggestedCode]) => suggestedCode && !replacementCodes[accountId]?.trim()
                );
                return availableSuggestions.length === 0;
              })()}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              title={(() => {
                const availableSuggestions = Array.from(suggestions.entries()).filter(
                  ([accountId, suggestedCode]) => suggestedCode && !replacementCodes[accountId]?.trim()
                );
                return availableSuggestions.length > 0 
                  ? `Appliquer ${availableSuggestions.length} suggestion(s) automatique(s)`
                  : 'Aucune suggestion disponible';
              })()}
            >
              ✨ Valider les suggestions
            </button>
          )}
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
                const allOriginalCodes = new Set([
                  ...uniqueClients.map(acc => acc.number),
                  ...matches.map(acc => acc.number), 
                  ...unmatchedClients.map(acc => acc.number)
                ]);
                
                return duplicates.map((account) => {
                  const currentCode = replacementCodes[account.id]?.trim();
                  const normalizedCurrentCode = currentCode ? normalizeAccountCode(currentCode) : '';
                  const isDuplicateWithOriginal = !!currentCode && allOriginalCodes.has(normalizedCurrentCode);
                  const isDuplicateWithReplacement = !!currentCode && (codeOccurrences[normalizedCurrentCode]?.length || 0) > 1;
                  const isDuplicateCode = isDuplicateWithOriginal || isDuplicateWithReplacement;
                  
                  // Validation CNCJ : vérifier si le code existe dans les codes CNCJ (normaliser à 7 chiffres)
                  const isCncjCode = !!(conflictType === 'cncj-conflicts' && currentCode && cncjCodes?.has(normalizedCurrentCode));
                  
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
                      suggestedCode={suggestions.get(account.id)}
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
    </div>
  );
};
