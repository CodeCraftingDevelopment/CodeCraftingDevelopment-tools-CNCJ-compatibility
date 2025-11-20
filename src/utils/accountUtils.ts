import Papa from 'papaparse';
import { Account, FileUploadResult, ProcessingResult, MergeInfo, NormalizationAccount } from '../types/accounts';
import { detectCSVFormat, extractAccountData, isValidAccountNumber } from './csvFormatDetector';

export const parseCSVFile = (file: File): Promise<FileUploadResult> => {
  return new Promise((resolve) => {
    Papa.parse(file, {
      skipEmptyLines: false,
      complete: (result) => {
        const accounts: Account[] = [];
        const errors: string[] = [];
        let totalRows = 0;
        let skippedRows = 0;
        
        result.data.forEach((row: any, index: number) => {
          const cells = Array.isArray(row) ? row : Object.values(row ?? {});

          if (cells.length === 0) {
            return;
          }

          const firstCell = typeof cells[0] === 'string' ? cells[0].trim() : cells[0];
          const isHeaderRow = index === 0 && typeof firstCell === 'string' && firstCell.length > 0 && isNaN(Number(firstCell));
          if (isHeaderRow) {
            return;
          }

          const hasContent = cells.some((cell) => {
            if (cell === null || cell === undefined) return false;
            if (typeof cell === 'string') {
              return cell.trim().length > 0;
            }
            return true;
          });

          if (!hasContent) {
            return;
          }

          totalRows += 1;

          const format = detectCSVFormat(cells);
          const { accountNumber, accountTitle } = extractAccountData(cells, format);
          const trimmedAccountNumber = accountNumber?.trim();

          if (!trimmedAccountNumber) {
            skippedRows += 1;
            errors.push(`Ligne ${index + 1}: aucun numéro de compte détecté`);
            return;
          }

          if (isValidAccountNumber(trimmedAccountNumber)) {
            accounts.push({
              id: `${trimmedAccountNumber}-${index}`,
              number: trimmedAccountNumber,
              title: accountTitle || undefined,
              source: 'client' // Will be updated by caller
            });
          } else {
            skippedRows += 1;
            errors.push(`Ligne ${index + 1}: "${trimmedAccountNumber}" n'est pas un numéro de compte valide`);
          }
        });
        
        // Ajuster skippedRows au cas où certains comptes valides n'ont pas été comptés explicitement
        const computedSkipped = Math.max(totalRows - accounts.length, skippedRows);
        resolve({ accounts, errors, totalRows, skippedRows: computedSkipped });
      },
      error: (error) => {
        resolve({ accounts: [], errors: [error.message], totalRows: 0, skippedRows: 0 });
      }
    });
  });
};

export const mergeIdenticalAccounts = (accounts: Account[]): { merged: Account[], mergeInfo: MergeInfo[] } => {
  console.log('🔍 DEBUG: mergeIdenticalAccounts appelé avec', accounts.length, 'comptes');
  console.log('🔍 DEBUG: Comptes d\'origine:', accounts.map(a => ({ number: a.number, title: a.title })));
  
  const seen = new Map<string, Account>();
  const merged: Account[] = [];
  const mergeInfo: MergeInfo[] = [];
  const countMap = new Map<string, number>();
  
  // Compter les occurrences pour chaque clé unique
  accounts.forEach(account => {
    const key = `${account.number}-${account.title || ''}`;
    countMap.set(key, (countMap.get(key) || 0) + 1);
  });
  
  console.log('🔍 DEBUG: countMap généré:', Object.fromEntries(countMap));
  
  accounts.forEach(account => {
    // Créer une clé unique basée sur le numéro ET le titre
    const key = `${account.number}-${account.title || ''}`;
    
    if (!seen.has(key)) {
      // Première occurrence : garder ce compte comme représentant
      seen.set(key, account);
      merged.push(account);
      
      // Ajouter les infos de fusion si plus d'une occurrence
      const count = countMap.get(key) || 0;
      if (count > 1) {
        mergeInfo.push({
          number: account.number,
          title: account.title || '',
          mergedCount: count
        });
      }
    }
    // Si la clé existe déjà, on ignore ce compte (fusionné dans le premier)
  });
  
  console.log('🔍 DEBUG: mergeInfo final:', mergeInfo);
  console.log('🔍 DEBUG: Fusion terminée -', mergeInfo.length, 'groupes fusionnés');
  
  return { merged, mergeInfo };
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
  // Note: les comptes sont déjà fusionnés dans handleFileLoaded
  // Étape 2 : Détecter les doublons sur les comptes fusionnés
  const duplicates = findDuplicates(clientAccounts);
  const uniqueClients = clientAccounts.filter(acc => 
    !duplicates.some(dup => dup.id === acc.id)
  );
  
  // Étape 4 : Comparer avec les comptes CNCJ
  const { matches, unmatchedClients } = compareAccounts(uniqueClients, cncjAccounts);
  
  return {
    duplicates,
    uniqueClients,
    matches,
    unmatchedClients
  };
};

export const findAccountsNeedingNormalization = (accounts: Account[]): NormalizationAccount[] => {
  return accounts
    .filter(account => account.source === 'client' && account.number.length > 7)
    .map(account => ({
      id: account.id,
      originalNumber: account.number,
      normalizedNumber: account.number.slice(0, 7),
      title: account.title
    }));
};

export const applyNormalization = (accounts: Account[], normalizationAccounts: NormalizationAccount[]): Account[] => {
  const normalizationMap = new Map(
    normalizationAccounts.map(norm => [norm.id, norm.normalizedNumber])
  );
  
  return accounts.map(account => {
    const normalizedNumber = normalizationMap.get(account.id);
    if (normalizedNumber) {
      return {
        ...account,
        number: normalizedNumber,
        id: `${normalizedNumber}-${account.id.split('-')[1]}` // Mettre à jour l'ID avec le numéro normalisé
      };
    }
    return account;
  });
};
