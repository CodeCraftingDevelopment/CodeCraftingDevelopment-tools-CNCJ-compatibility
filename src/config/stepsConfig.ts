import { AppState } from '../types/accounts';

export type StepId = 'step1' | 'step2' | 'step3' | 'step4' | 'step5' | 'step6' | 'step7' | 'stepFinal';

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
// NOTE : Les fonctions canProceed suivent ce pattern :
// - step1 : Utilise canProceed depuis stepsConfig (via canProceedToNext dans App.tsx)
// - step2, step3, step5 : Toujours autorisées (pas de validation requise)
// - step4, step6 : Validation gérée par useStepValidation hook (ignore stepsConfig)
// - stepFinal : Désactivée explicitement (canProceed={false} dans App.tsx)
export const STEPS_CONFIG: StepConfig[] = [
  {
    id: 'step1',
    order: 1,
    title: 'Chargement des fichiers',
    icon: '📁',
    description: 'Importer les fichiers CSV des comptes clients, du plan comptable général et des comptes CNCJ',
    badge: 'Step 1',
    badgeColor: 'green',
    canProceed: (state) => {
      // Les comptes CNCJ sont dérivés du PCG : la colonne isCNCJ doit être présente (sinon bloquant)
      const pcgHasCncjColumn = state.generalAccounts.some(
        acc => acc.rawData !== undefined && Object.prototype.hasOwnProperty.call(acc.rawData, 'isCNCJ')
      );
      return state.clientAccounts.length > 0 &&
             state.generalAccounts.length > 0 &&
             pcgHasCncjColumn &&
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
    canProceed: () => true // Toujours autorisé - pas de validation requise pour cette étape
  },
  {
    id: 'step3',
    order: 3,
    title: 'Validation des numéros de compte',
    icon: '📏',
    description: 'Normalisation des numéros de compte (7 chiffres maximum)',
    badge: 'Step 3',
    badgeColor: 'green',
    canProceed: () => true // Toujours autorisé - pas de validation requise pour cette étape
  },
  {
    id: 'step4',
    order: 4,
    title: 'Vérification des doublons comptes clients',
    icon: '📋',
    description: 'Résolution des doublons dans les comptes clients',
    badge: 'Step 4',
    badgeColor: 'green',
    canProceed: () => true // Validation gérée par useStepValidation hook (voir App.tsx ligne 595)
  },
  {
    id: 'step5',
    order: 5,
    title: 'Révision des corrections',
    icon: '📋',
    description: 'Vérification des corrections de doublons appliquées',
    badge: 'Step 5',
    badgeColor: 'green',
    canProceed: () => true // Toujours autorisé - pas de validation requise pour cette étape
  },
  {
    id: 'step6',
    order: 6,
    title: 'Codes clients réservés (homologués CNCJ)',
    icon: '🚫',
    description: 'Résolution des conflits avec les codes CNCJ',
    badge: 'Step 6',
    badgeColor: 'green',
    canProceed: () => true // Validation gérée par useStepValidation hook (voir App.tsx ligne 640)
  },
  {
    id: 'step7',
    order: 7,
    title: 'Résumé des corrections appliquées',
    icon: '📊',
    description: 'Récapitulatif final de toutes les modifications',
    badge: 'Step 7',
    badgeColor: 'green',
    canProceed: () => true // Toujours autorisé - pas de validation requise pour cette étape
  },
  {
    id: 'stepFinal',
    order: 8,
    title: 'Correspondances manquantes',
    icon: '🔧',
    description: 'Traitement des lignes sans correspondances PCG pour remplir les colonnes',
    badge: 'Étape Finale',
    badgeColor: 'orange',
    canProceed: () => true // Désactivée explicitement dans App.tsx (canProceed={false} ligne 664)
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
