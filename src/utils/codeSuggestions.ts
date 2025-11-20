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
 * @returns Map des suggestions par ID de compte
 */
export function calculateSuggestions(
  duplicates: Array<{ id: string; number: string }>,
  existingCodes: Set<string>,
  replacementCodes: { [key: string]: string }
): Map<string, string | null> {
  const suggestions = new Map<string, string | null>();
  const allUsedCodes = new Set([...existingCodes]);

  // Ajouter tous les codes de remplacement déjà saisis
  Object.values(replacementCodes).forEach(code => {
    if (code?.trim()) {
      allUsedCodes.add(code.trim());
    }
  });

  // Calculer les suggestions pour chaque doublon
  duplicates.forEach(duplicate => {
    // Si un code de remplacement est déjà saisi, ne pas suggérer
    const currentReplacement = replacementCodes[duplicate.id]?.trim();
    if (currentReplacement) {
      suggestions.set(duplicate.id, null);
      return;
    }

    const suggestion = suggestNextCode(duplicate.number, allUsedCodes);
    suggestions.set(duplicate.id, suggestion);
    
    // Si une suggestion est trouvée, l'ajouter aux codes utilisés pour éviter les doublons
    if (suggestion) {
      allUsedCodes.add(suggestion);
    }
  });

  return suggestions;
}
