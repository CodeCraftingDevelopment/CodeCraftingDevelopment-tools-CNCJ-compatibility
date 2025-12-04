import React from 'react';
import { Account } from '../types/accounts';
import { getDisplayCode } from '../utils/accountUtils';
import { SuggestionResult } from '../utils/codeSuggestions';

interface DuplicateRowProps {
  account: Account;
  replacementCode: string;
  onReplacementCodeChange: (accountId: string, code: string) => void;
  isDuplicateCode: boolean;
  isCncjCode?: boolean;
  conflictType?: 'duplicates' | 'cncj-conflicts';
  corrections?: { [key: string]: string | 'error' };
  suggestion?: SuggestionResult;
  cncjForcedValidations?: Set<string>;
  onCncjForcedValidationChange?: (accountId: string, forced: boolean) => void;
}

export const DuplicateRow: React.FC<DuplicateRowProps> = ({
  account,
  replacementCode,
  onReplacementCodeChange,
  isDuplicateCode,
  isCncjCode = false,
  conflictType = 'duplicates',
  corrections = {},
  suggestion,
  cncjForcedValidations = new Set(),
  onCncjForcedValidationChange
}) => {
  const suggestedCode = suggestion?.code;
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
      // À l'étape 4 (duplicates), le code CNCJ est un warning (orange)
      // À l'étape 6 (cncj-conflicts), c'est une erreur bloquante (rouge)
      if (conflictType === 'duplicates') {
        return {
          rowColorClass: 'bg-amber-50 border-amber-400',
          numberColorClass: 'bg-amber-100',
          titleColorClass: 'bg-amber-50',
          inputColorClass: 'border-amber-400 bg-amber-50',
          focusRingClass: 'focus:ring-amber-400'
        };
      }
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
          {isCncjCode && conflictType === 'cncj-conflicts' && (
            <div className="absolute left-36 top-1/2 transform -translate-y-1/2 text-red-600">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          )}
          {isCncjCode && conflictType === 'duplicates' && (
            <span className="ml-2 px-2 py-0.5 text-xs bg-amber-100 text-amber-800 border border-amber-300 rounded whitespace-nowrap" title="Ce code de remplacement est un code CNCJ réservé. Vérifiez à l'étape 6.">
              ⚠️ Code CNCJ
            </span>
          )}
        </div>
        {/* Bouton de suggestion - pour l'étape 4 (duplicates) et l'étape 6 (cncj-conflicts) */}
        {!replacementCode?.trim() && (
          <div className="ml-2">
            {suggestedCode ? (
              <button
                onClick={() => onReplacementCodeChange(account.id, suggestedCode)}
                className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors whitespace-nowrap"
                title={`Suggestion: ${suggestedCode}\n\nDétail: ${suggestion?.reason || 'N/A'}`}
              >
                💡 {suggestedCode}
              </button>
            ) : (() => {
              const codeToCheck = conflictType === 'duplicates' ? getDisplayCode(account) : account.number;
              const endsWithNine = codeToCheck.endsWith('9');
              const base = Math.floor(parseInt(codeToCheck) / 10) * 10;
              const rangeStart = base;
              const rangeEnd = base + 9;
              
              // Utiliser la raison du calcul si disponible
              const reason = suggestion?.reason || `Plage ${rangeStart}-${rangeEnd} saturée`;
              const blockedInfo = suggestion?.blockedBy === 'cncj' ? ' (codes CNCJ)' : 
                                  suggestion?.blockedBy === 'client' ? ' (codes client)' : 
                                  suggestion?.blockedBy === 'both' ? ' (CNCJ + client)' : '';
              
              if (endsWithNine) {
                return (
                  <span className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded whitespace-nowrap" title={reason}>
                    ⚠️ Code finit par 9
                  </span>
                );
              } else {
                return (
                  <span 
                    className="px-3 py-1 text-xs bg-orange-100 text-orange-700 rounded whitespace-nowrap" 
                    title={reason}
                  >
                    ⚠️ Plage {rangeStart}-{rangeEnd} saturée{blockedInfo}
                  </span>
                );
              }
            })()}
          </div>
        )}
      </div>
      
      {/* Afficher le statut pour les conflits CNCJ */}
      {conflictType === 'cncj-conflicts' && (
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-600">Statut:</span>
            {(() => {
              const hasValidCode = replacementCode?.trim() && !isDuplicateCode && !isCncjCode;
              const isForced = cncjForcedValidations.has(account.id);
              
              if (hasValidCode) {
                return (
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded font-medium">
                    ✅ Code de remplacement valide
                  </span>
                );
              } else if (isForced) {
                return (
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded font-medium">
                    🔒 Validation forcée
                  </span>
                );
              } else if (isCncjCode) {
                return (
                  <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded font-medium">
                    ⚠️ Code saisi existe dans CNCJ
                  </span>
                );
              } else if (isDuplicateCode) {
                return (
                  <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded font-medium">
                    ⚠️ Code saisi en doublon
                  </span>
                );
              } else {
                return (
                  <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded font-medium">
                    ⏳ En attente de correction
                  </span>
                );
              }
            })()}
          </div>
          {/* Afficher la case à cocher seulement si pas de code valide */}
          {!replacementCode?.trim() && (
            <div className="flex items-center space-x-2">
              <label className="text-xs text-gray-600 whitespace-nowrap">
                Forcer la validation:
              </label>
              <input
                type="checkbox"
                checked={cncjForcedValidations.has(account.id)}
                onChange={(e) => onCncjForcedValidationChange?.(account.id, e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                title="Cocher pour valider cette ligne sans changer le code de compte"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
