# TOON Tools for VS Code Agent Instructions

These instructions apply repository-wide.

## Product boundary

This repository publishes the `oaslananka.toon-tools-vsx` VS Code extension to Visual Studio Marketplace and Open VSX.

The product implements the repository's documented TOON table-block subset. Do not invent syntax, coercion, compatibility, performance, marketplace, workspace-trust or security claims beyond the implementation, tests and `docs/toon-spec.md`.

## First reads

Before changing behavior, read the relevant source/tests plus:

- `README.md`
- `docs/toon-spec.md`
- `docs/adr/0001-runtime-and-release-policy.md`
- `docs/dependency-policy.md`
- `docs/publishing.md`
- `docs/release-readiness.md`
- `docs/repository-rules.md`
- `SECURITY.md`

## Toolchain and verification

Use the checked-in Node/pnpm contract and frozen lockfile.

Focused development gates:

```bash
pnpm run format:check
pnpm run lint
pnpm run typecheck
pnpm run test:unit:coverage
pnpm run build
pnpm run package
```

Run the relevant integration, parser-performance, bundle-size, package-content, publishing-target, workspace-trust, security and mutation checks when those surfaces change.

Do not lower thresholds, disable checks, broaden allowlists or update baselines merely to make unrelated work green.

## TOON language contract

- `docs/toon-spec.md` and parser tests define the supported TOON subset.
- Parsing, formatting, linting, hover, rename, definition, completion and conversion must agree on the same grammar/AST semantics.
- Quoted values, doubled quotes, commas, empty cells, comments, CRLF, Unicode, duplicate blocks and malformed rows have regression fixtures; do not "simplify" these cases away.
- JSON/TOON conversion must preserve the documented string-versus-typed mode semantics.
- Formatter output should be deterministic and idempotent.
- Do not silently accept malformed input in one feature while another feature rejects the same syntax unless the difference is an explicit product contract.

## Workspace trust and file mutations

The extension declares limited untrusted-workspace support.

- Workspace trust is enforced in code for commands that create derived documents, write/export files or perform other privileged operations. Menu visibility is not a security boundary.
- Read-only language features may operate in untrusted workspaces only within the declared product contract.
- CSV/file exports must use validated target paths and must not overwrite unrelated files through traversal/symlink assumptions.
- Never expose credentials, private workspace content or sensitive absolute paths in logs or webviews.

## Webviews

- Keep Content-Security-Policy restrictive and nonce-based.
- Keep `localResourceRoots` minimal.
- Escape TOON/project-derived values before embedding them into HTML/JavaScript.
- Do not add `eval`, `new Function`, remote script execution or CSP bypasses.
- Keep webview message payloads narrow and validated.
- Table/size preview changes need the existing HTML/media/payload tests and accessibility-sensitive review.

## VS Code contribution contract

Changes to commands, activation events, settings, views, language configuration, grammars, snippets, icons or keybindings must keep `package.json`, implementation registration, tests and docs aligned.

Do not add a command only in code or only in `package.json`.

## Build and package boundary

- `dist/**` and packaged VSIX content are generated/release surfaces; do not hand-edit generated bundles.
- `AGENTS.md` is repository governance metadata and must not ship in the VSIX.
- Keep `scripts/check-package-contents.js` authoritative; do not widen package contents merely to accommodate development files.
- Keep bundle-size policy and package-content checks intact.

## Release and supply chain

- Release Please owns version proposal automation.
- Publish through protected repository workflows; do not publish from ordinary agent work.
- Preserve dual-marketplace target validation and post-package/release-asset verification.
- Keep third-party Actions, dependency policy, secret scanning and release controls aligned with the checked-in repository rules.
- Do not modify or merge an automation-owned release PR unless the task explicitly concerns release automation.

## Tests and evidence

- Parser behavior changes require focused unit/property/malformed-corpus coverage.
- Workspace-trust changes require trusted/untrusted regression evidence.
- Webview changes require security/payload tests.
- User-visible behavior changes require docs/changelog consideration.
- Marketplace screenshots demonstrate the exact captured UI only; do not fabricate evidence.

## Definition of done

A change is ready when the language contract, implementation, VS Code contribution manifest, focused tests, package contents, docs and exact-head CI agree. State clearly which integration or marketplace checks were not run.
