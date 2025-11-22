export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const validateFileSize = (file: File): { isValid: boolean; error?: string } => {
  const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
    
  // Check file size first (instant validation)
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      error: `Le fichier est trop volumineux (${formatFileSize(file.size)}). La taille maximale autorisée est de 50MB.`
    };
  }
  
  return { isValid: true };
};

export const sanitizeCsvValue = (value: string): string => {
  if (!value || typeof value !== 'string') {
    return value || '';
  }
  
  // Remove leading formula characters that could execute in Excel
  const trimmed = value.trim();
  if (trimmed.startsWith('=') || trimmed.startsWith('+') || trimmed.startsWith('-') || trimmed.startsWith('@')) {
    return "'" + trimmed; // Prefix with single quote to prevent formula execution
  }
  
  return trimmed;
};
