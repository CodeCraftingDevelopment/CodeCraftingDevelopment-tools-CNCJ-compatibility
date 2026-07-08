import React, { useState, useMemo } from 'react';
import { Account, ProcessingResult, CncjConflictResult, AccountMetadata } from '../types/accounts';
import { toAccountMetadata } from '../utils/typeGuards';
import { StepStatsGrid, StepStat, StepEmptyState } from './components/StepContent';
import { getDisplayCode } from '../utils/accountUtils';
import { useMetadataImport } from '../hooks/useMetadataImport';
import { useDragAndDrop } from '../hooks/useDragAndDrop';
import { DropZone } from '../components/DropZone';
import { escapeCsvCell } from '../utils/csvExportUtils';
import {
  normalizeForDisplay,
  computeFinalCode,
  MANUAL_PCG_REFERENCE_KEY,
  UNRESOLVED_PCG_REFERENCE_KEY,
  type ModificationSource
} from '../utils/accountMatchingUtils';

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
}

interface MetadataRow {
  id: string;
  title: string;
  finalCode: string;
  inheritedData: AccountMetadata;
  isInherited: boolean;
  hasClosestMatch: boolean; // true si la recherche a abouti, false sinon
  isManuallyImported: boolean; // true si retraité via referencePcgCode à l'import
  isUnresolvedReference: boolean; // true si referencePcgCode saisi mais introuvable dans le PCG
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
  fecAccountCodes: string[];
  replacementCodes: { [key: string]: string };
  cncjReplacementCodes: { [key: string]: string };
  result: ProcessingResult | null;
  cncjConflictResult: CncjConflictResult | null;
  cncjConflictCorrections: { [key: string]: string | 'error' };
  cncjForcedValidations: Set<string>;
  cncjCodes: Set<string>;
  cncjAccounts: Account[];
  missingMetadata: { [accountId: string]: AccountMetadata };
  svvCorrespondences: { [compteEncheres: string]: string };
  companyCode: string;
  onMetadataChange: (accountId: string, metadata: AccountMetadata) => void;
}

export const Step8MetadataCompletion: React.FC<Step8MetadataCompletionProps> = ({
  clientAccounts,
  mergedClientAccounts,
  generalAccounts,
  fecAccountCodes,
  replacementCodes,
  cncjReplacementCodes,
  result,
  cncjConflictResult,
  cncjConflictCorrections,
  cncjForcedValidations,
  cncjCodes,
  cncjAccounts,
  missingMetadata,
  svvCorrespondences,
  companyCode,
  onMetadataChange
}) => {
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'withMatch' | 'withoutMatch'>('withoutMatch');
  const [collapsedCards, setCollapsedCards] = useState<Record<string, boolean>>({});
  const [showUnresolvedModal, setShowUnresolvedModal] = useState(false);

  // Détection CNCJ : un compte dont le code final existe dans la référence CNCJ doit être marqué isCncj=true.
  // On normalise les deux côtés pour une comparaison fiable (7 chiffres).
  const normalizedCncjCodes = useMemo(
    () => new Set(Array.from(cncjCodes, code => normalizeForDisplay(code))),
    [cncjCodes]
  );
  const isCncjCode = (code: string): boolean => normalizedCncjCodes.has(normalizeForDisplay(code));
  
  // Toggle individual card
  const toggleCard = (accountId: string) => {
    setCollapsedCards(prev => ({
      ...prev,
      [accountId]: !prev[accountId]
    }));
  };

  // Normaliser un code à 7 chiffres pour l'affichage (utilitaire importé)
  // Utilise normalizeForDisplay de accountMatchingUtils

  // Calculer le code final pour un compte (utilitaire importé)
  // Utilise computeFinalCode de accountMatchingUtils

  // Reconstruire les données de résumé (logique de l'étape 7)
  const finalSummaryData: SummaryRow[] = useMemo(() => {
    const step4Ids = new Set(result?.duplicates?.map(d => d.id) || []);
    const step6Ids = new Set(cncjConflictResult?.conflicts?.map(d => d.id) || []);
    const toCreateIds = new Set(result?.toCreate?.map(t => t.id) || []);
    
    return clientAccounts.map((account): SummaryRow => {
      const mergedAccount = mergedClientAccounts.find(m => m.id === account.id);
      const correctedByCncj = cncjReplacementCodes[account.id];
      const hasCncjError = cncjConflictCorrections[account.id] === 'error';
      
      const isStep4Duplicate = step4Ids.has(account.id);
      const isStep6Conflict = step6Ids.has(account.id);
      const isToCreate = toCreateIds.has(account.id);
      const isForced = cncjForcedValidations.has(account.id);

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
      
      // Une validation forcée accepte le compte tel quel : elle annule l'erreur d'auto-correction CNCJ.
      const cncjCorrection = correctedByCncj !== undefined && correctedByCncj !== ''
        ? correctedByCncj
        : (isForced ? '-' : (hasCncjError ? 'Erreur' : '-'));
      
      return {
        id: account.id,
        title: account.title || 'Sans titre',
        originalCode: getDisplayCode(account),
        correctedCode: correctedCode,
        cncjCorrection: cncjCorrection,
        wasModified: replacementCodes[account.id] !== undefined || cncjReplacementCodes[account.id] !== undefined || isForced,
        modificationSource,
        isStep4Duplicate,
        isStep6Conflict,
        isToCreate,
        isForced
      };
    });
  }, [clientAccounts, mergedClientAccounts, result, cncjConflictResult, replacementCodes, cncjReplacementCodes, cncjConflictCorrections, cncjForcedValidations]);

  // Fonction d'échappement CSV (utilitaire importé)
  // Utilise escapeCsvCell de csvExportUtils

  // Export des correspondances (logique de l'étape 7)
  const handleExport = () => {
    // Format « accounting bridge » : 6 colonnes, séparateur ';', sans guillemets, sans BOM, CRLF.
    const csvHeaders = ['accountingbridgeAccount', 'axelorAccount.code', 'company.code', 'auxAccount.partnerSeq', 'pieceRef', 'active'];

    // Codes réellement présents dans l'export account_account, EXACTEMENT tels qu'ils y sont écrits :
    // - comptes PCG : code BRUT `account.number` (les comptes-vues courts « 15 », « 47 »… ne sont PAS
    //   normalisés à l'export ; les normaliser ici ferait passer à tort des cibles 7 ch. comme « 1500000 »).
    // - comptes clients « à créer » (accountsNeedingMetadata, filtré FEC) : code final normalisé (7 ch.).
    const accountAccountCodes = new Set<string>();
    generalAccounts.forEach(account => accountAccountCodes.add(account.number));
    accountsNeedingMetadata.forEach(row => accountAccountCodes.add(normalizeForDisplay(row.finalCode)));
    // Cibles 7 chiffres issues du fichier de correspondances SVV.
    const svvTargetCodes = new Set(Object.values(svvCorrespondences).map(code => normalizeForDisplay(code)));
    // On ne retient une correspondance que si son code cible sera dans account_account OU dans les cibles SVV.
    const isAllowedTarget = (finalCode: string) => accountAccountCodes.has(finalCode) || svvTargetCodes.has(finalCode);

    // Mapping code client (source) -> code Axelor (cible), filtré sur les cibles autorisées.
    const rows: string[][] = [];
    finalSummaryData.forEach(row => {
      const finalCode = normalizeForDisplay(computeFinalCodeForSummary(row));
      if (!isAllowedTarget(finalCode)) return;
      rows.push([row.originalCode, finalCode, companyCode, '', '', 'true']);
    });

    // Garantir que TOUTE correspondance du fichier SVV figure dans le mappage,
    // même lorsque aucun compte client ne porte le code source (compte absent du plan client / FEC).
    const presentSourceCodes = new Set(rows.map(row => row[0]));
    Object.entries(svvCorrespondences).forEach(([sourceCode, targetCode]) => {
      if (presentSourceCodes.has(sourceCode)) return;
      rows.push([sourceCode, normalizeForDisplay(targetCode), companyCode, '', '', 'true']);
      presentSourceCodes.add(sourceCode);
    });

    // Tri par code source croissant (comme le fichier de référence).
    rows.sort((a, b) => (parseInt(a[0], 10) || 0) - (parseInt(b[0], 10) || 0));

    const csvContent = [csvHeaders.join(';'), ...rows.map(row => row.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'accounting-bridge-account-mapping.csv';
    a.click();
    URL.revokeObjectURL(url);
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
        'statusSelect', 'isCncj'
      ];

      const csvRows: string[][] = [];

      // Titres officiels CNCJ (par code) : ils ne doivent JAMAIS être remplacés par un titre client
      const cncjTitleByCode = new Map<string, string>();
      cncjAccounts.forEach(acc => {
        const code = normalizeForDisplay(acc.number);
        if (acc.title && acc.title.trim() && !cncjTitleByCode.has(code)) {
          cncjTitleByCode.set(code, acc.title);
        }
      });

      // Titre issu du fichier client, indexé par code final (pour relibeller les comptes PCG)
      const clientTitleByFinalCode = new Map<string, string>();
      clientAccounts.forEach(account => {
        const code = normalizeForDisplay(computeFinalCode(account, result, cncjConflictResult, replacementCodes, cncjReplacementCodes));
        if (account.title && account.title.trim() && !clientTitleByFinalCode.has(code)) {
          clientTitleByFinalCode.set(code, account.title);
        }
      });

      // Comptes PCG existants
      const pcgAccountRows = generalAccounts.map((account, index) => {
        const data = account.rawData || {};
        const importId = data.importId || `PCG${String(index + 1).padStart(4, '0')}`;

        // Libellé = titre client si un compte client correspond, SAUF comptes CNCJ (titre officiel intact)
        const name = isCncjCode(account.number)
          ? (account.title || '')
          : (clientTitleByFinalCode.get(normalizeForDisplay(account.number)) ?? account.title ?? '');

        return {
          code: parseInt(account.number) || 0,
          row: [
            String(importId),
            account.number,
            String(data.parent_code || ''),
            name,
            String(data['accountType.importId'] || ''),
            String(data.isRegulatoryAccount ?? 'false'),
            String(data.commonPosition || '0'),
            String(data.reconcileOk || ''),
            String(data.compatibleAccounts || ''),
            String(data.useForPartnerBalance ?? ''),
            String(data.isTaxAuthorizedOnMoveLine ?? ''),
            String(data.isTaxRequiredOnMoveLine ?? ''),
            String(data.defaultTaxSet || ''),
            String(data.vatSystemSelect || ''),
            String(data.isRetrievedOnPaymentSession ?? ''),
            String(data['serviceType.code'] || ''),
            String(data.manageCutOffPeriod ?? ''),
            String(data.hasAutomaticApplicationAccountingDate ?? ''),
            String(data.analyticDistributionAuthorized ?? ''),
            String(data.analyticDistributionRequiredOnInvoiceLines ?? ''),
            String(data.analyticDistributionRequiredOnMoveLines ?? ''),
            String(data['analyticDistributionTemplate.importId'] || ''),
            String(data.statusSelect || '1'),
            // CNCJ = uniquement les comptes définis dans le fichier de base (flag du modèle),
            // sans dérivation par code normalisé (qui marquait à tort les comptes-vues/radicaux).
            String(data.isCncj ?? 'false')
          ]
        };
      });

      // Décalage pour éviter les collisions d'importId avec les CLIENTxxxx déjà présents dans
      // le PCG chargé (comptes créés lors d'une intégration précédente).
      const maxExistingClientId = generalAccounts.reduce((max, account) => {
        const match = String(account.rawData?.importId ?? '').match(/^CLIENT(\d+)$/);
        return match ? Math.max(max, parseInt(match[1], 10)) : max;
      }, 0);

      // Comptes clients non présents dans PCG : réutiliser les métadonnées de l'étape
      // (héritage automatique + import manuel via referencePcgCode + éditions manuelles).
      const clientAccountRows = accountsNeedingMetadata.map((row, index) => {
        const importId = `CLIENT${String(maxExistingClientId + index + 1).padStart(4, '0')}`;
        const code = normalizeForDisplay(row.finalCode);
        // Libellé client, SAUF si le code est CNCJ : on garde le titre officiel CNCJ (jamais modifié)
        const name = isCncjCode(code)
          ? (cncjTitleByCode.get(code) ?? row.title)
          : row.title;
        const inheritedData = row.inheritedData;

        return {
          code: parseInt(code) || 0,
          row: [
            importId,
            String(code),
            String(inheritedData.parent_code || ''),
            name,
            String(inheritedData['accountType.importId'] || 'AT001'),
            String(inheritedData.isRegulatoryAccount ?? 'false'),
            String(inheritedData.commonPosition || '0'),
            String(inheritedData.reconcileOk || ''),
            String(inheritedData.compatibleAccounts || ''),
            String(inheritedData.useForPartnerBalance ?? ''),
            String(inheritedData.isTaxAuthorizedOnMoveLine ?? ''),
            String(inheritedData.isTaxRequiredOnMoveLine ?? ''),
            String(inheritedData.defaultTaxSet || ''),
            String(inheritedData.vatSystemSelect || ''),
            String(inheritedData.isRetrievedOnPaymentSession ?? ''),
            String(inheritedData['serviceType.code'] || ''),
            String(inheritedData.manageCutOffPeriod ?? ''),
            String(inheritedData.hasAutomaticApplicationAccountingDate ?? ''),
            String(inheritedData.analyticDistributionAuthorized ?? ''),
            String(inheritedData.analyticDistributionRequiredOnInvoiceLines ?? ''),
            String(inheritedData.analyticDistributionRequiredOnMoveLines ?? ''),
            String(inheritedData['analyticDistributionTemplate.importId'] || ''),
            String(inheritedData.statusSelect || '1'),
            // CNCJ uniquement si le code final EXACT figure dans la liste de base (pas de normalisation,
            // pas d'héritage) : un compte client n'est CNCJ que s'il retombe exactement sur un code CNCJ.
            cncjCodes.has(code) ? 'true' : 'false'
          ]
        };
      });

      // Respecter l'ordre du fichier PCG source (les comptes-vues alphanumériques restent à leur place),
      // puis ajouter les comptes clients à créer à la suite.
      pcgAccountRows.forEach(account => {
        csvRows.push(account.row);
      });
      clientAccountRows.forEach(account => {
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
      a.download = 'account_account.csv';
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
      // Validation forcée sans code CNCJ saisi → conserver le code issu de l'étape 4 (normalisé)
      if (row.isForced && row.cncjCorrection === '-') return row.correctedCode;
      return row.cncjCorrection === 'Erreur' ? row.correctedCode : row.cncjCorrection;
    }
    if (row.modificationSource === 'step4') {
      return row.correctedCode;
    }
    if (row.modificationSource === 'step6') {
      // Validation forcée → accepter le code normalisé (7 chiffres) tel quel
      if (row.isForced) return row.correctedCode;
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
      if (!isNaN(codeNum) && account.number.length >= 5) {
        const prefix = account.number.substring(0, 4);
        if (!pcgAccountsByPrefix.has(prefix)) {
          pcgAccountsByPrefix.set(prefix, []);
        }
        pcgAccountsByPrefix.get(prefix)?.push(account);
      }
    });

    return clientAccounts.map(account => {
      const finalCode = normalizeForDisplay(computeFinalCode(account, result, cncjConflictResult, replacementCodes, cncjReplacementCodes));
      const isInPcg = pcgLookup.has(finalCode);
      
      let inheritedData: AccountMetadata = {};
      let isInherited = false;
      let matchingPcgAccounts: Account[] = [];
      let referencePcgCode: string | undefined;

      if (!isInPcg && finalCode.length >= 5) {
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
            
            inheritedData = toAccountMetadata(closestPcgAccount.rawData || {});
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

      // Détecter un retraitement manuel via referencePcgCode à l'import
      const manualReference = typeof importedMetadata[MANUAL_PCG_REFERENCE_KEY] === 'string'
        ? importedMetadata[MANUAL_PCG_REFERENCE_KEY] as string
        : undefined;
      const unresolvedReference = typeof importedMetadata[UNRESOLVED_PCG_REFERENCE_KEY] === 'string'
        ? importedMetadata[UNRESOLVED_PCG_REFERENCE_KEY] as string
        : undefined;
      const isManuallyImported = !isInPcg && !!manualReference;
      const isUnresolvedReference = !isInPcg && !isManuallyImported && !!unresolvedReference;

      // Calculer l'historique des codes
      const step4Ids = new Set(result?.duplicates?.map(d => d.id) || []);
      const step6Ids = new Set(cncjConflictResult?.conflicts?.map(d => d.id) || []);
      
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
        referencePcgCode: referencePcgCode || manualReference || unresolvedReference
      };

      return {
        id: account.id,
        title: account.title || 'Sans titre',
        finalCode: finalCodeValue,
        inheritedData: finalInheritedData,
        isInherited: !isInPcg && isInherited,
        hasClosestMatch: !isInPcg && isInherited && matchingPcgAccounts.length > 0,
        isManuallyImported,
        isUnresolvedReference,
        isInPcg,
        codeHistory
      };
    });
  }, [clientAccounts, generalAccounts, replacementCodes, cncjReplacementCodes, result, cncjConflictResult, missingMetadata]);

  // Codes présents dans le FEC + index id -> code d'origine (pour restreindre les comptes à créer)
  const fecCodeSet = useMemo(() => new Set(fecAccountCodes), [fecAccountCodes]);
  const clientCodeById = useMemo(
    () => new Map(clientAccounts.map(a => [a.id, a.originalNumber || a.number])),
    [clientAccounts]
  );

  // Comptes qui nécessitent une attention (non présents dans PCG).
  // Si un FEC est chargé, on ne garde que les comptes réellement présents dans le FEC.
  const accountsNeedingMetadata = metadataData.filter(row => {
    if (row.isInPcg) return false;
    if (fecCodeSet.size === 0) return true;
    const code = clientCodeById.get(row.id);
    return code !== undefined && fecCodeSet.has(code);
  });
  const accountsWithClosestMatch = accountsNeedingMetadata.filter(row => row.hasClosestMatch);
  const accountsWithoutClosestMatch = accountsNeedingMetadata.filter(row => !row.hasClosestMatch);
  const accountsInPcg = metadataData.filter(row => row.isInPcg);
  const totalCount = metadataData.length;
  const needingMetadataCount = accountsNeedingMetadata.length;
  const unresolvedReferenceCount = accountsNeedingMetadata.filter(row => row.isUnresolvedReference).length;

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
    // Only recompute when array size changes, not when items mutate
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    { key: 'isCncj', label: 'CNCJ', type: 'select', options: ['true', 'false'] }
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
    _accountsNeedingMetadata: accountsNeedingMetadata as unknown as Account[],
    metadataFields,
    generalAccounts,
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
        'id', 'title', 'original_client_code', 'finalCode', 'hasClosestMatch', 'referencePcgCode',
        ...metadataFields.map(field => field.key)
      ];

      const csvRows = accountsNeedingMetadata.map(row => {
        const metadataValues = metadataFields.map(field =>
          field.key === 'isCncj' && isCncjCode(row.finalCode)
            ? 'true'
            : (row.inheritedData[field.key] || '')
        );
        return [
          row.id,
          row.title,
          row.codeHistory.originalCode,
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
      <StepStatsGrid columns={fecCodeSet.size > 0 ? 6 : 5}>
        <StepStat value={totalCount} label="Total comptes" color="blue" />
        {fecCodeSet.size > 0 && (
          <StepStat value={fecCodeSet.size} label="Comptes du FEC" color="indigo" />
        )}
        <StepStat value={accountsWithClosestMatch.length} label="Avec correspondance proche" color="green" />
        <StepStat value={`← ${accountsWithClosestMatch.length + accountsWithoutClosestMatch.length} →`} label="Comptes avec métadonnées manquantes" color="orange" />
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
          <span className="font-semibold text-blue-700"> Les cartes bleues</span> indiquent un compte retraité manuellement via un
          <span className="font-mono"> referencePcgCode</span> à l'import (paramètres hérités du compte PCG de référence).
          <span className="font-semibold text-amber-700"> Les cartes ambre</span> indiquent un
          <span className="font-mono"> referencePcgCode</span> saisi mais introuvable dans le PCG (code à corriger).
        </p>
      </div>

      {/* Alerte : références PCG introuvables */}
      {unresolvedReferenceCount > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-sm text-amber-800 flex items-start justify-between gap-3">
          <div>
            ⚠️ <span className="font-semibold">{unresolvedReferenceCount} référence(s) PCG introuvable(s)</span> :
            le code saisi dans <span className="font-mono">referencePcgCode</span> n'existe pas dans le PCG chargé.
            Corrigez ces codes dans le fichier puis rechargez-le (cartes ambre ci-dessous).
          </div>
          <button
            type="button"
            onClick={() => setShowUnresolvedModal(true)}
            className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 bg-amber-100 text-amber-800 border border-amber-300 rounded-lg hover:bg-amber-200 transition-colors font-medium"
          >
            👁 Consulter les lignes
          </button>
        </div>
      )}

      {/* Indication : restriction aux comptes du FEC */}
      {fecCodeSet.size > 0 && (
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 text-sm text-teal-800 text-center">
          📄 Un fichier FEC est chargé : les comptes à créer sont restreints aux <span className="font-semibold">{fecCodeSet.size}</span> comptes réellement présents dans le FEC.
        </div>
      )}

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

                // Style à quatre états : importé manuellement (bleu), référence PCG introuvable (ambre),
                // correspondance auto (vert), aucune (rouge)
                const cardBorderClass = row.isManuallyImported
                  ? 'border-blue-200 bg-blue-50'
                  : row.isUnresolvedReference ? 'border-amber-200 bg-amber-50'
                  : row.hasClosestMatch ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50';
                const headerBgClass = row.isManuallyImported
                  ? 'bg-blue-50 hover:bg-blue-100'
                  : row.isUnresolvedReference ? 'bg-amber-50 hover:bg-amber-100'
                  : row.hasClosestMatch ? 'bg-green-50 hover:bg-green-100' : 'bg-red-50 hover:bg-red-100';
                const badgeClass = row.isManuallyImported
                  ? 'bg-blue-600 text-white'
                  : row.isUnresolvedReference ? 'bg-amber-500 text-white'
                  : row.hasClosestMatch ? 'bg-green-600 text-white' : 'bg-red-600 text-white';
                const badgeLabel = row.isManuallyImported
                  ? '📥 Importé manuellement'
                  : row.isUnresolvedReference ? `⚠️ Référence PCG introuvable (${row.codeHistory.referencePcgCode || '—'})`
                  : row.hasClosestMatch ? '✓ Correspondance trouvée' : '✗ Aucune correspondance';
                const inputBorderClass = row.isManuallyImported
                  ? 'border-blue-300 focus:ring-blue-500 focus:border-blue-500'
                  : row.isUnresolvedReference
                    ? 'border-amber-300 focus:ring-amber-500 focus:border-amber-500'
                    : row.hasClosestMatch
                      ? 'border-green-300 focus:ring-green-500 focus:border-green-500'
                      : 'border-red-300 focus:ring-red-500 focus:border-red-500';

                return (
                  <div
                    key={row.id}
                    className={`border rounded-lg shadow-sm transition-all duration-200 overflow-hidden ${cardBorderClass}`}
                  >
                    {/* Full-width clickable header */}
                    <button
                      onClick={() => toggleCard(row.id)}
                      className={`w-full p-4 transition-colors flex items-center justify-between ${headerBgClass}`}
                      aria-expanded={!isCollapsed}
                    >
                      <div className="flex-1 text-left">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-base font-semibold text-gray-900">{row.title}</h3>
                        </div>
                        
                        {/* Historique des codes */}
                        <div className="space-y-1">
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
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${badgeClass}`}>
                          {badgeLabel}
                        </span>
                        <span 
                          className={`text-gray-500 transition-transform duration-200 ${
                            !isCollapsed ? 'rotate-180' : ''
                          }`}
                          aria-hidden="true"
                        >
                          ▼
                        </span>
                      </div>
                    </button>

                      {/* Metadata grid - only show when expanded */}
                      {!isCollapsed && (
                        <div className="p-4 mt-4 pt-4 border-t border-gray-200">
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
                              value={typeof value === 'boolean' ? String(value) : value}
                              onChange={(e) => handleMetadataFieldChange(row.id, field.key, e.target.value)}
                              className={`px-3 py-1 text-sm border rounded-md focus:ring-2 focus:border ${inputBorderClass}`}
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
                              value={typeof value === 'boolean' ? String(value) : value}
                              onChange={(e) => handleMetadataFieldChange(row.id, field.key, e.target.value)}
                              className={`px-3 py-1 text-sm border rounded-md focus:ring-2 focus:border ${inputBorderClass}`}
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

                {metadataFileInfo.loadStatus === 'success' && unresolvedReferenceCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowUnresolvedModal(true)}
                    className="text-sm text-amber-700 font-medium hover:text-amber-900 underline decoration-dotted underline-offset-2"
                  >
                    ⚠️ {unresolvedReferenceCount} référence(s) PCG introuvable(s) — 👁 Consulter
                  </button>
                )}
                
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

      {/* Modale : lignes avec referencePcgCode introuvable */}
      {showUnresolvedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-amber-50">
              <div>
                <h3 className="text-lg font-semibold text-amber-900">
                  ⚠️ Références PCG introuvables
                </h3>
                <p className="text-sm text-amber-700 mt-1">
                  {unresolvedReferenceCount} ligne{unresolvedReferenceCount > 1 ? 's' : ''} dont le referencePcgCode n'existe pas dans le PCG chargé
                </p>
              </div>
              <button
                onClick={() => setShowUnresolvedModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Fermer"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4">
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Titre</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code original</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code final</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">referencePcgCode introuvable</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {accountsNeedingMetadata.filter(row => row.isUnresolvedReference).map((row, index) => (
                      <tr key={row.id} className="hover:bg-amber-50">
                        <td className="px-4 py-3 whitespace-nowrap text-gray-500">{index + 1}</td>
                        <td className="px-4 py-3 text-gray-800">{row.title}</td>
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-gray-600">{row.codeHistory.originalCode}</td>
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-gray-900">{row.finalCode}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-amber-100 text-amber-800 border border-amber-300">
                            {row.codeHistory.referencePcgCode || '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-600">
                Corrigez ces codes dans le fichier CSV puis rechargez-le.
              </div>
              <button
                onClick={() => setShowUnresolvedModal(false)}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium text-sm"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
