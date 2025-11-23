import { Account, ProcessingResult } from '../types/accounts';

/**
 * Incrémente un code client avec contrainte (ne jamais passer à la dizaine supérieure)
 */
export const incrementCodeWithConstraint = (code: string): string | null => {
  // S'assurer que le code d'entrée est normalisé à 7 chiffres
  const normalizedCode = code.length > 7 ? code.slice(0, 7) : code.padEnd(7, '0');
  
  const codeNum = parseInt(normalizedCode);
  if (isNaN(codeNum)) return null;
  
  const incremented = codeNum + 1;
  
  // Vérifier la contrainte : ne pas passer à la dizaine supérieure
  if (incremented % 10 === 0) {
    return null; // Contrainte violée (ex: 10009 → 10010)
  }
  
  return incremented.toString().padStart(7, '0');
};

/**
 * Auto-corrige les conflits CNCJ avec incrémentation contrainte et validation croisée
 */
export const autoCorrectCncjConflicts = (
  conflicts: Account[], 
  cncjAccounts: Account[], 
  mergedClientAccounts: Account[],
  incrementFn: (code: string) => string | null = incrementCodeWithConstraint
): { [accountId: string]: string | 'error' } => {
  // Initialiser l'ensemble des codes utilisés (CNCJ + comptes clients fusionnés)
  const usedCodes = new Set([
    ...cncjAccounts.map(acc => acc.number),
    ...mergedClientAccounts.map(acc => acc.number)
  ]);
  
  const corrections: { [accountId: string]: string | 'error' } = {};
  
  // Trier les conflits pour des résultats déterministes
  const sortedConflicts = [...conflicts].sort((a, b) => a.number.localeCompare(b.number));
  
  sortedConflicts.forEach(conflict => {
    let currentCode = conflict.number;
    let attempts = 0;
    const maxAttempts = 9; // Maximum 9 tentatives avant de changer de dizaine
    
    while (attempts < maxAttempts) {
      const correctedCode = incrementFn(currentCode);
      
      if (correctedCode === null) {
        corrections[conflict.id] = 'error';
        break;
      }
      
      // Vérifier que le code n'est ni dans CNCJ, ni dans les clients fusionnés, ni déjà suggéré
      if (!usedCodes.has(correctedCode)) {
        corrections[conflict.id] = correctedCode;
        usedCodes.add(correctedCode); // Ajouter immédiatement pour éviter les conflits avec les prochaines corrections
        break;
      }
      
      currentCode = correctedCode;
      attempts++;
    }
    
    if (attempts >= maxAttempts) {
      corrections[conflict.id] = 'error';
    }
  });
  
  return corrections;
};

/**
 * Traiter les conflits CNCJ (comptes fusionnés qui existent dans CNCJ)
 */
export const processCncjConflicts = (mergedClientAccounts: Account[], cncjAccounts: Account[]): ProcessingResult => {
  // Utiliser les codes CNCJ tels quels (données de référence avec isCNCJ=true)
  const cncjCodes = new Set(cncjAccounts.map(acc => acc.number));
  
  // Identifier les comptes clients qui sont en conflit avec les codes CNCJ
  const conflicts: Account[] = [];
  const nonConflicts: Account[] = [];
  
  mergedClientAccounts.forEach(clientAccount => {
    // Les comptes clients sont déjà normalisés à 7 chiffres à l'étape 3
    if (cncjCodes.has(clientAccount.number)) {
      conflicts.push(clientAccount);
    } else {
      nonConflicts.push(clientAccount);
    }
  });
  
  // Retourner un résultat compatible avec l'interface existante
  return {
    duplicates: conflicts, // Les conflits CNCJ sont traités comme des "doublons"
    uniqueClients: nonConflicts,
    matches: [], // Pas de correspondances pertinentes pour cette étape
    unmatchedClients: [], // Pas de non-correspondances pertinentes pour cette étape
    toCreate: [] // Pas de comptes à créer pour cette étape
  };
};
