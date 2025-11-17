import { useCallback, useState, useRef } from 'react';

export type DragState = 'idle' | 'drag-over';

export interface UseDragAndDropOptions {
  disabled?: boolean;
  onDrop: (file: File) => void;
  acceptedTypes?: string[];
}

export const useDragAndDrop = ({
  disabled = false,
  onDrop,
  acceptedTypes = ['.csv']
}: UseDragAndDropOptions) => {
  const [dragState, setDragState] = useState<DragState>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    if (!disabled) {
      setDragState('drag-over');
    }
  }, [disabled]);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragState('idle');
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragState('idle');
    
    const file = event.dataTransfer.files[0];
    if (file && !disabled) {
      // Check file type if acceptedTypes specified
      if (acceptedTypes.length > 0) {
        const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
        if (!acceptedTypes.includes(fileExtension)) {
          return;
        }
      }
      onDrop(file);
    }
  }, [onDrop, disabled, acceptedTypes]);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && !disabled) {
      onDrop(file);
    }
  }, [onDrop, disabled]);

  const handleButtonClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      // Clear input value to allow re-selecting the same file
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  }, [disabled]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent, onClick?: () => void) => {
    if ((event.key === 'Enter' || event.key === ' ') && !disabled) {
      event.preventDefault();
      onClick?.();
    }
  }, [disabled]);

  return {
    dragState,
    fileInputRef,
    handlers: {
      handleDragOver,
      handleDragLeave,
      handleDrop,
      handleFileChange,
      handleButtonClick,
      handleKeyDown
    }
  };
};
