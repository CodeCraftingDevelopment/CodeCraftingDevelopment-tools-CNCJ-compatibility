import { sanitizeCsvValue } from './fileUtils';

/**
 * Utilitaires pour l'export CSV avec BOM et escaping
 * Extraits de Step8MetadataCompletion.tsx pour réutilisation
 */

/**
 * Échappe correctement les guillemets et caractères spéciaux dans les cellules CSV
 */
export const escapeCsvCell = (cell: any): string => {
  if (cell === undefined || cell === null) return '""';
  const cellStr = String(cell);
  const cleaned = cellStr.replace(/[\r\n]+/g, ' ');
  const escaped = sanitizeCsvValue(cleaned).replace(/"/g, '""');
  return `"${escaped}"`;
};

/**
 * Génère le contenu CSV complet avec headers et BOM UTF-8
 */
export const generateCsvContent = (headers: string[], rows: string[][]): string => {
  const escapedHeaders = headers.map(escapeCsvCell);
  const csvContent = [
    escapedHeaders.join(';'),
    ...rows.map(row => row.map(escapeCsvCell).join(';'))
  ].join('\n');
  
  const bom = '\uFEFF';
  return bom + csvContent;
};

/**
 * Télécharge un fichier CSV généré
 */
export const downloadCsvFile = (csvContent: string, filename: string): void => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * Export complet: génère et télécharge un fichier CSV
 */
export const exportToCsv = (headers: string[], rows: string[][], filename: string): void => {
  try {
    const csvContent = generateCsvContent(headers, rows);
    downloadCsvFile(csvContent, filename);
  } catch (error) {
    console.error('Erreur lors de l\'export CSV:', error);
    alert('Une erreur est survenue lors de l\'export. Veuillez réessayer.');
  }
};
