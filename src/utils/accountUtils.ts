import Papa from 'papaparse';
import { Account, FileUploadResult, ProcessingResult, MergeInfo, NormalizationAccount, InvalidRow } from '../types/accounts';
import { detectCSVFormat, extractAccountData, isValidAccountNumber } from './csvFormatDetector';

export const parseCSVFile = (file: File, allowAlphanumeric: boolean = false): Promise<FileUploadResult> => {
  return new Promise((resolve) => {
    Papa.parse(file, {
      delimiter: ';',
      skipEmptyLines: false,
      header: false, // Forcer le parsing en tableaux pour garantir l'alignement
      complete: (result) => {
        const accounts: Account[] = [];
        const errors: string[] = [];
        let totalRows = 0;
        let skippedRows = 0;
        const invalidRows: InvalidRow[] = [];
        let headers: any = null;
        let detectedFormat: any = null;
        
        result.data.forEach((row: any, index: number) => {
          const cells = Array.isArray(row) ? row : Object.values(row ?? {});

          if (cells.length === 0) {
            return;
          }

          const firstCell = typeof cells[0] === 'string' ? cells[0].trim() : cells[0];
          const isHeaderRow = index === 0 && typeof firstCell === 'string' && firstCell.length > 0 && isNaN(Number(firstCell));
          if (isHeaderRow) {
            headers = cells;
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

          // Check line count limit during parsing
          if (totalRows > 100000) {
            errors.push(`Le fichier contient plus de 100 000 lignes. Pour des raisons de performance, veuillez diviser ce fichier en plusieurs parties plus petites.`);
            resolve({ accounts: [], errors, totalRows, skippedRows: totalRows, invalidRows });
            return;
          }

          // Logique pour les fichiers standards
          // Détecter le format une seule fois avec les headers
          if (!detectedFormat) {
            detectedFormat = detectCSVFormat(cells, headers);
          }
          
          const format = detectedFormat;
          const { accountNumber, accountTitle } = extractAccountData(cells, format);
          const trimmedAccountNumber = accountNumber?.trim();

          const recordInvalid = (reason: string) => {
            skippedRows += 1;
            const values = cells.map((cell) => (cell ?? '').toString().trim());
            invalidRows.push({
              lineNumber: index + 1,
              values,
              reason
            });
            errors.push(`Ligne ${index + 1}: ${reason}`);
          };

          if (!trimmedAccountNumber) {
            recordInvalid(`aucun numéro de compte détecté`);
            return;
          }

          // Valider en fonction du format détecté
          const isAxelorFormat = format === 'axelor';
          const shouldAllowAlpha = allowAlphanumeric || isAxelorFormat;
          
          if (isValidAccountNumber(trimmedAccountNumber, shouldAllowAlpha)) {
            // Stocker les données brutes pour les fichiers PCG (format axelor)
            let rawData: Record<string, any> | undefined;
            if (isAxelorFormat && headers && Array.isArray(headers)) {
              rawData = {};
              // S'assurer que cells a la même longueur que headers pour éviter les décalages
              const alignedCells = [...cells];
              while (alignedCells.length < headers.length) {
                alignedCells.push(''); // Ajouter des cellules vides si nécessaire
              }
              
              headers.forEach((header: any, index: number) => {
                if (typeof header === 'string' && index < alignedCells.length && rawData) {
                  rawData[header.trim()] = alignedCells[index] || '';
                }
              });
            }

            accounts.push({
              id: `${trimmedAccountNumber}-${index}`,
              number: trimmedAccountNumber,
              title: accountTitle || undefined,
              source: 'client', // Will be updated by caller
              originalNumber: trimmedAccountNumber, // Stocker le code original 8 chiffres
              rawData // Stocker les données brutes pour PCG
            });
          } else {
            recordInvalid(`"${trimmedAccountNumber}" n'est pas un numéro de compte valide`);
          }
        });
        
        // Ajuster skippedRows au cas où certains comptes valides n'ont pas été comptés explicitement
        const computedSkipped = Math.max(totalRows - accounts.length, skippedRows);
        resolve({ accounts, errors, totalRows, skippedRows: computedSkipped, invalidRows });
      },
      error: (error) => {
        resolve({ accounts: [], errors: [error.message], totalRows: 0, skippedRows: 0, invalidRows: [] });
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

export const normalizeAccountCode = (accountNumber: string): string => {
  if (accountNumber.length > 7) {
    // Tronquer si trop long (10810000 -> 1081000)
    return accountNumber.slice(0, 7);
  } else if (accountNumber.length < 7) {
    // Ajouter des zéros en fin si trop court
    return accountNumber.padEnd(7, '0');
  }
  return accountNumber;
};

export const getDisplayCode = (account?: Account): string => {
  // Afficher le code original (8 chiffres) s'il existe, sinon le code normalisé
  return account?.originalNumber || account?.number || '';
};

export const compareAccounts = (
  clientAccounts: Account[], 
  cncjAccounts: Account[]
): {
  matches: Account[];
  unmatchedClients: Account[];
} => {
  // Utiliser les codes CNCJ tels quels (données de référence avec isCNCJ=true)
  const cncjNumbers = new Set(cncjAccounts.map(acc => acc.number));
  const matches: Account[] = [];
  const unmatchedClients: Account[] = [];
  
  clientAccounts.forEach(clientAccount => {
    const normalizedClientNumber = normalizeAccountCode(clientAccount.number);
    if (cncjNumbers.has(normalizedClientNumber)) {
      matches.push(clientAccount);
    } else {
      unmatchedClients.push(clientAccount);
    }
  });
  
  return { matches, unmatchedClients };
};

export const processAccounts = (
  clientAccounts: Account[], 
  cncjAccounts: Account[],
  generalAccounts: Account[] = []
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
  
  // Étape 5 : Séparer les comptes à créer (ni dans CNCJ ni dans généraux)
  const generalAccountNumbers = new Set(generalAccounts.map(acc => acc.number));
  const toCreate = unmatchedClients.filter(client => 
    !generalAccountNumbers.has(client.number)
  );
  
  // unmatchedClients devient maintenant les comptes qui sont dans généraux mais pas dans CNCJ
  const finalUnmatchedClients = unmatchedClients.filter(client => 
    generalAccountNumbers.has(client.number)
  );
  
  return {
    duplicates,
    uniqueClients,
    matches,
    unmatchedClients: finalUnmatchedClients,
    toCreate
  };
};

export const findAccountsNeedingNormalization = (accounts: Account[]): NormalizationAccount[] => {
  return accounts
    .filter(account => account.source === 'client' && account.number.length !== 7)
    .map(account => {
      let normalizedNumber: string;
      if (account.number.length > 7) {
        // Tronquer si trop long
        normalizedNumber = account.number.slice(0, 7);
      } else {
        // Ajouter des zéros en fin si trop court
        normalizedNumber = account.number.padEnd(7, '0');
      }
      
      return {
        id: account.id,
        originalNumber: account.number,
        normalizedNumber,
        title: account.title
      };
    });
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
