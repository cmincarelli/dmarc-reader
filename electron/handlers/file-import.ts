/**
 * File Import IPC Handlers
 *
 * Handles file selection, validation, parsing, and storage of DMARC reports.
 * Provides secure IPC interface for the renderer process.
 */

import { ipcMain, dialog, BrowserWindow } from 'electron';
import { readFile, stat } from 'fs/promises';
import { basename, extname } from 'path';
import { parseRuaXml } from '../../src/features/parser/rua-parser.js';
import { parseRufXml } from '../../src/features/parser/ruf-parser.js';
import {
  storeRuaReport,
  storeRufReport,
  reportExists,
  type StoredReport,
} from '../services/report-storage.js';
import { isRight, isLeft } from '../../src/shared/types/index.js';
import { updateTrayMenu } from '../utils/tray.js';

// Store mainWindow reference for tray updates
let mainWindowRef: BrowserWindow | null = null;

// ============================================================================
// Type Definitions
// ============================================================================

export interface ImportResult {
  success: boolean;
  report?: StoredReport;
  error?: string;
  errorDetails?: unknown;
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

interface ReportType {
  type: 'rua' | 'ruf';
  confidence: number;
}

// ============================================================================
// Constants
// ============================================================================

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_EXTENSIONS = ['.xml'];

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates file path and extension
 */
function validateFilePath(filePath: string): FileValidationResult {
  // Check extension
  const ext = extname(filePath).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `Invalid file type. Expected ${ALLOWED_EXTENSIONS.join(', ')}`,
    };
  }

  // Prevent directory traversal
  if (filePath.includes('..')) {
    return {
      valid: false,
      error: 'Invalid file path',
    };
  }

  return { valid: true };
}

/**
 * Validates file size
 */
async function validateFileSize(filePath: string): Promise<FileValidationResult> {
  try {
    const stats = await stat(filePath);

    if (stats.size === 0) {
      return {
        valid: false,
        error: 'File is empty',
      };
    }

    if (stats.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File is too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: `Failed to read file stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Detects report type by analyzing XML structure
 */
function detectReportType(xmlContent: string): ReportType {
  // Simple heuristic: RUF reports have a single <record> element,
  // RUA reports may have multiple or use different structure
  const hasMultipleRecords = (xmlContent.match(/<record>/g) || []).length > 1;
  const hasSample = xmlContent.includes('<sample>');
  const hasCount = xmlContent.includes('<count>');

  if (hasSample) {
    // RUF reports typically include email samples
    return { type: 'ruf', confidence: 0.9 };
  }

  if (hasCount && hasMultipleRecords) {
    // RUA reports have count fields and usually multiple records
    return { type: 'rua', confidence: 0.9 };
  }

  if (hasMultipleRecords) {
    return { type: 'rua', confidence: 0.7 };
  }

  // Default to RUA (most common)
  return { type: 'rua', confidence: 0.5 };
}

// ============================================================================
// Import Functions
// ============================================================================

/**
 * Imports and processes a DMARC report file
 */
export async function importReportFile(filePath: string): Promise<ImportResult> {
  try {
    // Validate file path
    const pathValidation = validateFilePath(filePath);
    if (!pathValidation.valid) {
      return {
        success: false,
        error: pathValidation.error,
      };
    }

    // Validate file size
    const sizeValidation = await validateFileSize(filePath);
    if (!sizeValidation.valid) {
      return {
        success: false,
        error: sizeValidation.error,
      };
    }

    // Read file content
    const stats = await stat(filePath);
    const xmlContent = await readFile(filePath, 'utf-8');
    const filename = basename(filePath);

    // Detect report type
    const reportType = detectReportType(xmlContent);

    // Try parsing as detected type first
    let parseResult;
    let finalType: 'rua' | 'ruf';

    if (reportType.type === 'rua') {
      parseResult = parseRuaXml(xmlContent);
      finalType = 'rua';

      // If RUA parsing fails and confidence is low, try RUF
      if (isLeft(parseResult) && reportType.confidence < 0.8) {
        const rufResult = parseRufXml(xmlContent);
        if (isRight(rufResult)) {
          parseResult = rufResult;
          finalType = 'ruf';
        }
      }
    } else {
      parseResult = parseRufXml(xmlContent);
      finalType = 'ruf';

      // If RUF parsing fails, try RUA
      if (isLeft(parseResult)) {
        const ruaResult = parseRuaXml(xmlContent);
        if (isRight(ruaResult)) {
          parseResult = ruaResult;
          finalType = 'rua';
        }
      }
    }

    // Check if parsing succeeded
    if (isLeft(parseResult as any)) {
      const error = (parseResult as any).left as { message: string; details?: unknown };
      return {
        success: false,
        error: `Failed to parse DMARC report: ${error.message}`,
        errorDetails: error.details,
      };
    }

    const report = (parseResult as any).right;

    // Check for duplicate reports
    const isDuplicate = reportExists(report.reportMetadata.reportId);
    if (isDuplicate) {
      return {
        success: false,
        error: `Report already imported: ${report.reportMetadata.reportId}`,
      };
    }

    // Store the report
    const storeOptions = {
      filename,
      fileSize: stats.size,
      rawXml: xmlContent,
    };

    const storedReport =
      finalType === 'rua'
        ? storeRuaReport(report as any, storeOptions)
        : storeRufReport(report as any, storeOptions);

    // Update tray menu with new report stats
    if (mainWindowRef) {
      updateTrayMenu(mainWindowRef).catch((err) => {
        console.error('[FILE-IMPORT] Failed to update tray menu:', err);
      });
    }

    return {
      success: true,
      report: storedReport,
    };
  } catch (error) {
    console.error('Import error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred during import',
      errorDetails: error,
    };
  }
}

/**
 * Shows file picker dialog and imports selected file
 */
async function selectAndImportFile(mainWindow: BrowserWindow): Promise<ImportResult> {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'DMARC Reports', extensions: ['xml'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      title: 'Select DMARC Report',
    });

    if (result.canceled || result.filePaths.length === 0) {
      return {
        success: false,
        error: 'No file selected',
      };
    }

    return await importReportFile(result.filePaths[0]);
  } catch (error) {
    console.error('File selection error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to select file',
      errorDetails: error,
    };
  }
}

/**
 * Imports multiple files at once (for drag-and-drop)
 */
async function importMultipleFiles(filePaths: string[]): Promise<ImportResult[]> {
  const results: ImportResult[] = [];

  for (const filePath of filePaths) {
    const result = await importReportFile(filePath);
    results.push(result);
  }

  return results;
}

// ============================================================================
// IPC Handler Registration
// ============================================================================

/**
 * Registers all file import IPC handlers
 */
export function registerFileImportHandlers(mainWindow: BrowserWindow): void {
  // Store reference for tray updates
  mainWindowRef = mainWindow;

  // Handle file selection and import
  ipcMain.handle('file:select-and-import', async () => {
    return await selectAndImportFile(mainWindow);
  });

  // Handle direct file import (for drag-and-drop)
  ipcMain.handle('file:import', async (_event, filePath: string) => {
    return await importReportFile(filePath);
  });

  // Handle multiple file import
  ipcMain.handle('file:import-multiple', async (_event, filePaths: string[]) => {
    return await importMultipleFiles(filePaths);
  });

  // Validate file without importing
  ipcMain.handle('file:validate', async (_event, filePath: string) => {
    const pathValidation = validateFilePath(filePath);
    if (!pathValidation.valid) {
      return pathValidation;
    }

    return await validateFileSize(filePath);
  });
}
