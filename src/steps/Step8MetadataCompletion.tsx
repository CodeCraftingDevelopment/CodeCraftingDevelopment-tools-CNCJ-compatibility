import React, { useState, useMemo } from 'react';
import { Account, ProcessingResult } from '../types/accounts';
import { StepStatsGrid, StepStat, StepEmptyState } from './components/StepContent';
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
}

interface MetadataRow {
  id: string;
  title: string;
  finalCode: string;
  inheritedData: Record<string, any>;
  isInherited: boolean;
  hasClosestMatch: boolean; // true si la recherche a abouti, false sinon
  isInPcg: boolean; // pour le filtrage correct
}

interface Step8MetadataCompletionProps {
  clientAccounts: Account[];
  mergedClientAccounts: Account[];
  generalAccounts: Account[];
  replacementCodes: { [key: string]: string };
  cncjReplacementCodes: { [key: string]: string };
  result: ProcessingResult | null;
  cncjConflictResult: ProcessingResult | null;
  cncjConflictCorrections: { [key: string]: string | 'error' };
  onMetadataChange: (accountId: string, metadata: Record<string, any>) => void;
}

export const Step8MetadataCompletion: React.FC<Step8MetadataCompletionProps> = ({
  clientAccounts,
  mergedClientAccounts,
  generalAccounts,
  replacementCodes,
  cncjReplacementCodes,
  result,
  cncjConflictResult,
  cncjConflictCorrections,
  onMetadataChange
}) => {
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'withMatch' | 'withoutMatch'>('withoutMatch');

  // Normaliser un code à 7 chiffres pour l'affichage
  const normalizeForDisplay = (code: string): string => {
    if (!code || code === '-' || code === 'Erreur') return code;
    return code.length > 7 ? code.slice(0, 7) : code.padEnd(7, '0');
  };

  // Calculer le code final pour un compte
  const computeFinalCode = (account: Account): string => {
    const step4Ids = new Set(result?.duplicates?.map(d => d.id) || []);
    const step6Ids = new Set(cncjConflictResult?.duplicates?.map(d => d.id) || []);
    
    const isStep4Duplicate = step4Ids.has(account.id);
    const isStep6Conflict = step6Ids.has(account.id);
    
    // Logique pour calculer le code final
    if (isStep6Conflict && cncjReplacementCodes[account.id]) {
      return cncjReplacementCodes[account.id];
    }
    if (isStep4Duplicate && replacementCodes[account.id]) {
      return replacementCodes[account.id];
    }
    return account.number;
  };

  // Reconstruire les données de résumé (logique de l'étape 7)
  const finalSummaryData: SummaryRow[] = useMemo(() => {
    const step4Ids = new Set(result?.duplicates?.map(d => d.id) || []);
    const step6Ids = new Set(cncjConflictResult?.duplicates?.map(d => d.id) || []);
    const toCreateIds = new Set(result?.toCreate?.map(t => t.id) || []);
    
    return clientAccounts.map((account): SummaryRow => {
      const mergedAccount = mergedClientAccounts.find(m => m.id === account.id);
      const correctedByCncj = cncjReplacementCodes[account.id];
      const hasCncjError = cncjConflictCorrections[account.id] === 'error';
      
      const isStep4Duplicate = step4Ids.has(account.id);
      const isStep6Conflict = step6Ids.has(account.id);
      const isToCreate = toCreateIds.has(account.id);
      
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
      
      const cncjCorrection = correctedByCncj !== undefined && correctedByCncj !== '' 
        ? correctedByCncj 
        : (hasCncjError ? 'Erreur' : '-');
      
      return {
        id: account.id,
        title: account.title || 'Sans titre',
        originalCode: getDisplayCode(account),
        correctedCode: correctedCode,
        cncjCorrection: cncjCorrection,
        wasModified: replacementCodes[account.id] !== undefined || cncjReplacementCodes[account.id] !== undefined,
        modificationSource,
        isStep4Duplicate,
        isStep6Conflict,
        isToCreate
      };
    });
  }, [clientAccounts, mergedClientAccounts, result, cncjConflictResult, replacementCodes, cncjReplacementCodes, cncjConflictCorrections]);

  // Fonction partagée pour échapper correctement les guillemets et caractères spéciaux dans les cellules CSV
  const escapeCsvCell = (cell: any): string => {
    if (cell === undefined || cell === null) return '""';
    const cellStr = String(cell);
    const cleaned = cellStr.replace(/[\r\n]+/g, ' ');
    const escaped = cleaned.replace(/"/g, '""');
    return `"${escaped}"`;
  };

  // Export des correspondances (logique de l'étape 7)
  const handleExport = () => {
    try {
      const csvHeaders = ['account_title', 'original_client_code', 'final_code'];
      
      const csvRows = finalSummaryData.map(row => {
        const finalCode = computeFinalCodeForSummary(row);
        return [row.title, row.originalCode, normalizeForDisplay(finalCode)];
      });
      
      const escapedHeaders = csvHeaders.map(escapeCsvCell);
      
      const csvContent = [
        escapedHeaders.join(';'),
        ...csvRows.map(row => row.map(escapeCsvCell).join(';'))
      ].join('\n');
      
      const bom = '\uFEFF';
      const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'correspondances-comptes.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur lors de l\'export des correspondances:', error);
      alert('Une erreur est survenue lors de l\'export. Veuillez réessayer.');
    }
  };

  // Export PCG complet (logique de l'étape 7)
  const handleExportPcgToCreate = () => {
    try {
      if (generalAccounts.length === 0) {
        alert('Veuillez charger le fichier des comptes PCG avant d\'exporter.');
        return;
      }

      const csvHeaders = [
        'importId', 'code', 'parent_code', 'name', 'accountType.importId', 
        'isRegulatoryAccount', 'commonPosition', 'reconcileOk', 'compatibleAccounts',
        'useForPartnerBalance', 'isTaxAuthorizedOnMoveLine', 'isTaxRequiredOnMoveLine',
        'defaultTaxSet', 'vatSystemSelect', 'isRetrievedOnPaymentSession', 'serviceType.code',
        'manageCutOffPeriod', 'hasAutomaticApplicationAccountingDate',
        'analyticDistributionAuthorized', 'analyticDistributionRequiredOnInvoiceLines',
        'analyticDistributionRequiredOnMoveLines', 'analyticDistributionTemplate.importId',
        'statusSelect', 'isCNCJ'
      ];

      const pcgLookup = new Map<string, Account>();
      generalAccounts.forEach(account => {
        pcgLookup.set(account.number, account);
      });

      const clientCodesNotInPcg = finalSummaryData.filter(row => {
        const finalCode = normalizeForDisplay(computeFinalCodeForSummary(row));
        return !pcgLookup.has(finalCode);
      });

      const pcgAccountsByPrefix = new Map<string, typeof generalAccounts>();
      generalAccounts.forEach(account => {
        const codeNum = parseInt(account.number);
        if (!isNaN(codeNum) && account.number.length >= 4) {
          const prefix = account.number.substring(0, 4);
          if (!pcgAccountsByPrefix.has(prefix)) {
            pcgAccountsByPrefix.set(prefix, []);
          }
          pcgAccountsByPrefix.get(prefix)?.push(account);
        }
      });

      const csvRows: string[][] = [];

      // Comptes PCG existants
      const pcgAccountRows = generalAccounts.map((account, index) => {
        const data = account.rawData || {};
        const importId = data.importId || `PCG${String(index + 1).padStart(4, '0')}`;
        
        return {
          code: parseInt(account.number) || 0,
          row: [
            importId,
            account.number,
            data.parent_code || '',
            account.title || '',
            data['accountType.importId'] || 'AT001',
            data.isRegulatoryAccount || 'false',
            data.commonPosition || '0',
            data.reconcileOk || '',
            data.compatibleAccounts || '',
            data.useForPartnerBalance || '',
            data.isTaxAuthorizedOnMoveLine || '',
            data.isTaxRequiredOnMoveLine || '',
            data.defaultTaxSet || '',
            data.vatSystemSelect || '',
            data.isRetrievedOnPaymentSession || '',
            data['serviceType.code'] || '',
            data.manageCutOffPeriod || '',
            data.hasAutomaticApplicationAccountingDate || '',
            data.analyticDistributionAuthorized || '',
            data.analyticDistributionRequiredOnInvoiceLines || '',
            data.analyticDistributionRequiredOnMoveLines || '',
            data['analyticDistributionTemplate.importId'] || '',
            data.statusSelect || '1',
            data.isCNCJ || 'false'
          ]
        };
      });

      // Comptes clients non présents dans PCG avec héritage
      const clientAccountRows = clientCodesNotInPcg.map((row, index) => {
        const importId = `CLIENT${String(index + 1).padStart(4, '0')}`;
        const code = normalizeForDisplay(computeFinalCodeForSummary(row));
        const name = row.title;
        
        let inheritedData: Record<string, any> = {};
        
        if (code.length >= 4) {
          const prefix = code.substring(0, 4);
          const codeNum = parseInt(code);
          
          if (!isNaN(codeNum)) {
            const matchingPcgAccounts = pcgAccountsByPrefix.get(prefix) || [];
            
            if (matchingPcgAccounts.length > 0) {
              const closestPcgAccount = matchingPcgAccounts.reduce((closest, current) => {
                const currentDiff = Math.abs(codeNum - parseInt(current.number));
                const closestDiff = Math.abs(codeNum - parseInt(closest.number));
                return currentDiff < closestDiff ? current : closest;
              });
              
              inheritedData = {...(closestPcgAccount.rawData || {})};
              delete inheritedData.importId;
              delete inheritedData.code;
              delete inheritedData.name;
            }
          }
        }
        
        return {
          code: parseInt(code) || 0,
          row: [
            importId,
            code,
            inheritedData.parent_code || '',
            name,
            inheritedData['accountType.importId'] || 'AT001',
            inheritedData.isRegulatoryAccount || 'false',
            inheritedData.commonPosition || '0',
            inheritedData.reconcileOk || '',
            inheritedData.compatibleAccounts || '',
            inheritedData.useForPartnerBalance || '',
            inheritedData.isTaxAuthorizedOnMoveLine || '',
            inheritedData.isTaxRequiredOnMoveLine || '',
            inheritedData.defaultTaxSet || '',
            inheritedData.vatSystemSelect || '',
            inheritedData.isRetrievedOnPaymentSession || '',
            inheritedData['serviceType.code'] || '',
            inheritedData.manageCutOffPeriod || '',
            inheritedData.hasAutomaticApplicationAccountingDate || '',
            inheritedData.analyticDistributionAuthorized || '',
            inheritedData.analyticDistributionRequiredOnInvoiceLines || '',
            inheritedData.analyticDistributionRequiredOnMoveLines || '',
            inheritedData['analyticDistributionTemplate.importId'] || '',
            inheritedData.statusSelect || '1',
            inheritedData.isCNCJ || 'false'
          ]
        };
      });

      const allAccounts = [...pcgAccountRows, ...clientAccountRows].sort((a, b) => a.code - b.code);
      
      allAccounts.forEach(account => {
        csvRows.push(account.row);
      });
      
      const escapedHeaders = csvHeaders.map(escapeCsvCell);
      
      const csvContent = [
        escapedHeaders.join(';'),
        ...csvRows.map(row => row.map(escapeCsvCell).join(';'))
      ].join('\n');
      
      const bom = '\uFEFF';
      const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'comptes-pcg-complet.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur lors de l\'export PCG complet:', error);
      alert('Une erreur est survenue lors de l\'export PCG. Veuillez réessayer.');
    }
  };

  // Fonction utilitaire pour calculer le code final depuis SummaryRow
  const computeFinalCodeForSummary = (row: SummaryRow): string => {
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

  // Identifier les comptes qui ne sont PAS dans PCG et qui ont besoin de métadonnées
  const metadataData: MetadataRow[] = useMemo(() => {
    const pcgLookup = new Map<string, Account>();
    generalAccounts.forEach(account => {
      pcgLookup.set(account.number, account);
    });

    const pcgAccountsByPrefix = new Map<string, Account[]>();
    generalAccounts.forEach(account => {
      const codeNum = parseInt(account.number);
      if (!isNaN(codeNum) && account.number.length >= 4) {
        const prefix = account.number.substring(0, 4);
        if (!pcgAccountsByPrefix.has(prefix)) {
          pcgAccountsByPrefix.set(prefix, []);
        }
        pcgAccountsByPrefix.get(prefix)?.push(account);
      }
    });

    return clientAccounts.map(account => {
      const finalCode = normalizeForDisplay(computeFinalCode(account));
      const isInPcg = pcgLookup.has(finalCode);
      
      let inheritedData: Record<string, any> = {};
      let isInherited = false;
      let matchingPcgAccounts: Account[] = [];

      if (!isInPcg && finalCode.length >= 4) {
        const prefix = finalCode.substring(0, 4);
        const codeNum = parseInt(finalCode);
        
        if (!isNaN(codeNum)) {
          matchingPcgAccounts = pcgAccountsByPrefix.get(prefix) || [];
          
          if (matchingPcgAccounts.length > 0) {
            const closestPcgAccount = matchingPcgAccounts.reduce((closest, current) => {
              const currentDiff = Math.abs(codeNum - parseInt(current.number));
              const closestDiff = Math.abs(codeNum - parseInt(closest.number));
              return currentDiff < closestDiff ? current : closest;
            });
            
            inheritedData = {...(closestPcgAccount.rawData || {})};
            delete inheritedData.importId;
            delete inheritedData.code;
            delete inheritedData.name;
            isInherited = true;
          }
        }
      }

      return {
        id: account.id,
        title: account.title || 'Sans titre',
        finalCode,
        inheritedData,
        isInherited: !isInPcg && isInherited,
        hasClosestMatch: !isInPcg && isInherited && matchingPcgAccounts.length > 0,
        isInPcg
      };
    });
  }, [clientAccounts, generalAccounts, replacementCodes, cncjReplacementCodes, result, cncjConflictResult]);

  // Comptes qui nécessitent une attention (non présents dans PCG)
  const accountsNeedingMetadata = metadataData.filter(row => !row.isInPcg);
  const accountsWithClosestMatch = accountsNeedingMetadata.filter(row => row.hasClosestMatch);
  const accountsWithoutClosestMatch = accountsNeedingMetadata.filter(row => !row.hasClosestMatch);
  const accountsInPcg = metadataData.filter(row => row.isInPcg);
  const totalCount = metadataData.length;
  const needingMetadataCount = accountsNeedingMetadata.length;

  const filteredData = useMemo(() => {
    let data = accountsNeedingMetadata;
    
    if (selectedAccountId) {
      data = data.filter(row => row.id === selectedAccountId);
    } else if (filterType === 'withMatch') {
      data = accountsWithClosestMatch;
    } else if (filterType === 'withoutMatch') {
      data = accountsWithoutClosestMatch;
    }
    
    return data;
  }, [selectedAccountId, filterType, accountsNeedingMetadata, accountsWithClosestMatch, accountsWithoutClosestMatch]);

  // Champs de métadonnées importants à afficher/éditer
  const metadataFields = [
    { key: 'parent_code', label: 'Code parent', type: 'text' },
    { key: 'accountType.importId', label: 'Type de compte', type: 'text' },
    { key: 'isRegulatoryAccount', label: 'Compte réglementaire', type: 'select', options: ['true', 'false'] },
    { key: 'commonPosition', label: 'Position commune', type: 'text' },
    { key: 'reconcileOk', label: 'Lettrage OK', type: 'text' },
    { key: 'compatibleAccounts', label: 'Comptes compatibles', type: 'text' },
    { key: 'useForPartnerBalance', label: 'Balance tiers', type: 'select', options: ['true', 'false'] },
    { key: 'isTaxAuthorizedOnMoveLine', label: 'Taxe autorisée', type: 'select', options: ['true', 'false'] },
    { key: 'isTaxRequiredOnMoveLine', label: 'Taxe requise', type: 'select', options: ['true', 'false'] },
    { key: 'defaultTaxSet', label: 'Taxe par défaut', type: 'text' },
    { key: 'vatSystemSelect', label: 'Système TVA', type: 'text' },
    { key: 'isRetrievedOnPaymentSession', label: 'Recouvrement', type: 'select', options: ['true', 'false'] },
    { key: 'serviceType.code', label: 'Type service', type: 'text' },
    { key: 'manageCutOffPeriod', label: 'Gestion cut-off', type: 'select', options: ['true', 'false'] },
    { key: 'hasAutomaticApplicationAccountingDate', label: 'Date auto', type: 'select', options: ['true', 'false'] },
    { key: 'analyticDistributionAuthorized', label: 'Distribution analytique autorisée', type: 'select', options: ['true', 'false'] },
    { key: 'analyticDistributionRequiredOnInvoiceLines', label: 'Distribution analytique requise (factures)', type: 'select', options: ['true', 'false'] },
    { key: 'analyticDistributionRequiredOnMoveLines', label: 'Distribution analytique requise (écritures)', type: 'select', options: ['true', 'false'] },
    { key: 'analyticDistributionTemplate.importId', label: 'Modèle distribution analytique', type: 'text' },
    { key: 'statusSelect', label: 'Statut', type: 'text' },
    { key: 'isCNCJ', label: 'CNCJ', type: 'select', options: ['true', 'false'] }
  ];

  const handleMetadataFieldChange = (accountId: string, fieldKey: string, value: string) => {
    const row = metadataData.find(r => r.id === accountId);
    if (row) {
      const updatedMetadata = { ...row.inheritedData, [fieldKey]: value };
      onMetadataChange(accountId, updatedMetadata);
    }
  };

  const totalPcgExportCount = generalAccounts.length + accountsNeedingMetadata.length;

  return (
    <div className="space-y-4">
      {/* Statistiques */}
      <StepStatsGrid columns={4}>
        <StepStat value={totalCount} label="Total comptes" color="blue" />
        <StepStat value={accountsWithClosestMatch.length} label="Avec correspondance proche" color="green" />
        <StepStat value={accountsWithoutClosestMatch.length} label="Sans correspondance" color="red" />
        <StepStat value={accountsInPcg.length} label="Comptes dans PCG" color="purple" />
      </StepStatsGrid>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-800 mb-2">📋 Instructions</h3>
        <p className="text-sm text-blue-700">
          Cette étape affiche les comptes clients qui ne sont pas présents dans le plan comptable général (PCG) 
          et qui nécessitent un remplissage des métadonnées. 
          <span className="font-semibold text-green-700">Les cartes vertes</span> indiquent qu'une correspondance proche a été trouvée 
          et les métadonnées sont pré-remplies. 
          <span className="font-semibold text-red-700">Les cartes rouges</span> indiquent qu'aucune correspondance n'a été trouvée 
          et les métadonnées doivent être saisies manuellement.
        </p>
      </div>

      {/* Filtre */}
      {accountsNeedingMetadata.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex justify-center space-x-2 flex-wrap">
            <button
              onClick={() => {
                setSelectedAccountId(null);
                setFilterType('all');
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterType === 'all' && !selectedAccountId
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Tous les comptes avec métadonnées manquantes ({needingMetadataCount})
            </button>
            <button
              onClick={() => {
                setSelectedAccountId(null);
                setFilterType('withMatch');
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterType === 'withMatch' && !selectedAccountId
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Avec correspondance proche ({accountsWithClosestMatch.length})
            </button>
            <button
              onClick={() => {
                setSelectedAccountId(null);
                setFilterType('withoutMatch');
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterType === 'withoutMatch' && !selectedAccountId
                  ? 'bg-red-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Sans correspondance ({accountsWithoutClosestMatch.length})
            </button>
          </div>
        </div>
      )}

      {/* Cartes des comptes */}
      {filteredData.length === 0 ? (
        <StepEmptyState
          icon="✅"
          title="Aucune métadonnée manquante"
          description="Tous les comptes ont des correspondances dans le PCG."
        />
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="max-h-[28rem] overflow-y-auto pr-1">
            <div className="space-y-4">
              {filteredData.map((row) => (
                <div
                  key={row.id}
                  className={`border rounded-lg p-4 shadow-sm ${
                    row.hasClosestMatch 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">{row.title}</h3>
                      <p className="text-sm text-gray-600 font-mono">{row.finalCode}</p>
                    </div>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      row.hasClosestMatch
                        ? 'bg-green-600 text-white'
                        : 'bg-red-600 text-white'
                    }`}>
                      {row.hasClosestMatch ? '✓ Correspondance trouvée' : '✗ Aucune correspondance'}
                    </span>
                  </div>

                  {/* Grille de métadonnées */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {metadataFields.map((field) => {
                      const value = row.inheritedData[field.key] || '';
                      
                      return (
                        <div key={field.key} className="flex flex-col">
                          <label className="text-xs font-medium text-gray-700 mb-1">
                            {field.label}
                          </label>
                          {field.type === 'select' ? (
                            <select
                              value={value}
                              onChange={(e) => handleMetadataFieldChange(row.id, field.key, e.target.value)}
                              className={`px-3 py-1 text-sm border rounded-md focus:ring-2 focus:border ${
                                row.hasClosestMatch
                                  ? 'border-green-300 focus:ring-green-500 focus:border-green-500'
                                  : 'border-red-300 focus:ring-red-500 focus:border-red-500'
                              }`}
                            >
                              {field.options?.map((option) => (
                                <option key={option} value={option}>
                                  {option === 'true' ? 'Oui' : option === 'false' ? 'Non' : option}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={value}
                              onChange={(e) => handleMetadataFieldChange(row.id, field.key, e.target.value)}
                              className={`px-3 py-1 text-sm border rounded-md focus:ring-2 focus:border ${
                                row.hasClosestMatch
                                  ? 'border-green-300 focus:ring-green-500 focus:border-green-500'
                                  : 'border-red-300 focus:ring-red-500 focus:border-red-500'
                              }`}
                              placeholder={field.key.includes('importId') ? 'AT001' : ''}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Boutons d'export */}
      <div className="mt-6 text-center space-y-3">
        <div className="flex justify-center gap-4">
          <button
            onClick={handleExport}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            📥 Exporter les correspondances
          </button>
          <button
            onClick={handleExportPcgToCreate}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
          >
            📄 Exporter PCG complet ({totalPcgExportCount})
          </button>
        </div>
        <p className="text-sm text-gray-500">
          Contient tous les comptes PCG existants + les comptes clients non présents dans PCG
        </p>
      </div>
    </div>
  );
};