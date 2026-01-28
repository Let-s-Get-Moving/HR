# Security Dependencies Policy

This document outlines the dependency security policy for the HR application.

## Audit Policy

1. **CI/CD Check**: The build process runs `npm audit --audit-level=high` and fails on high/critical vulnerabilities.
2. **Monthly Review**: Dependencies should be reviewed monthly using `npm audit` in all workspaces.
3. **Update Cadence**: Non-breaking security updates should be applied within 7 days. Breaking changes require testing and can take up to 30 days.

## Running Security Audits

```bash
# Check all workspaces
npm audit                        # Root
cd api && npm audit              # API
cd web && npm audit              # Web

# Fix automatically where safe
npm audit fix

# See detailed report
npm audit --json
```

## Current Known Issues

### xlsx (SheetJS Community Edition) - HIGH

**Status**: No fix available in the open-source version.

**Vulnerabilities**:
- GHSA-4r6h-8v6p-xvw6: Prototype Pollution
- GHSA-5pgg-2g8v-p4x9: ReDoS (Regular Expression Denial of Service)

**Impact**: This library is used for parsing Excel files (commissions, timecards, employee imports). The vulnerabilities could allow:
- Malicious Excel files to pollute JavaScript prototypes
- DoS attacks via crafted filenames/content

**Mitigations Applied**:
1. Input validation on file uploads (size limits, type checking)
2. Server-side parsing in isolated context
3. Rate limiting on upload endpoints
4. Admin-only access for most import features

**Recommendation**: Consider migrating to `exceljs` or using the paid SheetJS Pro version which has security fixes.

### esbuild (via vite) - MODERATE

**Status**: Dev dependency only. Does not affect production.

**Vulnerability**: GHSA-67mh-4wv8-2f99 - Dev server can be accessed by any website.

**Impact**: Only affects local development. The production build does not include esbuild.

**Mitigation**: Development should be done on trusted networks.

## Dependency Update Process

1. Check for updates:
   ```bash
   npm outdated
   ```

2. Update a specific package:
   ```bash
   npm update <package>
   ```

3. For breaking changes, update package.json manually and test:
   ```bash
   npm install <package>@latest
   npm test
   ```

4. After updates, verify no regressions:
   ```bash
   npm audit
   npm test
   ```

## Using Overrides

For transitive dependency vulnerabilities, use `overrides` in package.json:

```json
{
  "overrides": {
    "vulnerable-package": "^fixed.version"
  }
}
```

## Contact

Report security issues to the development team immediately. Do not create public issues for security vulnerabilities.
