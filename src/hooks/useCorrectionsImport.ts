import { useCallback, useState } from 'react';
import { Account, FileMetadata } from '../types/accounts';
import { formatFileSize } from '../utils/fileUtils';

interface UseCorrectionsImportProps {
  duplicates: Account[];
  uniqueClients: Account[];
  matches: Account[];
  unmatchedClients: Account[];
  replacementCodes: { [key: string]: string };
  onReplacementCodeChange?: (accountId: string, code: string) => void;
}

export const useCorrectionsImport = ({
  duplicates,
  uniqueClients,
  matches,
  unmatchedClients,
  replacementCodes,
  onReplacementCodeChange
}: UseCorrectionsImportProps) => {
  const [correctionsFileInfo, setCorrectionsFileInfo] = useState<FileMetadata | null>(null);

  const validateHeaders = (headers: string[]): boolean => {
    return headers.includes('Code remplacement');
  };

  const parseCSVLine = (line: string): [string, string, string] | null => {
    // Gérer les 3 ou 4 colonnes (avec ou sans suggestion)
    const match = line.match(/^"?([^"]*)"?;\s*"?([^"]*)"?;\s*"?([^"]*)"?;(?:\s*"?([^"]*)"?;?)?/);
    if (!match) return null;
    
    const accountNumber = match[1].trim();
    const title = match[2].trim();
    let replacementCode = match[3].trim();
    const suggestion = match[4] ? match[4].trim() : '';
    
    // Utiliser la suggestion si le code de remplacement est vide
    if (!replacementCode && suggestion) {
      replacementCode = suggestion;
    }
    
    return [accountNumber, title, replacementCode];
  };

  const findDuplicateAccount = (accountNumber: string, title: string): Account | undefined => {
    // Essayer d'abord le matching direct par code original 8 chiffres + titre
    let account = duplicates.find(d => 
      d.originalNumber === accountNumber && 
      d.title && d.title.trim() === title.trim()
    );
    
    // Si pas trouvé, essayer le matching par numéro normalisé + titre (fallback)
    if (!account) {
      account = duplicates.find(d => 
        d.number === accountNumber && 
        d.title && d.title.trim() === title.trim()
      );
    }
    
    return account;
  };

  const isDuplicateCode = (
    replacementCode: string, 
    existingCodes: string[], 
    allOriginalCodes: Set<string>
  ): boolean => {
    return existingCodes.includes(replacementCode) || allOriginalCodes.has(replacementCode);
  };

  const getAllOriginalCodes = (): Set<string> => {
    return new Set([
      ...uniqueClients.map(acc => acc.number),
      ...matches.map(acc => acc.number), 
      ...unmatchedClients.map(acc => acc.number)
    ]);
  };

  const processCorrectionsFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      return;
    }

    setCorrectionsFileInfo({
      name: file.name,
      size: formatFileSize(file.size),
      rowCount: 0,
      loadStatus: 'loading'
    });

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const lines = content.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        setCorrectionsFileInfo({
          name: file.name,
          size: formatFileSize(file.size),
          rowCount: 0,
          loadStatus: 'error'
        });
        return;
      }

      const headers = lines[0].split(';').map(h => h.trim().replace(/^"|"$/g, ''));
      if (!validateHeaders(headers)) {
        setCorrectionsFileInfo({
          name: file.name,
          size: formatFileSize(file.size),
          rowCount: 0,
          loadStatus: 'error'
        });
        return;
      }

      let processedCount = 0;
      let duplicateCodeCount = 0;
      const allOriginalCodes = getAllOriginalCodes();
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const parsedLine = parseCSVLine(line);
        if (!parsedLine) continue;
        
        const [accountNumber, title, replacementCode] = parsedLine;
        
        if (!accountNumber || !title || !replacementCode) {
          continue;
        }
        
        const duplicateAccount = findDuplicateAccount(accountNumber, title);
        const existingCodes = Object.values(replacementCodes);
        const conflictsWithOriginal = isDuplicateCode(replacementCode, existingCodes, allOriginalCodes);
        
        if (duplicateAccount) {
          onReplacementCodeChange?.(duplicateAccount.id, replacementCode);
          processedCount++;
          
          if (conflictsWithOriginal) {
            duplicateCodeCount++;
          }
        }
      }
      
      setCorrectionsFileInfo({
        name: file.name,
        size: formatFileSize(file.size),
        rowCount: processedCount,
        loadStatus: 'success'
      });
    };
    
    reader.onerror = () => {
      setCorrectionsFileInfo({
        name: file.name,
        size: formatFileSize(file.size),
        rowCount: 0,
        loadStatus: 'error'
      });
    };
    
    reader.readAsText(file);
  }, [duplicates, replacementCodes, onReplacementCodeChange, uniqueClients, matches, unmatchedClients]);

  const handleClearCorrectionsFile = useCallback(() => {
    setCorrectionsFileInfo(null);
  }, []);

  return {
    correctionsFileInfo,
    processCorrectionsFile,
    handleClearCorrectionsFile
  };
};
