# 📝 Changelog – Refactoring du système d'étapes

## [3.0.0] - 2026-07-08

### 🧭 **Vérification Fichier FEC — refonte en parcours de contrôles + préparation Axelor**

#### Added
- **Parcours à étapes fixes** : la barre de progression du haut affiche systématiquement **17 étapes** — 📁 Chargement · **15 contrôles** · 📊 Synthèse — matérialisées par des pastilles numérotées (vertes = franchies, bleue = en cours). La liste des contrôles est figée dans `FEC_CONTROLS` (`fecValidation.ts`) et un test garde-fou vérifie qu'elle reste alignée sur les contrôles réellement produits.
- **Étape Synthèse dédiée** (dernière étape) : statut global, statistiques et exports (FEC corrigé, FEC séparateur `;`, rapport Excel) ne s'affichent plus en permanence mais uniquement en fin de parcours.
- **Contrôle « Séparateur décimal des montants »** (`format-separateur-decimal`) : détecte les virgules décimales (l'import Axelor via `BigDecimal` exige le point) + correction en mémoire (`buildDecimalCorrectedFec`).
- **Contrôle « Séparateur de colonnes (« ; » attendu) »** (`format-separateur-colonnes`) : erreur si le FEC n'est pas en `;` + correction en mémoire (`convertFecToSemicolon`).
- **Contrôle « Espaces superflus dans les colonnes »** (`format-espaces`, avertissement) : détecte le remplissage à largeur fixe (exports DIVALTO) + correction « détrim de chaque colonne » (`buildTrimmedFec`).

#### Changed
- **Correction devise** (`buildCorrectedFec`) : écrit désormais `Montantdevise` avec un **point décimal** (au lieu d'une virgule) pour ne plus entrer en conflit avec le contrôle « séparateur décimal ». Les corrections devise / décimal / séparateur / trim se composent donc dans n'importe quel ordre → FEC conforme au bout de la chaîne.
- **Parsing des correspondances** (`parseAccountCorrespondences`) rendu tolérant aux deux en-têtes : `original_client_code/final_code` et `accountingbridgeAccount/axelorAccount.code`.
- Suffixe du FEC téléchargé : `-corrige`.

#### Tests
- **125 tests** (dont un test de chaîne complète `convertir « ; » → devise → décimal → détrim` ⇒ contrôles Axelor OK + global conforme, et le garde-fou `FEC_CONTROLS`).

#### 📋 Fichiers concernés
- `src/utils/fecValidation.ts`, `src/components/FecVerification.tsx`, `src/test/fecValidation.test.ts`

---

## [2.5.1] - 2026-07-08

### 🐛 **Correction : périmètre de l'export « accounting bridge »**

#### Fixed
- **Filtrage des correspondances** : l'export `accounting-bridge-account-mapping.csv` ne conserve désormais que les correspondances dont le **code cible 7 chiffres** est présent soit dans l'`account_account` généré (comptes PCG + comptes clients « à créer » filtrés FEC), soit dans les cibles du fichier SVV. Les comptes du plan client sans écriture FEC et sans compte cible réel ne « fuient » plus dans le mappage (ex. `79100000 → 7910000`).
- **Comptes-vues** : correction d'un faux positif où les comptes-vues courts (`15`, `47`, `4081`…) étaient normalisés à 7 chiffres (`1500000`, `4700000`…) et faisaient passer à tort des cibles inexistantes. Le périmètre autorisé est désormais construit à partir du code **brut** de `account_account`, exactement tel qu'il y est écrit.
- Les correspondances **SVV restent garanties** (inconditionnelles).

#### 📊 Impact (jeu LANDES ENCHERES)
- Bridge : **294 → 177** correspondances (117 fuites retirées) ; **57 correspondances SVV** conservées ; **0 cible orpheline** (les 154 cibles distinctes existent toutes en base).

#### 📋 Fichiers concernés
- `src/steps/Step8MetadataCompletion.tsx`

---

## [2.5.0] - 2026-07-08

### 🏢 **Code société + export « accounting bridge »**

#### Added
- **Champ « Code société »** (`companyCode`) dans l'en-tête, propagé dans l'état, la persistance projet (`.ccp`) et l'étape 8 (`CompanyCodeInput`).

#### Changed
- **Export des correspondances (étape 8)** : passage au format **« accounting bridge »** — 6 colonnes `accountingbridgeAccount;axelorAccount.code;company.code;auxAccount.partnerSeq;pieceRef;active` (séparateur `;`, CRLF), fichier renommé `correspondances-comptes.csv` → **`accounting-bridge-account-mapping.csv`**. Le tri se fait par code source croissant ; toute correspondance SVV sans compte client est incluse.
- **Export PCG complet** renommé `comptes-pcg-complet.csv` → **`account_account.csv`**.
- **Libellé** « Nom du client » → « Nom du projet » (`ClientNameInput`).

### 🔎 **Vérification Fichier FEC — parcours complet + corrections Axelor**

#### Added
- **Parcours en 2 étapes** (Chargement → Rapport) pour l'écran « Vérification Fichier FEC », aligné visuellement sur le flux « Integration PCG » (barre de progression, cartes, modale d'aide `FecStepsInfoModal`).
- **Contrôle devise Axelor** (`coherence-devise`) : chaque ligne doit avoir `Idevise = « EUR »` et `Montantdevise = valeur absolue du Débit (si > 0) sinon du Crédit`.
- **Correction devise en mémoire** (`buildCorrectedFec`) : renseigne automatiquement `Idevise`/`Montantdevise`, recalcule le rapport et permet de télécharger le FEC corrigé.
- **Table de correspondances optionnelle** (`parseAccountCorrespondences`) : les comptes déjà mappés par une intégration PCG antérieure sont reconnus comme conformes même s'ils sont absents du PCG chargé.
- **Export du rapport au format Excel** (`.xlsx`, 2 feuilles Synthèse + Anomalies, statuts colorés) via `xlsx-js-style` ; export CSV également disponible (`buildFecReportCsv`).
- **FEC optionnel dans le flux « Integration PCG »** : un FEC peut compléter la liste des comptes clients à l'étape 1 (`FecAccountsUploader`, flag `Account.fromFec`). À l'étape 8, les comptes à créer sont restreints aux comptes réellement présents dans le FEC.

#### Changed
- **Suggestion de compte PCG** (`findNearestPcgCode`) : privilégie désormais le compte parent/générique (racines à 4 puis 3 chiffres) au lieu du plus proche numériquement, avec affichage du libellé.
- **Décodage FEC** : lecture UTF-8 avec repli automatique Windows-1252 (accents des FEC ANSI).
- **Marquage CNCJ à l'étape 8** : un compte n'est marqué `isCncj=true` que si son code final exact figure dans la liste CNCJ de base (fin de la dérivation par code normalisé qui marquait à tort les comptes-vues/radicaux).
- **importId des comptes créés** : décalage `CLIENTxxxx` pour éviter les collisions avec un PCG déjà intégré.
- **Renommage `isCNCJ` → `isCncj`** dans tout le code (casse Axelor correcte).

#### Removed
- **Contrôle « lettrage sans DateLet »** : supprimé car non conforme à la norme FEC A47 A-1 (`EcritureLet` et `DateLet` sont optionnels et indépendants). Le format de `DateLet`, quand elle est renseignée, reste vérifié.

#### 📋 Fichiers concernés
- 🆕 `src/utils/fecReportExcel.ts`, `src/components/FecAccountsUploader.tsx`, `src/components/FecStepsInfoModal.tsx`, `src/components/CompanyCodeInput.tsx`
- 🆕 tests : `src/test/fecReportExcel.test.ts`, ajouts dans `src/test/fecValidation.test.ts` (121 tests OK)
- `src/utils/fecValidation.ts`, `src/components/FecVerification.tsx`, `src/components/AppHeader.tsx`, `src/components/ClientNameInput.tsx`, `src/components/ProjectPersistence.tsx`, `src/App.tsx`, `src/steps/Step8MetadataCompletion.tsx`, `src/steps/Step1FileUpload.tsx`, `src/components/NormalizationStep.tsx`, `src/types/accounts.ts`, `src/reducers/appReducer.ts`, `src/utils/accountUtils.ts`, `src/utils/projectPersistence.ts`
- 🆕 dépendance : `xlsx-js-style ^1.2.0`

---

## [2.2.1] - 2026-04-14

### 🐛 **Correction : exclusion des comptes vues de l'héritage PCG**
- **Corrigé** : Les comptes à 3-4 caractères (comptes vues) ne sont plus utilisés comme référence pour l'héritage de métadonnées PCG
- **Règle métier** : Ne pas descendre en dessous de 5 digits pour la recherche du compte PCG le plus proche
- **Impact** : Conditions `>= 4` remplacées par `>= 5` dans `accountMatchingUtils.ts` et `Step8MetadataCompletion.tsx`

## [2.2.0] - 2025-12-04

### 🎯 **Système de nommage intelligent et persistant**

#### ✨ **Génération automatique des noms de fichiers**
- **Format intelligent** : `compte-processor-[nom-client]-[date].ccp`
- **Exemples** : `compte-processor-dupont-2025-12-04.ccp`
- **Nettoyage automatique** : Caractères spéciaux remplacés par des tirets

#### 💾 **Persistance complète des noms de fichiers**
- Le nom de fichier est **sauvegardé dans le projet**
- Au chargement, le nom est **restauré automatiquement**
- L'utilisateur peut **modifier manuellement** le nom
- Le nouveau nom est **resauvegardé** à chaque modification

#### 🔄 **Workflow intelligent**
1. **Première saisie** : Nom généré automatiquement avec le client
2. **Modification manuelle** : Nom personnalisé sauvegardé
3. **Chargement** : Nom personnalisé restauré

#### 🔧 **Améliorations techniques**
- 🆕 `src/utils/fileNameGenerator.ts` : Utilitaires de génération de nom
- 🆕 Champ `fileName` dans `AppState` et `ProjectFile`
- 🆕 Action `SET_FILE_NAME` dans le reducer
- ✅ **File System Access API** : Nom choisi dans boîte de dialogue sauvegardé
- ✅ **Fallback classique** : Nom saisi dans l'input sauvegardé
- ✅ **Projets existants** : Migration automatique

#### 🐛 **Corrections de bugs**
- **Corrigé** : Le nom de fichier choisi dans la boîte de dialogue Windows n'était pas sauvegardé
- **Corrigé** : Le nom de fichier modifié manuellement n'était pas persisté dans le projet

#### 📋 **Fichiers modifiés**
- `src/types/accounts.ts` : Ajout de `fileName` dans `AppState` et `AppAction`
- `src/App.tsx` : Gestion de `SET_FILE_NAME` dans le reducer
- `src/components/ProjectPersistence.tsx` : Logique de nommage intelligent
- `src/components/ClientNameInput.tsx` : Composant de saisie du nom du client
- `src/utils/projectPersistence.ts` : Sauvegarde/chargement du nom de fichier
- `src/utils/fileNameGenerator.ts` : Utilitaires de génération (nouveau)

---

## [2.1.1] - 2025-12-04

### Persistance complète des suggestions (fix critique)

#### Problème résolu
- Les détails des calculs de suggestions n'étaient pas sauvegardés
- Après chargement, le modal perdait les informations de calcul originales
- L'export CSV ne pouvait pas restaurer les détails des suggestions

#### Solution implémentée
- **Sauvegarde complète** : ajout des champs `initialSuggestions` et `initialCncjSuggestions`
- **Restauration fidèle** : utilisation prioritaire des suggestions sauvegardées
- **Compatibilité ascendante** : fichiers anciens toujours chargeables
- **Validation robuste** : vérification des nouveaux champs avec fallback

#### Fichiers modifiés
- `src/utils/projectPersistence.ts` - Structure de sauvegarde étendue
- `src/types/accounts.ts` - Nouveaux champs dans AppState
- `src/components/ResultsDisplay.tsx` - Priorité aux données sauvegardées
- `src/App.tsx` - Transmission complète des données
- `src/steps/Step6CNCJConflicts.tsx` - Chaîne de props étendue

---

## [2.1.0] - 2025-12-04

### Export combiné des suggestions (Étapes 4 + 6)

#### Fonctionnalité : Vue et export combinés des suggestions
- **Modal de détails des suggestions** : vue complète des calculs de suggestions
  - Case à cocher "Inclure les données de l'étape 4" dans le modal de l'étape 6
  - Légende visuelle en haut : 📋 Doublon (étape 4) / ⚠️ Conflit CNCJ (étape 6)
  - Deux colonnes séparées : **Suggestion Doublon** et **Suggestion CNCJ**
  - Colonne **Code final** : codes validés par l'utilisateur
  - Fond coloré par type : ambre (doublons), rouge (CNCJ)
- **Export CSV combiné** : fichier unique avec toutes les suggestions triées
  - Colonnes : code original, code 7 chiffres, titre, suggestion doublon, suggestion CNCJ, code final, détail calcul, source blocage

#### Tri amélioré
- Tri principal par code 7 chiffres
- Tri secondaire par code original (8 chiffres) si codes 7 chiffres identiques

#### Détails des calculs enrichis
- Affichage de la source des codes bloqués : CNCJ, Client, Doublon
- Badge coloré indiquant la source du blocage

#### Fichiers modifiés
- `src/components/ResultsDisplay.tsx` - Modal combiné, export CSV, tri amélioré
- `src/components/DuplicateRow.tsx` - Badges et corrections ESLint
- `src/steps/Step6CNCJConflicts.tsx` - Passage des props étape 4
- `src/App.tsx` - Calcul et transmission des suggestions étape 4

---

## 2025-12-04

### Ajouts du 2025-12-04 (Suggestions automatiques - Étape 6)

#### Fonctionnalité : Suggestions automatiques pour les conflits CNCJ (Étape 6)
- **Extension des suggestions à l'étape 6** : même logique que l'étape 4
  - Propose un code +1 en vérifiant qu'il n'existe pas dans les codes PCG/CNCJ
  - Si le code existe, essaie +1 jusqu'à trouver un code libre
  - Ne dépasse jamais la dizaine (ex: 4457115 → 4457116, 4457117... max 4457119)
- **Bouton "💡 [code]"** : suggestion individuelle pour chaque conflit CNCJ
- **Bouton "✨ Valider les suggestions"** : applique toutes les suggestions en un clic (à droite de "Exporter les conflits")

#### Avertissements précis pour les erreurs
- **"⚠️ Code finit par 9"** (rouge) : quand le code original se termine par 9, aucune suggestion possible
- **"⚠️ Plage XXXXXXX-XXXXXXX saturée"** (orange) : quand tous les codes de la dizaine sont déjà utilisés
  - Tooltip explicatif : "Tous les codes de X à Y sont déjà utilisés. Saisissez manuellement un code hors de cette plage."

#### Statuts dynamiques pour les conflits CNCJ
Remplacement du statut fixe "Erreur de correspondance CNCJ" par des statuts contextuels :
| État | Badge | Couleur |
|------|-------|---------|
| Code valide saisi | ✅ Code de remplacement valide | Vert |
| Validation forcée | 🔒 Validation forcée | Bleu |
| Code saisi existe dans CNCJ | ⚠️ Code saisi existe dans CNCJ | Rouge |
| Code saisi en doublon | ⚠️ Code saisi en doublon | Rouge |
| Aucun code saisi | ⏳ En attente de correction | Orange |

#### Amélioration UX
- La case "Forcer la validation" n'apparaît plus si un code valide est saisi

#### Fichiers modifiés
- `src/components/DuplicateRow.tsx` - Ajout des suggestions, avertissements et statuts dynamiques
- `src/components/ResultsDisplay.tsx` - Calcul des suggestions CNCJ et bouton global

---

## 2025-11-20

### Ajouts du 2025-11-20 (Suggestions automatiques - Étape 4)

#### Fonctionnalité : Suggestion automatique de codes pour les doublons
- **Algorithme de suggestion** : calcul automatique des codes de remplacement pour les doublons
  - Le premier doublon garde son code original (ex: 20000→20000, 20001)
  - Incrémente les suivants de 1 sans jamais passer à la dizaine supérieure (ex: 140→140, 141, 142...149 max)
  - Codes finissant par 9 : affichage d'un badge d'erreur (⚠️ Erreur)
  - Évite automatiquement les doublons en vérifiant tous les codes existants
- **Boutons de suggestion individuels** : chaque doublon affiche un bouton "💡 [code]" pour appliquer la suggestion
- **Bouton "Valider les suggestions"** : applique toutes les suggestions disponibles en un clic
  - Visible uniquement à l'étape 4 (résolution des doublons)
  - État dynamique (actif/désactivé selon disponibilité)
  - Tooltip indiquant le nombre de suggestions à appliquer
- **Affichage conditionnel** : les suggestions n'apparaissent que pour les champs vides

#### Fichiers créés
- `src/utils/codeSuggestions.ts` - Logique de calcul des suggestions
- `test-data/clients-test-suggestions.csv` - Fichier de test pour les suggestions
- `test-data/TEST-SUGGESTIONS.md` - Documentation complète des tests

#### Fichiers modifiés
- `src/components/DuplicateRow.tsx` - Ajout des boutons de suggestion et badge d'erreur
- `src/components/ResultsDisplay.tsx` - Intégration du calcul de suggestions et bouton global

#### Règles implémentées
1. **Premier doublon garde son code** : minimise les changements en gardant le code original pour le premier doublon
2. **Incrémentation limitée** : +1 par doublon sans dépasser la dizaine
3. **Détection d'erreur** : codes finissant par 9 marqués comme non-suggérables
4. **Évitement des doublons** : vérification complète des codes existants et suggérés
5. **Application sélective** : ignore les champs déjà remplis et les erreurs

---

### Ajouts du 2025-11-20
- ajout d'une fenêtre modale d'aide détaillant le déroulé des étapes, accessible depuis la barre de progression ;
- mise à jour de la barre de progression pour afficher un bouton « ℹ️ Aide étapes » ;
- harmonisation de la terminologie CNCJ en parlant de « corrections » plutôt que « suggestions ».

#### Améliorations import CSV
- comptage des lignes utiles vs. lignes ignorées lors du parsing des fichiers clients/CNCJ ;
- remontée d'alertes UI lorsque les lignes importées ne correspondent pas aux lignes détectées ;
- affichage des statistiques (total, importées, ignorées) dans la carte de fichier ;
- ajout d'une fenêtre modale détaillant les lignes rejetées avec export CSV des données invalides.

#### Fichiers concernés
- `src/App.tsx`
- `src/steps/components/ProgressBar.tsx`
- `src/steps/components/StepsInfoModal.tsx`
- `src/components/ResultsDisplay.tsx`
- `src/components/DuplicateRow.tsx`
- `src/steps/Step6CNCJConflicts.tsx`
- `src/steps/StepFinalSummary.tsx`
- `src/utils/stepCleanup.ts`
- `src/types/accounts.ts`
- `src/utils/accountUtils.ts`
- `src/components/FileUploader.tsx`
- `src/components/ImportErrorsModal.tsx`

### Résumé
- refonte de `App.tsx` pour consommer une configuration d'étapes dynamique ;
- ajout d'une configuration centralisée et de composants dédiés au rendu/navigation ;
- création d'un jeu de composants d'étapes spécialisés (chargement, visualisation, doublons, conflits CNCJ, résumé).

---

### Fichiers ajoutés
- `src/config/stepsConfig.ts`
- `src/steps/components/StepRenderer.tsx`
- `src/steps/components/StepNavigation.tsx`
- `src/steps/components/ProgressBar.tsx`
- `src/steps/components/StepContent.tsx`
- `src/steps/Step1FileUpload.tsx`
- `src/steps/Step2MergeVisualization.tsx`
- `src/steps/Step4DuplicatesResolution.tsx`
- `src/steps/Step5ReviewCorrections.tsx`
- `src/steps/Step6CNCJConflicts.tsx`
- `src/steps/StepFinalSummary.tsx`
- `REFACTORING.md`

### Fichiers modifiés
- `src/App.tsx`

---

### Points techniques clés
- **Configuration des étapes** : chaque étape est décrite via `StepConfig` (titre, icône, badge, validation `canProceed`).
- **Rendu des étapes** : `StepRenderer` applique un gabarit commun (badge, titre, conteneur) et affiche le contenu spécifique.
- **Navigation** : `StepNavigation` gère les boutons « Retour »/« Suivant » en respectant la validation de l'étape courante.
- **Progression** : `ProgressBar` affiche l'état global et permet de cliquer pour naviguer.
- **Composants utilitaires** : `StepContent.tsx` regroupe les éléments de présentation récurrents (statistiques, légendes, messages vides…).

#### Extrait – configuration d'étape
```ts
export const STEPS_CONFIG: StepConfig[] = [
  {
    id: 'step4',
    order: 4,
    title: 'Vérification des doublons comptes clients',
    icon: '📋',
    description: 'Résolution des doublons dans les comptes clients',
    badge: 'Step 4',
    badgeColor: 'green',
    canProceed: (state) => state.result?.duplicates.every((account) => {
      const replacement = state.replacementCodes[account.id]?.trim();
      return Boolean(replacement) && replacement !== account.number;
    }) ?? true
  },
  // …
];
```

#### Extrait – rendu dans `App.tsx`
```tsx
{currentStepConfig?.id === 'step4' && (
  <StepRenderer step={currentStepConfig} isActive>
    <Step4DuplicatesResolution
      result={state.result}
      loading={state.loading}
      replacementCodes={state.replacementCodes}
      onReplacementCodeChange={handleReplacementCodeChange}
    />
    <StepNavigation
      currentStep={currentStepConfig}
      previousStep={previousStepConfig}
      nextStep={nextStepConfig}
      canProceed={allDuplicatesResolved}
      onNext={handleDuplicatesNext}
      onPrevious={handleNavigatePrevious}
    />
  </StepRenderer>
)}
```

---

### Tests effectués
- `npm run build`
- `npm run dev`

---

### Points d'attention
- la couleur des badges est actuellement statique (`badgeColor: 'green'`) ; adapter si une coloration dynamique est requise ;
- `StepNavigation` affiche le bouton « Suivant » uniquement si `canProceed` retourne `true` ;
- `StepFinalSummary` se base sur l'état global (corrections, filtres) : vérifier les dépendances si la structure du state évolue.

---

### Suggestions de suivi
- ajouter des tests unitaires pour `stepsConfig` et les composants de navigation ;
- prévoir un mécanisme optionnel de persistance (ex. localStorage) si la navigation doit survivre à un rechargement ;
- documenter dans le README le nouveau flux utilisateur lorsque les validations finales seront stabilisées.

---

## 2025-11-22

### Ajouts du 2025-11-22 (Synchronisation des comptes CNCJ)

#### Fonctionnalité : Synchronisation automatique de la colonne isCNCJ
- **Script de synchronisation** : Création du script `update_cncj_accounts.py` pour mettre à jour automatiquement la colonne `isCNCJ` dans `Comptes_PCG_CNCJ.csv`
- **Comparaison des comptes** : Le script compare automatiquement les comptes présents dans `Comptes_CNCJ.csv` avec ceux du fichier PCG
- **Mise à jour ciblée** : Seuls les comptes existant dans les deux fichiers sont marqués comme CNCJ
- **Vérification intégrée** : Scripts de vérification pour s'assurer que la synchronisation est correcte
- **Gestion des erreurs** : Détection des comptes CNCJ manquants dans le fichier PCG

#### Fichiers créés
- `update_cncj_accounts.py` - Script principal de synchronisation des comptes CNCJ

#### Fichiers modifiés
- `prod-data/Comptes_PCG_CNCJ.csv` - Mise à jour de la colonne `isCNCJ` pour 73 comptes

#### Statistiques de synchronisation
- **75 comptes CNCJ** définis dans le fichier de référence
- **73 comptes** synchronisés avec succès (97.3%)
- **2 comptes** non présents dans le fichier PCG (1081000, 1082000)
- **1 649 comptes** maintenus à `false` (non CNCJ)

#### Scripts de vérification
- Vérification de la présence des comptes CNCJ dans le fichier PCG
- Validation que tous les comptes CNCJ sont bien marqués `true`
- Confirmation que les comptes non CNCJ restent `false`

---

*Dernière mise à jour : 04/12/2025*
