/**
 * Résultat détaillé d'une suggestion de code
 */
export interface SuggestionResult {
  code: string | null;
  reason: string;
  triedCodes?: string[];  // Codes essayés mais indisponibles
  blockedBy?: 'cncj' | 'client' | 'both';  // Type de blocage
}

/**
 * Génère une suggestion de code avec des détails sur le calcul effectué.
 * 
 * @param originalCode - Le code original à incrémenter
 * @param usedCodes - Ensemble des codes déjà utilisés
 * @param cncjCodes - Ensemble des codes CNCJ (pour identifier la source du blocage)
 * @returns Objet contenant le code suggéré et les détails du calcul
 */
export function suggestNextCodeWithDetails(
  originalCode: string, 
  usedCodes: Set<string>,
  cncjCodes?: Set<string>
): SuggestionResult {
  // Vérifier si le code est vide ou non numérique
  if (!originalCode || !/^\d+$/.test(originalCode)) {
    return { code: null, reason: 'Code invalide' };
  }

  const codeNumber = parseInt(originalCode, 10);
  
  // Si le code finit par 9, il n'y a pas de suggestion possible
  const lastDigit = codeNumber % 10;
  if (lastDigit === 9) {
    return { code: null, reason: 'Le code original finit par 9, aucune incrémentation possible dans cette plage' };
  }

  // Calculer la base (dizaine)
  const base = Math.floor(codeNumber / 10) * 10;
  const maxInRange = base + 9;
  const triedCodes: string[] = [];
  let cncjBlocked = 0;
  let clientBlocked = 0;

  // Essayer chaque code dans la plage [codeNumber + 1, maxInRange]
  for (let candidate = codeNumber + 1; candidate <= maxInRange; candidate++) {
    const candidateStr = candidate.toString();
    if (!usedCodes.has(candidateStr)) {
      const increment = candidate - codeNumber;
      return { 
        code: candidateStr, 
        reason: `+${increment} depuis ${originalCode}${triedCodes.length > 0 ? ` (codes ${triedCodes.join(', ')} indisponibles)` : ''}`,
        triedCodes: triedCodes.length > 0 ? triedCodes : undefined
      };
    }
    triedCodes.push(candidateStr);
    if (cncjCodes?.has(candidateStr)) {
      cncjBlocked++;
    } else {
      clientBlocked++;
    }
  }

  // Plage saturée
  const blockedBy = cncjBlocked > 0 && clientBlocked > 0 ? 'both' : 
                    cncjBlocked > 0 ? 'cncj' : 'client';
  
  return { 
    code: null, 
    reason: `Plage ${base}-${maxInRange} saturée (${triedCodes.join(', ')} indisponibles)`,
    triedCodes,
    blockedBy
  };
}

/**
 * Génère une suggestion de code en incrémentant le code original
 * sans jamais passer à la dizaine supérieure.
 * 
 * @param originalCode - Le code original à incrémenter
 * @param usedCodes - Ensemble des codes déjà utilisés (codes originaux + codes de remplacement)
 * @returns Le code suggéré ou null si aucun code n'est disponible (finit par 9)
 */
export function suggestNextCode(originalCode: string, usedCodes: Set<string>): string | null {
  // Vérifier si le code est vide ou non numérique
  if (!originalCode || !/^\d+$/.test(originalCode)) {
    return null;
  }

  const codeNumber = parseInt(originalCode, 10);
  
  // Si le code finit par 9, il n'y a pas de suggestion possible
  const lastDigit = codeNumber % 10;
  if (lastDigit === 9) {
    return null;
  }

  // Calculer la base (dizaine) - ex: pour 145 => 140, pour 142 => 140
  const base = Math.floor(codeNumber / 10) * 10;
  const maxInRange = base + 9;

  // Essayer chaque code dans la plage [codeNumber + 1, maxInRange]
  for (let candidate = codeNumber + 1; candidate <= maxInRange; candidate++) {
    const candidateStr = candidate.toString();
    if (!usedCodes.has(candidateStr)) {
      return candidateStr;
    }
  }

  // Aucun code disponible dans la plage
  return null;
}

/**
 * Calcule toutes les suggestions pour un ensemble de doublons
 * 
 * @param duplicates - Liste des comptes en doublon
 * @param existingCodes - Codes déjà utilisés (comptes uniques, matches, etc.)
 * @param replacementCodes - Codes de remplacement déjà saisis
 * @param excludedCodes - Codes à exclure des suggestions (ex: codes CNCJ)
 * @returns Map des suggestions par ID de compte
 */
export function calculateSuggestions(
  duplicates: Array<{ id: string; number: string }>,
  existingCodes: Set<string>,
  replacementCodes: { [key: string]: string },
  excludedCodes?: Set<string>
): Map<string, string | null> {
  const suggestions = new Map<string, string | null>();
  const allUsedCodes = new Set([...existingCodes]);
  
  // Ajouter les codes exclus (ex: codes CNCJ) pour éviter de les suggérer
  if (excludedCodes) {
    excludedCodes.forEach(code => allUsedCodes.add(code));
  }

  // Ajouter tous les codes de remplacement déjà saisis
  Object.values(replacementCodes).forEach(code => {
    if (code?.trim()) {
      allUsedCodes.add(code.trim());
    }
  });

  // DEBUG: Logger les codes utilisés pour le débogage
  const relevantCodes = Array.from(allUsedCodes).filter(c => c.startsWith('467001')).sort();
  if (relevantCodes.length > 0) {
    // Codes utilisés commençant par 467001:
  }

  // Grouper les doublons par code original
  const duplicatesByCode = new Map<string, Array<{ id: string; number: string }>>();
  duplicates.forEach(duplicate => {
    const code = duplicate.number;
    if (!duplicatesByCode.has(code)) {
      duplicatesByCode.set(code, []);
    }
    duplicatesByCode.get(code)!.push(duplicate);
  });

  // Calculer les suggestions pour chaque groupe de doublons
  duplicatesByCode.forEach((group, originalCode) => {
    group.forEach((duplicate, index) => {
      // Si un code de remplacement est déjà saisi, ne pas suggérer
      const currentReplacement = replacementCodes[duplicate.id]?.trim();
      if (currentReplacement) {
        suggestions.set(duplicate.id, null);
        return;
      }

      let suggestion: string | null;

      // Le premier doublon d'un groupe garde le code original si disponible
      if (index === 0 && !allUsedCodes.has(originalCode)) {
        suggestion = originalCode;
      } else {
        // Les suivants utilisent l'incrémentation
        suggestion = suggestNextCode(originalCode, allUsedCodes);
      }

      suggestions.set(duplicate.id, suggestion);
      
      // Si une suggestion est trouvée, l'ajouter aux codes utilisés pour éviter les doublons
      if (suggestion) {
        allUsedCodes.add(suggestion);
      }
    });
  });

  return suggestions;
}

/**
 * Calcule toutes les suggestions avec détails pour un ensemble de doublons
 * 
 * @param duplicates - Liste des comptes en doublon
 * @param existingCodes - Codes déjà utilisés (comptes uniques, matches, etc.)
 * @param replacementCodes - Codes de remplacement déjà saisis
 * @param cncjCodes - Codes CNCJ (pour identifier la source du blocage)
 * @returns Map des suggestions détaillées par ID de compte
 */
export function calculateSuggestionsWithDetails(
  duplicates: Array<{ id: string; number: string }>,
  existingCodes: Set<string>,
  replacementCodes: { [key: string]: string },
  cncjCodes?: Set<string>
): Map<string, SuggestionResult> {
  const suggestions = new Map<string, SuggestionResult>();
  const allUsedCodes = new Set([...existingCodes]);
  
  // Ajouter les codes CNCJ pour éviter de les suggérer
  if (cncjCodes) {
    cncjCodes.forEach(code => allUsedCodes.add(code));
  }

  // Ajouter tous les codes de remplacement déjà saisis
  Object.values(replacementCodes).forEach(code => {
    if (code?.trim()) {
      allUsedCodes.add(code.trim());
    }
  });

  // Grouper les doublons par code original
  const duplicatesByCode = new Map<string, Array<{ id: string; number: string }>>();
  duplicates.forEach(duplicate => {
    const code = duplicate.number;
    if (!duplicatesByCode.has(code)) {
      duplicatesByCode.set(code, []);
    }
    duplicatesByCode.get(code)!.push(duplicate);
  });

  // Calculer les suggestions pour chaque groupe de doublons
  duplicatesByCode.forEach((group, originalCode) => {
    group.forEach((duplicate, index) => {
      // Si un code de remplacement est déjà saisi, ne pas suggérer
      const currentReplacement = replacementCodes[duplicate.id]?.trim();
      if (currentReplacement) {
        suggestions.set(duplicate.id, { code: null, reason: 'Code de remplacement déjà saisi' });
        return;
      }

      let result: SuggestionResult;

      // Le premier doublon d'un groupe garde le code original si disponible
      if (index === 0 && !allUsedCodes.has(originalCode)) {
        result = { code: originalCode, reason: 'Code original disponible (premier du groupe)' };
      } else {
        // Les suivants utilisent l'incrémentation avec détails
        result = suggestNextCodeWithDetails(originalCode, allUsedCodes, cncjCodes);
      }

      suggestions.set(duplicate.id, result);
      
      // Si une suggestion est trouvée, l'ajouter aux codes utilisés pour éviter les doublons
      if (result.code) {
        allUsedCodes.add(result.code);
      }
    });
  });

  return suggestions;
}
