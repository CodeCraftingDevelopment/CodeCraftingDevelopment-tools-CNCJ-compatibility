import React from 'react';
import { ProcessingResult } from '../types/accounts';

interface ResultsDisplayProps {
  result: ProcessingResult | null;
  loading?: boolean;
  showOnly?: 'duplicates' | 'all';
  replacementCodes?: { [key: string]: string };
  onReplacementCodeChange?: (accountId: string, code: string) => void;
}

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ 
  result, 
  loading = false, 
  showOnly = 'all', 
  replacementCodes = {}, 
  onReplacementCodeChange 
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Traitement en cours...</span>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Veuillez charger les fichiers CSV pour voir les résultats</p>
      </div>
    );
  }

  const { duplicates, uniqueClients, matches, unmatchedClients } = result;

  return (
    <div className="space-y-6">
      {/* Résumé */}
      {showOnly === 'duplicates' ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600">{duplicates.length}</div>
            <div className="text-gray-600">Doublons détectés</div>
          </div>
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Résumé du traitement</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{uniqueClients.length}</div>
              <div className="text-gray-600">Comptes clients uniques</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{duplicates.length}</div>
              <div className="text-gray-600">Doublons détectés</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{matches.length}</div>
              <div className="text-gray-600">Correspondances CNCJ</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{unmatchedClients.length}</div>
              <div className="text-gray-600">Sans correspondance</div>
            </div>
          </div>
        </div>
      )}

      {/* Doublons */}
      {duplicates.length > 0 ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-red-900 mb-3">
            ⚠️ Doublons détectés ({duplicates.length})
          </h3>
          <div className={`${showOnly === 'duplicates' ? 'max-h-96' : 'max-h-40'} overflow-y-auto`}>
            <div className="space-y-3">
              {duplicates.map((account) => (
                <div key={account.id} className="border border-red-200 rounded-lg p-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-3">
                    <div className="font-mono bg-red-100 px-2 py-1 rounded">
                      {account.number}
                    </div>
                    <div className="bg-red-50 px-2 py-1 rounded">
                      {account.title || 'Sans titre'}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="text-xs text-gray-600 whitespace-nowrap">
                      Code remplacement:
                    </label>
                    <input
                      type="text"
                      value={replacementCodes[account.id] || ''}
                      onChange={(e) => onReplacementCodeChange?.(account.id, e.target.value)}
                      placeholder="Nouveau code"
                      className="w-32 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : showOnly === 'duplicates' ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-green-900 mb-3">
            ✅ Aucun doublon détecté
          </h3>
          <p className="text-green-700">
            Tous les comptes clients sont uniques. Aucune action n'est requise.
          </p>
        </div>
      ) : null}

      {/* Correspondances */}
      {showOnly === 'all' && matches.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-green-900 mb-3">
            ✅ Comptes avec correspondance CNCJ ({matches.length})
          </h3>
          <div className="max-h-40 overflow-y-auto">
            <div className="space-y-2">
              {matches.map((account) => (
                <div key={account.id} className="grid grid-cols-2 gap-2 text-sm">
                  <div className="font-mono bg-green-100 px-2 py-1 rounded">
                    {account.number}
                  </div>
                  <div className="bg-green-50 px-2 py-1 rounded">
                    {account.title || 'Sans titre'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sans correspondance */}
      {showOnly === 'all' && unmatchedClients.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-orange-900 mb-3">
            ❌ Comptes sans correspondance CNCJ ({unmatchedClients.length})
          </h3>
          <div className="max-h-40 overflow-y-auto">
            <div className="space-y-2">
              {unmatchedClients.map((account) => (
                <div key={account.id} className="grid grid-cols-2 gap-2 text-sm">
                  <div className="font-mono bg-orange-100 px-2 py-1 rounded">
                    {account.number}
                  </div>
                  <div className="bg-orange-50 px-2 py-1 rounded">
                    {account.title || 'Sans titre'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4 justify-center">
        <button
          onClick={() => {
            const data = showOnly === 'duplicates' 
              ? { 
                  duplicates: duplicates.map(d => ({ 
                    number: d.number, 
                    title: d.title,
                    replacementCode: replacementCodes[d.id] || null
                  })) 
                }
              : {
                  duplicates: duplicates.map(d => d.number),
                  matches: matches.map(m => m.number),
                  unmatched: unmatchedClients.map(u => u.number)
                };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = showOnly === 'duplicates' ? 'doublons-comptes.json' : 'resultats-comptes.json';
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          📥 {showOnly === 'duplicates' ? 'Exporter les doublons' : 'Exporter les résultats'}
        </button>
      </div>
    </div>
  );
};
