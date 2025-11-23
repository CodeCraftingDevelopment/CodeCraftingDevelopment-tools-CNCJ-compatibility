import React, { useState, useMemo } from 'react';
import { Account, ProcessingResult } from '../types/accounts';
import { StepStatsGrid, StepStat, StepEmptyState } from './components/StepContent';
import { getDisplayCode } from '../utils/accountUtils';
import { sanitizeCsvValue } from '../utils/fileUtils';
import { useMetadataImport } from '../hooks/useMetadataImport';
import { useDragAndDrop } from '../hooks/useDragAndDrop';
import { DropZone } from '../components/DropZone';

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
  // Ajout de l'historique des codes
  codeHistory: {
    originalCode: string; // Code original 8 chiffres
    normalizedCode: string; // Code normalisé 7 chiffres
    step4Code?: string; // Code après étape 4 (si doublon)
    step6Code?: string; // Code après étape 6 (si conflit CNCJ)
    finalCode: string; // Code final
    referencePcgCode?: string; // Code PCG utilisé comme référence pour l'héritage
  };
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
  missingMetadata: { [accountId: string]: Record<string, any> };
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
  missingMetadata,
  onMetadataChange
}) => {
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'withMatch' | 'withoutMatch'>('withoutMatch');
  const [collapsedCards, setCollapsedCards] = useState<Record<string, boolean>>({});
  
  // Toggle individual card
  const toggleCard = (accountId: string) => {
    setCollapsedCards(prev => ({
      ...prev,
      [accountId]: !prev[accountId]
    }));
  };

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
    const escaped = sanitizeCsvValue(cleaned).replace(/"/g, '""');
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
            data['accountType.importId'] || '',
            data.isRegulatoryAccount ?? 'false',
            data.commonPosition || '0',
            data.reconcileOk || '',
            data.compatibleAccounts || '',
            data.useForPartnerBalance ?? '',
            data.isTaxAuthorizedOnMoveLine ?? '',
            data.isTaxRequiredOnMoveLine ?? '',
            data.defaultTaxSet || '',
            data.vatSystemSelect || '',
            data.isRetrievedOnPaymentSession ?? '',
            data['serviceType.code'] || '',
            data.manageCutOffPeriod ?? '',
            data.hasAutomaticApplicationAccountingDate ?? '',
            data.analyticDistributionAuthorized ?? '',
            data.analyticDistributionRequiredOnInvoiceLines ?? '',
            data.analyticDistributionRequiredOnMoveLines ?? '',
            data['analyticDistributionTemplate.importId'] || '',
            data.statusSelect || '1',
            data.isCNCJ ?? 'false'
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
            inheritedData.isRegulatoryAccount ?? 'false',
            inheritedData.commonPosition || '0',
            inheritedData.reconcileOk || '',
            inheritedData.compatibleAccounts || '',
            inheritedData.useForPartnerBalance ?? '',
            inheritedData.isTaxAuthorizedOnMoveLine ?? '',
            inheritedData.isTaxRequiredOnMoveLine ?? '',
            inheritedData.defaultTaxSet || '',
            inheritedData.vatSystemSelect || '',
            inheritedData.isRetrievedOnPaymentSession ?? '',
            inheritedData['serviceType.code'] || '',
            inheritedData.manageCutOffPeriod ?? '',
            inheritedData.hasAutomaticApplicationAccountingDate ?? '',
            inheritedData.analyticDistributionAuthorized ?? '',
            inheritedData.analyticDistributionRequiredOnInvoiceLines ?? '',
            inheritedData.analyticDistributionRequiredOnMoveLines ?? '',
            inheritedData['analyticDistributionTemplate.importId'] || '',
            inheritedData.statusSelect || '1',
            inheritedData.isCNCJ ?? 'false'
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
      let referencePcgCode: string | undefined;

      if (!isInPcg && finalCode.length >= 4) {
        const prefix = finalCode.substring(0, 4);
        const codeNum = parseInt(finalCode);
        
        if (!isNaN(codeNum)) {
          matchingPcgAccounts = pcgAccountsByPrefix.get(prefix) || [];
          
          if (matchingPcgAccounts.length > 0) {
            // Algorithme d'héritage par différence numérique minimale
            // Intentionnel pour les codes comptables qui suivent des hiérarchies numériques
            // (ex: 411000 hérite des métadonnées du compte PCG le plus proche comme 411100)
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
            referencePcgCode = closestPcgAccount.number;
          }
        }
      }

      // Utiliser les métadonnées importées si elles existent, sinon utiliser les données héritées
      const importedMetadata = missingMetadata[account.id] || {};
      const finalInheritedData = { ...inheritedData, ...importedMetadata };

      // Calculer l'historique des codes
      const step4Ids = new Set(result?.duplicates?.map(d => d.id) || []);
      const step6Ids = new Set(cncjConflictResult?.duplicates?.map(d => d.id) || []);
      
      const isStep4Duplicate = step4Ids.has(account.id);
      const isStep6Conflict = step6Ids.has(account.id);
      
      const originalCode = account.originalNumber || getDisplayCode(account);
      const normalizedCode = account.number;
      const step4Code = isStep4Duplicate ? replacementCodes[account.id] : undefined;
      const step6Code = isStep6Conflict ? cncjReplacementCodes[account.id] : undefined;
      const finalCodeValue = finalCode;

      const codeHistory = {
        originalCode,
        normalizedCode,
        step4Code,
        step6Code,
        finalCode: finalCodeValue,
        referencePcgCode
      };

      return {
        id: account.id,
        title: account.title || 'Sans titre',
        finalCode: finalCodeValue,
        inheritedData: finalInheritedData,
        isInherited: !isInPcg && isInherited,
        hasClosestMatch: !isInPcg && isInherited && matchingPcgAccounts.length > 0,
        isInPcg,
        codeHistory
      };
    });
  }, [clientAccounts, generalAccounts, replacementCodes, cncjReplacementCodes, result, cncjConflictResult, missingMetadata]);

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
    
    return data.sort((a, b) => {
      const codeA = parseInt(a.finalCode) || 0;
      const codeB = parseInt(b.finalCode) || 0;
      return codeA - codeB;
    });
  }, [selectedAccountId, filterType, accountsNeedingMetadata, accountsWithClosestMatch, accountsWithoutClosestMatch]);

  // Initialize collapsed state when filteredData changes
  const defaultCollapsed = useMemo(() => 
    filteredData.reduce((acc, row) => ({...acc, [row.id]: true}), {}),
    [filteredData.length]
  );

  React.useEffect(() => {
    setCollapsedCards(defaultCollapsed);
  }, [defaultCollapsed]);

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

  // Utiliser le hook personnalisé pour l'import des métadonnées
  const { metadataFileInfo, processMetadataFile, handleClearMetadataFile } = useMetadataImport({
    accountsNeedingMetadata: accountsNeedingMetadata as unknown as Account[],
    metadataFields,
    onMetadataChange
  });

  // Utiliser le hook de drag & drop pour l'import des métadonnées
  const { dragState, fileInputRef, handlers } = useDragAndDrop({
    disabled: false,
    onDrop: processMetadataFile,
    acceptedTypes: ['.csv']
  });

  // Export des comptes à créer avec métadonnées pour réimport
  const handleExportAccountsToCreate = () => {
    try {
      const csvHeaders = [
        'id', 'title', 'finalCode', 'hasClosestMatch', 'referencePcgCode',
        ...metadataFields.map(field => field.key)
      ];
      
      const csvRows = accountsNeedingMetadata.map(row => {
        const metadataValues = metadataFields.map(field => 
          row.inheritedData[field.key] || ''
        );
        return [
          row.id,
          row.title,
          row.finalCode,
          row.hasClosestMatch ? 'true' : 'false',
          row.codeHistory.referencePcgCode || '',
          ...metadataValues
        ];
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
      a.download = 'comptes-a-creer-avec-metadata.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur lors de l\'export des comptes à créer:', error);
      alert('Une erreur est survenue lors de l\'export. Veuillez réessayer.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Statistiques */}
      <StepStatsGrid columns={5}>
        <StepStat value={totalCount} label="Total comptes" color="blue" />
        <StepStat value={accountsWithClosestMatch.length} label="Avec correspondance proche" color="green" />
        <StepStat value={accountsWithClosestMatch.length + accountsWithoutClosestMatch.length} label="" color="orange" />
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
              {filteredData.map((row) => {
                const isCollapsed = collapsedCards[row.id] ?? true;
                
                return (
                  <div
                    key={row.id}
                    className={`border rounded-lg shadow-sm transition-all duration-200 ${
                      row.hasClosestMatch 
                        ? 'border-green-200 bg-green-50' 
                        : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            {/* Individual toggle button */}
                            <button
                              onClick={() => toggleCard(row.id)}
                              className={`p-1 rounded-md hover:bg-gray-200 transition-colors ${
                                isCollapsed ? 'hover:bg-gray-300' : ''
                              }`}
                              title={isCollapsed ? "Développer" : "Réduire"}
                            >
                              <span className={`transform transition-transform duration-200 inline-block ${
                                isCollapsed ? 'rotate-0' : 'rotate-90'
                              }`}>
                                ▶
                              </span>
                            </button>
                            
                            <h3 className="text-base font-semibold text-gray-900">{row.title}</h3>
                          </div>
                          
                          {/* Historique des codes */}
                          <div className="space-y-1 ml-6">
                            <div className="flex items-center space-x-2 text-xs">
                              <span className="text-gray-500">Original:</span>
                              <span className="font-mono text-gray-600">{row.codeHistory.originalCode}</span>
                              <span className="text-gray-400">→</span>
                              <span className="text-gray-500">Normalisé:</span>
                              <span className="font-mono text-gray-600">{row.codeHistory.normalizedCode}</span>
                              {row.codeHistory.step4Code && (
                                <>
                                  <span className="text-gray-400">→</span>
                                  <span className="text-gray-500">Doublon corrigé:</span>
                                  <span className="font-mono text-blue-600">{row.codeHistory.step4Code}</span>
                                </>
                              )}
                              {row.codeHistory.step6Code && (
                                <>
                                  <span className="text-gray-400">→</span>
                                  <span className="text-gray-500">Step6:</span>
                                  <span className="font-mono text-orange-600">{row.codeHistory.step6Code}</span>
                                </>
                              )}
                              <span className="text-gray-400">→</span>
                              <span className="text-gray-500">Final:</span>
                              <span className="font-mono font-bold text-gray-900">{row.codeHistory.finalCode}</span>
                              {row.codeHistory.referencePcgCode && (
                                <>
                                  <span className="text-gray-400">→</span>
                                  <span className="text-gray-500">PCG référence:</span>
                                  <span className="font-mono text-purple-600">{row.codeHistory.referencePcgCode}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          row.hasClosestMatch
                            ? 'bg-green-600 text-white'
                            : 'bg-red-600 text-white'
                        }`}>
                          {row.hasClosestMatch ? '✓ Correspondance trouvée' : '✗ Aucune correspondance'}
                        </span>
                      </div>

                      {/* Metadata grid - only show when expanded */}
                      {!isCollapsed && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
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
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Boutons d'export et DropZone d'import */}
      <div className="mt-6 text-center space-y-3">
        <div className="flex justify-center gap-4 flex-wrap">
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
          <button
            onClick={handleExportAccountsToCreate}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            📊 Exporter comptes à créer ({accountsNeedingMetadata.length})
          </button>
        </div>
        
        {/* DropZone pour l'import des métadonnées */}
        <div className="w-full max-w-2xl mx-auto">
          <DropZone
            dragState={dragState}
            disabled={false}
            loading={metadataFileInfo?.loadStatus === 'loading'}
            fileInfo={metadataFileInfo}
            onDragOver={handlers.handleDragOver}
            onDragLeave={handlers.handleDragLeave}
            onDrop={handlers.handleDrop}
            onClick={!metadataFileInfo ? handlers.handleButtonClick : undefined}
            onKeyDown={(e) => handlers.handleKeyDown(e, !metadataFileInfo ? handlers.handleButtonClick : undefined)}
            ariaLabel={!metadataFileInfo
              ? "Zone de dépôt pour les métadonnées. Glissez-déposez un fichier CSV ou cliquez pour parcourir"
              : `Fichier de métadonnées: ${metadataFileInfo?.name}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handlers.handleFileChange}
              className="hidden"
            />
            
            {!metadataFileInfo && (
              <div className="space-y-2">
                <div className="mx-auto w-8 h-8 text-gray-400">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div className="text-sm text-gray-600">
                  <p className="font-medium text-xs sm:text-sm">
                    Glissez-déposez votre fichier de métadonnées CSV
                  </p>
                  <p className="text-xs">ou cliquez pour parcourir</p>
                </div>
              </div>
            )}
            
            {metadataFileInfo?.loadStatus === 'loading' && (
              <div className="space-y-2">
                <div className="mx-auto w-6 h-6 border-b-2 border-blue-600 rounded-full animate-spin"></div>
                <p className="text-sm text-blue-600">Import des métadonnées...</p>
              </div>
            )}
            
            {metadataFileInfo && (metadataFileInfo.loadStatus === 'success' || metadataFileInfo.loadStatus === 'error') && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      metadataFileInfo.loadStatus === 'success' ? 'bg-green-100 text-green-600' :
                      'bg-red-100 text-red-600'
                    }`}>
                      {metadataFileInfo.loadStatus === 'success' ? (
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
                      <p className="text-sm font-medium text-gray-900 truncate">{metadataFileInfo?.name}</p>
                      <p className="text-xs text-gray-500">{metadataFileInfo?.size}</p>
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={handleClearMetadataFile}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
                
                <div className={`text-sm ${
                  metadataFileInfo.loadStatus === 'success' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {metadataFileInfo.loadStatus === 'success' 
                    ? `${metadataFileInfo.rowCount} métadonnées importées avec succès` 
                    : 'Échec de l\'import'}
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
        
        <div className="space-y-1">
          <p className="text-sm text-gray-500">
            Contient tous les comptes PCG existants + les comptes clients non présents dans PCG
          </p>
          <p className="text-sm text-gray-500">
            Export des comptes à créer : inclut les métadonnées pré-remplies et la colonne hasClosestMatch
          </p>
          <p className="text-sm text-gray-500">
            Import : met à jour les métadonnées des comptes depuis un fichier CSV modifié (glissez-déposez ou cliquez)
          </p>
        </div>
      </div>
    </div>
  );
};
