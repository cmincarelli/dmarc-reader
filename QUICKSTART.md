# DMARC Reader - Quick Start Guide

Get up and running with DMARC Reader in 5 minutes.

---

## Prerequisites

- **Node.js 18+** (with pnpm package manager)
- **macOS** (for building and running the Electron app)

---

## Installation

### 1. Install Dependencies

```bash
pnpm install
```

This will install all required packages including:
- Electron 28+
- React 18+
- TypeScript 5+
- Vite, Tailwind CSS, Recharts, and more

### 2. Approve Build Scripts

Some packages (better-sqlite3, electron) require native compilation:

```bash
pnpm approve-builds
```

When prompted, select:
- `better-sqlite3`
- `electron`
- `esbuild`

Press Enter to approve each one.

---

## Running the Application

### Development Mode

Start the application with hot module reloading:

```bash
pnpm electron:dev
```

This will:
1. Start the Vite dev server on `http://localhost:5173`
2. Launch the Electron window
3. Enable DevTools automatically
4. Watch for file changes and reload

**Note:** The first run may take 10-15 seconds while Vite bundles the application.

---

## Using the Application

### 1. Import Your First Report

1. Click the **"Import Report"** button in the header (or navigate to Home)
2. Select a DMARC XML report file (RUA or RUF format)
3. Wait for the parser to validate and store the report
4. The report will appear in your Reports list

**Where to get DMARC reports:**
- Google Workspace: Check your domain admin email
- Microsoft 365: Reports are sent to configured RUA address
- Other providers: Check your DMARC record's `rua` tag

### 2. View Report List

1. Click **"Reports"** in the sidebar
2. See all imported reports in a grid layout
3. Each card shows:
   - Report type (RUA/RUF)
   - Domain name
   - Organization name
   - Date range
   - Total emails (if available)

### 3. Analyze a Report

1. Click any report card from the Reports view
2. You'll be taken to the **Dashboard** view
3. The dashboard shows:
   - **Overview Cards**: Total emails, pass rate, health score, issues
   - **Authentication Chart**: SPF, DKIM, and overall pass/fail rates
   - **Top Sources Table**: Email sources with authentication results
   - **Issues List**: Detected problems with severity indicators
   - **Recommendations**: DNS records and action items

### 4. Copy DNS Records

1. Scroll to the **Recommendations** section
2. Find recommendations with DNS records
3. Click the **copy icon** next to any DNS record
4. Paste into your DNS management interface

---

## Testing Your Setup

### Run Unit Tests

Verify parsers and core functions work correctly:

```bash
pnpm test:ci
```

Expected output: `39 tests passed`

### Type Check

Ensure no TypeScript errors:

```bash
pnpm type-check
```

Expected output: No errors

### Build for Production

Test the production build:

```bash
pnpm run build:electron
pnpm run build:renderer
```

Both should complete without errors.

---

## Troubleshooting

### "Cannot find module 'better-sqlite3'"

**Solution:** Run `pnpm approve-builds` and approve `better-sqlite3`.

### "Electron failed to install correctly"

**Solution:**
```bash
pnpm approve-builds
# Approve electron
pnpm rebuild electron
```

### Application window doesn't open

**Solution:**
1. Check that no other instance is running
2. Try killing the process: `pkill -f electron`
3. Restart: `pnpm electron:dev`

### Import button doesn't work

**Solution:**
1. Check DevTools console for errors (Cmd+Opt+I)
2. Verify the IPC handlers are registered
3. Try restarting the application

### Parser fails on my XML file

**Solution:**
1. Verify it's a valid DMARC report XML file
2. Check the console for specific validation errors
3. The parser supports Google, Microsoft, and standard formats
4. If needed, file an issue with a sample (anonymized) report

---

## Development Commands

### Essential Commands

```bash
# Start development server
pnpm electron:dev

# Run tests
pnpm test

# Type checking
pnpm type-check

# Lint code
pnpm lint

# Format code
pnpm format
```

### Build Commands

```bash
# Build Electron main process
pnpm run build:electron

# Build React renderer
pnpm run build:renderer

# Build macOS app
pnpm run build:mac

# Build universal binary (Intel + Apple Silicon)
pnpm run build:universal
```

### Test Commands

```bash
# Unit tests (watch mode)
pnpm test

# Unit tests (CI mode)
pnpm test:ci

# Test coverage report
pnpm test:coverage
```

---

## Project Structure Overview

```
dmarc-reader/
├── electron/                    # Electron main process
│   ├── main.ts                 # Entry point
│   ├── preload.ts              # IPC bridge
│   ├── handlers/               # IPC handlers
│   │   ├── file-import.ts      # File operations
│   │   ├── database.ts         # Database queries
│   │   └── analysis.ts         # Analysis operations
│   └── utils/
│       └── database.ts         # Database setup
│
├── src/                        # React renderer process
│   ├── App.tsx                 # Root component
│   ├── main.tsx                # React entry point
│   ├── features/               # Feature modules
│   │   ├── home/              # Home view
│   │   ├── reports/           # Reports list
│   │   ├── analysis/          # Dashboard & analysis
│   │   │   ├── components/   # UI components
│   │   │   ├── hooks/        # React hooks
│   │   │   └── services/     # Pure functions
│   │   ├── parser/            # XML parsing
│   │   └── import/            # File import UI
│   ├── components/
│   │   ├── layout/            # Layout components
│   │   └── ErrorBoundary.tsx  # Error handling
│   ├── store/                  # Zustand stores
│   │   ├── ui.ts              # UI state
│   │   ├── reports.ts         # Reports cache
│   │   └── filters.ts         # Filters
│   └── shared/
│       └── types/              # TypeScript types
│
└── tests/
    ├── fixtures/               # Test data
    └── e2e/                    # E2E tests (coming soon)
```

---

## Sample DMARC Report

If you don't have a DMARC report handy, you can find test fixtures in:
```
tests/fixtures/rua/sample-rua-simple.xml
tests/fixtures/rua/sample-rua-complex.xml
```

These are anonymized sample reports you can import to test the application.

---

## Next Steps

1. **Import real reports** from your email provider
2. **Review the dashboard** to understand your email authentication status
3. **Check issues** for any problems detected
4. **Follow recommendations** to improve your DMARC configuration
5. **Monitor regularly** by importing new reports

---

## Getting Help

### Documentation

- **README.md** - Complete project overview
- **ROADMAP.md** - Development plan and status
- **STATUS.md** - Current capabilities and achievements
- **ARCHITECTURE.md** - Technical architecture details
- **TECHNOLOGY.md** - Technology choices and rationale

### Common Use Cases

**Q: How do I find my DMARC reports?**
A: Check your domain's DNS for a DMARC record with `rua=mailto:youraddress`. Reports are sent to that email.

**Q: Can I import multiple reports?**
A: Yes! Import as many as you want. Each is stored separately and can be analyzed individually.

**Q: What does the health score mean?**
A: It's a 0-100 score based on authentication pass rates and detected issues. 90+ is excellent, 70-90 is good, below 70 needs attention.

**Q: How do I fix the issues?**
A: Check the Recommendations section for each issue. Copy the suggested DNS records and add them to your domain's DNS configuration.

**Q: Where is the data stored?**
A: In a local SQLite database at `~/.dmarc-reader/database.db`. No data leaves your machine.

---

## Support

For issues, bugs, or feature requests:
- Check existing documentation first
- Review the console for error messages
- File an issue on GitHub with details

---

**Happy analyzing! 🎉**
