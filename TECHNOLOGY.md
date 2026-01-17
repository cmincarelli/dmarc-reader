# Technology Stack

This document explains the technology choices for DMARC Reader and the rationale behind each decision.

## Table of Contents

- [Core Framework](#core-framework)
- [State Management](#state-management)
- [Data Processing](#data-processing)
- [Data Storage](#data-storage)
- [Visualization](#visualization)
- [Geolocation & IP Intelligence](#geolocation--ip-intelligence)
- [Testing](#testing)
- [Build & Distribution](#build--distribution)
- [Development Tools](#development-tools)

---

## Core Framework

### Electron 28+

**What:** Framework for building cross-platform desktop apps with web technologies

**Why Electron:**
- ✅ Cross-platform (macOS, Windows, Linux)
- ✅ Mature ecosystem with extensive documentation
- ✅ Native OS integration (file dialogs, menus, notifications)
- ✅ Auto-update capabilities
- ✅ Strong security model when properly configured
- ✅ Large community and extensive plugins

**Alternatives Considered:**
- **Tauri**: Smaller bundle sizes but less mature, fewer examples for complex scenarios
- **Native Swift/SwiftUI**: macOS only, higher development cost
- **Electron Forge**: We chose electron-builder instead for better macOS support

**Version:** 28+ for latest security patches and features

---

### React 18+

**What:** UI library for building component-based interfaces

**Why React:**
- ✅ Mature ecosystem with extensive libraries
- ✅ Excellent TypeScript support
- ✅ Strong developer experience (DevTools, hot reload)
- ✅ Large talent pool and community
- ✅ Rich ecosystem for data visualization (Recharts, etc.)
- ✅ Proven track record in production apps

**Alternatives Considered:**
- **Vue 3**: Less TypeScript-first, smaller ecosystem
- **Svelte**: Less mature, fewer chart/visualization libraries
- **Solid.js**: Too new, smaller ecosystem

**Why React 18 Specifically:**
- Concurrent rendering for better performance
- Automatic batching for state updates
- Improved TypeScript types

---

### TypeScript 5+

**What:** Typed superset of JavaScript

**Why TypeScript:**
- ✅ **Critical for functional programming**: Strong type system enables pure functions
- ✅ Catch errors at compile time, not runtime
- ✅ Excellent IDE support (autocomplete, refactoring)
- ✅ Self-documenting code through types
- ✅ Enables fearless refactoring
- ✅ Better than PropTypes for React components

**Configuration:**
```json
{
  "strict": true,              // All strict checks enabled
  "noUnusedLocals": true,      // Catch unused variables
  "noUnusedParameters": true,  // Catch unused parameters
  "noFallthroughCasesInSwitch": true
}
```

**Why Strict Mode:**
- Prevents common bugs (null/undefined issues)
- Forces explicit handling of edge cases
- Makes refactoring safer

---

### Vite

**What:** Next-generation build tool

**Why Vite over Webpack:**
- ✅ **10-100x faster** dev server startup
- ✅ Lightning-fast HMR (Hot Module Replacement)
- ✅ Optimized production builds with Rollup
- ✅ Out-of-the-box TypeScript support
- ✅ Simple configuration
- ✅ Native ESM support

**Performance Impact:**
- Webpack: ~30s dev server startup, ~2s HMR
- Vite: ~1s dev server startup, ~100ms HMR

**Perfect for Electron:**
- Fast iteration during development
- Optimized bundles for production
- Easy to configure with electron-builder

---

## State Management

### Zustand

**What:** Lightweight state management library

**Why Zustand:**
- ✅ **Minimal boilerplate** (unlike Redux)
- ✅ **Functional approach** fits our FP style
- ✅ No Provider wrapper needed
- ✅ Built-in TypeScript support
- ✅ Tiny bundle size (~1KB)
- ✅ Easy to test (just functions)
- ✅ Supports middleware (persist, devtools)

**Example:**
```typescript
// Simple, functional state management
const useReportStore = create<ReportState>((set) => ({
  reports: [],
  addReport: (report) => set((state) => ({
    reports: [...state.reports, report]
  })),
}));
```

**Alternatives Considered:**
- **Redux**: Too much boilerplate, complex setup
- **MobX**: OOP-focused, not functional
- **Jotai/Recoil**: Atomic approach adds complexity for our use case
- **Context API**: Performance issues with frequent updates

---

### React Query (TanStack Query)

**What:** Data fetching and caching library

**Why React Query:**
- ✅ **Intelligent caching** reduces IPC calls
- ✅ Automatic background refetching
- ✅ Optimistic updates
- ✅ Request deduplication
- ✅ Built-in loading/error states
- ✅ DevTools for debugging

**Perfect for Electron:**
```typescript
// Automatically caches report data
const { data, isLoading } = useQuery({
  queryKey: ['report', reportId],
  queryFn: () => window.electronAPI.getReport(reportId),
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

**Benefits:**
- Reduces database queries through main process
- Better user experience (instant cached data)
- Automatic retry on failure
- Easy invalidation and refetching

---

## Data Processing

### fast-xml-parser

**What:** High-performance XML parser

**Why fast-xml-parser:**
- ✅ **10x faster** than xml2js
- ✅ Handles large files efficiently
- ✅ Flexible parsing options
- ✅ Supports attributes, CDATA, etc.
- ✅ TypeScript-friendly
- ✅ No dependencies

**Performance:**
- Parses 10MB XML in ~100ms (vs ~1s for xml2js)
- Critical for large DMARC reports

**Alternatives Considered:**
- **xml2js**: Too slow, callback-based API
- **DOMParser**: Browser-only, not suitable for large files
- **sax-js**: Streaming but complex API

---

### Zod

**What:** TypeScript-first schema validation

**Why Zod:**
- ✅ **Runtime type safety** for parsed XML
- ✅ Integrates perfectly with TypeScript
- ✅ Excellent error messages
- ✅ Composable schemas
- ✅ Parse AND transform in one step
- ✅ Tree-shakeable

**Example:**
```typescript
const RuaRecordSchema = z.object({
  row: z.object({
    source_ip: z.string().ip(),
    count: z.number().int().positive(),
  }),
});

// Parse and validate
const result = RuaRecordSchema.safeParse(xmlData);
if (result.success) {
  // TypeScript knows the exact shape
  const record = result.data;
}
```

**Why Not Alternatives:**
- **Yup**: Less TypeScript-friendly
- **Joi**: Not TypeScript-first
- **io-ts**: More complex API

---

### date-fns

**What:** Modern JavaScript date utility library

**Why date-fns:**
- ✅ **Functional approach** (pure functions)
- ✅ Tree-shakeable (import only what you need)
- ✅ Immutable (doesn't modify dates)
- ✅ Better TypeScript support than Moment.js
- ✅ Smaller bundle size
- ✅ Locale support

**vs. Moment.js:**
- Moment.js: Mutable, large bundle, deprecated
- date-fns: Immutable, tree-shakeable, actively maintained

---

### Immer

**What:** Library for immutable state updates

**Why Immer:**
- ✅ Write "mutable" code that produces immutable results
- ✅ Integrates with Zustand
- ✅ Prevents accidental mutations
- ✅ Better than manual spreading for deep updates

**Example:**
```typescript
// Without Immer (verbose, error-prone)
const nextState = {
  ...state,
  reports: state.reports.map(r =>
    r.id === id ? { ...r, resolved: true } : r
  ),
};

// With Immer (clear, safe)
const nextState = produce(state, draft => {
  const report = draft.reports.find(r => r.id === id);
  if (report) report.resolved = true;
});
```

---

## Data Storage

### better-sqlite3

**What:** Fastest SQLite3 library for Node.js

**Why better-sqlite3:**
- ✅ **Synchronous API** (simpler than async)
- ✅ **3-10x faster** than node-sqlite3
- ✅ Automatic statement caching
- ✅ Efficient prepared statements
- ✅ ACID transactions
- ✅ Works perfectly with Electron

**vs. node-sqlite3:**
- node-sqlite3: Async API, slower, callback-based
- better-sqlite3: Sync API, faster, easier to use

**Perfect for Desktop Apps:**
- No network latency concerns
- Simpler error handling (no async/await cascade)
- Better performance for local data

---

### Drizzle ORM

**What:** TypeScript ORM for SQL databases

**Why Drizzle:**
- ✅ **Full TypeScript inference** (best-in-class)
- ✅ Zero runtime overhead
- ✅ SQL-like syntax (easy to learn)
- ✅ Perfect for better-sqlite3
- ✅ Compile-time query validation
- ✅ Supports raw SQL when needed

**Example:**
```typescript
// Type-safe queries
const reports = await db
  .select()
  .from(reportsTable)
  .where(eq(reportsTable.domain, 'example.com'));

// TypeScript knows the exact shape of `reports`
```

**Alternatives Considered:**
- **Prisma**: Too heavy, slower, requires codegen
- **TypeORM**: Less TypeScript-friendly, complex
- **Kysely**: Good, but Drizzle has better DX
- **Raw SQL**: No type safety, error-prone

---

## Visualization

### Recharts

**What:** Composable charting library for React

**Why Recharts:**
- ✅ **React-first** (declarative, component-based)
- ✅ Responsive by default
- ✅ Good TypeScript support
- ✅ Extensive chart types
- ✅ Customizable and themeable
- ✅ Good documentation and examples

**Example:**
```tsx
<LineChart data={trendData}>
  <Line dataKey="passRate" stroke="#10b981" />
  <Line dataKey="failRate" stroke="#ef4444" />
  <XAxis dataKey="date" />
  <YAxis />
</LineChart>
```

**Alternatives Considered:**
- **Chart.js**: Imperative API, less React-friendly
- **Victory**: Good but heavier bundle
- **Nivo**: Beautiful but slower for large datasets
- **D3.js directly**: Too low-level for common charts

---

### react-map-gl + Mapbox GL

**What:** React wrapper for Mapbox GL JS

**Why Mapbox:**
- ✅ **Beautiful maps** out of the box
- ✅ Vector tiles (smaller, faster)
- ✅ Excellent performance with many markers
- ✅ Heatmap support for visualizing email sources
- ✅ Free tier sufficient for desktop app

**For Geolocation Visualization:**
- Show email source locations on a world map
- Heatmap for high-volume sources
- Cluster markers for better performance

**Alternatives Considered:**
- **Google Maps**: Requires API key, expensive
- **Leaflet**: Raster tiles, slower
- **OpenStreetMap**: Less polished

---

### D3.js (Selective Imports)

**What:** Low-level data visualization library

**Why D3 (Partially):**
- ✅ Use only specific modules (d3-scale, d3-array)
- ✅ Powerful data transformations
- ✅ Excellent for custom visualizations
- ✅ Tree-shakeable

**We Use:**
- `d3-scale`: For custom axis scaling
- `d3-array`: For data aggregations

**We Don't Use:**
- Full D3 rendering (too low-level)
- DOM manipulation (use React instead)

---

## Geolocation & IP Intelligence

### MaxMind GeoIP2

**What:** IP geolocation database

**Why MaxMind:**
- ✅ **Offline-first** (no API calls needed)
- ✅ Accurate geolocation data
- ✅ Includes ASN and organization data
- ✅ Free tier available (GeoLite2)
- ✅ Fast lookups (<1ms per IP)
- ✅ Monthly updates available

**Database Size:** ~60MB (included in app)

**Alternatives Considered:**
- **ipapi.com**: API-based, requires internet, rate limits
- **ip2location**: Less accurate, paid only
- **ipinfo.io**: API-based, expensive for volume

---

### ipaddr.js

**What:** IP address manipulation library

**Why ipaddr.js:**
- ✅ Parse and validate IP addresses
- ✅ IPv4 and IPv6 support
- ✅ CIDR range matching
- ✅ Small, focused library

---

## Testing

### Vitest

**What:** Vite-native unit testing framework

**Why Vitest:**
- ✅ **10x faster** than Jest
- ✅ Vite-native (same config, same transforms)
- ✅ Jest-compatible API (easy migration)
- ✅ Built-in TypeScript support
- ✅ Watch mode with HMR
- ✅ Coverage with v8 (faster than istanbul)

**Performance:**
- Jest: ~10s test startup, ~500ms per suite
- Vitest: ~1s startup, ~50ms per suite

---

### Testing Library (React)

**What:** Testing utilities for React components

**Why Testing Library:**
- ✅ **User-centric** testing approach
- ✅ Encourages accessible components
- ✅ Avoids implementation details
- ✅ Works great with Vitest
- ✅ Industry standard

**Philosophy:** "Test how users interact, not how code works"

---

### Playwright

**What:** End-to-end testing framework

**Why Playwright:**
- ✅ **Electron support** built-in
- ✅ Fast and reliable
- ✅ Cross-browser (when we expand)
- ✅ Auto-waiting (no flaky tests)
- ✅ Excellent debugging tools
- ✅ Video recording and screenshots

**vs. Cypress:**
- Playwright: Better Electron support, faster
- Cypress: No Electron support

---

### fast-check

**What:** Property-based testing library

**Why fast-check:**
- ✅ **Find edge cases** automatically
- ✅ Generates thousands of test cases
- ✅ Perfect for parser testing
- ✅ Shrinks failing cases to minimal examples

**Example:**
```typescript
// Tests calculatePassRate with thousands of inputs
fc.assert(
  fc.property(
    fc.array(fc.record({
      dkim: fc.constantFrom('pass', 'fail'),
      spf: fc.constantFrom('pass', 'fail'),
    })),
    (records) => {
      const rate = calculatePassRate(records);
      return rate >= 0 && rate <= 100;
    }
  )
);
```

---

## Build & Distribution

### electron-builder

**What:** Complete solution for packaging Electron apps

**Why electron-builder:**
- ✅ **Auto-update support** built-in
- ✅ Code signing for macOS/Windows
- ✅ DMG/PKG creation for macOS
- ✅ Notarization support
- ✅ Multi-platform builds
- ✅ Extensive configuration options

**vs. electron-forge:**
- electron-builder: Better macOS support, more features
- electron-forge: Simpler but less powerful

---

### electron-notarize

**What:** Notarization for macOS apps

**Why Needed:**
- ✅ Required for macOS Catalina+
- ✅ Prevents "App is damaged" errors
- ✅ Integrates with electron-builder

**Process:**
1. Code sign the app
2. Submit to Apple for notarization
3. Staple notarization ticket
4. Distribute

---

### electron-updater

**What:** Auto-update module for Electron

**Why electron-updater:**
- ✅ Works with electron-builder
- ✅ Supports differential updates
- ✅ Code signature verification
- ✅ Staged rollouts possible

---

## Development Tools

### ESLint

**What:** JavaScript/TypeScript linter

**Configuration:**
- TypeScript-specific rules
- React hooks rules
- Prettier integration (no conflicts)

---

### Prettier

**What:** Opinionated code formatter

**Why Prettier:**
- ✅ End formatting debates
- ✅ Consistent code style
- ✅ Auto-format on save
- ✅ Works with ESLint

---

### pnpm

**What:** Fast, disk-efficient package manager

**Why pnpm over npm:**
- ✅ **3x faster** installations
- ✅ Saves disk space (content-addressable store)
- ✅ Strict dependency resolution
- ✅ Better monorepo support (future-proof)

---

## Summary

Our technology choices prioritize:

1. **Developer Experience**: Fast builds, great TypeScript support, clear errors
2. **Performance**: Fast at dev time and runtime
3. **Type Safety**: Catch errors early, refactor fearlessly
4. **Functional Programming**: Pure functions, immutability, composition
5. **Security**: Best practices for Electron, input validation
6. **Maintainability**: Simple, well-documented, testable code

Every technology was chosen after evaluating alternatives and considering our specific needs for a desktop DMARC analysis application.
