import React from 'react';
import { FileUploader } from '../components/FileUploader';
import { FileMetadata, Account } from '../types/accounts';

interface Step1FileUploadProps {
  clientFileInfo: FileMetadata | null;
  cncjFileInfo: FileMetadata | null;
  generalFileInfo: FileMetadata | null;
  loading: boolean;
  clientAccountsCount: number;
  cncjAccountsCount: number;
  generalAccountsCount: number;
  onFileLoaded: (accounts: Account[], source: 'client' | 'cncj' | 'general', fileInfo: FileMetadata) => void;
  onFileCleared: (source: 'client' | 'cncj' | 'general') => void;
  onError: (errors: string[]) => void;
  onReset: () => void;
}

export const Step1FileUpload: React.FC<Step1FileUploadProps> = ({
  clientFileInfo,
  cncjFileInfo,
  generalFileInfo,
  loading,
  clientAccountsCount,
  cncjAccountsCount,
  generalAccountsCount,
  onFileLoaded,
  onFileCleared,
  onError,
  onReset
}) => {
  return (
    <>
      <FileUploader
        onFileLoaded={onFileLoaded}
        onFileCleared={onFileCleared}
        onError={onError}
        label="📋 Fichier des comptes clients"
        source="client"
        disabled={loading}
        fileInfo={clientFileInfo}
      />
      
      <FileUploader
        onFileLoaded={onFileLoaded}
        onFileCleared={onFileCleared}
        onError={onError}
        label="📊 Fichier des comptes généraux"
        source="general"
        disabled={loading}
        fileInfo={generalFileInfo}
      />
      
      <FileUploader
        onFileLoaded={onFileLoaded}
        onFileCleared={onFileCleared}
        onError={onError}
        label="🏛️ Fichier des comptes CNCJ"
        source="cncj"
        disabled={loading}
        fileInfo={cncjFileInfo}
      />

      {/* Reset Button */}
      {(clientAccountsCount > 0 || cncjAccountsCount > 0 || generalAccountsCount > 0) && (
        <div className="mt-4 text-center space-x-4">
          <button
            onClick={onReset}
            disabled={loading}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🔄 Réinitialiser
          </button>
        </div>
      )}
    </>
  );
};
