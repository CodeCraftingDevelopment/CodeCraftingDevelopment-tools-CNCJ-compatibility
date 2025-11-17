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

export const mergeIdenticalAccounts = (accounts: Account[]): Account[] => {
  const seen = new Map<string, Account>();
  const merged: Account[] = [];
  
  accounts.forEach(account => {
    // Créer une clé unique basée sur le numéro ET le titre
    const key = `${account.number}-${account.title || ''}`;
    
    if (!seen.has(key)) {
      // Première occurrence : garder ce compte comme représentant
      seen.set(key, account);
      merged.push(account);
    }
    // Si la clé existe déjà, on ignore ce compte (fusionné dans le premier)
  });
  
  return merged;
};

export const findDuplicates = (accounts: Account[]): Account[] => {
  // Compter les occurrences de chaque numéro de compte
  const numberCounts = new Map<string, number>();
  
  accounts.forEach(account => {
    numberCounts.set(account.number, (numberCounts.get(account.number) || 0) + 1);
  });
  
  // Retourner TOUS les comptes qui ont des doublons (count > 1)
  return accounts.filter(account => numberCounts.get(account.number)! > 1);
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
  // Étape 1 : Fusionner les comptes identiques (même numéro ET titre)
  const mergedAccounts = mergeIdenticalAccounts(clientAccounts);
  
  // Étape 2 : Détecter les doublons sur les comptes fusionnés
  const duplicates = findDuplicates(mergedAccounts);
  const uniqueClients = mergedAccounts.filter(acc => 
    !duplicates.some(dup => dup.id === acc.id)
  );
  
  // Étape 3 : Comparer avec les comptes CNCJ
  const { matches, unmatchedClients } = compareAccounts(uniqueClients, cncjAccounts);
  
  return {
    duplicates,
    uniqueClients,
    matches,
    unmatchedClients
  };
};
