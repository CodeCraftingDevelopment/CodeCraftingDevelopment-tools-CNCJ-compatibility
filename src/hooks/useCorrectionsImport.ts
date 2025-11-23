import { useCallback, useState } from 'react';
import { Account, FileMetadata } from '../types/accounts';
import { formatFileSize } from '../utils/fileUtils';
import { normalizeAccountCode } from '../utils/accountUtils';

// Debug logging removed for production - use React DevTools if needed

// Fonction utilitaire pour normaliser les titres de manière plus flexible
const normalizeTitle = (title: string): string => {
  return title.toLowerCase()
    .replace(/\s+/g, ' ') // Remplacer les espaces multiples par un seul
    .trim();
};

/**
 * Bug fix for Step 6 CSV import:
 * 1. Case-insensitive title matching via normalizeTitle()
 * 2. Windows line-ending support (removed $ anchor from regex)
 * 3. 4-column CSV format support (code client, code 7 chiffres, titre, code remplacement)
 * 4. Preserves originalNumber matching for 8-digit account codes
 */

interface UseCorrectionsImportProps {
  duplicates: Account[];
  _uniqueClients: Account[];
  _matches: Account[];
  _unmatchedClients: Account[];
  _replacementCodes: { [key: string]: string };
  onReplacementCodeChange?: (accountId: string, code: string) => void;
}

export const useCorrectionsImport = ({
  duplicates,
  _uniqueClients,
  _matches,
  _unmatchedClients,
  _replacementCodes,
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
    // Gérer les 4 colonnes du format étape 6 ou 5 colonnes du format étape 4
    // Format : code client, code 7 chiffres, titre, code remplacement [, suggestion]
    // Regex corrigé pour ne pas exiger de point-virgule final et gérer les fins de ligne Windows
    const match = line.match(/^"?([^"]*)"?;\s*"?([^"]*)"?;\s*"?([^"]*)"?;\s*"?([^"]*)"(?:;\s*"?([^"]*)")?/);
    if (!match) return null;
    
    const accountNumber = match[1].trim(); // code client (8 chiffres)
    const title = match[3].trim(); // titre (colonne 3)
    let replacementCode = match[4].trim(); // code remplacement (colonne 4)
    const suggestion = match[5] ? match[5].trim() : '';
    
    // Debug logging removed for production - use React DevTools if needed
    
    // Utiliser la suggestion si le code de remplacement est vide
    if (!replacementCode && suggestion) {
      replacementCode = suggestion;
    }
    
    return [accountNumber, title, replacementCode];
  };

  
  const findDuplicateAccount = useCallback((accountNumber: string, title: string): Account | undefined => {
    // Normaliser le numéro de compte pour la comparaison
    const normalizedAccountNumber = normalizeAccountCode(accountNumber);
    const normalizedTitle = normalizeTitle(title);
    
    // Debug logging removed for production - use React DevTools if needed
    
    // Essayer d'abord le matching direct par code original 8 chiffres + titre normalisé
    let account = duplicates.find(d => 
      d.originalNumber === accountNumber && 
      d.title && normalizeTitle(d.title) === normalizedTitle
    );
    
    // Debug logging removed for production - use React DevTools if needed
    
    // Si pas trouvé, essayer le matching par numéro normalisé + titre normalisé
    if (!account) {
      // Debug logging removed for production - use React DevTools if needed
      account = duplicates.find(d => 
        d.number === normalizedAccountNumber && 
        d.title && normalizeTitle(d.title) === normalizedTitle
      );
      
      // Debug logging removed for production - use React DevTools if needed
    }
    
    return account;
  }, [duplicates]);

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
      
      // Debug logging removed for production - use React DevTools if needed
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const parsedLine = parseCSVLine(line);
        if (!parsedLine) continue;
        
        const [accountNumber, title, replacementCode] = parsedLine;
        
        // Debug logging removed for production - use React DevTools if needed
      
      if (!accountNumber || !title || !replacementCode) {
        // Debug logging removed for production - use React DevTools if needed
        continue;
      }
        
        const duplicateAccount = findDuplicateAccount(accountNumber, title);
        
        if (duplicateAccount) {
          // Utiliser directement le code de remplacement du CSV (colonne 4)
          onReplacementCodeChange?.(duplicateAccount.id, replacementCode);
          processedCount++;
          
          // Conflicts with original code handled by validation
        }
      }
      
      // Summary logging removed for production - use React DevTools if needed
      
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
  }, [onReplacementCodeChange, findDuplicateAccount]);

  const handleClearCorrectionsFile = useCallback(() => {
    setCorrectionsFileInfo(null);
  }, []);

  return {
    correctionsFileInfo,
    processCorrectionsFile,
    handleClearCorrectionsFile
  };
};
