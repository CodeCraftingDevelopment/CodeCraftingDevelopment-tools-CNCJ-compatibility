import React from 'react';
import { Account } from '../types/accounts';
import { getDisplayCode } from '../utils/accountUtils';

interface DuplicateRowProps {
  account: Account;
  replacementCode: string;
  onReplacementCodeChange: (accountId: string, code: string) => void;
  isDuplicateCode: boolean;
  isCncjCode?: boolean;
  conflictType?: 'duplicates' | 'cncj-conflicts';
  corrections?: { [key: string]: string | 'error' };
  suggestedCode?: string | null;
}

export const DuplicateRow: React.FC<DuplicateRowProps> = ({
  account,
  replacementCode,
  onReplacementCodeChange,
  isDuplicateCode,
  isCncjCode = false,
  conflictType = 'duplicates',
  corrections = {},
  suggestedCode
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
          {conflictType === 'cncj-conflicts' ? (
            <div className="space-y-1">
              <div className="text-xs">
                <span className="text-gray-500">Original (8):</span> {getDisplayCode(account)}
              </div>
              <div className="text-xs">
                <span className="text-gray-500">Normalisé (7):</span> {account.number}
              </div>
            </div>
          ) : (
            getDisplayCode(account)
          )}
        </div>
        <div className={`${titleColorClass} px-2 py-1 rounded`}>
          {account.title || 'Sans titre'}
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <label className="text-xs text-gray-600 whitespace-nowrap">
          Code remplacement:
        </label>
        <div className="relative flex items-center flex-1">
          <input
            type="text"
            value={replacementCode || ''}
            onChange={(e) => onReplacementCodeChange(account.id, e.target.value)}
            placeholder="Nouveau code"
            className={`w-32 px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 ${focusRingClass} ${inputColorClass}`}
          />
          {isDuplicateCode && (
            <div className="absolute left-36 top-1/2 transform -translate-y-1/2 text-red-600">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          )}
          {isCncjCode && (
            <div className="absolute left-36 top-1/2 transform -translate-y-1/2 text-red-600">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
        {/* Bouton de suggestion - uniquement pour l'étape 4 (conflictType === 'duplicates') */}
        {conflictType === 'duplicates' && !replacementCode?.trim() && (
          <div className="ml-2">
            {suggestedCode ? (
              <button
                onClick={() => onReplacementCodeChange(account.id, suggestedCode)}
                className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors whitespace-nowrap"
                title={`Utiliser le code suggéré: ${suggestedCode}`}
              >
                💡 {suggestedCode}
              </button>
            ) : getDisplayCode(account).endsWith('9') ? (
              <span className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded whitespace-nowrap" title="Aucune suggestion disponible (code finit par 9)">
                ⚠️ Erreur
              </span>
            ) : null}
          </div>
        )}
      </div>
      
      {/* Afficher une erreur pour les conflits CNCJ */}
      {conflictType === 'cncj-conflicts' && corrections[account.id] && (
        <div className="mt-2 flex items-center space-x-2">
          <span className="text-xs text-gray-600">Statut:</span>
          <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded font-medium">
            ⚠️ Erreur de correspondance CNCJ
          </span>
        </div>
      )}
    </div>
  );
};
