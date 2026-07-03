import React, { useState } from 'react';
import { Account } from '../types/accounts';
import { getDisplayCode } from '../utils/accountUtils';

interface ReviewViewProps {
  mergedClientAccounts: Account[];
  originalClientAccounts: Account[];
  replacementCodes: { [key: string]: string };
  svvCorrespondences?: { [compteEncheres: string]: string };
  duplicateIdsFromStep4: Set<string>;
}

type FilterType = 'all' | 'corrected' | 'uncorrected' | 'svv';

export const ReviewView: React.FC<ReviewViewProps> = ({
  mergedClientAccounts,
  originalClientAccounts,
  replacementCodes,
  svvCorrespondences = {},
  duplicateIdsFromStep4
}) => {
  const [correctionFilter, setCorrectionFilter] = useState<FilterType>('all');

  // Un compte est un transfert SVV si son code d'origine (8 chiffres) figure dans le mappage
  const isSvv = (account: Account): boolean => !!svvCorrespondences[account.originalNumber || ''];

  const originalAccountsById = React.useMemo(() => {
    const mapping: { [key: string]: Account } = {};
    originalClientAccounts?.forEach(account => {
      mapping[account.id] = account;
    });
    return mapping;
  }, [originalClientAccounts]);

  // Normaliser un code à 7 chiffres pour l'affichage
  const normalizeForDisplay = (code: string): string => {
    if (!code) return code;
    return code.length > 7 ? code.slice(0, 7) : code.padEnd(7, '0');
  };

  const getFilterCounts = () => {
    const totalCount = mergedClientAccounts.length;
    const svvCount = mergedClientAccounts.filter(isSvv).length;
    const correctedCount = mergedClientAccounts.filter(acc => {
      const isCorrected = !!replacementCodes[acc.id]?.trim();
      const isDuplicateFromStep3 = duplicateIdsFromStep4?.has(acc.id);
      return !isSvv(acc) && isDuplicateFromStep3 && isCorrected;
    }).length;
    // Les transferts SVV forment leur propre catégorie (ni « corrigés » ni « non corrigés »)
    const uncorrectedCount = totalCount - correctedCount - svvCount;

    return { totalCount, correctedCount, uncorrectedCount, svvCount };
  };

  const { totalCount, correctedCount, uncorrectedCount, svvCount } = getFilterCounts();

  const filteredAccounts = mergedClientAccounts
    .filter(account => {
      if (correctionFilter === 'all') return true;
      if (correctionFilter === 'svv') return isSvv(account);
      const isCorrected = !!replacementCodes[account.id]?.trim();
      const isDuplicateFromStep3 = duplicateIdsFromStep4?.has(account.id);
      if (correctionFilter === 'corrected') {
        return !isSvv(account) && isDuplicateFromStep3 && isCorrected;
      } else { // non corrigés (hors transferts SVV)
        return !isSvv(account) && !(isDuplicateFromStep3 && isCorrected);
      }
    })
    .sort((a, b) => a.number.localeCompare(b.number));

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      {/* Boutons de filtrage */}
      <div className="mb-4 flex justify-center space-x-2">
        <button
          onClick={() => setCorrectionFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            correctionFilter === 'all' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Tous ({totalCount})
        </button>
        <button
          onClick={() => setCorrectionFilter('corrected')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            correctionFilter === 'corrected' 
              ? 'bg-green-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Corrigés ({correctedCount})
        </button>
        <button
          onClick={() => setCorrectionFilter('uncorrected')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            correctionFilter === 'uncorrected' 
              ? 'bg-gray-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Non corrigés ({uncorrectedCount})
        </button>
        {svvCount > 0 && (
          <button
            onClick={() => setCorrectionFilter('svv')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              correctionFilter === 'svv'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            🔁 Transferts SVV ({svvCount})
          </button>
        )}
      </div>
      
      <div className="overflow-x-auto max-h-96 overflow-y-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-300">
              <th className="px-4 py-3 text-left font-medium text-gray-700">Données d'origine</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Valeur corrigée</th>
            </tr>
          </thead>
          <tbody>
            {filteredAccounts.map((account, index) => {
              const replacementCode = replacementCodes[account.id]?.trim();
              const isCorrected = !!replacementCode;
              const originalAccount = originalAccountsById[account.id];
              const isDuplicateFromStep3 = duplicateIdsFromStep4?.has(account.id);
              const shouldHighlight = isDuplicateFromStep3 && isCorrected;
              const rowIsSvv = isSvv(account);

              return (
                <tr
                  key={account.id}
                  className={`border-b ${
                    rowIsSvv ? 'bg-indigo-50 border-l-4 border-indigo-400' :
                    shouldHighlight ? 'bg-green-100 border-l-4 border-green-500' :
                    isDuplicateFromStep3 ? 'bg-blue-50 border-l-4 border-blue-300' :
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <div className="font-mono text-gray-900">
                        {originalAccount ? getDisplayCode(originalAccount) : getDisplayCode(account)}
                      </div>
                      <div className="text-gray-600 text-xs">
                        {originalAccount?.title || account.title || 'Sans titre'}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <div className={`font-mono ${
                        rowIsSvv ? 'text-indigo-700 font-bold bg-indigo-100' :
                        shouldHighlight ? 'text-green-700 font-bold bg-green-200' :
                        isDuplicateFromStep3 ? 'text-blue-700 font-bold bg-blue-100' :
                        'text-gray-700 bg-gray-100'
                      } px-3 py-2 rounded flex-1`}>
                        {normalizeForDisplay(replacementCode || account.number)}
                      </div>
                      {rowIsSvv ? (
                        <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 border border-indigo-300 rounded whitespace-nowrap" title="Transfert SVV (consolidation pré-validée)">
                          🔁 SVV
                        </span>
                      ) : isCorrected ? (
                        <div className="text-green-600">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
