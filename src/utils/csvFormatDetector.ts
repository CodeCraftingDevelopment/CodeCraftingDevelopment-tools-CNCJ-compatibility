export type CSVFormat = 'string' | 'array' | 'object' | 'unknown';

export interface CSVRowData {
  accountNumber: string;
  accountTitle: string;
}

export const detectCSVFormat = (row: any): CSVFormat => {
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

export const isValidAccountNumber = (accountNumber: string): boolean => {
  return !!accountNumber && /^\d+$/.test(accountNumber);
};
