import React from 'react';
import { Account } from '../types/accounts';

interface DuplicateRowProps {
  account: Account;
  replacementCode: string;
  onReplacementCodeChange: (accountId: string, code: string) => void;
  isDuplicateCode: boolean;
  isCncjCode?: boolean;
  conflictType?: 'duplicates' | 'cncj-conflicts';
  suggestions?: { [key: string]: string | 'error' };
}

export const DuplicateRow: React.FC<DuplicateRowProps> = ({
  account,
  replacementCode,
  onReplacementCodeChange,
  isDuplicateCode,
  isCncjCode = false,
  conflictType = 'duplicates',
  suggestions = {}
}) => {
  const isEmpty = !replacementCode?.trim();
  
  const getRowStyles = () => {
    if (isEmpty) {
      return {
        rowColorClass: 'bg-gray-50 border-gray-200',
        numberColorClass: 'bg-gray-100',
        titleColorClass: 'bg-gray-50',
        inputColorClass: 'border-gray-300 bg-gray-50',
        focusRingClass: 'focus:ring-gray-400'
      };
    } else if (isCncjCode) {
      return {
        rowColorClass: 'bg-red-100 border-red-500',
        numberColorClass: 'bg-red-200',
        titleColorClass: 'bg-red-100',
        inputColorClass: 'border-red-500 bg-red-100',
        focusRingClass: 'focus:ring-red-500'
      };
    } else if (isDuplicateCode) {
      return {
        rowColorClass: 'bg-red-100 border-red-400',
        numberColorClass: 'bg-red-200',
        titleColorClass: 'bg-red-100',
        inputColorClass: 'border-red-400 bg-red-100',
        focusRingClass: 'focus:ring-red-400'
      };
    } else {
      return {
        rowColorClass: 'bg-green-50 border-green-300',
        numberColorClass: 'bg-green-100',
        titleColorClass: 'bg-green-50',
        inputColorClass: 'border-green-300 bg-green-50',
        focusRingClass: 'focus:ring-green-400'
      };
    }
  };

  const {
    rowColorClass,
    numberColorClass,
    titleColorClass,
    inputColorClass,
    focusRingClass
  } = getRowStyles();

  return (
    <div className={`border ${rowColorClass} rounded-lg p-3`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-3">
        <div className={`font-mono ${numberColorClass} px-2 py-1 rounded`}>
          {account.number}
        </div>
        <div className={`${titleColorClass} px-2 py-1 rounded`}>
          {account.title || 'Sans titre'}
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <label className="text-xs text-gray-600 whitespace-nowrap">
          Code remplacement:
        </label>
        <div className="relative flex items-center">
          <input
            type="text"
            value={replacementCode || ''}
            onChange={(e) => onReplacementCodeChange(account.id, e.target.value)}
            placeholder="Nouveau code"
            className={`w-32 px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 ${focusRingClass} ${inputColorClass}`}
          />
          {isDuplicateCode && (
            <div className="absolute -right-5 top-1/2 transform -translate-y-1/2 text-red-600">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          )}
          {isCncjCode && (
            <div className="absolute -right-5 top-1/2 transform -translate-y-1/2 text-red-600">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
      </div>
      
      {/* Afficher les suggestions pour les conflits CNCJ */}
      {conflictType === 'cncj-conflicts' && suggestions[account.id] && (
        <div className="mt-2 flex items-center space-x-2">
          <span className="text-xs text-gray-600">Suggestion:</span>
          {suggestions[account.id] === 'error' ? (
            <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">
              Aucune solution disponible (contrainte dizaine)
            </span>
          ) : (
            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded font-mono">
              {account.number} → {suggestions[account.id]}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
