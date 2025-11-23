import { useCallback, useState } from 'react';
import { Account, FileMetadata } from '../types/accounts';
import { formatFileSize } from '../utils/fileUtils';

interface UseMetadataImportProps {
  accountsNeedingMetadata: Account[];
  metadataFields: Array<{ key: string; label: string; type: string; options?: string[] }>;
  onMetadataChange: (accountId: string, metadata: Record<string, any>) => void;
}

export const useMetadataImport = ({
  accountsNeedingMetadata,
  metadataFields,
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
        const metadataUpdates: { [accountId: string]: Record<string, any> } = {};
        let processedCount = 0;
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(';').map(v => v.replace(/^"|"$/g, '').replace(/""/g, '"'));
          
          if (values.length < 4) continue;
          
          const accountId = values[headers.indexOf('id')];
          
          // Extraire les métadonnées (colonnes après les 4 premières)
          const metadata: Record<string, any> = {};
          metadataFields.forEach(field => {
            const fieldIndex = headers.indexOf(field.key);
            if (fieldIndex >= 0 && values[fieldIndex] !== undefined) {
              metadata[field.key] = values[fieldIndex];
            }
          });
          
          if (accountId && Object.keys(metadata).length > 0) {
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
  }, [accountsNeedingMetadata, metadataFields, onMetadataChange]);

  const handleClearMetadataFile = useCallback(() => {
    setMetadataFileInfo(null);
  }, []);

  return {
    metadataFileInfo,
    processMetadataFile,
    handleClearMetadataFile
  };
};
