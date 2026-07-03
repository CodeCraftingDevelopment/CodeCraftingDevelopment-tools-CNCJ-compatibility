import { useCallback, useState } from 'react';
import { Account, FileMetadata, AccountMetadata } from '../types/accounts';
import { formatFileSize } from '../utils/fileUtils';
import { preparePcgLookups, inheritPcgMetadata, normalizeForDisplay, MANUAL_PCG_REFERENCE_KEY, UNRESOLVED_PCG_REFERENCE_KEY } from '../utils/accountMatchingUtils';

interface UseMetadataImportProps {
  _accountsNeedingMetadata: Account[];
  metadataFields: Array<{ key: string; label: string; type: string; options?: string[] }>;
  generalAccounts: Account[];
  onMetadataChange: (accountId: string, metadata: AccountMetadata) => void;
}

export const useMetadataImport = ({
  _accountsNeedingMetadata,
  metadataFields,
  generalAccounts,
  onMetadataChange
}: UseMetadataImportProps) => {
  const [metadataFileInfo, setMetadataFileInfo] = useState<FileMetadata | null>(null);

  const validateHeaders = (headers: string[]): boolean => {
    // Vérifier les en-têtes requis pour l'import des métadonnées
    const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
    return normalizedHeaders.includes('id') && 
           normalizedHeaders.includes('title') && 
           normalizedHeaders.includes('finalcode');
  };

  const processMetadataFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      return;
    }

    setMetadataFileInfo({
      name: file.name,
      size: formatFileSize(file.size),
      rowCount: 0,
      loadStatus: 'loading'
    });

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvText = e.target?.result as string;
        const lines = csvText.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          setMetadataFileInfo({
            name: file.name,
            size: formatFileSize(file.size),
            rowCount: 0,
            loadStatus: 'error'
          });
          return;
        }

        const headers = lines[0].split(';').map(h => h.replace(/^"|"$/g, '').replace(/""/g, '"'));
        
        // Vérifier les en-têtes requis
        if (!validateHeaders(headers)) {
          setMetadataFileInfo({
            name: file.name,
            size: formatFileSize(file.size),
            rowCount: 0,
            loadStatus: 'error'
          });
          return;
        }

        // Parser les données
        const metadataUpdates: { [accountId: string]: Record<string, string | number | boolean | null> } = {};
        let processedCount = 0;

        // Lookup des comptes PCG (par code) pour l'héritage automatique via referencePcgCode
        const { pcgLookup } = preparePcgLookups(generalAccounts);
        const idIndex = headers.indexOf('id');
        const referenceIndex = headers.indexOf('referencePcgCode');
        const closestMatchIndex = headers.indexOf('hasClosestMatch');

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(';').map(v => v.replace(/^"|"$/g, '').replace(/""/g, '"'));

          if (values.length < 4) continue;

          const accountId = values[idIndex];
          if (!accountId) continue;

          const metadata: Record<string, string | number | boolean | null> = {};

          // Pour les lignes sans correspondance automatique (hasClosestMatch = false) qui
          // renseignent un referencePcgCode : hériter automatiquement des paramètres de ce compte PCG.
          const referencePcgCode = referenceIndex >= 0 ? (values[referenceIndex] || '').trim() : '';
          const hasClosestMatch = closestMatchIndex >= 0
            ? (values[closestMatchIndex] || '').trim().toLowerCase() === 'true'
            : true;

          let inheritedFromReference = false;
          if (referencePcgCode && !hasClosestMatch) {
            const pcgAccount = pcgLookup.get(referencePcgCode)
              || pcgLookup.get(normalizeForDisplay(referencePcgCode));
            if (pcgAccount) {
              const { inheritedData } = inheritPcgMetadata(pcgAccount);
              Object.assign(metadata, inheritedData);
              // Marquer le compte comme retraité (conserve le code PCG de référence)
              metadata[MANUAL_PCG_REFERENCE_KEY] = pcgAccount.number;
              inheritedFromReference = true;
            } else {
              // Référence PCG saisie mais introuvable dans le PCG chargé → à identifier/corriger
              metadata[UNRESOLVED_PCG_REFERENCE_KEY] = referencePcgCode;
            }
          }

          // Colonnes de métadonnées explicites du fichier.
          // En cas d'héritage par référence, ne pas écraser l'héritage avec des cellules vides.
          metadataFields.forEach(field => {
            const fieldIndex = headers.indexOf(field.key);
            if (fieldIndex >= 0 && values[fieldIndex] !== undefined) {
              const value = values[fieldIndex];
              if (!inheritedFromReference || value !== '') {
                metadata[field.key] = value;
              }
            }
          });

          if (Object.keys(metadata).length > 0) {
            metadataUpdates[accountId] = metadata;
            processedCount++;
          }
        }

        // Appliquer les mises à jour
        Object.entries(metadataUpdates).forEach(([accountId, metadata]) => {
          onMetadataChange(accountId, metadata);
        });

        setMetadataFileInfo({
          name: file.name,
          size: formatFileSize(file.size),
          rowCount: processedCount,
          loadStatus: 'success'
        });

      } catch (error) {
        console.error('Metadata import error:', error);
        setMetadataFileInfo({
          name: file.name,
          size: formatFileSize(file.size),
          rowCount: 0,
          loadStatus: 'error'
        });
      }
    };
    
    reader.onerror = () => {
      setMetadataFileInfo({
        name: file.name,
        size: formatFileSize(file.size),
        rowCount: 0,
        loadStatus: 'error'
      });
    };
    
    reader.readAsText(file, 'utf-8');
  }, [metadataFields, generalAccounts, onMetadataChange]);

  const handleClearMetadataFile = useCallback(() => {
    setMetadataFileInfo(null);
  }, []);

  return {
    metadataFileInfo,
    processMetadataFile,
    handleClearMetadataFile
  };
};
