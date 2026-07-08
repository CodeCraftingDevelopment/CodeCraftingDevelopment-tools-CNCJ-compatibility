import React from 'react';
import { FileUploader } from '../components/FileUploader';
import { SvvUploader } from '../components/SvvUploader';
import { FecAccountsUploader } from '../components/FecAccountsUploader';
import { FileMetadata, Account } from '../types/accounts';

interface Step1FileUploadProps {
  clientFileInfo: FileMetadata | null;
  generalFileInfo: FileMetadata | null;
  svvFileInfo: FileMetadata | null;
  svvCorrespondences: { [compteEncheres: string]: string };
  fecFileInfo: FileMetadata | null;
  loading: boolean;
  onFileLoaded: (accounts: Account[], source: 'client' | 'general' | 'cncj', fileInfo: FileMetadata) => void;
  onFileCleared: (source: 'client' | 'general' | 'cncj') => void;
  onSvvLoaded: (correspondences: { [compteEncheres: string]: string }, fileInfo: FileMetadata) => void;
  onSvvCleared: () => void;
  onFecLoaded: (accounts: Account[], fileInfo: FileMetadata) => void;
  onFecCleared: () => void;
  onError: (errors: string[]) => void;
  clientAccounts?: Account[];
  generalAccounts?: Account[];
}

export const Step1FileUpload: React.FC<Step1FileUploadProps> = ({
  clientFileInfo,
  generalFileInfo,
  svvFileInfo,
  svvCorrespondences,
  fecFileInfo,
  loading,
  onFileLoaded,
  onFileCleared,
  onSvvLoaded,
  onSvvCleared,
  onFecLoaded,
  onFecCleared,
  onError,
  clientAccounts = [],
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

      <FecAccountsUploader
        fileInfo={fecFileInfo}
        disabled={loading}
        onLoaded={onFecLoaded}
        onCleared={onFecCleared}
      />

      <FileUploader
        onFileLoaded={onFileLoaded}
        onFileCleared={onFileCleared}
        onError={onError}
        label="📊 Fichier comptes PCG avec CNCJ"
        source="general"
        disabled={loading}
        fileInfo={generalFileInfo}
        loadedAccounts={generalAccounts}
      />

      <SvvUploader
        fileInfo={svvFileInfo}
        correspondences={svvCorrespondences}
        generalAccounts={generalAccounts}
        disabled={loading}
        onLoaded={onSvvLoaded}
        onCleared={onSvvCleared}
      />
    </>
  );
};
