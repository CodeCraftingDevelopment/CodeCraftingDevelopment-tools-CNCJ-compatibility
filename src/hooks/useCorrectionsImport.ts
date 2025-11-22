import { useCallback, useState } from 'react';
import { Account, FileMetadata } from '../types/accounts';
import { formatFileSize } from '../utils/fileUtils';
import { normalizeAccountCode } from '../utils/accountUtils';

// Flag debug pour éviter le spam de logs en production
const DEBUG = process.env.NODE_ENV === 'development';

/**
 * Bug fix for Step 6 CSV import:
 * 1. Case-insensitive title matching via normalizeTitle()
 * 2. Windows line-ending support (removed $ anchor from regex)
 * 3. 4-column CSV format support (code client, code 7 chiffres, titre, code remplacement)
 * 4. Preserves originalNumber matching for 8-digit account codes
 */

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
    // Gérer les 4 colonnes du format étape 6 ou 5 colonnes du format étape 4
    // Format : code client, code 7 chiffres, titre, code remplacement [, suggestion]
    // Regex corrigé pour ne pas exiger de point-virgule final et gérer les fins de ligne Windows
    const match = line.match(/^"?([^"]*)"?;\s*"?([^"]*)"?;\s*"?([^"]*)"?;\s*"?([^"]*)"(?:;\s*"?([^"]*)")?/);
    if (!match) return null;
    
    const accountNumber = match[1].trim(); // code client (8 chiffres)
    const title = match[3].trim(); // titre (colonne 3)
    let replacementCode = match[4].trim(); // code remplacement (colonne 4)
    const suggestion = match[5] ? match[5].trim() : '';
    
    if (DEBUG) {
      console.log('🔍 DEBUG - Parsing CSV line:', {
        originalLine: line,
        accountNumber,
        title,
        replacementCode,
        suggestion,
        regexMatch: match
      });
    }
    
    // Utiliser la suggestion si le code de remplacement est vide
    if (!replacementCode && suggestion) {
      replacementCode = suggestion;
    }
    
    return [accountNumber, title, replacementCode];
  };

  // Fonction utilitaire pour normaliser les titres de manière plus flexible
  const normalizeTitle = (title: string): string => {
    return title.toLowerCase()
      .replace(/\s+/g, ' ') // Remplacer les espaces multiples par un seul
      .trim();
  };

  const findDuplicateAccount = (accountNumber: string, title: string): Account | undefined => {
    // Normaliser le numéro de compte pour la comparaison
    const normalizedAccountNumber = normalizeAccountCode(accountNumber);
    const normalizedTitle = normalizeTitle(title);
    
    if (DEBUG) {
      console.log('🔍 DEBUG - Recherche du compte:', {
        csvAccountNumber: accountNumber,
        csvTitle: title,
        normalizedAccountNumber,
        normalizedTitle
      });
    }
    
    // Essayer d'abord le matching direct par code original 8 chiffres + titre normalisé
    let account = duplicates.find(d => 
      d.originalNumber === accountNumber && 
      d.title && normalizeTitle(d.title) === normalizedTitle
    );
    
    if (DEBUG) {
      console.log('🔍 DEBUG - Résultat matching originalNumber:', {
        found: !!account,
        accountFound: account ? {
          id: account.id,
          originalNumber: account.originalNumber,
          number: account.number,
          title: account.title,
          normalizedTitle: account.title ? normalizeTitle(account.title) : null
        } : null
      });
    }
    
    // Si pas trouvé, essayer le matching par numéro normalisé + titre normalisé
    if (!account) {
      if (DEBUG) {
        console.log('🔍 DEBUG - Tentative matching par numéro normalisé...');
      }
      account = duplicates.find(d => 
        d.number === normalizedAccountNumber && 
        d.title && normalizeTitle(d.title) === normalizedTitle
      );
      
      if (DEBUG) {
        console.log('🔍 DEBUG - Résultat matching normalisé:', {
          found: !!account,
          accountFound: account ? {
            id: account.id,
            originalNumber: account.originalNumber,
            number: account.number,
            title: account.title,
            normalizedTitle: account.title ? normalizeTitle(account.title) : null
          } : null
        });
      }
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
      
      // Log des duplicates disponibles une seule fois avant la boucle (optimisation performance)
      if (DEBUG) {
        const accountsWithoutOriginalNumber = duplicates.filter(d => !d.originalNumber);
        console.log('🔍 DEBUG - Tous les duplicates disponibles:', {
          total: duplicates.length,
          withoutOriginalNumber: accountsWithoutOriginalNumber.length,
          accounts: duplicates.map(d => ({
            id: d.id,
            originalNumber: d.originalNumber,
            number: d.number,
            title: d.title,
            normalizedTitle: d.title ? normalizeTitle(d.title) : null
          }))
        });
      }
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const parsedLine = parseCSVLine(line);
        if (!parsedLine) continue;
        
        const [accountNumber, title, replacementCode] = parsedLine;
        
        if (DEBUG) {
        console.log('🔍 DEBUG - Ligne CSV parsée:', {
          lineNumber: i,
          accountNumber,
          title,
          replacementCode
        });
      }
      
      if (!accountNumber || !title || !replacementCode) {
        if (DEBUG) {
          console.log('⚠️ DEBUG - Données manquantes, ligne ignorée');
        }
        continue;
      }
        
        const duplicateAccount = findDuplicateAccount(accountNumber, title);
        const existingCodes = Object.values(replacementCodes);
        const conflictsWithOriginal = isDuplicateCode(replacementCode, existingCodes, allOriginalCodes);
        
        if (duplicateAccount) {
          // Normaliser le code de remplacement à 7 chiffres avant de l'appliquer
          const normalizedCode = replacementCode.length > 7 ? replacementCode.slice(0, 7) : replacementCode.padEnd(7, '0');
          onReplacementCodeChange?.(duplicateAccount.id, normalizedCode);
          processedCount++;
          
          if (conflictsWithOriginal) {
            duplicateCodeCount++;
          }
        }
      }
      
      // Log de résumé après l'import (feedback rapide)
      const totalLines = lines.length - 1; // Exclure l'en-tête
      if (DEBUG) {
        console.log('📊 Import summary:', {
          total: totalLines,
          matched: processedCount,
          unmatched: totalLines - processedCount,
          duplicateCodeCount
        });
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
