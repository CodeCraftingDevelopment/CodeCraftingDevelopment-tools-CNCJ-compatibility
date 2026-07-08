# 🤖 Contexte Projet pour IA - Compte Processor

> **Document de référence pour IA (GPT-5 Codex, Claude, etc.)**  
> Ce fichier contient toutes les informations nécessaires pour comprendre et modifier le projet.

---

## 🚀 Version Actuelle : **v2.5.0** (2026-07-08)

### Dernières fonctionnalités majeures (2026-07-08)
- **🏢 Code société** : champ `companyCode` dans l'en-tête, propagé état/persistance/étape 8 ; utilisé dans la colonne `company.code` de l'export.
- **🔀 Export « accounting bridge »** (étape 8) : 6 colonnes `accountingbridgeAccount;axelorAccount.code;company.code;auxAccount.partnerSeq;pieceRef;active`, fichier `accounting-bridge-account-mapping.csv` ; export PCG renommé `account_account.csv`.
- **🔎 Écran « Vérification Fichier FEC »** : parcours en 2 étapes (Chargement → Rapport), contrôle de conformité d'un FEC client (norme A47 A-1).
- **💶 Contrôle + correction devise Axelor** : `Idevise = EUR` et `Montantdevise = |Débit ou Crédit|` ; correction en mémoire et téléchargement du FEC corrigé.
- **🧭 Table de correspondances optionnelle** : reconnaît les comptes déjà mappés par une intégration PCG antérieure.
- **📊 Export du rapport en Excel** (`.xlsx`, `xlsx-js-style`) et CSV.
- **📄 FEC optionnel dans le flux Integration PCG** : complète les comptes clients (flag `fromFec`) ; à l'étape 8 les comptes à créer sont restreints à ceux présents dans le FEC.
- **🔤 Renommage `isCNCJ` → `isCncj`** (casse Axelor) et fiabilisation du marquage CNCJ (code final exact uniquement).

> ⚙️ Fichiers clés FEC : `src/utils/fecValidation.ts`, `src/utils/fecReportExcel.ts`, `src/components/FecVerification.tsx`, `src/components/FecAccountsUploader.tsx`.

### Fonctionnalités précédentes (v2.2.0)
- **🎯 Système de nommage intelligent** : Génération automatique `compte-processor-[client]-[date].ccp`
- **💾 Persistance complète** : Sauvegarde/restauration des noms de fichiers personnalisés
- **🔄 Modification manuelle** : Possibilité de modifier le nom avec sauvegarde automatique
- **✅ Compatibilité étendue** : File System Access API + fallback classique

---

## 📋 Vue d'ensemble

### Objectif du projet
Application React/TypeScript pour traiter et comparer des comptes comptables provenant de deux sources :
- **Comptes clients** (fichier CSV)
- **Comptes CNCJ** (Conseil National des Compagnies Judiciaires - fichier CSV)

#### parseCSVFile
- Utilise PapaParse pour lire les fichiers CSV clients/CNCJ.
- Détecte automatiquement le format (séparateur, ordre des colonnes) via `detectCSVFormat`.
- Retourne `accounts`, `errors`, ainsi que :
  - `totalRows` : nombre de lignes utiles détectées (hors en-tête et lignes vides) ;
  - `skippedRows` : lignes ignorées (vides ou avec numéros invalides).
  - `invalidRows` : tableau de `{ lineNumber, values, reason }` pour alimenter la modale d’analyse.

#### FileUploader
- Gère la sélection (drag & drop ou bouton) et l'envoi à `parseCSVFile`.
- Met à jour `FileMetadata` (`name`, `size`, `rowCount`, `loadStatus`).
- Affiche désormais les statistiques d'import : comptes importés, total de lignes détectées, lignes ignorées.
- Fournit un bouton ⚠️ ouvrant `ImportErrorsModal` pour visualiser/exporter les lignes rejetées.

### ImportErrorsModal
Fenêtre modale listant les lignes ignorées (tableau, export CSV) et les messages génériques.

### Workflow principal
1. Chargement des fichiers CSV
2. Fusion automatique des comptes identiques
3. Normalisation des numéros (max 7 chiffres)
4. Résolution des doublons clients
5. Révision des corrections
6. Résolution des conflits avec codes CNCJ
7. Export des résultats finaux

---

## Architecture Technique

### Stack
- **Framework** : React 19 + TypeScript
- **Build** : Vite
- **Styling** : TailwindCSS
- **State Management** : useReducer (pas de Redux)
- **Routing** : Aucun (SPA mono-page avec étapes)

### Structure des dossiers
```
src/
├── config/
│   └── stepsConfig.ts          # ⭐ Configuration centralisée des étapes
├── steps/
│   ├── components/
│   │   ├── StepRenderer.tsx    # Wrapper générique pour toutes les étapes
│   │   ├── StepNavigation.tsx  # Boutons Retour/Suivant
│   │   ├── ProgressBar.tsx     # Barre de progression interactive
│   │   └── StepContent.tsx     # Composants utilitaires (stats, légendes)
│   ├── Step1FileUpload.tsx     # Étape 1 : Chargement fichiers
│   ├── Step2MergeVisualization.tsx  # Étape 2 : Visualisation fusions
│   ├── Step4DuplicatesResolution.tsx  # Étape 4 : Résolution doublons
│   ├── Step5ReviewCorrections.tsx    # Étape 5 : Révision
│   ├── Step6CNCJConflicts.tsx  # Étape 6 : Conflits CNCJ
│   └── StepFinalSummary.tsx    # Étape finale : Récapitulatif
├── components/
│   ├── FileUploader.tsx        # Composant upload CSV
│   ├── ResultsDisplay.tsx      # Affichage résultats (doublons, matches)
│   └── NormalizationStep.tsx   # Étape 3 : Normalisation (legacy)
├── hooks/
│   ├── useStepValidation.ts    # Validation des étapes
│   ├── useDragAndDrop.ts       # Drag & drop fichiers
│   └── useCorrectionsImport.ts # Import corrections CSV
├── utils/
│   ├── accountUtils.ts         # ⭐ Logique métier principale
│   ├── csvFormatDetector.ts    # Détection format CSV
│   ├── fileUtils.ts            # Utilitaires fichiers
│   ├── stepCleanup.ts          # Nettoyage état lors navigation arrière
│   └── codeSuggestions.ts      # ⭐ Suggestions automatiques de codes (Étape 4)
├── types/
│   └── accounts.ts             # ⭐ Types TypeScript
└── App.tsx                      # ⭐ Composant principal
```

---

## 🔑 Fichiers Clés

### 1. `src/config/stepsConfig.ts` ⭐
**Rôle** : Configuration centralisée de toutes les étapes

```typescript
export type StepId = 'step1' | 'step2' | 'step3' | 'step4' | 'step5' | 'step6' | 'stepFinal';

export interface StepConfig {
  id: StepId;
  order: number;
  title: string;
  icon: string;
  description: string;
  badge?: string;
  badgeColor?: 'green' | 'orange' | 'blue' | 'red';
  canProceed?: (state: AppState) => boolean;  // Validation pour passer à l'étape suivante
  shouldDisplay?: (state: AppState) => boolean;  // Affichage conditionnel
}

export const STEPS_CONFIG: StepConfig[] = [
  {
    id: 'step1',
    order: 1,
    title: 'Chargement des fichiers',
    icon: '📁',
    canProceed: (state) => {
      return state.clientAccounts.length > 0 && 
             state.cncjAccounts.length > 0 && 
             state.result !== null;
    }
  },
  // ... autres étapes
];
```

**Fonctions utilitaires** :
- `getStepConfig(stepId)` : Récupérer la config d'une étape
- `getNextStep(stepId)` : Obtenir l'étape suivante
- `getPreviousStep(stepId)` : Obtenir l'étape précédente
- `getStepProgress(stepId)` : Calculer % de progression

### 2. `src/types/accounts.ts` ⭐
**Types principaux** :

```typescript
export interface Account {
  id: string;           // UUID généré
  number: string;       // Numéro de compte
  title: string;        // Libellé
  fileSource?: 'client' | 'cncj' | 'general';
}

export interface ProcessingResult {
  uniqueClients: Account[];     // Comptes uniques
  duplicates: Account[];        // Doublons détectés
  matches: Account[];           // Comptes matchés avec CNCJ
  unmatchedClients: Account[]; // Comptes non matchés
}

export interface AppState {
  currentStep: StepId;
  clientAccounts: Account[];
  cncjAccounts: Account[];
  result: ProcessingResult | null;
  replacementCodes: { [accountId: string]: string };  // Corrections doublons
  cncjReplacementCodes: { [accountId: string]: string };  // Corrections conflits CNCJ
  cncjConflictResult: ProcessingResult | null;
  cncjConflictSuggestions: { [accountId: string]: string | 'error' };
  mergeInfo: MergeInfo[];  // Info sur les fusions automatiques
  accountsNeedingNormalization: NormalizationAccount[];
  finalFilter: 'all' | 'step4' | 'step6' | 'step4+step6';
  // ... autres propriétés
}
```

### 3. `src/utils/accountUtils.ts` ⭐
**Fonctions métier principales** :

```typescript
// Analyse et compare les comptes
export function processAccounts(
  clientAccounts: Account[], 
  cncjAccounts: Account[]
): ProcessingResult

// Fusionne les comptes identiques (même numéro ET titre)
export function mergeIdenticalAccounts(
  accounts: Account[]
): { merged: Account[], mergeInfo: MergeInfo[] }

// Détecte les doublons (même numéro, titre différent)
export function findDuplicates(accounts: Account[]): Account[]

// Compare deux comptes (similarité de titre)
export function compareAccounts(
  account1: Account, 
  account2: Account
): number  // 0 à 100

// Détecte les comptes nécessitant normalisation
export function findAccountsNeedingNormalization(
  accounts: Account[]
): NormalizationAccount[]

// Applique la normalisation (tronque à 7 chiffres)
export function applyNormalization(
  accounts: Account[],
  accountsToNormalize: NormalizationAccount[]
): Account[]
```

### 4. `src/App.tsx` ⭐
**Structure du composant principal** :

```typescript
// Reducer pour gérer l'état global
const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_CURRENT_STEP':
      // Navigation avec nettoyage si retour arrière
      return cleanupFutureSteps(state, action.payload);
    // ... autres actions
  }
};

function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  
  // Navigation générique
  const handleNavigateNext = useCallback(() => {
    const nextStep = getNextStep(state.currentStep);
    if (nextStep) {
      dispatch({ type: 'SET_CURRENT_STEP', payload: nextStep.id });
    }
  }, [state.currentStep]);
  
  // Rendu conditionnel des étapes
  return (
    <div>
      <ProgressBar currentStepId={state.currentStep} />
      
      {currentStepConfig?.id === 'step1' && (
        <StepRenderer step={currentStepConfig} isActive={true}>
          <Step1FileUpload {...props} />
          <StepNavigation {...navProps} />
        </StepRenderer>
      )}
      
      {/* Autres étapes... */}
    </div>
  );
}
```

---

## 📐 Patterns et Conventions

### Pattern : Système d'étapes dynamique

#### Ajouter une nouvelle étape
1. **Ajouter dans `stepsConfig.ts`**
```typescript
{
  id: 'step8',
  order: 8,
  title: 'Ma Nouvelle Étape',
  icon: '🎯',
  description: 'Description',
  badge: 'Step 8',
  badgeColor: 'blue',
  canProceed: (state) => {
    // Logique de validation
    return state.someCondition;
  }
}
```

2. **Mettre à jour le type `StepId`**
```typescript
export type StepId = 'step1' | 'step2' | 'step3' | 'step4' | 'step5' | 'step6' | 'step8' | 'stepFinal';
```

3. **Créer le composant**
```typescript
// src/steps/Step8MyNewStep.tsx
import React from 'react';

interface Step8MyNewStepProps {
  // Props nécessaires depuis l'état
}

export const Step8MyNewStep: React.FC<Step8MyNewStepProps> = ({ ... }) => {
  return (
    <div>
      {/* Contenu de l'étape */}
    </div>
  );
};
```

4. **Intégrer dans `App.tsx`**
```typescript
// Importer le composant
import { Step8MyNewStep } from './steps/Step8MyNewStep';

// Dans le JSX, après les autres étapes
{currentStepConfig?.id === 'step8' && (
  <StepRenderer step={currentStepConfig} isActive={true}>
    <Step8MyNewStep {...props} />
    <StepNavigation
      currentStep={currentStepConfig}
      previousStep={previousStepConfig}
      nextStep={nextStepConfig}
      canProceed={canProceedToNext}
      onNext={handleNavigateNext}
      onPrevious={handleNavigatePrevious}
    />
  </StepRenderer>
)}
```

### Pattern : Dispatch d'actions

```typescript
// Changer d'étape
dispatch({ type: 'SET_CURRENT_STEP', payload: 'step2' });

// Définir des comptes
dispatch({ type: 'SET_CLIENT_ACCOUNTS', payload: accounts });

// Définir un code de remplacement
dispatch({ 
  type: 'SET_REPLACEMENT_CODE', 
  payload: { accountId: '123', code: '401000' } 
});

// Erreurs
dispatch({ type: 'SET_ERRORS', payload: ['Erreur fichier'] });
dispatch({ type: 'CLEAR_ERRORS' });
```

### Pattern : Validation d'étape

```typescript
// Dans stepsConfig.ts
canProceed: (state: AppState) => {
  // Vérifier les conditions nécessaires
  if (!state.result) return false;
  
  // Vérifier que tous les doublons ont une correction
  return state.result.duplicates.every((dup) => {
    const code = state.replacementCodes[dup.id];
    return code && code.trim().length > 0;
  });
}
```

### Conventions de nommage

- **Composants** : PascalCase (`StepRenderer`, `FileUploader`)
- **Fichiers** : Même nom que le composant (`StepRenderer.tsx`)
- **Fonctions** : camelCase (`handleNavigateNext`, `processAccounts`)
- **Types** : PascalCase (`AppState`, `ProcessingResult`)
- **Constantes** : UPPER_SNAKE_CASE (`STEPS_CONFIG`, `MAX_DIGITS`)
- **Props interfaces** : Nom du composant + `Props` (`StepRendererProps`)

---

## 🎨 Composants Réutilisables

### StepRenderer
Wrapper générique pour toutes les étapes.

```tsx
<StepRenderer step={stepConfig} isActive={true}>
  {/* Contenu de l'étape */}
</StepRenderer>
```

**Props** :
- `step: StepConfig` - Configuration de l'étape
- `isActive: boolean` - Si l'étape est active (affichage)
- `children: ReactNode` - Contenu de l'étape

### StepNavigation
Boutons de navigation standardisés.

```tsx
<StepNavigation
  currentStep={currentStepConfig}
  previousStep={previousStepConfig}
  nextStep={nextStepConfig}
  canProceed={true}
  onNext={() => handleNext()}
  onPrevious={() => handlePrevious()}
  showNext={true}
  showPrevious={true}
/>
```

### ProgressBar
Barre de progression interactive.

```tsx
<ProgressBar
  currentStepId={state.currentStep}
  onStepClick={(stepId) => navigateToStep(stepId)}
  allowNavigation={true}
/>
```

### StepContent - Composants utilitaires

```tsx
// Statistique colorée
<StepStat 
  value={42} 
  label="Doublons détectés" 
  color="red" 
/>

// Boîte d'information
<StepInfoBox variant="warning">
  Message d'avertissement
</StepInfoBox>

// État vide
<StepEmptyState
  icon="✅"
  title="Aucun doublon"
  message="Tous les comptes sont uniques"
/>

// Grille de statistiques
<StepStatsGrid>
  <StepStat ... />
  <StepStat ... />
</StepStatsGrid>

// Légende
<StepLegend items={[
  { color: 'bg-blue-50', label: 'Corrections' },
  { color: 'bg-orange-50', label: 'Suggestions' }
]} />
```

---

## 🔍 Logique Métier

### Détection des doublons
Un doublon = **même numéro de compte, titre différent**

```typescript
// Exemple
Account 1: { number: "401000", title: "Client A" }
Account 2: { number: "401000", title: "Client B" }
// ⚠️ DOUBLON détecté
```

### Fusion des comptes identiques
Fusion automatique si **même numéro ET même titre**

```typescript
// Exemple
Account 1: { number: "401000", title: "Client A" }
Account 2: { number: "401000", title: "Client A" }
Account 3: { number: "401000", title: "Client A" }
// ✅ FUSION en 1 seul compte
```

### Normalisation
Tronque les numéros à 7 chiffres maximum.

```typescript
// Avant
"40100001234" → 11 chiffres

// Après normalisation
"4010000" → 7 chiffres (tronqué à droite)
```

### Conflits CNCJ
Détection des codes clients qui **existent déjà dans les codes CNCJ**.

```typescript
// Client a le code "100000"
// CNCJ a déjà un compte "100000"
// ⚠️ CONFLIT : le client doit changer de code
```

### Suggestions auto-correction
L'algorithme propose un code alternatif en ajoutant un suffixe.

```typescript
// Code en conflit : "100000"
// Suggestion 1 : "1000001"
// Si déjà pris : "1000002"
// Etc.
```

---

## 🧪 Tests et Validation

### Commandes
```bash
# Build de production
npm run build

# Serveur de développement
npm run dev

# Preview du build
npm run preview
```

### Tests manuels recommandés
1. **Navigation complète** : Step 1 → StepFinal
2. **Navigation arrière** : Vérifier que les données sont préservées/nettoyées
3. **Validation des étapes** : Boutons "Suivant" activés/désactivés
4. **Barre de progression** : Clic sur les étapes
5. **Import CSV** : Tester différents formats
6. **Résolution doublons** : Vérifier détection et correction
7. **Conflits CNCJ** : Vérifier suggestions
8. **Export** : Télécharger le CSV final

### Fichiers de test
Dossier `test-data/` contient des CSV de test :
- `clients-all-duplicates.csv` - Tous doublons
- `clients-edge-cases.csv` - Cas limites
- `clients-empty-rows.csv` - Lignes vides
- `clients-mixed-formats.csv` - Formats mixtes
- `clients-no-duplicates.csv` - Aucun doublon

---

## 🚨 Règles Importantes

### ⚠️ À NE PAS FAIRE
1. **Ne jamais supprimer `useReducer`** : C'est le cœur de la gestion d'état
2. **Ne pas bypasser la validation** : Les `canProceed` sont critiques
3. **Ne pas modifier les types sans vérifier** : TypeScript strict activé
4. **Ne pas hardcoder les étapes** : Toujours passer par `stepsConfig.ts`
5. **Ne pas oublier `cleanupFutureSteps`** : Critique pour navigation arrière

### ✅ Bonnes Pratiques
1. **Toujours typer** : Pas de `any`, utiliser les interfaces
2. **useCallback pour les handlers** : Optimisation des re-renders
3. **useMemo pour les calculs coûteux** : Ex: Sets, filtres complexes
4. **Commenter la logique métier** : Surtout validation et détection doublons
5. **Tester la navigation** : Avant/arrière après chaque modif

---

## 📝 Modifications Courantes

### Modifier le titre d'une étape
```typescript
// Dans stepsConfig.ts
{
  id: 'step4',
  title: 'Nouveau Titre',  // Modifier ici
  // ...
}
```

### Changer la couleur d'un badge
```typescript
// Dans stepsConfig.ts
{
  id: 'step4',
  badgeColor: 'orange',  // 'green' | 'orange' | 'blue' | 'red'
  // ...
}
```

### Ajouter une validation personnalisée
```typescript
// Dans stepsConfig.ts
canProceed: (state) => {
  // Votre logique
  if (state.customCondition) {
    return state.accounts.length > 10;
  }
  return true;
}
```

### Ajouter une action au reducer
```typescript
// Dans App.tsx

// 1. Ajouter le type d'action
type AppAction = 
  | { type: 'SET_MY_NEW_DATA'; payload: MyType }
  | ... // autres actions

// 2. Gérer dans le reducer
case 'SET_MY_NEW_DATA':
  return { ...state, myNewData: action.payload };

// 3. Dispatcher
dispatch({ type: 'SET_MY_NEW_DATA', payload: data });
```

### Modifier le format CSV accepté
```typescript
// Dans utils/csvFormatDetector.ts
export const detectFormat = (headers: string[]) => {
  // Ajouter votre logique de détection
  if (headers.includes('nouveau_champ')) {
    return 'nouveau_format';
  }
  // ...
}
```

---

## 🔗 Dépendances Clés

```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "typescript": "^5.0.0",
  "vite": "^5.0.0",
  "tailwindcss": "^3.3.0",
  "papaparse": "^5.4.1"  // Parse CSV
}
```

**PapaParse** est utilisé pour le parsing CSV :
```typescript
import Papa from 'papaparse';

Papa.parse(file, {
  header: true,
  skipEmptyLines: true,
  complete: (results) => {
    // results.data contient les lignes
  }
});
```

---

## 🐛 Debugging

### État actuel de l'application
```typescript
// Dans les DevTools React
console.log(state);  // État global complet
```

### Logs importants
```typescript
// Dans App.tsx - plusieurs console.log stratégiques
console.log('🔍 DEBUG: Step X rendering');
console.log('Navigation vers l\'étape suivante');
```

### Breakpoints utiles
- `App.tsx` ligne ~228 : `handleNavigateNext`
- `accountUtils.ts` ligne ~50 : `processAccounts`
- `stepsConfig.ts` ligne ~65 : validation step4

---

## 📚 Ressources

### Documentation Existante
- `README.md` - Guide utilisateur
- `REFACTORING.md` - Architecture technique détaillée
- `CHANGELOG.md` - Historique des modifications
- `AI_CONTEXT.md` - Ce fichier

### Structure de données exemple

**État après chargement des fichiers :**
```json
{
  "currentStep": "step2",
  "clientAccounts": [
    { "id": "uuid-1", "number": "401000", "title": "Client A" },
    { "id": "uuid-2", "number": "401001", "title": "Client B" }
  ],
  "cncjAccounts": [
    { "id": "uuid-3", "number": "100000", "title": "CNCJ A" }
  ],
  "result": {
    "uniqueClients": [...],
    "duplicates": [...],
    "matches": [...],
    "unmatchedClients": [...]
  },
  "replacementCodes": {},
  "mergeInfo": [
    { "number": "401000", "title": "Client A", "mergedCount": 3 }
  ]
}
```

---

## 🎯 Système de Nommage Intelligent (v2.2.0)

### Vue d'ensemble
Le système de nommage intelligent génère automatiquement des noms de fichiers basés sur le nom du client et la date, avec persistance complète et possibilité de modification manuelle.

### Architecture technique

#### `src/utils/fileNameGenerator.ts`
```typescript
// Génération du nom intelligent
export const generateSmartFileName = (clientName: string): string => {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
  
  const cleanClientName = clientName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Nettoyage caractères spéciaux
    .replace(/\s+/g, '-') // Espaces → tirets
    .replace(/-+/g, '-') // Éviter tirets multiples
    .replace(/^-|-$/g, ''); // Éviter tirets début/fin
  
  const clientPart = cleanClientName ? `-${cleanClientName}` : '';
  return `compte-processor${clientPart}-${dateStr}.ccp`;
};

// Extraction du nom de base sans extension
export const getBaseFileName = (fileName: string): string => {
  return fileName.replace(/\.[^/.]+$/, '');
};
```

#### État de l'application (AppState)
```typescript
export interface AppState {
  // ... champs existants ...
  clientName: string;        // Nom du client pour le projet
  fileName: string;          // Nom du fichier de sauvegarde persistant
}

export type AppAction = 
  | { type: 'SET_CLIENT_NAME'; payload: string }
  | { type: 'SET_FILE_NAME'; payload: string }
  | // ... autres actions ...
```

### Workflow de fonctionnement

#### 1. **Génération automatique**
```typescript
// Dans ProjectPersistence.tsx
useEffect(() => {
  if (isManuallyEdited) return; // Ne pas écraser si modifié manuellement
  
  const smartFileName = generateSmartFileName(state.clientName);
  const baseFileName = getBaseFileName(smartFileName);
  
  if (baseFileName !== state.fileName) {
    dispatch({ type: 'SET_FILE_NAME', payload: baseFileName });
  }
}, [state.clientName, dispatch, isManuallyEdited]);
```

#### 2. **Modification manuelle**
```typescript
// Champ de saisie pour fallback sans File System Access API
<input
  value={state.fileName}
  onChange={(e) => {
    setIsManuallyEdited(true); // Marquer comme modifié manuellement
    dispatch({ type: 'SET_FILE_NAME', payload: e.target.value });
  }}
/>
```

#### 3. **Persistance dans les fichiers projet**
```typescript
// Dans ProjectFile.data
data: {
  // ... autres champs ...
  clientName: string;
  fileName: string;  // Sauvegardé et restauré
}
```

### Compatibilité et sauvegarde

#### File System Access API
```typescript
// saveWithFileSystemAccess retourne le nom choisi
const saveWithFileSystemAccess = async (jsonString: string, filename?: string): Promise<string> => {
  const fileHandle = await window.showSaveFilePicker({
    suggestedName: filename ? `${filename}.ccp` : 'compte-processor.ccp',
    // ...
  });
  // ...
  return fileHandle.name; // Nom réellement utilisé
};
```

#### Mise à jour de l'état après sauvegarde
```typescript
const actualFileName = await saveProject(state, sanitizedFilename, description);
const baseFileName = getBaseFileName(actualFileName);
dispatch({ type: 'SET_FILE_NAME', payload: baseFileName });
```

### Cas d'usage et exemples

#### Scénario 1 : Nouveau projet
```
Input client : "Dupont & Cie"
→ Nom généré : "compte-processor-dupont-cie-2025-12-04.ccp"
→ Sauvegarde → Nom enregistré dans le projet
```

#### Scénario 2 : Modification manuelle
```
Nom suggéré : "compte-processor-dupont-2025-12-04.ccp"
Utilisateur modifie : "projet-dupont-final.ccp"
→ Sauvegarde → "projet-dupont-final" sauvegardé dans l'état
→ Rechargement → "projet-dupont-final" restauré
```

#### Scénario 3 : Migration projet existant
```
Chargement projet v2.1.1 (sans fileName)
→ Détection fileName vide
→ Génération automatique avec clientName existant
→ Prêt pour sauvegardes futures
```

### Points d'attention pour l'IA

#### 🔧 **Gestion de l'état**
- `isManuallyEdited` empêche la génération automatique d'écraser les modifications
- Deux instances de ProjectPersistence (page d'accueil + flux d'import)
- Synchronisation via l'état global Redux-like

#### 🔄 **Cycle de vie**
1. Montage → Détection File System Access API
2. Saisie client → Génération automatique du nom
3. Modification manuelle → Flag `isManuallyEdited` activé
4. Sauvegarde → Nom réel récupéré et sauvegardé
5. Chargement → Flag réinitialisé, nom restauré

#### ⚠️ **Edge cases**
- ClientName vide → `compte-processor-2025-12-04.ccp`
- Caractères spéciaux → Nettoyage automatique
- Projets anciens → Génération rétroactive
- Deux instances → Effets dupliqués (géré par état partagé)

---

## 💡 Conseils pour l'IA

### Avant de modifier
1. ✅ Lire ce fichier en entier
2. ✅ Comprendre le workflow (section Vue d'ensemble)
3. ✅ Identifier les fichiers concernés (section Architecture)
4. ✅ Vérifier les types TypeScript (section Types)
5. ✅ Respecter les patterns existants (section Patterns)

### Lors de la modification
1. ✅ Conserver la structure existante
2. ✅ Typer toutes les nouvelles fonctions/variables
3. ✅ Suivre les conventions de nommage
4. ✅ Ajouter des commentaires pour la logique complexe
5. ✅ Tester mentalement la navigation entre étapes

### Après modification
1. ✅ Vérifier que TypeScript compile (`npm run build`)
2. ✅ S'assurer que la navigation fonctionne
3. ✅ Valider que les états sont correctement gérés
4. ✅ Documenter les changements dans CHANGELOG.md

### Questions à se poser
- ❓ Cette modification nécessite-t-elle une nouvelle action dans le reducer ?
- ❓ Dois-je ajouter une nouvelle étape ou modifier une existante ?
- ❓ La validation de l'étape est-elle toujours correcte ?
- ❓ Les types TypeScript sont-ils à jour ?
- ❓ La navigation arrière fonctionne-t-elle toujours ?

---

## 🎯 Exemples de Demandes Typiques

### "Ajoute une étape de confirmation"
→ Suivre le pattern "Ajouter une nouvelle étape" (section Patterns)

### "Change la couleur des doublons en rouge"
→ Modifier dans le composant concerné (Step4DuplicatesResolution.tsx)

### "Ajoute une validation pour les numéros < 100000"
→ Modifier `canProceed` dans stepsConfig.ts pour l'étape concernée

### "Exporte aussi les comptes non modifiés"
→ Modifier StepFinalSummary.tsx, section export CSV

### "Détecte les doublons avec une tolérance de 80%"
→ Modifier `compareAccounts` dans accountUtils.ts

---

*Ce document est maintenu à jour avec le projet. Dernière mise à jour : 08/07/2026*
