import React, { useCallback, useState } from 'react';
import { Account, FileUploadResult, FileMetadata, InvalidRow } from '../types/accounts';
import { parseCSVFile } from '../utils/accountUtils';
import { formatFileSize } from '../utils/fileUtils';
import { useDragAndDrop } from '../hooks/useDragAndDrop';
import { DropZone } from './DropZone';
import { ImportErrorsModal } from './ImportErrorsModal';

interface FileUploaderProps {
  onFileLoaded: (accounts: Account[], source: 'client' | 'cncj', fileInfo: FileMetadata) => void;
  onFileCleared: (source: 'client' | 'cncj') => void;
  onError: (errors: string[]) => void;
  label: string;
  source: 'client' | 'cncj';
  disabled?: boolean;
  fileInfo: FileMetadata | null;
}


export const FileUploader: React.FC<FileUploaderProps> = ({
  onFileLoaded,
  onFileCleared,
  onError,
  label,
  source,
  disabled = false,
  fileInfo
}) => {
  const [localErrors, setLocalErrors] = useState<string[]>([]);
  const [invalidRows, setInvalidRows] = useState<InvalidRow[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const processFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      const errorMsg = 'Veuillez sélectionner un fichier CSV';
      onError([errorMsg]);
      setLocalErrors([errorMsg]);
      setInvalidRows([]);
      return;
    }

    // Set loading state immediately
    const loadingFileInfo: FileMetadata = {
      name: file.name,
      size: formatFileSize(file.size),
      rowCount: 0,
      loadStatus: 'loading'
    };
    setLocalErrors([]);
    setInvalidRows([]);
    setIsModalOpen(false);
    onFileLoaded([], source, loadingFileInfo);

    try {
      const result: FileUploadResult = await parseCSVFile(file);
      setInvalidRows(result.invalidRows);
      const importedCount = result.accounts.length;
      const totalRows = result.totalRows;
      const skippedRows = result.skippedRows;
      const discrepancy = Math.max(totalRows - importedCount, skippedRows);
      const hasDiscrepancy = totalRows > 0 && discrepancy > 0;
      const hasErrors = result.errors.length > 0;

      if (importedCount === 0) {
        const errorFileInfo: FileMetadata = {
          name: file.name,
          size: formatFileSize(file.size),
          rowCount: 0,
          totalRows,
          skippedRows,
          loadStatus: 'error'
        };
        const messages = [...result.errors];
        if (totalRows > 0) {
          messages.push(`Aucune ligne n'a pu être importée sur ${totalRows} détectées.`);
        }
        if (messages.length > 0) {
          onError(messages);
        }
        setLocalErrors(messages);
        setIsModalOpen(true);
        onFileLoaded([], source, errorFileInfo);
        return;
      }
      
      const accountsWithSource = result.accounts.map(acc => ({
        ...acc,
        source
      }));
      
      const finalFileInfo: FileMetadata = {
        name: file.name,
        size: formatFileSize(file.size),
        rowCount: importedCount,
        totalRows,
        skippedRows: discrepancy,
        loadStatus: hasErrors || hasDiscrepancy ? 'warning' : 'success'
      };
      
      const feedbackMessages = [...result.errors];
      if (hasDiscrepancy) {
        feedbackMessages.push(`Import partiel: ${importedCount} comptes importés sur ${totalRows} lignes détectées (${discrepancy} ignorées).`);
      }
      if (feedbackMessages.length > 0) {
        onError(feedbackMessages);
        setLocalErrors(result.invalidRows.length === 0 ? feedbackMessages : []);
      } else {
        setLocalErrors([]);
      }
      
      onFileLoaded(accountsWithSource, source, finalFileInfo);
    } catch (error) {
      const errorFileInfo: FileMetadata = {
        name: file.name,
        size: formatFileSize(file.size),
        rowCount: 0,
        totalRows: 0,
        skippedRows: 0,
        loadStatus: 'error'
      };
      const message = `Erreur lors de la lecture du fichier: ${error}`;
      onError([message]);
      setLocalErrors([message]);
      setInvalidRows([]);
      setIsModalOpen(true);
      onFileLoaded([], source, errorFileInfo);
    }
  }, [source, onError, onFileLoaded]);

  const { dragState, fileInputRef, handlers } = useDragAndDrop({
    disabled,
    onDrop: processFile,
    acceptedTypes: ['.csv']
  });

  const handleClearFile = useCallback(() => {
    onFileCleared(source);
    setLocalErrors([]);
    setInvalidRows([]);
    setIsModalOpen(false);
  }, [onFileCleared, source]);

  const downloadTemplate = useCallback(() => {
    const csvContent = "Numéro de compte,Titre\r\n12345678,Compte exemple\r\n87654321,Autre compte";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_comptes.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up blob URL to prevent memory leaks
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);
  }, []);

  return (
    <div className="mb-4 w-full">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2">
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      </div>
      
      {/* Drag & Drop Zone */}
      <DropZone
        dragState={dragState}
        disabled={disabled}
        loading={fileInfo?.loadStatus === 'loading'}
        fileInfo={fileInfo}
        onDragOver={handlers.handleDragOver}
        onDragLeave={handlers.handleDragLeave}
        onDrop={handlers.handleDrop}
        onClick={!fileInfo ? handlers.handleButtonClick : undefined}
        onKeyDown={(e) => handlers.handleKeyDown(e, !fileInfo ? handlers.handleButtonClick : undefined)}
        ariaLabel={!fileInfo ? `Zone de dépôt pour ${label}. Cliquez ou glissez-déposez un fichier CSV` : `Fichier sélectionné: ${fileInfo?.name}`}
      >
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handlers.handleFileChange}
          disabled={disabled || fileInfo?.loadStatus === 'loading'}
          className="hidden"
        />
        
        {/* Content based on state */}
        {!fileInfo && (
          <div className="space-y-2">
            <div className="mx-auto w-10 h-10 text-gray-400">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div className="text-sm text-gray-600">
              <p className="font-medium text-xs sm:text-sm">Glissez-déposez votre fichier CSV</p>
              <p className="text-xs">ou cliquez pour parcourir</p>
            </div>
            <button
              type="button"
              onClick={downloadTemplate}
              className="mt-2 px-3 py-1 text-xs bg-gray-50 text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
            >
              Télécharger le modèle
            </button>
          </div>
        )}
        
        {fileInfo?.loadStatus === 'loading' && (
          <div className="space-y-2">
            <div className="mx-auto w-8 h-8 border-b-2 border-blue-600 rounded-full animate-spin"></div>
            <p className="text-sm text-blue-600">Chargement du fichier...</p>
          </div>
        )}
        
        {fileInfo && (fileInfo.loadStatus === 'success' || fileInfo.loadStatus === 'warning' || fileInfo.loadStatus === 'error') && (
          <div className="space-y-2">
            {/* File info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  fileInfo.loadStatus === 'success' ? 'bg-green-100 text-green-600' :
                  fileInfo.loadStatus === 'warning' ? 'bg-orange-100 text-orange-600' :
                  'bg-red-100 text-red-600'
                }`}>
                  {fileInfo.loadStatus === 'success' ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : fileInfo.loadStatus === 'warning' ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{fileInfo?.name}</p>
                  <p className="text-xs text-gray-500">
                    {fileInfo?.size}
                    {fileInfo?.rowCount !== undefined && fileInfo.rowCount >= 0 && (
                      <>
                        {` • ${fileInfo.rowCount} compte${fileInfo.rowCount > 1 ? 's' : ''}`}
                        {fileInfo?.totalRows !== undefined && fileInfo.totalRows > 0 && fileInfo.totalRows !== fileInfo.rowCount && (
                          ` / ${fileInfo.totalRows} lignes`
                        )}
                      </>
                    )}
                  </p>
                </div>
              </div>
              
              <button
                type="button"
                onClick={handleClearFile}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            
            {/* Status message */}
            <div className={`text-sm ${
              fileInfo.loadStatus === 'success' ? 'text-green-600' :
              fileInfo.loadStatus === 'warning' ? 'text-orange-600' :
              'text-red-600'
            }`}>
              {fileInfo.loadStatus === 'success' && `${fileInfo.rowCount} comptes chargés avec succès`}
              {fileInfo.loadStatus === 'warning' && `Import partiel: ${fileInfo.rowCount} compte${fileInfo.rowCount > 1 ? 's' : ''} importé${fileInfo.rowCount > 1 ? 's' : ''}`}
              {fileInfo.loadStatus === 'error' && 'Échec du chargement'}
            </div>

            {fileInfo.skippedRows !== undefined && fileInfo.skippedRows > 0 && (
              <div className="text-xs text-orange-600">
                {`${fileInfo.skippedRows} ligne${fileInfo.skippedRows > 1 ? 's' : ''} ignorée${fileInfo.skippedRows > 1 ? 's' : ''}.`}
              </div>
            )}

            {(invalidRows.length > 0 || localErrors.length > 0) && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="mt-2 px-3 py-1 text-xs bg-orange-100 text-orange-700 rounded-full hover:bg-orange-200 transition-colors flex items-center gap-2"
                >
                  <span aria-hidden="true">⚠️</span>
                  <span>Détails des lignes ignorées</span>
                </button>
              </div>
            )}
            
            {/* Action buttons */}
            <div className="flex justify-center space-x-2">
              <button
                type="button"
                onClick={handlers.handleButtonClick}
                className="px-3 py-1 text-xs bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors"
              >
                Changer le fichier
              </button>
            </div>
          </div>
        )}
      </DropZone>
      
      <p className="mt-2 text-xs text-gray-500 text-center">
        Format CSV attendu: deux colonnes - numéros de comptes (numériques) et titres (texte)
      </p>

      {(isModalOpen && (invalidRows.length > 0 || localErrors.length > 0)) && (
        <ImportErrorsModal
          invalidRows={invalidRows}
          genericErrors={localErrors}
          fileName={fileInfo?.name || 'fichier.csv'}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
};
