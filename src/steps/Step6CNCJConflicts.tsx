import React from 'react';
import { ProcessingResult, Account } from '../types/accounts';
import { ResultsDisplay } from '../components/ResultsDisplay';

interface Step6CNCJConflictsProps {
  cncjConflictResult: ProcessingResult | null;
  loading: boolean;
  cncjReplacementCodes: { [key: string]: string };
  cncjConflictCorrections: { [key: string]: string | 'error' };
  cncjForcedValidations: Set<string>;
  cncjCodes: Set<string>;
  mergedClientAccounts: Account[];
  onCncjReplacementCodeChange: (accountId: string, code: string) => void;
  onCncjForcedValidationChange: (accountId: string, forced: boolean) => void;
}

export const Step6CNCJConflicts: React.FC<Step6CNCJConflictsProps> = ({
  cncjConflictResult,
  loading,
  cncjReplacementCodes,
  cncjConflictCorrections,
  cncjForcedValidations,
  cncjCodes,
  mergedClientAccounts,
  onCncjReplacementCodeChange,
  onCncjForcedValidationChange
}) => {
  return (
    <ResultsDisplay
      key="step6"
      result={cncjConflictResult} 
      loading={loading} 
      showOnly="duplicates"
      replacementCodes={cncjReplacementCodes}
      onReplacementCodeChange={onCncjReplacementCodeChange}
      conflictType="cncj-conflicts"
      corrections={cncjConflictCorrections}
      cncjCodes={cncjCodes}
      cncjForcedValidations={cncjForcedValidations}
      onCncjForcedValidationChange={onCncjForcedValidationChange}
      mergedClientAccounts={mergedClientAccounts}
    />
  );
};
