import { AppState } from '../types/accounts';

type Step = 'step1' | 'step2' | 'step3' | 'step4' | 'step5' | 'stepFinal';

interface CleanupConfig {
  replacementCodes?: boolean;
  cncjConflictResult?: boolean;
  cncjConflictSuggestions?: boolean;
  finalFilter?: boolean;
}

// Lookup table pour le nettoyage des étapes futures
const STEP_CLEANUP_CONFIG: Record<Step, CleanupConfig> = {
  step1: {
    replacementCodes: true,
    cncjConflictResult: true,
    cncjConflictSuggestions: true,
    finalFilter: true
  },
  step2: {
    replacementCodes: true,
    cncjConflictResult: true,
    cncjConflictSuggestions: true,
    finalFilter: true
  },
  step3: {
    cncjConflictResult: true,
    cncjConflictSuggestions: true,
    finalFilter: true
  },
  step4: {
    cncjConflictResult: true,
    cncjConflictSuggestions: true,
    finalFilter: true
  },
  step5: {
    finalFilter: true
  },
  stepFinal: {}
};

export const cleanupFutureSteps = (state: AppState, targetStep: Step): AppState => {
  const config = STEP_CLEANUP_CONFIG[targetStep];
  let newState = { ...state, currentStep: targetStep };
  
  // Appliquer le nettoyage selon la configuration
  if (config.replacementCodes) {
    newState.replacementCodes = {};
  }
  if (config.cncjConflictResult) {
    newState.cncjConflictResult = null;
  }
  if (config.cncjConflictSuggestions) {
    newState.cncjConflictSuggestions = {};
  }
  if (config.finalFilter) {
    newState.finalFilter = 'all';
  }
  
  return newState;
};
