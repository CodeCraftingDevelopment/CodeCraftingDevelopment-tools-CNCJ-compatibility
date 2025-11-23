/**
 * Utilitaires de test pour faciliter l'automatisation avec Playwright/Puppeteer
 * Ces fonctions sont exposées via window.__TEST_HELPERS__ en mode développement
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
// Test mocks intentionally use any for flexibility and maintainability

import { Account, FileMetadata } from '../types/accounts';
import { parseCSVFile } from './accountUtils';
import { formatFileSize } from './fileUtils';

export interface TestHelpers {
  uploadFile: (source: 'client' | 'general' | 'cncj', fileContent: string, filename?: string) => Promise<void>;
  getFileInput: (source: 'client' | 'general' | 'cncj') => HTMLInputElement | null;
  getDropZone: (source: 'client' | 'general' | 'cncj') => HTMLElement | null;
  getUploadState: (source: 'client' | 'general' | 'cncj') => string;
  waitForUploadState: (source: 'client' | 'general' | 'cncj', state: string, timeout?: number) => Promise<boolean>;
  simulateFileUpload: (source: 'client' | 'general' | 'cncj', csvData: string) => Promise<Account[]>;
  clearAllFiles: () => void;
  getTestData: () => {
    clientsTest: string;
    generalTest: string;
    cncjTest: string;
  };
}

/**
 * Crée les helpers de test et les expose via window.__TEST_HELPERS__
 */
export const setupTestHelpers = (callbacks: {
  onFileLoaded: (accounts: Account[], source: 'client' | 'general' | 'cncj', fileInfo: FileMetadata) => void;
  onFileCleared: (source: 'client' | 'general' | 'cncj') => void;
}): void => {
  if (typeof window === 'undefined') return;

  const helpers: TestHelpers = {
    uploadFile: async (source, fileContent, filename = `test-${source}.csv`) => {
      const input = helpers.getFileInput(source);
      if (!input) {
        throw new Error(`Input non trouvé pour la source: ${source}`);
      }

      // Créer un fichier à partir du contenu
      const blob = new Blob([fileContent], { type: 'text/csv' });
      const file = new File([blob], filename, { type: 'text/csv' });

      // Simuler la sélection de fichier
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;

      // Déclencher l'événement change
      input.dispatchEvent(new Event('change', { bubbles: true }));
    },

    getFileInput: (source) => {
      return document.querySelector(`[data-testid="file-input-${source}"]`) as HTMLInputElement;
    },

    getDropZone: (source) => {
      return document.querySelector(`[data-testid="dropzone-${source}"]`) as HTMLElement;
    },

    getUploadState: (source) => {
      const dropZone = helpers.getDropZone(source);
      return dropZone?.getAttribute('data-upload-state') || 'unknown';
    },

    waitForUploadState: async (source, expectedState, timeout = 10000) => {
      const startTime = Date.now();
      while (Date.now() - startTime < timeout) {
        const currentState = helpers.getUploadState(source);
        if (currentState === expectedState) {
          return true;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return false;
    },

    simulateFileUpload: async (source, csvData) => {
      const file = new File([csvData], `test-${source}.csv`, { type: 'text/csv' });
      const allowAlphanumeric = source === 'general';
      const result = await parseCSVFile(file, allowAlphanumeric);
      
      if (result.errors.length > 0) {
        throw new Error(`Erreurs de parsing: ${result.errors.join(', ')}`);
      }

      const fileInfo: FileMetadata = {
        name: `test-${source}.csv`,
        size: formatFileSize(file.size),
        rowCount: result.accounts.length,
        loadStatus: 'success'
      };

      callbacks.onFileLoaded(result.accounts, source, fileInfo);
      return result.accounts;
    },

    clearAllFiles: () => {
      ['client', 'general', 'cncj'].forEach(source => {
        callbacks.onFileCleared(source as 'client' | 'general' | 'cncj');
      });
    },

    getTestData: () => ({
      clientsTest: `numero;titre
10000;Caisse principale
10001;Banque BNP
10002;Compte clients
10003;Fournisseurs
10004;Immobilisations
20000;Véhicules
20000;Véhicules
20000;Voitures de société
20001;Équipements
20001;Équipements
30000;Test non match 1
30001;Test non match 2
30002;Test non match 3
30003;Test non match 4
30004;Test non match 5`,
      
      generalTest: `numero;titre
1010000;Capital social
1060000;Réserves
1200000;Résultat de l'exercice
1510000;Provisions pour risques
2030000;Frais de développement
2150000;Installations techniques, matériel et outillage industriels
2180000;Autres immobilisations corporelles
2610000;Participations
2740000;Prêts`,
      
      cncjTest: `numero;titre
108000;compte du commissaire de justice
108100;commissaire de justice - compte prélèvements
108200;commissaire de justice - apports (compte permanent)
401120;fournisseurs liés aux comptes clients (toutes activités sauf ventes judiciaires)
401130;fournisseurs liés aux comptes clients (activité de ventes judiciaires)
411000;clients - prestations de service facturées (toutes activités sauf ventes judiciaires)
412000;clients - prestations de service facturées (activité de ventes judiciaires)
419600;fonds détenus pour le compte des clients (toutes activités sauf ventes judiciaires)1
419630;fonds détenus pour le compte des clients (activité de ventes judiciaires)1
10000;Compte CNCJ 10000
10001;Compte CNCJ 10001
10002;Compte CNCJ 10002
10003;Compte CNCJ 10003
10004;Compte CNCJ 10004`
    })
  };

  // Exposer les helpers globalement
  (window as any).__TEST_HELPERS__ = helpers;

  // Logger pour le debugging
  // Test helpers initialized:
};

/**
 * Vérifie si les helpers de test sont disponibles
 */
export const isTestHelpersAvailable = (): boolean => {
  return typeof window !== 'undefined' && !!(window as any).__TEST_HELPERS__;
};

/**
 * Récupère les helpers de test
 */
export const getTestHelpers = (): TestHelpers | null => {
  if (!isTestHelpersAvailable()) {
    return null;
  }
  return (window as any).__TEST_HELPERS__;
};
