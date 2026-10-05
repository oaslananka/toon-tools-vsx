# Agent Runtime Instructions

This file tells ephemeral workers how to set up, build, lint, type-check, and test this repository. It mirrors the exact toolchain and commands used by CI.

## Toolchain

- **Package manager**: pnpm 10.34.0 (enforced via `corepack`)
- **Node**: >=24.0.0 (CI uses 24.16.0; see `.node-version` / `.nvmrc`)
- **VS Code engine**: ^1.90.0 (see `package.json#engines.vscode`)

## Setup

```bash
corepack enable
corepack prepare pnpm@10.34.0 --activate
pnpm install --frozen-lockfile
```

## Commands

| Task                       | Command                       |
| -------------------------- | ----------------------------- |
| Build                      | `pnpm run build`              |
| Lint                       | `pnpm run lint`               |
| Type-check                 | `pnpm run typecheck`          |
| Unit tests                 | `pnpm run test:unit`          |
| Unit tests (coverage)      | `pnpm run test:unit:coverage` |
| Integration tests          | `pnpm run test:integration`   |
| Performance tests          | `pnpm run test:perf`          |
| Mutation tests             | `pnpm run test:mutation`      |
| Format (write)             | `pnpm run format`             |
| Format (check)             | `pnpm run format:check`       |
| Audit (high-severity gate) | `pnpm run audit:ci`           |
| Full CI gate               | `pnpm run check:ci`           |

### Full CI Gate (`check:ci`)

Runs the complete pipeline used in CI:

```bash
pnpm run audit:ci &&
pnpm run check:licenses &&
pnpm run format:check &&
pnpm run lint &&
pnpm run typecheck &&
pnpm run check:workspace-trust &&
pnpm run test:unit:coverage &&
pnpm run test:perf &&
pnpm run compile-tests &&
pnpm run test:integration &&
pnpm run build &&
pnpm run package &&
pnpm run check:package-contents &&
pnpm run check:bundle-size
```

## CI Matrix

GitHub Actions runs `check:ci` on three platforms (`.github/workflows/ci.yml`):

| OS      | Runner label          | Notes                                                                                                                                           |
| ------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Linux   | `ubuntu-24.04`        | Runs under `xvfb-run -a` for headless VS Code tests; also runs mutation tests (`test:mutation`) and validates VSIX contents (`vsce ls --tree`). |
| Windows | `windows-2025-vs2026` | Runs `check:ci` directly.                                                                                                                       |
| macOS   | `macos-15`            | Runs `check:ci` directly.                                                                                                                       |

## Security Gates

- **`audit:ci`**: `pnpm audit --audit-level high` — fails on any high-severity vulnerability.
- **`check:licenses`**: Verifies dependency license compatibility.
- **`check:workspace-trust`**: Ensures untrusted-workspace restrictions are respected.

## Fleet Rules

- **Never push to bot branches**: The repository has two open Dependabot branches. Do not push commits to branches owned by automation (Dependabot, Renovate, release-please, etc.). All changes must go through pull requests targeting `main`.

## Formatting

This file must pass `pnpm run format:check` (Prettier with the repo config: semi, single quotes, trailing commas ES5, print width 100, tab width 2).
