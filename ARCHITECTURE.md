# Architecture Documentation

## Overview

DMARC Reader is built as an Electron desktop application following functional programming principles with a strong emphasis on security, testability, and maintainability.

## Table of Contents

- [High-Level Architecture](#high-level-architecture)
- [Electron Architecture](#electron-architecture)
- [Data Flow](#data-flow)
- [Security Model](#security-model)
- [Functional Programming Patterns](#functional-programming-patterns)
- [Database Design](#database-design)
- [Type System](#type-system)
- [Module Organization](#module-organization)

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     DMARC Reader App                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────┐         ┌───────────────────┐      │
│  │  Renderer Process │◄───────►│   Main Process    │      │
│  │     (React UI)    │   IPC   │   (Node.js)       │      │
│  └───────────────────┘         └───────────────────┘      │
│           │                              │                 │
│           │                              │                 │
│           ▼                              ▼                 │
│  ┌───────────────────┐         ┌───────────────────┐      │
│  │  State Management │         │  SQLite Database  │      │
│  │   (Zustand)       │         │  (better-sqlite3) │      │
│  └───────────────────┘         └───────────────────┘      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Process Separation

**Renderer Process (Chromium + React)**
- User interface rendering
- State management (Zustand)
- Data visualization (Recharts, Mapbox)
- Light computation (filtering, sorting)
- **No direct Node.js access** (security)

**Main Process (Node.js)**
- File system operations
- Database operations (SQLite)
- Heavy computation (XML parsing, analysis)
- IPC request handling
- System integration

**Preload Script (Bridge)**
- Secure context bridge between processes
- Exposes limited, typed API to renderer
- Implements security boundaries

---

## Electron Architecture

### Security-First Design

Our Electron configuration follows security best practices:

```typescript
// electron/main.ts
const mainWindow = new BrowserWindow({
  webPreferences: {
    nodeIntegration: false,      // ✅ CRITICAL
    contextIsolation: true,       // ✅ CRITICAL
    sandbox: true,                // ✅ Enable sandbox
    webSecurity: true,            // ✅ Enable web security
    preload: path.join(__dirname, 'preload.js'),
  },
});
```

**Security Principles:**
1. **No Node.js in Renderer**: Prevents arbitrary code execution
2. **Context Isolation**: Separate JavaScript contexts
3. **Sandboxing**: Renderer runs with limited privileges
4. **Typed IPC**: All communication is typed and validated
5. **No External Navigation**: Prevents phishing/XSS attacks

### IPC Communication Pattern

```
┌──────────────┐                    ┌──────────────┐
│   Renderer   │                    │     Main     │
│   Process    │                    │   Process    │
├──────────────┤                    ├──────────────┤
│              │                    │              │
│  Component   │──── IPC Invoke ───►│   Handler    │
│              │                    │              │
│              │◄─── Response ──────│   Parser     │
│              │                    │   Database   │
│  UI Update   │                    │   GeoIP      │
│              │                    │              │
└──────────────┘                    └──────────────┘
      ▲                                    │
      │                                    │
      └────────── Secure Bridge ──────────┘
              (electron/preload.ts)
```

**Example Flow:**

```typescript
// Renderer: User action
const result = await window.electronAPI.importFile(filePath);

// Preload: Secure bridge
electronAPI.importFile = (filePath: string) =>
  ipcRenderer.invoke('file:import', filePath);

// Main: Handler processes request
ipcMain.handle('file:import', async (event, filePath) => {
  // 1. Validate input
  // 2. Read file
  // 3. Parse XML
  // 4. Store in database
  // 5. Return result
});
```

---

## Data Flow

### Import Flow

```
User Action (Drop File)
    ↓
Renderer: DropZone Component
    ↓
IPC: window.electronAPI.importFile(path)
    ↓
Main: File Validation
    ↓
Main: XML Parsing (fast-xml-parser)
    ↓
Main: Schema Validation (Zod)
    ↓
Main: Data Transformation (pure functions)
    ↓
Main: Database Storage (SQLite)
    ↓
IPC: Return ImportResult
    ↓
Renderer: Update UI
```

### Analysis Flow

```
User Action (View Report)
    ↓
Renderer: Request report data
    ↓
IPC: window.electronAPI.getReport(id)
    ↓
Main: Database Query
    ↓
Main: Analysis Pipeline
    ├─► Aggregate records
    ├─► Calculate pass rates
    ├─► Detect issues
    ├─► Generate recommendations
    └─► Enrich with GeoIP
    ↓
IPC: Return AnalysisSummary
    ↓
Renderer: Cache in React Query
    ↓
Renderer: Display Dashboard
```

---

## Security Model

### Threat Model

**Threats We Mitigate:**
1. **Malicious XML**: Schema validation prevents code injection
2. **Path Traversal**: File path sanitization
3. **XSS Attacks**: No external navigation allowed
4. **Data Exfiltration**: All data stays local
5. **Arbitrary Code Execution**: No Node.js in renderer

### Defense Layers

1. **Input Validation**: Zod schemas validate all data
2. **Sandboxing**: Renderer runs with limited privileges
3. **IPC Boundary**: Typed, validated communication only
4. **File System**: Sanitized paths, size limits
5. **Database**: Parameterized queries (SQL injection proof)

### API Surface

The preload script exposes a **minimal, typed API**:

```typescript
interface ElectronAPI {
  // File operations (limited)
  selectFile(): Promise<string | undefined>
  importFile(path: string): Promise<ImportResult>

  // Database operations (read-only from renderer)
  getReports(filters?: ReportFilters): Promise<Report[]>

  // Analysis operations (pure functions)
  analyzeReport(id: string): Promise<AnalysisSummary>

  // NO direct filesystem access
  // NO direct database access
  // NO shell command execution
}
```

---

## Functional Programming Patterns

### Core Principles

1. **Pure Functions**: No side effects, deterministic
2. **Immutability**: All data structures are readonly
3. **Composition**: Build complex operations from simple ones
4. **Type Safety**: Leverage TypeScript's type system

### Pure Function Example

```typescript
// ✅ Pure function - easy to test, predictable
export const calculatePassRate = (
  records: readonly RuaRecord[]
): number => {
  if (records.length === 0) return 0;

  const passed = records.filter(record =>
    record.row.policyEvaluated.dkim === 'pass' &&
    record.row.policyEvaluated.spf === 'pass'
  ).length;

  return (passed / records.length) * 100;
};

// ❌ Impure - harder to test, unpredictable
let totalRecords = 0;
export function addRecord(record: RuaRecord) {
  totalRecords++; // Side effect!
  database.insert(record); // Side effect!
}
```

### Function Composition

```typescript
// Composable pipeline for data processing
export const processReport = pipe(
  parseXmlString,           // Either<Error, RawReport>
  validateWithSchema,       // Either<Error, ValidReport>
  extractRecords,           // Either<Error, Record[]>
  enrichWithGeoData,        // Either<Error, EnrichedRecord[]>
  detectIssues,             // Either<Error, IssueReport>
  generateRecommendations   // Either<Error, FullAnalysis>
);

// Usage
const result = processReport(xmlString);
if (isRight(result)) {
  // Success path
  const analysis = result.right;
} else {
  // Error path
  const error = result.left;
}
```

### Either Type for Error Handling

```typescript
// Functional error handling (no exceptions)
export type Either<L, R> = Left<L> | Right<R>;

interface Left<L> { _tag: 'Left'; left: L; }
interface Right<R> { _tag: 'Right'; right: R; }

// Parser returns Either instead of throwing
export const parseRuaXml = (
  xml: string
): Either<ParseError, RuaReport> => {
  try {
    const parsed = parser.parse(xml);
    const validated = RuaSchema.parse(parsed);
    return right(validated);
  } catch (error) {
    return left({
      code: 'PARSE_ERROR',
      message: error.message
    });
  }
};
```

### Immutability with Immer

```typescript
import { produce } from 'immer';

// Update state immutably
const nextState = produce(currentState, draft => {
  // Draft is mutable, but produces immutable result
  draft.reports.push(newReport);
  draft.filters.domain = 'example.com';
});
```

---

## Database Design

### Schema

**Reports Table** (Main table for DMARC reports)
```sql
CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  type TEXT CHECK(type IN ('rua', 'ruf')),
  org_name TEXT NOT NULL,
  report_id TEXT NOT NULL,
  date_begin INTEGER NOT NULL,    -- Unix timestamp
  date_end INTEGER NOT NULL,      -- Unix timestamp
  domain TEXT NOT NULL,
  raw_xml TEXT NOT NULL,          -- Compressed with lz-string
  parsed_data TEXT NOT NULL,      -- JSON stringified
  imported_at INTEGER NOT NULL,   -- Unix timestamp
  file_size INTEGER NOT NULL
);

CREATE INDEX idx_reports_domain ON reports(domain);
CREATE INDEX idx_reports_date_begin ON reports(date_begin);
```

**Records Table** (Denormalized for query performance)
```sql
CREATE TABLE records (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  source_ip TEXT NOT NULL,
  count INTEGER NOT NULL,
  disposition TEXT NOT NULL,
  dkim_result TEXT NOT NULL,
  spf_result TEXT NOT NULL,
  header_from TEXT NOT NULL,
  envelope_from TEXT,
  country_code TEXT,              -- Pre-computed from GeoIP
  asn INTEGER,                    -- Pre-computed from GeoIP
  organization TEXT               -- Pre-computed from GeoIP
);

CREATE INDEX idx_records_report_id ON records(report_id);
CREATE INDEX idx_records_source_ip ON records(source_ip);
```

**Issues Table** (Detected problems)
```sql
CREATE TABLE issues (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  severity TEXT CHECK(severity IN ('critical', 'high', 'medium', 'low')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  affected_records INTEGER NOT NULL,
  recommendation TEXT NOT NULL,   -- JSON stringified
  detected_at INTEGER NOT NULL,
  resolved INTEGER NOT NULL DEFAULT 0
);
```

### Design Decisions

1. **Denormalization**: Pre-compute GeoIP data for performance
2. **Compression**: Raw XML compressed with lz-string to save space
3. **JSON Storage**: Parsed data stored as JSON for flexibility
4. **Indexes**: Strategic indexes on query-heavy columns
5. **Cascading Deletes**: Clean up related data automatically

### Query Patterns

```typescript
// Drizzle ORM provides type-safe queries
import { eq, and, gte, lte } from 'drizzle-orm';

// Get reports for a domain in date range
const results = await db
  .select()
  .from(reports)
  .where(
    and(
      eq(reports.domain, 'example.com'),
      gte(reports.dateBegin, startDate),
      lte(reports.dateEnd, endDate)
    )
  )
  .orderBy(reports.dateBegin);

// Type-safe! TypeScript knows the shape of results
results.forEach(report => {
  console.log(report.filename); // ✅ Type-safe
  console.log(report.invalid);  // ❌ TypeScript error
});
```

---

## Type System

### Type Hierarchy

```
DmarcReport (union type)
├── RuaReport (Aggregate)
│   ├── ReportMetadata
│   ├── PolicyPublished
│   └── RuaRecord[]
│       ├── Row
│       ├── Identifiers
│       └── AuthResults
└── RufReport (Forensic)
    ├── RufReportMetadata
    ├── RufPolicyPublished
    └── RufRecord
        └── ...
```

### Type Guarantees

1. **Readonly**: All domain types are immutable
2. **Exhaustiveness**: Union types checked exhaustively
3. **Branded Types**: Prevent mixing similar primitives
4. **Strict Null Checks**: No undefined/null surprises

### Example Type Safety

```typescript
// Type guard for report type
export const isRuaReport = (
  report: DmarcReport
): report is RuaReport => {
  return 'records' in report && Array.isArray(report.records);
};

// Exhaustive checking
function processReport(report: DmarcReport) {
  if (isRuaReport(report)) {
    // TypeScript knows report is RuaReport
    return processRuaReport(report);
  } else {
    // TypeScript knows report is RufReport
    return processRufReport(report);
  }
  // ✅ No other cases possible
}
```

---

## Module Organization

### Feature-Based Structure

```
src/
├── features/              # Feature modules (vertical slices)
│   ├── import/           # File import feature
│   │   ├── components/   # Import UI components
│   │   ├── hooks/        # useFileImport, useDragDrop
│   │   └── utils/        # File validation utilities
│   ├── parser/           # XML parsing feature
│   │   ├── rua-parser.ts # Pure parsing functions
│   │   ├── validators.ts # Zod schemas
│   │   └── __tests__/    # Parser tests
│   ├── analysis/         # Data analysis feature
│   │   ├── services/     # Pure analysis functions
│   │   ├── components/   # Dashboard, charts
│   │   └── hooks/        # useReportAnalysis
│   └── ...
├── shared/               # Shared utilities (horizontal)
│   ├── types/           # Type definitions
│   └── utils/           # Generic utilities
└── components/          # Shared UI components
    └── ui/              # Design system components
```

### Dependency Rules

1. **Features** can depend on **shared**
2. **Features** should NOT depend on other features
3. **Shared** should NOT depend on features
4. **Components** can depend on shared types only

---

## Performance Considerations

### Optimization Strategies

1. **Virtual Scrolling**: For large tables (react-window)
2. **Code Splitting**: Lazy load heavy features
3. **Memoization**: Cache expensive computations
4. **Worker Threads**: Offload heavy parsing to workers
5. **Database Indexes**: Fast queries on large datasets
6. **React Query**: Intelligent caching and deduplication

### Targets

- Import speed: 1000+ records/second
- Dashboard load: <500ms with 10,000 records
- Memory usage: <500MB with large datasets
- Bundle size: <150MB distributable

---

## Testing Strategy

### Test Pyramid

```
        /\
       /E2E\          Few, critical user flows
      /──────\
     /  Integ  \      Feature integration tests
    /──────────\
   / Unit Tests \    Many, fast, isolated tests
  /──────────────\
```

### Unit Tests (Vitest)

**What to Test:**
- Pure functions (parsers, analyzers)
- Utility functions
- State management logic

**Coverage Targets:**
- Parsers: 100%
- Analysis services: 95%
- Utilities: 90%

### Integration Tests

**What to Test:**
- Database operations
- IPC communication
- Parser → Storage flow

### E2E Tests (Playwright)

**What to Test:**
- File import flow
- Dashboard rendering
- Issue detection
- Export functionality

---

## Deployment Architecture

### Build Process

```
Source Code
    ↓
TypeScript Compilation
    ↓
Vite Bundle (Renderer)
    ↓
Electron Builder
    ↓
Code Signing
    ↓
Notarization (macOS)
    ↓
DMG Installer
```

### Auto-Update Flow

```
App Launch
    ↓
Check for Updates (GitHub Releases)
    ↓
Download Update (Background)
    ↓
Verify Signature
    ↓
Notify User
    ↓
Install on Restart
```

---

## Future Considerations

### Scalability

- **Worker Threads**: For parsing very large files
- **Streaming**: For files >100MB
- **Pagination**: For very large result sets
- **Incremental Analysis**: Process reports incrementally

### Extensibility

- **Plugin System**: Allow custom analyzers
- **Export Formats**: Additional export options
- **API Integration**: Connect to DNS providers
- **Multi-Platform**: Windows, Linux support

---

## References

- [Electron Security Guidelines](https://www.electronjs.org/docs/latest/tutorial/security)
- [Functional Programming Patterns](https://mostly-adequate.gitbook.io/mostly-adequate-guide/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [DMARC Specification (RFC 7489)](https://datatracker.ietf.org/doc/html/rfc7489)
