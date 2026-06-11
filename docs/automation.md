# Automation

This repository uses GitHub Actions, dependency update services, release automation, and reviewer
apps. This page records what each automation does, when it runs, what maintainers should do with the
result, and how to reproduce the closest local check.

## GitHub Actions

| Automation           | Source                                                                            | Trigger                                                                        | Purpose                                                                                                                | Maintainer action                                                                                                                              | Local equivalent                                                                                                                                                                                                   |
| -------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| TOON Tools CI        | `.github/workflows/ci.yml`                                                        | Push to `main`, PRs to `main`, merge queue, manual dispatch                    | Runs the full validation matrix on Ubuntu, Windows, and macOS; runs mutation tests and VSIX artifact checks on Ubuntu. | Treat any failure as a merge blocker. Download the VSIX artifact only from a trusted workflow run.                                             | `pnpm run check:ci && pnpm run test:mutation && pnpm exec vsce ls --tree --no-dependencies`                                                                                                                        |
| Release              | `.github/workflows/release.yml`                                                   | Push to `main`, manual dispatch for existing releases                          | Runs release-please, packages release assets, verifies SBOM/checksums, and publishes VSIX assets to both marketplaces. | Treat missing marketplace credentials or publish failures as release blockers. Use manual dispatch only for existing release publish recovery. | `pnpm run check:ci && pnpm run check:release-assets -- --tag <release-tag> && pnpm run check:publish-targets -- <version>`                                                                                         |
| Fast Lint            | `.github/workflows/lint-fast.yml`                                                 | Push to `main`, PRs to `main`, manual dispatch                                 | Gives fast feedback for formatting, linting, and type checking.                                                        | Fix before waiting for the full matrix if it fails.                                                                                            | `pnpm run format:check && pnpm run lint && pnpm run typecheck`                                                                                                                                                     |
| Commitlint           | `.github/workflows/commitlint.yml`                                                | PR opened, synchronized, reopened, edited; manual dispatch registered          | Enforces Conventional Commit messages across the PR commit range.                                                      | Rewrite or add commits with valid subjects before merge.                                                                                       | `pnpm exec commitlint --from <base-sha> --to <head-sha>`                                                                                                                                                           |
| CodeQL               | `.github/workflows/codeql.yml`                                                    | Push to `main`, PRs to `main`, weekly Monday schedule, manual dispatch         | Runs GitHub code scanning for JavaScript and TypeScript.                                                               | Triage alerts in GitHub code scanning; block merges for relevant alerts.                                                                       | With the CodeQL CLI installed: `codeql database create codeql-db --language=javascript-typescript --command="pnpm run build"` then `codeql database analyze codeql-db --format=sarif-latest --output=codeql.sarif` |
| Gitleaks             | `.github/workflows/gitleaks.yml`, `.gitleaks.toml`                                | Push to `main`, PRs to `main`, manual dispatch                                 | Detects committed secrets while allowing generated local artifacts.                                                    | Rotate any exposed secret before merging; update `.gitleaks.toml` only for generated non-secret artifacts.                                     | `gitleaks detect --source . --no-git --redact --verbose`                                                                                                                                                           |
| Dependency Review    | `.github/workflows/dependency-review.yml`, `.github/dependency-review-config.yml` | PRs to `main`; manual dispatch registered                                      | Fails PRs on high-severity vulnerable dependencies and disallowed licenses.                                            | Review vulnerability and license findings before approving dependency PRs.                                                                     | `pnpm run audit:ci && pnpm run check:licenses`                                                                                                                                                                     |
| Pull Request Labeler | `.github/workflows/labeler.yml`, `.github/labeler.yml`                            | Non-draft PR opened, synchronized, reopened, ready; manual dispatch registered | Applies current `area:*` and `type:*` taxonomy labels from changed paths.                                              | Adjust labels manually when path-based labels are incomplete; update `.github/labeler.yml` when taxonomy changes.                              | `rg -n "changed-files" .github/labeler.yml .github/workflows/labeler.yml`                                                                                                                                          |
| Workflow Security    | `.github/workflows/workflow-security.yml`                                         | Workflow file changes, weekly Monday schedule, manual dispatch                 | Runs actionlint and zizmor against GitHub Actions workflows.                                                           | Patch workflow findings before merging workflow changes.                                                                                       | `go run github.com/rhysd/actionlint/cmd/actionlint@v1.7.12 -color && python3 -m pip install --user zizmor==1.25.2 && zizmor --format sarif . > zizmor.sarif`                                                       |
| OpenSSF Scorecard    | `.github/workflows/scorecard.yml`                                                 | Weekly Monday schedule and manual dispatch                                     | Publishes supply-chain security metrics as SARIF and OpenSSF score metadata.                                           | Review score regressions, especially branch protection, pinned dependencies, token permissions, and signed release checks.                     | With Scorecard CLI installed: `scorecard --repo=github.com/oaslananka/toon-tools-vsx --format=sarif --show-details`                                                                                                |

The Windows CI leg uses the explicit GitHub-hosted runner label `windows-2025-vs2026`. Its required
status remains `CI (windows-2025)` until the active repository ruleset is migrated with an approval
window for already-open PRs.

## Dependency Updates

| Automation | Source          | Trigger                                                                                   | Purpose                                                                                                                                                                        | Maintainer action                                                                                                                   | Local equivalent                                                                                          |
| ---------- | --------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Renovate   | `renovate.json` | Renovate app schedule, including lockfile maintenance before Monday 06:00 Europe/Istanbul | Keeps dependency update policy explicit: recommended base config, dependency dashboard, semantic commits, separate major releases, pinned ranges, and GitHub Actions grouping. | Use the dependency dashboard to schedule or suppress update PRs; keep `@types/vscode` pinned until the VS Code engine target moves. | `pnpm outdated`; Renovate dry runs require a configured Renovate CLI token and are not repository-pinned. |

## Repository Security Analysis

The repository security-analysis settings were verified on 2026-06-10:

| Setting                               | Status   | Validation                                                                                                    |
| ------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------- |
| Dependabot alerts                     | Enabled  | `gh api -i /repos/oaslananka/toon-tools-vsx/vulnerability-alerts` returns `204 No Content`.                   |
| Dependabot security updates           | Enabled  | `gh api -i /repos/oaslananka/toon-tools-vsx/automated-security-fixes` returns `enabled: true`.                |
| Open Dependabot alerts                | None     | `gh api '/repos/oaslananka/toon-tools-vsx/dependabot/alerts?state=open'` returns an empty list.               |
| Secret scanning                       | Enabled  | `gh api /repos/oaslananka/toon-tools-vsx --jq '.security_and_analysis.secret_scanning'`.                      |
| Secret scanning push protection       | Enabled  | `gh api /repos/oaslananka/toon-tools-vsx --jq '.security_and_analysis.secret_scanning_push_protection'`.      |
| Secret scanning non-provider patterns | Disabled | The API keeps this disabled for the current repository plan; re-check if GitHub Secret Protection is enabled. |
| Secret scanning validity checks       | Disabled | The API keeps this disabled for the current repository plan; re-check if GitHub Secret Protection is enabled. |

Use `pnpm audit --audit-level high` and the `Dependency Review` workflow as the local and pull
request gates. Use GitHub Dependabot alerts as the source of truth for advisory triage after the
dependency graph finishes indexing new manifests.

## Reviewer Automation

| Automation                  | Source                                      | Trigger                                                                                                              | Purpose                                                                                                           | Maintainer action                                                                                                        | Local equivalent                                                                                                        |
| --------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| CodeRabbit                  | `.coderabbit.yaml`, GitHub app installation | Non-draft PRs to the default branch after the app is installed; dependency, release, and GitHub automation bots skip | Reviews changed files while ignoring generated output, local test artifacts, packaged VSIX files, and lock files. | Treat comments as review input. For a skipped bot PR that needs review, trigger it manually with `@coderabbitai review`. | CodeRabbit config validation uses the hosted YAML validator; locally run `pnpm exec prettier --check .coderabbit.yaml`. |
| Gemini Code Assist          | GitHub app installation                     | PRs when the app is enabled for the repository                                                                       | Comments on implementation risks and simplification opportunities.                                                | Treat comments as review input; patch actionable findings on the same branch.                                            | `gh pr diff <number> --color never && pnpm run check:ci`                                                                |
| GitHub Copilot code review  | GitHub Copilot policy, `@copilot` reviewer  | Manual request from the Reviewers menu or `gh pr edit <number> --add-reviewer @copilot`                              | Adds an optional GitHub-native AI review when maintainers want another pass on PR changes.                        | Request manually only after deciding that AI credits and GitHub Actions minute usage are worth the extra signal.         | No local equivalent; inspect results with `gh pr view <number> --comments --json reviews`.                              |
| Codex code review connector | GitHub app installation                     | PRs when quota and repository settings allow reviews                                                                 | Adds automated review comments when available.                                                                    | Use comments only as review input; quota or availability comments do not block merging.                                  | `gh pr view <number> --comments --json comments,reviews && git diff main...HEAD`                                        |

## Operational Notes

- PR workflows skip draft pull requests where configured.
- PR workflow concurrency cancels older runs for the same PR. Main branch workflows are allowed to
  finish so release and security signals are not dropped.
- Release workflows must not be triggered by tags or manual package publishing from routine task
  branches. Manual release dispatch is reserved for publishing an already-created GitHub Release
  asset when marketplace publication needs recovery.
- CodeRabbit is the configured automatic PR reviewer once the app is installed. GitHub Copilot code
  review stays manual unless the billing owner explicitly enables automatic reviews.
- Starting June 1, 2026, Copilot code review uses AI credits and consumes GitHub Actions minutes on
  GitHub-hosted runners. Self-hosted runners do not consume GitHub Actions minutes for those review
  runs.

## Triage Policy

- Path-based PR labels are applied by Pull Request Labeler. Maintainers may add priority and risk
  labels manually after reviewing impact.
- New issues should receive one `type:*` label during intake and an `area:*` label once the affected
  component is known. Priority and risk labels are maintainer judgments, not reporter inputs.
- This repository intentionally does not auto-close stale issues. The project is small enough that
  stale automation would risk closing valid TOON format, packaging, or marketplace compatibility
  reports before a maintainer can reproduce them.
- Maintainers should review open issues at least monthly, close duplicates with a link to the
  canonical issue, and add `agent:blocked` only when a specific external action is required.

## Architecture Decisions

Durable runtime, release, security, compatibility, and automation decisions are recorded in
[Architecture Decision Records](adr/README.md). Add or amend an ADR when a change alters supported
Node/pnpm/VS Code versions, release automation, publishing policy, security workflow architecture,
or another long-lived technical decision.
