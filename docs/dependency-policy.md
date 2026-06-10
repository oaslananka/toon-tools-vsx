# Dependency Policy

This repository ships a single VS Code extension from the root package. Dependency changes must keep
the extension installable from a clean clone with the committed `pnpm-lock.yaml`, the pinned Node
runtime, and the pinned pnpm version.

## Source Checks

Policy checks performed on 2026-06-10:

- [Node.js releases](https://nodejs.org/en/about/releases/) and the
  [Node.js release schedule](https://github.com/nodejs/release#release-schedule): Node 24 is the
  supported LTS build runtime for this repository. Keep `.node-version` and `.nvmrc` on the latest
  Node 24 LTS patch; do not move to Current releases such as Node 26 for routine work.
- [pnpm settings](https://pnpm.io/settings) and
  [`pnpm approve-builds`](https://pnpm.io/cli/approve-builds): `packageManager`, `engine-strict`,
  exact saved versions, `allowBuilds`, and `overrides` are the dependency control points for this
  repository. pnpm settings live in `pnpm-workspace.yaml`; `package.json` mirrors npm-compatible
  metadata where needed by automation.
- [pnpm releases](https://github.com/pnpm/pnpm/releases): pnpm 10.34.0 is the latest 10.x release
  and pnpm 11.5.2 is the latest stable major. pnpm 11 is deferred until a dedicated lockfile and
  install-behavior migration PR validates the new integrity and registry-alias behavior.
- VS Code [extension manifest](https://code.visualstudio.com/api/references/extension-manifest) and
  [extension anatomy](https://code.visualstudio.com/api/get-started/extension-anatomy) docs:
  `engines.vscode` defines the minimum compatible VS Code version, and `@types/vscode` must track
  that API floor unless the engine target is raised.
- GitHub Actions hosted runner docs and changelog: `windows-2025-vs2026` is the explicit Windows
  image selected for CI while the required status name remains `CI (windows-2025)` for the active
  repository ruleset.
- CodeQL Action releases and metadata: `v4.36.0` is the current v4 action release checked here; the
  `init`, `analyze`, and `upload-sarif` actions all declare `runs.using: node24`.
- Anchore Syft releases and output-format docs: `syft@1.44.0` is the release SBOM generator. The
  release workflow downloads the Linux artifact and verifies its published checksum before writing
  `sbom.cdx.json` in CycloneDX JSON format.
- Local repository policy: Renovate, GitHub security updates, `pnpm-workspace.yaml`, `.npmrc`, and
  CI workflows define the automated update path.
- npm registry metadata: T037 checked same-major latest versions, engine ranges, peer dependencies,
  dist-tags, repository URLs, and publish timestamps before updating dependency pins.
- Jest 30, Vitest 4, and StrykerJS Vitest runner documentation: T038 compared the current Jest major
  path with a Vitest migration, then selected Vitest because it removed the Jest 29 transitive
  `glob@7` and `inflight` chain while preserving coverage, TypeScript compilation, and mutation
  testing.

## Toolchain Pins

| Area               | Current setting                                                       | Policy                                                                                                                                                  | Review cadence                                            |
| ------------------ | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Node.js            | `.node-version` and `.nvmrc`: `24.16.0`; `engines.node`: `>=24.0.0`   | Keep local, CI, and release jobs on the same Node 24 patch line. Move to a new even-numbered LTS line only after CI and extension tests pass.           | Check monthly and whenever Node publishes security fixes. |
| pnpm               | `packageManager`: `pnpm@10.34.0`; `engines.pnpm`: `>=10.34.0`         | Keep `packageManager`, workflow `corepack prepare`, and lockfile version aligned. Do not mix npm, Yarn, or Bun lockfiles into this repo.                | Check weekly through dependency automation.               |
| VS Code API floor  | `engines.vscode`: `^1.90.0`; `@types/vscode`: `1.90.0`                | Keep `@types/vscode` exactly aligned with the minimum VS Code engine. Raise both together only with compatibility notes and integration tests.          | Revisit when a feature requires a newer VS Code API.      |
| TypeScript runtime | `typescript`: `6.0.3`; Vitest `4.1.8`; `@vitest/coverage-v8`: `4.1.8` | Patch and minor updates may ride automation. Major test or compiler moves require a dedicated task with local warning/deprecation output recorded.      | Check weekly; group major moves separately.               |
| Publishing tools   | `@vscode/vsce`: `3.9.2`; `ovsx`: `1.0.0`; `syft`: `1.44.0`            | Update only after validating `pnpm run package`, `pnpm run check:package-contents`, SBOM generation, and `pnpm run check:publish-targets -- <version>`. | Check before release-readiness work and weekly updates.   |

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

`pnpm@10.34.0`

- Reason: this is the latest pnpm 10.x release and keeps the current lockfile/install policy stable.
  pnpm 11.5.2 is stable upstream, but it changes integrity handling and registry alias behavior, so
  it is deferred to a dedicated migration PR.
- Update rule: keep using the latest pnpm 10.x until the pnpm 11 migration validates
  `pnpm install --frozen-lockfile`, lockfile diffs, build-script approvals, and release packaging.
- Required validation: `pnpm install --frozen-lockfile`, `pnpm run check:ci`, and the full PR matrix.

`@go-task/cli@3.51.1`

- Reason: it is the current pinned Task CLI package. Matrix CI installs dependencies with
  `--config.ignore-scripts=true`, and `pnpm-workspace.yaml` keeps install-script approval explicit.
- Update rule: update only after a Windows matrix run proves dependency installation and local CLI
  execution still work.
- Required validation: `pnpm install --frozen-lockfile`, `pnpm run check:ci`, and the PR matrix job
  `CI (windows-2025)`.

`syft@1.44.0`

- Reason: latest `@cyclonedx/cdxgen@12.4.4` still emits a deprecated `whatwg-encoding@3.1.1`
  subdependency warning when installed through `npx` or `pnpm dlx`. `@cyclonedx/cyclonedx-npm@4.2.1`
  also emits deprecated transitive warnings through npm. Syft is an actively maintained Apache-2.0
  CLI that writes CycloneDX JSON without installing npm packages in the release job.
- Update rule: download the pinned Linux release archive and checksums from GitHub Releases, verify
  the archive with `sha256sum -c`, and then generate `sbom.cdx.json` while excluding
  `node_modules` from the source tree scan.
- Required validation: generate a local CycloneDX JSON SBOM with the selected Syft release, then run
  `pnpm run check:release-assets` against the generated release asset set after publication.

## Known Upstream Deprecation Warnings

The repository still has install-time deprecation warnings that come from latest stable upstream
tooling packages rather than repo-owned code:

- `mocha@11.7.6` resolves `glob@10.5.0`. Track upstream Mocha issues
  `mochajs/mocha#5779`, `mochajs/mocha#5874`, and the Mocha 12 release plan before changing the
  VS Code integration-test runner.
- `@vscode/vsce@3.9.2` and `ovsx@1.0.0` resolve deprecated transitive packages through the
  official VS Code packaging toolchain. Track `microsoft/vscode-vsce#1237`; replace these CLIs only
  after a compatibility review proves Marketplace and Open VSX packaging behavior is unchanged.

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

- Weekly automation: Renovate may open npm and GitHub Actions update PRs on Monday morning
  Europe/Istanbul. Do not merge unstable dependency PRs.
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
