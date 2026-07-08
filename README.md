# 🏦 Compte Processor

Outil de traitement et comparaison de comptes comptables clients et CNCJ avec interface web moderne.

## 📋 Vue d'ensemble

Compte Processor est une application web React/TypeScript qui permet de :
- Importer des fichiers CSV de comptes clients, CNCJ et généraux
- Détecter automatiquement les doublons dans les comptes clients
- **Générer des suggestions intelligentes** de codes de remplacement pour les doublons
- Comparer les comptes clients avec les références CNCJ
- **Forcer la validation** des comptes en conflit CNCJ sans modification
- Importer et gérer des corrections avec aperçu avant application
- Exporter les résultats de traitement au format JSON
- Afficher les comptes avec numéros et titres descriptifs
- **Sauvegarder et charger des projets** complets pour le travail collaboratif

## ✨ Fonctionnalités

- **🆕 Vérification Fichier FEC** : Écran dédié de contrôle de conformité d'un FEC client (norme A47 A-1) — parcours en 2 étapes, contrôle et correction devise Axelor (`Idevise`/`Montantdevise`), export du rapport en Excel/CSV
- **🆕 FEC optionnel à l'import** : Un FEC peut compléter la liste des comptes clients ; à l'étape 8, les comptes à créer sont restreints à ceux réellement présents dans le FEC
- **Import CSV** : Support de plusieurs formats de fichiers CSV
- **Détection de doublons** : Identification automatique des comptes en double
- **Suggestions automatiques** : Génération intelligente de codes de remplacement (+1 sans dépasser la dizaine)
- **Modal de détails** : Vue complète des calculs de suggestions avec export CSV combiné
- **Export combiné** : CSV unifié avec suggestions étapes 4 + 6 et légende visuelle
- **Comparaison CNCJ** : Matching des comptes clients avec les références CNCJ
- **Validation forcée CNCJ** : Option pour valider les comptes en conflit CNCJ sans modification
- **Import de corrections** : Glisser-déposer de fichiers CSV avec aperçu avant application
- **Recherche combinée** : Matching des corrections par numéro de compte ET titre
- **Vérification de doublons** : Détection visuelle des codes de remplacement en double
- **Coloration des résultats** : Vert (codes uniques), Rouge (doublons), Gris (non trouvés)
- **Export des doublons** : Export CSV des doublons avec codes de remplacement
- **Export des résultats** : Téléchargement des résultats au format JSON
- **🆕 Nommage intelligent** : Génération automatique des noms de fichiers avec format `compte-processor-[client]-[date].ccp`
- **🆕 Persistance des noms** : Sauvegarde et restauration des noms de fichiers personnalisés
- **🆕 Modification manuelle** : Possibilité de modifier le nom de fichier avec sauvegarde automatique
- **Sauvegarde de projet** : Export complet de l'état du travail au format `.ccp`
- **Chargement de projet** : Restauration complète d'un projet précédemment sauvegardé
- **Intégrité des données** : Vérification par checksum SHA256 pour les transferts
- **Travail collaboratif** : Transfert de projets entre utilisateurs et environnements
- **Interface responsive** : Design moderne avec Tailwind CSS
- **Traitement en temps réel** : Feedback visuel pendant le traitement

## 🚀 Démarrage rapide

### Prérequis

- Node.js (version 18 ou supérieure)
- npm ou yarn

### Installation

```bash
# Cloner le projet
git clone <repository-url>
cd CodeCraftingDevelopment-tools-CNCJ-compatibility

# Installer les dépendances
npm install
```

### Lancement

```bash
# Démarrer le serveur de développement
npm run dev

# Construire pour la production
npm run build

# Prévisualiser la version de production
npm run preview

# Linter le code
npm run lint
```

L'application sera disponible sur `http://localhost:5173`

## 🎯 Système de nommage intelligent (v2.2.0)

### Génération automatique des noms de fichiers

Le système génère automatiquement des noms de fichiers intelligents basés sur le nom du client et la date :

**Format** : `compte-processor-[nom-client]-[date].ccp`

**Exemples** :
- `compte-processor-dupont-2025-12-04.ccp`
- `compte-processor-entreprise-abc-2025-12-04.ccp`
- `compte-processor-2025-12-04.ccp` (si pas de nom client)

### Workflow de nommage

#### 1. **Première saisie**
1. Saisissez le nom du client dans le champ prévu à cet effet
2. Le nom de fichier se met à jour automatiquement
3. Exemple : Client "Dupont Entreprise" → `compte-processor-dupont-entreprise-2025-12-04.ccp`

#### 2. **Modification manuelle**
1. Dans la boîte de dialogue de sauvegarde, modifiez le nom du fichier
2. Exemple : `mon-projet-dupont-final.ccp`
3. Le nouveau nom est sauvegardé dans le projet

#### 3. **Restauration**
1. Au chargement d'un projet, le nom de fichier personnalisé est restauré
2. Le nom modifié manuellement est préservé
3. La génération automatique est désactivée pour ne pas écraser les personnalisations

### Persistance et compatibilité

- **✅ Persistance complète** : Le nom de fichier est sauvegardé dans le projet
- **✅ Restauration automatique** : Le nom est restauré au chargement
- **✅ Modification manuelle** : Possibilité de personnaliser le nom
- **✅ Compatibilité** : Fonctionne avec File System Access API et fallback classique
- **✅ Migration** : Projets existants automatiquement compatibles

### Nettoyage intelligent

Les caractères spéciaux dans les noms de clients sont automatiquement nettoyés :
- Espaces → Tirets
- Caractères spéciaux → Supprimés
- Plusieurs tirets → Un seul tiret
- Exemple : "Dupont & Cie" → `compte-processor-dupont-cie-2025-12-04.ccp`

## 📖 Guide utilisateur

### Format des fichiers CSV

#### Fichier clients (deux colonnes recommandées)
```csv
numero,titre
12345,Compte caisse
67890,Banque principale
11111,Compte clients
```

*Note : La colonne titre est optionnelle. Si absente, "Sans titre" sera affiché.*

#### Fichier CNCJ (numéros de comptes uniquement)
```csv
numero
12345
67890
22222
```

*Note : Le fichier CNCJ ne doit contenir que des numéros de comptes. Toute colonne supplémentaire sera ignorée.*

#### Fichier de corrections (nouveau)
```csv
Numéro compte,Titre,Code remplacement
12345,Compte caisse,CODE001
67890,Banque principale,CODE002
11111,Compte clients,CODE003
```

*Note : Le fichier de corrections nécessite les trois colonnes pour le matching précis.*

### Flux d'utilisation

1. **Charger le fichier clients** : Cliquez sur "📋 Fichier des comptes clients" et sélectionnez votre CSV
2. **Charger le fichier CNCJ** : Cliquez sur "🏛️ Fichier des comptes CNCJ" et sélectionnez votre CSV
3. **Charger le fichier général** : Cliquez sur "📊 Fichier des comptes généraux" et sélectionnez votre CSV
4. **Résoudre les doublons (Étape 4)** :
    - Visualisez les doublons détectés automatiquement
    - Utilisez les suggestions automatiques (bouton 💡) pour chaque doublon
    - Ou cliquez sur "Valider les suggestions" pour appliquer toutes les suggestions en masse
    - Saisissez manuellement un code de remplacement si nécessaire
5. **Gérer les conflits CNCJ (Étape 6)** :
    - Consultez les comptes en conflit avec la référence CNCJ
    - Saisissez un code de remplacement conforme, ou
    - Cochez "Forcer la validation" pour accepter le compte tel quel
6. **Importer des corrections** : Glissez-déposez un fichier CSV de corrections dans la zone prévue
7. **Vérifier les doublons** : Consultez l'aperçu coloré (vert/rouge/gris) des codes
8. **Appliquer les corrections** : Cliquez sur "Appliquer les codes uniques" pour valider
9. **Exporter les résultats** : Utilisez les boutons d'export selon vos besoins
10. **Sauvegarder le projet** : Cliquez sur "💾 Sauvegarder le projet" pour conserver votre travail

### 💾 Sauvegarde et chargement de projets

Le système de persistance permet de sauvegarder et charger l'état complet du travail pour faciliter la collaboration et la reprise du travail.

#### Format de fichier `.ccp`

Les projets sont sauvegardés au format `.ccp` (Compte Processor Project) :
```json
{
  "version": "1.0.0",
  "metadata": {
    "createdAt": "2025-01-23T10:30:00.000Z",
    "createdBy": "Compte Processor User",
    "description": "Projet avec 1500 comptes clients, 75 comptes CNCJ, 8000 comptes généraux",
    "accountCounts": {
      "client": 1500,
      "cncj": 75,
      "general": 8000
    },
    "checksum": "sha256_hash_pour_vérification_intégrité"
  },
  "data": {
    "clientAccounts": [...],
    "cncjAccounts": [...],
    "generalAccounts": [...],
    "replacementCodes": {...},
    "currentStep": "step4",
    // ... toutes les données brutes du projet
  }
}
```

#### Flux de travail collaboratif

1. **Utilisateur 1** : Travaille sur le projet → Clique "💾 Sauvegarder le projet" → Fichier `.ccp` généré
2. **Transfert** : Partagez le fichier `.ccp` par email, USB, cloud, etc.
3. **Utilisateur 2** : Ouvre l'application → Clique "📁 Charger un projet" → Sélectionne le fichier `.ccp`
4. **Restauration** : L'état complet est restauré avec toutes les corrections manuelles et l'étape en cours

#### Sécurité et intégrité

- **Checksum SHA256** : Vérifie automatiquement l'intégrité du fichier lors du chargement
- **Validation de format** : Le fichier est validé avant restauration
- **Préservation des corrections** : Toutes les modifications manuelles sont conservées
- **Compatibilité cross-plateforme** : Fonctionne sur Windows, Mac, Linux

#### Bonnes pratiques

- **Sauvegardez régulièrement** : Après chaque étape importante du traitement
- **Nommez clairement** : Les fichiers incluent automatiquement la date de création
- **Vérifiez l'intégrité** : En cas de doute sur un fichier transféré
- **Travaillez à plusieurs** : Plusieurs utilisateurs peuvent collaborer sur le même projet

### Suggestions automatiques de codes (Étape 4)

L'application propose automatiquement des codes de remplacement intelligents pour les doublons détectés :

#### Règles de suggestion
- **Premier doublon conservé** : Le premier compte garde son code original (ex: 20000 → 20000)
- **Incrémentation intelligente** : Les doublons suivants sont incrémentés de +1 (ex: 20000 → 20001, 20002)
- **Limite de dizaine** : L'incrémentation ne dépasse jamais la dizaine supérieure (ex: 140 max 149)
- **Détection d'erreur** : Les codes finissant par 9 affichent un badge ⚠️ Erreur
- **Évitement de doublons** : Vérification automatique contre tous les codes existants

#### Utilisation
1. **Suggestions individuelles** : Bouton 💡 avec le code suggéré pour chaque doublon
2. **Application en masse** : Bouton "Valider les suggestions" pour appliquer toutes les suggestions d'un coup
3. **Affichage conditionnel** : Les suggestions n'apparaissent que pour les champs vides

#### Exemples
```
Compte 20000 (1er doublon) → Suggestion: 20000 (conservé)
Compte 20000 (2e doublon) → Suggestion: 20001
Compte 20000 (3e doublon) → Suggestion: 20002

Compte 149 (doublon) → ⚠️ Erreur (impossible d'incrémenter)
```

### Validation forcée des comptes CNCJ (Étape 6)

Lorsqu'un compte client présente un conflit avec la référence CNCJ, vous pouvez choisir de forcer sa validation sans modifier son code :

#### Fonctionnement
1. **Détection du conflit** : Message "⚠️ Erreur de correspondance CNCJ" affiché
2. **Option de forçage** : Case à cocher "Forcer la validation" disponible
3. **Validation sans modification** : Le compte est accepté tel quel sans changement de code
4. **Persistance** : L'état de validation forcée est conservé dans la sauvegarde du projet

#### Cas d'usage
- Comptes clients valides mais avec format différent de la référence CNCJ
- Comptes en cours de normalisation nécessitant une validation temporaire
- Situations exceptionnelles nécessitant une validation manuelle

#### Nettoyage automatique
- Rechargement de nouveaux fichiers : Les validations forcées sont réinitialisées
- Navigation arrière depuis l'étape 6 : Les validations forcées sont effacées
- Chargement de projet : Les validations forcées sont restaurées depuis la sauvegarde

### Import et gestion des corrections

L'import des corrections suit un workflow en trois étapes :

1. **Glisser-déposer** : Déposez votre fichier CSV dans la zone de dépôt
2. **Aperçu avec coloration** :
    - 🟢 **Vert** : Codes uniques applicables
    - 🔴 **Rouge** : Codes déjà existants (doublons)
    - ⚪ **Gris** : Comptes non trouvés dans les données
3. **Application sélective** : Seuls les codes uniques peuvent être appliqués

**Matching des corrections** : La recherche utilise le numéro de compte ET le titre pour garantir une correspondance précise et éviter les erreurs d'application.

### Structure des résultats exportés

Le fichier JSON exporté contient la structure suivante :
```json
{
  "duplicates": ["12345", "67890"],
  "matches": ["11111", "22222"],
  "unmatched": ["33333", "44444"]
}
```

Le fichier CSV des doublons exporté contient :
```csv
Numéro compte,Titre,Code remplacement
12345,Compte caisse,CODE001
67890,Banque principale,CODE002
```

### Notes importantes
- **Ordre d'upload** : L'ordre des fichiers n'a pas d'importance
- **Headers CSV** : Les headers sont automatiquement détectés et ignorés
- **Colonne titre** : Utilisée pour le matching précis des corrections
- **Workflow d'import** : Les corrections sont maintenant en aperçu avant application

### Interprétation des résultats

- **Comptes clients uniques** : Nombre de comptes valides après déduplication
- **Doublons détectés** : Comptes apparaissant plusieurs fois dans le fichier client
- **Suggestions automatiques** : Codes de remplacement proposés intelligemment pour les doublons
- **Correspondances CNCJ** : Comptes clients trouvés dans la référence CNCJ
- **Conflits CNCJ** : Comptes avec divergence par rapport à la référence CNCJ
- **Validations forcées** : Comptes en conflit acceptés sans modification de code
- **Sans correspondance** : Comptes clients non présents dans CNCJ
- **Codes uniques applicables** : Corrections qui peuvent être appliquées sans conflit
- **Codes en doublon** : Corrections qui existent déjà dans le système

## 🏗️ Architecture technique

### Stack technique

- **Frontend** : React 19 avec TypeScript
- **Build tool** : Vite
- **Styling** : Tailwind CSS
- **CSV Parsing** : PapaParse
- **State management** : React useReducer
- **Development** : ESLint, TypeScript

### Structure des dossiers

```
src/
├── components/          # Composants React
│   ├── FileUploader.tsx        # Composant d'upload de fichiers
│   ├── ResultsDisplay.tsx      # Affichage des résultats
│   ├── DuplicateRow.tsx        # Affichage d'un doublon avec suggestions
│   ├── DropZone.tsx            # Composant de glisser-déposer
│   └── ProjectPersistence.tsx  # Sauvegarde/chargement de projets
├── config/              # Configuration de l'application
│   └── stepsConfig.ts          # Configuration des étapes du workflow
├── steps/               # Composants d'étapes
│   ├── components/             # Composants partagés des étapes
│   │   ├── StepRenderer.tsx    # Rendu d'une étape
│   │   ├── StepNavigation.tsx  # Navigation entre étapes
│   │   └── ProgressBar.tsx     # Barre de progression
│   ├── Step1FileUpload.tsx     # Étape 1: Chargement fichiers
│   ├── Step4DuplicatesResolution.tsx  # Étape 4: Résolution doublons
│   ├── Step6CNCJConflicts.tsx  # Étape 6: Conflits CNCJ
│   └── StepFinalSummary.tsx    # Étape finale: Résumé
├── hooks/               # Hooks React personnalisés
│   ├── useDragAndDrop.ts       # Hook de gestion du glisser-déposer
│   ├── useStepValidation.ts    # Hook de validation des étapes
│   └── useCorrectionsImport.ts # Hook d'import des corrections
├── types/               # Définitions TypeScript
│   └── accounts.ts             # Interfaces Account, AppState, Actions
├── utils/               # Utilitaires et logique métier
│   ├── accountUtils.ts         # Parsing CSV, traitement des comptes
│   ├── codeSuggestions.ts      # Génération de suggestions de codes
│   ├── projectPersistence.ts   # Sauvegarde/chargement de projets
│   ├── stepCleanup.ts          # Nettoyage de l'état par étape
│   └── fileUtils.ts            # Utilitaires de formatage de fichiers
├── App.tsx              # Composant principal avec gestion d'état
├── main.tsx             # Point d'entrée
└── index.css            # Styles globaux
```

### Flux de données

```
Fichier CSV → parseCSVFile() → Account[] → useReducer → ResultsDisplay
                                                    ↓
                                              processAccounts()
                                                    ↓
                                              ProcessingResult
```

### Interfaces principales

```typescript
interface Account {
  id: string;
  number: string;
  title?: string;        // Optionnel, pour les descriptions
  source: 'client' | 'cncj' | 'general';
}

interface AppState {
  clientAccounts: Account[];
  cncjAccounts: Account[];
  generalAccounts: Account[];
  result: ProcessingResult | null;
  cncjConflictResult: ProcessingResult | null;
  replacementCodes: { [key: string]: string };
  cncjReplacementCodes: { [key: string]: string };
  cncjConflictCorrections: { [key: string]: string | 'error' };
  cncjForcedValidations: Set<string>;  // IDs des comptes validés de force
  currentStep: 'step1' | 'step2' | 'step3' | 'step4' | 'step5' | 'step6' | 'step7' | 'stepFinal';
  loading: boolean;
  errors: string[];
  // ... autres propriétés
}

interface ProcessingResult {
  duplicates: Account[];
  uniqueClients: Account[];
  matches: Account[];
  unmatchedClients: Account[];  // Comptes dans généraux mais pas dans CNCJ
  toCreate: Account[];          // Comptes ni dans CNCJ ni dans généraux
}

interface ImportResult {
  accountNumber: string;
  title: string;
  replacementCode: string;
  isDuplicate: boolean;
  found: boolean;
}

interface CodeSuggestion {
  accountId: string;
  suggestedCode: string;
  isError: boolean;       // true si le code ne peut pas être incrémenté
}
```

## 🛠️ Guide de développement

### Scripts disponibles

- `npm run dev` : Serveur de développement avec hot reload
- `npm run build` : Build de production optimisée
- `npm run preview` : Prévisualisation du build de production
- `npm run lint` : Analyse du code avec ESLint

### Architecture des composants

#### FileUploader
- Gère l'import des fichiers CSV
- Valide le format des fichiers
- Utilise `parseCSVFile` pour traiter les données
- Supporte différents formats CSV

#### ResultsDisplay
- Affiche les résultats de traitement
- Présente les comptes en deux colonnes (numéro + titre)
- Gère l'import de corrections avec glisser-déposer
- Affiche les résultats d'import avec coloration
- Permet l'export des résultats (doublons CSV, tous JSON)

#### DropZone
- Composant réutilisable de glisser-déposer
- Gère les états visuels (drag-over, loading, success, error)
- Supporte différents types de fichiers

#### useDragAndDrop (Hook)
- Logique de gestion du glisser-déposer
- État de glissement et gestionnaires d'événements
- Validation des types de fichiers

#### App (composant principal)
- Gère l'état global avec `useReducer`
- Orchestre le flux de traitement
- Gère les erreurs et le chargement

### Gestion d'état

L'application utilise le pattern **Reducer** pour gérer l'état :

```typescript
type AppAction = 
  | { type: 'SET_CLIENT_ACCOUNTS'; payload: Account[] }
  | { type: 'SET_CNCJ_ACCOUNTS'; payload: Account[] }
  | { type: 'SET_GENERAL_ACCOUNTS'; payload: Account[] }
  | { type: 'SET_RESULT'; payload: ProcessingResult | null }
  | { type: 'SET_CNCJ_CONFLICT_RESULT'; payload: ProcessingResult | null }
  | { type: 'SET_REPLACEMENT_CODE'; payload: { accountId: string; code: string } }
  | { type: 'SET_CNCJ_REPLACEMENT_CODE'; payload: { accountId: string; code: string } }
  | { type: 'SET_CNCJ_CONFLICT_CORRECTIONS'; payload: { [key: string]: string | 'error' } }
  | { type: 'SET_CNCJ_FORCED_VALIDATION'; payload: { accountId: string; forced: boolean } }
  | { type: 'CLEAR_CNCJ_FORCED_VALIDATIONS' }
  | { type: 'SET_CURRENT_STEP'; payload: 'step1' | 'step2' | 'step3' | 'step4' | 'step5' | 'step6' | 'step7' | 'stepFinal' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERRORS'; payload: string[] }
  | { type: 'CLEAR_ERRORS' };
```

### Ajout de fonctionnalités

Pour ajouter de nouvelles fonctionnalités :

1. **Types** : Modifier `src/types/accounts.ts`
2. **Logique** : Étendre `src/utils/accountUtils.ts`
3. **Interface** : Mettre à jour les composants dans `src/components/`
4. **État** : Ajouter des actions au reducer dans `App.tsx`
5. **Hooks** : Créer des hooks réutilisables dans `src/hooks/`

## 📚 Référence API

### parseCSVFile(file: File): Promise<FileUploadResult>

Parse un fichier CSV et retourne les comptes et erreurs.

**Paramètres**
- `file` : Fichier CSV à parser

**Retour** : `Promise<FileUploadResult>`
```typescript
interface FileUploadResult {
  accounts: Account[];
  errors: string[];
}
```

### processAccounts(clientAccounts, cncjAccounts): ProcessingResult

Traite et compare les comptes clients avec CNCJ.

**Paramètres**
- `clientAccounts` : Tableau des comptes clients
- `cncjAccounts` : Tableau des comptes CNCJ

**Retour** : `ProcessingResult` avec les doublons, correspondances et non-correspondances.

### useDragAndDrop(options): DragDropResult

Hook pour gérer le glisser-déposer de fichiers.

**Paramètres**
- `options` : Configuration du glisser-déposer (types acceptés, callbacks)

**Retour** : `DragDropResult` avec état et gestionnaires d'événements.

### calculateCodeSuggestions(duplicates, existingCodes, replacementCodes): CodeSuggestion[]

Génère automatiquement des suggestions de codes de remplacement pour les doublons.

**Paramètres**
- `duplicates` : Tableau des comptes en doublon
- `existingCodes` : Ensemble des codes déjà utilisés dans le système
- `replacementCodes` : Codes de remplacement déjà saisis manuellement

**Retour** : `CodeSuggestion[]` avec les suggestions et indicateurs d'erreur

**Logique**
- Premier doublon garde son code original
- Incrémentation de +1 pour les suivants sans dépasser la dizaine
- Vérification des doublons existants
- Détection des codes impossibles à incrémenter (se terminant par 9)

### useStepValidation(props): ValidationResult

Hook pour valider les étapes du workflow.

**Paramètres**
- `result` : Résultat du traitement des doublons
- `cncjConflictResult` : Résultat du traitement des conflits CNCJ
- `replacementCodes` : Codes de remplacement pour les doublons
- `cncjReplacementCodes` : Codes de remplacement pour les conflits CNCJ
- `cncjForcedValidations` : Set des comptes validés de force
- `cncjAccounts` : Comptes CNCJ de référence
- `mergedClientAccounts` : Comptes clients fusionnés

**Retour** : `{ allDuplicatesResolved: boolean, allCncjConflictsResolved: boolean }`

## 🔧 Dépannage

### Problèmes courants

#### Erreur : "Veuillez sélectionner un fichier CSV"
- **Cause** : Fichier sélectionné sans extension `.csv`
- **Solution** : Renommer le fichier avec l'extension `.csv`

#### Erreur : "n'est pas un numéro de compte valide"
- **Cause** : La première colonne contient du texte non numérique
- **Solution** : Assurer que les numéros de comptes sont purement numériques

#### Les titres ne s'affichent pas
- **Cause** : Le fichier CSV ne contient qu'une seule colonne
- **Solution** : Ajouter une deuxième colonne avec les titres (optionnel)

#### Erreurs de format CSV
- **Cause** : Ligne mal formatée, colonnes manquantes ou en trop
- **Solution** : Vérifier la structure du CSV et s'assurer de la cohérence des colonnes
- **Conseil** : Utiliser un éditeur de CSV pour valider le format avant l'import

#### Import des corrections échoue
- **Cause** : Le fichier CSV ne contient pas la colonne "Code remplacement"
- **Solution** : Assurer que le CSV contient les trois colonnes requises
- **Conseil** : Utiliser l'export des doublons comme modèle

#### Codes en doublon non détectés
- **Cause** : La détection ne vérifie que les codes existants, pas les doublons dans le même fichier
- **Solution** : Nettoyer le fichier CSV avant import pour éviter les doublons internes

#### Performance avec gros fichiers
- **Cause** : Fichiers de plus de 10 000 lignes peuvent ralentir le navigateur
- **Solution** : Diviser les gros fichiers en plusieurs parties plus petites
- **Conseil** : Vider le cache du navigateur si les performances se dégradent

#### Erreur de sauvegarde du projet
- **Cause** : Aucune donnée à sauvegarder ou erreur JavaScript
- **Solution** : Assurez-vous d'avoir importé au moins un fichier avant de sauvegarder
- **Conseil** : Vérifiez la console du navigateur pour les erreurs détaillées

#### Erreur de chargement du projet
- **Cause** : Fichier `.ccp` corrompu, modifié ou format invalide
- **Solution** : Vérifiez l'intégrité du fichier et réessayez
- **Conseil** : Le checksum SHA256 est automatiquement vérifié lors du chargement

#### Checksum invalide lors du chargement
- **Cause** : Le fichier a été modifié manuellement ou corrompu pendant le transfert
- **Solution** : Obtenez une nouvelle copie du fichier original
- **Conseil** : Évitez de modifier les fichiers `.ccp` dans un éditeur de texte

#### Format de fichier projet invalide
- **Cause** : Le fichier sélectionné n'est pas un fichier `.ccp` valide
- **Solution** : Utilisez uniquement les fichiers générés par Compte Processor
- **Conseil** : Vérifiez que le fichier a l'extension `.ccp` et contient du JSON valide

#### Les suggestions automatiques ne s'affichent pas
- **Cause** : Un code de remplacement a déjà été saisi manuellement
- **Solution** : Les suggestions apparaissent uniquement pour les champs vides
- **Conseil** : Effacez le code manuel pour voir la suggestion automatique

#### Suggestion avec badge ⚠️ Erreur
- **Cause** : Le compte se termine par 9, impossible d'incrémenter dans la même dizaine
- **Solution** : Saisissez manuellement un code de remplacement approprié
- **Conseil** : Utilisez un code dans une dizaine différente (ex: 150 au lieu de 149)

#### La case "Forcer la validation" ne fonctionne pas
- **Cause** : La validation forcée ne s'applique qu'aux conflits CNCJ à l'étape 6
- **Solution** : Vérifiez que vous êtes bien à l'étape 6 avec des conflits CNCJ détectés
- **Conseil** : Le message "⚠️ Erreur de correspondance CNCJ" doit être affiché

#### Les validations forcées disparaissent
- **Cause** : Comportement normal lors du rechargement de fichiers ou navigation arrière
- **Solution** : Les validations forcées sont nettoyées automatiquement pour éviter les incohérences
- **Conseil** : Sauvegardez votre projet pour conserver les validations forcées

### Performance

- Pour les gros fichiers (>10 000 lignes), l'application peut prendre quelques secondes
- L'interface reste responsive pendant le traitement
- Les résultats sont limités en hauteur pour éviter les problèmes de performance
- La zone d'aperçu des corrections est limitée à 60px de hauteur avec défilement

### Support navigateur

L'application supporte les navigateurs modernes :
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🚨 Limitations connues

- **Taille des fichiers** : Performance optimale jusqu'à 10 000 lignes par fichier
- **Mémoire navigateur** : Les très gros fichiers (>50 000 lignes) peuvent ralentir le navigateur
- **Format numéros** : Uniquement les numéros purement numériques sont acceptés
- **Encodage** : UTF-8 recommandé pour les caractères spéciaux dans les titres
- **Navigateurs** : Nécessite un navigateur moderne avec support JavaScript ES6+
- **Détection de doublons** : Vérifie uniquement les codes existants, pas les doublons internes au CSV

## 🚀 Déploiement

### Build de production

```bash
npm run build
```

Le build est généré dans le dossier `dist/` et peut être déployé sur :
- **Serveurs statiques** : Apache, Nginx, GitHub Pages
- **CDN** : Netlify, Vercel, Cloudflare Pages
- **Hébergement** : Tout service supportant les fichiers statiques

### Configuration requise
- Pas de serveur backend nécessaire
- Compatible avec l'hébergement statique
- HTTPS recommandé pour la production

## 📝 Notes de version

### v2.5.0 (2026-07-08)
- 🏢 **Code société** : champ `companyCode` dans l'en-tête, persisté dans le projet et utilisé à l'export
- 🔀 **Export « accounting bridge »** (étape 8) : 6 colonnes (`accountingbridgeAccount;axelorAccount.code;company.code;…`), fichier `accounting-bridge-account-mapping.csv` ; export PCG renommé `account_account.csv`
- 🏷️ « Nom du client » → « Nom du projet »
- 🔎 **Vérification Fichier FEC** : parcours en 2 étapes (Chargement → Rapport), contrôle de conformité (norme A47 A-1)
- 💶 **Contrôle + correction devise Axelor** : `Idevise = EUR`, `Montantdevise = |Débit ou Crédit|`, correction en mémoire + téléchargement du FEC corrigé
- 🧭 **Table de correspondances optionnelle** : reconnaissance des comptes déjà mappés par une intégration PCG antérieure
- 📊 **Export du rapport** au format Excel (`.xlsx`) et CSV
- 📄 **FEC optionnel à l'import** : complète les comptes clients (flag `fromFec`) ; comptes à créer restreints au FEC à l'étape 8
- 🔤 **Renommage `isCNCJ` → `isCncj`** (casse Axelor) et fiabilisation du marquage CNCJ (code final exact uniquement)
- 🧹 Suppression du contrôle « lettrage sans DateLet » (non conforme A47 A-1)

### v2.1.1 (2025-12-04)
- 🔧 **Persistance des suggestions** : Sauvegarde et restauration complètes des calculs de suggestions
- 📁 **Compatibilité ascendante** : Fichiers projets anciens toujours chargeables
- ✅ **Modal fidèle** : Conservation des détails originaux après chargement

### v2.1.0 (2025-12-04)
- 🎯 **Export combiné** : CSV unifié avec suggestions étapes 4 + 6
- 📊 **Modal enrichi** : Légende visuelle et colonnes séparées (Doublon/CNCJ)
- 🔄 **Tri amélioré** : Code 7 chiffres + code original secondaire
- 💡 **Suggestions automatiques** : Calcul intelligent (+1 sans dépasser la dizaine)

### v2.0.1 (2023-11-23)
- ✅ **Validation forcée CNCJ** : Nouvelle option pour valider les comptes en conflit CNCJ sans modification
  - Case à cocher "Forcer la validation" à côté des erreurs de correspondance CNCJ
  - Conservation de l'état lors de la navigation entre les étapes
  - Persistance dans les sauvegardes de projet avec compatibilité ascendante
  - Nettoyage automatique lors du rechargement ou navigation arrière
- 💡 **Suggestions automatiques** : Génération intelligente de codes de remplacement pour les doublons
  - Premier doublon conserve son code original
  - Incrémentation limitée à la dizaine (+1 max jusqu'à 9)
  - Détection automatique des codes impossibles à incrémenter
  - Boutons individuels et application en masse
- 🐛 **Corrections** : Amélioration de la gestion des validations forcées et compatibilité avec anciennes sauvegardes

### v1.3.0
- 💾 **Système de persistance** : Sauvegarde et chargement complets des projets au format `.ccp`
- 🔐 **Intégrité des données** : Vérification par checksum SHA256 pour les transferts
- 🔄 **Travail collaboratif** : Transfert de projets entre utilisateurs et environnements
- 📊 **Métadonnées enrichies** : Informations de création, comptes et description dans les fichiers
- 🎯 **Restauration d'état** : Préservation complète de l'étape en cours et des corrections manuelles
- 🛡️ **Validation robuste** : Format de fichier et intégrité vérifiés avant chargement

### v1.2.0
- 🔄 **Synchronisation CNCJ** : Script automatique pour synchroniser la colonne `isCNCJ` dans les comptes PCG
- 📊 **Vérification intégrée** : Scripts de validation pour assurer la cohérence des données
- 🎯 **Mise à jour ciblée** : 73 comptes CNCJ synchronisés avec succès (97.3% de couverture)
- 📋 **Documentation technique** : Script `update_cncj_accounts.py` pour maintenance future

### v1.1.0
- ✨ **Import de corrections** : Glisser-déposer de fichiers CSV avec aperçu
- 🔍 **Recherche combinée** : Matching par numéro de compte ET titre
- 🎨 **Coloration des résultats** : Vert (uniques), Rouge (doublons), Gris (non trouvés)
- 📊 **Vérification de doublons** : Détection visuelle des codes de remplacement
- 🔄 **Workflow d'aperçu** : Application sélective des corrections
- 📍 **Export repositionné** : Bouton "Exporter les doublons" entre sections
- 🧩 **Composants modulaires** : DropZone et useDragAndDrop réutilisables
- 🛠️ **Refactoring technique** : Code partagé et architecture améliorée

### v1.0.0
- Import et parsing CSV multi-formats
- Détection de doublons
- Comparaison avec références CNCJ
- Affichage en deux colonnes (numéro + titre)
- Export JSON des résultats
- Interface responsive avec Tailwind CSS

## 🔧 Maintenance des données

### Synchronisation des comptes CNCJ

Un script Python est disponible pour maintenir la synchronisation entre les comptes CNCJ et le fichier PCG :

```bash
# Exécuter la synchronisation
python update_cncj_accounts.py

# Vérifier la synchronisation
python -c "
import csv
# [script de vérification intégré]
"
```

#### Fichiers concernés
- `prod-data/Comptes_CNCJ.csv` - Référence des comptes CNCJ
- `prod-data/Comptes_PCG_CNCJ.csv` - Fichier PCG avec colonne `isCNCJ`
- `update_cncj_accounts.py` - Script de synchronisation

#### Statistiques actuelles
- **75 comptes CNCJ** définis dans la référence
- **73 comptes** synchronisés dans PCG (97.3%)
- **2 comptes** manquants : 1081000, 1082000

#### Procédure de mise à jour
1. Mettre à jour `Comptes_CNCJ.csv` avec les nouveaux comptes
2. Exécuter `python update_cncj_accounts.py`
3. Vérifier la synchronisation avec le script de validation
4. Documenter les modifications dans le changelog
