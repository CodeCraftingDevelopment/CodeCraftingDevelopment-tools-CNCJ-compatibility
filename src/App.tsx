import React, { useReducer, useCallback, useMemo, useState, useEffect } from 'react';

import { ErrorBoundary } from './components/ErrorBoundary';
import { NormalizationStep } from './components/NormalizationStep';
import { Account, FileMetadata, AppState } from './types/accounts';
import { processAccounts, mergeIdenticalAccounts } from './utils/accountUtils';
import { appReducer, initialState } from './reducers/appReducer';
import { useStepValidation } from './hooks/useStepValidation';
import { useAppNavigation } from './hooks/useAppNavigation';
import { getStepConfig, getNextStep, getPreviousStep } from './config/stepsConfig';
import { StepRenderer } from './steps/components/StepRenderer';
import { StepNavigation } from './steps/components/StepNavigation';
import { ProgressBar } from './steps/components/ProgressBar';
import { Step1FileUpload } from './steps/Step1FileUpload';
import { Step2MergeVisualization } from './steps/Step2MergeVisualization';
import { Step4DuplicatesResolution } from './steps/Step4DuplicatesResolution';
import { Step5ReviewCorrections } from './steps/Step5ReviewCorrections';
import { Step6CNCJConflicts } from './steps/Step6CNCJConflicts';
import { Step7FinalSummary } from './steps/Step7FinalSummary';
import { Step8MetadataCompletion } from './steps/Step8MetadataCompletion';
import { StepsInfoModal } from './steps/components/StepsInfoModal';
import { setupTestHelpers } from './utils/testHelpers';
import { AppHeader } from './components/AppHeader';
import { FecVerification } from './components/FecVerification';
import { autoCorrectCncjConflicts, processCncjConflicts } from './utils/cncjConflictUtils';
import { calculateSuggestionsWithDetails } from './utils/codeSuggestions';

// Les comptes CNCJ ne sont plus fournis via un upload dédié : ils sont dérivés du fichier PCG
// (lignes dont la colonne isCncj vaut true).
const deriveCncjFromGeneral = (generalAccounts: Account[]): Account[] =>
  generalAccounts
    .filter(acc => String(acc.rawData?.isCncj).toLowerCase() === 'true')
    .map(acc => ({ ...acc, source: 'cncj' as const }));

const App: React.FC = () => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [isStepsInfoOpen, setIsStepsInfoOpen] = useState(false);
  const [showImportFlow, setShowImportFlow] = useState(false);
  const [showFecFlow, setShowFecFlow] = useState(false);

  const handleProjectLoaded = useCallback((newState: AppState) => {
    if (newState.clientAccounts.length > 0 &&
        newState.generalAccounts.length > 0) {
      const result = processAccounts(newState.clientAccounts, newState.cncjAccounts, newState.generalAccounts);
      dispatch({ type: 'SET_RESULT', payload: result });

      if (['step6', 'step7', 'stepFinal'].includes(newState.currentStep)) {
        const mergedAccounts = newState.clientAccounts.map(account => {
          const replacementCode = newState.replacementCodes[account.id];
          return replacementCode?.trim() ? { ...account, number: replacementCode.trim() } : account;
        });
        const cncjConflicts = processCncjConflicts(mergedAccounts, newState.cncjAccounts);
        dispatch({ type: 'SET_CNCJ_CONFLICT_RESULT', payload: cncjConflicts });
        if (Object.keys(newState.cncjConflictCorrections).length === 0) {
          const corrections = autoCorrectCncjConflicts(cncjConflicts.conflicts, newState.cncjAccounts, mergedAccounts);
          dispatch({ type: 'SET_CNCJ_CONFLICT_CORRECTIONS', payload: corrections });
        }
      }
    }
    if (newState.currentStep !== 'step1' ||
        newState.clientAccounts.length > 0 ||
        newState.cncjAccounts.length > 0 ||
        newState.generalAccounts.length > 0) {
      setShowImportFlow(true);
    }
  }, []);

  const processClientAccounts = useCallback((clientAccounts: Account[], cncjAccounts: Account[], generalAccounts: Account[] = []) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    requestAnimationFrame(() => {
      const result = processAccounts(clientAccounts, cncjAccounts, generalAccounts);
      dispatch({ type: 'SET_RESULT', payload: result });
    });
  }, []);

  const handleFileLoaded = useCallback((accounts: Account[], source: 'client' | 'general' | 'cncj', fileInfo: FileMetadata) => {
    dispatch({ type: 'CLEAR_ERRORS' });
    
    // Réinitialiser toutes les étapes et données de traitement quand de nouveaux fichiers sont chargés
    dispatch({ type: 'SET_CURRENT_STEP', payload: 'step1' });
    dispatch({ type: 'CLEAR_REPLACEMENT_CODES' });
    dispatch({ type: 'SET_RESULT', payload: null });
    dispatch({ type: 'SET_CNCJ_CONFLICT_RESULT', payload: null });
    dispatch({ type: 'SET_CNCJ_CONFLICT_CORRECTIONS', payload: {} });
    dispatch({ type: 'CLEAR_CNCJ_FORCED_VALIDATIONS' });
    
    if (source === 'client') {
      // NE vider mergeInfo QUE pour les fichiers clients (pas pendant le chargement)
      if (fileInfo.loadStatus !== 'loading') {
        dispatch({ type: 'SET_MERGE_INFO', payload: [] });
      }

      // Fusionner les comptes identiques (même numéro ET titre) avant de les stocker
      const { merged: mergedAccounts, mergeInfo } = mergeIdenticalAccounts(accounts);

      dispatch({ type: 'SET_CLIENT_FILE_INFO', payload: fileInfo });
      // Only update accounts if not in loading state
      if (fileInfo.loadStatus !== 'loading') {
        // Préserver les comptes issus du FEC optionnel (complément), en évitant les doublons de code
        const clientCodes = new Set(mergedAccounts.map(a => a.number));
        const keptFec = state.clientAccounts.filter(a => a.fromFec && !clientCodes.has(a.number));
        const combined = [...mergedAccounts, ...keptFec];

        dispatch({ type: 'SET_CLIENT_ACCOUNTS', payload: combined });
        dispatch({ type: 'SET_MERGE_INFO', payload: mergeInfo });

        // Traiter si le PCG est chargé (les comptes CNCJ sont dérivés du PCG via isCncj)
        if (state.generalFileInfo && state.generalFileInfo.loadStatus !== 'loading' &&
            state.generalAccounts.length > 0) {
          processClientAccounts(combined, state.cncjAccounts, state.generalAccounts);
        }
      }
    } else if (source === 'general') {

      dispatch({ type: 'SET_GENERAL_FILE_INFO', payload: fileInfo });
      // Only update accounts if not in loading state
      if (fileInfo.loadStatus !== 'loading') {
        dispatch({ type: 'SET_GENERAL_ACCOUNTS', payload: accounts });

        // Dériver les comptes CNCJ depuis la colonne isCncj du fichier PCG
        const derivedCncj = deriveCncjFromGeneral(accounts);
        dispatch({ type: 'SET_CNCJ_ACCOUNTS', payload: derivedCncj });

        // Traiter si le fichier client est chargé
        if (state.clientFileInfo && state.clientFileInfo.loadStatus !== 'loading' &&
            state.clientAccounts.length > 0) {
          processClientAccounts(state.clientAccounts, derivedCncj, accounts);
        }
      }
    }
  }, [state.cncjAccounts, state.clientAccounts, state.generalAccounts, state.generalFileInfo, state.clientFileInfo, processClientAccounts]);

  const handleError = useCallback((errors: string[]) => {
    dispatch({ type: 'SET_ERRORS', payload: errors });
  }, []);

  const handleFileCleared = useCallback((source: 'client' | 'general' | 'cncj') => {
    if (source === 'client') {
      // Conserver les comptes issus du FEC optionnel s'il y en a
      const fecOnly = state.clientAccounts.filter(a => a.fromFec);
      dispatch({ type: 'SET_CLIENT_ACCOUNTS', payload: fecOnly });
      dispatch({ type: 'SET_CLIENT_FILE_INFO', payload: null });
    } else if (source === 'general') {
      dispatch({ type: 'SET_GENERAL_ACCOUNTS', payload: [] });
      dispatch({ type: 'SET_GENERAL_FILE_INFO', payload: null });
      // Les comptes CNCJ sont dérivés du PCG : les vider aussi
      dispatch({ type: 'SET_CNCJ_ACCOUNTS', payload: [] });
    }
    // Réinitialiser le résultat et les étapes suivantes
    dispatch({ type: 'SET_RESULT', payload: null });
    dispatch({ type: 'SET_CNCJ_CONFLICT_RESULT', payload: null });
    dispatch({ type: 'SET_CNCJ_CONFLICT_CORRECTIONS', payload: {} });
    dispatch({ type: 'CLEAR_REPLACEMENT_CODES' });
    dispatch({ type: 'CLEAR_CNCJ_REPLACEMENT_CODES' });
  }, [state.clientAccounts]);

  const handleSvvLoaded = useCallback((correspondences: { [compteEncheres: string]: string }, fileInfo: FileMetadata) => {
    dispatch({ type: 'SET_SVV_FILE_INFO', payload: fileInfo });
    if (fileInfo.loadStatus !== 'loading') {
      dispatch({ type: 'SET_SVV_CORRESPONDENCES', payload: correspondences });
    }
  }, []);

  const handleSvvCleared = useCallback(() => {
    dispatch({ type: 'CLEAR_SVV_CORRESPONDENCES' });
  }, []);

  // Fichier FEC optionnel : ses comptes complètent la liste des comptes client
  const handleFecLoaded = useCallback((fecAccounts: Account[], fileInfo: FileMetadata) => {
    dispatch({ type: 'CLEAR_ERRORS' });
    dispatch({ type: 'SET_CURRENT_STEP', payload: 'step1' });
    dispatch({ type: 'CLEAR_REPLACEMENT_CODES' });
    dispatch({ type: 'SET_RESULT', payload: null });
    dispatch({ type: 'SET_CNCJ_CONFLICT_RESULT', payload: null });
    dispatch({ type: 'SET_CNCJ_CONFLICT_CORRECTIONS', payload: {} });
    dispatch({ type: 'CLEAR_CNCJ_FORCED_VALIDATIONS' });
    dispatch({ type: 'SET_FEC_FILE_INFO', payload: fileInfo });
    // Mémoriser tous les codes présents dans le FEC (pour restreindre les comptes à créer à l'étape 8)
    dispatch({ type: 'SET_FEC_ACCOUNT_CODES', payload: fecAccounts.map(a => a.number) });

    // Combiner : comptes du fichier client + comptes FEC absents du fichier client
    const clientFilePart = state.clientAccounts.filter(a => !a.fromFec);
    const clientCodes = new Set(clientFilePart.map(a => a.number));
    const addedFec = fecAccounts.filter(f => !clientCodes.has(f.number));
    const combined = [...clientFilePart, ...addedFec];

    dispatch({ type: 'SET_CLIENT_ACCOUNTS', payload: combined });

    if (state.generalFileInfo && state.generalFileInfo.loadStatus !== 'loading' &&
        state.generalAccounts.length > 0) {
      processClientAccounts(combined, state.cncjAccounts, state.generalAccounts);
    }
  }, [state.clientAccounts, state.cncjAccounts, state.generalAccounts, state.generalFileInfo, processClientAccounts]);

  const handleFecCleared = useCallback(() => {
    const clientFilePart = state.clientAccounts.filter(a => !a.fromFec);
    dispatch({ type: 'SET_CLIENT_ACCOUNTS', payload: clientFilePart });
    dispatch({ type: 'SET_FEC_FILE_INFO', payload: null });
    dispatch({ type: 'SET_FEC_ACCOUNT_CODES', payload: [] });
    dispatch({ type: 'SET_RESULT', payload: null });
    dispatch({ type: 'SET_CNCJ_CONFLICT_RESULT', payload: null });
    dispatch({ type: 'SET_CNCJ_CONFLICT_CORRECTIONS', payload: {} });
    dispatch({ type: 'CLEAR_REPLACEMENT_CODES' });
    dispatch({ type: 'CLEAR_CNCJ_REPLACEMENT_CODES' });

    if (state.generalAccounts.length > 0 && clientFilePart.length > 0) {
      processClientAccounts(clientFilePart, state.cncjAccounts, state.generalAccounts);
    }
  }, [state.clientAccounts, state.cncjAccounts, state.generalAccounts, processClientAccounts]);

  const resetData = useCallback(() => {
    dispatch({ type: 'SET_CLIENT_ACCOUNTS', payload: [] });
    dispatch({ type: 'SET_CNCJ_ACCOUNTS', payload: [] });
    dispatch({ type: 'SET_GENERAL_ACCOUNTS', payload: [] });
    dispatch({ type: 'SET_CLIENT_FILE_INFO', payload: null });
    dispatch({ type: 'SET_CNCJ_FILE_INFO', payload: null });
    dispatch({ type: 'SET_FEC_FILE_INFO', payload: null });
    dispatch({ type: 'SET_FEC_ACCOUNT_CODES', payload: [] });
    dispatch({ type: 'SET_GENERAL_FILE_INFO', payload: null });
    dispatch({ type: 'SET_RESULT', payload: null });
    dispatch({ type: 'CLEAR_ERRORS' });
    dispatch({ type: 'SET_CURRENT_STEP', payload: 'step1' });
    dispatch({ type: 'CLEAR_REPLACEMENT_CODES' });
  }, []);

  // Navigation handlers are now extracted to useAppNavigation hook

  
  
  
  
  // Générer la liste fusionnée de clients (originaux + corrections surchargées)
  const generateMergedClientAccounts = useCallback((clientAccounts: Account[], replacementCodes: { [key: string]: string }): Account[] => {
    // Partir de la liste originale complète et appliquer les corrections
    return clientAccounts.map(account => {
      const replacementCode = replacementCodes[account.id];
      if (replacementCode?.trim()) {
        // Appliquer le code de remplacement
        return {
          ...account,
          number: replacementCode.trim()
        };
      }
      // Garder le numéro original
      return account;
    });
  }, []);

  // Calculer mergedClientAccounts automatiquement avec useMemo
  const mergedClientAccounts = useMemo(() => {
    return generateMergedClientAccounts(state.clientAccounts, state.replacementCodes);
  }, [state.clientAccounts, state.replacementCodes, generateMergedClientAccounts]);

  // Créer un Set des IDs des doublons de l'étape 3 pour le style visuel à l'étape 4
  const duplicateIdsFromStep4 = useMemo((): Set<string> => {
    if (!state.result) return new Set();
    return new Set(state.result.duplicates.map(d => d.id));
  }, [state.result]);

  // Calculer le nombre de corrections appliquées aux doublons de l'étape 3
  const duplicateCorrectionsCount = useMemo(() => {
    return mergedClientAccounts.filter(acc => 
      duplicateIdsFromStep4.has(acc.id) && state.replacementCodes[acc.id]?.trim()
    ).length;
  }, [mergedClientAccounts, duplicateIdsFromStep4, state.replacementCodes]);

  // Incrémenter un code client avec contrainte (utilitaire importé)
  // Utilise incrementCodeWithConstraint de cncjConflictUtils

  // Auto-corriger les conflits CNCJ avec incrémentation contrainte et validation croisée (utilitaire importé)
  // Utilise autoCorrectCncjConflicts de cncjConflictUtils

  // Traiter les conflits CNCJ (comptes fusionnés qui existent dans CNCJ) (utilitaire importé)
  // Utilise processCncjConflicts de cncjConflictUtils

  
  
  
  // Utiliser le hook de navigation pour extraire la logique de navigation
  const {
    handleNavigateNext,
    handleNavigatePrevious,
    handleNext,
    handleMergeNext,
    handleNormalizationNext,
    handleDuplicatesNext,
    handleReviewNext,
    handleCncjNext
  } = useAppNavigation(state, dispatch, processClientAccounts, mergedClientAccounts);

  const handleReplacementCodeChange = useCallback((accountId: string, code: string) => {
    // Stocker l'entrée utilisateur brute pour préserver l'UX de saisie
    dispatch({ type: 'SET_REPLACEMENT_CODE', payload: { accountId, code } });
  }, []);

  const handleCncjReplacementCodeChange = useCallback((accountId: string, code: string) => {
    // Stocker l'entrée utilisateur brute pour préserver l'UX de saisie
    dispatch({ type: 'SET_CNCJ_REPLACEMENT_CODE', payload: { accountId, code } });
  }, []);

  const handleCncjForcedValidationChange = useCallback((accountId: string, forced: boolean) => {
    dispatch({ type: 'SET_CNCJ_FORCED_VALIDATION', payload: { accountId, forced } });
  }, []);

  const handleMetadataChange = useCallback((accountId: string, metadata: Record<string, string | number | boolean | null>) => {
    dispatch({ type: 'SET_MISSING_METADATA', payload: { [accountId]: metadata } });
  }, []);

  
  // Utiliser le hook personnalisé pour la validation des étapes
  const { allDuplicatesResolved, allCncjConflictsResolved } = useStepValidation({
    result: state.result,
    cncjConflictResult: state.cncjConflictResult,
    replacementCodes: state.replacementCodes,
    cncjReplacementCodes: state.cncjReplacementCodes,
    cncjForcedValidations: state.cncjForcedValidations,
    cncjAccounts: state.cncjAccounts,
    mergedClientAccounts,
    svvCorrespondences: state.svvCorrespondences
  });

  // Créer un Set des codes CNCJ pour la validation en temps réel (sans normalisation)
  const cncjCodes = useMemo(() => {
    return new Set(state.cncjAccounts.map(acc => acc.number));
  }, [state.cncjAccounts]);

  // Calculer les suggestions initiales de l'étape 4 (pour l'export combiné à l'étape 6)
  const step4Suggestions = useMemo(() => {
    const duplicates = state.result?.duplicates || [];
    if (duplicates.length === 0) {
      return new Map();
    }
    
    const uniqueClients = state.result?.uniqueClients || [];
    const matches = state.result?.matches || [];
    const unmatchedClients = state.result?.unmatchedClients || [];
    
    const existingCodes = new Set([
      ...uniqueClients.map((acc: Account) => acc.number),
      ...matches.map((acc: Account) => acc.number),
      ...unmatchedClients.map((acc: Account) => acc.number)
    ]);
    
    // Calculer sans les replacementCodes pour garder les détails originaux
    return calculateSuggestionsWithDetails(duplicates, existingCodes, {}, cncjCodes);
  }, [state.result, cncjCodes]);

  // Obtenir la configuration de l'étape actuelle
  const currentStepConfig = getStepConfig(state.currentStep);
  const previousStepConfig = getPreviousStep(state.currentStep);
  const nextStepConfig = getNextStep(state.currentStep);

  // Vérifier si on peut passer à l'étape suivante
  const canProceedToNext = currentStepConfig?.canProceed?.(state) ?? true;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header - Only show when not in import flow */}
        {!showImportFlow && !showFecFlow && (
          <div className="text-center mb-8">
            <AppHeader state={state} dispatch={dispatch} onProjectLoaded={handleProjectLoaded} variant="home" />

            {/* Choice Buttons */}
            <div className="flex flex-col items-center gap-4 mt-8">
              <button
                onClick={() => {
                  // Show the import flow without resetting data
                  setShowImportFlow(true);
                  // Only set step to step1 if we have no data or are in a clean state
                  if (state.clientAccounts.length === 0 && 
                      state.cncjAccounts.length === 0 && 
                      state.generalAccounts.length === 0) {
                    dispatch({ type: 'SET_CURRENT_STEP', payload: 'step1' });
                  }
                }}
                className="group relative px-8 py-4 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-300 font-medium text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 w-80 flex items-center justify-between"
              >
                <span>Integration PCG</span>
                <svg className="w-6 h-6 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
              <button
                onClick={() => setShowFecFlow(true)}
                className="group relative px-8 py-4 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-300 font-medium text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 w-80 flex items-center justify-between"
              >
                <span>Vérification Fichier FEC</span>
                <svg className="w-6 h-6 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* FEC Verification Flow - toujours monté (masqué en CSS) pour conserver les données en mémoire */}
        <div style={{ display: showFecFlow ? 'block' : 'none' }}>
          <div className="text-center mb-8">
            <AppHeader state={state} dispatch={dispatch} onProjectLoaded={handleProjectLoaded} variant="fec" />
          </div>

          {/* Back Button */}
          <div className="mb-6">
            <button
              onClick={() => setShowFecFlow(false)}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
            >
              ← Retour aux choix
            </button>
          </div>

          <FecVerification pcgAccounts={state.generalAccounts} />
        </div>

        {/* Import Flow Content - Only show when "Integration PCG" is clicked */}
        {showImportFlow && (
          <>
            <div className="text-center mb-8">
              <AppHeader state={state} dispatch={dispatch} onProjectLoaded={handleProjectLoaded} variant="import" />
            </div>
            
            {/* Back Button */}
            <div className="mb-6">
              <button
                onClick={() => setShowImportFlow(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
              >
                ← Retour aux choix
              </button>
            </div>
            {/* Upload Errors */}
            {state.errors.length > 0 && (
              <div className="mb-6 bg-orange-50 border border-orange-200 text-orange-800 rounded-lg p-4" role="alert">
                <h3 className="text-sm font-semibold mb-2">Lignes ignorées lors de l'import</h3>
                <ul className="space-y-1 text-sm">
                  {state.errors.map((error, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="mt-0.5 text-orange-500">•</span>
                      <span>{error}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Progress Bar */}
            <ProgressBar
              currentStepId={state.currentStep}
              onStepClick={(stepId) => dispatch({ type: 'SET_CURRENT_STEP', payload: stepId })}
              allowNavigation={true}
              onShowInfo={() => setIsStepsInfoOpen(true)}
            />

            {isStepsInfoOpen && (
              <StepsInfoModal onClose={() => setIsStepsInfoOpen(false)} />
            )}

            {/* Step 1: File Upload */}
            {currentStepConfig && currentStepConfig.id === 'step1' && (
              <StepRenderer step={currentStepConfig} isActive={true}>
                <Step1FileUpload
                  clientFileInfo={state.clientFileInfo}
                  generalFileInfo={state.generalFileInfo}
                  svvFileInfo={state.svvFileInfo}
                  svvCorrespondences={state.svvCorrespondences}
                  fecFileInfo={state.fecFileInfo}
                  loading={state.loading}
                  onFileLoaded={handleFileLoaded}
                  onFileCleared={handleFileCleared}
                  onSvvLoaded={handleSvvLoaded}
                  onSvvCleared={handleSvvCleared}
                  onFecLoaded={handleFecLoaded}
                  onFecCleared={handleFecCleared}
                  onError={handleError}
                  clientAccounts={state.clientAccounts}
                  generalAccounts={state.generalAccounts}
                />
                <StepNavigation
                  currentStep={currentStepConfig}
                  nextStep={nextStepConfig}
                  canProceed={canProceedToNext}
                  onNext={handleNext}
                  customPreviousButton={
                    <button
                      onClick={resetData}
                      disabled={state.loading}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      🔄 Réinitialiser
                    </button>
                  }
                />
              </StepRenderer>
            )}

            {/* Step 2: Merge Visualization */}
            {currentStepConfig && currentStepConfig.id === 'step2' && (
              <StepRenderer step={currentStepConfig} isActive={true}>
                <Step2MergeVisualization mergeInfo={state.mergeInfo} />
                <StepNavigation
                  currentStep={currentStepConfig}
                  previousStep={previousStepConfig}
                  nextStep={nextStepConfig}
                  canProceed={true}
                  onNext={handleMergeNext}
                  onPrevious={handleNavigatePrevious}
                />
              </StepRenderer>
            )}

            {/* Normalization Step - Step 3 */}
            {state.currentStep === 'step3' && (
              <NormalizationStep
                accountsNeedingNormalization={state.accountsNeedingNormalization}
                isNormalizationApplied={state.isNormalizationApplied}
                onApplyNormalization={handleNormalizationNext}
                onBack={handleNavigatePrevious}
              />
            )}

            {/* Step 4: Duplicates Resolution */}
            {currentStepConfig && currentStepConfig.id === 'step4' && (
              <StepRenderer step={currentStepConfig} isActive={true}>
                <Step4DuplicatesResolution
                  result={state.result}
                  loading={state.loading}
                  replacementCodes={state.replacementCodes}
                  onReplacementCodeChange={handleReplacementCodeChange}
                  cncjCodes={cncjCodes}
                  svvCorrespondences={state.svvCorrespondences}
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

            {/* Step 5: Review Corrections */}
            {currentStepConfig && currentStepConfig.id === 'step5' && (
              <StepRenderer step={currentStepConfig} isActive={true}>
                <Step5ReviewCorrections
                  result={state.result}
                  loading={state.loading}
                  replacementCodes={state.replacementCodes}
                  mergedClientAccounts={mergedClientAccounts}
                  originalClientAccounts={state.clientAccounts}
                  svvCorrespondences={state.svvCorrespondences}
                  duplicateIdsFromStep4={duplicateIdsFromStep4}
                  duplicateCorrectionsCount={duplicateCorrectionsCount}
                />
                <StepNavigation
                  currentStep={currentStepConfig}
                  previousStep={previousStepConfig}
                  nextStep={nextStepConfig}
                  canProceed={true}
                  onNext={handleReviewNext}
                  onPrevious={handleNavigatePrevious}
                />
              </StepRenderer>
            )}

            {/* Step 6: CNCJ Conflicts */}
            {currentStepConfig && currentStepConfig.id === 'step6' && (
              <StepRenderer step={currentStepConfig} isActive={true}>
                <Step6CNCJConflicts
                  cncjConflictResult={state.cncjConflictResult}
                  loading={state.loading}
                  cncjReplacementCodes={state.cncjReplacementCodes}
                  cncjConflictCorrections={state.cncjConflictCorrections}
                  cncjForcedValidations={state.cncjForcedValidations}
                  cncjCodes={cncjCodes}
                  svvCorrespondences={state.svvCorrespondences}
                  mergedClientAccounts={mergedClientAccounts}
                  onCncjReplacementCodeChange={handleCncjReplacementCodeChange}
                  onCncjForcedValidationChange={handleCncjForcedValidationChange}
                  step4Duplicates={state.result?.duplicates}
                  step4Suggestions={step4Suggestions}
                  step4ReplacementCodes={state.replacementCodes}
                  initialSuggestions={state.initialSuggestions}
                  initialCncjSuggestions={state.initialCncjSuggestions}
                />
                <StepNavigation
                  currentStep={currentStepConfig}
                  previousStep={previousStepConfig}
                  nextStep={nextStepConfig}
                  canProceed={allCncjConflictsResolved}
                  onNext={handleCncjNext}
                  onPrevious={handleNavigatePrevious}
                />
              </StepRenderer>
            )}

            {/* Step 7: Final Summary */}
            {currentStepConfig && currentStepConfig.id === 'step7' && (
              <StepRenderer step={currentStepConfig} isActive={true}>
                <Step7FinalSummary
                  clientAccounts={state.clientAccounts}
                  result={state.result}
                  cncjConflictResult={state.cncjConflictResult}
                  replacementCodes={state.replacementCodes}
                  cncjReplacementCodes={state.cncjReplacementCodes}
                  cncjConflictCorrections={state.cncjConflictCorrections}
                  cncjForcedValidations={state.cncjForcedValidations}
                  mergedClientAccounts={mergedClientAccounts}
                  generalAccounts={state.generalAccounts}
                  svvCorrespondences={state.svvCorrespondences}
                  finalFilter={state.finalFilter}
                  onFilterChange={(filter) => dispatch({ type: 'SET_FINAL_FILTER', payload: filter })}
                />
                <StepNavigation
                  currentStep={currentStepConfig}
                  previousStep={previousStepConfig}
                  nextStep={nextStepConfig}
                  canProceed={true}
                  onNext={handleNavigateNext}
                  onPrevious={handleNavigatePrevious}
                />
              </StepRenderer>
            )}

            {/* Step Final: Metadata Completion */}
            {currentStepConfig && currentStepConfig.id === 'stepFinal' && (
              <StepRenderer step={currentStepConfig} isActive={true}>
                <Step8MetadataCompletion
                  clientAccounts={state.clientAccounts}
                  mergedClientAccounts={mergedClientAccounts}
                  generalAccounts={state.generalAccounts}
                  fecAccountCodes={state.fecAccountCodes}
                  replacementCodes={state.replacementCodes}
                  cncjReplacementCodes={state.cncjReplacementCodes}
                  result={state.result}
                  cncjConflictResult={state.cncjConflictResult}
                  cncjConflictCorrections={state.cncjConflictCorrections}
                  cncjForcedValidations={state.cncjForcedValidations}
                  cncjCodes={cncjCodes}
                  cncjAccounts={state.cncjAccounts}
                  missingMetadata={state.missingMetadata}
                  svvCorrespondences={state.svvCorrespondences}
                  companyCode={state.companyCode}
                  onMetadataChange={handleMetadataChange}
                />
                <StepNavigation
                  currentStep={currentStepConfig}
                  previousStep={previousStepConfig}
                  nextStep={undefined}
                  canProceed={false}
                  onPrevious={handleNavigatePrevious}
                  showNext={false}
                />
              </StepRenderer>
            )}
          </>
        )}

              </div>
      </div>
    </ErrorBoundary>
  );
};

// Ajout des helpers de test pour le développement
const AppWithTestHelpers: React.FC = () => {
  const app = <App />;
  
  useEffect(() => {
    // Initialiser les helpers de test uniquement en mode développement
    if (import.meta.env.DEV) {
      setupTestHelpers({
        onFileLoaded: (_accounts, _source, _fileInfo) => {
        },
        onFileCleared: (_source) => {
        }
      });
    }
  }, []);

  return app;
};

export default AppWithTestHelpers;
