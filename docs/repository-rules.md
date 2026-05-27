# Repository Rules

Apply the `main` ruleset with:

```powershell
.\scripts\apply-repository-rules.ps1 -OwnerRepo oaslananka/toon-tools-vsx
.\scripts\apply-repository-rules.ps1 -OwnerRepo oaslananka/toon-tools-vsx -Apply
```

The first command prints the payload without changing GitHub. The second command creates or updates
the repository ruleset through `gh api`; it requires an authenticated GitHub CLI session with
repository administration write permission.

The script follows the GitHub repository rulesets REST endpoint and rule names checked on
2026-05-27. It targets the default branch through `~DEFAULT_BRANCH`, uses `active` enforcement by
default, and keeps `bypass_actors` empty so bypass is not silently granted. It also updates
repository merge settings so the GitHub UI allows squash and rebase merges only, deletes merged
head branches, enables auto-merge, and allows update-branch.

## Main Branch Ruleset

The script applies these branch rules:

- Block branch deletion.
- Block non-fast-forward updates.
- Require linear history.
- Require pull requests before merge.
- Require one approving review.
- Require code-owner review.
- Require approval from someone other than the most recent pusher.
- Require review thread resolution.
- Allow only squash and rebase merge methods.
- Require status checks to pass with strict up-to-date branches.

Required PR checks:

- Commitlint
- Dependency Review
- Fast Lint
- Gitleaks
- Analyze
- CodeQL
- CI (ubuntu-24.04)
- CI (windows-2025)
- CI (macos-15)

`Workflow Security`, `OpenSSF Scorecard`, and release validation are not required PR checks in this
ruleset because they do not run on every pull request. They remain scheduled, path-filtered, or
release-time controls.

## Validation

After applying the ruleset, verify the live repository state with:

```powershell
gh api /repos/oaslananka/toon-tools-vsx/rulesets --jq '.[] | {name,target,enforcement}'
gh api /repos/oaslananka/toon-tools-vsx/branches/main/protection
gh repo view --json mergeCommitAllowed,squashMergeAllowed,rebaseMergeAllowed,deleteBranchOnMerge,autoMergeAllowed
```

The branch protection endpoint should report that branch protection is disabled when the repository
uses rulesets instead. The ruleset list is the source of truth.

## Release Tags

Protect release tags separately:

- Match `refs/tags/toon-tools-vsx-v*`.
- Block deletion.
- Block non-fast-forward updates.
- Do not mutate published release artifacts.
