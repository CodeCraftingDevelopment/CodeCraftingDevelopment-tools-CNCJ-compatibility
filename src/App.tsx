import React, { useReducer, useCallback, useState } from 'react';
import { FileUploader } from './components/FileUploader';
import { Account, ProcessingResult } from './types/accounts';
import { processAccounts } from './utils/accountUtils';

interface AppState {
  clientAccounts: Account[];
  cncjAccounts: Account[];
  result: ProcessingResult | null;
  loading: boolean;
  errors: string[];
}

type AppAction = 
  | { type: 'SET_CLIENT_ACCOUNTS'; payload: Account[] }
  | { type: 'SET_CNCJ_ACCOUNTS'; payload: Account[] }
  | { type: 'SET_RESULT'; payload: ProcessingResult | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERRORS'; payload: string[] }
  | { type: 'CLEAR_ERRORS' };

const initialState: AppState = {
  clientAccounts: [],
  cncjAccounts: [],
  result: null,
  loading: false,
  errors: []
};

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_CLIENT_ACCOUNTS':
      return { ...state, clientAccounts: action.payload };
    case 'SET_CNCJ_ACCOUNTS':
      return { ...state, cncjAccounts: action.payload };
    case 'SET_RESULT':
      return { ...state, result: action.payload, loading: false };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERRORS':
      return { ...state, errors: action.payload };
    case 'CLEAR_ERRORS':
      return { ...state, errors: [] };
    default:
      return state;
  }
};

const App: React.FC = () => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const handleFileLoaded = useCallback((accounts: Account[], source: 'client' | 'cncj') => {
    dispatch({ type: 'CLEAR_ERRORS' });
    
    if (source === 'client') {
      dispatch({ type: 'SET_CLIENT_ACCOUNTS', payload: accounts });
    } else {
      dispatch({ type: 'SET_CNCJ_ACCOUNTS', payload: accounts });
    }

    // Process if we have both files
    if (source === 'client' && state.cncjAccounts.length > 0) {
      processClientAccounts(accounts, state.cncjAccounts);
    } else if (source === 'cncj' && state.clientAccounts.length > 0) {
      processClientAccounts(state.clientAccounts, accounts);
    }
  }, [state.cncjAccounts, state.clientAccounts]);

  const processClientAccounts = useCallback((clientAccounts: Account[], cncjAccounts: Account[]) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    // Simulate processing delay for better UX
    setTimeout(() => {
      const result = processAccounts(clientAccounts, cncjAccounts);
      dispatch({ type: 'SET_RESULT', payload: result });
    }, 500);
  }, []);

  const handleError = useCallback((errors: string[]) => {
    dispatch({ type: 'SET_ERRORS', payload: errors });
  }, []);

  const handleFileCleared = useCallback((source: 'client' | 'cncj') => {
    if (source === 'client') {
      dispatch({ type: 'SET_CLIENT_ACCOUNTS', payload: [] });
    } else {
      dispatch({ type: 'SET_CNCJ_ACCOUNTS', payload: [] });
    }
  }, []);

  const [resetKey, setResetKey] = useState(0);

  const resetData = useCallback(() => {
    console.log('resetData called');
    dispatch({ type: 'SET_CLIENT_ACCOUNTS', payload: [] });
    dispatch({ type: 'SET_CNCJ_ACCOUNTS', payload: [] });
    dispatch({ type: 'SET_RESULT', payload: null });
    dispatch({ type: 'CLEAR_ERRORS' });
    setResetKey(prev => prev + 1);
  }, []);

  const handleNext = useCallback(() => {
    console.log('Navigation vers l\'étape suivante');
    // Logique pour l'étape suivante à implémenter
  }, []);

  // Vérifie si les deux fichiers sont chargés correctement et sans erreurs
  const canProceed = state.clientAccounts.length > 0 && 
                    state.cncjAccounts.length > 0 && 
                    state.errors.length === 0;

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

        {/* File Upload Section */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="mb-6 text-center">
            <span className="inline-block px-6 py-3 bg-blue-100 text-blue-800 rounded-full text-lg font-bold">
              Step 1
            </span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            📁 Chargement des fichiers
          </h2>
          
          <FileUploader
            key={`client-${resetKey}`}
            onFileLoaded={handleFileLoaded}
            onFileCleared={handleFileCleared}
            onError={handleError}
            label="📋 Fichier des comptes clients"
            source="client"
            disabled={state.loading}
          />
          
          <FileUploader
            key={`cncj-${resetKey}`}
            onFileLoaded={handleFileLoaded}
            onFileCleared={handleFileCleared}
            onError={handleError}
            label="🏛️ Fichier des comptes CNCJ"
            source="cncj"
            disabled={state.loading}
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

              </div>
    </div>
  );
};

export default App;
