## Security Remediation Summary

### Issue

Resolve 4 code scanning security findings for oaslananka/toon-tools-vsx:

1. **BranchProtectionID: Branch-Protection** - GitHub repository setting (out of scope)
2. **MaintainedID: Maintained** - GitHub repository setting/project activity (out of scope)
3. **CodeReviewID: Code-Review** - GitHub repository setting (out of scope)
4. **VulnerabilitiesID: Vulnerabilities** - Dependency vulnerabilities ✅ **FIXED**

### Changes Made

#### package.json

Updated `pnpm.overrides` to force patched versions of all vulnerable transitive dependencies:

- `fast-uri`: 3.1.2 → ^3.1.7 (fixed multiple high-severity DoS/SSRF vulnerabilities)
- `undici`: ^7.28.0 → ^7.29.1 (fixed high-severity DoS/TLS bypass vulnerabilities)
- `qs`: ^6.15.2 → ^6.16.0 (fixed moderate-severity DoS vulnerabilities)
- Added overrides for 10 additional packages with known vulnerabilities:
  - `tar`: ^7.5.21 (fixed critical/high DoS vulnerabilities)
  - `js-yaml`: ^4.3.2 (fixed high-severity CPU exhaustion)
  - `nanoid`: ^3.3.18 (fixed high-severity infinite loop)
  - `postcss`: ^8.5.18 (fixed high-severity path traversal)
  - `browserslist`: ^4.28.7 (fixed high-severity OOM/crash)
  - `ip-address`: ^10.3.1 (fixed high-severity SSRF)
  - `basic-ftp`: ^6.2.1 (fixed high-severity quadratic CPU DoS)
  - `brace-expansion`: ^5.0.11 (fixed high-severity stack exhaustion)
  - `source-map-js`: ^1.2.2 (fixed high-severity event-loop DoS)
  - `markdown-it`: ^14.2.0 (fixed moderate-severity quadratic DoS)

Updated devDependencies:

- `vitest`: 4.1.8 → 4.1.11 (fixed moderate-severity path traversal)
- `@vitest/coverage-v8`: 4.1.8 → 4.1.11 (matched vitest version)

#### pnpm-lock.yaml

Regenerated lockfile with all patched dependency versions.

### Verification

All repository-native checks pass:

- ✅ `pnpm run lint` - ESLint passes
- ✅ `pnpm run typecheck` - TypeScript compiles without errors
- ✅ `pnpm run test:unit` - 159 unit tests pass
- ✅ `pnpm run build` - Webpack production build succeeds
- ✅ `pnpm run format:check` - Prettier formatting verified
- ✅ `pnpm run check:workspace-trust` - Workspace trust metadata verified
- ✅ `pnpm run test:unit:coverage` - Coverage maintained (96.64% statements)
- ✅ `pnpm run test:perf` - Parser performance within baseline
- ✅ `pnpm run compile-tests` - Test compilation succeeds
- ✅ `pnpm run package` - VSIX packaging succeeds
- ✅ `pnpm run check:bundle-size` - Bundle size within 5.9% of baseline

Environment-limited checks (not related to code changes):

- ⚠️ `pnpm run test:integration` - Requires X server (headless environment limitation)
- ⚠️ `pnpm run check:licenses` / `check:package-contents` - pnpm binary compatibility issue with Node 24

### Audit Results

**Before (Round 1):** 69 vulnerabilities (1 critical, 34 high, 30 moderate, 4 low)
**After Round 1:** 2 vulnerabilities (1 high, 1 low) - both in `braces@3.0.3` (transitive from `@vscode/vsce`), **no patched version available upstream**

The remaining `braces` vulnerability (GHSA-vfj7-8cjw-p6xm) has "Patched versions: <0.0.0" indicating no fix exists. This requires an upstream update to `@vscode/vsce` or its dependency chain.

**Round 2 Fix:** Eliminated the remaining `braces@3.0.3` HIGH vulnerability by upgrading the dependency chain:

- `@vscode/vsce`: 3.9.2 → 4.0.0 (switches from `secretlint`+`globby`+`fast-glob`+`micromatch`+`braces` to `@secretlint/*`+`tinyglobby`+`fdir`+`picomatch`)
- `ts-loader`: 9.6.0 → 9.6.2 (switches from `micromatch` to `picomatch`)
- Added pnpm override for `@vscode/vsce` to force `ovsx` to use the fixed version

**After Round 2:** 1 vulnerability (1 low) - no HIGH or CRITICAL vulnerabilities remain

### Compliance

- ✅ Resolved VulnerabilitiesID finding with actual dependency fixes
- ✅ No scanner suppression or severity threshold lowering
- ✅ Preserved repository behavior and all passing tests
- ✅ Changes bounded to security work and required lockfile updates
- ✅ No changes to branch protection, security settings, required checks, or admission policy
