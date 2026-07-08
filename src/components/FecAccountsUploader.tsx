import React, { useCallback, useState } from 'react';
import { FileMetadata, Account } from '../types/accounts';
import { extractFecAccounts } from '../utils/fecValidation';
import { formatFileSize, validateFileSize } from '../utils/fileUtils';
import { useDragAndDrop } from '../hooks/useDragAndDrop';
import { DropZone } from './DropZone';

interface FecAccountsUploaderProps {
  fileInfo: FileMetadata | null;
  disabled?: boolean;
  onLoaded: (accounts: Account[], fileInfo: FileMetadata) => void;
  onCleared: () => void;
}

export const FecAccountsUploader: React.FC<FecAccountsUploaderProps> = ({
  fileInfo,
  disabled = false,
  onLoaded,
  onCleared
}) => {
  // Fichier FEC optionnel : les problèmes sont affichés localement et ne bloquent jamais le flux.
  const [localMessage, setLocalMessage] = useState<string>('');

  const processFile = useCallback(async (file: File) => {
    setLocalMessage('');

    const sizeValidation = validateFileSize(file);
    if (!sizeValidation.isValid) {
      setLocalMessage(sizeValidation.error || 'Fichier invalide');
      return;
    }

    try {
      // Les FEC sont souvent en ANSI/Windows-1252 : repli si l'UTF-8 produit des « � »
      const buffer = await file.arrayBuffer();
      let text = new TextDecoder('utf-8').decode(buffer);
      if (text.includes('�')) {
        text = new TextDecoder('windows-1252').decode(buffer);
      }

      const fecAccounts = extractFecAccounts(text);
      if (fecAccounts.length === 0) {
        setLocalMessage('Aucun compte détecté dans ce fichier FEC.');
        return;
      }

      const accounts: Account[] = fecAccounts.map((a, index) => ({
        id: `fec-${a.code}-${index}`,
        number: a.code,
        title: a.label || undefined,
        source: 'client',
        originalNumber: a.code,
        fromFec: true
      }));

      const fileMetadata: FileMetadata = {
        name: file.name,
        size: formatFileSize(file.size),
        rowCount: accounts.length,
        loadStatus: 'success'
      };
      onLoaded(accounts, fileMetadata);
    } catch (error) {
      setLocalMessage(`Erreur de lecture : ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [onLoaded]);

  const { dragState, fileInputRef, handlers } = useDragAndDrop({
    disabled,
    onDrop: processFile,
    acceptedTypes: []
  });

  const handleClear = useCallback(() => {
    setLocalMessage('');
    onCleared();
  }, [onCleared]);

  return (
    <div className="mb-4 w-full" data-testid="fec-accounts-uploader">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        📄 Fichier FEC <span className="font-normal text-gray-400">(optionnel — complète les comptes client)</span>
      </label>

      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.csv,.fec"
        onChange={handlers.handleFileChange}
        disabled={disabled}
        className="sr-only"
        data-testid="file-input-fec"
      />

      <DropZone
        dragState={dragState}
        disabled={disabled}
        fileInfo={fileInfo}
        onDragOver={handlers.handleDragOver}
        onDragLeave={handlers.handleDragLeave}
        onDrop={handlers.handleDrop}
        onClick={!fileInfo ? handlers.handleButtonClick : undefined}
        onKeyDown={(e) => handlers.handleKeyDown(e, !fileInfo ? handlers.handleButtonClick : undefined)}
        ariaLabel={!fileInfo ? 'Déposer ou sélectionner un fichier FEC' : `Fichier FEC : ${fileInfo.name}`}
        dataTestId="dropzone-fec"
      >
        {!fileInfo ? (
          <div className="py-3 space-y-1">
            <div className="text-3xl" aria-hidden="true">📄</div>
            <p className="text-sm text-gray-700 font-medium">Glissez-déposez le FEC ou cliquez</p>
            <p className="text-xs text-gray-500">Les comptes utilisés dans le FEC seront ajoutés à la liste client</p>
          </div>
        ) : (
          <div className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl" aria-hidden="true">📄</span>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900 truncate">{fileInfo.name}</p>
                <p className="text-xs text-gray-500">{fileInfo.rowCount} compte{fileInfo.rowCount > 1 ? 's' : ''} extrait{fileInfo.rowCount > 1 ? 's' : ''} du FEC</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Retirer le fichier FEC"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
      </DropZone>

      {localMessage && (
        <div className="mt-2 text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded p-2" role="alert">
          {localMessage}
        </div>
      )}
    </div>
  );
};
