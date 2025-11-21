import { AppState } from '../types/accounts';

type Step = 'step1' | 'step2' | 'step3' | 'step4' | 'step5' | 'step6' | 'stepFinal';

interface CleanupConfig {
  replacementCodes?: boolean;
  cncjConflictResult?: boolean;
  cncjConflictCorrections?: boolean;
  finalFilter?: boolean;
  accountsNeedingNormalization?: boolean;
  isNormalizationApplied?: boolean;
}

// Lookup table pour le nettoyage des étapes futures
const STEP_CLEANUP_CONFIG: Record<Step, CleanupConfig> = {
  step1: {
    replacementCodes: true,
    cncjConflictResult: true,
    cncjConflictCorrections: true,
    finalFilter: true,
    accountsNeedingNormalization: true,
    isNormalizationApplied: true
  },
  step2: {
    replacementCodes: true,
    cncjConflictResult: true,
    cncjConflictCorrections: true,
    finalFilter: true,
    accountsNeedingNormalization: true,
    isNormalizationApplied: true
  },
  step3: {
    replacementCodes: true,
    cncjConflictResult: true,
    cncjConflictCorrections: true,
    finalFilter: true
  },
  step4: {
    cncjConflictResult: true,
    cncjConflictCorrections: true,
    finalFilter: true
  },
  step5: {
    finalFilter: true
  },
  step6: {
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
  if (config.cncjConflictCorrections) {
    newState.cncjConflictCorrections = {};
  }
  if (config.finalFilter) {
    newState.finalFilter = 'all';
  }
  if (config.accountsNeedingNormalization) {
    newState.accountsNeedingNormalization = [];
  }
  if (config.isNormalizationApplied) {
    newState.isNormalizationApplied = false;
  }
  
  return newState;
};
