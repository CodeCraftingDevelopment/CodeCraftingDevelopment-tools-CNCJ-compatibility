import { AppState, Account, FileMetadata, MergeInfo, NormalizationAccount } from '../types/accounts';
import { APP_VERSION, isNewerVersion } from './version';

export interface ProjectFile {
  version: string;
  metadata: {
    createdAt: string;
    createdBy?: string;
    description?: string;
    accountCounts: {
      client: number;
      cncj: number;
      general: number;
    };
    checksum: string; // SHA256 hash of data section for integrity verification
  };
  data: {
    clientAccounts: Account[];
    cncjAccounts: Account[];
    generalAccounts: Account[];
    clientFileInfo: FileMetadata | null;
    cncjFileInfo: FileMetadata | null;
    generalFileInfo: FileMetadata | null;
    replacementCodes: { [key: string]: string };
    cncjReplacementCodes: { [key: string]: string };
    mergeInfo: MergeInfo[];
    cncjConflictCorrections: { [key: string]: string | 'error' };
    finalFilter: 'all' | 'step4' | 'step6' | 'step4+step6' | 'toCreate';
    accountsNeedingNormalization: NormalizationAccount[];
    isNormalizationApplied: boolean;
    missingMetadata: { [accountId: string]: Record<string, string | number | boolean | null> };
    currentStep: 'step1' | 'step2' | 'step3' | 'step4' | 'step5' | 'step6' | 'step7' | 'stepFinal';
  };
}

export const CURRENT_VERSION = APP_VERSION;
export const CANCELLED_ERROR_MESSAGE = 'Sauvegarde annulée';

/**
 * Calcule le hash SHA256 d'une chaîne de caractères
 */
const calculateSHA256 = async (str: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Sérialisation déterministe pour garantir des checksums cohérents
 */
const deterministicStringify = (obj: Record<string, unknown>): string => {
  return JSON.stringify(obj, (_, value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.keys(value).sort().reduce((sorted: Record<string, unknown>, k) => {
        sorted[k] = value[k];
        return sorted;
      }, {});
    }
    return value;
  });
};

/**
 * Sauvegarde l'état complet du projet dans un fichier JSON
 */
export const saveProject = async (state: AppState, filename?: string, description?: string): Promise<void> => {
  try {
    // Ne sauvegarder que les données brutes, pas les données dérivées
    const dataSection = {
      clientAccounts: state.clientAccounts,
      cncjAccounts: state.cncjAccounts,
      generalAccounts: state.generalAccounts,
      clientFileInfo: state.clientFileInfo,
      cncjFileInfo: state.cncjFileInfo,
      generalFileInfo: state.generalFileInfo,
      replacementCodes: state.replacementCodes,
      cncjReplacementCodes: state.cncjReplacementCodes,
      mergeInfo: state.mergeInfo,
      cncjConflictCorrections: state.cncjConflictCorrections,
      finalFilter: state.finalFilter,
      accountsNeedingNormalization: state.accountsNeedingNormalization,
      isNormalizationApplied: state.isNormalizationApplied,
      missingMetadata: state.missingMetadata,
      currentStep: state.currentStep,
    };

    // Calculer le checksum des données
    const dataString = deterministicStringify(dataSection);
    const checksum = await calculateSHA256(dataString);

    const projectFile: ProjectFile = {
      version: CURRENT_VERSION,
      metadata: {
        createdAt: new Date().toISOString(),
        createdBy: 'Compte Processor User',
        description: description || 'Projet Compte Processor',
        accountCounts: {
          client: state.clientAccounts.length,
          cncj: state.cncjAccounts.length,
          general: state.generalAccounts.length,
        },
        checksum,
      },
      data: dataSection,
    };

    // Sérialiser en JSON
    const jsonString = JSON.stringify(projectFile, null, 2);
    
    // Utiliser File System Access API si disponible, sinon fallback classique
    if ('showSaveFilePicker' in window) {
      await saveWithFileSystemAccess(jsonString, filename);
    } else {
      await saveWithDownload(jsonString, filename);
    }
    
    // Projet sauvegardé avec succès
  } catch (error) {
    // Laisser l'erreur d'annulation se propager sans la modifier
    if (error instanceof Error && error.message === CANCELLED_ERROR_MESSAGE) {
      throw error;
    }
    console.error('❌ Erreur lors de la sauvegarde du projet:', error);
    throw new Error('Échec de la sauvegarde du projet');
  }
};

/**
 * Sauvegarde avec File System Access API (explorateur natif)
 */
const saveWithFileSystemAccess = async (jsonString: string, filename?: string): Promise<void> => {
  try {
    const defaultFilename = filename || generateDefaultFilename();
    
    // Options pour la boîte de dialogue de sauvegarde
    const options: { suggestedName: string; types: Array<{ description: string; accept: Record<string, string[]> }> } = {
      suggestedName: defaultFilename,
      types: [{
        description: 'Fichiers de projet Compte Processor',
        accept: {
          'application/json': ['.ccp', '.json'],
        },
      }],
    };

    // Ouvrir la boîte de dialogue native (cast vers any pour TypeScript)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fileHandle = await (window as any).showSaveFilePicker(options);
    
    // Écrire le contenu dans le fichier choisi
    const writable = await fileHandle.createWritable();
    await writable.write(jsonString);
    await writable.close();
    
    // Projet sauvegardé avec File System Access API
  } catch (error: any) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      // L'utilisateur a annulé la boîte de dialogue
      // Sauvegarde annulée par l'utilisateur
      throw new Error(CANCELLED_ERROR_MESSAGE);
    } else {
      // Autre erreur (permissions, etc.) - fallback avec message informatif
      console.warn('⚠️ File System Access API échoué, fallback vers download classique:', error.message);
      // Attendre un peu pour que l'utilisateur voie le message avant de continuer
      await new Promise(resolve => setTimeout(resolve, 100));
      await saveWithDownload(jsonString, filename);
    }
  }
};

/**
 * Sauvegarde classique avec download (fallback)
 */
const saveWithDownload = async (jsonString: string, filename?: string): Promise<void> => {
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || generateDefaultFilename();
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
  
  // Projet sauvegardé avec download classique
};

/**
 * Valide et nettoie un nom de fichier
 */
export const sanitizeFilename = (filename: string): string => {
  // Supprimer les espaces au début et à la fin
  const trimmed = filename.trim();
  
  // Si le nom est vide après trimming, retourner une chaîne vide
  if (!trimmed) {
    return '';
  }
  
  // Supprimer les caractères invalides pour les noms de fichiers
  const cleaned = trimmed.replace(/[<>:"/\\|?*]/g, '');
  
  // S'assurer que l'extension .ccp est présente (vérifier après nettoyage)
  if (!cleaned.endsWith('.ccp')) {
    return cleaned + '.ccp';
  }
  
  return cleaned;
};

/**
 * Valide si un nom de fichier est acceptable
 */
export const isValidFilename = (filename: string): boolean => {
  const trimmed = filename.trim();
  return trimmed.length >= 3 && trimmed.length <= 200; // Entre 3 et 200 caractères
};

/**
 * Génère un nom de fichier par défaut
 */
export const generateDefaultFilename = (): string => {
  return `compte-processor-${new Date().toISOString().split('T')[0]}.ccp`;
};

/**
 * Valide la structure d'un fichier projet chargé
 */
export const validateProjectFile = (projectFile: any): projectFile is ProjectFile => {
  try {
    // Vérifier la version
    if (!projectFile.version || typeof projectFile.version !== 'string') {
      return false;
    }

    // Vérifier les métadonnées
    if (!projectFile.metadata || !projectFile.metadata.createdAt) {
      return false;
    }

    // Vérifier les données
    if (!projectFile.data) {
      return false;
    }

    const { data } = projectFile;
    
    // Vérifier les tableaux de comptes
    if (!Array.isArray(data.clientAccounts) || 
        !Array.isArray(data.cncjAccounts) || 
        !Array.isArray(data.generalAccounts)) {
      return false;
    }

    // Vérifier les objets de codes
    if (typeof data.replacementCodes !== 'object' || 
        typeof data.cncjReplacementCodes !== 'object' ||
        typeof data.cncjConflictCorrections !== 'object') {
      return false;
    }

    // Vérifier le filtre final
    const validFilters = ['all', 'step4', 'step6', 'step4+step6', 'toCreate'];
    if (!validFilters.includes(data.finalFilter)) {
      return false;
    }

    // Vérifier l'étape actuelle
    const validSteps = ['step1', 'step2', 'step3', 'step4', 'step5', 'step6', 'step7', 'stepFinal'];
    if (!validSteps.includes(data.currentStep)) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ Erreur de validation du fichier projet:', error);
    return false;
  }
};

/**
 * Charge un projet depuis un fichier
 */
export const loadProject = (file: File): Promise<ProjectFile> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const jsonString = event.target?.result as string;
        const projectFile = JSON.parse(jsonString);
        
        if (!validateProjectFile(projectFile)) {
          reject(new Error('Format de fichier projet invalide ou corrompu'));
          return;
        }

        // Vérifier l'intégrité des données avec le checksum
        const dataString = deterministicStringify(projectFile.data);
        const calculatedChecksum = await calculateSHA256(dataString);
        
        if (calculatedChecksum !== projectFile.metadata.checksum) {
          reject(new Error('Le fichier projet est corrompu ou a été modifié (checksum invalide)'));
          return;
        }
        
        // Projet chargé avec succès
        // Comptes: ${projectFile.metadata.accountCounts.client} clients, ${projectFile.metadata.accountCounts.cncj} CNCJ, ${projectFile.metadata.accountCounts.general} généraux
        // Créé le: ${new Date(projectFile.metadata.createdAt).toLocaleString()}
        // Checksum vérifié: ${projectFile.metadata.checksum.substring(0, 16)}...
        // Version du projet: ${projectFile.version}
        
        // Vérifier la compatibilité de version
        if (isNewerVersion(APP_VERSION, projectFile.version)) {
          console.warn(`⚠️ Le projet a été créé avec une version antérieure (${projectFile.version})`);
        } else if (isNewerVersion(projectFile.version, APP_VERSION)) {
          console.warn(`⚠️ Le projet a été créé avec une version plus récente (${projectFile.version})`);
        }
        
        resolve(projectFile);
      } catch (error) {
        console.error('❌ Erreur lors du chargement du projet:', error);
        reject(new Error('Échec du chargement du fichier projet'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Erreur de lecture du fichier'));
    };
    
    reader.readAsText(file);
  });
};

/**
 * Convertit un fichier projet chargé en état d'application
 */
export const projectFileToAppState = (projectFile: ProjectFile): AppState => {
  const { data } = projectFile;
  
  return {
    clientAccounts: data.clientAccounts,
    cncjAccounts: data.cncjAccounts,
    generalAccounts: data.generalAccounts,
    clientFileInfo: data.clientFileInfo,
    cncjFileInfo: data.cncjFileInfo,
    generalFileInfo: data.generalFileInfo,
    result: null, // Les résultats seront recalculés
    loading: false,
    errors: [],
    currentStep: data.currentStep,
    replacementCodes: data.replacementCodes,
    cncjReplacementCodes: data.cncjReplacementCodes,
    mergeInfo: data.mergeInfo,
    cncjConflictResult: null, // Sera recalculé si nécessaire
    cncjConflictCorrections: data.cncjConflictCorrections,
    finalFilter: data.finalFilter,
    accountsNeedingNormalization: data.accountsNeedingNormalization,
    isNormalizationApplied: data.isNormalizationApplied,
    missingMetadata: data.missingMetadata,
  };
};

/**
 * Vérifie si un fichier est un fichier projet Compte Processor
 */
export const isProjectFile = (file: File): boolean => {
  return file.name.endsWith('.ccp') || file.type === 'application/json';
};
