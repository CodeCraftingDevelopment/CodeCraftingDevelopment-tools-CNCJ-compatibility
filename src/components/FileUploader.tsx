import React, { useCallback } from 'react';
import { Account, FileUploadResult } from '../types/accounts';
import { parseCSVFile } from '../utils/accountUtils';

interface FileUploaderProps {
  onFileLoaded: (accounts: Account[], source: 'client' | 'cncj') => void;
  onError: (errors: string[]) => void;
  label: string;
  source: 'client' | 'cncj';
  disabled?: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  onFileLoaded,
  onError,
  label,
  source,
  disabled = false
}) => {
  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      onError(['Veuillez sélectionner un fichier CSV']);
      return;
    }

    try {
      const result: FileUploadResult = await parseCSVFile(file);
      
      if (result.errors.length > 0) {
        onError(result.errors);
      }
      
      // Update source for all accounts
      const accountsWithSource = result.accounts.map(acc => ({
        ...acc,
        source
      }));
      
      onFileLoaded(accountsWithSource, source);
      
      // Clear the input
      event.target.value = '';
    } catch (error) {
      onError([`Erreur lors de la lecture du fichier: ${error}`]);
    }
  }, [onFileLoaded, onError, source]);

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div className="relative">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          disabled={disabled}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100
            disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>
      <p className="mt-1 text-xs text-gray-500">
        Format CSV attendu: une colonne avec les numéros de comptes (numériques)
      </p>
    </div>
  );
};
