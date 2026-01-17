/**
 * Auto-Import Service
 *
 * Watches a designated folder for new DMARC report files and automatically imports them.
 */

import * as chokidar from 'chokidar';
import * as path from 'path';
import * as fs from 'fs/promises';
import { BrowserWindow } from 'electron';
import { isArchive, extractArchive, cleanupExtraction } from '../utils/archive.js';

// ============================================================================
// Type Definitions
// ============================================================================

interface AutoImportConfig {
  folderPath: string;
  enabled: boolean;
  postImportAction: 'keep' | 'delete' | 'archive';
}

type ImportCallback = (filePath: string) => Promise<void>;

// ============================================================================
// Auto Import Manager
// ============================================================================

export class AutoImportManager {
  private watcher: chokidar.FSWatcher | null = null;
  private config: AutoImportConfig | null = null;
  private importCallback: ImportCallback | null = null;
  private mainWindow: BrowserWindow | null = null;
  private processingFiles = new Set<string>();

  /**
   * Initialize the auto-import manager
   */
  initialize(mainWindow: BrowserWindow, importCallback: ImportCallback): void {
    this.mainWindow = mainWindow;
    this.importCallback = importCallback;
    console.log('[AUTO-IMPORT] Manager initialized');
  }

  /**
   * Start watching a folder for new files
   */
  start(config: AutoImportConfig): void {
    if (!config.enabled || !config.folderPath) {
      console.log('[AUTO-IMPORT] Auto-import disabled');
      return;
    }

    // Stop existing watcher if any
    this.stop();

    this.config = config;

    console.log(`[AUTO-IMPORT] Starting watcher on: ${config.folderPath}`);

    try {
      this.watcher = chokidar.watch(config.folderPath, {
        ignored: /(^|[\/\\])\../, // Ignore dotfiles
        persistent: true,
        ignoreInitial: false, // Process existing files on startup
        depth: 0, // Don't watch subdirectories
        awaitWriteFinish: {
          stabilityThreshold: 2000, // Wait 2s for file writes to finish
          pollInterval: 100,
        },
      });

      this.watcher
        .on('add', (filePath: string) => {
          this.handleFileAdded(filePath);
        })
        .on('error', (error: unknown) => {
          console.error('[AUTO-IMPORT] Watcher error:', error);
        })
        .on('ready', () => {
          console.log('[AUTO-IMPORT] Initial scan complete, ready for changes');
        });
    } catch (error) {
      console.error('[AUTO-IMPORT] Failed to start watcher:', error);
    }
  }

  /**
   * Stop watching the folder
   */
  async stop(): Promise<void> {
    if (this.watcher) {
      console.log('[AUTO-IMPORT] Stopping watcher');
      await this.watcher.close();
      this.watcher = null;
    }
    this.config = null;
    this.processingFiles.clear();
  }

  /**
   * Handle new file detected
   */
  private async handleFileAdded(filePath: string): Promise<void> {
    const ext = path.extname(filePath).toLowerCase();
    const filename = path.basename(filePath);

    // Only process .xml files or archives (.zip, .gz, .tar.gz)
    const isXml = ext === '.xml';
    const isArchiveFile = isArchive(filePath);

    if (!isXml && !isArchiveFile) {
      return;
    }

    // Prevent processing the same file multiple times
    if (this.processingFiles.has(filePath)) {
      return;
    }

    this.processingFiles.add(filePath);
    console.log(`[AUTO-IMPORT] New file detected: ${filename}`);

    try {
      if (isArchiveFile) {
        // Handle archive files
        await this.handleArchiveFile(filePath);
      } else {
        // Handle single XML file
        await this.handleXmlFile(filePath);
      }
    } catch (error) {
      console.error(`[AUTO-IMPORT] Failed to process ${filename}:`, error);

      // Send error notification to renderer
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('auto-import:error', {
          filename,
          path: filePath,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    } finally {
      // Remove from processing set after a delay to prevent rapid re-processing
      setTimeout(() => {
        this.processingFiles.delete(filePath);
      }, 5000);
    }
  }

  /**
   * Handle a single XML file import
   */
  private async handleXmlFile(filePath: string): Promise<void> {
    const filename = path.basename(filePath);

    if (!this.importCallback) {
      throw new Error('Import callback not initialized');
    }

    // Import the file
    await this.importCallback(filePath);
    console.log(`[AUTO-IMPORT] Successfully imported: ${filename}`);

    // Handle post-import action
    await this.handlePostImportAction(filePath);

    // Send notification to renderer
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('auto-import:success', {
        filename,
        path: filePath,
      });
    }
  }

  /**
   * Handle an archive file (extract and import all XML files)
   */
  private async handleArchiveFile(filePath: string): Promise<void> {
    const filename = path.basename(filePath);

    console.log(`[AUTO-IMPORT] Extracting archive: ${filename}`);

    // Extract the archive
    const extractionResult = await extractArchive(filePath);

    if (!extractionResult.success) {
      throw new Error(extractionResult.error || 'Failed to extract archive');
    }

    if (extractionResult.extractedFiles.length === 0) {
      throw new Error('No XML files found in archive');
    }

    console.log(`[AUTO-IMPORT] Found ${extractionResult.extractedFiles.length} XML file(s) in archive`);

    // Import each extracted XML file
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (const xmlFile of extractionResult.extractedFiles) {
      try {
        if (this.importCallback) {
          await this.importCallback(xmlFile);
          successCount++;
          console.log(`[AUTO-IMPORT] Imported from archive: ${path.basename(xmlFile)}`);
        }
      } catch (error) {
        failCount++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${path.basename(xmlFile)}: ${errorMsg}`);
        console.error(`[AUTO-IMPORT] Failed to import ${path.basename(xmlFile)}:`, error);
      }
    }

    // Clean up extracted files
    await cleanupExtraction(extractionResult.extractedFiles);

    // Handle the original archive file
    await this.handlePostImportAction(filePath);

    // Send notification to renderer
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      if (failCount === 0) {
        this.mainWindow.webContents.send('auto-import:success', {
          filename,
          path: filePath,
          message: `Successfully imported ${successCount} file(s) from archive`,
        });
      } else {
        this.mainWindow.webContents.send('auto-import:error', {
          filename,
          path: filePath,
          error: `Imported ${successCount} file(s), ${failCount} failed. Errors: ${errors.join('; ')}`,
        });
      }
    }

    if (failCount > 0) {
      throw new Error(`${failCount} file(s) failed to import from archive`);
    }
  }

  /**
   * Handle file after successful import (delete, archive, or keep)
   */
  private async handlePostImportAction(filePath: string): Promise<void> {
    if (!this.config) return;

    const action = this.config.postImportAction;
    const filename = path.basename(filePath);

    try {
      switch (action) {
        case 'delete':
          await fs.unlink(filePath);
          console.log(`[AUTO-IMPORT] Deleted: ${filename}`);
          break;

        case 'archive':
          // Create archive folder if it doesn't exist
          const archiveFolder = path.join(this.config.folderPath, 'imported');
          try {
            await fs.mkdir(archiveFolder, { recursive: true });
          } catch (error) {
            // Folder might already exist
          }

          // Move file to archive folder
          const archivePath = path.join(archiveFolder, filename);

          // If file already exists in archive, add timestamp to make it unique
          let finalArchivePath = archivePath;
          try {
            await fs.access(archivePath);
            // File exists, add timestamp
            const timestamp = Date.now();
            const ext = path.extname(filename);
            const nameWithoutExt = path.basename(filename, ext);
            finalArchivePath = path.join(archiveFolder, `${nameWithoutExt}_${timestamp}${ext}`);
          } catch {
            // File doesn't exist, use original path
          }

          await fs.rename(filePath, finalArchivePath);
          console.log(`[AUTO-IMPORT] Archived: ${filename} → imported/${path.basename(finalArchivePath)}`);
          break;

        case 'keep':
          console.log(`[AUTO-IMPORT] Keeping: ${filename}`);
          break;

        default:
          console.log(`[AUTO-IMPORT] Unknown action: ${action}, keeping file`);
      }
    } catch (error) {
      console.error(`[AUTO-IMPORT] Failed to handle post-import action for ${filename}:`, error);
      // Don't throw - import was successful, just file handling failed
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): AutoImportConfig | null {
    return this.config;
  }

  /**
   * Check if watcher is active
   */
  isActive(): boolean {
    return this.watcher !== null;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const autoImportManager = new AutoImportManager();
