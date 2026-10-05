# GitHub Automation Agent Instructions

These instructions apply to `.github/**` and supplement the root `AGENTS.md`.

Workflow and repository-governance edits are supply-chain and release-policy changes.

## Required PR governance

The current main ruleset requires, among other review rules, these PR checks:

- Commitlint
- Dependency Review
- Fast Lint
- Gitleaks
- Analyze
- CodeQL
- CI (ubuntu-24.04)
- CI (windows-2025)
- CI (macos-15)

Do not rename, path-filter away, or conditionally suppress a required context without deliberately migrating the ruleset and documentation together.

## Workflow security

- Keep third-party Actions pinned to reviewed full commit SHAs.
- Default permissions to `contents: read` or empty; elevate only at the smallest job that needs it.
- Keep checkout credentials non-persistent unless a reviewed mutation step requires them.
- Pull-request code must not receive marketplace credentials or protected release authority.
- Preserve dependency review, CodeQL, Gitleaks, workflow-security, and Scorecard policy.

## Release and publishing

- Release Please owns release creation on `main`.
- Marketplace publication uses the protected `marketplace` environment.
- Preserve release validation before publish and the identity chain across VSIX, SBOM, checksums, attestations, GitHub Release, VS Code Marketplace, and Open VSX.
- Manual existing-release publication must publish the verified GitHub Release VSIX for the requested version, not an unrelated local rebuild.
- Do not expose `VSCE_PAT` or `OVSX_PAT` to PR jobs.

## CI integrity

Do not introduce `continue-on-error`, skip conditions, matrix exclusions, or permission changes that turn repository-owned failures green. Keep Linux/Windows/macOS validation where the package contract relies on it.

## Validation

For workflow changes, run the repository workflow-security/lint checks and the relevant script tests, then verify the required context names still match `docs/repository-rules.md`.
