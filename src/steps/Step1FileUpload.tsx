import React from 'react';
import { FileUploader } from '../components/FileUploader';
import { FileMetadata, Account } from '../types/accounts';

interface Step1FileUploadProps {
  clientFileInfo: FileMetadata | null;
  pcgCncjFileInfo: FileMetadata | null;
  loading: boolean;
  onFileLoaded: (accounts: Account[], source: 'client' | 'pcg_cncj', fileInfo: FileMetadata) => void;
  onFileCleared: (source: 'client' | 'pcg_cncj') => void;
  onError: (errors: string[]) => void;
  clientAccounts?: Account[];
  pcgCncjAccounts?: Account[];
}

export const Step1FileUpload: React.FC<Step1FileUploadProps> = ({
  clientFileInfo,
  pcgCncjFileInfo,
  loading,
  onFileLoaded,
  onFileCleared,
  onError,
  clientAccounts = [],
  pcgCncjAccounts = []
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
        label="📊 Fichier Comptes_PCG_CNCJ (plan comptable + comptes CNCJ)"
        source="pcg_cncj"
        disabled={loading}
        fileInfo={pcgCncjFileInfo}
        loadedAccounts={pcgCncjAccounts}
      />
    </>
  );
};
