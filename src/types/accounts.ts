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
