export type CSVFormat = 'string' | 'array' | 'object' | 'axelor' | 'unknown';

export interface CSVRowData {
  accountNumber: string;
  accountTitle: string;
}

export const detectCSVFormat = (row: any, headers?: any): CSVFormat => {
  // Détecter le format Axelor (Comptes_PCG_CNCJ.csv)
  if (headers && typeof headers === 'object') {
    const headerKeys = Array.isArray(headers) ? headers : Object.values(headers);
    const hasAxelorHeaders = headerKeys.some((h: any) => 
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
    if (row.account) {
      return 'object';
    }
    const keys = Object.keys(row);
    if (keys.length >= 2) {
      return 'object';
    }
  }
  return 'unknown';
};

export const extractAccountData = (row: any, format: CSVFormat): CSVRowData => {
  switch (format) {
    case 'string':
      return {
        accountNumber: row.toString().trim(),
        accountTitle: ''
      };
      
    case 'array':
      return {
        accountNumber: row[0]?.toString().trim() || '',
        accountTitle: row[1]?.toString().trim() || ''
      };
    
    case 'axelor':
      // Format Axelor: code -> numéro, name -> titre
      if (Array.isArray(row)) {
        return {
          accountNumber: row[1]?.toString().trim() || '', // code
          accountTitle: row[3]?.toString().trim() || ''    // name
        };
      } else if (row && typeof row === 'object') {
        // Accès direct par nom de colonne (PapaParse crée un objet avec les noms d'en-têtes)
        return {
          accountNumber: row['code']?.toString().trim() || '',
          accountTitle: row['name']?.toString().trim() || ''
        };
      }
      return {
        accountNumber: '',
        accountTitle: ''
      };
      
    case 'object':
      if (row.account) {
        return {
          accountNumber: row.account.toString().trim(),
          accountTitle: row.title?.toString().trim() || ''
        };
      }
      // Try first two columns
      const keys = Object.keys(row);
      return {
        accountNumber: row[keys[0]]?.toString().trim() || '',
        accountTitle: row[keys[1]]?.toString().trim() || ''
      };
      
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
