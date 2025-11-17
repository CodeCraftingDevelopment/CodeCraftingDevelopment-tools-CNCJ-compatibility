import React from 'react';
import { DragState } from '../hooks/useDragAndDrop';
import { FileMetadata } from '../types/accounts';

export interface DropZoneProps {
  dragState: DragState;
  disabled?: boolean;
  loading?: boolean;
  fileInfo?: FileMetadata | null;
  children: React.ReactNode;
  onDragOver: (event: React.DragEvent) => void;
  onDragLeave: (event: React.DragEvent) => void;
  onDrop: (event: React.DragEvent) => void;
  onClick?: () => void;
  onKeyDown?: (event: React.KeyboardEvent) => void;
  ariaLabel?: string;
  tabIndex?: number;
}

export const DropZone: React.FC<DropZoneProps> = ({
  dragState,
  disabled = false,
  loading = false,
  fileInfo = null,
  children,
  onDragOver,
  onDragLeave,
  onDrop,
  onClick,
  onKeyDown,
  ariaLabel,
  tabIndex = 0
}) => {
  return (
    <div
      role="button"
      aria-label={ariaLabel}
      tabIndex={disabled || loading || fileInfo ? -1 : tabIndex}
      onKeyDown={onKeyDown}
      className={`
        relative border-2 border-dashed rounded-lg px-3 py-4 text-center transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        ${dragState === 'drag-over' 
          ? 'border-blue-400 bg-blue-50' 
          : fileInfo?.loadStatus === 'success'
          ? 'border-green-400 bg-green-50'
          : fileInfo?.loadStatus === 'warning'
          ? 'border-orange-400 bg-orange-50'
          : fileInfo?.loadStatus === 'error'
          ? 'border-red-400 bg-red-50'
          : 'border-gray-300 hover:border-gray-400'
        }
        ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onClick}
    >
      {children}
    </div>
  );
};
