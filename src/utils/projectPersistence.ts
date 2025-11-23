import { AppState, Account, ProcessingResult, FileMetadata, MergeInfo, NormalizationAccount } from '../types/accounts';

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
    missingMetadata: { [accountId: string]: Record<string, any> };
    currentStep: 'step1' | 'step2' | 'step3' | 'step4' | 'step5' | 'step6' | 'step7' | 'stepFinal';
  };
}

export const CURRENT_VERSION = '1.0.0';

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
const deterministicStringify = (obj: any): string => {
  return JSON.stringify(obj, (key, value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.keys(value).sort().reduce((sorted: any, k) => {
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
export const saveProject = async (state: AppState, description?: string): Promise<void> => {
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
    
    // Créer un blob et télécharger
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `compte-processor-${new Date().toISOString().split('T')[0]}.ccp`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    
    console.log('✅ Projet sauvegardé avec succès');
  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde du projet:', error);
    throw new Error('Échec de la sauvegarde du projet');
  }
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
        
        console.log('✅ Projet chargé avec succès');
        console.log(`📊 Comptes: ${projectFile.metadata.accountCounts.client} clients, ${projectFile.metadata.accountCounts.cncj} CNCJ, ${projectFile.metadata.accountCounts.general} généraux`);
        console.log(`📅 Créé le: ${new Date(projectFile.metadata.createdAt).toLocaleString()}`);
        console.log(`🔐 Checksum vérifié: ${projectFile.metadata.checksum.substring(0, 16)}...`);
        
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
