# 🧪 Guide de Test pour l'Automation IA

Ce document explique comment tester l'application Compte Processor avec des outils d'automation comme Playwright ou Puppeteer.

## 🎯 Objectif

Rendre l'application facilement testable par une IA avec des sélecteurs stables et des utilitaires de test.

## 📋 Fonctionnalités de Testabilité

### 1. Data-testid Uniques

Tous les éléments interactifs ont des `data-testid` prévisibles :

#### FileUploader Components
- **Conteneurs** : `data-testid="file-uploader-{source}"`
  - `file-uploader-client`
  - `file-uploader-general` 
  - `file-uploader-cncj`

- **Inputs de fichiers** : `data-testid="file-input-{source}"`
  - `file-input-client`
  - `file-input-general`
  - `file-input-cncj`

- **Zones de drag-drop** : `data-testid="dropzone-{source}"`
  - `dropzone-client`
  - `dropzone-general`
  - `dropzone-cncj`

- **Boutons d'action** : `data-testid="{action}-{source}"`
  - `download-template-client`
  - `clear-file-client`
  - `view-errors-client`
  - `preview-data-client`
  - `change-file-client`

### 2. États d'Upload

Les DropZone ont un attribut `data-upload-state` qui suit l'état :
- `idle` : Pas de fichier sélectionné
- `loading` : Fichier en cours de traitement
- `success` : Fichier chargé avec succès
- `warning` : Chargé avec avertissements
- `error` : Erreur de chargement

### 3. Inputs Accessibles

Les inputs de fichiers utilisent `className="sr-only"` au lieu de `hidden` :
- **Invisibles** pour les utilisateurs
- **Accessibles** pour les outils d'automation
- **Compatibles** avec `setInputFiles()` de Playwright

## 🛠️ Utilitaires de Test

### Window.__TEST_HELPERS__

En mode développement, des utilitaires sont disponibles via `window.__TEST_HELPERS__` :

```javascript
// Upload direct par source
await window.__TEST_HELPERS__.uploadFile('client', csvData, 'test-file.csv');

// Récupérer les éléments
const input = window.__TEST_HELPERS__.getFileInput('client');
const dropzone = window.__TEST_HELPERS__.getDropZone('client');

// Vérifier l'état
const state = window.__TEST_HELPERS__.getUploadState('client');
await window.__TEST_HELPERS__.waitForUploadState('client', 'success');

// Simulation sans DOM
const accounts = await window.__TEST_HELPERS__.simulateFileUpload('client', csvData);

// Nettoyer
window.__TEST_HELPERS__.clearAllFiles();

// Données de test pré-définies
const testData = window.__TEST_HELPERS__.getTestData();
```

## 📝 Exemples de Test

### Playwright

```javascript
// Upload de fichiers avec Playwright
await page.setInputFiles('[data-testid="file-input-client"]', 'clients-test.csv');
await page.setInputFiles('[data-testid="file-input-general"]', 'general-accounts-test.csv');
await page.setInputFiles('[data-testid="file-input-cncj"]', 'cncj-test.csv');

// Attendre le succès
await page.waitForSelector('[data-upload-state="success"]');

// Vérifier l'état
const clientState = await page.getAttribute('[data-testid="dropzone-client"]', 'data-upload-state');
console.log('Client upload state:', clientState);

// Utiliser les helpers JavaScript
await page.evaluate(async () => {
  const helpers = window.__TEST_HELPERS__;
  const testData = helpers.getTestData();
  
  await helpers.uploadFile('client', testData.clientsTest);
  await helpers.waitForUploadState('client', 'success');
});

// Cliquer sur les boutons
await page.click('[data-testid="preview-data-client"]');
await page.click('[data-testid="change-file-client"]');
```

### Puppeteer

```javascript
// Upload de fichiers avec Puppeteer
await page.setInputFiles('[data-testid="file-input-client"]', 'clients-test.csv');

// Vérifier l'état
const state = await page.$eval('[data-testid="dropzone-client"]', el => el.dataset.uploadState);

// Utiliser les helpers
await page.evaluate(async () => {
  const helpers = window.__TEST_HELPERS__;
  await helpers.clearAllFiles();
  const testData = helpers.getTestData();
  await helpers.uploadFile('general', testData.generalTest);
});
```

## 🗂️ Structure des Fichiers de Test

Les fichiers de test sont dans `test-data/` :

- `clients-test.csv` : 20 comptes avec correspondances, doublons et non-correspondances
- `general-accounts-test.csv` : 52 comptes du plan comptable général
- `cncj-test.csv` : 59 comptes CNCJ avec correspondances

## 🔄 Workflow de Test Complet

```javascript
// 1. Naviguer vers l'application
await page.goto('http://localhost:5173');

// 2. Upload des trois fichiers
await page.setInputFiles('[data-testid="file-input-client"]', 'test-data/clients-test.csv');
await page.setInputFiles('[data-testid="file-input-general"]', 'test-data/general-accounts-test.csv');
await page.setInputFiles('[data-testid="file-input-cncj"]', 'test-data/cncj-test.csv');

// 3. Attendre que tous les uploads soient terminés
await page.waitForSelector('[data-testid="dropzone-client"][data-upload-state="success"]');
await page.waitForSelector('[data-testid="dropzone-general"][data-upload-state="success"]');
await page.waitForSelector('[data-testid="dropzone-cncj"][data-upload-state="success"]');

// 4. Passer à l'étape suivante
await page.click('[data-testid="step-next"]');

// 5. Continuer les tests des autres étapes...
```

## 🐛 Dépannage

### Problèmes Communs

1. **Input non trouvé** : Vérifiez que `data-testid` est correctement orthographié
2. **Upload ne fonctionne pas** : Assurez-vous que l'input utilise `sr-only` et non `hidden`
3. **État incorrect** : Utilisez `getUploadState()` pour vérifier l'état actuel

### Debug

```javascript
// Lister tous les data-testid disponibles
await page.evaluate(() => {
  const elements = document.querySelectorAll('[data-testid]');
  console.log('Found data-testid elements:', Array.from(elements).map(el => el.dataset.testid));
});

// Vérifier les helpers de test
console.log('Test helpers available:', await page.evaluate(() => !!window.__TEST_HELPERS__));
```

## 📈 Bonnes Pratiques

1. **Utiliser toujours les data-testid** : Plus stables que les sélecteurs CSS
2. **Attendre les états** : Utilisez `waitForUploadState()` au lieu de `setTimeout`
3. **Nettoyer entre les tests** : Appelez `clearAllFiles()` pour éviter les interférences
4. **Utiliser les données de test** : Les fichiers dans `test-data/` sont optimisés pour les tests

## 🎯 Résultats Attendus

Avec `clients-test.csv` + `general-accounts-test.csv` + `cncj-test.csv` :

- **23 comptes clients** chargés
- **52 comptes généraux** chargés  
- **59 comptes CNCJ** chargés
- **État success** sur toutes les zones d'upload

Cette configuration permet de tester toutes les fonctionnalités de l'application de manière fiable et reproductible.
