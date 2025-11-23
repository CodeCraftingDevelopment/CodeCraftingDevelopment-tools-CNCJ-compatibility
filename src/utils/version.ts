// Version de l'application injectée par Vite depuis package.json
declare const __APP_VERSION__: string;

export const APP_VERSION = __APP_VERSION__ || '0.0.0';

/**
 * Formate la version pour l'affichage
 */
export const formatVersion = (version: string): string => {
  return `v${version}`;
};

/**
 * Vérifie si la version actuelle est supérieure à une version donnée
 */
export const isNewerVersion = (current: string, compare: string): boolean => {
  const currentParts = current.split('.').map(Number);
  const compareParts = compare.split('.').map(Number);
  
  for (let i = 0; i < Math.max(currentParts.length, compareParts.length); i++) {
    const currentPart = currentParts[i] || 0;
    const comparePart = compareParts[i] || 0;
    
    if (currentPart > comparePart) return true;
    if (currentPart < comparePart) return false;
  }
  
  return false;
};
