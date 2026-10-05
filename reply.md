Created `AGENTS.md` at the repo root with:

- **Toolchain**: pnpm 10.34.0 (via corepack), Node ≥24 (CI uses 24.16.0), VS Code ^1.90.0
- **Setup commands**: `corepack prepare pnpm@10.34.0 --activate`, `pnpm install --frozen-lockfile`
- **All scripts** from `package.json`: build, lint, typecheck, test:unit, test:unit:coverage, test:integration, test:perf, test:mutation, format, format:check, audit:ci, check:ci
- **Full CI gate** (`check:ci`) expanded with every step matching `package.json` and `.github/workflows/ci.yml`
- **CI matrix**: ubuntu-24.04 (with xvfb-run, mutation tests, VSIX validation), windows-2025-vs2026, macos-15
- **Security gates**: audit:ci (high-severity), check:licenses, check:workspace-trust
- **Fleet rule**: Never push to bot branches (two open Dependabot branches noted)

File passes `pnpm run format:check` (Prettier).