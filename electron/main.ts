/**
 * Electron Main Process
 *
 * The main process handles system-level operations, file I/O, database access,
 * and secure communication with the renderer process via IPC.
 */

import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { initializeDatabase, closeDatabase } from './utils/database.js';
import { registerFileImportHandlers, importReportFile } from './handlers/file-import.js';
import { registerDatabaseHandlers } from './handlers/database.js';
import { registerAnalysisHandlers } from './handlers/analysis.js';
import { registerSettingsHandlers } from './handlers/settings.js';
import { autoImportManager } from './services/auto-import.js';
import { createApplicationMenu } from './utils/menu.js';
import { createTray, destroyTray } from './utils/tray.js';

// ESM requires manual __dirname and __filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// Application State
// ============================================================================

let mainWindow: BrowserWindow | null = null;

// Properly detect if running in development or production
// app.isPackaged is false during development, true in packaged app
const isDevelopment = !app.isPackaged;
const VITE_DEV_SERVER_URL = 'http://localhost:5173';

// ============================================================================
// Window Creation
// ============================================================================

function createWindow() {
  const preloadPath = path.join(__dirname, 'preload.mjs');
  console.log('[MAIN] Preload path:', preloadPath);
  console.log('[MAIN] __dirname:', __dirname);

  // Set icon path (development uses PNG, production uses platform-specific format)
  const iconPath = isDevelopment
    ? path.join(__dirname, '../../build/icons/512x512.png')
    : path.join(__dirname, '../../build/icons/icon.icns');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    title: 'DMARC Reader',
    icon: iconPath,
    webPreferences: {
      // Security best practices
      nodeIntegration: false, // CRITICAL: Prevent Node.js in renderer
      contextIsolation: true, // CRITICAL: Isolate contexts
      sandbox: false, // Disabled - ESM preload scripts require unsandboxed renderer
      webSecurity: true, // Enable web security
      preload: preloadPath,
    },
  });

  // Create application menu
  createApplicationMenu(mainWindow);

  // Load the app
  if (isDevelopment) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load from packaged files
    // __dirname is dist-electron/electron, so we go up 2 levels to reach dist/
    const indexPath = path.join(__dirname, '..', '..', 'dist', 'index.html');
    console.log('[MAIN] Loading production app from:', indexPath);
    mainWindow.loadFile(indexPath);
  }

  // Security: Prevent navigation to external URLs
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    const parsedDevUrl = new URL(VITE_DEV_SERVER_URL);

    // Allow navigation only to dev server in development or local files
    if (isDevelopment && parsedUrl.origin === parsedDevUrl.origin) {
      return;
    }

    // Block all other navigation
    event.preventDefault();
    console.warn('Prevented navigation to:', navigationUrl);
  });

  // Security: Prevent new window creation
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });

  // Handle loading errors
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('[MAIN] Failed to load:', errorCode, errorDescription);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ============================================================================
// App Lifecycle
// ============================================================================

// Use top-level await with ESM for cleaner initialization
app.on('ready', async () => {
  try {
    // Initialize database
    await initializeDatabase();
    console.log('Database initialized successfully');

    // Create window first to pass to handlers
    createWindow();

    // Register IPC handlers (requires mainWindow to be created)
    if (mainWindow) {
      registerFileImportHandlers(mainWindow);
      registerDatabaseHandlers();
      registerAnalysisHandlers();
      registerSettingsHandlers();
      console.log('IPC handlers registered');

      // Initialize auto-import manager
      autoImportManager.initialize(mainWindow, async (filePath: string) => {
        const result = await importReportFile(filePath);
        if (!result.success) {
          throw new Error(result.error);
        }
      });

      // Load and start auto-import if enabled
      const { loadSettings } = await import('./handlers/settings.js');
      const settings = await loadSettings();
      if (settings.autoImport && settings.autoImportFolder) {
        autoImportManager.start({
          folderPath: settings.autoImportFolder,
          enabled: settings.autoImport,
          postImportAction: settings.autoImportAction || 'archive',
        });
      }

      // Create system tray/menubar icon
      createTray(mainWindow);
      console.log('System tray created');
    }
  } catch (error) {
    console.error('Failed to initialize application:', error);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  // On macOS, keep the app running in menubar even when window is closed
  // On other platforms, quit when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  // Clean up resources before quitting
  await autoImportManager.stop();
  destroyTray();
  closeDatabase();
});

app.on('activate', () => {
  // On macOS, re-create window when dock icon is clicked
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// ============================================================================
// Security Hardening
// ============================================================================

// Disable GPU acceleration if needed for compatibility
// app.disableHardwareAcceleration();

// Set app user model ID for Windows
if (process.platform === 'win32') {
  app.setAppUserModelId('com.dmarcreader.app');
}

// ============================================================================
// Error Handling
// ============================================================================

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  // In production, you might want to log this to a file or service
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  // In production, you might want to log this to a file or service
});

// ============================================================================
// Auto-Update (Production only)
// ============================================================================

// if (!isDevelopment) {
//   import('electron-updater').then(({ autoUpdater }) => {
//     autoUpdater.checkForUpdatesAndNotify();
//
//     autoUpdater.on('update-available', () => {
//       console.log('Update available');
//     });
//
//     autoUpdater.on('update-downloaded', () => {
//       console.log('Update downloaded');
//       // Notify user and prompt to restart
//     });
//   });
// }
