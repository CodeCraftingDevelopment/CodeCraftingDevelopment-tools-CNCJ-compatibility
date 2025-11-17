export interface Account {
  id: string;
  number: string;
  title?: string;
  source: 'client' | 'cncj';
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
  currentStep: 'step1' | 'step2' | 'step3' | 'step4' | 'stepFinal';
  replacementCodes: { [key: string]: string };
  cncjConflictResult: ProcessingResult | null;
  cncjConflictSuggestions: { [key: string]: string | 'error' };
  finalFilter: 'all' | 'step2' | 'step4' | 'step2+step4';
}
