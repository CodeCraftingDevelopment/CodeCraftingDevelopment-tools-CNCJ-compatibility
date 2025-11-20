import React from 'react';
import { STEPS_CONFIG, StepId } from '../../config/stepsConfig';

interface ProgressBarProps {
  currentStepId: StepId;
  onStepClick?: (stepId: StepId) => void;
  allowNavigation?: boolean;
  onShowInfo?: () => void;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  currentStepId,
  onStepClick,
  allowNavigation = false,
  onShowInfo
}) => {
  const currentStepOrder = STEPS_CONFIG.find(s => s.id === currentStepId)?.order || 0;

  return (
    <div className="mb-8 bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-700">Progression</h3>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            Étape {currentStepOrder} / {STEPS_CONFIG.length}
          </span>
          {onShowInfo && (
            <button
              type="button"
              onClick={onShowInfo}
              className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
              aria-label="Afficher l'aide sur les étapes"
            >
              ℹ️ Aide étapes
            </button>
          )}
        </div>
      </div>

      {/* Barre de progression visuelle */}
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          {STEPS_CONFIG.map((step, index) => {
            const isCompleted = step.order < currentStepOrder;
            const isCurrent = step.order === currentStepOrder;
            const isClickable = allowNavigation && (isCompleted || isCurrent);

            return (
              <React.Fragment key={step.id}>
                {/* Cercle de l'étape */}
                <div className="flex flex-col items-center flex-1">
                  <button
                    onClick={() => isClickable && onStepClick?.(step.id)}
                    disabled={!isClickable}
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold
                      transition-all duration-300
                      ${isCompleted ? 'bg-green-500 text-white' : ''}
                      ${isCurrent ? 'bg-blue-600 text-white ring-4 ring-blue-200' : ''}
                      ${!isCompleted && !isCurrent ? 'bg-gray-200 text-gray-500' : ''}
                      ${isClickable ? 'cursor-pointer hover:scale-110' : 'cursor-default'}
                    `}
                    aria-label={`${step.title} - ${isCompleted ? 'Complétée' : isCurrent ? 'En cours' : 'À venir'}`}
                    aria-current={isCurrent ? 'step' : undefined}
                  >
                    {isCompleted ? '✓' : step.order}
                  </button>
                  
                  {/* Label de l'étape */}
                  <span className={`
                    mt-2 text-xs text-center max-w-[80px] leading-tight
                    ${isCurrent ? 'font-semibold text-blue-700' : 'text-gray-600'}
                  `}>
                    {step.icon}
                  </span>
                </div>

                {/* Ligne de connexion */}
                {index < STEPS_CONFIG.length - 1 && (
                  <div className="flex-1 h-1 mx-2 mb-8">
                    <div
                      className={`h-full rounded transition-all duration-300 ${
                        isCompleted ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Titre de l'étape actuelle */}
        <div className="mt-4 text-center">
          <p className="text-sm font-medium text-gray-900">
            {STEPS_CONFIG.find(s => s.id === currentStepId)?.title}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {STEPS_CONFIG.find(s => s.id === currentStepId)?.description}
          </p>
        </div>
      </div>
    </div>
  );
};
