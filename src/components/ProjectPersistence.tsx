import React, { useRef } from 'react';
import { saveProject, loadProject, projectFileToAppState, isProjectFile } from '../utils/projectPersistence';
import { AppState, AppDispatch } from '../types/accounts';

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

  const handleSaveProject = async () => {
    try {
      const description = `Projet avec ${state.clientAccounts.length} comptes clients, ${state.cncjAccounts.length} comptes CNCJ, ${state.generalAccounts.length} comptes généraux`;
      await saveProject(state, description);
    } catch (error) {
      console.error('Erreur de sauvegarde:', error);
      alert('Erreur lors de la sauvegarde du projet. Veuillez réessayer.');
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
      // TODO: Afficher une notification d'erreur
      return;
    }

    try {
      const projectFile = await loadProject(file);
      const newAppState = projectFileToAppState(projectFile);
      
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

  return (
    <div className="flex gap-2 mb-4">
      <button
        onClick={handleSaveProject}
        disabled={!hasDataToSave}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        title={hasDataToSave ? 'Sauvegarder le projet complet' : 'Aucune donnée à sauvegarder'}
      >
        <span>💾</span>
        <span>Sauvegarder le projet</span>
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

      {hasDataToSave && (
        <div className="flex items-center text-sm text-gray-600 ml-4">
          <span className="mr-2">📊</span>
          <span>
            {state.clientAccounts.length} clients • {state.cncjAccounts.length} CNCJ • {state.generalAccounts.length} généraux
          </span>
        </div>
      )}
    </div>
  );
};
