import React from 'react';
import { NormalizationAccount } from '../types/accounts';

interface NormalizationStepProps {
  accountsNeedingNormalization: NormalizationAccount[];
  onApplyNormalization: () => void;
  onBack: () => void;
}

export const NormalizationStep: React.FC<NormalizationStepProps> = ({
  accountsNeedingNormalization,
  onApplyNormalization,
  onBack
}) => {
  if (accountsNeedingNormalization.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="mb-6 text-center">
          <span className="inline-block px-6 py-3 bg-green-100 text-green-800 rounded-full text-lg font-bold">
            Step 3
          </span>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          ✅ Validation des numéros de compte
        </h2>
        
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <div className="text-gray-500">
            <div className="text-lg mb-2">✅ Tous les numéros de compte sont valides</div>
            <p className="text-sm">Tous les comptes clients ont déjà 7 chiffres ou moins</p>
          </div>
        </div>
        
        <div className="mt-6 text-center space-x-4">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            ← Retour
          </button>
          
          <button
            onClick={onApplyNormalization}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Suivant →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6 mb-6">
      <div className="mb-6 text-center">
        <span className="inline-block px-6 py-3 bg-orange-100 text-orange-800 rounded-full text-lg font-bold">
          Step 3
        </span>
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">
        📏 Validation des numéros de compte (7 chiffres maximum)
      </h2>
      
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">
            {accountsNeedingNormalization.length}
          </div>
          <div className="text-gray-600">
            {accountsNeedingNormalization.length === 1 ? 'compte nécessite' : 'comptes nécessitent'} une normalisation
          </div>
        </div>
      </div>
      
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-6">
        <p className="text-sm text-gray-600 text-center">
          💡 Les numéros de compte clients ne doivent pas dépasser 7 chiffres. 
          Les comptes ci-dessous seront automatiquement tronqués.
        </p>
      </div>
      
      {/* Tableau avant/après */}
      <div className="overflow-x-auto max-h-64 overflow-y-auto mb-6">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-4 py-2 text-left">Titre</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Numéro original</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Numéro normalisé (7 chiffres)</th>
            </tr>
          </thead>
          <tbody>
            {accountsNeedingNormalization.map((account) => (
              <tr key={account.id} className="bg-orange-50">
                <td className="border border-gray-300 px-4 py-2">
                  {account.title || 'Sans titre'}
                </td>
                <td className="border border-gray-300 px-4 py-2 font-mono text-red-600">
                  {account.originalNumber}
                </td>
                <td className="border border-gray-300 px-4 py-2 font-mono text-green-600 font-bold">
                  {account.normalizedNumber}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="mt-6 text-center space-x-4">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          ← Retour
        </button>
        
        <button
          onClick={onApplyNormalization}
          className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
        >
          📏 Normaliser les codes →
        </button>
      </div>
    </div>
  );
};
