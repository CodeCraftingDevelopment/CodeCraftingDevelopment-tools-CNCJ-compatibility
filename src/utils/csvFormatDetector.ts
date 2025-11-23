export type CSVFormat = 'string' | 'array' | 'object' | 'axelor' | 'unknown';

export interface CSVRowData {
  accountNumber: string;
  accountTitle: string;
}

export const detectCSVFormat = (row: unknown, headers?: string[]): CSVFormat => {
  if (!row || typeof row !== 'object') {
    return 'unknown';
  }
  
  // Détecter le format Axelor (Comptes_PCG.csv)
  if (headers && typeof headers === 'object') {
    const headerKeys = Array.isArray(headers) ? headers : Object.values(headers);
    const hasAxelorHeaders = headerKeys.some((h: unknown) => 
      typeof h === 'string' && (
        h.includes('accountType.importId') || 
        h.includes('importId') && h.includes('code')
      )
    );
    if (hasAxelorHeaders) {
      return 'axelor';
    }
  }
  
  if (typeof row === 'string') {
    return 'string';
  } else if (Array.isArray(row)) {
    return 'array';
  } else if (row && typeof row === 'object') {
    const rowObj = row as Record<string, unknown>;
    if (rowObj['account']) {
      return 'object';
    }
    const keys = Object.keys(rowObj);
    if (keys.length >= 2) {
      return 'object';
    }
  }
  return 'unknown';
};

export const extractAccountData = (row: unknown, format: CSVFormat): CSVRowData => {
  if (!row || typeof row !== 'object') {
    return {
      accountNumber: '',
      accountTitle: ''
    };
  }
  
  const rowObj = row as Record<string, unknown>;
  
  switch (format) {
    case 'string':
      return {
        accountNumber: rowObj.toString().trim(),
        accountTitle: ''
      };
      
    case 'array':
      if (Array.isArray(rowObj)) {
        return {
          accountNumber: rowObj[0]?.toString().trim() || '',
          accountTitle: rowObj[1]?.toString().trim() || ''
        };
      }
      return {
        accountNumber: '',
        accountTitle: ''
      };
    
    case 'axelor':
      // Format Axelor: code -> numéro, name -> titre
      if (Array.isArray(rowObj)) {
        return {
          accountNumber: rowObj[1]?.toString().trim() || '', // code
          accountTitle: rowObj[3]?.toString().trim() || ''    // name
        };
      } else {
        // Accès direct par nom de colonne (PapaParse crée un objet avec les noms d'en-têtes)
        return {
          accountNumber: rowObj['code']?.toString().trim() || '',
          accountTitle: rowObj['name']?.toString().trim() || ''
        };
      }
      
    case 'object':
      if (rowObj.account) {
        return {
          accountNumber: rowObj.account.toString().trim(),
          accountTitle: rowObj.title?.toString().trim() || ''
        };
      }
      // Try first two columns
      {
        const keys = Object.keys(rowObj);
        return {
          accountNumber: rowObj[keys[0]]?.toString().trim() || '',
          accountTitle: rowObj[keys[1]]?.toString().trim() || ''
        };
      }
      
    default:
      return {
        accountNumber: '',
        accountTitle: ''
      };
  }
};

export const isValidAccountNumber = (accountNumber: string, allowAlphanumeric: boolean = false): boolean => {
  if (!accountNumber) return false;
  
  // Accepter les codes alphanumériques pour les comptes généraux (format Axelor)
  // Inclut lettres, chiffres, underscores et tirets
  if (allowAlphanumeric) {
    return /^[A-Za-z0-9_-]+$/.test(accountNumber);
  }
  
  // Format standard : uniquement des chiffres
  return /^\d+$/.test(accountNumber);
};
