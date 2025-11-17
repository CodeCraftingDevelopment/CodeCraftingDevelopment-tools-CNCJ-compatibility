import React, { useCallback, useState } from 'react';
import { ProcessingResult, FileMetadata, Account } from '../types/accounts';
import { useDragAndDrop } from '../hooks/useDragAndDrop';
import { DropZone } from './DropZone';
import { formatFileSize } from '../utils/fileUtils';

type FilterType = 'all' | 'corrected' | 'uncorrected';

interface ResultsDisplayProps {
  result: ProcessingResult | null;
  loading?: boolean;
  showOnly?: 'duplicates' | 'all' | 'review';
  replacementCodes?: { [key: string]: string };
  onReplacementCodeChange?: (accountId: string, code: string) => void;
  conflictType?: 'duplicates' | 'cncj-conflicts';
  suggestions?: { [key: string]: string | 'error' };
  cncjCodes?: Set<string>;
  mergedClientAccounts?: Account[];
}

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ 
  result, 
  loading = false, 
  showOnly = 'all', 
  replacementCodes = {}, 
  onReplacementCodeChange,
  conflictType = 'duplicates',
  suggestions = {},
  cncjCodes,
  mergedClientAccounts
}) => {
  // État pour le filtre des lignes corrigées (step3 uniquement)
  const [correctionFilter, setCorrectionFilter] = useState<FilterType>('all');
  
  // Déclarer les variables avant le useCallback
  const { duplicates = [], uniqueClients = [], matches = [], unmatchedClients = [] } = result || {};
  
  // État pour le glisser-déposé des corrections
  const [correctionsFileInfo, setCorrectionsFileInfo] = useState<FileMetadata | null>(null);
  
  
  const processCorrectionsFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      return;
    }

    // Set loading state
    setCorrectionsFileInfo({
      name: file.name,
      size: formatFileSize(file.size),
      rowCount: 0,
      loadStatus: 'loading'
    });

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const lines = content.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        setCorrectionsFileInfo({
          name: file.name,
          size: formatFileSize(file.size),
          rowCount: 0,
          loadStatus: 'error'
        });
        return;
      }

      // Valider les en-têtes
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      if (!headers.includes('Code remplacement')) {
        setCorrectionsFileInfo({
          name: file.name,
          size: formatFileSize(file.size),
          rowCount: 0,
          loadStatus: 'error'
        });
        return;
      }

      // Skip header and process each line
      let processedCount = 0;
      let duplicateCodeCount = 0;
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Parse CSV line (handle quoted values)
        // Format: Numéro compte, Titre, Code remplacement (recherche par numéro ET titre)
        const match = line.match(/^"?([^"]*)"?,\s*"?([^"]*)"?,\s*"?([^"]*)"?,?/);
        if (match) {
          const accountNumber = match[1].trim();
          const title = match[2].trim();
          const replacementCode = match[3].trim(); // Utiliser la 3ème colonne "Code remplacement"
          
          // Validate that both account number and title are provided
          if (!accountNumber || !title || !replacementCode) {
            continue;
          }
          
          // Find the duplicate account by number AND title (case-insensitive for title)
          const duplicateAccount = duplicates.find(d => 
            d.number === accountNumber && 
            d.title && d.title.toLowerCase().trim() === title.toLowerCase()
          );
          
          // Check if replacement code already exists in current codes
          const existingCodes = Object.values(replacementCodes);
          const isDuplicate = existingCodes.includes(replacementCode);
          
          // Check if replacement code conflicts with original client codes
          const allOriginalCodes = new Set([
            ...uniqueClients.map(acc => acc.number),
            ...matches.map(acc => acc.number), 
            ...unmatchedClients.map(acc => acc.number)
          ]);
          const conflictsWithOriginal = allOriginalCodes.has(replacementCode);
          
          // Apply the code immediately if duplicate account is found
          if (duplicateAccount) {
            onReplacementCodeChange?.(duplicateAccount.id, replacementCode);
            processedCount++;
            
            if (isDuplicate || conflictsWithOriginal) {
              duplicateCodeCount++;
            }
          }
        }
      }
      
      // Set success state
      setCorrectionsFileInfo({
        name: file.name,
        size: formatFileSize(file.size),
        rowCount: processedCount,
        loadStatus: 'success'
      });
    };
    
    reader.onerror = () => {
      setCorrectionsFileInfo({
        name: file.name,
        size: formatFileSize(file.size),
        rowCount: 0,
        loadStatus: 'error'
      });
    };
    
    reader.readAsText(file);
  }, [duplicates, onReplacementCodeChange]);
  
  const { dragState, fileInputRef, handlers } = useDragAndDrop({
    disabled: false,
    onDrop: processCorrectionsFile,
    acceptedTypes: ['.csv']
  });


  const handleClearCorrectionsFile = useCallback(() => {
    setCorrectionsFileInfo(null);
  }, []);


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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
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
          </div>
        </div>
      ) : null}

      {/* Export des doublons - entre résumé et détails */}
      {showOnly === 'duplicates' && duplicates.length > 0 && (
        <div className="flex justify-center mb-6 gap-4">
          <button
            onClick={() => {
              // Export CSV pour les doublons (step 2)
              const csvHeaders = ['Numéro compte', 'Titre', 'Code remplacement'];
              const csvRows = duplicates.map(d => [
                d.number,
                d.title || '',
                replacementCodes[d.id] || ''
              ]);
              
              const csvContent = [
                csvHeaders.join(','),
                ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
              ].join('\n');
              
              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'doublons-comptes.csv';
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            📥 {conflictType === 'cncj-conflicts' ? 'Exporter les suggestions' : 'Exporter les doublons'}
          </button>
          {conflictType === 'cncj-conflicts' && (
            <button
              onClick={() => {
                // Appliquer toutes les suggestions valides
                duplicates.forEach(duplicate => {
                  const suggestion = suggestions[duplicate.id];
                  if (suggestion && suggestion !== 'error') {
                    onReplacementCodeChange?.(duplicate.id, suggestion);
                  }
                });
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              ✅ Valider les suggestions
            </button>
          )}
        </div>
      )}

      {/* Review Table - Tableau des corrections */}
      {showOnly === 'review' && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          {/* Boutons de filtrage */}
          <div className="mb-4 flex justify-center space-x-2">
            {(() => {
              const totalCount = mergedClientAccounts?.length || 0;
              const correctedCount = mergedClientAccounts?.filter(acc => replacementCodes[acc.id]?.trim()).length || 0;
              const uncorrectedCount = totalCount - correctedCount;
              
              return (
                <>
                  <button
                    onClick={() => setCorrectionFilter('all')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      correctionFilter === 'all' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Tous ({totalCount})
                  </button>
                  <button
                    onClick={() => setCorrectionFilter('corrected')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      correctionFilter === 'corrected' 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Corrigés ({correctedCount})
                  </button>
                  <button
                    onClick={() => setCorrectionFilter('uncorrected')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      correctionFilter === 'uncorrected' 
                        ? 'bg-gray-600 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Non corrigés ({uncorrectedCount})
                  </button>
                </>
              );
            })()}
          </div>
          
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-300">
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Données d'origine</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Valeur corrigée</th>
                </tr>
              </thead>
              <tbody>
                {(mergedClientAccounts || [])
                  .filter(account => {
                    if (correctionFilter === 'all') return true;
                    const isCorrected = !!replacementCodes[account.id]?.trim();
                    return correctionFilter === 'corrected' ? isCorrected : !isCorrected;
                  })
                  .sort((a, b) => a.number.localeCompare(b.number))
                  .map((account, index) => {
                    const replacementCode = replacementCodes[account.id]?.trim();
                    const isCorrected = !!replacementCode;
                    return (
                      <tr key={account.id} className={`border-b ${isCorrected ? 'bg-green-100 border-l-4 border-green-500' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <div className="font-mono text-gray-900">{account.number}</div>
                            <div className="text-gray-600 text-xs">{account.title || 'Sans titre'}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-2">
                            <div className={`font-mono ${isCorrected ? 'text-green-700 font-bold bg-green-200' : 'text-gray-700 bg-gray-100'} px-3 py-2 rounded flex-1`}>
                              {replacementCode || account.number}
                            </div>
                            {isCorrected && (
                              <div className="text-green-600">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
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
                    if (!codeOccurrences[trimmedCode]) {
                      codeOccurrences[trimmedCode] = [];
                    }
                    codeOccurrences[trimmedCode].push(accountId);
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
                  const isEmpty = !currentCode;
                  const isDuplicateWithOriginal = currentCode && allOriginalCodes.has(currentCode);
                  const isDuplicateWithReplacement = currentCode && (codeOccurrences[currentCode]?.length || 0) > 1;
                  const isDuplicateCode = isDuplicateWithOriginal || isDuplicateWithReplacement;
                  
                  // Validation CNCJ : vérifier si le code existe dans les codes CNCJ
                  const isCncjCode = conflictType === 'cncj-conflicts' && currentCode && cncjCodes?.has(currentCode);
                  
                  let rowColorClass, numberColorClass, titleColorClass, inputColorClass, focusRingClass;
                  
                  if (isEmpty) {
                    // Code vide - style neutre
                    rowColorClass = 'bg-gray-50 border-gray-200';
                    numberColorClass = 'bg-gray-100';
                    titleColorClass = 'bg-gray-50';
                    inputColorClass = 'border-gray-300 bg-gray-50';
                    focusRingClass = 'focus:ring-gray-400';
                  } else if (isCncjCode) {
                    // Code CNCJ - rouge vif avec croix
                    rowColorClass = 'bg-red-100 border-red-500';
                    numberColorClass = 'bg-red-200';
                    titleColorClass = 'bg-red-100';
                    inputColorClass = 'border-red-500 bg-red-100';
                    focusRingClass = 'focus:ring-red-500';
                  } else if (isDuplicateCode) {
                    // Code en doublon - rouge foncé
                    rowColorClass = 'bg-red-100 border-red-400';
                    numberColorClass = 'bg-red-200';
                    titleColorClass = 'bg-red-100';
                    inputColorClass = 'border-red-400 bg-red-100';
                    focusRingClass = 'focus:ring-red-400';
                  } else {
                    // Code unique - vert
                    rowColorClass = 'bg-green-50 border-green-300';
                    numberColorClass = 'bg-green-100';
                    titleColorClass = 'bg-green-50';
                    inputColorClass = 'border-green-300 bg-green-50';
                    focusRingClass = 'focus:ring-green-400';
                  }
                  
                  return (
                    <div key={account.id} className={`border ${rowColorClass} rounded-lg p-3`}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-3">
                        <div className={`font-mono ${numberColorClass} px-2 py-1 rounded`}>
                          {account.number}
                        </div>
                        <div className={`${titleColorClass} px-2 py-1 rounded`}>
                          {account.title || 'Sans titre'}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <label className="text-xs text-gray-600 whitespace-nowrap">
                          Code remplacement:
                        </label>
                        <div className="relative flex items-center">
                          <input
                            type="text"
                            value={replacementCodes[account.id] || ''}
                            onChange={(e) => onReplacementCodeChange?.(account.id, e.target.value)}
                            placeholder="Nouveau code"
                            className={`w-32 px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 ${focusRingClass} ${inputColorClass}`}
                          />
                          {isDuplicateCode && (
                            <div className="absolute -right-5 top-1/2 transform -translate-y-1/2 text-red-600">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                          {isCncjCode && (
                            <div className="absolute -right-5 top-1/2 transform -translate-y-1/2 text-red-600">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Afficher les suggestions pour les conflits CNCJ */}
                      {conflictType === 'cncj-conflicts' && suggestions[account.id] && (
                        <div className="mt-2 flex items-center space-x-2">
                          <span className="text-xs text-gray-600">Suggestion:</span>
                          {suggestions[account.id] === 'error' ? (
                            <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">
                              Aucune solution disponible (contrainte dizaine)
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded font-mono">
                              {account.number} → {suggestions[account.id]}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      ) : showOnly === 'duplicates' ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-green-900 mb-3">
            ✅ Aucun doublon détecté
          </h3>
          <p className="text-green-700">
            Tous les comptes clients sont uniques. Aucune action n'est requise.
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
                    {account.number}
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
                    {account.number}
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
                unmatched: unmatchedClients.map(u => u.number)
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

        {showOnly === 'duplicates' && conflictType === 'duplicates' && (
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
              ariaLabel={!correctionsFileInfo ? "Zone de dépôt pour les corrections. Glissez-déposez un fichier CSV ou cliquez pour parcourir" : `Fichier de corrections: ${correctionsFileInfo?.name}`}
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
                          <p className="font-medium text-xs sm:text-sm">Glissez-déposez votre fichier de corrections CSV</p>
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
