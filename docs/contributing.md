# Contributing

## Setup

```bash
git clone https://github.com/oaslananka/toon-tools-vsx.git
cd toon-tools-vsx
corepack enable
pnpm install --frozen-lockfile
pnpm run build
```

Launch the extension with `F5` and the `Launch TOON Extension` configuration.

## Branch Policy

- `main` is the protected release branch.
- Feature and fix branches should target `main` through pull requests.
- Release PRs, changelog updates, tags, and GitHub Releases are created by release-please.
- Do not create manual release tags or manually edit release versions.

## Commit Convention

Use conventional commits:

```text
feat: add table filtering
fix: handle quoted TOON values
docs: update publishing guide
security: tighten webview CSP
```

## Test Requirements

Run the relevant checks before opening a pull request:

```bash
pnpm run format:check
pnpm run lint
pnpm run typecheck
pnpm run test:unit:coverage
pnpm run build
```

For release-bound changes, run:

```bash
pnpm run check:ci
pnpm run check:package-contents
pnpm exec vsce ls --tree
```

## Pull Request Checklist

- The change is focused and does not rewrite unrelated code.
- Public behavior changes are documented.
- Runtime, release, security automation, compatibility, or long-lived architecture changes include
  an ADR under `docs/adr/`.
- Unit tests cover parser, converter, formatter, linter, or provider behavior affected by the change.
- Webview changes preserve a restrictive CSP and use VS Code theme variables.
- No secrets, local prompts, transcripts, scratch files, or generated credentials are committed.

## Triage and Labels

Pull request area labels are applied from changed paths by the labeler workflow. Maintainers may add
priority and risk labels after reviewing the impact. Issues should keep one `type:*` label and at
least one `area:*` label once the affected component is known.
