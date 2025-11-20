import React from 'react';
import { ProcessingResult } from '../types/accounts';
import { ResultsDisplay } from '../components/ResultsDisplay';

interface Step4DuplicatesResolutionProps {
  result: ProcessingResult | null;
  loading: boolean;
  replacementCodes: { [key: string]: string };
  onReplacementCodeChange: (accountId: string, code: string) => void;
}

export const Step4DuplicatesResolution: React.FC<Step4DuplicatesResolutionProps> = ({
  result,
  loading,
  replacementCodes,
  onReplacementCodeChange
}) => {
  return (
    <ResultsDisplay
      key="step4"
      result={result} 
      loading={loading} 
      showOnly="duplicates"
      replacementCodes={replacementCodes}
      onReplacementCodeChange={onReplacementCodeChange}
    />
  );
};
