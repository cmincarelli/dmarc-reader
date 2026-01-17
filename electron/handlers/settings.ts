/**
 * Settings IPC Handlers
 *
 * Handles application settings storage and retrieval.
 */

import { ipcMain, app, dialog } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import { getDatabase, reports, records } from '../utils/database.js';
import { autoImportManager } from '../services/auto-import.js';

// ============================================================================
// Type Definitions
// ============================================================================

export interface AppSettings {
  theme?: 'light' | 'dark' | 'system';
  autoImport?: boolean;
  notifications?: boolean;
  autoImportFolder?: string;
  autoImportAction?: 'keep' | 'delete' | 'archive'; // What to do with files after import
  databasePath?: string;
}

// ============================================================================
// Settings Management
// ============================================================================

const getSettingsPath = (): string => {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'settings.json');
};

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  autoImport: false,
  notifications: true,
  autoImportAction: 'archive', // Default to archiving for safety
};

/**
 * Load settings from disk
 */
export async function loadSettings(): Promise<AppSettings> {
  const settingsPath = getSettingsPath();

  try {
    const data = await fs.readFile(settingsPath, 'utf-8');
    const settings = JSON.parse(data);
    return { ...DEFAULT_SETTINGS, ...settings };
  } catch (error) {
    // Settings file doesn't exist or is invalid, return defaults
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save settings to disk
 */
async function saveSettings(settings: AppSettings): Promise<void> {
  const settingsPath = getSettingsPath();

  try {
    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to save settings:', error);
    throw error;
  }
}

/**
 * Get current settings
 */
async function getSettings(): Promise<AppSettings> {
  return await loadSettings();
}

/**
 * Update settings (merge with existing)
 */
async function updateSettings(
  updates: Partial<AppSettings>
): Promise<{ success: boolean; error?: string }> {
  try {
    const current = await loadSettings();
    const updated = { ...current, ...updates };
    await saveSettings(updated);

    // If auto-import settings changed, restart the watcher
    if ('autoImport' in updates || 'autoImportFolder' in updates || 'autoImportAction' in updates) {
      if (updated.autoImport && updated.autoImportFolder) {
        console.log('[SETTINGS] Starting auto-import watcher');
        autoImportManager.start({
          folderPath: updated.autoImportFolder,
          enabled: updated.autoImport,
          postImportAction: updated.autoImportAction || 'archive',
        });
      } else {
        console.log('[SETTINGS] Stopping auto-import watcher');
        await autoImportManager.stop();
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to update settings:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get database statistics
 */
async function getDatabaseStats(): Promise<{
  size: number;
  sizeFormatted: string;
  location: string;
}> {
  const dbPath = path.join(app.getPath('userData'), 'dmarc-reader.db');

  try {
    let totalSize = 0;

    // Get main database file size
    try {
      const mainStats = await fs.stat(dbPath);
      totalSize += mainStats.size;
    } catch (error) {
      // Database might not exist yet
      console.log('[DB-STATS] Main database not found yet');
    }

    // Get WAL file size (Write-Ahead Log)
    try {
      const walStats = await fs.stat(`${dbPath}-wal`);
      totalSize += walStats.size;
    } catch (error) {
      // WAL file might not exist
    }

    // Get SHM file size (Shared Memory)
    try {
      const shmStats = await fs.stat(`${dbPath}-shm`);
      totalSize += shmStats.size;
    } catch (error) {
      // SHM file might not exist
    }

    const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);

    return {
      size: totalSize,
      sizeFormatted: `${sizeInMB} MB`,
      location: dbPath,
    };
  } catch (error) {
    console.error('Failed to get database stats:', error);
    return {
      size: 0,
      sizeFormatted: '0 MB',
      location: dbPath,
    };
  }
}

/**
 * Clear all data from the database
 */
async function clearAllData(): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getDatabase();

    // Delete all records
    await db.delete(records);

    // Delete all reports
    await db.delete(reports);

    return { success: true };
  } catch (error) {
    console.error('Failed to clear data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Open folder selection dialog
 */
async function selectFolder(): Promise<{ path?: string; canceled: boolean }> {
  try {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select Auto-Import Folder',
      message: 'Choose a folder to automatically import DMARC reports from',
    });

    return {
      path: result.filePaths[0],
      canceled: result.canceled,
    };
  } catch (error) {
    console.error('Failed to open folder dialog:', error);
    return { canceled: true };
  }
}

// ============================================================================
// IPC Handler Registration
// ============================================================================

export function registerSettingsHandlers(): void {
  // Get settings
  ipcMain.handle('settings:get', async () => {
    return await getSettings();
  });

  // Update settings
  ipcMain.handle('settings:update', async (_event, updates: Partial<AppSettings>) => {
    return await updateSettings(updates);
  });

  // Get database stats
  ipcMain.handle('settings:get-db-stats', async () => {
    return await getDatabaseStats();
  });

  // Clear all data
  ipcMain.handle('settings:clear-data', async () => {
    return await clearAllData();
  });

  // Select folder
  ipcMain.handle('settings:select-folder', async () => {
    return await selectFolder();
  });

  console.log('Settings IPC handlers registered');
}
