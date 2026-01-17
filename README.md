# DMARC Reader

<div align="center">
  <img src="build/icons/512x512.png" alt="DMARC Reader Logo" width="128" height="128">

  **A powerful desktop application for analyzing DMARC reports with actionable insights**

  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
  [![Electron](https://img.shields.io/badge/Electron-28.3-47848F)](https://www.electronjs.org/)
  [![React](https://img.shields.io/badge/React-18.2-61DAFB)](https://reactjs.org/)

  [Download](#-download) • [Features](#-features) • [Screenshots](#-screenshots) • [Documentation](#-documentation) • [Contributing](#-contributing)
</div>

---

## 📖 Overview

DMARC Reader is a native desktop application that makes analyzing DMARC (Domain-based Message Authentication, Reporting & Conformance) reports simple and insightful. Import XML reports from email providers, visualize authentication results, detect security issues, and monitor your domain's email security posture—all from a clean, modern interface.

### Why DMARC Reader?

- **🔒 Privacy First**: All data stays local on your machine—no cloud services, no data sharing
- **⚡ Fast & Efficient**: Built with Electron and SQLite for instant report processing
- **📊 Visual Insights**: Interactive charts, maps, and health scores at a glance
- **🌓 Beautiful UI**: Native dark mode support with a polished interface
- **🔍 Smart Detection**: Automatic issue detection with severity analysis
- **🤖 Automation**: Auto-import reports from a folder with archive/delete options

---

## ✨ Features

### 📥 Import & Processing
- **Drag & drop** or file picker import for DMARC XML reports
- **Auto-import** from designated folder with file watching
- **Archive extraction** support for `.zip`, `.tar.gz`, and `.gzip` files
- **Duplicate detection** prevents re-importing the same reports
- **Post-import actions**: Keep, archive, or delete imported files automatically

### 📊 Analysis & Visualization
- **Health scores** calculated from authentication pass rates (0-100 scale)
- **Interactive charts** showing SPF/DKIM alignment trends over time
- **Geographic maps** displaying email source locations with MaxMind GeoIP
- **Source analysis** with IP addresses, reverse DNS, and volume metrics
- **Domain filtering** to focus on specific domains or reporters
- **Time-series trends** to track authentication performance

### 🔔 Issue Detection
- Automatic detection of authentication failures and anomalies
- **7 detection types**: SPF failures, DKIM failures, mixed results, policy issues, volume anomalies, new sources, and geographic anomalies
- Severity classification (Critical, High, Medium, Low)
- Affected record counts and email volumes
- Detailed issue descriptions and remediation guidance

### 🎯 Recommendations
- Actionable DNS configuration suggestions
- **Copy-to-clipboard** DNS records ready to paste
- SPF record optimization
- DKIM selector recommendations
- DMARC policy improvement guidance

### 🎨 User Experience
- **Native look & feel** with macOS integration
- **Dark mode** support throughout the entire application
- **System tray/menubar** icon with quick stats and recent reports
- **Application menu** with keyboard shortcuts (Cmd+O to import, Cmd+1/2/3 to navigate)
- **Persistent storage** with SQLite database
- **Settings management** for theme, auto-import, and notifications

---

## 💾 Download

### Latest Release

> **Coming Soon**: Pre-built binaries will be available once the first release is published. Watch this repo or check [Releases](https://github.com/cmincarelli/dmarc-reader/releases) for updates.

**macOS**
- Universal Binary (Apple Silicon & Intel)
  - [DMARC-Reader-universal.dmg](https://github.com/cmincarelli/dmarc-reader/releases/latest/download/DMARC-Reader-universal.dmg)

**Windows** (Planned)
- [DMARC-Reader-Setup.exe](https://github.com/cmincarelli/dmarc-reader/releases/latest/download/DMARC-Reader-Setup.exe)

**Linux** (Planned)
- [DMARC-Reader.AppImage](https://github.com/cmincarelli/dmarc-reader/releases/latest/download/DMARC-Reader.AppImage)
- [DMARC-Reader.deb](https://github.com/cmincarelli/dmarc-reader/releases/latest/download/DMARC-Reader.deb)

### System Requirements

- **macOS**: macOS 10.15 (Catalina) or later
- **Windows**: Windows 10 or later (coming soon)
- **Linux**: Ubuntu 18.04+, Fedora 30+, or equivalent (coming soon)
- **Memory**: 512 MB RAM minimum, 1 GB recommended
- **Disk Space**: 200 MB for application + database storage

---

## 📸 Screenshots

> **Coming soon**: Screenshots will be added to showcase the application interface and features.

<!--
### Dashboard View
![Dashboard showing authentication trends and health scores](screenshots/dashboard.png)

### Reports List
![List of imported DMARC reports with filtering](screenshots/reports.png)

### Issue Detection
![Automatic issue detection with severity indicators](screenshots/issues.png)

### Geographic Map
![World map showing email source locations](screenshots/map.png)

### Settings Panel
![Application settings with dark mode support](screenshots/settings.png)
-->

---

## 📚 Documentation

### Getting Started

1. **Download and Install**
   - Download the appropriate installer for your platform
   - On macOS: Open the `.dmg` file and drag DMARC Reader to Applications
   - Launch the app from your Applications folder

2. **Import Your First Report**
   - Click "Import Report" button or use File → Import (Cmd+O)
   - Select a DMARC XML report file from your email provider
   - Or drag and drop XML files directly into the app window
   - The report will be automatically parsed and stored locally

3. **View Analysis**
   - Navigate to the **Dashboard** to see detailed analysis
   - View health scores, authentication trends, and top email sources
   - Check the **Issues** tab to see detected problems
   - Review **Recommendations** for DNS configuration improvements

4. **Configure Auto-Import** (Optional)
   - Go to Settings → Auto Import
   - Enable "Auto Import" and select a folder to watch
   - Choose post-import action: Keep, Archive, or Delete files
   - New reports dropped in the folder will be imported automatically

### Understanding DMARC Reports

DMARC reports come in two types:

- **RUA (Aggregate Reports)**: Summary data showing authentication results across all emails
  - Most common type from email providers
  - Contains statistics, pass/fail counts, and source IPs
  - Used for trend analysis and issue detection

- **RUF (Forensic Reports)**: Individual failure samples with message headers
  - Less common due to privacy concerns
  - Contains specific authentication failure details
  - Used for debugging specific issues

DMARC Reader focuses primarily on **RUA reports** for comprehensive analysis and trending.

### Health Scores

Health scores are calculated based on SPF and DMARC alignment percentages:

- **90-100** (Excellent): ≥95% pass rate — Your email authentication is strong
- **70-89** (Good): 80-95% pass rate — Minor issues exist but manageable
- **0-69** (Issues): <80% pass rate — Significant authentication problems detected

The health score uses a weighted algorithm that emphasizes high pass rates:
```
if passRate >= 95%: healthScore = 90 + (passRate - 95)
if passRate >= 80%: healthScore = 70 + ((passRate - 80) / 15) * 20
if passRate < 80%: healthScore = (passRate / 80) * 70
```

### Issue Severity Levels

- **Critical**: Immediate action required (e.g., complete authentication failure)
- **High**: Significant problems affecting many emails
- **Medium**: Noticeable issues requiring attention
- **Low**: Minor concerns or informational findings

---

## 🛠️ Development

### Tech Stack

**Frontend**
- [React 18](https://react.dev/) with TypeScript
- [TailwindCSS](https://tailwindcss.com/) for styling
- [Recharts](https://recharts.org/) for data visualization
- [MapLibre GL](https://maplibre.org/) for geographic maps
- [TanStack Query](https://tanstack.com/query) for data management
- [Zustand](https://zustand-demo.pmnd.rs/) for state management

**Backend (Electron Main Process)**
- [Electron 28](https://www.electronjs.org/)
- [SQLite](https://www.sqlite.org/) with [Drizzle ORM](https://orm.drizzle.team/)
- [Fast XML Parser](https://github.com/NaturalIntelligence/fast-xml-parser) for DMARC reports
- [Chokidar](https://github.com/paulmillr/chokidar) for file watching
- [MaxMind GeoIP2](https://www.maxmind.com/) for IP geolocation
- [Zod](https://zod.dev/) for runtime schema validation

**Build Tools**
- [Vite](https://vitejs.dev/) for fast development
- [TypeScript 5](https://www.typescriptlang.org/) for type safety
- [Electron Builder](https://www.electron.build/) for packaging
- [Vitest](https://vitest.dev/) for unit testing
- [Playwright](https://playwright.dev/) for E2E testing

### Prerequisites

- Node.js 18+
- pnpm package manager
- For building: macOS (Windows/Linux builds coming soon)

### Installation & Setup

```bash
# Clone the repository
git clone https://github.com/cmincarelli/dmarc-reader.git
cd Dmarc_Reader

# Install dependencies
pnpm install

# Download GeoIP database (optional but recommended for geographic features)
pnpm run download-geodata

# Run in development mode
pnpm run electron:dev
```

### Development Commands

```bash
# Development
pnpm run dev              # Start Vite dev server only
pnpm run electron:dev     # Run full Electron app in dev mode

# Building
pnpm run build            # Build for production (all platforms)
pnpm run build:mac        # Build for macOS (current architecture)
pnpm run build:universal  # Build Universal macOS binary (Intel + Apple Silicon)
pnpm run build:renderer   # Build React frontend only
pnpm run build:electron   # Build Electron main process only

# Testing
pnpm run test             # Run unit tests in watch mode
pnpm run test:ci          # Run unit tests once (CI mode)
pnpm run test:coverage    # Generate test coverage report
pnpm run test:e2e         # Run E2E tests with Playwright

# Code Quality
pnpm run lint             # Lint code with ESLint
pnpm run lint:fix         # Auto-fix lint issues
pnpm run format           # Format code with Prettier
pnpm run type-check       # TypeScript type checking (no emit)
```

### Project Structure

```
dmarc-reader/
├── electron/                 # Electron main process
│   ├── handlers/            # IPC handlers (file-import, database, analysis, settings)
│   ├── services/            # Business logic (report storage, auto-import, issue detection)
│   ├── utils/               # Utilities (database, menu, tray)
│   ├── main.ts              # Main process entry point
│   └── preload.mts          # Preload script for IPC bridge
├── src/                     # React renderer process
│   ├── features/            # Feature modules
│   │   ├── home/           # Home view with quick stats
│   │   ├── reports/        # Reports list view
│   │   ├── analysis/       # Dashboard and visualizations
│   │   ├── issues/         # Issue detection and display
│   │   ├── import/         # File import UI
│   │   ├── parser/         # XML parsing logic (RUA/RUF)
│   │   └── settings/       # Settings UI
│   ├── shared/              # Shared components, types, and utilities
│   │   ├── components/     # Reusable UI components
│   │   ├── types/          # TypeScript type definitions
│   │   └── utils/          # Helper functions
│   ├── App.tsx              # Main application component
│   └── main.tsx             # React entry point
├── build/                   # Build resources
│   └── icons/              # Application icons
├── assets/                  # Static assets
│   └── geo-data/           # MaxMind GeoIP database (downloaded separately)
├── tests/                   # Test files
│   ├── e2e/                # End-to-end tests
│   └── fixtures/           # Test data and fixtures
└── dist/                    # Build output (gitignored)
```

### Architecture & Security

**Security Model**
- Context Isolation enabled (`contextIsolation: true`)
- Node integration disabled in renderer (`nodeIntegration: false`)
- Sandboxing disabled for ESM preload scripts (`sandbox: false`)
- Typed IPC bridge via preload script
- No external navigation allowed
- Input validation with Zod schemas

**Data Flow**
1. **Import**: User selects file → Main process validates → Reads XML
2. **Parse**: Fast XML Parser → Zod validation → Typed data
3. **Store**: Compress with LZ-String → Save to SQLite
4. **Analyze**: Query from database → Pure functions → Compute metrics
5. **Display**: React Query cache → React components → User interface

**Testing Strategy**
- Unit tests for parsers, analyzers, and utilities (Vitest)
- Component tests for React UI (Testing Library)
- E2E tests for critical user flows (Playwright)
- Coverage target: 80%+ for business logic

---

## 🤝 Contributing

Contributions are welcome! Whether it's bug reports, feature requests, or code contributions, all help is appreciated.

### How to Contribute

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
   - Write tests for new features
   - Follow the existing code style
   - Run linting and type checks
4. **Commit your changes**
   ```bash
   git commit -m 'feat: add amazing feature'
   ```
   Use [Conventional Commits](https://www.conventionalcommits.org/) format
5. **Push to your branch**
   ```bash
   git push origin feature/amazing-feature
   ```
6. **Open a Pull Request**

### Development Guidelines

- **TypeScript**: Use strict mode, add types for all functions
- **Code Style**: ESLint + Prettier (configured in the project)
- **Commits**: Follow Conventional Commits (feat:, fix:, docs:, etc.)
- **Tests**: Add tests for new features and bug fixes
- **Documentation**: Update README and code comments as needed

### Code of Conduct

Be respectful, inclusive, and constructive in all interactions.

---

## 🗺️ Roadmap

### Current Version (v0.1.0)
- ✅ macOS application with native UI
- ✅ Import and parse DMARC RUA/RUF reports
- ✅ Visual dashboards with charts and maps
- ✅ Automatic issue detection
- ✅ Health score calculation
- ✅ Auto-import with file watching
- ✅ Dark mode support
- ✅ System tray/menubar integration

### Upcoming Features
- [ ] Windows and Linux builds
- [ ] Multi-domain report aggregation
- [ ] Custom date range filtering
- [ ] Export reports to PDF/CSV
- [ ] Email sending configuration validator
- [ ] DMARC policy recommendations wizard
- [ ] Notification center for critical issues
- [ ] Historical trend comparison
- [ ] Integration with email service providers (Gmail, Office 365)
- [ ] Scheduled report summaries

---

## 🔒 Security

### Security Best Practices

This application follows security best practices:

- **Local-First**: All data stored locally in SQLite (no cloud sync)
- **No Network Requests**: Except optional MaxMind GeoIP lookups (local database file)
- **Context Isolation**: Renderer and main processes properly isolated
- **Input Validation**: All XML input validated with Zod schemas
- **No Remote Code Execution**: All code bundled with the application
- **File System Access**: Limited to user-selected files and app data directory

### Reporting Security Issues

If you discover a security vulnerability, please email **YOUR_EMAIL_HERE** instead of using the public issue tracker. Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

Security issues will be addressed promptly.

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **[MaxMind](https://www.maxmind.com/)** for GeoIP2 database and geolocation services
- **[Lucide](https://lucide.dev/)** for beautiful, consistent icons
- **[Electron](https://www.electronjs.org/)**, **[React](https://react.dev/)**, and the entire open-source community
- All contributors who help improve this project

---

## 💬 Support

Need help? Have questions?

- 📖 **[Documentation](https://github.com/cmincarelli/dmarc-reader/wiki)** - Detailed guides and FAQs
- 🐛 **[Issue Tracker](https://github.com/cmincarelli/dmarc-reader/issues)** - Report bugs or request features
- 💬 **[Discussions](https://github.com/cmincarelli/dmarc-reader/discussions)** - Ask questions and share ideas

---

<div align="center">
  Made with ❤️ by Chris M

  **⭐ If you find this project useful, please consider starring it on GitHub!**

  [Star this repo](https://github.com/cmincarelli/dmarc-reader) • [Follow for updates](https://github.com/YOUR_USERNAME)
</div>
