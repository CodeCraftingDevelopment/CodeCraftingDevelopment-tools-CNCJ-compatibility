# 📁 Données de test - Compte Processor

Ce dossier contient des fichiers CSV de test pour valider toutes les fonctionnalités de l'application Compte Processor.

## 🎯 Scénarios de test couverts

### 1. Fichiers principaux
**`clients-test.csv`** + **`cncj-test.csv`** - Scénario complet de test

#### Clients-test.csv (20 lignes)
- **✅ Correspondances CNCJ** : `10000` à `10004` (5 comptes)
- **⚠️ Doublons** : `20000` (×3), `20001` (×2)
- **❌ Non-correspondances** : `30000` à `30004` (5 comptes)
- **🔤 Cas spéciaux** : caractères spéciaux, titres très longs, titres vides

#### CNCJ-test.csv (15 lignes)
- Contient les 5 comptes de correspondance (`10000` à `10004`)
- Comptes supplémentaires non présents dans clients (`40000` à `40005`)
- Quelques comptes avec caractères spéciaux (`50000`, `60000`)

### 2. Cas limites (Edge Cases)
**`clients-edge-cases.csv`** - Test de robustesse du parsing CSV

#### Scénarios testés :
- **Format sans header** : pas de ligne d'en-tête
- **Colonnes manquantes** : titres vides, numéros manquants
- **Caractères spéciaux** : guillemets, apostrophes, virgules dans titres
- **Formats variés** : nombres seuls, nombres avec titres

**`clients-no-header.csv`** - Test explicite sans header
- Vérifie la détection automatique `isNaN(row[0])`
- Contient doublons et comptes uniques

**`clients-empty-rows.csv`** - Test des lignes vides
- Lignes complètement vides
- Colonnes vides (numéro ou titre manquant)
- Espaces et formatage inhabituel

**`cncj-with-titles.csv`** - CNCJ avec colonne titre
- Vérifie que la deuxième colonne est ignorée
- Test de robustesse du parsing CNCJ

### 3. Scénarios extrêmes
**`clients-all-duplicates.csv`** - 100% de doublons
- Tous les comptes apparaissent 2-3 fois
- Test de performance avec beaucoup de doublons

**`clients-no-matches.csv`** - Aucune correspondance
- Tous les comptes sont uniques mais non présents dans CNCJ
- Test de l'affichage quand aucune correspondance trouvée

**`clients-performance.csv`** - Test de performance (50 lignes)
- Comptes uniques, doublons, et correspondances
- Test de performance avec volume de données modéré

### 4. Erreurs de validation
**`clients-errors.csv`** - Test des messages d'erreur

#### Erreurs attendues :
- `abc123` - Format mixte (texte + nombres)
- `123abc` - Format inversé
- `texte` - Texte pur
- `123.45` - Nombre décimal
- `-12345` - Nombre négatif

## 🧪 Comment utiliser ces fichiers

### Test de base (fonctionnalités complètes)
1. Charger `clients-test.csv`
2. Charger `cncj-test.csv`
3. Vérifier les résultats :
   - 5 correspondances ✅
   - 5 doublons ⚠️
   - 5 non-correspondances ❌

### Test de robustesse
1. Charger `clients-edge-cases.csv`
2. Charger `clients-no-header.csv`
3. Charger `clients-empty-rows.csv`
4. Vérifier que le parsing gère :
   - Les titres avec caractères spéciaux
   - Les colonnes manquantes
   - Les lignes vides

### Test des scénarios extrêmes
1. Charger `clients-all-duplicates.csv` + `cncj-test.csv`
2. Vérifier : 0 correspondances, 8 doublons
3. Charger `clients-no-matches.csv` + `cncj-test.csv`
4. Vérifier : 0 correspondances, 0 doublons, 5 non-correspondances

### Test des erreurs
1. Charger `clients-errors.csv`
2. Vérifier les messages d'erreur pour chaque ligne invalide

### Test CNCJ robustesse
1. Charger `clients-test.csv`
2. Charger `cncj-with-titles.csv`
3. Vérifier que les titres CNCJ sont ignorés

## 📊 Résultats attendus

### clients-test.csv + cncj-test.csv
```json
{
  "duplicates": ["20000", "20000", "20001", "20001"],
  "matches": ["10000", "10001", "10002", "10003", "10004"],
  "unmatched": ["30000", "30001", "30002", "30003", "30004"]
}
```

### clients-all-duplicates.csv + cncj-test.csv
```json
{
  "duplicates": ["10000", "10000", "20000", "20000", "30000", "30000", "30000"],
  "matches": [],
  "unmatched": []
}
```

### clients-no-matches.csv + cncj-test.csv
```json
{
  "duplicates": [],
  "matches": [],
  "unmatched": ["90000", "90001", "90002", "90003", "90004"]
}
```

### clients-errors.csv
- **Erreurs attendues** : 5 messages d'erreur
- **Comptes valides** : 2 comptes acceptés (`12345`, `67890`)

## 🔍 Points de validation

### Interface utilisateur
- Affichage correct des deux colonnes (numéro + titre)
- Messages "Sans titre" pour les titres manquants
- Coloration appropriée des statuts (vert/orange/rouge)
- Gestion des lignes vides et formats inhabituels

### Performance
- Traitement fluide des 20-30 lignes
- Pas de ralentissement avec les titres longs
- Gestion correcte des caractères spéciaux
- Performance avec 100% de doublons

### Export JSON
- Structure correcte des données exportées
- Nombres uniquement dans les tableaux (pas d'objets complets)
- Correspondance exacte avec les résultats affichés

### Robustesse CSV
- Parsing avec/sans header
- Ignorance des colonnes supplémentaires dans CNCJ
- Gestion des lignes vides et colonnes manquantes
- Support des caractères spéciaux et guillemets

## 🐛 Bugs potentiels à tester

- **Headers automatiques** : Vérifier que la détection fonctionne avec/sans header
- **Encodage** : Test des caractères UTF-8 (é, à, ç, ù)
- **Format CSV** : Validation avec différents séparateurs et formats
- **Mémoire** : Comportement avec des fichiers plus volumineux
- **Simultaneous upload** : Upload rapide des deux fichiers
- **Leading zeros** : Comptes comme `00123` vs `123`
- **Whitespace** : Espaces avant/après les numéros

## 📝 Checklist de test

- [ ] clients-test.csv + cncj-test.csv : scénario complet
- [ ] clients-edge-cases.csv : formats variés
- [ ] clients-no-header.csv : sans header
- [ ] clients-empty-rows.csv : lignes vides
- [ ] cncj-with-titles.csv : CNCJ avec titres ignorés
- [ ] clients-all-duplicates.csv : 100% doublons
- [ ] clients-no-matches.csv : aucune correspondance
- [ ] clients-errors.csv : validation des erreurs
- [ ] clients-performance.csv : test de performance (50 lignes)