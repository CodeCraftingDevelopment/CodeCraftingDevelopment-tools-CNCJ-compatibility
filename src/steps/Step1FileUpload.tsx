import React from 'react';
import { FileUploader } from '../components/FileUploader';
import { FileMetadata, Account } from '../types/accounts';

interface Step1FileUploadProps {
  clientFileInfo: FileMetadata | null;
  cncjFileInfo: FileMetadata | null;
  generalFileInfo: FileMetadata | null;
  loading: boolean;
  onFileLoaded: (accounts: Account[], source: 'client' | 'cncj' | 'general', fileInfo: FileMetadata) => void;
  onFileCleared: (source: 'client' | 'cncj' | 'general') => void;
  onError: (errors: string[]) => void;
  clientAccounts?: Account[];
  cncjAccounts?: Account[];
  generalAccounts?: Account[];
}

export const Step1FileUpload: React.FC<Step1FileUploadProps> = ({
  clientFileInfo,
  cncjFileInfo,
  generalFileInfo,
  loading,
  onFileLoaded,
  onFileCleared,
  onError,
  clientAccounts = [],
  cncjAccounts = [],
  generalAccounts = []
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
        loadedAccounts={clientAccounts}
      />
      
      <FileUploader
        onFileLoaded={onFileLoaded}
        onFileCleared={onFileCleared}
        onError={onError}
        label="📊 Fichier des comptes généraux"
        source="general"
        disabled={loading}
        fileInfo={generalFileInfo}
        loadedAccounts={generalAccounts}
      />
      
      <FileUploader
        onFileLoaded={onFileLoaded}
        onFileCleared={onFileCleared}
        onError={onError}
        label="🏛️ Fichier des comptes CNCJ"
        source="cncj"
        disabled={loading}
        fileInfo={cncjFileInfo}
        loadedAccounts={cncjAccounts}
      />
    </>
  );
};
