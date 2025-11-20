import React, { useReducer, useCallback, useMemo } from 'react';
import { FileUploader } from './components/FileUploader';
import { ResultsDisplay } from './components/ResultsDisplay';
import { NormalizationStep } from './components/NormalizationStep';
import { Account, ProcessingResult, FileMetadata, AppState, MergeInfo } from './types/accounts';
import { processAccounts, mergeIdenticalAccounts, findAccountsNeedingNormalization, applyNormalization } from './utils/accountUtils';
import { cleanupFutureSteps } from './utils/stepCleanup';
import { useStepValidation } from './hooks/useStepValidation';

type AppAction = 
  | { type: 'SET_CLIENT_ACCOUNTS'; payload: Account[] }
  | { type: 'SET_CNCJ_ACCOUNTS'; payload: Account[] }
  | { type: 'SET_CLIENT_FILE_INFO'; payload: FileMetadata | null }
  | { type: 'SET_CNCJ_FILE_INFO'; payload: FileMetadata | null }
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
  | { type: 'SET_CNCJ_CONFLICT_SUGGESTIONS'; payload: { [key: string]: string | 'error' } }
  | { type: 'SET_FINAL_FILTER'; payload: 'all' | 'step4' | 'step6' | 'step4+step6' }
  | { type: 'SET_ACCOUNTS_NEEDING_NORMALIZATION'; payload: import('./types/accounts').NormalizationAccount[] }
  | { type: 'SET_NORMALIZATION_APPLIED'; payload: boolean };

const initialState: AppState = {
  clientAccounts: [],
  cncjAccounts: [],
  clientFileInfo: null,
  cncjFileInfo: null,
  result: null,
  loading: false,
  errors: [],
  currentStep: 'step1',
  replacementCodes: {},
  cncjReplacementCodes: {},
  mergeInfo: [],
  cncjConflictResult: null,
  cncjConflictSuggestions: {},
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
    case 'SET_CLIENT_FILE_INFO':
      return { ...state, clientFileInfo: action.payload };
    case 'SET_CNCJ_FILE_INFO':
      return { ...state, cncjFileInfo: action.payload };
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
    case 'SET_CNCJ_CONFLICT_SUGGESTIONS':
      return { ...state, cncjConflictSuggestions: action.payload };
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

  const processClientAccounts = useCallback((clientAccounts: Account[], cncjAccounts: Account[]) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    // Simulate processing delay for better UX
    setTimeout(() => {
      const result = processAccounts(clientAccounts, cncjAccounts);
      dispatch({ type: 'SET_RESULT', payload: result });
    }, 500);
  }, []);

  const handleFileLoaded = useCallback((accounts: Account[], source: 'client' | 'cncj', fileInfo: FileMetadata) => {
    dispatch({ type: 'CLEAR_ERRORS' });
    
    // Réinitialiser toutes les étapes et données de traitement quand de nouveaux fichiers sont chargés
    dispatch({ type: 'SET_CURRENT_STEP', payload: 'step1' });
    dispatch({ type: 'CLEAR_REPLACEMENT_CODES' });
    dispatch({ type: 'SET_RESULT', payload: null });
    dispatch({ type: 'SET_CNCJ_CONFLICT_RESULT', payload: null });
    dispatch({ type: 'SET_CNCJ_CONFLICT_SUGGESTIONS', payload: {} });
    
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
          processClientAccounts(mergedAccounts, state.cncjAccounts);
        }
      }
    } else {
      dispatch({ type: 'SET_CNCJ_FILE_INFO', payload: fileInfo });
      // Only update accounts if not in loading state
      if (fileInfo.loadStatus !== 'loading') {
        dispatch({ type: 'SET_CNCJ_ACCOUNTS', payload: accounts });
        
        // Process if we have both files and both are fully loaded (not loading)
        if (state.clientAccounts.length > 0 && state.clientFileInfo?.loadStatus !== 'loading') {
          processClientAccounts(state.clientAccounts, accounts);
        }
      }
    }
  }, [state.cncjAccounts, state.clientAccounts, state.cncjFileInfo, state.clientFileInfo, processClientAccounts]);

  const handleError = useCallback((errors: string[]) => {
    dispatch({ type: 'SET_ERRORS', payload: errors });
  }, []);

  const handleFileCleared = useCallback((source: 'client' | 'cncj') => {
    if (source === 'client') {
      dispatch({ type: 'SET_CLIENT_ACCOUNTS', payload: [] });
      dispatch({ type: 'SET_CLIENT_FILE_INFO', payload: null });
    } else {
      dispatch({ type: 'SET_CNCJ_ACCOUNTS', payload: [] });
      dispatch({ type: 'SET_CNCJ_FILE_INFO', payload: null });
    }
  }, []);

  const resetData = useCallback(() => {
    console.log('resetData called');
    dispatch({ type: 'SET_CLIENT_ACCOUNTS', payload: [] });
    dispatch({ type: 'SET_CNCJ_ACCOUNTS', payload: [] });
    dispatch({ type: 'SET_CLIENT_FILE_INFO', payload: null });
    dispatch({ type: 'SET_CNCJ_FILE_INFO', payload: null });
    dispatch({ type: 'SET_RESULT', payload: null });
    dispatch({ type: 'CLEAR_ERRORS' });
    dispatch({ type: 'SET_CURRENT_STEP', payload: 'step1' });
    dispatch({ type: 'CLEAR_REPLACEMENT_CODES' });
  }, []);

  const handleNext = useCallback(() => {
    console.log('Navigation vers l\'étape suivante');
    if (!state.result) {
      dispatch({ type: 'SET_ERRORS', payload: ['Veuillez attendre que les données soient traitées avant de continuer'] });
      return;
    }
    dispatch({ type: 'SET_CURRENT_STEP', payload: 'step2' });
  }, [state.result]);

  const handleMergeNext = useCallback(() => {
    console.log('Visualisation des fusions terminée - passage à la normalisation');
    
    // Détecter les comptes nécessitant une normalisation
    const accountsNeedingNormalization = findAccountsNeedingNormalization(state.clientAccounts);
    dispatch({ type: 'SET_ACCOUNTS_NEEDING_NORMALIZATION', payload: accountsNeedingNormalization });
    
    // Naviguer vers l'étape de normalisation
    dispatch({ type: 'SET_CURRENT_STEP', payload: 'step3' });
  }, [state.clientAccounts]);

  const handleNormalizationNext = useCallback(() => {
    console.log('Normalisation terminée - passage aux doublons');
    
    if (state.accountsNeedingNormalization.length > 0 && !state.isNormalizationApplied) {
      // Appliquer la normalisation
      const normalizedClientAccounts = applyNormalization(state.clientAccounts, state.accountsNeedingNormalization);
      dispatch({ type: 'SET_CLIENT_ACCOUNTS', payload: normalizedClientAccounts });
      dispatch({ type: 'SET_NORMALIZATION_APPLIED', payload: true });
      
      // Reprocesser les comptes avec les données normalisées
      processClientAccounts(normalizedClientAccounts, state.cncjAccounts);
    } else {
      // Pas de normalisation nécessaire ou déjà appliquée
      dispatch({ type: 'SET_CURRENT_STEP', payload: 'step4' });
    }
  }, [state.clientAccounts, state.cncjAccounts, state.accountsNeedingNormalization, state.isNormalizationApplied, processClientAccounts]);

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
    
    const suggestions: { [accountId: string]: string | 'error' } = {};
    
    // Trier les conflits pour des résultats déterministes
    const sortedConflicts = [...conflicts].sort((a, b) => a.number.localeCompare(b.number));
    
    sortedConflicts.forEach(conflict => {
      let currentCode = conflict.number;
      let attempts = 0;
      const maxAttempts = 9; // Maximum 9 tentatives avant de changer de dizaine
      
      while (attempts < maxAttempts) {
        const suggestedCode = incrementCodeWithConstraint(currentCode);
        
        if (suggestedCode === null) {
          suggestions[conflict.id] = 'error';
          break;
        }
        
        // Vérifier que le code n'est ni dans CNCJ, ni dans les clients fusionnés, ni déjà suggéré
        if (!usedCodes.has(suggestedCode)) {
          suggestions[conflict.id] = suggestedCode;
          usedCodes.add(suggestedCode); // Ajouter immédiatement pour éviter les conflits avec les prochaines suggestions
          break;
        }
        
        currentCode = suggestedCode;
        attempts++;
      }
      
      if (attempts >= maxAttempts) {
        suggestions[conflict.id] = 'error';
      }
    });
    
    return suggestions;
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
      unmatchedClients: [] // Pas de non-correspondances pertinentes pour cette étape
    };
  }, []);

  const handleDuplicatesNext = useCallback(() => {
    console.log('Doublons résolus - passage à la révision des corrections');
    if (!state.result) {
      dispatch({ type: 'SET_ERRORS', payload: ['Veuillez attendre que les données soient traitées avant de continuer'] });
      return;
    }

    // Naviguer vers l'étape de révision des corrections
    dispatch({ type: 'SET_CURRENT_STEP', payload: 'step5' });
  }, [state.result]);

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

      // Étape 2 : Générer les suggestions d'auto-correction
      const suggestions = autoCorrectCncjConflicts(cncjConflicts.duplicates, state.cncjAccounts, mergedClientAccounts);
      dispatch({ type: 'SET_CNCJ_CONFLICT_SUGGESTIONS', payload: suggestions });
    } else {
      console.log('Retour à step5 - conservation des conflits CNCJ existants et des modifications manuelles');
    }

    // Étape 5 : Naviguer vers step 6
    dispatch({ type: 'SET_CURRENT_STEP', payload: 'step6' });
  }, [state.result, state.cncjAccounts, mergedClientAccounts, processCncjConflicts, autoCorrectCncjConflicts, state.cncjConflictResult]);

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

  // Vérifie si les deux fichiers sont chargés correctement et sans erreurs
  const canProceed = state.clientAccounts.length > 0 && 
                    state.cncjAccounts.length > 0 && 
                    state.errors.length === 0 &&
                    !state.loading &&
                    state.result !== null;

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

        {/* Upload Section - Always rendered */}
        <div style={{display: state.currentStep === 'step1' ? 'block' : 'none'}} className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="mb-6 text-center">
            <span className="inline-block px-6 py-3 bg-green-100 text-green-800 rounded-full text-lg font-bold">
              Step 1
            </span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            📁 Chargement des fichiers
          </h2>
          
          <FileUploader
            onFileLoaded={handleFileLoaded}
            onFileCleared={handleFileCleared}
            onError={handleError}
            label="📋 Fichier des comptes clients"
            source="client"
            disabled={state.loading}
            fileInfo={state.clientFileInfo}
          />
          
          <FileUploader
            onFileLoaded={handleFileLoaded}
            onFileCleared={handleFileCleared}
            onError={handleError}
            label="🏛️ Fichier des comptes CNCJ"
            source="cncj"
            disabled={state.loading}
            fileInfo={state.cncjFileInfo}
          />

          {/* Reset Button */}
          {(state.clientAccounts.length > 0 || state.cncjAccounts.length > 0) && (
            <div className="mt-4 text-center space-x-4">
              <button
                onClick={resetData}
                disabled={state.loading}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                🔄 Réinitialiser
              </button>
              
              {/* Next Button - affiché uniquement si les deux fichiers sont chargés sans erreurs */}
              {canProceed && (
                <button
                  onClick={handleNext}
                  disabled={state.loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  Suivant →
                </button>
              )}
            </div>
          )}
        </div>

        {/* Merge Visualization Section - Step 2 */}
        <div style={{display: state.currentStep === 'step2' ? 'block' : 'none'}} className="bg-white shadow rounded-lg p-6 mb-6">
          {(console.log('🔍 DEBUG: Step 2 rendering, mergeInfo:', state.mergeInfo, 'length:', state.mergeInfo.length), null)}
          <div className="mb-6 text-center">
            <span className="inline-block px-6 py-3 bg-green-100 text-green-800 rounded-full text-lg font-bold">
              Step 2
            </span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            🔗 Visualisation des fusions automatiques
          </h2>
          
          {state.mergeInfo.length > 0 ? (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{state.mergeInfo.length}</div>
                  <div className="text-gray-600">{state.mergeInfo.length === 1 ? 'fusion' : 'fusions'} automatique{state.mergeInfo.length > 1 ? 's' : ''}</div>
                </div>
              </div>
              
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-4 py-2 text-left">Numéro</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Titre</th>
                      <th className="border border-gray-300 px-4 py-2 text-center">Nombre fusionné</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.mergeInfo.map((info, index) => (
                      <tr key={index} className="bg-blue-50">
                        <td className="border border-gray-300 px-4 py-2 font-mono">{info.number}</td>
                        <td className="border border-gray-300 px-4 py-2">{info.title || 'Sans titre'}</td>
                        <td className="border border-gray-300 px-4 py-2 text-center font-bold text-blue-600">
                          {info.mergedCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-sm text-gray-600 text-center">
                  💡 Les comptes ayant le même numéro ET le même titre ont été automatiquement fusionnés pour éviter les doublons.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
              <div className="text-gray-500">
                <div className="text-lg mb-2">✅ Aucune fusion nécessaire</div>
                <p className="text-sm">Tous les comptes sont uniques (même numéro ET titre)</p>
              </div>
            </div>
          )}
          
          <div className="mt-6 text-center space-x-4">
            <button
              onClick={() => dispatch({ type: 'SET_CURRENT_STEP', payload: 'step1' })}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              ← Retour
            </button>
            
            <button
              onClick={handleMergeNext}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Suivant →
            </button>
          </div>
        </div>

        {/* Normalization Step - Step 3 */}
        <div style={{display: state.currentStep === 'step3' ? 'block' : 'none'}}>
          <NormalizationStep
            accountsNeedingNormalization={state.accountsNeedingNormalization}
            onApplyNormalization={handleNormalizationNext}
            onBack={() => dispatch({ type: 'SET_CURRENT_STEP', payload: 'step2' })}
          />
        </div>

        {/* Results Section - Step 4 */}
        <div style={{display: state.currentStep === 'step4' ? 'block' : 'none'}} className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="mb-6 text-center">
            <span className="inline-block px-6 py-3 bg-green-100 text-green-800 rounded-full text-lg font-bold">
              Step 4
            </span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            📋 Vérification des doublons comptes clients
          </h2>
          
          <ResultsDisplay
              key={state.currentStep} 
            result={state.result} 
            loading={state.loading} 
            showOnly="duplicates"
            replacementCodes={state.replacementCodes}
            onReplacementCodeChange={handleReplacementCodeChange}
          />
          
          <div className="mt-6 text-center space-x-4">
            <button
              onClick={() => dispatch({ type: 'SET_CURRENT_STEP', payload: 'step3' })}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              ← Retour
            </button>
            
            {/* Bouton Suivant - s'affiche uniquement si tous les doublons sont résolus */}
            {allDuplicatesResolved && (
              <button
                onClick={handleDuplicatesNext}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Suivant →
              </button>
            )}
          </div>
        </div>

        {/* Review Corrections Section - Step 4 */}
        <div style={{display: state.currentStep === 'step5' ? 'block' : 'none'}} className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="mb-6 text-center">
            <span className="inline-block px-6 py-3 bg-green-100 text-green-800 rounded-full text-lg font-bold">
              Step 5
            </span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            📋 Révision des corrections ({duplicateCorrectionsCount} corrections doublons appliquées)
          </h2>
          
          <ResultsDisplay
              key={state.currentStep} 
            result={state.result} 
            loading={state.loading} 
            showOnly="review"
            replacementCodes={state.replacementCodes}
            onReplacementCodeChange={undefined}
            mergedClientAccounts={mergedClientAccounts}
            originalClientAccounts={state.clientAccounts}
            duplicateIdsFromStep4={duplicateIdsFromStep4}
          />
          
          <div className="mt-6 text-center space-x-4">
            <button
              onClick={() => dispatch({ type: 'SET_CURRENT_STEP', payload: 'step4' })}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              ← Retour
            </button>
            
            <button
              onClick={handleReviewNext}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Suivant →
            </button>
          </div>
        </div>

        {/* CNCJ Reserved Codes Section - Step 5 */}
        <div style={{display: state.currentStep === 'step6' ? 'block' : 'none'}} className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="mb-6 text-center">
            <span className="inline-block px-6 py-3 bg-green-100 text-green-800 rounded-full text-lg font-bold">
              Step 6
            </span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            🚫 Codes clients réservés (homologués CNCJ)
          </h2>
          
          <ResultsDisplay
              key={state.currentStep} 
            result={state.cncjConflictResult} 
            loading={state.loading} 
            showOnly="duplicates"
            replacementCodes={state.cncjReplacementCodes}
            onReplacementCodeChange={handleCncjReplacementCodeChange}
            conflictType="cncj-conflicts"
            suggestions={state.cncjConflictSuggestions}
            cncjCodes={cncjCodes}
          />
          
          <div className="mt-6 text-center space-x-4">
            <button
              onClick={() => dispatch({ type: 'SET_CURRENT_STEP', payload: 'step5' })}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              ← Retour
            </button>
            
            {/* Bouton Suivant - s'affiche uniquement si tous les conflits CNCJ sont résolus */}
            {allCncjConflictsResolved && (
              <button
                onClick={() => dispatch({ type: 'SET_CURRENT_STEP', payload: 'stepFinal' })}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Suivant →
              </button>
            )}
          </div>
        </div>

        {/* Final Summary Section - Step Final */}
        <div style={{display: state.currentStep === 'stepFinal' ? 'block' : 'none'}} className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="mb-6 text-center">
            <span className="inline-block px-6 py-3 bg-green-100 text-green-800 rounded-full text-lg font-bold">
              Récapitulatif Final
            </span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            📊 Résumé des corrections appliquées
          </h2>
          
          {/* Préparer les données pour le récapitulatif */}
          {(() => {
            // Optimisation: créer des Sets pour les recherches rapides
            const step4Ids = new Set(state.result?.duplicates?.map(d => d.id) || []);
            const step6Ids = new Set(state.cncjConflictResult?.duplicates?.map(d => d.id) || []);
            
            const finalSummaryData = state.clientAccounts.map(account => {
              const mergedAccount = mergedClientAccounts.find(m => m.id === account.id);
              const suggestedCode = state.cncjConflictSuggestions[account.id];
              
              // Déterminer la source de la modification (gérer les doubles modifications)
              const isStep4Duplicate = step4Ids.has(account.id);
              const isStep6Conflict = step6Ids.has(account.id);
              
              let modificationSource = null;
              if (isStep4Duplicate && isStep6Conflict) {
                modificationSource = 'step4+step6';
              } else if (isStep6Conflict) {
                modificationSource = 'step6';
              } else if (isStep4Duplicate) {
                modificationSource = 'step4';
              }
              
              // Code corrigé : toujours montrer la correction step 4 si elle existe
              const correctedCode = isStep4Duplicate 
                ? (mergedAccount?.number || account.number)
                : account.number;
              
              return {
                id: account.id,
                title: account.title || 'Sans titre',
                originalCode: account.number,
                correctedCode: correctedCode,
                suggestedCode: suggestedCode === 'error' ? 'Erreur' : (suggestedCode || '-'),
                wasModified: state.replacementCodes[account.id] !== undefined,
                modificationSource,
                isStep4Duplicate,
                isStep6Conflict
              };
            });

            const modifiedCount = finalSummaryData.filter(row => row.wasModified).length;
            const step4Count = finalSummaryData.filter(row => row.isStep4Duplicate).length;
            const step6Count = finalSummaryData.filter(row => row.isStep6Conflict).length;
            const doubleModifiedCount = finalSummaryData.filter(row => row.modificationSource === 'step4+step6').length;
            const totalCount = finalSummaryData.length;

            // Fonction pour obtenir le style de ligne selon la source
            const getRowStyle = (source: string | null) => {
              switch (source) {
                case 'step4': return 'bg-blue-50 border-l-4 border-blue-400';
                case 'step6': return 'bg-orange-50 border-l-4 border-orange-400';
                case 'step4+step6': return 'bg-purple-50 border-l-4 border-purple-400';
                default: return '';
              }
            };

            return (
              <div className="space-y-4">
                {/* Statistiques détaillées */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="grid grid-cols-5 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{totalCount}</div>
                      <div className="text-gray-600">Total comptes</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{modifiedCount}</div>
                      <div className="text-gray-600">Comptes modifiés</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{step4Count}</div>
                      <div className="text-gray-600">Correction doublons</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{step6Count}</div>
                      <div className="text-gray-600">Suggestions hors CNCJ</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{doubleModifiedCount}</div>
                      <div className="text-gray-600">Double modification</div>
                    </div>
                  </div>
                </div>

                {/* Légende */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-center space-x-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-blue-50 border-l-4 border-blue-400 rounded"></div>
                      <span className="text-gray-700">Correction doublons</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-orange-50 border-l-4 border-orange-400 rounded"></div>
                      <span className="text-gray-700">Suggestions hors CNCJ</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-purple-50 border-l-4 border-purple-400 rounded"></div>
                      <span className="text-gray-700">Double modification</span>
                    </div>
                  </div>
                </div>

                {/* Boutons de filtrage */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="mb-4 flex justify-center space-x-2">
                    {(() => {
                      const totalCount = finalSummaryData.length;
                      const step4Count = finalSummaryData.filter(row => row.modificationSource === 'step4').length;
                      const step6Count = finalSummaryData.filter(row => row.modificationSource === 'step6').length;
                      const doubleModifiedCount = finalSummaryData.filter(row => row.modificationSource === 'step4+step6').length;
                      
                      return (
                        <>
                          <button
                            onClick={() => dispatch({ type: 'SET_FINAL_FILTER', payload: 'all' })}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                              state.finalFilter === 'all' 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            Tous ({totalCount})
                          </button>
                          <button
                            onClick={() => dispatch({ type: 'SET_FINAL_FILTER', payload: 'step4' })}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                              state.finalFilter === 'step4' 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            Doublons corrigés ({step4Count})
                          </button>
                          <button
                            onClick={() => dispatch({ type: 'SET_FINAL_FILTER', payload: 'step6' })}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                              state.finalFilter === 'step6' 
                                ? 'bg-orange-600 text-white' 
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            Suggestions CNCJ ({step6Count})
                          </button>
                          <button
                            onClick={() => dispatch({ type: 'SET_FINAL_FILTER', payload: 'step4+step6' })}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                              state.finalFilter === 'step4+step6' 
                                ? 'bg-purple-600 text-white' 
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            Double modification ({doubleModifiedCount})
                          </button>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Tableau récapitulatif */}
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-4 py-2 text-left">Titre</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Code original</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Code corrigé</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Code suggéré (CNCJ)</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Code final</th>
                      </tr>
                    </thead>
                    <tbody>
                      {finalSummaryData
                        .filter(row => {
                          if (state.finalFilter === 'all') return true;
                          return row.modificationSource === state.finalFilter;
                        })
                        .map((row) => (
                        <tr key={row.id} className={getRowStyle(row.modificationSource)}>
                          <td className="border border-gray-300 px-4 py-2">
                            <div className="flex items-center space-x-2">
                              {row.title}
                            </div>
                          </td>
                          <td className="border border-gray-300 px-4 py-2 font-mono">{row.originalCode}</td>
                          <td className="border border-gray-300 px-4 py-2 font-mono">
                            {row.correctedCode === row.originalCode ? '-' : row.correctedCode}
                          </td>
                          <td className="border border-gray-300 px-4 py-2 font-mono">{row.suggestedCode}</td>
                          <td className="border border-gray-300 px-4 py-2 font-mono">
                            {row.modificationSource === 'step4+step6' ? (
                              <span className="text-purple-700 font-bold">
                                {row.suggestedCode === 'Erreur' ? row.correctedCode : row.suggestedCode}
                              </span>
                            ) : row.modificationSource === 'step4' ? (
                              <span className="text-blue-700 font-bold">
                                {row.correctedCode}
                              </span>
                            ) : row.modificationSource === 'step6' ? (
                              <span className="text-orange-700 font-bold">
                                {row.suggestedCode === 'Erreur' ? row.originalCode : row.suggestedCode}
                              </span>
                            ) : (
                              <span className="text-gray-700">
                                {row.originalCode}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Boutons d'action */}
                <div className="mt-6 text-center space-x-4">
                  <button
                    onClick={() => dispatch({ type: 'SET_CURRENT_STEP', payload: 'step6' })}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    ← Retour
                  </button>
                  
                  <button
                    onClick={() => {
                      // Exporter les résultats finaux en CSV avec titre, code d'origine et code final
                      const csvHeaders = ['account_title', 'original_client_code', 'final_code'];
                      
                      const csvRows = finalSummaryData
                        .filter(row => {
                          if (state.finalFilter === 'all') return true;
                          return row.modificationSource === state.finalFilter;
                        })
                        .map(row => {
                          // Déterminer le code final selon la même logique que le tableau
                          let finalCode;
                          if (row.modificationSource === 'step4+step6') {
                            finalCode = row.suggestedCode === 'Erreur' ? row.correctedCode : row.suggestedCode;
                          } else if (row.modificationSource === 'step4') {
                            finalCode = row.correctedCode;
                          } else if (row.modificationSource === 'step6') {
                            finalCode = row.suggestedCode === 'Erreur' ? row.originalCode : row.suggestedCode;
                          } else {
                            finalCode = row.originalCode;
                          }
                          
                          return [
                            row.title,
                            row.originalCode,
                            finalCode
                          ];
                        });
                      
                      const csvContent = [
                        csvHeaders.join(','),
                        ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
                      ].join('\n');
                      
                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'correspondances-comptes.csv';
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    📥 Exporter les correspondances
                  </button>
                </div>
              </div>
            );
          })()}
        </div>

              </div>
    </div>
  );
};

export default App;
