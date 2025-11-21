import React, { useReducer, useCallback, useMemo, useState } from 'react';

import { NormalizationStep } from './components/NormalizationStep';
import { Account, ProcessingResult, FileMetadata, AppState, MergeInfo } from './types/accounts';
import { processAccounts, mergeIdenticalAccounts, findAccountsNeedingNormalization, applyNormalization } from './utils/accountUtils';
import { cleanupFutureSteps } from './utils/stepCleanup';
import { useStepValidation } from './hooks/useStepValidation';
import { getStepConfig, getNextStep, getPreviousStep } from './config/stepsConfig';
import { StepRenderer } from './steps/components/StepRenderer';
import { StepNavigation } from './steps/components/StepNavigation';
import { ProgressBar } from './steps/components/ProgressBar';
import { Step1FileUpload } from './steps/Step1FileUpload';
import { Step2MergeVisualization } from './steps/Step2MergeVisualization';
import { Step4DuplicatesResolution } from './steps/Step4DuplicatesResolution';
import { Step5ReviewCorrections } from './steps/Step5ReviewCorrections';
import { Step6CNCJConflicts } from './steps/Step6CNCJConflicts';
import { StepFinalSummary } from './steps/StepFinalSummary';
import { StepsInfoModal } from './steps/components/StepsInfoModal';

type AppAction = 
  | { type: 'SET_CLIENT_ACCOUNTS'; payload: Account[] }
  | { type: 'SET_CNCJ_ACCOUNTS'; payload: Account[] }
  | { type: 'SET_GENERAL_ACCOUNTS'; payload: Account[] }
  | { type: 'SET_CLIENT_FILE_INFO'; payload: FileMetadata | null }
  | { type: 'SET_CNCJ_FILE_INFO'; payload: FileMetadata | null }
  | { type: 'SET_GENERAL_FILE_INFO'; payload: FileMetadata | null }
  | { type: 'SET_RESULT'; payload: ProcessingResult | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERRORS'; payload: string[] }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'SET_CURRENT_STEP'; payload: 'step1' | 'step2' | 'step3' | 'step4' | 'step5' | 'step6' | 'stepFinal' }
  | { type: 'SET_REPLACEMENT_CODE'; payload: { accountId: string; code: string } }
  | { type: 'CLEAR_REPLACEMENT_CODES' }
  | { type: 'SET_CNCJ_REPLACEMENT_CODE'; payload: { accountId: string; code: string } }
  | { type: 'CLEAR_CNCJ_REPLACEMENT_CODES' }
  | { type: 'SET_MERGE_INFO'; payload: MergeInfo[] }
  | { type: 'SET_CNCJ_CONFLICT_RESULT'; payload: ProcessingResult | null }
  | { type: 'SET_CNCJ_CONFLICT_CORRECTIONS'; payload: { [key: string]: string | 'error' } }
  | { type: 'SET_FINAL_FILTER'; payload: 'all' | 'step4' | 'step6' | 'step4+step6' | 'toCreate' }
  | { type: 'SET_ACCOUNTS_NEEDING_NORMALIZATION'; payload: import('./types/accounts').NormalizationAccount[] }
  | { type: 'SET_NORMALIZATION_APPLIED'; payload: boolean };

const initialState: AppState = {
  clientAccounts: [],
  cncjAccounts: [],
  generalAccounts: [],
  clientFileInfo: null,
  cncjFileInfo: null,
  generalFileInfo: null,
  result: null,
  loading: false,
  errors: [],
  currentStep: 'step1',
  replacementCodes: {},
  cncjReplacementCodes: {},
  mergeInfo: [],
  cncjConflictResult: null,
  cncjConflictCorrections: {},
  finalFilter: 'all',
  accountsNeedingNormalization: [],
  isNormalizationApplied: false
};


const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_CLIENT_ACCOUNTS':
      return { ...state, clientAccounts: action.payload };
    case 'SET_CNCJ_ACCOUNTS':
      return { ...state, cncjAccounts: action.payload };
    case 'SET_GENERAL_ACCOUNTS':
      return { ...state, generalAccounts: action.payload };
    case 'SET_CLIENT_FILE_INFO':
      return { ...state, clientFileInfo: action.payload };
    case 'SET_CNCJ_FILE_INFO':
      return { ...state, cncjFileInfo: action.payload };
    case 'SET_GENERAL_FILE_INFO':
      return { ...state, generalFileInfo: action.payload };
    case 'SET_RESULT':
      return { ...state, result: action.payload, loading: false };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERRORS':
      return { ...state, errors: action.payload };
    case 'CLEAR_ERRORS':
      return { ...state, errors: [] };
    case 'SET_CURRENT_STEP': {
      const stepOrder = ['step1', 'step2', 'step3', 'step4', 'step5', 'step6', 'stepFinal'];
      const currentIndex = stepOrder.indexOf(state.currentStep);
      const targetIndex = stepOrder.indexOf(action.payload);
      
      if (targetIndex < currentIndex) {
        // Navigation vers l'arrière - nettoyer les données des étapes futures
        return cleanupFutureSteps(state, action.payload);
      }
      
      return { ...state, currentStep: action.payload };
    }
    case 'SET_REPLACEMENT_CODE':
      return { 
        ...state, 
        replacementCodes: { 
          ...state.replacementCodes, 
          [action.payload.accountId]: action.payload.code 
        } 
      };
    case 'CLEAR_REPLACEMENT_CODES':
      return { ...state, replacementCodes: {} };
    case 'SET_CNCJ_REPLACEMENT_CODE':
      return { 
        ...state, 
        cncjReplacementCodes: { 
          ...state.cncjReplacementCodes, 
          [action.payload.accountId]: action.payload.code 
        } 
      };
    case 'CLEAR_CNCJ_REPLACEMENT_CODES':
      return { ...state, cncjReplacementCodes: {} };
    case 'SET_MERGE_INFO':
      console.log('🔍 REDUCER: SET_MERGE_INFO appelé avec payload:', action.payload);
      return { ...state, mergeInfo: action.payload };
    case 'SET_CNCJ_CONFLICT_RESULT':
      return { ...state, cncjConflictResult: action.payload };
    case 'SET_CNCJ_CONFLICT_CORRECTIONS':
      return { ...state, cncjConflictCorrections: action.payload };
    case 'SET_FINAL_FILTER':
      return { ...state, finalFilter: action.payload };
    case 'SET_ACCOUNTS_NEEDING_NORMALIZATION':
      return { ...state, accountsNeedingNormalization: action.payload };
    case 'SET_NORMALIZATION_APPLIED':
      return { ...state, isNormalizationApplied: action.payload };
    default:
      return state;
  }
};

const App: React.FC = () => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [isStepsInfoOpen, setIsStepsInfoOpen] = useState(false);

  const processClientAccounts = useCallback((clientAccounts: Account[], cncjAccounts: Account[], generalAccounts: Account[] = []) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    // Simulate processing delay for better UX
    setTimeout(() => {
      const result = processAccounts(clientAccounts, cncjAccounts, generalAccounts);
      dispatch({ type: 'SET_RESULT', payload: result });
    }, 500);
  }, []);

  const handleFileLoaded = useCallback((accounts: Account[], source: 'client' | 'cncj' | 'general', fileInfo: FileMetadata) => {
    dispatch({ type: 'CLEAR_ERRORS' });
    
    // Réinitialiser toutes les étapes et données de traitement quand de nouveaux fichiers sont chargés
    dispatch({ type: 'SET_CURRENT_STEP', payload: 'step1' });
    dispatch({ type: 'CLEAR_REPLACEMENT_CODES' });
    dispatch({ type: 'SET_RESULT', payload: null });
    dispatch({ type: 'SET_CNCJ_CONFLICT_RESULT', payload: null });
    dispatch({ type: 'SET_CNCJ_CONFLICT_CORRECTIONS', payload: {} });
    
    if (source === 'client') {
      // NE vider mergeInfo QUE pour les fichiers clients (pas pendant le chargement)
      if (fileInfo.loadStatus !== 'loading') {
        dispatch({ type: 'SET_MERGE_INFO', payload: [] });
      }
      
      // Fusionner les comptes identiques (même numéro ET titre) avant de les stocker
      const { merged: mergedAccounts, mergeInfo } = mergeIdenticalAccounts(accounts);
      console.log(`Fusion de ${accounts.length} comptes clients en ${mergedAccounts.length} comptes uniques`);
      console.log(`${mergeInfo.length} groupes de comptes ont été fusionnés`);
      
      dispatch({ type: 'SET_CLIENT_FILE_INFO', payload: fileInfo });
      // Only update accounts if not in loading state
      if (fileInfo.loadStatus !== 'loading') {
        dispatch({ type: 'SET_CLIENT_ACCOUNTS', payload: mergedAccounts });
        dispatch({ type: 'SET_MERGE_INFO', payload: mergeInfo });
        
        // Process if we have both files and both are fully loaded (not loading)
        if (state.cncjAccounts.length > 0 && state.cncjFileInfo?.loadStatus !== 'loading') {
          processClientAccounts(mergedAccounts, state.cncjAccounts, state.generalAccounts);
        }
      }
    } else if (source === 'general') {
      dispatch({ type: 'SET_GENERAL_FILE_INFO', payload: fileInfo });
      // Only update accounts if not in loading state
      if (fileInfo.loadStatus !== 'loading') {
        dispatch({ type: 'SET_GENERAL_ACCOUNTS', payload: accounts });
        
        // Process if we have client and CNCJ files and both are fully loaded (not loading)
        if (state.clientAccounts.length > 0 && state.cncjAccounts.length > 0 && 
            state.clientFileInfo?.loadStatus !== 'loading' && state.cncjFileInfo?.loadStatus !== 'loading') {
          processClientAccounts(state.clientAccounts, state.cncjAccounts, accounts);
        }
      }
    } else {
      dispatch({ type: 'SET_CNCJ_FILE_INFO', payload: fileInfo });
      // Only update accounts if not in loading state
      if (fileInfo.loadStatus !== 'loading') {
        dispatch({ type: 'SET_CNCJ_ACCOUNTS', payload: accounts });
        
        // Process if we have both files and both are fully loaded (not loading)
        if (state.clientAccounts.length > 0 && state.clientFileInfo?.loadStatus !== 'loading') {
          processClientAccounts(state.clientAccounts, accounts, state.generalAccounts);
        }
      }
    }
  }, [state.cncjAccounts, state.clientAccounts, state.generalAccounts, state.cncjFileInfo, state.clientFileInfo, processClientAccounts]);

  const handleError = useCallback((errors: string[]) => {
    dispatch({ type: 'SET_ERRORS', payload: errors });
  }, []);

  const handleFileCleared = useCallback((source: 'client' | 'cncj' | 'general') => {
    if (source === 'client') {
      dispatch({ type: 'SET_CLIENT_ACCOUNTS', payload: [] });
      dispatch({ type: 'SET_CLIENT_FILE_INFO', payload: null });
    } else if (source === 'general') {
      dispatch({ type: 'SET_GENERAL_ACCOUNTS', payload: [] });
      dispatch({ type: 'SET_GENERAL_FILE_INFO', payload: null });
    } else {
      dispatch({ type: 'SET_CNCJ_ACCOUNTS', payload: [] });
      dispatch({ type: 'SET_CNCJ_FILE_INFO', payload: null });
    }
  }, []);

  const resetData = useCallback(() => {
    console.log('resetData called');
    dispatch({ type: 'SET_CLIENT_ACCOUNTS', payload: [] });
    dispatch({ type: 'SET_CNCJ_ACCOUNTS', payload: [] });
    dispatch({ type: 'SET_GENERAL_ACCOUNTS', payload: [] });
    dispatch({ type: 'SET_CLIENT_FILE_INFO', payload: null });
    dispatch({ type: 'SET_CNCJ_FILE_INFO', payload: null });
    dispatch({ type: 'SET_GENERAL_FILE_INFO', payload: null });
    dispatch({ type: 'SET_RESULT', payload: null });
    dispatch({ type: 'CLEAR_ERRORS' });
    dispatch({ type: 'SET_CURRENT_STEP', payload: 'step1' });
    dispatch({ type: 'CLEAR_REPLACEMENT_CODES' });
  }, []);

  // Navigation générique vers l'étape suivante
  const handleNavigateNext = useCallback(() => {
    const nextStep = getNextStep(state.currentStep);
    if (nextStep) {
      dispatch({ type: 'SET_CURRENT_STEP', payload: nextStep.id });
    }
  }, [state.currentStep]);

  // Navigation générique vers l'étape précédente
  const handleNavigatePrevious = useCallback(() => {
    const previousStep = getPreviousStep(state.currentStep);
    if (previousStep) {
      dispatch({ type: 'SET_CURRENT_STEP', payload: previousStep.id });
    }
  }, [state.currentStep]);

  const handleNext = useCallback(() => {
    console.log('Navigation vers l\'étape suivante');
    if (!state.result) {
      dispatch({ type: 'SET_ERRORS', payload: ['Veuillez attendre que les données soient traitées avant de continuer'] });
      return;
    }
    handleNavigateNext();
  }, [state.result, handleNavigateNext]);

  const handleMergeNext = useCallback(() => {
    console.log('Visualisation des fusions terminée - passage à la normalisation');
    
    // Détecter les comptes nécessitant une normalisation
    const accountsNeedingNormalization = findAccountsNeedingNormalization(state.clientAccounts);
    dispatch({ type: 'SET_ACCOUNTS_NEEDING_NORMALIZATION', payload: accountsNeedingNormalization });
    
    // Naviguer vers l'étape de normalisation
    handleNavigateNext();
  }, [state.clientAccounts, handleNavigateNext]);

  const handleNormalizationNext = useCallback(() => {
    console.log('Normalisation terminée - passage aux doublons');
    
    if (state.accountsNeedingNormalization.length > 0 && !state.isNormalizationApplied) {
      // Appliquer la normalisation
      const normalizedClientAccounts = applyNormalization(state.clientAccounts, state.accountsNeedingNormalization);
      dispatch({ type: 'SET_CLIENT_ACCOUNTS', payload: normalizedClientAccounts });
      dispatch({ type: 'SET_NORMALIZATION_APPLIED', payload: true });
      
      // Reprocesser les comptes avec les données normalisées
      processClientAccounts(normalizedClientAccounts, state.cncjAccounts);
    }

    handleNavigateNext();
  }, [
    state.clientAccounts,
    state.cncjAccounts,
    state.accountsNeedingNormalization,
    state.isNormalizationApplied,
    processClientAccounts,
    handleNavigateNext
  ]);

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

  // Incrémenter un code client avec contrainte (ne jamais passer à la dizaine supérieure)
  const incrementCodeWithConstraint = useCallback((code: string): string | null => {
    const codeNum = parseInt(code);
    if (isNaN(codeNum)) return null;
    
    const incremented = codeNum + 1;
    
    // Vérifier la contrainte : ne pas passer à la dizaine supérieure
    if (incremented % 10 === 0) {
      return null; // Contrainte violée (ex: 10009 → 10010)
    }
    
    return incremented.toString();
  }, []);

  // Auto-corriger les conflits CNCJ avec incrémentation contrainte et validation croisée
  const autoCorrectCncjConflicts = useCallback((conflicts: Account[], cncjAccounts: Account[], mergedClientAccounts: Account[]): { [accountId: string]: string | 'error' } => {
    // Initialiser l'ensemble des codes utilisés (CNCJ + comptes clients fusionnés)
    const usedCodes = new Set([
      ...cncjAccounts.map(acc => acc.number),
      ...mergedClientAccounts.map(acc => acc.number)
    ]);
    
    const corrections: { [accountId: string]: string | 'error' } = {};
    
    // Trier les conflits pour des résultats déterministes
    const sortedConflicts = [...conflicts].sort((a, b) => a.number.localeCompare(b.number));
    
    sortedConflicts.forEach(conflict => {
      let currentCode = conflict.number;
      let attempts = 0;
      const maxAttempts = 9; // Maximum 9 tentatives avant de changer de dizaine
      
      while (attempts < maxAttempts) {
        const correctedCode = incrementCodeWithConstraint(currentCode);
        
        if (correctedCode === null) {
          corrections[conflict.id] = 'error';
          break;
        }
        
        // Vérifier que le code n'est ni dans CNCJ, ni dans les clients fusionnés, ni déjà suggéré
        if (!usedCodes.has(correctedCode)) {
          corrections[conflict.id] = correctedCode;
          usedCodes.add(correctedCode); // Ajouter immédiatement pour éviter les conflits avec les prochaines corrections
          break;
        }
        
        currentCode = correctedCode;
        attempts++;
      }
      
      if (attempts >= maxAttempts) {
        corrections[conflict.id] = 'error';
      }
    });
    
    return corrections;
  }, [incrementCodeWithConstraint]);

  // Traiter les conflits CNCJ (comptes fusionnés qui existent dans CNCJ)
  const processCncjConflicts = useCallback((mergedClientAccounts: Account[], cncjAccounts: Account[]): ProcessingResult => {
    // Créer un Set des codes CNCJ pour une recherche rapide
    const cncjCodes = new Set(cncjAccounts.map(acc => acc.number));
    
    // Identifier les comptes clients qui sont en conflit avec les codes CNCJ
    const conflicts: Account[] = [];
    const nonConflicts: Account[] = [];
    
    mergedClientAccounts.forEach(clientAccount => {
      if (cncjCodes.has(clientAccount.number)) {
        conflicts.push(clientAccount);
      } else {
        nonConflicts.push(clientAccount);
      }
    });
    
    // Retourner un résultat compatible avec l'interface existante
    return {
      duplicates: conflicts, // Les conflits CNCJ sont traités comme des "doublons"
      uniqueClients: nonConflicts,
      matches: [], // Pas de correspondances pertinentes pour cette étape
      unmatchedClients: [], // Pas de non-correspondances pertinentes pour cette étape
      toCreate: [] // Pas de comptes à créer pour cette étape
    };
  }, []);

  const handleDuplicatesNext = useCallback(() => {
    console.log('Doublons résolus - passage à la révision des corrections');
    if (!state.result) {
      dispatch({ type: 'SET_ERRORS', payload: ['Veuillez attendre que les données soient traitées avant de continuer'] });
      return;
    }

    // Naviguer vers l'étape de révision des corrections
    handleNavigateNext();
  }, [state.result, handleNavigateNext]);

  const handleReviewNext = useCallback(() => {
    console.log('Révision terminée - passage aux conflits CNCJ');
    if (!state.result) {
      dispatch({ type: 'SET_ERRORS', payload: ['Veuillez attendre que les données soient traitées avant de continuer'] });
      return;
    }

    // Ne recalculer les conflits CNCJ que si ce n'a pas déjà été fait
    // Cela préserve les modifications manuelles de l'utilisateur lors de la navigation retour-avant
    if (!state.cncjConflictResult) {
      console.log('Premier passage à step5 - calcul des conflits CNCJ');
      // Étape 1 : Traiter les conflits CNCJ avec les comptes fusionnés
      const cncjConflicts = processCncjConflicts(mergedClientAccounts, state.cncjAccounts);
      dispatch({ type: 'SET_CNCJ_CONFLICT_RESULT', payload: cncjConflicts });

      // Étape 2 : Générer les corrections automatiques
      const corrections = autoCorrectCncjConflicts(cncjConflicts.duplicates, state.cncjAccounts, mergedClientAccounts);
      dispatch({ type: 'SET_CNCJ_CONFLICT_CORRECTIONS', payload: corrections });
    } else {
      console.log('Retour à step5 - conservation des conflits CNCJ existants et des modifications manuelles');
    }

    // Naviguer vers step 6
    handleNavigateNext();
  }, [state.result, state.cncjAccounts, mergedClientAccounts, processCncjConflicts, autoCorrectCncjConflicts, state.cncjConflictResult, handleNavigateNext]);

  const handleReplacementCodeChange = useCallback((accountId: string, code: string) => {
    dispatch({ type: 'SET_REPLACEMENT_CODE', payload: { accountId, code } });
  }, []);

  const handleCncjReplacementCodeChange = useCallback((accountId: string, code: string) => {
    dispatch({ type: 'SET_CNCJ_REPLACEMENT_CODE', payload: { accountId, code } });
  }, []);

  // Utiliser le hook personnalisé pour la validation des étapes
  const { allDuplicatesResolved, allCncjConflictsResolved } = useStepValidation({
    result: state.result,
    cncjConflictResult: state.cncjConflictResult,
    replacementCodes: state.replacementCodes,
    cncjReplacementCodes: state.cncjReplacementCodes,
    cncjAccounts: state.cncjAccounts,
    mergedClientAccounts
  });

  // Créer un Set des codes CNCJ pour la validation en temps réel (optimisé avec useMemo)
  const cncjCodes = useMemo(() => {
    return new Set(state.cncjAccounts.map(acc => acc.number));
  }, [state.cncjAccounts]);

  // Obtenir la configuration de l'étape actuelle
  const currentStepConfig = getStepConfig(state.currentStep);
  const previousStepConfig = getPreviousStep(state.currentStep);
  const nextStepConfig = getNextStep(state.currentStep);

  // Vérifier si on peut passer à l'étape suivante
  const canProceedToNext = currentStepConfig?.canProceed?.(state) ?? true;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🏦 Compte Processor
          </h1>
          <p className="text-gray-600">
            Traitement et comparaison de comptes comptables clients et CNCJ
          </p>
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
              cncjFileInfo={state.cncjFileInfo}
              generalFileInfo={state.generalFileInfo}
              loading={state.loading}
              onFileLoaded={handleFileLoaded}
              onFileCleared={handleFileCleared}
              onError={handleError}
              clientAccounts={state.clientAccounts}
              cncjAccounts={state.cncjAccounts}
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
              cncjCodes={cncjCodes}
              onCncjReplacementCodeChange={handleCncjReplacementCodeChange}
            />
            <StepNavigation
              currentStep={currentStepConfig}
              previousStep={previousStepConfig}
              nextStep={nextStepConfig}
              canProceed={allCncjConflictsResolved}
              onNext={handleNavigateNext}
              onPrevious={handleNavigatePrevious}
            />
          </StepRenderer>
        )}

        {/* Step Final: Summary */}
        {currentStepConfig && currentStepConfig.id === 'stepFinal' && (
          <StepRenderer step={currentStepConfig} isActive={true}>
            <StepFinalSummary
              clientAccounts={state.clientAccounts}
              result={state.result}
              cncjConflictResult={state.cncjConflictResult}
              replacementCodes={state.replacementCodes}
              cncjConflictCorrections={state.cncjConflictCorrections}
              mergedClientAccounts={mergedClientAccounts}
              finalFilter={state.finalFilter}
              onFilterChange={(filter) => dispatch({ type: 'SET_FINAL_FILTER', payload: filter })}
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

              </div>
    </div>
  );
};

export default App;
