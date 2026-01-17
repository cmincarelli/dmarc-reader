/**
 * Database Configuration and Schema
 *
 * SQLite database setup using Drizzle ORM with type-safe queries.
 */

import Database from 'better-sqlite3';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import * as path from 'path';
import { app } from 'electron';

// ============================================================================
// Schema Definitions
// ============================================================================

export const reports = sqliteTable('reports', {
  id: text('id').primaryKey(),
  filename: text('filename').notNull(),
  type: text('type', { enum: ['rua', 'ruf'] }).notNull(),
  orgName: text('org_name').notNull(),
  reportId: text('report_id').notNull(),
  dateBegin: integer('date_begin').notNull(), // Unix timestamp
  dateEnd: integer('date_end').notNull(), // Unix timestamp
  domain: text('domain').notNull(),
  rawXml: text('raw_xml').notNull(), // Compressed
  parsedData: text('parsed_data').notNull(), // JSON string
  importedAt: integer('imported_at').notNull(), // Unix timestamp
  fileSize: integer('file_size').notNull(),
});

export const records = sqliteTable('records', {
  id: text('id').primaryKey(),
  reportId: text('report_id')
    .notNull()
    .references(() => reports.id, { onDelete: 'cascade' }),
  sourceIp: text('source_ip').notNull(),
  count: integer('count').notNull(),
  disposition: text('disposition').notNull(),
  dkimResult: text('dkim_result').notNull(),
  spfResult: text('spf_result').notNull(),
  headerFrom: text('header_from').notNull(),
  envelopeFrom: text('envelope_from'),
  countryCode: text('country_code'),
  asn: integer('asn'),
  organization: text('organization'),
});

export const domains = sqliteTable('domains', {
  id: text('id').primaryKey(),
  domain: text('domain').notNull().unique(),
  spfRecord: text('spf_record'),
  dkimSelectors: text('dkim_selectors').notNull(), // JSON array
  dmarcPolicy: text('dmarc_policy'),
  addedAt: integer('added_at').notNull(), // Unix timestamp
  lastCheck: integer('last_check'), // Unix timestamp
});

export const issues = sqliteTable('issues', {
  id: text('id').primaryKey(),
  reportId: text('report_id')
    .notNull()
    .references(() => reports.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  severity: text('severity', { enum: ['critical', 'high', 'medium', 'low'] }).notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  affectedRecords: integer('affected_records').notNull(),
  recommendation: text('recommendation').notNull(), // JSON string
  detectedAt: integer('detected_at').notNull(), // Unix timestamp
  resolved: integer('resolved', { mode: 'boolean' }).notNull().default(false),
});

// ============================================================================
// Database Instance
// ============================================================================

let db: BetterSQLite3Database | null = null;
let sqlite: Database.Database | null = null;

/**
 * Get the database file path
 */
function getDatabasePath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'dmarc-reader.db');
}

/**
 * Initialize the database
 */
export async function initializeDatabase(): Promise<void> {
  try {
    const dbPath = getDatabasePath();
    console.log('Initializing database at:', dbPath);

    // Create SQLite instance
    sqlite = new Database(dbPath);
    sqlite.pragma('journal_mode = WAL'); // Write-Ahead Logging for better performance

    // Create Drizzle instance
    db = drizzle(sqlite);

    // Create tables if they don't exist
    await createTables();

    // Create indexes
    await createIndexes();

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Create database tables
 */
async function createTables(): Promise<void> {
  if (!sqlite) {
    throw new Error('Database not initialized');
  }

  // Create reports table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('rua', 'ruf')),
      org_name TEXT NOT NULL,
      report_id TEXT NOT NULL,
      date_begin INTEGER NOT NULL,
      date_end INTEGER NOT NULL,
      domain TEXT NOT NULL,
      raw_xml TEXT NOT NULL,
      parsed_data TEXT NOT NULL,
      imported_at INTEGER NOT NULL,
      file_size INTEGER NOT NULL
    )
  `);

  // Create records table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS records (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL,
      source_ip TEXT NOT NULL,
      count INTEGER NOT NULL,
      disposition TEXT NOT NULL,
      dkim_result TEXT NOT NULL,
      spf_result TEXT NOT NULL,
      header_from TEXT NOT NULL,
      envelope_from TEXT,
      country_code TEXT,
      asn INTEGER,
      organization TEXT,
      FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
    )
  `);

  // Create domains table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS domains (
      id TEXT PRIMARY KEY,
      domain TEXT NOT NULL UNIQUE,
      spf_record TEXT,
      dkim_selectors TEXT NOT NULL,
      dmarc_policy TEXT,
      added_at INTEGER NOT NULL,
      last_check INTEGER
    )
  `);

  // Create issues table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS issues (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL,
      type TEXT NOT NULL,
      severity TEXT NOT NULL CHECK(severity IN ('critical', 'high', 'medium', 'low')),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      affected_records INTEGER NOT NULL,
      recommendation TEXT NOT NULL,
      detected_at INTEGER NOT NULL,
      resolved INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
    )
  `);
}

/**
 * Create database indexes for performance
 */
async function createIndexes(): Promise<void> {
  if (!sqlite) {
    throw new Error('Database not initialized');
  }

  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS idx_reports_domain ON reports(domain);
    CREATE INDEX IF NOT EXISTS idx_reports_date_begin ON reports(date_begin);
    CREATE INDEX IF NOT EXISTS idx_reports_date_end ON reports(date_end);
    CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(type);

    CREATE INDEX IF NOT EXISTS idx_records_report_id ON records(report_id);
    CREATE INDEX IF NOT EXISTS idx_records_source_ip ON records(source_ip);
    CREATE INDEX IF NOT EXISTS idx_records_disposition ON records(disposition);
    CREATE INDEX IF NOT EXISTS idx_records_country_code ON records(country_code);

    CREATE INDEX IF NOT EXISTS idx_issues_report_id ON issues(report_id);
    CREATE INDEX IF NOT EXISTS idx_issues_severity ON issues(severity);
    CREATE INDEX IF NOT EXISTS idx_issues_resolved ON issues(resolved);
  `);
}

/**
 * Get the Drizzle database instance
 */
export function getDatabase(): BetterSQLite3Database {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

/**
 * Get the raw SQLite instance
 */
export function getSQLite(): Database.Database {
  if (!sqlite) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return sqlite;
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
  if (sqlite) {
    sqlite.close();
    sqlite = null;
    db = null;
  }
}

/**
 * Run database in a transaction
 */
export function runInTransaction<T>(fn: (db: BetterSQLite3Database) => T): T {
  const database = getDatabase();
  const rawDb = getSQLite();

  try {
    rawDb.exec('BEGIN TRANSACTION');
    const result = fn(database);
    rawDb.exec('COMMIT');
    return result;
  } catch (error) {
    rawDb.exec('ROLLBACK');
    throw error;
  }
}
