import React, { useCallback, useState, useRef } from 'react';
import { Account, FileUploadResult } from '../types/accounts';
import { parseCSVFile } from '../utils/accountUtils';

interface FileInfo {
  name: string;
  size: string;
  rowCount?: number;
}

type LoadStatus = 'idle' | 'loading' | 'success' | 'warning' | 'error';
type DragState = 'idle' | 'drag-over';

interface FileUploaderProps {
  onFileLoaded: (accounts: Account[], source: 'client' | 'cncj') => void;
  onError: (errors: string[]) => void;
  label: string;
  source: 'client' | 'cncj';
  disabled?: boolean;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const FileUploader: React.FC<FileUploaderProps> = ({
  onFileLoaded,
  onError,
  label,
  source,
  disabled = false
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>('idle');
  const [accountCount, setAccountCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [dragState, setDragState] = useState<DragState>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      onError(['Veuillez sélectionner un fichier CSV']);
      return;
    }

    setSelectedFile(file);
    setFileInfo({
      name: file.name,
      size: formatFileSize(file.size)
    });
    setLoadStatus('loading');

    try {
      const result: FileUploadResult = await parseCSVFile(file);
      
      // Update file info with row count
      setFileInfo(prev => prev ? { ...prev, rowCount: result.accounts.length } : null);
      
      if (result.errors.length > 0) {
        onError(result.errors);
        setErrorCount(result.errors.length);
      }
      
      if (result.accounts.length === 0) {
        setLoadStatus('error');
        setSelectedFile(null);
        setFileInfo(null);
        return;
      }
      
      const accountsWithSource = result.accounts.map(acc => ({
        ...acc,
        source
      }));
      
      onFileLoaded(accountsWithSource, source);
      setAccountCount(result.accounts.length);
      
      if (result.errors.length > 0) {
        setLoadStatus('warning');
      } else {
        setLoadStatus('success');
      }
    } catch (error) {
      onError([`Erreur lors de la lecture du fichier: ${error}`]);
      setLoadStatus('error');
      setSelectedFile(null);
      setFileInfo(null);
    }
  }, [onFileLoaded, onError, source]);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    await processFile(file);
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && loadStatus !== 'loading') {
      setDragState('drag-over');
    }
  }, [disabled, loadStatus]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragState('idle');
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragState('idle');
    
    if (disabled || loadStatus === 'loading') return;
    
    const file = e.dataTransfer.files[0];
    if (!file) return;
    
    await processFile(file);
  }, [disabled, loadStatus, processFile]);

  const handleButtonClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    fileInputRef.current?.click();
  }, []);

  const handleClearFile = useCallback(() => {
    setSelectedFile(null);
    setFileInfo(null);
    setLoadStatus('idle');
    setAccountCount(0);
    setErrorCount(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

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
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        <button
          type="button"
          onClick={downloadTemplate}
          className="text-xs text-blue-600 hover:text-blue-800 underline"
        >
          Télécharger le template CSV
        </button>
      </div>
      
      {/* Drag & Drop Zone */}
      <div
        role="button"
        aria-label={!selectedFile ? `Zone de dépôt pour ${label}. Cliquez ou glissez-déposez un fichier CSV` : `Fichier sélectionné: ${fileInfo?.name}`}
        tabIndex={disabled || loadStatus === 'loading' || selectedFile ? -1 : 0}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !selectedFile) {
            e.preventDefault();
            handleButtonClick();
          }
        }}
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          ${dragState === 'drag-over' 
            ? 'border-blue-400 bg-blue-50' 
            : loadStatus === 'success'
            ? 'border-green-400 bg-green-50'
            : loadStatus === 'warning'
            ? 'border-orange-400 bg-orange-50'
            : loadStatus === 'error'
            ? 'border-red-400 bg-red-50'
            : 'border-gray-300 hover:border-gray-400'
          }
          ${disabled || loadStatus === 'loading' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={!selectedFile ? handleButtonClick : undefined}
      >
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          disabled={disabled || loadStatus === 'loading'}
          className="hidden"
        />
        
        {/* Content based on state */}
        {loadStatus === 'idle' && !selectedFile && (
          <div className="space-y-2">
            <div className="mx-auto w-12 h-12 text-gray-400">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div className="text-sm text-gray-600">
              <p className="font-medium">Glissez-déposez votre fichier CSV ici</p>
              <p className="text-xs">ou cliquez pour parcourir</p>
            </div>
          </div>
        )}
        
        {loadStatus === 'loading' && (
          <div className="space-y-2">
            <div className="mx-auto w-8 h-8 border-b-2 border-blue-600 rounded-full animate-spin"></div>
            <p className="text-sm text-blue-600">Chargement du fichier...</p>
          </div>
        )}
        
        {selectedFile && (loadStatus === 'success' || loadStatus === 'warning' || loadStatus === 'error') && (
          <div className="space-y-3">
            {/* File info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  loadStatus === 'success' ? 'bg-green-100 text-green-600' :
                  loadStatus === 'warning' ? 'bg-orange-100 text-orange-600' :
                  'bg-red-100 text-red-600'
                }`}>
                  {loadStatus === 'success' ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : loadStatus === 'warning' ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900">{fileInfo?.name}</p>
                  <p className="text-xs text-gray-500">
                    {fileInfo?.size} {fileInfo?.rowCount && `• ${fileInfo.rowCount} comptes`}
                  </p>
                </div>
              </div>
              
              <button
                type="button"
                onClick={handleClearFile}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            
            {/* Status message */}
            <div className={`text-sm ${
              loadStatus === 'success' ? 'text-green-600' :
              loadStatus === 'warning' ? 'text-orange-600' :
              'text-red-600'
            }`}>
              {loadStatus === 'success' && `${accountCount} comptes chargés avec succès`}
              {loadStatus === 'warning' && `${accountCount} comptes chargés (${errorCount} erreurs)`}
              {loadStatus === 'error' && 'Échec du chargement'}
            </div>
            
            {/* Action buttons */}
            <div className="flex justify-center space-x-2">
              <button
                type="button"
                onClick={handleButtonClick}
                className="px-3 py-1 text-xs bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors"
              >
                Changer le fichier
              </button>
            </div>
          </div>
        )}
      </div>
      
      <p className="mt-2 text-xs text-gray-500 text-center">
        Format CSV attendu: deux colonnes - numéros de comptes (numériques) et titres (texte)
      </p>
    </div>
  );
};
