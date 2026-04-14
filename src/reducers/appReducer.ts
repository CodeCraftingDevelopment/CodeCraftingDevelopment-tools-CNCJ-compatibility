import { AppState, AppAction } from '../types/accounts';
import { cleanupFutureSteps } from '../utils/stepCleanup';

export const initialState: AppState = {
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
  cncjForcedValidations: new Set(),
  finalFilter: 'all',
  accountsNeedingNormalization: [],
  isNormalizationApplied: false,
  missingMetadata: {},
  initialSuggestions: {},
  initialCncjSuggestions: {},
  clientName: '',
  fileName: ''
};

export const appReducer = (state: AppState, action: AppAction): AppState => {
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
      return { ...state, mergeInfo: action.payload };
    case 'SET_CNCJ_CONFLICT_RESULT':
      return { ...state, cncjConflictResult: action.payload };
    case 'SET_CNCJ_CONFLICT_CORRECTIONS':
      return { ...state, cncjConflictCorrections: action.payload };
    case 'SET_CNCJ_FORCED_VALIDATION': {
      const newForcedValidations = new Set(state.cncjForcedValidations);
      if (action.payload.forced) {
        newForcedValidations.add(action.payload.accountId);
      } else {
        newForcedValidations.delete(action.payload.accountId);
      }
      return { ...state, cncjForcedValidations: newForcedValidations };
    }
    case 'CLEAR_CNCJ_FORCED_VALIDATIONS':
      return { ...state, cncjForcedValidations: new Set() };
    case 'SET_FINAL_FILTER':
      return { ...state, finalFilter: action.payload };
    case 'SET_ACCOUNTS_NEEDING_NORMALIZATION':
      return { ...state, accountsNeedingNormalization: action.payload };
    case 'SET_NORMALIZATION_APPLIED':
      return { ...state, isNormalizationApplied: action.payload };
    case 'SET_MISSING_METADATA':
      return {
        ...state,
        missingMetadata: {
          ...state.missingMetadata,
          ...action.payload
        }
      };
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
    case 'CLEAR_MISSING_METADATA':
      return { ...state, missingMetadata: {} };
    case 'SET_INITIAL_SUGGESTIONS':
      return { ...state, initialSuggestions: action.payload };
    case 'SET_INITIAL_CNCJ_SUGGESTIONS':
      return { ...state, initialCncjSuggestions: action.payload };
    case 'CLEAR_INITIAL_SUGGESTIONS':
      return { ...state, initialSuggestions: {}, initialCncjSuggestions: {} };
    case 'SET_CLIENT_NAME':
      return { ...state, clientName: action.payload };
    case 'SET_FILE_NAME':
      return { ...state, fileName: action.payload };
    default:
      return state;
  }
};
