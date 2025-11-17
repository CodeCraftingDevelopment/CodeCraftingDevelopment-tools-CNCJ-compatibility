import { useMemo } from 'react';
import { Account, ProcessingResult } from '../types/accounts';

interface UseStepValidationProps {
  result: ProcessingResult | null;
  cncjConflictResult: ProcessingResult | null;
  replacementCodes: { [key: string]: string };
  cncjAccounts: Account[];
  mergedClientAccounts: Account[];
}

export const useStepValidation = ({
  result,
  cncjConflictResult,
  replacementCodes,
  cncjAccounts,
  mergedClientAccounts
}: UseStepValidationProps) => {
  // Calculer si tous les doublons sont résolus
  const allDuplicatesResolved = useMemo(() => {
    if (!result || result.duplicates.length === 0) return true;
    
    const duplicateIds = new Set(result.duplicates.map(d => d.id));
    const codeOccurrences: { [key: string]: string[] } = {};
    
    // Calculer les occurrences de codes SEULEMENT pour les doublons
    Object.entries(replacementCodes).forEach(([accountId, code]) => {
      if (!duplicateIds.has(accountId)) return;
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
      ...result.uniqueClients.map(acc => acc.number),
      ...result.matches.map(acc => acc.number), 
      ...result.unmatchedClients.map(acc => acc.number)
    ]);
    
    // Vérifier que tous les doublons ont un code valide et unique
    return result.duplicates.every((account) => {
      const currentCode = replacementCodes[account.id]?.trim();
      const isEmpty = !currentCode;
      const isDuplicateWithOriginal = currentCode && allOriginalCodes.has(currentCode);
      const isDuplicateWithReplacement = currentCode && (codeOccurrences[currentCode]?.length || 0) > 1;
      const isDuplicateCode = isDuplicateWithOriginal || isDuplicateWithReplacement;
      
      return !isEmpty && !isDuplicateCode;
    });
  }, [result, replacementCodes]);

  // Calculer si tous les conflits CNCJ sont résolus
  const allCncjConflictsResolved = useMemo(() => {
    if (!cncjConflictResult || cncjConflictResult.duplicates.length === 0) return true;
    
    const conflictIds = new Set(cncjConflictResult.duplicates.map(d => d.id));
    const codeOccurrences: { [key: string]: string[] } = {};
    
    // Calculer les occurrences de codes SEULEMENT pour les conflits CNCJ
    Object.entries(replacementCodes).forEach(([accountId, code]) => {
      if (!conflictIds.has(accountId)) return;
      const trimmedCode = code?.trim();
      if (trimmedCode) {
        if (!codeOccurrences[trimmedCode]) {
          codeOccurrences[trimmedCode] = [];
        }
        codeOccurrences[trimmedCode].push(accountId);
      }
    });
    
    // Obtenir tous les codes CNCJ (sauf les conflits en cours de résolution)
    const cncjConflictCodes = new Set(cncjConflictResult.duplicates.map(d => d.number));
    const otherCncjCodes = cncjAccounts
      .filter(acc => !cncjConflictCodes.has(acc.number))
      .map(acc => acc.number);
    
    // Obtenir tous les codes clients fusionnés (sauf les conflits CNCJ)
    const otherClientCodes = mergedClientAccounts
      .filter(acc => !conflictIds.has(acc.id))
      .map(acc => acc.number);
    
    const allOtherCodes = new Set([...otherCncjCodes, ...otherClientCodes]);
    
    // Vérifier que tous les conflits CNCJ ont un code valide et unique
    return cncjConflictResult.duplicates.every((account) => {
      const currentCode = replacementCodes[account.id]?.trim();
      const isEmpty = !currentCode;
      const isDuplicateWithOthers = currentCode && allOtherCodes.has(currentCode);
      const isDuplicateWithReplacement = currentCode && (codeOccurrences[currentCode]?.length || 0) > 1;
      const isDuplicateCode = isDuplicateWithOthers || isDuplicateWithReplacement;
      
      return !isEmpty && !isDuplicateCode;
    });
  }, [cncjConflictResult, replacementCodes, cncjAccounts, mergedClientAccounts]);

  return {
    allDuplicatesResolved,
    allCncjConflictsResolved
  };
};
