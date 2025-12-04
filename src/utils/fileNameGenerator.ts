/**
 * Génère un nom de fichier intelligent pour le projet
 * Format: compte-processor-[client]-[date].ccp
 */
export const generateSmartFileName = (clientName: string): string => {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0]; // Format YYYY-MM-DD
  
  // Nettoyer le nom du client: remplacer les espaces et caractères spéciaux par des tirets
  const cleanClientName = clientName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Garder seulement lettres, chiffres, espaces et tirets
    .replace(/\s+/g, '-') // Remplacer les espaces par des tirets
    .replace(/-+/g, '-') // Éviter les tirets multiples
    .replace(/^-|-$/g, ''); // Éviter les tirets au début/fin
  
  const clientPart = cleanClientName ? `-${cleanClientName}` : '';
  return `compte-processor${clientPart}-${dateStr}.ccp`;
};

/**
 * Extrait le nom de base sans extension d'un nom de fichier
 */
export const getBaseFileName = (fileName: string): string => {
  return fileName.replace(/\.[^/.]+$/, ''); // Enlever l'extension
};
