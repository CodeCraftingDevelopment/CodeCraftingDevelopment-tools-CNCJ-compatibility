# 💡 Test des suggestions automatiques de codes (Étape 4)

## Fichier de test : `clients-test-suggestions.csv`

Ce fichier permet de tester la nouvelle fonctionnalité de suggestion automatique de codes à l'étape 4 (résolution des doublons).

## 📋 Contenu du fichier

Le fichier contient :
- **3 doublons du code 140** → suggestions attendues : 141, 142, 143
- **2 doublons du code 145** → suggestions attendues : 146, 147
- **2 doublons du code 149** → aucune suggestion (erreur car finit par 9)
- **2 comptes uniques** : 200, 201 → pas de doublons

## ✅ Comportement attendu à l'Étape 4

### Boutons d'action
- **"📥 Exporter les doublons"** : exporte les doublons au format CSV
- **"✨ Valider les suggestions"** : applique automatiquement toutes les suggestions disponibles en un clic

### Pour les doublons de 140 :
- Premier doublon : bouton **"💡 141"**
- Deuxième doublon : bouton **"💡 142"**
- Troisième doublon : bouton **"💡 143"**

### Pour les doublons de 145 :
- Premier doublon : bouton **"💡 146"**
- Deuxième doublon : bouton **"💡 147"**

### Pour les doublons de 149 :
- Premier doublon : badge **"⚠️ Erreur"** (rouge)
- Deuxième doublon : badge **"⚠️ Erreur"** (rouge)
- **Raison** : Les codes se terminant par 9 ne peuvent pas être incrémentés sans passer à la dizaine supérieure

## 🎯 Points de validation

### 1. Affichage des suggestions
- [ ] Les boutons de suggestion apparaissent uniquement quand le champ est vide
- [ ] Les suggestions sont calculées correctement (incrémentation de 1)
- [ ] Les suggestions ne créent jamais de doublons
- [ ] Les suggestions restent dans la même dizaine (ex: 140-149)

### 2. Interaction utilisateur
- [ ] Cliquer sur un bouton "💡 [code]" remplit automatiquement le champ
- [ ] Une fois un code saisi (manuellement ou via suggestion), le bouton disparaît
- [ ] Vider le champ fait réapparaître le bouton de suggestion

### 3. Gestion des erreurs
- [ ] Les codes se terminant par 9 affichent "⚠️ Erreur"
- [ ] Le badge d'erreur est rouge et non cliquable
- [ ] Le tooltip explique pourquoi il n'y a pas de suggestion

### 4. Logique de suggestion
- [ ] Les suggestions évitent les codes déjà utilisés par d'autres comptes
- [ ] Les suggestions évitent les codes déjà saisis dans d'autres doublons
- [ ] Les suggestions sont recalculées si un code de remplacement est modifié

## 🧪 Scénarios de test

### Test 1 : Suggestion simple
1. Charger `clients-test-suggestions.csv` à l'étape 1
2. Aller à l'étape 4
3. Vérifier que 7 doublons sont détectés (3×140 + 2×145 + 2×149)
4. Vérifier les boutons de suggestion pour 140 et 145
5. Vérifier les badges d'erreur pour 149

### Test 2 : Utilisation des suggestions
1. Cliquer sur "💡 141" pour le premier doublon de 140
2. Vérifier que le champ est rempli avec "141"
3. Vérifier que le bouton disparaît
4. Vérifier que la ligne passe au vert (code valide)

### Test 3 : Gestion des doublons de suggestions
1. Saisir manuellement "141" pour le premier doublon de 140
2. Vérifier que le deuxième doublon suggère "142" (pas 141)
3. Cliquer sur "💡 142"
4. Vérifier que le troisième doublon suggère "143"

### Test 4 : Codes se terminant par 9
1. Vérifier que les doublons de 149 affichent "⚠️ Erreur"
2. Vérifier qu'il n'y a pas de bouton cliquable
3. Vérifier que la ligne reste en erreur (rouge)

### Test 5 : Modification manuelle
1. Saisir manuellement un code pour un doublon
2. Effacer le code
3. Vérifier que le bouton de suggestion réapparaît

### Test 6 : Bouton "Valider les suggestions"
1. À l'étape 4, vérifier que le bouton "✨ Valider les suggestions" est visible
2. Vérifier le tooltip indique le nombre de suggestions disponibles
3. Cliquer sur "✨ Valider les suggestions"
4. Vérifier que tous les codes suggérés sont appliqués automatiquement :
   - 140 → 141, 142, 143
   - 145 → 146, 147
   - 149 → reste vide (erreur)
5. Vérifier que le bouton devient désactivé (grisé) après application
6. Vérifier que les lignes passent au vert (codes valides)

## 🔧 Règles implémentées

### Règle 1 : Incrémentation limitée
- Le code suggéré = code original + N (où N = nombre de doublons déjà traités)
- Maximum : dernier chiffre = 9
- Exemple : 140 → 141, 142, ..., 149 (max)

### Règle 2 : Pas de passage à la dizaine supérieure
- 149 → ERREUR (pas de suggestion)
- 199 → ERREUR
- 1239 → ERREUR

### Règle 3 : Évitement des doublons
- Les suggestions vérifient tous les codes existants
- Les suggestions vérifient tous les codes de remplacement déjà saisis
- Une suggestion n'est jamais proposée deux fois

### Règle 4 : Affichage conditionnel
- Bouton visible uniquement si : conflictType === 'duplicates' && champ vide
- Badge d'erreur visible si : code finit par 9 && champ vide
- Rien affiché si : champ rempli (manuellement ou via suggestion)

### Règle 5 : Bouton "Valider les suggestions"
- Visible uniquement à l'étape 4 (conflictType === 'duplicates')
- Applique toutes les suggestions disponibles en un clic
- Ignore les doublons déjà remplis (manuellement ou via suggestion individuelle)
- Ignore les doublons sans suggestion (codes finissant par 9)
- Désactivé (grisé) quand aucune suggestion n'est disponible
- Tooltip dynamique indiquant le nombre de suggestions à appliquer

## 📊 Résultats attendus

Après application de toutes les suggestions :

```
Compte 140 (doublon 1) → 141 ✅
Compte 140 (doublon 2) → 142 ✅
Compte 140 (doublon 3) → 143 ✅
Compte 145 (doublon 1) → 146 ✅
Compte 145 (doublon 2) → 147 ✅
Compte 149 (doublon 1) → ⚠️ ERREUR
Compte 149 (doublon 2) → ⚠️ ERREUR
Compte 200 → Pas un doublon
Compte 201 → Pas un doublon
```

**Total** : 5 doublons résolus, 2 en erreur
