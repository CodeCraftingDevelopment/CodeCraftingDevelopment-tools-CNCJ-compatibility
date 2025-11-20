import React from 'react';
import { STEPS_CONFIG } from '../../config/stepsConfig';

interface StepsInfoModalProps {
  onClose: () => void;
}

export const StepsInfoModal: React.FC<StepsInfoModalProps> = ({ onClose }) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="steps-info-title"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 id="steps-info-title" className="text-lg font-semibold text-gray-900">
            Parcours de traitement
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Fermer la fenêtre d'information"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-4 space-y-6">
          {STEPS_CONFIG.filter(step => step.id !== 'stepFinal').map(step => (
            <div key={step.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-2xl" aria-hidden="true">{step.icon}</span>
                  <h3 className="text-base font-semibold text-gray-900">
                    {step.order}. {step.title}
                  </h3>
                </div>
                <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700">
                  {step.description}
                </span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}

          <div className="border border-purple-200 bg-purple-50 rounded-lg p-4">
            <h3 className="text-base font-semibold text-purple-900 mb-2">
              Récapitulatif final
            </h3>
            <p className="text-sm text-purple-800 leading-relaxed">
              La dernière étape synthétise toutes les corrections appliquées :
              doublons résolus côté client, conflits avec les codes CNCJ et ajustements
              finaux exportables.
            </p>
          </div>
        </div>

        <div className="border-t px-6 py-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};