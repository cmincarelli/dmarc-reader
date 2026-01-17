# Quick Reference

Quick reference for common development tasks in DMARC Reader.

## Table of Contents

- [Commands](#commands)
- [Project Structure](#project-structure)
- [Common Patterns](#common-patterns)
- [Type Imports](#type-imports)
- [Testing](#testing)
- [Debugging](#debugging)

---

## Commands

### Development
```bash
pnpm electron:dev          # Run app in dev mode
pnpm dev                   # Run Vite dev server only
pnpm preview               # Preview production build
```

### Testing
```bash
pnpm test                  # Unit tests (watch)
pnpm test:ci               # Unit tests (once)
pnpm test:e2e              # E2E tests
pnpm test:coverage         # Coverage report
```

### Code Quality
```bash
pnpm lint                  # Check for issues
pnpm lint:fix              # Fix issues
pnpm format                # Format code
pnpm type-check            # TypeScript check
```

### Building
```bash
pnpm build:mac             # Build for macOS
pnpm build:universal       # Universal binary
```

### Maintenance
```bash
pnpm download-geodata      # Download GeoIP database
pnpm outdated              # Check for updates
pnpm update                # Update dependencies
```

---

## Project Structure

```
electron/                   # Main process
  ├── handlers/            # IPC handlers
  ├── utils/               # Utilities (database, etc.)
  ├── main.ts              # Entry point
  └── preload.ts           # IPC bridge

src/                       # Renderer process
  ├── features/            # Feature modules
  │   ├── parser/          # XML parsing
  │   ├── analysis/        # Data analysis
  │   ├── import/          # File import
  │   └── ...
  ├── shared/
  │   ├── types/           # Type definitions ⭐
  │   └── utils/           # Utilities
  ├── components/
  │   └── ui/              # Design system
  ├── hooks/               # Custom hooks
  ├── store/               # Zustand stores
  └── App.tsx              # Root component

tests/
  ├── e2e/                 # Playwright tests
  ├── fixtures/            # Test data
  └── helpers/             # Test utilities
```

---

## Common Patterns

### Creating a Pure Function

```typescript
// src/features/analysis/services/aggregation.ts
import type { RuaRecord, PassRateMetrics } from '@shared/types';

/**
 * Calculate authentication pass rates
 * @pure
 */
export const calculatePassRates = (
  records: readonly RuaRecord[]
): PassRateMetrics => {
  if (records.length === 0) {
    return { overall: 0, spf: 0, dkim: 0, dmarc: 0 };
  }

  const spfPass = records.filter(r =>
    r.authResults.spf.some(s => s.result === 'pass')
  ).length;

  const dkimPass = records.filter(r =>
    r.authResults.dkim.some(d => d.result === 'pass')
  ).length;

  return {
    overall: ((spfPass + dkimPass) / (records.length * 2)) * 100,
    spf: (spfPass / records.length) * 100,
    dkim: (dkimPass / records.length) * 100,
    dmarc: 0, // TODO: Calculate DMARC alignment
  };
};
```

### Using Either Type

```typescript
import { Either, left, right, isRight } from '@shared/types';

// Function that can fail
export const parseRuaXml = (
  xml: string
): Either<ParseError, RuaReport> => {
  try {
    const result = parser.parse(xml);
    const validated = RuaSchema.parse(result);
    return right(validated);
  } catch (error) {
    return left({
      code: 'PARSE_ERROR',
      message: error.message,
    });
  }
};

// Using the result
const result = parseRuaXml(xmlString);
if (isRight(result)) {
  const report = result.right; // RuaReport
  // Success path
} else {
  const error = result.left; // ParseError
  // Error path
}
```

### Creating an IPC Handler

```typescript
// electron/handlers/file-import.ts
import { ipcMain } from 'electron';
import type { ImportResult } from '../preload';

export function registerFileHandlers() {
  ipcMain.handle('file:import', async (event, filePath: string) => {
    try {
      // 1. Validate
      if (!filePath.endsWith('.xml')) {
        throw new Error('Invalid file type');
      }

      // 2. Process
      const content = await readFile(filePath, 'utf-8');
      const parsed = parseRuaXml(content);

      if (isLeft(parsed)) {
        throw new Error(parsed.left.message);
      }

      // 3. Store
      const reportId = await storeReport(parsed.right);

      // 4. Return
      return {
        success: true,
        reportId,
      } as ImportResult;
    } catch (error) {
      return {
        success: false,
        error: error.message,
      } as ImportResult;
    }
  });
}
```

### Creating a React Component

```typescript
// src/features/analysis/components/PassRateCard.tsx
import React from 'react';
import type { PassRateMetrics } from '@shared/types';

interface PassRateCardProps {
  readonly metrics: PassRateMetrics;
}

export const PassRateCard: React.FC<PassRateCardProps> = ({ metrics }) => {
  const getColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-card rounded-lg border p-6">
      <h3 className="text-lg font-semibold mb-4">Pass Rate</h3>
      <div className={`text-4xl font-bold ${getColor(metrics.overall)}`}>
        {metrics.overall.toFixed(1)}%
      </div>
      <div className="mt-4 space-y-2 text-sm">
        <div>SPF: {metrics.spf.toFixed(1)}%</div>
        <div>DKIM: {metrics.dkim.toFixed(1)}%</div>
      </div>
    </div>
  );
};
```

### Creating a Custom Hook

```typescript
// src/features/analysis/hooks/useReportAnalysis.ts
import { useQuery } from '@tanstack/react-query';
import type { AnalysisSummary } from '@shared/types';

export const useReportAnalysis = (reportId: string) => {
  return useQuery({
    queryKey: ['analysis', reportId],
    queryFn: async (): Promise<AnalysisSummary> => {
      return window.electronAPI.analyzeReport(reportId);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Usage in component
const { data, isLoading, error } = useReportAnalysis(reportId);
```

### Creating a Zustand Store

```typescript
// src/store/filters.ts
import { create } from 'zustand';
import type { AnalysisFilters } from '@shared/types';

interface FilterState {
  filters: AnalysisFilters;
  setDateRange: (start: Date, end: Date) => void;
  setDomain: (domain: string) => void;
  clearFilters: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  filters: {},

  setDateRange: (start, end) =>
    set((state) => ({
      filters: {
        ...state.filters,
        dateRange: { start, end },
      },
    })),

  setDomain: (domain) =>
    set((state) => ({
      filters: {
        ...state.filters,
        domain: [domain],
      },
    })),

  clearFilters: () => set({ filters: {} }),
}));
```

---

## Type Imports

### Common Imports

```typescript
// DMARC types
import type {
  RuaReport,
  RufReport,
  RuaRecord,
  AuthResult,
  Disposition,
  ReportType,
} from '@shared/types';

// Analysis types
import type {
  AnalysisSummary,
  PassRateMetrics,
  Issue,
  Recommendation,
  TrendData,
} from '@shared/types';

// Database types
import type {
  ReportRow,
  RecordRow,
  NewReport,
  ReportSummary,
} from '@shared/types';

// Either type
import {
  Either,
  left,
  right,
  isLeft,
  isRight,
} from '@shared/types';
```

### Electron API Types

```typescript
// In renderer process
import type { ElectronAPI } from '../electron/preload';

// Window has electronAPI
const reports = await window.electronAPI.getReports();
```

---

## Testing

### Unit Test Template

```typescript
// src/features/parser/__tests__/rua-parser.test.ts
import { describe, it, expect } from 'vitest';
import { parseRuaXml } from '../rua-parser';
import { isRight, isLeft } from '@shared/types';

describe('parseRuaXml', () => {
  it('should parse valid XML', () => {
    const xml = '<feedback>...</feedback>';
    const result = parseRuaXml(xml);

    expect(isRight(result)).toBe(true);
    if (isRight(result)) {
      expect(result.right.records).toHaveLength(10);
    }
  });

  it('should handle invalid XML', () => {
    const result = parseRuaXml('<invalid>');

    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) {
      expect(result.left.code).toBe('PARSE_ERROR');
    }
  });
});
```

### Component Test Template

```typescript
// src/features/analysis/components/__tests__/PassRateCard.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PassRateCard } from '../PassRateCard';

describe('PassRateCard', () => {
  it('should render pass rate', () => {
    const metrics = {
      overall: 95.5,
      spf: 96.0,
      dkim: 95.0,
      dmarc: 95.5,
    };

    render(<PassRateCard metrics={metrics} />);

    expect(screen.getByText('95.5%')).toBeInTheDocument();
    expect(screen.getByText('SPF: 96.0%')).toBeInTheDocument();
  });

  it('should show red color for low pass rate', () => {
    const metrics = {
      overall: 50.0,
      spf: 50.0,
      dkim: 50.0,
      dmarc: 50.0,
    };

    const { container } = render(<PassRateCard metrics={metrics} />);

    expect(container.querySelector('.text-red-600')).toBeInTheDocument();
  });
});
```

### E2E Test Template

```typescript
// tests/e2e/import-flow.spec.ts
import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';

test('should import DMARC report', async () => {
  const app = await electron.launch({ args: ['.'] });
  const window = await app.firstWindow();

  // Click import button
  await window.click('[data-testid="import-button"]');

  // Select file
  const [fileChooser] = await Promise.all([
    window.waitForEvent('filechooser'),
    window.click('[data-testid="select-file"]'),
  ]);
  await fileChooser.setFiles('tests/fixtures/sample-rua.xml');

  // Wait for success
  await window.waitForSelector('[data-testid="import-success"]');

  // Verify report appears
  const reportCount = await window.locator('[data-testid="report-item"]').count();
  expect(reportCount).toBeGreaterThan(0);

  await app.close();
});
```

---

## Debugging

### Renderer Process

```typescript
// Use DevTools (opens automatically in dev mode)
console.log('Debug info:', data);

// Or use React DevTools extension
```

### Main Process

```typescript
// Add console.log in main process
console.log('Main process:', data);

// Logs appear in terminal where you ran pnpm electron:dev
```

### Database

```bash
# Open database in SQLite browser
open ~/Library/Application\ Support/dmarc-reader/dmarc-reader.db

# Or use SQL queries
# Add to electron/utils/database.ts
const result = db.prepare('SELECT * FROM reports').all();
console.log(result);
```

### IPC Communication

```typescript
// Renderer: Log before IPC call
console.log('Calling IPC:', 'file:import', filePath);
const result = await window.electronAPI.importFile(filePath);
console.log('IPC result:', result);

// Main: Log in handler
ipcMain.handle('file:import', async (event, filePath) => {
  console.log('Received IPC call:', filePath);
  // ...
});
```

---

## Helpful Aliases

Add to your `~/.zshrc` or `~/.bashrc`:

```bash
alias dr-dev='pnpm electron:dev'
alias dr-test='pnpm test'
alias dr-lint='pnpm lint:fix'
alias dr-check='pnpm type-check && pnpm lint && pnpm test:ci'
```

---

## Performance Tips

### Virtual Scrolling
```typescript
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={records.length}
  itemSize={50}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>{records[index].sourceIp}</div>
  )}
</FixedSizeList>
```

### Memoization
```typescript
const memoizedValue = useMemo(
  () => calculateExpensiveThing(data),
  [data]
);

const MemoizedComponent = React.memo(MyComponent);
```

### Code Splitting
```typescript
const Dashboard = lazy(() => import('./Dashboard'));

<Suspense fallback={<Loading />}>
  <Dashboard />
</Suspense>
```

---

## Common Issues

### "Cannot find module"
```bash
# Clear node_modules and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### TypeScript errors after adding types
```bash
# Restart TypeScript server in VS Code
Cmd+Shift+P → "TypeScript: Restart TS Server"
```

### Tests failing with "window.electronAPI is undefined"
```typescript
// Make sure tests/setup.ts is imported
// It mocks the electronAPI
```

---

**Last Updated:** January 2026
