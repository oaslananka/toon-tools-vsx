# Dependency Policy

This repository ships a single VS Code extension from the root package. Dependency changes must keep
the extension installable from a clean clone with the committed `pnpm-lock.yaml`, the pinned Node
runtime, and the pinned pnpm version.

## Source Checks

Policy checks performed on 2026-05-22:

- [Node.js releases](https://nodejs.org/en/about/releases/) and the
  [Node.js release schedule](https://github.com/nodejs/release#release-schedule): Node 24 is the
  supported build runtime for this repository. Keep `.node-version` and `.nvmrc` on an even-numbered,
  supported Node release line; do not move to an odd-numbered Current release for routine work.
- [pnpm settings](https://pnpm.io/settings) and
  [`pnpm approve-builds`](https://pnpm.io/cli/approve-builds): `packageManager`, `engine-strict`,
  exact saved versions, `allowBuilds`, and `overrides` are the dependency control points for this
  repository. pnpm settings live in `pnpm-workspace.yaml`; `package.json` mirrors npm-compatible
  metadata where needed by automation.
- VS Code [extension manifest](https://code.visualstudio.com/api/references/extension-manifest) and
  [extension anatomy](https://code.visualstudio.com/api/get-started/extension-anatomy) docs:
  `engines.vscode` defines the minimum compatible VS Code version, and `@types/vscode` must track
  that API floor unless the engine target is raised.
- Local repository policy: Dependabot, Renovate, `pnpm-workspace.yaml`, `.npmrc`, and CI workflows
  define the automated update path.
- npm registry metadata: T037 checked same-major latest versions, engine ranges, peer dependencies,
  dist-tags, repository URLs, and publish timestamps before updating dependency pins.
- Jest 30, Vitest 4, and StrykerJS Vitest runner documentation: T038 compared the current Jest major
  path with a Vitest migration, then selected Vitest because it removed the Jest 29 transitive
  `glob@7` and `inflight` chain while preserving coverage, TypeScript compilation, and mutation
  testing.

## Toolchain Pins

| Area               | Current setting                                                                | Policy                                                                                                                                             | Review cadence                                            |
| ------------------ | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Node.js            | `.node-version` and `.nvmrc`: `24.15.0`; `engines.node`: `>=24.0.0`            | Keep local, CI, and release jobs on the same Node 24 patch line. Move to a new even-numbered LTS line only after CI and extension tests pass.      | Check monthly and whenever Node publishes security fixes. |
| pnpm               | `packageManager`: `pnpm@10.33.0`; `engines.pnpm`: `>=10.33.0`                  | Keep `packageManager`, workflow `corepack prepare`, and lockfile version aligned. Do not mix npm, Yarn, or Bun lockfiles into this repo.           | Check weekly through dependency automation.               |
| VS Code API floor  | `engines.vscode`: `^1.90.0`; `@types/vscode`: `1.90.0`                         | Keep `@types/vscode` exactly aligned with the minimum VS Code engine. Raise both together only with compatibility notes and integration tests.     | Revisit when a feature requires a newer VS Code API.      |
| TypeScript runtime | `typescript`: `5.9.3`; Vitest `4.1.7`; `@vitest/coverage-v8`: `4.1.7`          | Patch and minor updates may ride automation. Major test or compiler moves require a dedicated task with local warning/deprecation output recorded. | Check weekly; group major moves separately.               |
| Publishing tools   | `@vscode/vsce`: `3.9.1`; `ovsx`: `0.10.12`; release workflow packages the VSIX | Update only after validating `pnpm run package`, `pnpm run check:package-contents`, and `pnpm run check:publish-targets -- <version>`.             | Check before release-readiness work and weekly updates.   |

## Intentional Pins

`@types/vscode@1.90.0`

- Reason: it matches `engines.vscode: ^1.90.0`, the extension API floor.
- Update rule: do not accept a standalone `@types/vscode` minor or major update. Raise
  `engines.vscode` and `@types/vscode` in one PR after confirming the new VS Code version is the
  intended support floor.
- Required validation: `pnpm run compile-tests`, `pnpm run test:integration`, and README support
  notes updated when the engine floor changes.

`typescript` and test framework major versions

- Reason: compiler and test framework majors can affect parser, webpack, Vitest coverage, Stryker
  mutation testing, and VS Code type compatibility.
- Update rule: patch and minor updates may be handled by dependency automation. Major updates require
  a task that records TypeScript or test framework release notes, Stryker compatibility, and local
  warning output.
- Required validation: `pnpm run typecheck`, `pnpm run test:unit:coverage`, `pnpm run compile-tests`,
  `pnpm run test:mutation`, and `pnpm run build`.

`overrides` in `pnpm-workspace.yaml` and mirrored `package.json` metadata

- Current overrides: `diff@9.0.0`, `fast-uri@3.1.2`, and `serialize-javascript@7.0.5`.
- Reason: keep vulnerable or stale transitive ranges resolved to reviewed versions while upstream
  ranges catch up. `pnpm-workspace.yaml` is the pnpm resolution source; the top-level
  `package.json` `overrides` object is a mirror for npm-compatible metadata and dependency
  automation.
- Update rule: remove an override only when `pnpm why <package>` shows all relevant parents resolve
  to the same or newer reviewed version without the override. Until the mirror is removed in a
  dedicated dependency-configuration task, update both locations in the same PR and reject mismatched
  values.
- Required validation: `pnpm install --lockfile-only`, `pnpm run audit:ci`, `pnpm run check:licenses`,
  and a lockfile diff review.

Node and pnpm exact pins

- Reason: CI, release packaging, and local installs must use the same runtime and package manager
  behavior.
- Update rule: change `.node-version`, `.nvmrc`, `package.json` engines, workflow Corepack commands,
  and `packageManager` together.
- Required validation: `pnpm install --frozen-lockfile`, `pnpm run check:ci`, and PR workflow checks
  on Ubuntu, Windows, and macOS.

`@go-task/cli@3.50.0`

- Reason: `@go-task/cli@3.51.1` fails the Windows CI dependency install during its postinstall
  download step with exit code `3221226505` on the redirected `windows-2025` runner.
- Update rule: keep `@go-task/cli` on `3.50.0` until a later `3.x` release passes
  `pnpm install --frozen-lockfile` on Windows CI. Do not move it through grouped dependency PRs
  without a clean Windows install run.
- Required validation: `pnpm install --frozen-lockfile`, `pnpm run check:ci`, and the PR matrix job
  `CI (windows-2025)`.

## Build-Script Approval

`pnpm-workspace.yaml` is the source of truth for dependency install scripts:

- Allowed: `@go-task/cli` and `@vscode/vsce-sign`.
- Denied: `keytar`.

When pnpm reports a new dependency with ignored or pending build scripts:

1. Inspect the package name, version, install script, npm metadata, and repository release notes.
2. Decide whether the install script is required for local validation, packaging, or release work.
3. Add the package to `allowBuilds` with `true` or `false`. Do not enable
   `dangerouslyAllowAllBuilds`.
4. Run `pnpm install --frozen-lockfile`, then the narrow validation that triggered the package, then
   `pnpm run check:ci` when the package can affect build, test, package, or release behavior.
5. Mention the package and reason in the PR body.

## Update Cadence

- Weekly automation: Dependabot and Renovate may open npm and GitHub Actions update PRs on Monday
  morning Europe/Istanbul. Do not merge unstable dependency PRs.
- Security updates: patch the affected package or override as soon as a high-severity advisory applies
  to installed code or release tooling.
- Patch and minor updates: accept after lockfile review, `pnpm run check:ci`, and any workflow checks
  relevant to the touched dependency family.
- Major updates: use a dedicated task and document migration notes, removed APIs, deprecation output,
  and rollback path in the PR body.
- Lockfile maintenance: lockfile-only changes must be paired with `pnpm install --lockfile-only` and
  a lockfile diff review. They must not change source code.

## Required Commands

Run these commands before merging dependency policy or manifest changes:

```shell
pnpm outdated --format json
pnpm run format:check
pnpm run audit:ci
pnpm run check:licenses
pnpm run check:ci
pnpm run test:mutation
```

`pnpm outdated --format json` identifies update candidates. For documentation-only dependency policy
changes, the command output is acceptable when the JSON is parseable and no listed package has
`"isDeprecated": true`. Manifest, lockfile, or workflow changes must also explain why any listed
update was taken, deferred, or rejected.

For documentation-only changes to this policy, `pnpm run format:check` and
`pnpm outdated --format json` are sufficient unless the doc change also edits manifests, lockfiles,
workflow files, release tooling, or dependency automation config.
