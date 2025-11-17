export interface Account {
  id: string;
  number: string;
  title?: string;
  source: 'client' | 'cncj';
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
}

export interface FileUploadResult {
  accounts: Account[];
  errors: string[];
}

export interface FileMetadata {
  name: string;
  size: string;
  rowCount: number;
  loadStatus: 'success' | 'warning' | 'error' | 'loading';
}

export interface AppState {
  clientAccounts: Account[];
  cncjAccounts: Account[];
  clientFileInfo: FileMetadata | null;
  cncjFileInfo: FileMetadata | null;
  result: ProcessingResult | null;
  loading: boolean;
  errors: string[];
  currentStep: 'step1' | 'step2' | 'step3' | 'step4' | 'step5' | 'stepFinal';
  replacementCodes: { [key: string]: string };
  cncjReplacementCodes: { [key: string]: string };
  mergeInfo: MergeInfo[];
  cncjConflictResult: ProcessingResult | null;
  cncjConflictSuggestions: { [key: string]: string | 'error' };
  finalFilter: 'all' | 'step3' | 'step5' | 'step3+step5';
}
