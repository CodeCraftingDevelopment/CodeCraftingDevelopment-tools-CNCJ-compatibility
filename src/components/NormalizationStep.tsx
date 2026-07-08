import React from 'react';
import { NormalizationAccount } from '../types/accounts';

interface NormalizationStepProps {
  accountsNeedingNormalization: NormalizationAccount[];
  isNormalizationApplied: boolean;
  onApplyNormalization: () => void;
  onBack: () => void;
}

export const NormalizationStep: React.FC<NormalizationStepProps> = ({
  accountsNeedingNormalization,
  isNormalizationApplied,
  onApplyNormalization,
  onBack
}) => {
  if (accountsNeedingNormalization.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          ✅ Standardisation des numéros de compte
        </h2>
        
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <div className="text-gray-500">
            {isNormalizationApplied ? (
              <>
                <div className="text-lg mb-2">✅ Standardisation appliquée</div>
                <p className="text-sm">Tous les comptes ont été standardisés à exactement 7 chiffres.</p>
              </>
            ) : (
              <>
                <div className="text-lg mb-2">✅ Tous les numéros de compte sont valides</div>
                <p className="text-sm">Tous les comptes clients ont déjà exactement 7 chiffres</p>
              </>
            )}
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
      <h2 className="text-xl font-semibold text-gray-900 mb-6">
        📏 Standardisation des numéros de compte (exactement 7 chiffres)
      </h2>
      
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">
            {accountsNeedingNormalization.length}
          </div>
          <div className="text-gray-600">
            {accountsNeedingNormalization.length === 1 ? 'compte nécessite' : 'comptes nécessitent'} une standardisation
          </div>
        </div>
      </div>

      {isNormalizationApplied && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          ✅ Les numéros présentés ci-dessous ont déjà été standardisés. Vous pouvez vérifier les changements ou continuer.
        </div>
      )}
      
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-6">
        <p className="text-sm text-gray-600 text-center">
          💡 Les numéros de compte clients doivent avoir exactement 7 chiffres.
          Les comptes trop courts seront complétés avec des zéros en fin,
          les comptes trop longs seront tronqués.
        </p>
      </div>

      {accountsNeedingNormalization.some(a => a.isSvv) && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mb-6 text-sm text-indigo-700 text-center">
          🔁 Les codes marqués <span className="font-semibold">SVV</span> proviennent du mappage pré-validé fourni (prioritaire sur la troncature automatique).
        </div>
      )}

      {accountsNeedingNormalization.some(a => a.fromFec) && (
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 mb-6 text-sm text-teal-700 text-center">
          📄 Les comptes marqués <span className="font-semibold">FEC</span> proviennent du fichier FEC optionnel (absents du fichier des comptes clients).
        </div>
      )}
      
      {/* Tableau avant/après */}
      <div className="overflow-x-auto max-h-64 overflow-y-auto mb-6">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-4 py-2 text-left">Titre</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Numéro original</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Numéro standardisé (7 chiffres)</th>
            </tr>
          </thead>
          <tbody>
            {accountsNeedingNormalization.map((account) => (
              <tr key={account.id} className="bg-orange-50">
                <td className="border border-gray-300 px-4 py-2">
                  {account.title || 'Sans titre'}
                  {account.fromFec && (
                    <span className="ml-2 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-teal-100 text-teal-700 border border-teal-300 align-middle">
                      📄 FEC
                    </span>
                  )}
                </td>
                <td className="border border-gray-300 px-4 py-2 font-mono text-red-600">
                  {account.originalNumber}
                </td>
                <td className="border border-gray-300 px-4 py-2 font-mono text-green-600 font-bold">
                  {account.normalizedNumber}
                  {account.isSvv && (
                    <span className="ml-2 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-indigo-100 text-indigo-700 border border-indigo-300 align-middle">
                      SVV
                    </span>
                  )}
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
          className={`px-6 py-2 text-white rounded-lg transition-colors font-medium ${isNormalizationApplied ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-600 hover:bg-orange-700'}`}
        >
          {isNormalizationApplied ? 'Continuer →' : '📏 Standardiser les codes →'}
        </button>
      </div>
    </div>
  );
};
