/**
 * Electron API Type Declarations
 *
 * Declares the electronAPI on the global window object for TypeScript.
 */

import type { ElectronAPI } from '../electron/preload';

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
