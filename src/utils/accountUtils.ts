import Papa from 'papaparse';
import { Account, FileUploadResult, ProcessingResult } from '../types/accounts';
import { detectCSVFormat, extractAccountData, isValidAccountNumber } from './csvFormatDetector';

export const parseCSVFile = (file: File): Promise<FileUploadResult> => {
  return new Promise((resolve) => {
    Papa.parse(file, {
      complete: (result) => {
        const accounts: Account[] = [];
        const errors: string[] = [];
        
        result.data.forEach((row: any, index: number) => {
          // Skip header row if exists
          if (index === 0 && isNaN(row[0])) {
            return;
          }
          
          const format = detectCSVFormat(row);
          const { accountNumber, accountTitle } = extractAccountData(row, format);
          
          if (isValidAccountNumber(accountNumber)) {
            accounts.push({
              id: `${accountNumber}-${index}`,
              number: accountNumber,
              title: accountTitle || undefined,
              source: 'client' // Will be updated by caller
            });
          } else if (accountNumber) {
            errors.push(`Ligne ${index + 1}: "${accountNumber}" n'est pas un numéro de compte valide`);
          }
        });
        
        resolve({ accounts, errors });
      },
      error: (error) => {
        resolve({ accounts: [], errors: [error.message] });
      }
    });
  });
};

export const findDuplicates = (accounts: Account[]): Account[] => {
  const seen = new Map<string, Account>();
  const duplicates: Account[] = [];
  
  accounts.forEach(account => {
    if (seen.has(account.number)) {
      duplicates.push(account);
    } else {
      seen.set(account.number, account);
    }
  });
  
  return duplicates;
};

export const compareAccounts = (
  clientAccounts: Account[], 
  cncjAccounts: Account[]
): {
  matches: Account[];
  unmatchedClients: Account[];
} => {
  const cncjNumbers = new Set(cncjAccounts.map(acc => acc.number));
  const matches: Account[] = [];
  const unmatchedClients: Account[] = [];
  
  clientAccounts.forEach(clientAccount => {
    if (cncjNumbers.has(clientAccount.number)) {
      matches.push(clientAccount);
    } else {
      unmatchedClients.push(clientAccount);
    }
  });
  
  return { matches, unmatchedClients };
};

export const processAccounts = (
  clientAccounts: Account[], 
  cncjAccounts: Account[]
): ProcessingResult => {
  const duplicates = findDuplicates(clientAccounts);
  const uniqueClients = clientAccounts.filter(acc => 
    !duplicates.some(dup => dup.id === acc.id)
  );
  
  const { matches, unmatchedClients } = compareAccounts(uniqueClients, cncjAccounts);
  
  return {
    duplicates,
    uniqueClients,
    matches,
    unmatchedClients
  };
};
