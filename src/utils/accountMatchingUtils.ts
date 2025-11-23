import { Account, ProcessingResult } from '../types/accounts';

/**
 * Types pour la logique de matching et d'héritage
 */
export type ModificationSource = 'step4' | 'step6' | 'step4+step6' | null;

export interface CodeHistory {
  originalCode: string; // Code original 8 chiffres
  normalizedCode: string; // Code normalisé 7 chiffres
  step4Code?: string; // Code après étape 4 (si doublon)
  step6Code?: string; // Code après étape 6 (si conflit CNCJ)
  finalCode: string; // Code final
  referencePcgCode?: string; // Code PCG utilisé comme référence pour l'héritage
}

/**
 * Normaliser un code à 7 chiffres pour l'affichage
 */
export const normalizeForDisplay = (code: string): string => {
  if (!code || code === '-' || code === 'Erreur') return code;
  return code.length > 7 ? code.slice(0, 7) : code.padEnd(7, '0');
};

/**
 * Calculer le code final pour un compte
 */
export const computeFinalCode = (
  account: Account,
  result: ProcessingResult | null,
  cncjConflictResult: ProcessingResult | null,
  replacementCodes: { [key: string]: string },
  cncjReplacementCodes: { [key: string]: string }
): string => {
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

/**
 * Trouver le compte PCG le plus proche par différence numérique minimale
 */
export const findClosestPcgMatch = (
  code: string,
  pcgAccountsByPrefix: Map<string, Account[]>
): Account | null => {
  const codeNum = parseInt(code);
  if (isNaN(codeNum)) return null;
  
  const prefix = code.substring(0, 4);
  const matchingPcgAccounts = pcgAccountsByPrefix.get(prefix) || [];
  
  if (matchingPcgAccounts.length === 0) return null;
  
  // Algorithme d'héritage par différence numérique minimale
  return matchingPcgAccounts.reduce((closest, current) => {
    const currentDiff = Math.abs(codeNum - parseInt(current.number));
    const closestDiff = Math.abs(codeNum - parseInt(closest.number));
    return currentDiff < closestDiff ? current : closest;
  });
};

/**
 * Hériter les métadonnées du compte PCG le plus proche
 */
export const inheritPcgMetadata = (
  closestPcgAccount: Account | null
): { inheritedData: Record<string, any>; referencePcgCode?: string } => {
  if (!closestPcgAccount) {
    return { inheritedData: {} };
  }
  
  const inheritedData = { ...(closestPcgAccount.rawData || {}) };
  delete inheritedData.importId;
  delete inheritedData.code;
  delete inheritedData.name;
  
  return {
    inheritedData,
    referencePcgCode: closestPcgAccount.number
  };
};

/**
 * Construire l'histogramme des codes pour un compte
 */
export const buildCodeHistory = (
  account: Account,
  result: ProcessingResult | null,
  cncjConflictResult: ProcessingResult | null,
  replacementCodes: { [key: string]: string },
  cncjReplacementCodes: { [key: string]: string },
  finalCode: string,
  referencePcgCode?: string
): CodeHistory => {
  const step4Ids = new Set(result?.duplicates?.map(d => d.id) || []);
  const step6Ids = new Set(cncjConflictResult?.duplicates?.map(d => d.id) || []);
  
  const isStep4Duplicate = step4Ids.has(account.id);
  const isStep6Conflict = step6Ids.has(account.id);
  
  const originalCode = account.originalNumber || account.number;
  const normalizedCode = account.number;
  const step4Code = isStep4Duplicate ? replacementCodes[account.id] : undefined;
  const step6Code = isStep6Conflict ? cncjReplacementCodes[account.id] : undefined;

  return {
    originalCode,
    normalizedCode,
    step4Code,
    step6Code,
    finalCode,
    referencePcgCode
  };
};

/**
 * Préparer les lookup maps pour les comptes PCG
 */
export const preparePcgLookups = (generalAccounts: Account[]) => {
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

  return { pcgLookup, pcgAccountsByPrefix };
};
