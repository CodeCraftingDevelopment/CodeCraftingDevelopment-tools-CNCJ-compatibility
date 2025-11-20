import React from 'react';
import { StepConfig } from '../../config/stepsConfig';

interface StepRendererProps {
  step: StepConfig;
  isActive: boolean;
  children: React.ReactNode;
}

export const StepRenderer: React.FC<StepRendererProps> = ({
  step,
  isActive,
  children
}) => {
  return (
    <div 
      style={{ display: isActive ? 'block' : 'none' }} 
      className="bg-white shadow rounded-lg p-6 mb-6"
      role="region"
      aria-label={`${step.title} - Étape ${step.order}`}
    >
      {/* Contenu de l'étape */}
      {children}
    </div>
  );
};
