import React, { useReducer, useCallback, useMemo } from 'react';
import { FileUploader } from './components/FileUploader';
import { ResultsDisplay } from './components/ResultsDisplay';
import { Account, ProcessingResult, FileMetadata } from './types/accounts';
import { processAccounts } from './utils/accountUtils';

interface AppState {
  clientAccounts: Account[];
  cncjAccounts: Account[];
  clientFileInfo: FileMetadata | null;
  cncjFileInfo: FileMetadata | null;
  result: ProcessingResult | null;
  loading: boolean;
  errors: string[];
  currentStep: 'step1' | 'step2' | 'step3' | 'step4';
  replacementCodes: { [key: string]: string };
  cncjConflictResult: ProcessingResult | null;
  cncjConflictSuggestions: { [key: string]: string | 'error' };
}

type AppAction = 
  | { type: 'SET_CLIENT_ACCOUNTS'; payload: Account[] }
  | { type: 'SET_CNCJ_ACCOUNTS'; payload: Account[] }
  | { type: 'SET_CLIENT_FILE_INFO'; payload: FileMetadata | null }
  | { type: 'SET_CNCJ_FILE_INFO'; payload: FileMetadata | null }
  | { type: 'SET_RESULT'; payload: ProcessingResult | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERRORS'; payload: string[] }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'SET_CURRENT_STEP'; payload: 'step1' | 'step2' | 'step3' | 'step4' }
  | { type: 'SET_REPLACEMENT_CODE'; payload: { accountId: string; code: string } }
  | { type: 'CLEAR_REPLACEMENT_CODES' }
  | { type: 'SET_CNCJ_CONFLICT_RESULT'; payload: ProcessingResult | null }
  | { type: 'SET_CNCJ_CONFLICT_SUGGESTIONS'; payload: { [key: string]: string | 'error' } };

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
  cncjConflictResult: null,
  cncjConflictSuggestions: {}
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
    case 'SET_CURRENT_STEP':
      return { ...state, currentStep: action.payload };
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
    case 'SET_CNCJ_CONFLICT_RESULT':
      return { ...state, cncjConflictResult: action.payload };
    case 'SET_CNCJ_CONFLICT_SUGGESTIONS':
      return { ...state, cncjConflictSuggestions: action.payload };
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
    
    if (source === 'client') {
      dispatch({ type: 'SET_CLIENT_FILE_INFO', payload: fileInfo });
      // Only update accounts if not in loading state
      if (fileInfo.loadStatus !== 'loading') {
        dispatch({ type: 'SET_CLIENT_ACCOUNTS', payload: accounts });
      }
    } else {
      dispatch({ type: 'SET_CNCJ_FILE_INFO', payload: fileInfo });
      // Only update accounts if not in loading state
      if (fileInfo.loadStatus !== 'loading') {
        dispatch({ type: 'SET_CNCJ_ACCOUNTS', payload: accounts });
      }
    }

    // Process if we have both files and both are fully loaded (not loading)
    if (fileInfo.loadStatus !== 'loading') {
      if (source === 'client' && state.cncjAccounts.length > 0 && state.cncjFileInfo?.loadStatus !== 'loading') {
        processClientAccounts(accounts, state.cncjAccounts);
      } else if (source === 'cncj' && state.clientAccounts.length > 0 && state.clientFileInfo?.loadStatus !== 'loading') {
        processClientAccounts(state.clientAccounts, accounts);
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
    // Utiliser la même logique que processAccounts mais avec les comptes fusionnés
    return processAccounts(mergedClientAccounts, cncjAccounts);
  }, []);

  const handleDuplicatesNext = useCallback(() => {
    console.log('Doublons résolus - passage à la révision des corrections');
    if (!state.result) {
      dispatch({ type: 'SET_ERRORS', payload: ['Veuillez attendre que les données soient traitées avant de continuer'] });
      return;
    }

    // Naviguer vers l'étape de révision des corrections
    dispatch({ type: 'SET_CURRENT_STEP', payload: 'step3' });
  }, [state.result]);

  const handleReviewNext = useCallback(() => {
    console.log('Révision terminée - passage aux conflits CNCJ');
    if (!state.result) {
      dispatch({ type: 'SET_ERRORS', payload: ['Veuillez attendre que les données soient traitées avant de continuer'] });
      return;
    }

    // Étape 1 : Traiter les conflits CNCJ avec les comptes fusionnés
    const cncjConflicts = processCncjConflicts(mergedClientAccounts, state.cncjAccounts);
    dispatch({ type: 'SET_CNCJ_CONFLICT_RESULT', payload: cncjConflicts });

    // Étape 2 : Générer les suggestions d'auto-correction
    const suggestions = autoCorrectCncjConflicts(cncjConflicts.duplicates, state.cncjAccounts, mergedClientAccounts);
    dispatch({ type: 'SET_CNCJ_CONFLICT_SUGGESTIONS', payload: suggestions });

    // Étape 3 : Naviguer vers step 4
    dispatch({ type: 'SET_CURRENT_STEP', payload: 'step4' });
  }, [state.result, state.cncjAccounts, mergedClientAccounts, processCncjConflicts, autoCorrectCncjConflicts]);

  const handleReplacementCodeChange = useCallback((accountId: string, code: string) => {
    dispatch({ type: 'SET_REPLACEMENT_CODE', payload: { accountId, code } });
  }, []);

  // Calculer si tous les doublons sont résolus (optimisé avec useMemo)
  const allDuplicatesResolved = useMemo(() => {
    if (!state.result || state.result.duplicates.length === 0) return true;
    
    // Obtenir les IDs des comptes doublons pour filtrer les codes
    const duplicateIds = new Set(state.result.duplicates.map(d => d.id));
    
    // Calculer les occurrences de codes SEULEMENT pour les doublons
    const codeOccurrences: { [key: string]: string[] } = {};
    Object.entries(state.replacementCodes).forEach(([accountId, code]) => {
      if (!duplicateIds.has(accountId)) return;
      const trimmedCode = code?.trim();
      if (trimmedCode) {
        if (!codeOccurrences[trimmedCode]) {
          codeOccurrences[trimmedCode] = [];
        }
        codeOccurrences[trimmedCode].push(accountId);
      }
    });
    
    // Obtenir tous les codes clients originaux (sauf les doublons)
    const allOriginalCodes = new Set([
      ...state.result.uniqueClients.map(acc => acc.number),
      ...state.result.matches.map(acc => acc.number), 
      ...state.result.unmatchedClients.map(acc => acc.number)
    ]);
    
    // Vérifier que tous les doublons ont un code valide et unique
    return state.result.duplicates.every((account) => {
      const currentCode = state.replacementCodes[account.id]?.trim();
      const isEmpty = !currentCode;
      const isDuplicateWithOriginal = currentCode && allOriginalCodes.has(currentCode);
      const isDuplicateWithReplacement = currentCode && (codeOccurrences[currentCode]?.length || 0) > 1;
      const isDuplicateCode = isDuplicateWithOriginal || isDuplicateWithReplacement;
      
      return !isEmpty && !isDuplicateCode;
    });
  }, [state.result, state.replacementCodes]);

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

        {/* Results Section - Always rendered */}
        <div style={{display: state.currentStep === 'step2' ? 'block' : 'none'}} className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="mb-6 text-center">
            <span className="inline-block px-6 py-3 bg-green-100 text-green-800 rounded-full text-lg font-bold">
              Step 2
            </span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            📋 Vérification des doublons comptes clients
          </h2>
          
          <ResultsDisplay 
            result={state.result} 
            loading={state.loading} 
            showOnly="duplicates"
            replacementCodes={state.replacementCodes}
            onReplacementCodeChange={handleReplacementCodeChange}
          />
          
          <div className="mt-6 text-center space-x-4">
            <button
              onClick={() => dispatch({ type: 'SET_CURRENT_STEP', payload: 'step1' })}
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

        {/* Review Corrections Section - Step 3 */}
        <div style={{display: state.currentStep === 'step3' ? 'block' : 'none'}} className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="mb-6 text-center">
            <span className="inline-block px-6 py-3 bg-green-100 text-green-800 rounded-full text-lg font-bold">
              Step 3
            </span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            📋 Révision des corrections
          </h2>
          
          <ResultsDisplay 
            result={state.result} 
            loading={state.loading} 
            showOnly="review"
            replacementCodes={state.replacementCodes}
            onReplacementCodeChange={undefined}
            mergedClientAccounts={mergedClientAccounts}
          />
          
          <div className="mt-6 text-center space-x-4">
            <button
              onClick={() => dispatch({ type: 'SET_CURRENT_STEP', payload: 'step2' })}
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

        {/* CNCJ Reserved Codes Section - Step 4 */}
        <div style={{display: state.currentStep === 'step4' ? 'block' : 'none'}} className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="mb-6 text-center">
            <span className="inline-block px-6 py-3 bg-green-100 text-green-800 rounded-full text-lg font-bold">
              Step 4
            </span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            🚫 Codes clients réservés (homologués CNCJ)
          </h2>
          
          <ResultsDisplay 
            result={state.cncjConflictResult} 
            loading={state.loading} 
            showOnly="duplicates"
            replacementCodes={state.replacementCodes}
            onReplacementCodeChange={handleReplacementCodeChange}
            conflictType="cncj-conflicts"
            suggestions={state.cncjConflictSuggestions}
            cncjCodes={cncjCodes}
          />
          
          <div className="mt-6 text-center space-x-4">
            <button
              onClick={() => dispatch({ type: 'SET_CURRENT_STEP', payload: 'step3' })}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              ← Retour
            </button>
          </div>
        </div>

              </div>
    </div>
  );
};

export default App;
