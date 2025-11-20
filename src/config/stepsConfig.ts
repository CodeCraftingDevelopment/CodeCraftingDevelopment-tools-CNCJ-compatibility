import { AppState } from '../types/accounts';

export type StepId = 'step1' | 'step2' | 'step3' | 'step4' | 'step5' | 'step6' | 'stepFinal';

export interface StepConfig {
  id: StepId;
  order: number;
  title: string;
  icon: string;
  description: string;
  badge?: string;
  badgeColor?: 'green' | 'orange' | 'blue' | 'red';
  // Fonction de validation pour déterminer si on peut passer à l'étape suivante
  canProceed?: (state: AppState) => boolean;
  // Fonction pour déterminer si cette étape doit être affichée
  shouldDisplay?: (state: AppState) => boolean;
}

// Configuration centralisée de toutes les étapes
export const STEPS_CONFIG: StepConfig[] = [
  {
    id: 'step1',
    order: 1,
    title: 'Chargement des fichiers',
    icon: '📁',
    description: 'Importer les fichiers CSV des comptes clients et CNCJ',
    badge: 'Step 1',
    badgeColor: 'green',
    canProceed: (state) => {
      return state.clientAccounts.length > 0 && 
             state.cncjAccounts.length > 0 && 
             state.errors.length === 0 &&
             !state.loading &&
             state.result !== null;
    }
  },
  {
    id: 'step2',
    order: 2,
    title: 'Visualisation des fusions automatiques',
    icon: '🔗',
    description: 'Comptes ayant le même numéro ET le même titre fusionnés automatiquement',
    badge: 'Step 2',
    badgeColor: 'green',
    canProceed: () => true // Toujours possible de continuer
  },
  {
    id: 'step3',
    order: 3,
    title: 'Validation des numéros de compte',
    icon: '📏',
    description: 'Normalisation des numéros de compte (7 chiffres maximum)',
    badge: 'Step 3',
    badgeColor: 'green', // Simplifié pour TypeScript, la logique conditionnelle peut être gérée dans le composant
    canProceed: () => true // Toujours possible de continuer
  },
  {
    id: 'step4',
    order: 4,
    title: 'Vérification des doublons comptes clients',
    icon: '📋',
    description: 'Résolution des doublons dans les comptes clients',
    badge: 'Step 4',
    badgeColor: 'green',
    canProceed: (state) => {
      if (!state.result || state.result.duplicates.length === 0) return true;
      
      const duplicateIds = new Set(state.result.duplicates.map(d => d.id));
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
      
      const allOriginalCodes = new Set([
        ...state.result.uniqueClients.map(acc => acc.number),
        ...state.result.matches.map(acc => acc.number), 
        ...state.result.unmatchedClients.map(acc => acc.number)
      ]);
      
      return state.result.duplicates.every((account) => {
        const currentCode = state.replacementCodes[account.id]?.trim();
        const isEmpty = !currentCode;
        const isDuplicateWithOriginal = currentCode && allOriginalCodes.has(currentCode);
        const isDuplicateWithReplacement = currentCode && (codeOccurrences[currentCode]?.length || 0) > 1;
        const isDuplicateCode = isDuplicateWithOriginal || isDuplicateWithReplacement;
        
        return !isEmpty && !isDuplicateCode;
      });
    }
  },
  {
    id: 'step5',
    order: 5,
    title: 'Révision des corrections',
    icon: '📋',
    description: 'Vérification des corrections de doublons appliquées',
    badge: 'Step 5',
    badgeColor: 'green',
    canProceed: () => true // Toujours possible de continuer
  },
  {
    id: 'step6',
    order: 6,
    title: 'Codes clients réservés (homologués CNCJ)',
    icon: '🚫',
    description: 'Résolution des conflits avec les codes CNCJ',
    badge: 'Step 6',
    badgeColor: 'green',
    canProceed: (state) => {
      if (!state.cncjConflictResult || state.cncjConflictResult.duplicates.length === 0) return true;
      
      const conflictIds = new Set(state.cncjConflictResult.duplicates.map(d => d.id));
      const codeOccurrences: { [key: string]: string[] } = {};
      
      Object.entries(state.cncjReplacementCodes).forEach(([accountId, code]) => {
        if (!conflictIds.has(accountId)) return;
        const trimmedCode = code?.trim();
        if (trimmedCode) {
          if (!codeOccurrences[trimmedCode]) {
            codeOccurrences[trimmedCode] = [];
          }
          codeOccurrences[trimmedCode].push(accountId);
        }
      });
      
      const cncjConflictCodes = new Set(state.cncjConflictResult.duplicates.map(d => d.number));
      const otherCncjCodes = state.cncjAccounts
        .filter(acc => !cncjConflictCodes.has(acc.number))
        .map(acc => acc.number);
      
      // Récupérer les comptes clients fusionnés depuis le state
      const mergedClientAccounts = state.clientAccounts; // À ajuster selon votre logique
      const otherClientCodes = mergedClientAccounts
        .filter(acc => !conflictIds.has(acc.id))
        .map(acc => acc.number);
      
      const allOtherCodes = new Set([...otherCncjCodes, ...otherClientCodes]);
      
      return state.cncjConflictResult.duplicates.every((account) => {
        const currentCode = state.cncjReplacementCodes[account.id]?.trim();
        const isEmpty = !currentCode;
        const isDuplicateWithOthers = currentCode && allOtherCodes.has(currentCode);
        const isDuplicateWithReplacement = currentCode && (codeOccurrences[currentCode]?.length || 0) > 1;
        const isDuplicateCode = isDuplicateWithOthers || isDuplicateWithReplacement;
        
        return !isEmpty && !isDuplicateCode;
      });
    }
  },
  {
    id: 'stepFinal',
    order: 7,
    title: 'Résumé des corrections appliquées',
    icon: '📊',
    description: 'Récapitulatif final de toutes les modifications',
    badge: 'Récapitulatif Final',
    badgeColor: 'green',
    canProceed: () => true
  }
];

// Utilitaires pour travailler avec la configuration des étapes
export const getStepConfig = (stepId: StepId): StepConfig | undefined => {
  return STEPS_CONFIG.find(step => step.id === stepId);
};

export const getNextStep = (currentStepId: StepId): StepConfig | undefined => {
  const currentStep = getStepConfig(currentStepId);
  if (!currentStep) return undefined;
  
  return STEPS_CONFIG.find(step => step.order === currentStep.order + 1);
};

export const getPreviousStep = (currentStepId: StepId): StepConfig | undefined => {
  const currentStep = getStepConfig(currentStepId);
  if (!currentStep) return undefined;
  
  return STEPS_CONFIG.find(step => step.order === currentStep.order - 1);
};

export const getStepProgress = (currentStepId: StepId): number => {
  const currentStep = getStepConfig(currentStepId);
  if (!currentStep) return 0;
  
  return Math.round((currentStep.order / STEPS_CONFIG.length) * 100);
};
