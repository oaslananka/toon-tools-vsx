# Extension Runtime Agent Instructions

These instructions apply to `src/**` and supplement the root `AGENTS.md`.

## Runtime contract

Production code runs inside the VS Code extension host and processes workspace-controlled TOON/JSON content.

- Keep parsing and formatting deterministic.
- Preserve public command IDs and configuration semantics unless the change is intentionally breaking and documented.
- Keep VS Code API side effects at command/provider boundaries; prefer pure helpers for parser, conversion, lint, analysis, and formatting logic.
- Do not introduce hidden network access or telemetry.

## Workspace trust

The extension declares limited untrusted-workspace support.

- Linting, formatting, syntax/navigation, hover, inlay hints, and other read-only editor features may continue in untrusted workspaces as documented.
- Conversion/export operations that can create derived documents/files must preserve the existing runtime trust guard.
- Do not rely only on `package.json` menus or command enablement for trust enforcement.
- New state-changing commands need focused trusted/untrusted regression coverage.

## Webviews

Table and analysis webviews must preserve:

- crypto-safe nonce generation through `src/utils/nonce.ts`;
- restrictive CSP;
- minimal local resource roots;
- no inline/eval-style script bypasses;
- escaping/encoding of workspace-controlled strings before HTML/DOM insertion.

Do not interpolate raw TOON/JSON values into executable HTML or script contexts.

## Files and conversions

- Validate active language/document assumptions before conversion.
- Avoid silent overwrite of user files.
- CSV/JSON/TOON serialization must remain deterministic and correctly escape delimiters/quotes.
- Parser recovery and diagnostics must not mutate source documents.
- Size/token analysis is an estimate; do not present it as tokenizer-provider billing truth unless an exact tokenizer contract is introduced.

## Extension manifest

When adding or changing commands, settings, views, grammars, snippets, schema validation, activation, or icons, update `package.json`, registrations, tests, and docs coherently.

## Validation

Run the focused unit/property tests first, then:

```bash
pnpm run check:workspace-trust
pnpm run lint
pnpm run typecheck
pnpm run test:unit:coverage
pnpm run test:perf
pnpm run test:integration
pnpm run build
```

Webview or command-surface changes should include integration coverage where practical.
