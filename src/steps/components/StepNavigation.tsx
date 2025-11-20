import React from 'react';
import { StepConfig } from '../../config/stepsConfig';

interface StepNavigationProps {
  currentStep: StepConfig;
  previousStep?: StepConfig;
  nextStep?: StepConfig;
  canProceed: boolean;
  onNext?: () => void;
  onPrevious?: () => void;
  customNextButton?: React.ReactNode;
  showNext?: boolean;
  showPrevious?: boolean;
}

export const StepNavigation: React.FC<StepNavigationProps> = ({
  currentStep: _currentStep,
  previousStep,
  nextStep,
  canProceed,
  onNext,
  onPrevious,
  customNextButton,
  showNext = true,
  showPrevious = true
}) => {
  return (
    <div className="mt-6 text-center space-x-4">
      {/* Bouton Retour */}
      {showPrevious && previousStep && (
        <button
          onClick={onPrevious}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          aria-label={`Retour à l'étape précédente: ${previousStep.title}`}
        >
          ← Retour
        </button>
      )}

      {/* Bouton Suivant ou personnalisé */}
      {showNext && nextStep && (
        customNextButton ? (
          customNextButton
        ) : (
          canProceed && (
            <button
              onClick={onNext}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              aria-label={`Passer à l'étape suivante: ${nextStep.title}`}
            >
              Suivant →
            </button>
          )
        )
      )}
    </div>
  );
};
