import React, { useState } from 'react';
import { Account } from '../types/accounts';

interface ReviewViewProps {
  mergedClientAccounts: Account[];
  originalClientAccounts: Account[];
  replacementCodes: { [key: string]: string };
  duplicateIdsFromStep4: Set<string>;
}

type FilterType = 'all' | 'corrected' | 'uncorrected';

export const ReviewView: React.FC<ReviewViewProps> = ({
  mergedClientAccounts,
  originalClientAccounts,
  replacementCodes,
  duplicateIdsFromStep4
}) => {
  const [correctionFilter, setCorrectionFilter] = useState<FilterType>('all');

  const originalAccountsById = React.useMemo(() => {
    const mapping: { [key: string]: Account } = {};
    originalClientAccounts?.forEach(account => {
      mapping[account.id] = account;
    });
    return mapping;
  }, [originalClientAccounts]);

  const getFilterCounts = () => {
    const totalCount = mergedClientAccounts.length;
    const correctedCount = mergedClientAccounts.filter(acc => {
      const isCorrected = !!replacementCodes[acc.id]?.trim();
      const isDuplicateFromStep3 = duplicateIdsFromStep4?.has(acc.id);
      return isDuplicateFromStep3 && isCorrected;
    }).length;
    const uncorrectedCount = totalCount - correctedCount;
    
    return { totalCount, correctedCount, uncorrectedCount };
  };

  const { totalCount, correctedCount, uncorrectedCount } = getFilterCounts();

  const filteredAccounts = mergedClientAccounts
    .filter(account => {
      if (correctionFilter === 'all') return true;
      const isCorrected = !!replacementCodes[account.id]?.trim();
      const isDuplicateFromStep3 = duplicateIdsFromStep4?.has(account.id);
      if (correctionFilter === 'corrected') {
        return isDuplicateFromStep3 && isCorrected;
      } else { // non corrigés
        return !(isDuplicateFromStep3 && isCorrected);
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
              
              return (
                <tr 
                  key={account.id} 
                  className={`border-b ${
                    shouldHighlight ? 'bg-green-100 border-l-4 border-green-500' : 
                    isDuplicateFromStep3 ? 'bg-blue-50 border-l-4 border-blue-300' : 
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <div className="font-mono text-gray-900">
                        {originalAccount?.number || account.number}
                      </div>
                      <div className="text-gray-600 text-xs">
                        {originalAccount?.title || account.title || 'Sans titre'}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <div className={`font-mono ${
                        shouldHighlight ? 'text-green-700 font-bold bg-green-200' : 
                        isDuplicateFromStep3 ? 'text-blue-700 font-bold bg-blue-100' : 
                        'text-gray-700 bg-gray-100'
                      } px-3 py-2 rounded flex-1`}>
                        {replacementCode || account.number}
                      </div>
                      {isCorrected && (
                        <div className="text-green-600">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
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
