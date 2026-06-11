# Publishing TOON Tools

Publishing is owned by GitHub Actions. Do not publish the VS Code Marketplace or Open VSX package
from a developer workstation.

## Release Source Of Truth

- Conventional commits determine the next SemVer version.
- `release-please-config.json` and `.release-please-manifest.json` control release automation.
- The release workflow runs only on `main`.
- If release-please does not create a release, package and publish jobs are skipped.

## Local Verification

Run the local gate before merging release-bound changes:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm run format:check
pnpm run lint
pnpm run typecheck
pnpm run check:workspace-trust
pnpm run test:unit:coverage
pnpm run compile-tests
pnpm run test:integration
pnpm audit --audit-level high
pnpm run build
pnpm run package
pnpm run check:package-contents
pnpm run check:bundle-size
pnpm exec vsce ls --tree
pnpm exec ovsx --help
```

Review package contents:

```bash
pnpm run package:ls
```

Check whether the current package version already exists in either registry:

```bash
pnpm run check:publish-targets
```

Validate the expected GitHub Release asset set after a release exists:

```bash
pnpm run check:release-assets -- --tag <release-tag>
```

The same checker supports an offline fixture for local script validation:

```bash
pnpm run check:release-assets -- --tag oaslananka.toon-tools-vsx-v1.0.2 --fixture test-fixtures/release-assets.valid.json
```

## Clean Clone Verification

Before release handoff, verify the default branch from a new checkout so generated files, cached
build outputs, and local editor state cannot hide missing repository inputs:

```bash
tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT
git clone --depth 1 https://github.com/oaslananka/toon-tools-vsx.git "$tmp_dir"
cd "$tmp_dir"
corepack pnpm install --frozen-lockfile
corepack pnpm run check:ci
gitleaks detect --source . --no-git --redact --verbose
```

## Release Workflow

After a pull request is merged to `main`, release-please opens or updates a release PR. Merge that
release PR through the normal review policy. When the release PR merge creates a GitHub Release, the
release workflow builds the VSIX from a clean checkout, downloads the pinned Syft release archive,
verifies its checksum, generates a CycloneDX JSON SBOM and SHA256 checksums, attests provenance, and
uploads release assets.

Marketplace publishing runs automatically from the same workflow. The protected `marketplace`
environment must provide both `VSCE_PAT` and `OVSX_PAT`; missing credentials fail the release job
instead of silently skipping a registry.

If a GitHub Release already exists but one or both marketplaces were not published, manually run the
`Release` workflow with:

- `release_tag`: the existing GitHub Release tag, for example `oaslananka.toon-tools-vsx-v1.0.2`
- `version`: the package version matching the release VSIX asset, for example `1.0.2`

The manual job verifies the GitHub Release asset set, downloads the existing VSIX from the release,
checks registry target versions, and publishes that exact asset to VS Code Marketplace and Open VSX.

For an exceptional maintainer-run publish, start from `.env.example`, expose the credentials only
to the current shell, and publish the already-built VSIX with:

```bash
./scripts/publish-marketplaces.sh
```

The script requires authenticated `vsce` and `ovsx` credentials in the maintainer environment.

Automatic publishing is skipped unless `release_created == true`. Existing releases use the manual
`workflow_dispatch` path above.

Integration tests pin VS Code to the minimum supported API floor (`1.90.0`) so CI does not drift
when a new stable VS Code build is released. To test another editor version locally, set
`TOON_TOOLS_TEST_VSCODE_VERSION` before running `pnpm run test:integration`.

## Post-Release Smoke

After the release workflow completes, verify:

- The GitHub Release tag matches the release-please tag.
- `pnpm run check:release-assets -- --tag <release-tag>` confirms the VSIX,
  `sbom.cdx.json`, and `checksums.sha256` assets are attached.
- The VS Code Marketplace version matches `package.json`.
- The Open VSX version matches `package.json`.
- The VSIX installs in a clean VS Code profile when a local GUI environment is available.
