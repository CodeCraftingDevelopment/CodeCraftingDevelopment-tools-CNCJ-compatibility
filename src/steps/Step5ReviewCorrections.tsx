import React from 'react';
import { ProcessingResult, Account } from '../types/accounts';
import { ResultsDisplay } from '../components/ResultsDisplay';

interface Step5ReviewCorrectionsProps {
  result: ProcessingResult | null;
  loading: boolean;
  replacementCodes: { [key: string]: string };
  mergedClientAccounts: Account[];
  originalClientAccounts: Account[];
  svvCorrespondences: { [compteEncheres: string]: string };
  duplicateIdsFromStep4: Set<string>;
  duplicateCorrectionsCount: number;
}

export const Step5ReviewCorrections: React.FC<Step5ReviewCorrectionsProps> = ({
  result,
  loading,
  replacementCodes,
  mergedClientAccounts,
  originalClientAccounts,
  svvCorrespondences,
  duplicateIdsFromStep4,
  duplicateCorrectionsCount
}) => {
  return (
    <>
      <p className="text-gray-600 mb-4">
        {duplicateCorrectionsCount} correction{duplicateCorrectionsCount > 1 ? 's' : ''} doublons appliquée{duplicateCorrectionsCount > 1 ? 's' : ''}
      </p>
      
      <ResultsDisplay
        key="step5"
        result={result} 
        loading={loading} 
        showOnly="review"
        replacementCodes={replacementCodes}
        onReplacementCodeChange={undefined}
        mergedClientAccounts={mergedClientAccounts}
        originalClientAccounts={originalClientAccounts}
        svvCorrespondences={svvCorrespondences}
        duplicateIdsFromStep4={duplicateIdsFromStep4}
      />
    </>
  );
};
