import React, { useRef, useState, useEffect } from 'react';
import { saveProject, loadProject, projectFileToAppState, isProjectFile, generateDefaultFilename, sanitizeFilename, isValidFilename, CANCELLED_ERROR_MESSAGE } from '../utils/projectPersistence';
import { AppState, AppDispatch } from '../types/accounts';
import { APP_VERSION, isNewerVersion } from '../utils/version';

interface ProjectPersistenceProps {
  state: AppState;
  dispatch: AppDispatch;
  onProjectLoaded?: (state: AppState) => void;
}

export const ProjectPersistence: React.FC<ProjectPersistenceProps> = ({
  state,
  dispatch,
  onProjectLoaded
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filename, setFilename] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [hasFileSystemAccess, setHasFileSystemAccess] = useState<boolean>(false);

  // Détecter le support du File System Access API et générer le nom par défaut
  useEffect(() => {
    setHasFileSystemAccess('showSaveFilePicker' in window);
    setFilename(generateDefaultFilename());
  }, []);

  const handleSaveProject = async () => {
    try {
      // Avec File System Access API, le nom est suggéré dans la boîte de dialogue
      // mais on valide quand même pour le fallback
      const sanitizedFilename = sanitizeFilename(filename);
      if (!hasFileSystemAccess && !sanitizedFilename) {
        alert('Veuillez entrer un nom de fichier valide (minimum 3 caractères)');
        return;
      }
      
      setIsSaving(true);
      const description = `Projet avec ${state.clientAccounts.length} comptes clients, ${state.cncjAccounts.length} comptes CNCJ, ${state.generalAccounts.length} comptes généraux`;
      await saveProject(state, sanitizedFilename, description);
      
      // Réinitialiser le nom de fichier avec une nouvelle date après sauvegarde réussie
      setFilename(generateDefaultFilename());
    } catch (error) {
      if (error instanceof Error && error.message === CANCELLED_ERROR_MESSAGE) {
        // Ne rien afficher si l'utilisateur a annulé
        return;
      }
      console.error('Erreur de sauvegarde:', error);
      alert('Erreur lors de la sauvegarde du projet. Veuillez réessayer.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadProject = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!isProjectFile(file)) {
      console.error('Le fichier sélectionné n\'est pas un fichier projet valide');
      alert('Erreur : Le fichier sélectionné n\'est pas un fichier projet valide (.ccp ou .json requis)');
      return;
    }

    try {
      const projectFile = await loadProject(file);
      const newAppState = projectFileToAppState(projectFile);
      
      // Vérifier la compatibilité de version et avertir l'utilisateur
      if (isNewerVersion(APP_VERSION, projectFile.version)) {
        const message = `Ce projet a été créé avec une version antérieure (${projectFile.version}). Certaines fonctionnalités peuvent avoir évolué.`;
        console.warn(message);
        if (confirm(message + '\n\nVoulez-vous continuer le chargement ?')) {
          // Continuer avec le chargement
        } else {
          return; // Annuler le chargement
        }
      } else if (isNewerVersion(projectFile.version, APP_VERSION)) {
        const message = `Ce projet a été créé avec une version plus récente (${projectFile.version}) que votre application (${APP_VERSION}). Des données pourraient être perdues.`;
        console.warn(message);
        if (confirm(message + '\n\nVoulez-vous tout de même continuer le chargement ?')) {
          // Continuer avec le chargement
        } else {
          return; // Annuler le chargement
        }
      }
      
      // Réinitialiser l'état avec les données chargées
      dispatch({ type: 'SET_CLIENT_ACCOUNTS', payload: newAppState.clientAccounts });
      dispatch({ type: 'SET_CNCJ_ACCOUNTS', payload: newAppState.cncjAccounts });
      dispatch({ type: 'SET_GENERAL_ACCOUNTS', payload: newAppState.generalAccounts });
      dispatch({ type: 'SET_CLIENT_FILE_INFO', payload: newAppState.clientFileInfo });
      dispatch({ type: 'SET_CNCJ_FILE_INFO', payload: newAppState.cncjFileInfo });
      dispatch({ type: 'SET_GENERAL_FILE_INFO', payload: newAppState.generalFileInfo });
      dispatch({ type: 'SET_CURRENT_STEP', payload: newAppState.currentStep });
      
      // Utiliser les actions de clear pour réinitialiser proprement
      dispatch({ type: 'CLEAR_REPLACEMENT_CODES' });
      dispatch({ type: 'CLEAR_CNCJ_REPLACEMENT_CODES' });
      
      // Puis appliquer tous les codes de remplacement
      Object.entries(newAppState.replacementCodes).forEach(([accountId, code]) => {
        dispatch({ type: 'SET_REPLACEMENT_CODE', payload: { accountId, code } });
      });
      Object.entries(newAppState.cncjReplacementCodes).forEach(([accountId, code]) => {
        dispatch({ type: 'SET_CNCJ_REPLACEMENT_CODE', payload: { accountId, code } });
      });
      
      dispatch({ type: 'SET_MERGE_INFO', payload: newAppState.mergeInfo });
      dispatch({ type: 'SET_CNCJ_CONFLICT_CORRECTIONS', payload: newAppState.cncjConflictCorrections });
      dispatch({ type: 'SET_FINAL_FILTER', payload: newAppState.finalFilter });
      dispatch({ type: 'SET_ACCOUNTS_NEEDING_NORMALIZATION', payload: newAppState.accountsNeedingNormalization });
      dispatch({ type: 'SET_NORMALIZATION_APPLIED', payload: newAppState.isNormalizationApplied });
      dispatch({ type: 'SET_MISSING_METADATA', payload: newAppState.missingMetadata });
      dispatch({ type: 'CLEAR_ERRORS' });

      // Notifier le composant parent
      if (onProjectLoaded) {
        onProjectLoaded(newAppState);
      }

      console.log('🎉 Projet chargé et appliqué avec succès');
    } catch (error) {
      console.error('Erreur de chargement:', error);
      alert('Erreur lors du chargement du projet : ' + (error instanceof Error ? error.message : 'Erreur inconnue'));
    }

    // Réinitialiser l'input file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const hasDataToSave = state.clientAccounts.length > 0 || 
                       state.cncjAccounts.length > 0 || 
                       state.generalAccounts.length > 0;

  const canSave = hasDataToSave && (hasFileSystemAccess || isValidFilename(filename)) && !isSaving;

  return (
    <div className="flex flex-col gap-4 mb-4">
      <div className="flex gap-2">
        <button
          onClick={handleSaveProject}
          disabled={!canSave}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          title={canSave ? (hasFileSystemAccess ? 'Choisir l\'emplacement et le nom du fichier' : 'Sauvegarder le projet complet') : isSaving ? 'Sauvegarde en cours...' : hasDataToSave ? (hasFileSystemAccess ? 'Sélectionnez un emplacement pour sauvegarder' : 'Nom de fichier invalide (minimum 3 caractères, maximum 200)') : 'Aucune donnée à sauvegarder'}
        >
          <span>{isSaving ? '⏳' : '💾'}</span>
          <span>{isSaving ? 'Sauvegarde...' : (hasFileSystemAccess ? 'Sauvegarder le projet...' : 'Sauvegarder le projet')}</span>
        </button>

        <button
          onClick={handleLoadProject}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          title="Charger un projet précédemment sauvegardé"
        >
          <span>📁</span>
          <span>Charger un projet</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".ccp,.json"
          onChange={handleFileSelected}
          className="hidden"
        />
      </div>

      {/* Champ de saisie pour le nom de fichier - seulement si File System Access API n'est pas disponible */}
      {!hasFileSystemAccess && (
        <div className="flex items-center gap-2">
          <label htmlFor="filename" className="text-sm font-medium text-gray-700">
            Nom du fichier :
          </label>
          <input
            id="filename"
            type="text"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            placeholder="Entrez le nom du fichier..."
            maxLength={200}
            className="flex-1 px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
          <span className="text-xs text-gray-500">(.ccp sera ajouté automatiquement)</span>
        </div>
      )}

          </div>
  );
};
