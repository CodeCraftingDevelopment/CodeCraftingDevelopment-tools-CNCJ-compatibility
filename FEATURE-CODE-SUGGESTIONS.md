# 💡 Documentation Technique - Suggestions Automatiques de Codes (Étape 4)

> **Nouvelle fonctionnalité ajoutée le 20/11/2025**  
> Système intelligent de suggestion pour résoudre automatiquement les doublons de comptes clients

---

## 📋 Vue d'ensemble

### Objectif
Faciliter la résolution des doublons à l'étape 4 en proposant automatiquement des codes de remplacement valides, sans intervention manuelle fastidieuse.

### Fonctionnement
1. L'utilisateur charge un fichier avec des doublons
2. À l'étape 4, chaque doublon affiche une suggestion automatique
3. L'utilisateur peut :
   - Cliquer sur un bouton "💡 [code]" pour appliquer une suggestion individuelle
   - Cliquer sur "✨ Valider les suggestions" pour tout appliquer d'un coup
   - Saisir manuellement un code personnalisé

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
- **Bouton de suggestion** : "💡 [code]" pour appliquer la suggestion
- **Badge d'erreur** : "⚠️ Erreur" pour codes finissant par 9
- **Affichage conditionnel** : visible uniquement si `conflictType === 'duplicates'` et champ vide

```tsx
{conflictType === 'duplicates' && !replacementCode?.trim() && (
  <div className="ml-2">
    {suggestedCode ? (
      <button onClick={() => onReplacementCodeChange(account.id, suggestedCode)}>
        💡 {suggestedCode}
      </button>
    ) : account.number.endsWith('9') ? (
      <span className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded">
        ⚠️ Erreur
      </span>
    ) : null}
  </div>
)}
```

#### `src/components/ResultsDisplay.tsx`
- **Import** : `calculateSuggestions` et `useMemo`
- **Calcul des suggestions** : via `useMemo` pour optimisation
- **Bouton global** : "✨ Valider les suggestions"

```tsx
// Calcul des suggestions (memoized)
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

// Bouton "Valider les suggestions"
<button
  onClick={() => {
    if (!onReplacementCodeChange) return;
    
    suggestions.forEach((suggestedCode, accountId) => {
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

### Badge d'erreur
Pour les codes se terminant par 9.

**Affichage** : "⚠️ Erreur" (rouge, non cliquable)

**Styles** :
```tsx
className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded"
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
