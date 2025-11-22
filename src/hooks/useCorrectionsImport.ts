import { useCallback, useState } from 'react';
import { Account, FileMetadata } from '../types/accounts';
import { formatFileSize } from '../utils/fileUtils';
import { normalizeAccountCode } from '../utils/accountUtils';

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
    // Vérifier les en-têtes du nouveau format (insensible à la casse)
    const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
    return normalizedHeaders.includes('code client') && 
           normalizedHeaders.includes('titre') && 
           normalizedHeaders.includes('code remplacement');
  };

  const parseCSVLine = (line: string): [string, string, string] | null => {
    // Gérer les 5 colonnes du nouveau format : code client, code 7 chiffres, titre, code remplacement, suggestion
    const match = line.match(/^"?([^"]*)"?;\s*"?([^"]*)"?;\s*"?([^"]*)"?;\s*"?([^"]*)"?;(?:\s*"?([^"]*)"?;?)?/);
    if (!match) return null;
    
    const accountNumber = match[1].trim(); // code client (8 chiffres)
    const title = match[3].trim(); // titre (colonne 3)
    let replacementCode = match[4].trim(); // code remplacement (colonne 4)
    const suggestion = match[5] ? match[5].trim() : '';
    
    // Utiliser la suggestion si le code de remplacement est vide
    if (!replacementCode && suggestion) {
      replacementCode = suggestion;
    }
    
    return [accountNumber, title, replacementCode];
  };

  const findDuplicateAccount = (accountNumber: string, title: string): Account | undefined => {
    // Normaliser le numéro de compte pour la comparaison
    const normalizedAccountNumber = normalizeAccountCode(accountNumber);
    
    // Essayer d'abord le matching direct par code original 8 chiffres + titre
    let account = duplicates.find(d => 
      d.originalNumber === accountNumber && 
      d.title && d.title.trim() === title.trim()
    );
    
    // Si pas trouvé, essayer le matching par numéro normalisé + titre
    if (!account) {
      account = duplicates.find(d => 
        d.number === normalizedAccountNumber && 
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
    // Normaliser le code de remplacement pour la comparaison
    const normalizedReplacementCode = normalizeAccountCode(replacementCode);
    
    // Normaliser les codes existants pour la comparaison
    const normalizedExistingCodes = existingCodes.map(code => normalizeAccountCode(code));
    
    // Normaliser les codes originaux pour la comparaison
    const normalizedOriginalCodes = new Set(Array.from(allOriginalCodes).map(code => normalizeAccountCode(code)));
    
    return normalizedExistingCodes.includes(normalizedReplacementCode) || normalizedOriginalCodes.has(normalizedReplacementCode);
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
