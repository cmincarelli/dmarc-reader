/**
 * Drag and Drop Hook
 *
 * React hook for handling drag-and-drop file operations.
 */

import { useState, useCallback, DragEvent } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface DragDropState {
  isDragging: boolean;
  isValidDrop: boolean;
}

export interface UseDragDropReturn {
  dragDropState: DragDropState;
  handleDragEnter: (event: DragEvent<HTMLElement>) => void;
  handleDragOver: (event: DragEvent<HTMLElement>) => void;
  handleDragLeave: (event: DragEvent<HTMLElement>) => void;
  handleDrop: (event: DragEvent<HTMLElement>) => void;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook for handling drag-and-drop file operations
 *
 * @example
 * ```tsx
 * const { dragDropState, handleDragEnter, handleDragOver, handleDragLeave, handleDrop } = useDragDrop({
 *   onFilesDropped: (files) => console.log('Dropped:', files),
 *   accept: ['.xml'],
 * });
 *
 * <div
 *   onDragEnter={handleDragEnter}
 *   onDragOver={handleDragOver}
 *   onDragLeave={handleDragLeave}
 *   onDrop={handleDrop}
 * >
 *   Drop files here
 * </div>
 * ```
 */
export function useDragDrop(options: {
  onFilesDropped: (filePaths: string[]) => void;
  accept?: string[];
  maxFiles?: number;
}): UseDragDropReturn {
  const [dragDropState, setDragDropState] = useState<DragDropState>({
    isDragging: false,
    isValidDrop: false,
  });

  const validateFiles = useCallback(
    (files: FileList | null): boolean => {
      if (!files || files.length === 0) return false;

      // Check max files
      if (options.maxFiles && files.length > options.maxFiles) {
        return false;
      }

      // Check file extensions if accept is specified
      if (options.accept && options.accept.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const hasValidExtension = options.accept.some((ext) =>
            file.name.toLowerCase().endsWith(ext.toLowerCase())
          );
          if (!hasValidExtension) {
            return false;
          }
        }
      }

      return true;
    },
    [options.accept, options.maxFiles]
  );

  const handleDragEnter = useCallback(
    (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      event.stopPropagation();

      const files = event.dataTransfer?.files;
      const isValid = validateFiles(files || null);

      setDragDropState({
        isDragging: true,
        isValidDrop: isValid,
      });
    },
    [validateFiles]
  );

  const handleDragOver = useCallback((event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();

    // Set the drop effect
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  const handleDragLeave = useCallback((event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();

    // Only reset if leaving the drop zone entirely (not a child element)
    if (event.currentTarget === event.target) {
      setDragDropState({
        isDragging: false,
        isValidDrop: false,
      });
    }
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      event.stopPropagation();

      setDragDropState({
        isDragging: false,
        isValidDrop: false,
      });

      const files = event.dataTransfer?.files;
      if (!files || !validateFiles(files)) {
        return;
      }

      // Extract file paths
      // Note: In Electron, we can access the file path directly
      const filePaths: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // @ts-expect-error - Electron adds path property to File objects
        if (file.path) {
          // @ts-expect-error - Electron adds path property to File objects
          filePaths.push(file.path);
        }
      }

      if (filePaths.length > 0) {
        options.onFilesDropped(filePaths);
      }
    },
    [options, validateFiles]
  );

  return {
    dragDropState,
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
}
