# 💡 Documentation Technique - Suggestions Automatiques de Codes (Étapes 4 & 6)

> **Fonctionnalité initiale ajoutée le 20/11/2025**  
> **Extension à l'étape 6 ajoutée le 04/12/2025**  
> Système intelligent de suggestion pour résoudre automatiquement les doublons et conflits CNCJ

---

## 📋 Vue d'ensemble

### Objectif
Faciliter la résolution des doublons (étape 4) et des conflits CNCJ (étape 6) en proposant automatiquement des codes de remplacement valides, sans intervention manuelle fastidieuse.

### Fonctionnement

#### Étape 4 - Doublons
1. L'utilisateur charge un fichier avec des doublons
2. À l'étape 4, chaque doublon affiche une suggestion automatique
3. L'utilisateur peut :
   - Cliquer sur un bouton "💡 [code]" pour appliquer une suggestion individuelle
   - Cliquer sur "✨ Valider les suggestions" pour tout appliquer d'un coup
   - Saisir manuellement un code personnalisé

#### Étape 6 - Conflits CNCJ
1. Les comptes clients normalisés sont comparés aux codes CNCJ/PCG
2. Pour chaque conflit, une suggestion de code +1 est proposée
3. Le système vérifie que le code suggéré n'existe pas dans les codes PCG/CNCJ
4. Si le code existe, il essaie +1 jusqu'à trouver un code libre
5. Si tous les codes de la dizaine sont utilisés → avertissement "Plage saturée"

---

## 🔧 Architecture Technique

### Fichiers créés

#### `src/utils/codeSuggestions.ts`
Logique de calcul des suggestions.

```typescript
/**
 * Suggère le prochain code disponible en incrémentant sans dépasser la dizaine
 */
export function suggestNextCode(
  originalCode: string, 
  usedCodes: Set<string>
): string | null

/**
 * Calcule toutes les suggestions pour un ensemble de doublons
 */
export function calculateSuggestions(
  duplicates: Array<{ id: string; number: string }>,
  existingCodes: Set<string>,
  replacementCodes: { [key: string]: string }
): Map<string, string | null>
```

### Fichiers modifiés

#### `src/components/DuplicateRow.tsx`
- **Ajout du prop** : `suggestedCode?: string | null`
- **Bouton de suggestion** : "💡 [code]" pour appliquer la suggestion (étapes 4 ET 6)
- **Badge d'erreur** : "⚠️ Code finit par 9" pour codes impossibles
- **Badge d'avertissement** : "⚠️ Plage saturée" pour dizaines pleines
- **Statuts dynamiques** : affichage contextuel selon l'état de la correction (étape 6)

```tsx
{/* Bouton de suggestion - étapes 4 ET 6 */}
{!replacementCode?.trim() && (
  <div className="ml-2">
    {suggestedCode ? (
      <button onClick={() => onReplacementCodeChange(account.id, suggestedCode)}>
        💡 {suggestedCode}
      </button>
    ) : (() => {
      const codeToCheck = conflictType === 'duplicates' ? getDisplayCode(account) : account.number;
      const endsWithNine = codeToCheck.endsWith('9');
      const base = Math.floor(parseInt(codeToCheck) / 10) * 10;
      
      if (endsWithNine) {
        return <span className="bg-red-100 text-red-700">⚠️ Code finit par 9</span>;
      } else {
        return <span className="bg-orange-100 text-orange-700">⚠️ Plage {base}-{base+9} saturée</span>;
      }
    })()}
  </div>
)}
```

#### `src/components/ResultsDisplay.tsx`
- **Import** : `calculateSuggestions`, `suggestNextCode` et `useMemo`
- **Calcul des suggestions étape 4** : via `useMemo` pour optimisation
- **Calcul des suggestions étape 6** : `cncjSuggestions` vérifiant les codes PCG/CNCJ
- **Bouton global** : "✨ Valider les suggestions" (étapes 4 ET 6)

```tsx
// Calcul des suggestions pour l'étape 4 (memoized)
const suggestions = useMemo(() => {
  if (conflictType !== 'duplicates' || duplicates.length === 0) {
    return new Map<string, string | null>();
  }
  
  const existingCodes = new Set([
    ...uniqueClients.map(acc => acc.number),
    ...matches.map(acc => acc.number),
    ...unmatchedClients.map(acc => acc.number)
  ]);
  
  return calculateSuggestions(duplicates, existingCodes, replacementCodes);
}, [duplicates, uniqueClients, matches, unmatchedClients, replacementCodes, conflictType]);

// Calcul des suggestions pour l'étape 6 - Conflits CNCJ
const cncjSuggestions = useMemo(() => {
  if (conflictType !== 'cncj-conflicts' || duplicates.length === 0 || !cncjCodes) {
    return new Map<string, string | null>();
  }
  
  const suggestionsMap = new Map<string, string | null>();
  const usedCodes = new Set([...cncjCodes]);
  
  // Ajouter les codes de remplacement déjà saisis
  Object.values(replacementCodes).forEach(code => {
    if (code?.trim()) usedCodes.add(code.trim());
  });
  
  duplicates.forEach(duplicate => {
    if (replacementCodes[duplicate.id]?.trim()) {
      suggestionsMap.set(duplicate.id, null);
      return;
    }
    
    // Logique +1 en vérifiant les codes PCG/CNCJ
    const suggestion = suggestNextCode(duplicate.number, usedCodes);
    suggestionsMap.set(duplicate.id, suggestion);
    
    if (suggestion) usedCodes.add(suggestion);
  });
  
  return suggestionsMap;
}, [duplicates, cncjCodes, replacementCodes, conflictType]);

// Bouton "Valider les suggestions" - fonctionne pour les deux étapes
<button
  onClick={() => {
    const currentSuggestions = conflictType === 'cncj-conflicts' ? cncjSuggestions : suggestions;
    
    currentSuggestions.forEach((suggestedCode, accountId) => {
      if (suggestedCode && !replacementCodes[accountId]?.trim()) {
        onReplacementCodeChange(accountId, suggestedCode);
      }
    });
  }}
  disabled={availableSuggestions.length === 0}
>
  ✨ Valider les suggestions
</button>
```

---

## 🎯 Règles d'Incrémentation

### Règle 0 : Premier doublon garde son code original ⭐
Pour minimiser les changements, le premier doublon d'un groupe garde son code original si celui-ci n'est pas déjà utilisé.

```typescript
// Exemple : 2 doublons du code "20000"
Doublon 1 : suggestion = "20000" (garde le code original)
Doublon 2 : suggestion = "20001" (incrémenté)

// Exemple : 3 doublons du code "140"
Doublon 1 : suggestion = "140" (garde le code original)
Doublon 2 : suggestion = "141"
Doublon 3 : suggestion = "142"
```

### Règle 1 : Incrémentation limitée à la dizaine
Le code suggéré ne dépasse jamais la dizaine du code original.

```typescript
// Exemples
140 → 140, 141, 142, 143, ..., 149 (maximum)
145 → 145, 146, 147, 148, 149 (maximum)
200 → 200, 201, 202, 203, ..., 209 (maximum)

// JAMAIS de passage à la dizaine supérieure
149 → null (pas de suggestion)
199 → null (pas de suggestion)
```

### Règle 2 : Détection des codes impossibles
Les codes se terminant par 9 ne peuvent pas être incrémentés.

```typescript
suggestNextCode('149', new Set()) // → null
suggestNextCode('999', new Set()) // → null
suggestNextCode('1239', new Set()) // → null
```

**Affichage UI** : Badge rouge "⚠️ Erreur" au lieu d'un bouton.

### Règle 3 : Évitement des doublons
Le système vérifie TOUS les codes avant de suggérer.

```typescript
// Codes vérifiés :
// - uniqueClients (comptes uniques du client)
// - matches (comptes matchés avec CNCJ)
// - unmatchedClients (comptes non matchés)
// - replacementCodes (codes de remplacement déjà saisis)

// Exemple
const usedCodes = new Set(['141', '142', '150']);
suggestNextCode('140', usedCodes) // → '143' (saute 141 et 142)
```

### Règle 4 : Application sélective
Le bouton "✨ Valider les suggestions" est intelligent.

```typescript
// N'applique QUE si :
// 1. Il y a une suggestion (pas null)
// 2. Le champ est vide (pas déjà rempli)

suggestions.forEach((suggestedCode, accountId) => {
  if (suggestedCode && !replacementCodes[accountId]?.trim()) {
    onReplacementCodeChange(accountId, suggestedCode);
  }
});

// Ignore :
// - Doublons déjà remplis manuellement
// - Doublons avec erreur (code finit par 9)
```

---

## 💻 Exemples de Code

### Exemple 1 : Suggestion simple
```typescript
// Doublon détecté : compte "140" apparaît 3 fois
const duplicates = [
  { id: 'dup1', number: '140' },
  { id: 'dup2', number: '140' },
  { id: 'dup3', number: '140' }
];

const existingCodes = new Set(['200', '201']);
const replacementCodes = {};

const suggestions = calculateSuggestions(duplicates, existingCodes, replacementCodes);

// Résultat :
// Map {
//   'dup1' → '140',  // Premier doublon garde le code original
//   'dup2' → '141',
//   'dup3' → '142'
// }
```

### Exemple 2 : Évitement des doublons
```typescript
// Un code a déjà été saisi manuellement
const duplicates = [
  { id: 'dup1', number: '140' },
  { id: 'dup2', number: '140' }
];

const existingCodes = new Set(['200']);
const replacementCodes = { 'dup1': '141' }; // Déjà saisi

const suggestions = calculateSuggestions(duplicates, existingCodes, replacementCodes);

// Résultat :
// Map {
//   'dup1' → null,  // Déjà rempli, pas de suggestion
//   'dup2' → '140'  // Premier doublon sans remplacement garde le code original
// }
```

### Exemple 3 : Codes finissant par 9
```typescript
const duplicates = [
  { id: 'dup1', number: '149' },
  { id: 'dup2', number: '149' }
];

const existingCodes = new Set(['200']);
const replacementCodes = {};

const suggestions = calculateSuggestions(duplicates, existingCodes, replacementCodes);

// Résultat :
// Map {
//   'dup1' → null,  // Finit par 9, impossible
//   'dup2' → null   // Finit par 9, impossible
// }

// UI : affiche "⚠️ Erreur" sur les deux lignes
```

---

## 🎨 Interface Utilisateur

### Boutons de suggestion individuels
Chaque doublon affiche un bouton avec le code suggéré.

**Comportement** :
- Visible uniquement si le champ est vide
- Disparaît une fois le code appliqué
- Cliquer remplit automatiquement le champ
- La ligne passe au vert (code valide)

**Styles** :
```tsx
className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
```

### Bouton "Valider les suggestions"
Bouton global pour appliquer toutes les suggestions d'un coup.

**Position** : À droite du bouton "📥 Exporter les doublons"

**États** :
- **Actif (vert)** : Quand des suggestions sont disponibles
- **Désactivé (gris)** : Quand aucune suggestion disponible

**Tooltip dynamique** :
- "Appliquer X suggestion(s) automatique(s)" si suggestions disponibles
- "Aucune suggestion disponible" si désactivé

**Styles** :
```tsx
className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 
           transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
```

### Badges d'erreur et d'avertissement

#### Badge "Code finit par 9" (rouge)
Pour les codes se terminant par 9, aucune suggestion possible.

```tsx
className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded"
```

#### Badge "Plage saturée" (orange)
Quand tous les codes de la dizaine sont déjà utilisés (par CNCJ ou autres suggestions).

```tsx
className="px-3 py-1 text-xs bg-orange-100 text-orange-700 rounded"
// Exemple : "⚠️ Plage 4457110-4457119 saturée"
```

**Tooltip** : "Tous les codes de X à Y sont déjà utilisés. Saisissez manuellement un code hors de cette plage."

---

## 🏷️ Statuts Dynamiques (Étape 6)

À l'étape 6 (conflits CNCJ), chaque ligne affiche un statut contextuel qui change selon l'état de la correction.

### États possibles

| État | Badge | Couleur | Condition |
|------|-------|---------|-----------|
| Code valide | ✅ Code de remplacement valide | Vert | Code saisi, pas dans CNCJ, pas de doublon |
| Validation forcée | 🔒 Validation forcée | Bleu | Case "Forcer" cochée |
| Erreur CNCJ | ⚠️ Code saisi existe dans CNCJ | Rouge | Code saisi existe dans les codes CNCJ |
| Doublon | ⚠️ Code saisi en doublon | Rouge | Code saisi déjà utilisé ailleurs |
| En attente | ⏳ En attente de correction | Orange | Aucun code saisi |

### Code d'implémentation

```tsx
{conflictType === 'cncj-conflicts' && (
  <div className="mt-2 flex items-center justify-between">
    <div className="flex items-center space-x-2">
      <span className="text-xs text-gray-600">Statut:</span>
      {(() => {
        const hasValidCode = replacementCode?.trim() && !isDuplicateCode && !isCncjCode;
        const isForced = cncjForcedValidations.has(account.id);
        
        if (hasValidCode) {
          return <span className="bg-green-100 text-green-700">✅ Code de remplacement valide</span>;
        } else if (isForced) {
          return <span className="bg-blue-100 text-blue-700">🔒 Validation forcée</span>;
        } else if (isCncjCode) {
          return <span className="bg-red-100 text-red-700">⚠️ Code saisi existe dans CNCJ</span>;
        } else if (isDuplicateCode) {
          return <span className="bg-red-100 text-red-700">⚠️ Code saisi en doublon</span>;
        } else {
          return <span className="bg-orange-100 text-orange-700">⏳ En attente de correction</span>;
        }
      })()}
    </div>
    {/* Case "Forcer" visible uniquement si pas de code valide */}
    {!replacementCode?.trim() && (
      <div className="flex items-center space-x-2">
        <label>Forcer la validation:</label>
        <input type="checkbox" checked={cncjForcedValidations.has(account.id)} ... />
      </div>
    )}
  </div>
)}
```

---

## 🧪 Tests

### Fichier de test
**`test-data/clients-test-suggestions.csv`** contient :
- 3 doublons de "140" → suggestions 141, 142, 143
- 2 doublons de "145" → suggestions 146, 147
- 2 doublons de "149" → erreur (finit par 9)
- 2 comptes uniques (200, 201)

### Scénarios de test
Voir le fichier `test-data/TEST-SUGGESTIONS.md` pour les tests détaillés.

---

## 📊 Performance

### Optimisation avec useMemo
Le calcul des suggestions est optimisé avec `useMemo` :

```typescript
const suggestions = useMemo(() => {
  // Calcul uniquement si les dépendances changent
  return calculateSuggestions(duplicates, existingCodes, replacementCodes);
}, [duplicates, uniqueClients, matches, unmatchedClients, replacementCodes, conflictType]);
```

**Bénéfices** :
- Évite les recalculs inutiles à chaque render
- Améliore les performances avec beaucoup de doublons
- Réactivité instantanée de l'interface

---

## 🔄 Intégration Future

### Extension possible
Cette logique peut être étendue pour :
- **Suggestion par plage** : 140-149, 150-159, etc.
- **Suggestion multi-dizaines** : si dizaine pleine, suggérer la suivante
- **Personnalisation** : permettre à l'utilisateur de définir les règles
- **Export des suggestions** : CSV avec suggestions pré-remplies

### Compatibilité
- ✅ Compatible avec l'import de corrections CSV
- ✅ Compatible avec la saisie manuelle
- ✅ Compatible avec la navigation arrière/avant
- ✅ Compatible avec tous les types de comptes

---

*Document créé le 20/11/2025*  
*Dernière mise à jour : 04/12/2025 (extension étape 6)*
