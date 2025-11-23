import React, { useReducer, useCallback, useMemo, useState, useEffect } from 'react';

import { NormalizationStep } from './components/NormalizationStep';
import { Account, ProcessingResult, FileMetadata, AppState } from './types/accounts';
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
import { Step7FinalSummary } from './steps/Step7FinalSummary';
import { Step8MetadataCompletion } from './steps/Step8MetadataCompletion';
import { StepsInfoModal } from './steps/components/StepsInfoModal';
import { setupTestHelpers } from './utils/testHelpers';
import { ProjectPersistence } from './components/ProjectPersistence';
import { AppAction } from './types/accounts';
import { APP_VERSION, formatVersion } from './utils/version';

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
  isNormalizationApplied: false,
  missingMetadata: {}
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
      const stepOrder = ['step1', 'step2', 'step3', 'step4', 'step5', 'step6', 'step7', 'stepFinal'];
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
    case 'SET_MISSING_METADATA':
      return { ...state, missingMetadata: action.payload };
    case 'SET_MISSING_METADATA_FIELD':
      return { 
        ...state, 
        missingMetadata: { 
          ...state.missingMetadata, 
          [action.payload.accountId]: { 
            ...(state.missingMetadata[action.payload.accountId] || {}), 
            [action.payload.field]: action.payload.value 
          } 
        } 
      };
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

  const handleFileLoaded = useCallback((accounts: Account[], source: 'client' | 'general' | 'cncj', fileInfo: FileMetadata) => {
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
        
        // Process if we have all three files and they are fully loaded (not loading)
        if (state.cncjFileInfo && state.cncjFileInfo.loadStatus !== 'loading' &&
            state.generalFileInfo && state.generalFileInfo.loadStatus !== 'loading' &&
            state.cncjAccounts.length > 0 && state.generalAccounts.length > 0) {
          processClientAccounts(mergedAccounts, state.cncjAccounts, state.generalAccounts);
        }
      }
    } else if (source === 'general') {
      console.log(`Chargement des comptes généraux: ${accounts.length} comptes`);
      
      dispatch({ type: 'SET_GENERAL_FILE_INFO', payload: fileInfo });
      // Only update accounts if not in loading state
      if (fileInfo.loadStatus !== 'loading') {
        dispatch({ type: 'SET_GENERAL_ACCOUNTS', payload: accounts });
        
        // Process if we have client and CNCJ files and they are fully loaded (not loading)
        if (state.clientFileInfo && state.clientFileInfo.loadStatus !== 'loading' &&
            state.cncjFileInfo && state.cncjFileInfo.loadStatus !== 'loading' &&
            state.clientAccounts.length > 0 && state.cncjAccounts.length > 0) {
          processClientAccounts(state.clientAccounts, state.cncjAccounts, accounts);
        }
      }
    } else if (source === 'cncj') {
      console.log(`Chargement des comptes CNCJ: ${accounts.length} comptes`);
      
      dispatch({ type: 'SET_CNCJ_FILE_INFO', payload: fileInfo });
      // Only update accounts if not in loading state
      if (fileInfo.loadStatus !== 'loading') {
        dispatch({ type: 'SET_CNCJ_ACCOUNTS', payload: accounts });
        
        // Process if we have client and general files and they are fully loaded (not loading)
        if (state.clientFileInfo && state.clientFileInfo.loadStatus !== 'loading' &&
            state.generalFileInfo && state.generalFileInfo.loadStatus !== 'loading' &&
            state.clientAccounts.length > 0 && state.generalAccounts.length > 0) {
          processClientAccounts(state.clientAccounts, accounts, state.generalAccounts);
        }
      }
    }
  }, [state.cncjAccounts, state.clientAccounts, state.generalAccounts, state.cncjFileInfo, state.generalFileInfo, state.clientFileInfo, processClientAccounts]);

  const handleError = useCallback((errors: string[]) => {
    dispatch({ type: 'SET_ERRORS', payload: errors });
  }, []);

  const handleFileCleared = useCallback((source: 'client' | 'general' | 'cncj') => {
    if (source === 'client') {
      dispatch({ type: 'SET_CLIENT_ACCOUNTS', payload: [] });
      dispatch({ type: 'SET_CLIENT_FILE_INFO', payload: null });
    } else if (source === 'general') {
      dispatch({ type: 'SET_GENERAL_ACCOUNTS', payload: [] });
      dispatch({ type: 'SET_GENERAL_FILE_INFO', payload: null });
    } else if (source === 'cncj') {
      dispatch({ type: 'SET_CNCJ_ACCOUNTS', payload: [] });
      dispatch({ type: 'SET_CNCJ_FILE_INFO', payload: null });
    }
    // Réinitialiser le résultat et les étapes suivantes
    dispatch({ type: 'SET_RESULT', payload: null });
    dispatch({ type: 'SET_CNCJ_CONFLICT_RESULT', payload: null });
    dispatch({ type: 'SET_CNCJ_CONFLICT_CORRECTIONS', payload: {} });
    dispatch({ type: 'CLEAR_REPLACEMENT_CODES' });
    dispatch({ type: 'CLEAR_CNCJ_REPLACEMENT_CODES' });
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
    // S'assurer que le code d'entrée est normalisé à 7 chiffres
    const normalizedCode = code.length > 7 ? code.slice(0, 7) : code.padEnd(7, '0');
    
    const codeNum = parseInt(normalizedCode);
    if (isNaN(codeNum)) return null;
    
    const incremented = codeNum + 1;
    
    // Vérifier la contrainte : ne pas passer à la dizaine supérieure
    if (incremented % 10 === 0) {
      return null; // Contrainte violée (ex: 10009 → 10010)
    }
    
    return incremented.toString().padStart(7, '0');
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
    // Utiliser les codes CNCJ tels quels (données de référence avec isCNCJ=true)
    const cncjCodes = new Set(cncjAccounts.map(acc => acc.number));
    
    // Identifier les comptes clients qui sont en conflit avec les codes CNCJ
    const conflicts: Account[] = [];
    const nonConflicts: Account[] = [];
    
    mergedClientAccounts.forEach(clientAccount => {
      // Les comptes clients sont déjà normalisés à 7 chiffres à l'étape 3
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

  const handleCncjNext = useCallback(() => {
    console.log('Conflits CNCJ résolus - passage aux correspondances manquantes');
    handleNavigateNext();
  }, [handleNavigateNext]);

  const handleReplacementCodeChange = useCallback((accountId: string, code: string) => {
    // Stocker l'entrée utilisateur brute pour préserver l'UX de saisie
    dispatch({ type: 'SET_REPLACEMENT_CODE', payload: { accountId, code } });
  }, []);

  const handleCncjReplacementCodeChange = useCallback((accountId: string, code: string) => {
    // Stocker l'entrée utilisateur brute pour préserver l'UX de saisie
    dispatch({ type: 'SET_CNCJ_REPLACEMENT_CODE', payload: { accountId, code } });
  }, []);

  const handleMetadataChange = useCallback((accountId: string, metadata: Record<string, any>) => {
    dispatch({ type: 'SET_MISSING_METADATA', payload: { [accountId]: metadata } });
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

  // Créer un Set des codes CNCJ pour la validation en temps réel (sans normalisation)
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-2">
            <h1 className="text-3xl font-bold text-gray-900">
              🏦 Compte Processor
            </h1>
            <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
              {formatVersion(APP_VERSION)}
            </span>
          </div>
          <p className="text-gray-600">
            Import des comptes comptables client vers le plan comptable général et CNCJ
          </p>
          
          {/* Project Persistence Controls */}
          <div className="flex justify-center mt-4">
            <ProjectPersistence
              state={state}
              dispatch={dispatch}
              onProjectLoaded={(newState) => {
                // Recalculate processing results if we have all the data
                if (newState.clientAccounts.length > 0 && 
                    newState.cncjAccounts.length > 0 && 
                    newState.generalAccounts.length > 0) {
                  processClientAccounts(newState.clientAccounts, newState.cncjAccounts, newState.generalAccounts);
                  
                  // If user was at step 6 or beyond, recalculate CNCJ conflicts ONLY if no manual corrections exist
                  // Wait for processing to complete, then check results
                  if (newState.currentStep === 'step6' || newState.currentStep === 'step7' || newState.currentStep === 'stepFinal') {
                    setTimeout(() => {
                      // Check if processing results are available
                      if (state.result) {
                        const mergedAccounts = newState.clientAccounts.map(account => {
                          const replacementCode = newState.replacementCodes[account.id];
                          if (replacementCode?.trim()) {
                            return { ...account, number: replacementCode.trim() };
                          }
                          return account;
                        });
                        
                        const cncjConflicts = processCncjConflicts(mergedAccounts, newState.cncjAccounts);
                        dispatch({ type: 'SET_CNCJ_CONFLICT_RESULT', payload: cncjConflicts });
                        
                        // Only recalculate corrections if user hasn't made manual changes
                        const hasManualCorrections = Object.keys(newState.cncjConflictCorrections).length > 0;
                        if (!hasManualCorrections) {
                          const corrections = autoCorrectCncjConflicts(cncjConflicts.duplicates, newState.cncjAccounts, mergedAccounts);
                          dispatch({ type: 'SET_CNCJ_CONFLICT_CORRECTIONS', payload: corrections });
                        }
                      }
                    }, 600); // Wait for processClientAccounts to complete
                  }
                }
              }}
            />
          </div>
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
              cncjFileInfo={state.cncjFileInfo}
              loading={state.loading}
              onFileLoaded={handleFileLoaded}
              onFileCleared={handleFileCleared}
              onError={handleError}
              clientAccounts={state.clientAccounts}
              generalAccounts={state.generalAccounts}
              cncjAccounts={state.cncjAccounts}
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
              mergedClientAccounts={mergedClientAccounts}
              generalAccounts={state.generalAccounts}
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
              replacementCodes={state.replacementCodes}
              cncjReplacementCodes={state.cncjReplacementCodes}
              result={state.result}
              cncjConflictResult={state.cncjConflictResult}
              cncjConflictCorrections={state.cncjConflictCorrections}
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

              </div>
    </div>
  );
};

// Ajout des helpers de test pour le développement
const AppWithTestHelpers: React.FC = () => {
  const app = <App />;
  
  useEffect(() => {
    // Initialiser les helpers de test uniquement en mode développement
    if (import.meta.env.DEV) {
      setupTestHelpers({
        onFileLoaded: (accounts, source, _fileInfo) => {
          console.log(`Test helper - File loaded for ${source}:`, accounts.length, accounts);
        },
        onFileCleared: (source) => {
          console.log(`Test helper - File cleared for ${source}`);
        }
      });
    }
  }, []);

  return app;
};

export default AppWithTestHelpers;
