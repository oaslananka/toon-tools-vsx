# Release Readiness - 1.0.0

This handoff records the repository state checked before a maintainer release decision. It does not
create a tag, GitHub Release, marketplace publish, or package registry publish.

> Historical note: this document records the 1.0.0 release-readiness snapshot. Current runtime and
> package-manager pins live in `docs/dependency-policy.md`.

## Scope

- Repository: `oaslananka/toon-tools-vsx`
- Default branch: `main`
- Prepared on: 2026-05-22
- Prepared from main commit: `505d92746a495d68af35fe4ce8e8268727163f8a`
- Release target in manifests: `1.0.0`

After this document merges, use the merge commit as the release-readiness reference.

## Version And Toolchain Pinning

| File                            | Checked value                                  |
| ------------------------------- | ---------------------------------------------- |
| `package.json`                  | `version: 1.0.0`                               |
| `.release-please-manifest.json` | `".": "1.0.0"`                                 |
| `package.json`                  | `packageManager: pnpm@10.33.0`                 |
| `package.json`                  | `engines.node: >=24.0.0`                       |
| `package.json`                  | `engines.pnpm: >=10.33.0`                      |
| `.node-version`                 | `24.15.0`                                      |
| `.nvmrc`                        | `24.15.0`                                      |
| `pnpm-workspace.yaml`           | pnpm overrides mirror the package metadata     |
| `release-please-config.json`    | root Node package, changelog at `CHANGELOG.md` |

## Documentation State

- `CHANGELOG.md` has an empty `[Unreleased]` section and a dated `1.0.0` section covering parser,
  editor, conversion, test, automation, packaging, release-verification, and bug-fix work in this
  readiness cycle.
- `README.md` reflects the current extension feature set, commands, install flow, workspace-trust
  behavior, and known TOON subset limitations.
- `docs/publishing.md` includes local release-bound checks, clean-clone verification, guarded
  release workflow behavior, release asset verification, and post-release smoke checks.
- There is no separate docs-site build target. Markdown validation is enforced through Prettier,
  local checks, and package-content validation.

## Local Verification

The release-readiness branch must pass these commands before merge:

```bash
pnpm run format:check
pnpm run lint
pnpm run typecheck
pnpm run test:unit:coverage
pnpm run build
pnpm run check:ci
pnpm run package:ls
pnpm run check:release-assets -- --tag toon-tools-vsx-v1.0.0 --fixture test-fixtures/release-assets.valid.json
pnpm run check:publish-targets
gitleaks detect --source . --no-git --redact --verbose
pre-commit run --all-files
```

`pnpm run check:publish-targets` returned `safe_to_publish=true` for
`oaslananka.toon-tools-vsx@1.0.0` with no existing VS Marketplace or Open VSX target version.

The previous clean-clone verification also checked a shallow clone of `main` with:

```bash
pnpm install --frozen-lockfile
pnpm run check:ci
gitleaks detect --source . --no-git --redact --verbose
corepack pnpm install --frozen-lockfile
corepack pnpm run check:ci
```

## Main Branch CI

The following consecutive `main` commits had successful Release, Gitleaks, Fast Lint, CodeQL, and
TOON Tools CI workflows at handoff time:

| Commit    | Subject                                                   |
| --------- | --------------------------------------------------------- |
| `505d927` | `fix(release): tolerate unpublished marketplace metadata` |
| `a0d3bfb` | `docs(release): document clean clone verification`        |
| `398f627` | `docs(changelog): add unreleased readiness notes`         |

## Release Notes For Maintainers

- Do not merge a stale release-please PR. Let release-please refresh against the current `main`
  branch before using it for a release.
- The open Dependabot PRs were not merged during this handoff because they are separate dependency
  update work and had failing or unstable checks at handoff time.
- After a GitHub Release exists, run
  `pnpm run check:release-assets -- --tag <release-tag>` and complete the post-release smoke checks
  in `docs/publishing.md`.
