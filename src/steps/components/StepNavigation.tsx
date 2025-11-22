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
  customPreviousButton?: React.ReactNode;
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
  customPreviousButton,
  showNext = true,
  showPrevious = true
}) => {
  const hasPrevious = showPrevious && (Boolean(previousStep) || Boolean(customPreviousButton));

  return (
    <div className="mt-6 flex flex-wrap justify-center gap-4">
      {hasPrevious && (
        customPreviousButton ?? (
          <button
            onClick={onPrevious}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            aria-label={`Retour à l'étape précédente: ${previousStep?.title ?? 'étape précédente'}`}
            data-testid="step-previous"
          >
            ← Retour
          </button>
        )
      )}

      {showNext && nextStep && (
        customNextButton ? (
          customNextButton
        ) : (
          canProceed && (
            <button
              onClick={onNext}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              aria-label={`Passer à l'étape suivante: ${nextStep.title}`}
              data-testid="step-next"
            >
              Suivant →
            </button>
          )
        )
      )}
    </div>
  );
};
