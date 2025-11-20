import React from 'react';
import { ProcessingResult } from '../types/accounts';
import { ResultsDisplay } from '../components/ResultsDisplay';

interface Step6CNCJConflictsProps {
  cncjConflictResult: ProcessingResult | null;
  loading: boolean;
  cncjReplacementCodes: { [key: string]: string };
  cncjConflictCorrections: { [key: string]: string | 'error' };
  cncjCodes: Set<string>;
  onCncjReplacementCodeChange: (accountId: string, code: string) => void;
}

export const Step6CNCJConflicts: React.FC<Step6CNCJConflictsProps> = ({
  cncjConflictResult,
  loading,
  cncjReplacementCodes,
  cncjConflictCorrections,
  cncjCodes,
  onCncjReplacementCodeChange
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
    />
  );
};
