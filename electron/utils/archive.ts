/**
 * Archive Extraction Utilities
 *
 * Handles extraction of tar.gz and zip archives
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as tar from 'tar';
import AdmZip from 'adm-zip';
import { createReadStream } from 'fs';
import { createGunzip } from 'zlib';

// ============================================================================
// Type Definitions
// ============================================================================

export interface ExtractionResult {
  success: boolean;
  extractedFiles: string[];
  error?: string;
}

// ============================================================================
// Archive Detection
// ============================================================================

/**
 * Check if a file is an archive we can extract
 */
export function isArchive(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  const basename = path.basename(filePath).toLowerCase();

  return (
    ext === '.zip' ||
    ext === '.gz' ||
    basename.endsWith('.tar.gz') ||
    basename.endsWith('.tgz')
  );
}

/**
 * Get the type of archive
 */
export function getArchiveType(filePath: string): 'zip' | 'tar.gz' | 'gzip' | null {
  const ext = path.extname(filePath).toLowerCase();
  const basename = path.basename(filePath).toLowerCase();

  if (ext === '.zip') {
    return 'zip';
  } else if (basename.endsWith('.tar.gz') || basename.endsWith('.tgz')) {
    return 'tar.gz';
  } else if (ext === '.gz') {
    return 'gzip';
  }

  return null;
}

// ============================================================================
// Extraction Functions
// ============================================================================

/**
 * Extract a zip file to a temporary directory
 */
async function extractZip(archivePath: string, targetDir: string): Promise<string[]> {
  try {
    const zip = new AdmZip(archivePath);
    zip.extractAllTo(targetDir, true);

    // Get list of extracted files
    const entries = zip.getEntries();
    const extractedFiles: string[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory) {
        const filePath = path.join(targetDir, entry.entryName);
        extractedFiles.push(filePath);
      }
    }

    return extractedFiles;
  } catch (error) {
    throw new Error(`Failed to extract ZIP: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract a tar.gz file to a temporary directory
 */
async function extractTarGz(archivePath: string, targetDir: string): Promise<string[]> {
  try {
    // Extract the tar.gz file
    await tar.x({
      file: archivePath,
      cwd: targetDir,
    });

    // Get list of extracted files
    const extractedFiles = await getFilesRecursively(targetDir);
    return extractedFiles;
  } catch (error) {
    throw new Error(`Failed to extract TAR.GZ: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract a gzip file (single file compression)
 */
async function extractGzip(archivePath: string, targetDir: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    try {
      // Get the output filename (remove .gz extension)
      const basename = path.basename(archivePath, '.gz');
      const outputPath = path.join(targetDir, basename);

      const readStream = createReadStream(archivePath);
      const writeStream = fs.open(outputPath, 'w');
      const gunzip = createGunzip();

      readStream
        .pipe(gunzip)
        .on('error', (error) => {
          reject(new Error(`Failed to extract GZIP: ${error.message}`));
        });

      writeStream.then(async (fileHandle) => {
        const writeStreamHandle = fileHandle.createWriteStream();

        gunzip.pipe(writeStreamHandle);

        writeStreamHandle.on('finish', async () => {
          await fileHandle.close();
          resolve([outputPath]);
        });

        writeStreamHandle.on('error', async (error) => {
          await fileHandle.close();
          reject(new Error(`Failed to write extracted file: ${error.message}`));
        });
      }).catch((error) => {
        reject(new Error(`Failed to create output file: ${error.message}`));
      });
    } catch (error) {
      reject(new Error(`Failed to extract GZIP: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  });
}

/**
 * Recursively get all files in a directory
 */
async function getFilesRecursively(dir: string): Promise<string[]> {
  const files: string[] = [];

  async function walk(currentDir: string) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else {
        files.push(fullPath);
      }
    }
  }

  await walk(dir);
  return files;
}

// ============================================================================
// Main Extraction Function
// ============================================================================

/**
 * Extract an archive to a temporary directory and return extracted file paths
 */
export async function extractArchive(
  archivePath: string,
  tempDir?: string
): Promise<ExtractionResult> {
  try {
    // Determine archive type
    const archiveType = getArchiveType(archivePath);

    if (!archiveType) {
      return {
        success: false,
        extractedFiles: [],
        error: 'Unsupported archive format',
      };
    }

    // Create temporary extraction directory
    const extractDir = tempDir || path.join(
      path.dirname(archivePath),
      `.extract-${Date.now()}`
    );

    await fs.mkdir(extractDir, { recursive: true });

    // Extract based on type
    let extractedFiles: string[] = [];

    switch (archiveType) {
      case 'zip':
        extractedFiles = await extractZip(archivePath, extractDir);
        break;
      case 'tar.gz':
        extractedFiles = await extractTarGz(archivePath, extractDir);
        break;
      case 'gzip':
        extractedFiles = await extractGzip(archivePath, extractDir);
        break;
    }

    // Filter to only .xml files
    const xmlFiles = extractedFiles.filter(
      (file) => path.extname(file).toLowerCase() === '.xml'
    );

    if (xmlFiles.length === 0) {
      // Clean up if no XML files found
      await fs.rm(extractDir, { recursive: true, force: true });
      return {
        success: false,
        extractedFiles: [],
        error: 'No XML files found in archive',
      };
    }

    console.log(`[ARCHIVE] Extracted ${xmlFiles.length} XML file(s) from ${archiveType} archive`);

    return {
      success: true,
      extractedFiles: xmlFiles,
    };
  } catch (error) {
    console.error('[ARCHIVE] Extraction error:', error);
    return {
      success: false,
      extractedFiles: [],
      error: error instanceof Error ? error.message : 'Unknown extraction error',
    };
  }
}

/**
 * Clean up extracted files and temporary directory
 */
export async function cleanupExtraction(extractedFiles: string[]): Promise<void> {
  if (extractedFiles.length === 0) {
    return;
  }

  // Get the common directory (they should all be in the same temp dir)
  const extractDir = path.dirname(extractedFiles[0]);

  // Only clean up if it looks like a temp extraction directory
  if (extractDir.includes('.extract-')) {
    try {
      await fs.rm(extractDir, { recursive: true, force: true });
      console.log(`[ARCHIVE] Cleaned up extraction directory: ${extractDir}`);
    } catch (error) {
      console.error('[ARCHIVE] Failed to clean up extraction directory:', error);
    }
  }
}
