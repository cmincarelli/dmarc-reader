# Documentation Index

Welcome to the DMARC Reader documentation! This index will help you find the information you need.

## Quick Links

- **[README](../README.md)** - Project overview and quick start
- **[FEATURES](FEATURES.md)** - Complete feature list and product vision
- **[ARCHITECTURE](../ARCHITECTURE.md)** - System architecture and design decisions
- **[TECHNOLOGY](../TECHNOLOGY.md)** - Technology stack and rationale
- **[ROADMAP](../ROADMAP.md)** - Development plan and timeline
- **[CONTRIBUTING](../CONTRIBUTING.md)** - How to contribute to the project

---

## For New Users

👋 **Just getting started?** Read these in order:

1. **[README.md](../README.md)** - Overview, installation, basic usage
2. **[FEATURES.md](FEATURES.md)** - What the app can do
3. **User Guide** (coming in Phase 4) - Detailed usage instructions

---

## For Developers

💻 **Want to contribute?** Read these:

1. **[CONTRIBUTING.md](../CONTRIBUTING.md)** - Development setup and guidelines
2. **[ARCHITECTURE.md](../ARCHITECTURE.md)** - How the system works
3. **[TECHNOLOGY.md](../TECHNOLOGY.md)** - Why we chose each technology
4. **[ROADMAP.md](../ROADMAP.md)** - What's being built and when

### Development Workflow

```bash
# 1. Set up your environment
git clone <repo>
pnpm install
pnpm approve-builds

# 2. Make your changes
git checkout -b feature/your-feature
# ... code, test, commit ...

# 3. Ensure quality
pnpm lint
pnpm type-check
pnpm test:ci

# 4. Submit PR
git push origin feature/your-feature
# Create pull request on GitHub
```

**Need help?** See [CONTRIBUTING.md](../CONTRIBUTING.md) for detailed guidelines.

---

## For Architects

🏗️ **Want to understand the system design?**

1. **[ARCHITECTURE.md](../ARCHITECTURE.md)** - Complete architecture documentation
   - High-level overview
   - Electron architecture
   - Security model
   - Data flow
   - Functional programming patterns
   - Database design

2. **[TECHNOLOGY.md](../TECHNOLOGY.md)** - Technology decisions
   - Why Electron?
   - Why React?
   - Why TypeScript?
   - All technology choices explained

---

## For Product Managers

📋 **Planning features?**

1. **[FEATURES.md](FEATURES.md)** - Complete feature specifications
   - MVP features (v1.0)
   - Post-MVP features (v1.1+)
   - Long-term vision
   - Success metrics

2. **[ROADMAP.md](../ROADMAP.md)** - Development timeline
   - Phase 1: Foundation ✅ **COMPLETE**
   - Phase 2: Parsing & Import (next)
   - Phase 3: Analysis Engine
   - Phase 4: User Interface
   - Phase 5: Polish & Distribution

---

## Project Status

### Current Phase: **Documentation Complete** ✅

**Completed:**
- ✅ Project setup and tooling
- ✅ TypeScript configuration
- ✅ Electron infrastructure
- ✅ Database schema
- ✅ Testing framework
- ✅ Type definitions
- ✅ Comprehensive documentation

**Next Phase: Core Parsing & Import**

See [ROADMAP.md](../ROADMAP.md) for detailed status.

---

## Documentation Structure

```
dmarc-reader/
├── README.md                    # Project overview
├── ARCHITECTURE.md              # System architecture
├── TECHNOLOGY.md                # Technology choices
├── ROADMAP.md                   # Development plan
├── CONTRIBUTING.md              # Contributor guide
└── docs/
    ├── INDEX.md                 # This file
    ├── FEATURES.md              # Feature specifications
    └── (future docs...)
```

---

## Key Concepts

### DMARC Reports

**RUA (Aggregate Reports):**
- Most common type
- Statistical data about email authentication
- Sent daily by major providers (Google, Microsoft, etc.)
- XML format with report metadata and records

**RUF (Forensic Reports):**
- Less common
- Detailed failure information
- Includes message samples
- Variable XML structure

### Email Authentication

**SPF (Sender Policy Framework):**
- DNS record listing authorized sending servers
- Validates envelope-from domain

**DKIM (DomainKeys Identified Mail):**
- Cryptographic signature on emails
- Validates header-from domain

**DMARC (Domain-based Message Authentication, Reporting & Conformance):**
- Policy for SPF and DKIM
- Alignment requirement (domain matching)
- Instructs receivers what to do with failures

### Architecture Patterns

**Functional Programming:**
- Pure functions (no side effects)
- Immutable data structures
- Function composition
- Type safety

**Electron Architecture:**
- Main process (Node.js backend)
- Renderer process (React frontend)
- IPC bridge (secure communication)
- Context isolation (security)

---

## Frequently Asked Questions

### General

**Q: What is DMARC Reader?**
A: A desktop app that analyzes DMARC reports and provides actionable insights to improve email authentication.

**Q: Who is it for?**
A: Small business IT admins and email security professionals managing email authentication.

**Q: Is it free?**
A: Yes, it's free and open source (MIT license).

**Q: What platforms are supported?**
A: Currently macOS. Windows and Linux support planned for future.

### Technical

**Q: Why Electron?**
A: Cross-platform desktop apps with web technologies, mature ecosystem, good security model. See [TECHNOLOGY.md](../TECHNOLOGY.md).

**Q: Why functional programming?**
A: Better testability, fewer bugs, easier to reason about. See [ARCHITECTURE.md](../ARCHITECTURE.md).

**Q: Where is data stored?**
A: Locally in SQLite database. No cloud sync by default.

**Q: Is it secure?**
A: Yes. Follows Electron security best practices, sandboxing, no external network calls required. See [ARCHITECTURE.md](../ARCHITECTURE.md).

### Development

**Q: How do I set up the dev environment?**
A: See [CONTRIBUTING.md](../CONTRIBUTING.md) for detailed setup instructions.

**Q: What's the testing strategy?**
A: Unit tests (Vitest), integration tests, E2E tests (Playwright). Target: 85%+ coverage. See [CONTRIBUTING.md](../CONTRIBUTING.md).

**Q: How do I submit a PR?**
A: See the Pull Request Process section in [CONTRIBUTING.md](../CONTRIBUTING.md).

---

## Resources

### Internal Documentation
- [README.md](../README.md) - Getting started
- [FEATURES.md](FEATURES.md) - Feature specifications
- [ARCHITECTURE.md](../ARCHITECTURE.md) - Architecture deep-dive
- [TECHNOLOGY.md](../TECHNOLOGY.md) - Technology decisions
- [ROADMAP.md](../ROADMAP.md) - Development timeline
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Contribution guidelines

### External Resources
- [DMARC Specification (RFC 7489)](https://datatracker.ietf.org/doc/html/rfc7489)
- [Electron Security Guidelines](https://www.electronjs.org/docs/latest/tutorial/security)
- [Functional Programming Guide](https://mostly-adequate.gitbook.io/mostly-adequate-guide/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

### Tools
- [DMARC.org](https://dmarc.org/) - DMARC information
- [MXToolbox DMARC Analyzer](https://mxtoolbox.com/dmarc.aspx) - Online DMARC checker
- [Google Postmaster Tools](https://postmaster.google.com/) - Email sending stats

---

## Getting Help

### Found a Bug?
1. Check [existing issues](https://github.com/your-repo/issues)
2. Create a new issue with:
   - Clear description
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable
   - System info (OS, app version)

### Have a Question?
1. Check this documentation
2. Search existing issues
3. Create a new issue with "question" label

### Want to Contribute?
1. Read [CONTRIBUTING.md](../CONTRIBUTING.md)
2. Find or create an issue to work on
3. Submit a pull request

---

## Version History

**v0.1.0** (Current) - Foundation Phase ✅
- Project setup complete
- Architecture established
- Documentation complete
- Ready for Phase 2

See [ROADMAP.md](../ROADMAP.md) for future versions.

---

## License

DMARC Reader is licensed under the MIT License. See LICENSE file for details.

---

**Last Updated:** January 2026
**Documentation Version:** 1.0
**Project Phase:** 1 Complete, Phase 2 Next
