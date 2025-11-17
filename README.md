# 🏦 Compte Processor

Outil de traitement et comparaison de comptes comptables clients et CNCJ avec interface web moderne.

## 📋 Vue d'ensemble

Compte Processor est une application web React/TypeScript qui permet de :
- Importer des fichiers CSV de comptes clients et CNCJ
- Détecter automatiquement les doublons dans les comptes clients
- Comparer les comptes clients avec les références CNCJ
- Exporter les résultats de traitement au format JSON
- Afficher les comptes avec numéros et titres descriptifs

## ✨ Fonctionnalités

- **Import CSV** : Support de plusieurs formats de fichiers CSV
- **Détection de doublons** : Identification automatique des comptes en double
- **Comparaison CNCJ** : Matching des comptes clients avec les références CNCJ
- **Affichage en deux colonnes** : Numéro de compte + titre descriptif
- **Export des résultats** : Téléchargement des résultats au format JSON
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

**Format tableau (recommandé)**
```csv
12345,Compte caisse
67890,Banque principale
```

**Format objet avec clés nommées**
```csv
account,title
12345,Compte caisse
67890,Banque principale
```

**Format générique (premières colonnes)**
```csv
12345,Compte caisse
67890,Banque principale
```

**Format à colonne unique (clients uniquement)**
```csv
12345
67890
```
*Note : La colonne titre est optionnelle. Si absente, "Sans titre" sera affiché.*

#### Fichier CNCJ (numéros de comptes uniquement)
```csv
numero
12345
67890
22222
```

### Flux d'utilisation

1. **Charger le fichier clients** : Cliquez sur "📋 Fichier des comptes clients" et sélectionnez votre CSV
2. **Charger le fichier CNCJ** : Cliquez sur "🏛️ Fichier des comptes CNCJ" et sélectionnez votre CSV
3. **Voir les résultats** : L'application traite automatiquement les données et affiche :
   - ✅ Comptes avec correspondance CNCJ
   - ⚠️ Doublons détectés
   - ❌ Comptes sans correspondance CNCJ
4. **Exporter les résultats** : Cliquez sur "📥 Exporter les résultats" pour télécharger le JSON

### Structure des résultats exportés

Le fichier JSON exporté contient la structure suivante :
```json
{
  "duplicates": ["12345", "67890"],
  "matches": ["11111", "22222"],
  "unmatched": ["33333", "44444"]
}
```

### Notes importantes
- **Ordre d'upload** : L'ordre des fichiers n'a pas d'importance
- **Headers CSV** : Les headers sont automatiquement détectés et ignorés
- **Colonne titre** : Uniquement utilisée pour les fichiers clients, ignorée pour CNCJ

### Interprétation des résultats

- **Comptes clients uniques** : Nombre de comptes valides après déduplication
- **Doublons détectés** : Comptes apparaissant plusieurs fois dans le fichier client
- **Correspondances CNCJ** : Comptes clients trouvés dans la référence CNCJ
- **Sans correspondance** : Comptes clients non présents dans CNCJ

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
│   └── ResultsDisplay.tsx  # Affichage des résultats
├── types/              # Définitions TypeScript
│   └── accounts.ts         # Interfaces Account, ProcessingResult
├── utils/              # Utilitaires et logique métier
│   └── accountUtils.ts     # Parsing CSV, traitement des comptes
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
  source: 'client' | 'cncj';
}

interface ProcessingResult {
  duplicates: Account[];
  uniqueClients: Account[];
  matches: Account[];
  unmatchedClients: Account[];
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
- Permet l'export des résultats
- Gère les états de chargement

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

#### Performance avec gros fichiers
- **Cause** : Fichiers de plus de 10 000 lignes peuvent ralentir le navigateur
- **Solution** : Diviser les gros fichiers en plusieurs parties plus petites
- **Conseil** : Vider le cache du navigateur si les performances se dégradent

### Performance

- Pour les gros fichiers (>10 000 lignes), l'application peut prendre quelques secondes
- L'interface reste responsive pendant le traitement
- Les résultats sont limités en hauteur pour éviter les problèmes de performance

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

### v1.0.0
- Import et parsing CSV multi-formats
- Détection de doublons
- Comparaison avec références CNCJ
- Affichage en deux colonnes (numéro + titre)
- Export JSON des résultats
- Interface responsive avec Tailwind CSS

## 🤝 Contribuer

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/nouvelle-fonctionnalite`)
3. Commit les changements (`git commit -am 'Ajout nouvelle fonctionnalité'`)
4. Push vers la branche (`git push origin feature/nouvelle-fonctionnalite`)
5. Créer une Pull Request

## 📄 Licence

Ce projet est sous licence privée.