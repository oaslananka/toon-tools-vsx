# Repository Policy Script Instructions

These instructions apply to `scripts/**` and supplement the root `AGENTS.md`.

This directory contains policy-as-code for package contents, workspace trust, publishing targets, release assets, bundle size, parser performance, dependency licensing, and repository rules.

## Policy integrity

- A checker must fail closed when required evidence/input is missing or malformed.
- Do not lower bundle/performance/coverage/security thresholds, broaden exclusions, or remove required package entries merely to make CI pass.
- If policy intentionally changes, update the owning docs/config, checker, and regression evidence together.
- Prefer extending the existing checker that owns a contract over creating a parallel implementation.

## Package and release scripts

- `check-package-contents.js` defines the intended VSIX surface; keep repository-only files excluded.
- `check-publish-targets.js` and release-asset validation must not treat an already-published conflicting version as success.
- Release asset verification must bind the requested tag/version to the expected VSIX/SBOM/checksum assets.
- Bundle/performance baselines may be updated only for an intentional reviewed change with measured evidence.

## Repository administration

`apply-repository-rules.ps1` can mutate GitHub repository settings. Preview/dry-run is the safe default. Do not apply live ruleset changes unless the task explicitly requires repository administration and the resulting required-context contract has been reviewed.

## Process safety

- Prefer argument-array child-process execution.
- Validate external command output before using it as release/package evidence.
- Never print marketplace credentials or other secrets.

## Validation

Run the focused script first, then `pnpm run check:ci` when package/release/security policy changes.
