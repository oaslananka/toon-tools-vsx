# ADR 0001: Runtime and Release Automation Policy Baseline

- Status: Accepted
- Date: 2026-05-28
- Owners: Maintainers

## Context

TOON Tools VSX is a VS Code extension published as a VSIX and through Marketplace/Open VSX release
automation. The repository already relies on pinned GitHub Actions, release-please, pnpm, webpack,
VS Code integration tests, SBOM generation, and package-content checks.

The runtime and release policy needs a recorded baseline so future Node, pnpm, VS Code engine,
CodeQL, SBOM, and publishing changes are reviewed as intentional compatibility decisions instead of
incidental dependency churn.

## Decision

Use Node 24 and pnpm 10 as the active repository toolchain baseline. Keep the VS Code extension
engine at `^1.90.0` until a separate compatibility ADR or release plan raises the minimum editor
version. Keep release automation on GitHub Actions with pinned action SHAs, release-please version
management, generated VSIX artifacts, checksums, and SBOM verification.

Runtime, release, and publishing changes must update the relevant docs and add or amend an ADR when
they change the supported runtime matrix, release trigger, artifact format, package registry, SBOM
tool, or Marketplace/Open VSX publishing behavior.

## Consequences

- Dependency upgrades can move within the Node 24/pnpm 10 compatibility window without a new ADR.
- Major runtime, package-manager, VS Code engine, or release workflow changes require a new ADR.
- Release PRs remain the only supported path for version bumps and changelog generation.
- Manual tags and manual package publishing remain out of policy except for documented incident
  recovery.

## Alternatives Considered

| Option                                                                            | Pros                                       | Cons                                                       | Fit for this project |
| --------------------------------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------- | -------------------- |
| Keep runtime/release policy only in docs                                          | Lower process overhead                     | Decisions are harder to audit after multiple tool upgrades | Medium               |
| Record an ADR baseline and require ADRs for future runtime/release policy changes | Gives maintainers a durable decision trail | Adds a short documentation step for major changes          | High                 |

## Validation

- `pnpm run check:ci`
- `pnpm run check:package-contents`
- `pnpm exec vsce ls --tree --no-dependencies`
- `gh run list --branch main --limit 10 --json status,conclusion,name,databaseId`
