import React from 'react';

// Interface for account metadata fields
export interface AccountMetadata {
  [key: string]: string | number | boolean | null;
}

export interface Account {
  id: string;
  number: string;
  title?: string;
  source: 'client' | 'cncj' | 'general';
  originalNumber?: string; // Code original 8 chiffres du fichier d'import
  rawData?: Record<string, unknown>; // Données brutes du CSV (pour PCG avec 24 colonnes)
}

export interface NormalizationAccount {
  id: string;
  originalNumber: string;
  normalizedNumber: string;
  title?: string;
}

export interface MergeInfo {
  number: string;
  title: string;
  mergedCount: number;
}

export interface ProcessingResult {
  duplicates: Account[];
  uniqueClients: Account[];
  matches: Account[];
  unmatchedClients: Account[];
  toCreate: Account[];
}

export interface FileUploadResult {
  accounts: Account[];
  errors: string[];
  totalRows: number;
  skippedRows: number;
  invalidRows: InvalidRow[];
}

export interface FileMetadata {
  name: string;
  size: string;
  rowCount: number;
  totalRows?: number;
  skippedRows?: number;
  loadStatus: 'success' | 'warning' | 'error' | 'loading';
}

export interface InvalidRow {
  lineNumber: number;
  values: string[];
  reason: string;
}

export interface AppState {
  clientAccounts: Account[];
  cncjAccounts: Account[];
  generalAccounts: Account[];
  clientFileInfo: FileMetadata | null;
  cncjFileInfo: FileMetadata | null;
  generalFileInfo: FileMetadata | null;
  result: ProcessingResult | null;
  loading: boolean;
  errors: string[];
  currentStep: 'step1' | 'step2' | 'step3' | 'step4' | 'step5' | 'step6' | 'step7' | 'stepFinal';
  replacementCodes: { [key: string]: string };
  cncjReplacementCodes: { [key: string]: string };
  mergeInfo: MergeInfo[];
  cncjConflictResult: ProcessingResult | null;
  cncjConflictCorrections: { [key: string]: string | 'error' };
  finalFilter: 'all' | 'step4' | 'step6' | 'step4+step6' | 'toCreate';
  accountsNeedingNormalization: NormalizationAccount[];
  isNormalizationApplied: boolean;
  missingMetadata: { [accountId: string]: AccountMetadata };
}

export type AppAction = 
  | { type: 'SET_CLIENT_ACCOUNTS'; payload: Account[] }
  | { type: 'SET_CNCJ_ACCOUNTS'; payload: Account[] }
  | { type: 'SET_GENERAL_ACCOUNTS'; payload: Account[] }
  | { type: 'SET_CLIENT_FILE_INFO'; payload: FileMetadata | null }
  | { type: 'SET_CNCJ_FILE_INFO'; payload: FileMetadata | null }
  | { type: 'SET_GENERAL_FILE_INFO'; payload: FileMetadata | null }
  | { type: 'SET_RESULT'; payload: ProcessingResult | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERRORS'; payload: string[] }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'SET_CURRENT_STEP'; payload: 'step1' | 'step2' | 'step3' | 'step4' | 'step5' | 'step6' | 'step7' | 'stepFinal' }
  | { type: 'SET_REPLACEMENT_CODE'; payload: { accountId: string; code: string } }
  | { type: 'CLEAR_REPLACEMENT_CODES' }
  | { type: 'SET_CNCJ_REPLACEMENT_CODE'; payload: { accountId: string; code: string } }
  | { type: 'CLEAR_CNCJ_REPLACEMENT_CODES' }
  | { type: 'SET_MERGE_INFO'; payload: MergeInfo[] }
  | { type: 'SET_CNCJ_CONFLICT_RESULT'; payload: ProcessingResult | null }
  | { type: 'SET_CNCJ_CONFLICT_CORRECTIONS'; payload: { [key: string]: string | 'error' } }
  | { type: 'SET_FINAL_FILTER'; payload: 'all' | 'step4' | 'step6' | 'step4+step6' | 'toCreate' }
  | { type: 'SET_ACCOUNTS_NEEDING_NORMALIZATION'; payload: NormalizationAccount[] }
  | { type: 'SET_NORMALIZATION_APPLIED'; payload: boolean }
  | { type: 'SET_MISSING_METADATA'; payload: { [accountId: string]: AccountMetadata } }
  | { type: 'SET_MISSING_METADATA_FIELD'; payload: { accountId: string; field: string; value: string } };

export type AppDispatch = React.Dispatch<AppAction>;
