# TOON Tools Agent Instructions

These instructions apply repository-wide. A nested `AGENTS.md` narrows or adds rules for its subtree; the closest applicable file wins. Nested files may not weaken repository-wide security, packaging, release, evidence, or product-truth constraints.

## Repository role

This repository publishes one product: the TOON Tools VS Code extension.

The extension owns TOON parsing, formatting, linting, navigation, conversion, previews, table viewing, size analysis, CSV export, packaging, and dual-marketplace release automation.

## Nested instruction boundaries

- `.github/AGENTS.md` — CI, security automation, release, provenance, and marketplace publishing.
- `src/ui/AGENTS.md` — webview trust boundary, message handling, CSP, and user-triggered file export.

Do not create one nested file per feature directory. Parser, formatter, conversion, language-service, and utility code remain governed by this root file unless a materially different trust or release boundary emerges.

## Product-truth and compatibility

- Do not claim support outside the documented TOON subset or VS Code/runtime compatibility.
- Keep `package.json`, command IDs, settings, menus, language metadata, schemas, tests, README, and generated package contents aligned.
- Workspace-trust restrictions are runtime security behavior, not merely UI metadata.
- Do not lower coverage, mutation, bundle-size, dependency-audit, package-content, or workflow-security gates to land unrelated work.

## Workspace trust and filesystem behavior

Treat workspace/document content, webview messages, output paths, imported JSON/TOON, and user-selected destinations as untrusted input.

- State-changing or file-writing commands must preserve the documented workspace-trust model.
- Do not rely on command visibility or menus as the sole authorization/trust check.
- Keep output paths user-selected or explicitly derived from trusted editor state; avoid hidden writes outside the intended destination.
- Do not log raw private document contents or sensitive local paths when bounded diagnostic context is sufficient.

## Parsing and conversion

- Keep parser and formatter behavior deterministic.
- Preserve the documented quoted-field, comma, empty-value, comment, row-count, duplicate-field, and typed/string conversion semantics.
- Invalid input should produce stable diagnostics/errors rather than best-effort silent coercion.
- Parser/performance changes require focused unit/property/performance evidence.

## Webviews

Follow `src/ui/AGENTS.md` for webview changes.

At repository level:

- keep CSP restrictive;
- use crypto-safe nonces;
- keep `localResourceRoots` minimal;
- validate webview messages before acting on them;
- do not introduce `unsafe-inline`, `unsafe-eval`, remote script loading, or dynamic code execution.

## Packaging

Generated extension bundles are build output; do not hand-edit `dist/**`.

`AGENTS.md`, source, tests, scripts, repository automation, local config, coverage, and other development-only files must not ship in the VSIX unless the package contract explicitly changes.

Use the existing package-content gate rather than expanding the package allowlist for convenience.

## Toolchain and validation

Use the committed pnpm/toolchain contract.

Run focused checks first, then the relevant repository gate:

```bash
pnpm run format:check
pnpm run lint
pnpm run typecheck
pnpm run test:unit
pnpm run test:unit:coverage
pnpm run test:perf
pnpm run build
pnpm run package
pnpm run check:package-contents
pnpm run check:ci
```

Mutation-sensitive parser or core behavior changes may also require `pnpm run test:mutation`.

## Release integrity

Release Please owns version proposal/tag creation. Marketplace publishing is handled only by protected repository workflows.

- Do not publish from a development shell as part of normal coding-agent work.
- Preserve full-SHA Action pinning, least-privilege permissions, protected marketplace environments, SBOM/checksum/provenance generation, and post-build package verification.
- Do not retarget or silently replace released artifacts.
- VS Code Marketplace and Open VSX credentials must remain outside source and PR-visible execution.

## Definition of done

A change is ready when implementation, tests, docs, manifest/schema metadata, package contents, security/trust behavior, and exact-head CI agree. State explicitly which environment-dependent checks were not run.
