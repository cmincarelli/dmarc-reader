# Contributing to DMARC Reader

Thank you for your interest in contributing to DMARC Reader! This document provides guidelines and workflows for development.

## Table of Contents

- [Development Setup](#development-setup)
- [Code Style & Standards](#code-style--standards)
- [Functional Programming Guidelines](#functional-programming-guidelines)
- [Git Workflow](#git-workflow)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [Project Structure](#project-structure)
- [Common Tasks](#common-tasks)

---

## Development Setup

### Prerequisites

- **Node.js 18+** with pnpm
- **macOS** (for building/running the Electron app)
- **Git** for version control
- **Visual Studio Code** (recommended) with extensions:
  - ESLint
  - Prettier
  - TypeScript and JavaScript Language Features

### Initial Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd Dmarc_Reader
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Approve build scripts:**
   ```bash
   pnpm approve-builds
   # Select: better-sqlite3, electron, esbuild
   ```

4. **Verify setup:**
   ```bash
   # Type check
   pnpm type-check

   # Run tests
   pnpm test

   # Start development server
   pnpm electron:dev
   ```

### Development Commands

```bash
# Development
pnpm electron:dev        # Run app in development mode

# Testing
pnpm test               # Unit tests (watch mode)
pnpm test:ci            # Unit tests (single run)
pnpm test:e2e           # E2E tests with Playwright
pnpm test:coverage      # Generate coverage report

# Code Quality
pnpm lint               # Lint code with ESLint
pnpm lint:fix           # Fix linting issues
pnpm format             # Format code with Prettier
pnpm type-check         # TypeScript type checking

# Building
pnpm build:mac          # Build for macOS (current arch)
pnpm build:universal    # Universal binary (Intel + Apple Silicon)

# Maintenance
pnpm download-geodata   # Download latest GeoIP database
```

---

## Code Style & Standards

### TypeScript

- **Strict mode enabled:** All type errors must be resolved
- **Explicit return types:** For exported functions
- **Avoid `any`:** Use `unknown` if type is truly unknown, or define proper types
- **Prefer readonly:** Mark types as readonly by default

**Example:**

```typescript
// ✅ Good
export const calculatePassRate = (
  records: readonly RuaRecord[]
): number => {
  // Implementation
};

// ❌ Bad
export const calculatePassRate = (records: any) => {
  // Implementation
};
```

### Naming Conventions

- **Files:** kebab-case (e.g., `rua-parser.ts`, `use-file-import.ts`)
- **Components:** PascalCase (e.g., `Dashboard.tsx`, `ImportButton.tsx`)
- **Functions:** camelCase (e.g., `parseRuaXml`, `calculatePassRate`)
- **Constants:** SCREAMING_SNAKE_CASE (e.g., `MAX_FILE_SIZE`)
- **Types/Interfaces:** PascalCase (e.g., `RuaReport`, `AnalysisSummary`)

### File Organization

```typescript
// Order of imports
// 1. External libraries
import React from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. Internal absolute imports
import type { RuaReport } from '@shared/types';
import { parseRuaXml } from '@features/parser/rua-parser';

// 3. Relative imports
import { Button } from '../ui/Button';
import './styles.css';

// Order within file
// 1. Type definitions
// 2. Constants
// 3. Helper functions
// 4. Main exported functions/components
// 5. Default export (if applicable)
```

### Code Formatting

We use **Prettier** for automatic formatting. Configuration:

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

**Auto-format on save:**
- VS Code: Enable "Format On Save" in settings
- Or run `pnpm format` before committing

---

## Functional Programming Guidelines

DMARC Reader follows functional programming principles throughout the codebase.

### Core Principles

1. **Pure Functions**
   - No side effects (no mutations, no I/O)
   - Deterministic (same input = same output)
   - Easy to test and reason about

   ```typescript
   // ✅ Pure function
   export const calculatePassRate = (
     records: readonly RuaRecord[]
   ): number => {
     if (records.length === 0) return 0;
     const passed = records.filter(isPassing).length;
     return (passed / records.length) * 100;
   };

   // ❌ Impure - mutates input
   const addRecord = (records: RuaRecord[], record: RuaRecord) => {
     records.push(record); // Mutation!
     return records;
   };

   // ❌ Impure - side effect
   const saveReport = (report: RuaReport) => {
     database.insert(report); // Side effect!
     return report.id;
   };
   ```

2. **Immutability**
   - Never modify data structures
   - Use `readonly` in TypeScript
   - Use spread operator or Immer for updates

   ```typescript
   // ✅ Immutable update
   const nextState = {
     ...state,
     reports: [...state.reports, newReport],
   };

   // ✅ With Immer
   const nextState = produce(state, draft => {
     draft.reports.push(newReport);
   });

   // ❌ Mutable update
   state.reports.push(newReport);
   ```

3. **Function Composition**
   - Build complex operations from simple ones
   - Use pipe/compose for data transformations

   ```typescript
   // ✅ Composable pipeline
   const processReport = pipe(
     parseXml,
     validateSchema,
     enrichWithGeoData,
     detectIssues
   );

   // ❌ Imperative
   function processReport(xml: string) {
     const parsed = parseXml(xml);
     const validated = validateSchema(parsed);
     const enriched = enrichWithGeoData(validated);
     const issues = detectIssues(enriched);
     return issues;
   }
   ```

4. **Type Safety**
   - Leverage TypeScript's type system
   - Use branded types to prevent mixing similar primitives
   - Exhaustive checking with union types

   ```typescript
   // ✅ Type-safe error handling
   export const parseRuaXml = (
     xml: string
   ): Either<ParseError, RuaReport> => {
     try {
       const result = parser.parse(xml);
       return right(result);
     } catch (error) {
       return left({ code: 'PARSE_ERROR', message: error.message });
     }
   };

   // Usage
   const result = parseRuaXml(xmlString);
   if (isRight(result)) {
     // TypeScript knows result.right is RuaReport
     const report = result.right;
   } else {
     // TypeScript knows result.left is ParseError
     const error = result.left;
   }
   ```

### When to Allow Side Effects

Side effects are allowed ONLY in specific layers:

- **IPC Handlers** (electron/handlers/*): File I/O, database operations
- **React Components**: UI updates, event handlers
- **Main Process**: System integration, OS interactions

Keep side effects at the edges, business logic pure.

---

## Git Workflow

### Branch Strategy

```
main                 # Production-ready code (protected)
├── develop          # Integration branch
    ├── feature/feature-name     # New features
    ├── bugfix/bug-description   # Bug fixes
    └── docs/documentation       # Documentation updates
```

### Creating a Branch

```bash
# Create feature branch
git checkout develop
git pull origin develop
git checkout -b feature/rua-parser

# Create bugfix branch
git checkout -b bugfix/fix-spf-validation
```

### Commit Messages

We follow **Conventional Commits** specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Build process, dependencies, etc.
- `perf`: Performance improvements

**Examples:**

```bash
# Feature
git commit -m "feat(parser): add RUA XML parser with validation"

# Bug fix
git commit -m "fix(database): prevent duplicate report imports"

# Documentation
git commit -m "docs(readme): add installation instructions"

# With body
git commit -m "feat(analysis): implement issue detection

- Detect SPF failures
- Detect DKIM failures
- Detect alignment issues
- Generate severity levels

Closes #123"
```

### Commit Guidelines

- **Small, focused commits:** One logical change per commit
- **Atomic commits:** Each commit should work on its own
- **Clear messages:** Explain what and why, not how
- **Reference issues:** Use "Closes #123" or "Fixes #456"

---

## Testing Requirements

All code must include appropriate tests before merging.

### Unit Tests

**Required for:**
- All pure functions
- Parsers (100% coverage)
- Analysis services (95% coverage)
- Utility functions (90% coverage)

**Location:** Co-located with source in `__tests__/` directories

```typescript
// src/features/parser/__tests__/rua-parser.test.ts
import { describe, it, expect } from 'vitest';
import { parseRuaXml } from '../rua-parser';

describe('parseRuaXml', () => {
  it('should parse valid RUA XML', () => {
    const xml = `<feedback>...</feedback>`;
    const result = parseRuaXml(xml);

    expect(isRight(result)).toBe(true);
    expect(result.right.records).toHaveLength(10);
  });

  it('should handle invalid XML', () => {
    const result = parseRuaXml('<invalid>');

    expect(isLeft(result)).toBe(true);
    expect(result.left.code).toBe('PARSE_ERROR');
  });
});
```

### Integration Tests

**Required for:**
- Database operations
- IPC communication
- End-to-end data flows

### E2E Tests

**Required for:**
- Critical user flows
- UI interactions
- File import/export

**Location:** `tests/e2e/`

```typescript
// tests/e2e/import-flow.spec.ts
import { test, expect } from '@playwright/test';

test('should import DMARC report', async ({ page }) => {
  // Test implementation
});
```

### Running Tests

```bash
# Run all unit tests (watch mode)
pnpm test

# Run specific test file
pnpm test rua-parser.test.ts

# Run tests with coverage
pnpm test:coverage

# Run E2E tests
pnpm test:e2e
```

### Coverage Requirements

- **Parsers:** 100% coverage (critical path)
- **Analysis services:** 95% coverage
- **Utilities:** 90% coverage
- **Components:** 80% coverage
- **Overall:** 85% coverage

---

## Pull Request Process

### Before Creating a PR

1. **Ensure all tests pass:**
   ```bash
   pnpm test:ci
   pnpm test:e2e
   ```

2. **Run linting:**
   ```bash
   pnpm lint:fix
   ```

3. **Type check:**
   ```bash
   pnpm type-check
   ```

4. **Update documentation** if needed

5. **Add tests** for new functionality

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing performed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Tests pass locally
- [ ] Documentation updated
- [ ] No new warnings

## Related Issues
Closes #123
```

### Review Process

1. **Self-review:** Review your own code first
2. **Automated checks:** CI must pass
3. **Code review:** At least one approval required
4. **Address feedback:** Make requested changes
5. **Merge:** Squash and merge to keep history clean

---

## Project Structure

### Directory Overview

```
dmarc-reader/
├── electron/              # Main process code
│   ├── handlers/         # IPC request handlers
│   ├── utils/            # Database, utilities
│   ├── main.ts           # Main process entry
│   └── preload.ts        # IPC bridge
│
├── src/                  # Renderer process code
│   ├── features/         # Feature modules
│   │   ├── parser/       # XML parsing
│   │   ├── analysis/     # Data analysis
│   │   ├── import/       # File import
│   │   └── ...
│   ├── shared/           # Shared code
│   │   ├── types/        # Type definitions
│   │   └── utils/        # Utilities
│   ├── components/       # UI components
│   │   └── ui/           # Design system
│   ├── hooks/            # Custom hooks
│   ├── store/            # State management
│   └── App.tsx           # Root component
│
├── tests/                # Test files
│   ├── e2e/             # E2E tests
│   ├── fixtures/        # Test data
│   └── helpers/         # Test utilities
│
└── docs/                # Documentation
```

### Feature Module Structure

Each feature follows this structure:

```
feature-name/
├── components/           # React components
│   ├── FeatureMain.tsx
│   └── FeatureDetail.tsx
├── hooks/               # Custom hooks
│   └── useFeature.ts
├── services/            # Pure business logic
│   └── feature-service.ts
├── utils/               # Feature-specific utilities
│   └── helpers.ts
└── __tests__/           # Tests
    └── feature-service.test.ts
```

---

## Common Tasks

### Adding a New Feature

1. **Create feature branch:**
   ```bash
   git checkout -b feature/feature-name
   ```

2. **Create feature directory:**
   ```bash
   mkdir -p src/features/feature-name/{components,hooks,services,__tests__}
   ```

3. **Implement:**
   - Start with types (`shared/types/`)
   - Write pure functions (`services/`)
   - Write tests (`__tests__/`)
   - Create UI components (`components/`)

4. **Test:**
   ```bash
   pnpm test feature-name
   pnpm test:e2e
   ```

5. **Create PR**

### Adding a New Dependency

1. **Install:**
   ```bash
   pnpm add package-name
   # or for dev dependency
   pnpm add -D package-name
   ```

2. **Document why:** Add note in TECHNOLOGY.md if it's a core dependency

3. **Verify bundle size:** Check impact on build

### Debugging

**Renderer Process:**
- DevTools open automatically in development
- Use React DevTools extension
- Use `console.log` (removed in production builds)

**Main Process:**
- VS Code debugger configuration in `.vscode/launch.json`
- Or use `console.log` in main process (appears in terminal)

**Database:**
- Use SQLite browser to inspect database
- Check logs in `~/Library/Application Support/dmarc-reader/`

### Updating Dependencies

```bash
# Check for updates
pnpm outdated

# Update all dependencies
pnpm update

# Update specific package
pnpm update package-name

# After updating, test thoroughly
pnpm test:ci
pnpm electron:dev
```

---

## Best Practices

### Security

- **Never commit secrets:** No API keys, passwords, etc.
- **Validate all inputs:** Use Zod for runtime validation
- **Sanitize file paths:** Prevent directory traversal
- **Follow Electron security guidelines:** No nodeIntegration, etc.

### Performance

- **Memoize expensive computations:** Use React.memo, useMemo
- **Virtual scrolling for large lists:** Use react-window
- **Lazy load heavy components:** Use React.lazy
- **Optimize database queries:** Use indexes, limit results

### Accessibility

- **Semantic HTML:** Use proper elements (`<button>`, `<nav>`, etc.)
- **Keyboard navigation:** All features accessible via keyboard
- **ARIA labels:** For screen readers
- **Color contrast:** Meet WCAG 2.1 AA standards

### Error Handling

- **Use Either type:** For pure functions
- **Try/catch in boundaries:** IPC handlers, React error boundaries
- **User-friendly messages:** Clear, actionable error messages
- **Log errors:** For debugging

---

## Questions?

If you have questions or need help:

1. Check existing documentation (README, ARCHITECTURE, etc.)
2. Search existing issues
3. Create a new issue with the "question" label
4. Reach out to maintainers

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
