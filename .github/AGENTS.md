# GitHub Automation Instructions

These instructions apply to `.github/**` and supplement the repository root instructions.

Workflow changes are governance and supply-chain changes.

## CI integrity

- Keep pull-request CI fail-closed.
- Do not rename or skip required contexts without an intentional branch-protection migration.
- Do not add `continue-on-error`, broad path exclusions, or threshold suppressions to hide failures.
- Preserve Linux, Windows, and macOS validation where the workflow intentionally covers all three platforms.

## Permissions and Actions

- Keep default permissions read-only.
- Grant write scopes only to the smallest job that requires them.
- Keep third-party Actions pinned to reviewed full commit SHAs.
- Do not expose marketplace credentials or protected-environment secrets to pull-request code.
- Preserve `persist-credentials: false` for ordinary checkout steps.

## Release and publishing

- Release Please owns release proposal/tag creation.
- Marketplace publishing remains behind the `marketplace` protected environment.
- Preserve release validation, publish-target checks, VSIX verification, SBOM, checksums, provenance/attestation, and release-asset verification.
- Do not merge VS Code Marketplace and Open VSX semantics merely for symmetry.
- Do not add long-lived fallback credentials or publish-on-PR paths.

## Workflow validation

For workflow changes, run the repository workflow-security checks plus the normal package/release checks relevant to the changed job. YAML parsing alone is not sufficient evidence.
