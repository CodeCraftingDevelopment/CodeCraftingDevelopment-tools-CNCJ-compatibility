import React from 'react';
import { ProcessingResult, Account } from '../types/accounts';
import { ResultsDisplay } from '../components/ResultsDisplay';
import { SuggestionResult } from '../utils/codeSuggestions';

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
  // Données de l'étape 4 pour l'export combiné
  step4Duplicates?: Account[];
  step4Suggestions?: Map<string, SuggestionResult>;
  step4ReplacementCodes?: { [key: string]: string };
  // Suggestions initiales sauvegardées
  initialSuggestions?: { [accountId: string]: SuggestionResult };
  initialCncjSuggestions?: { [accountId: string]: SuggestionResult };
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
  onCncjForcedValidationChange,
  step4Duplicates,
  step4Suggestions,
  step4ReplacementCodes,
  initialSuggestions,
  initialCncjSuggestions
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
      step4Duplicates={step4Duplicates}
      step4Suggestions={step4Suggestions}
      step4ReplacementCodes={step4ReplacementCodes}
      savedInitialSuggestions={initialSuggestions}
      savedInitialCncjSuggestions={initialCncjSuggestions}
    />
  );
};
