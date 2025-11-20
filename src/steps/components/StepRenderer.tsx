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
  // Déterminer la couleur du badge
  const badgeColorClasses = {
    green: 'bg-green-100 text-green-800',
    orange: 'bg-orange-100 text-orange-800',
    blue: 'bg-blue-100 text-blue-800',
    red: 'bg-red-100 text-red-800'
  };

  const badgeColor = step.badgeColor || 'green';
  const badgeClasses = badgeColorClasses[badgeColor];

  return (
    <div 
      style={{ display: isActive ? 'block' : 'none' }} 
      className="bg-white shadow rounded-lg p-6 mb-6"
      role="region"
      aria-label={`${step.title} - Étape ${step.order}`}
    >
      {/* Badge de l'étape */}
      <div className="mb-6 text-center">
        <span className={`inline-block px-6 py-3 ${badgeClasses} rounded-full text-lg font-bold`}>
          {step.badge || `Step ${step.order}`}
        </span>
      </div>

      {/* Titre et icône */}
      <h2 className="text-xl font-semibold text-gray-900 mb-6">
        {step.icon} {step.title}
      </h2>

      {/* Contenu de l'étape */}
      {children}
    </div>
  );
};
