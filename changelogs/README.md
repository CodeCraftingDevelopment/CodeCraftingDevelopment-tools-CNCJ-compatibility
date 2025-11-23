# Gestion des Changelogs

Cette structure suit les bonnes pratiques de [Keep a Changelog](https://keepachangelog.com/).

## Structure des dossiers

- `changelogs/` - Dossier racine pour tous les changelogs
  - `unreleased/` - Modifications non encore publiées
    - `template.md` - Modèle pour les nouvelles versions
  - `vX.Y.Z.md` - Changelogs des versions publiées (ex: `v1.0.0.md`)

## Comment mettre à jour le changelog

1. **Pour une nouvelle fonctionnalité/correction** :
   - Créez un nouveau fichier dans `changelogs/unreleased/` avec un nom descriptif (ex: `feature-user-authentication.md`)
   - Utilisez le template fourni
   - Ajoutez vos modifications dans les sections appropriées

2. **Lors d'une nouvelle version** :
   - Fusionnez tous les fichiers de `changelogs/unreleased/` dans un nouveau fichier `changelogs/vX.Y.Z.md`
   - Mettez à jour `CHANGELOG.md` à la racine pour refléter les derniers changements
   - Supprimez les fichiers fusionnés de `changelogs/unreleased/`
   - Créez un nouveau template pour la prochaine version

## Format du Changelog

Chaque entrée doit suivre ce format :

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- Nouvelles fonctionnalités

### Changed
- Changements dans les fonctionnalités existantes

### Deprecated
- Fonctionnalités qui seront supprimées dans les prochaines versions

### Removed
- Fonctionnalités supprimées

### Fixed
- Corrections de bugs

### Security
- Vulnérabilités corrigées
```

## Outils recommandés

- [standard-version](https://github.com/conventional-changelog/standard-version) - Pour la génération automatique de changelogs
- [commitlint](https://github.com/conventional-changelog/commitlint) - Pour des messages de commit standardisés
