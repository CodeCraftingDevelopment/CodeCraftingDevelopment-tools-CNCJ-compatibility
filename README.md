# 🏦 Compte Processor

Outil de traitement et comparaison de comptes comptables clients et CNCJ avec interface web moderne.

## 📋 Vue d'ensemble

Compte Processor est une application web React/TypeScript qui permet de :
- Importer des fichiers CSV de comptes clients et CNCJ
- Détecter automatiquement les doublons dans les comptes clients
- Comparer les comptes clients avec les références CNCJ
- Importer et gérer des corrections avec aperçu avant application
- Exporter les résultats de traitement au format JSON
- Afficher les comptes avec numéros et titres descriptifs
- **Sauvegarder et charger des projets** complets pour le travail collaboratif

## ✨ Fonctionnalités

- **Import CSV** : Support de plusieurs formats de fichiers CSV
- **Détection de doublons** : Identification automatique des comptes en double
- **Comparaison CNCJ** : Matching des comptes clients avec les références CNCJ
- **Import de corrections** : Glisser-déposer de fichiers CSV avec aperçu avant application
- **Recherche combinée** : Matching des corrections par numéro de compte ET titre
- **Vérification de doublons** : Détection visuelle des codes de remplacement en double
- **Coloration des résultats** : Vert (codes uniques), Rouge (doublons), Gris (non trouvés)
- **Export des doublons** : Export CSV des doublons avec codes de remplacement
- **Export des résultats** : Téléchargement des résultats au format JSON
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
3. **Voir les résultats** : L'application traite automatiquement les données et affiche :
    - ✅ Comptes avec correspondance CNCJ
    - ⚠️ Doublons détectés
    - ❌ Comptes sans correspondance CNCJ
4. **Importer des corrections** : Glissez-déposez un fichier CSV de corrections dans la zone prévue
5. **Vérifier les doublons** : Consultez l'aperçu coloré (vert/rouge/gris) des codes
6. **Appliquer les corrections** : Cliquez sur "Appliquer les codes uniques" pour valider
7. **Exporter les résultats** : Utilisez les boutons d'export selon vos besoins
8. **Sauvegarder le projet** : Cliquez sur "💾 Sauvegarder le projet" pour conserver votre travail

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
- **Correspondances CNCJ** : Comptes clients trouvés dans la référence CNCJ
- **Sans correspondance** : Comptes clients non présents dans CNCJ
- **Codes uniques applicables** : Corrections qui peuvent être appliquées sans conflit
- **Codes en doublon** : Corrections qui existent déjà dans le système

## 🏗️ Architecture technique

### Stack technique

- **Frontend** : React 18 avec TypeScript
- **Build tool** : Vite
- **Styling** : Tailwind CSS
- **CSV Parsing** : PapaParse
- **State management** : React useReducer
- **Development** : ESLint, TypeScript

### Structure des dossiers

```
src/
├── components/          # Composants React
│   ├── FileUploader.tsx    # Composant d'upload de fichiers
│   ├── ResultsDisplay.tsx  # Affichage des résultats
│   └── DropZone.tsx        # Composant de glisser-déposer
├── hooks/              # Hooks React personnalisés
│   └── useDragAndDrop.ts   # Hook de gestion du glisser-déposer
├── types/              # Définitions TypeScript
│   └── accounts.ts         # Interfaces Account, ProcessingResult
├── utils/              # Utilitaires et logique métier
│   ├── accountUtils.ts     # Parsing CSV, traitement des comptes
│   └── fileUtils.ts        # Utilitaires de formatage de fichiers
├── App.tsx             # Composant principal
├── main.tsx            # Point d'entrée
└── index.css           # Styles globaux
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
  | { type: 'SET_RESULT'; payload: ProcessingResult | null }
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
