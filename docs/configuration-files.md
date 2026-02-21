# Configuration Files Documentation

This document explains all configuration files added to the txtcode project.

## Table of Contents

- [Security](#security)
- [Code Quality](#code-quality)
- [Git Configuration](#git-configuration)
- [CI/CD](#cicd)

---

## Security

### `.detect-secrets.cfg`

**Purpose:** Configuration for detect-secrets tool that scans for accidentally committed secrets (API keys, passwords, tokens).

**What it does:**

- Defines file patterns to exclude from scanning (node_modules, dist, package-lock.json)
- Defines line patterns to ignore (false positives like "apiKey" field names)

**Usage:**

```bash
# Scan for secrets
python -m detect_secrets scan --baseline .secrets.baseline

# Review findings interactively
python -m detect_secrets audit .secrets.baseline
```

**Why we need it:** Prevents accidentally committing real API keys or credentials to the repository.

---

### `.secrets.baseline`

**Purpose:** Baseline file that stores known false positives from secret scanning.

**What it contains:**

- List of detected "secrets" that have been reviewed and marked as safe
- Currently contains 4 false positives from `models-catalog.json` (field names like "apiKeyEnv")

**Why we need it:** Prevents the same false positives from triggering alerts on every scan.

---

## Code Quality

### `.oxfmtrc.jsonc`

**Purpose:** Configuration for oxfmt - a fast code formatter (like Prettier but written in Rust).

**Settings:**

- `experimentalSortImports`: Automatically sorts import statements alphabetically
- `experimentalSortPackageJson`: Sorts scripts in package.json
- `ignorePatterns`: Skips dist/, node_modules/, package-lock.json

**Usage:**

```bash
# Format all files
npm run format

# Check if files are formatted (CI)
npm run format:check
```

**Why we need it:** Ensures consistent code formatting across all contributors without manual effort.

---

### `.oxlintrc.json`

**Purpose:** Configuration for oxlint - a fast linter (like ESLint but 50-100x faster, written in Rust).

**Settings:**

- Enabled plugins: unicorn (best practices), typescript, oxc
- Error categories: correctness, perf, suspicious
- Strict rules: no `any` types, requires curly braces
- Flexible rules: allows await in loops, variable shadowing

**Usage:**

```bash
# Check for issues
npm run lint

# Auto-fix issues
npm run lint:fix
```

**Why we need it:** Catches bugs, enforces code quality, and prevents performance issues automatically.

---

## Git Configuration

### `.gitattributes`

**Purpose:** Tells Git how to handle line endings across different operating systems.

**Setting:**

```
* text=auto eol=lf
```

**What it does:**

- Forces all text files to use LF (Unix-style) line endings in the repository
- On checkout: Converts to your OS's line endings (CRLF on Windows, LF on Mac/Linux)
- On commit: Converts everything to LF before storing

**Why we need it:** Prevents mixed line endings that cause messy diffs and script failures. Essential for cross-platform development.

---

## CI/CD

### `.github/workflows/security.yml`

**Purpose:** GitHub Actions workflow that runs security scanning on every push/PR.

**What it does:**

- Installs Python and detect-secrets
- Scans codebase for secrets
- Fails the build if new secrets are detected

**When it runs:** On push to main/master or on pull requests

---

### `.github/workflows/ci.yml`

**Purpose:** GitHub Actions workflow for continuous integration checks.

**Jobs:**

1. **Lint** - Runs oxlint to check code quality
2. **Format** - Checks if code is properly formatted with oxfmt
3. **Build** - Compiles TypeScript to ensure no build errors

**When it runs:** On push to main/master or on pull requests

**Why we need it:** Ensures all code meets quality standards before merging.

---

## Summary

All these files work together to:

- **Prevent security issues** (detect-secrets)
- **Maintain code quality** (oxlint)
- **Ensure consistent formatting** (oxfmt)
- **Support cross-platform development** (.gitattributes)
- **Automate checks in CI/CD** (GitHub Actions)

This setup ensures txtcode maintains high code quality and security standards with minimal manual effort.

## Package Manager

### `.npmrc`

**Purpose:** Configuration for npm that controls package installation behavior.

**Setting:**
```
allow-build-scripts=@whiskeysockets/baileys,sharp,protobufjs
```

**What it does:**
- Explicitly allows only these specific packages to run build scripts during installation
- Blocks all other packages from running scripts (security feature)

**Allowed packages:**
- `@whiskeysockets/baileys` - WhatsApp library (compiles native dependencies)
- `sharp` - Image processing (compiles native C++ code)
- `protobufjs` - Protocol buffers (generates code)

**Why we need it:** Security protection against supply chain attacks. Prevents malicious packages from running arbitrary code during installation.

---

## Requirements

### Node.js Version

**Minimum:** Node.js 20.0.0 or higher

**Why:** Several core dependencies require Node.js 20+:
- `@whiskeysockets/baileys` - WhatsApp library
- `oxfmt`, `oxlint` - Code formatting and linting tools
- `file-type`, `p-queue`, and other utilities

**Specified in:**
- `package.json` - `engines` field
- `.github/workflows/ci.yml` - CI uses Node 20
- `.github/workflows/security.yml` - Security scans use Node 20

**To upgrade Node.js:**
- Using nvm: `nvm install 20 && nvm use 20`
- Using official installer: Download from [nodejs.org](https://nodejs.org/)
- Using package manager: `brew install node@20` (macOS) or similar

---
