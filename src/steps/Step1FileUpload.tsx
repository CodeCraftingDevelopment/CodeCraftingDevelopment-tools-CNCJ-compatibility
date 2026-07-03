import React from 'react';
import { FileUploader } from '../components/FileUploader';
import { SvvUploader } from '../components/SvvUploader';
import { FileMetadata, Account } from '../types/accounts';

interface Step1FileUploadProps {
  clientFileInfo: FileMetadata | null;
  generalFileInfo: FileMetadata | null;
  cncjFileInfo: FileMetadata | null;
  svvFileInfo: FileMetadata | null;
  svvCorrespondences: { [compteEncheres: string]: string };
  loading: boolean;
  onFileLoaded: (accounts: Account[], source: 'client' | 'general' | 'cncj', fileInfo: FileMetadata) => void;
  onFileCleared: (source: 'client' | 'general' | 'cncj') => void;
  onSvvLoaded: (correspondences: { [compteEncheres: string]: string }, fileInfo: FileMetadata) => void;
  onSvvCleared: () => void;
  onError: (errors: string[]) => void;
  clientAccounts?: Account[];
  generalAccounts?: Account[];
  cncjAccounts?: Account[];
}

export const Step1FileUpload: React.FC<Step1FileUploadProps> = ({
  clientFileInfo,
  generalFileInfo,
  cncjFileInfo,
  svvFileInfo,
  svvCorrespondences,
  loading,
  onFileLoaded,
  onFileCleared,
  onSvvLoaded,
  onSvvCleared,
  onError,
  clientAccounts = [],
  generalAccounts = [],
  cncjAccounts = []
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
        label="📊 Fichier Comptes_PCG (plan comptable général)"
        source="general"
        disabled={loading}
        fileInfo={generalFileInfo}
        loadedAccounts={generalAccounts}
      />
      
      <FileUploader
        onFileLoaded={onFileLoaded}
        onFileCleared={onFileCleared}
        onError={onError}
        label="🎯 Fichier Comptes_CNCJ (comptes homologués CNCJ)"
        source="cncj"
        disabled={loading}
        fileInfo={cncjFileInfo}
        loadedAccounts={cncjAccounts}
      />

      <SvvUploader
        fileInfo={svvFileInfo}
        correspondences={svvCorrespondences}
        disabled={loading}
        onLoaded={onSvvLoaded}
        onCleared={onSvvCleared}
      />
    </>
  );
};
