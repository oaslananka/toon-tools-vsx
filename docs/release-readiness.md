# Release Readiness

This page records current release state and keeps the original 1.0.0 readiness handoff as an
archive. The source of truth for future releases is release-please, `CHANGELOG.md`, GitHub Releases,
and the release workflow, not manual edits to this page.

## Current Release State

| Item                             | Current value                                                                                                                      |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Package version                  | `1.0.2`                                                                                                                            |
| Release-please manifest          | `.release-please-manifest.json` contains `".": "1.0.2"`                                                                            |
| Latest GitHub Release            | [`oaslananka.toon-tools-vsx-v1.0.2`](https://github.com/oaslananka/toon-tools-vsx/releases/tag/oaslananka.toon-tools-vsx-v1.0.2)   |
| Required release assets          | `toon-tools-vsx-1.0.2.vsix`, `sbom.cdx.json`, `checksums.sha256`                                                                   |
| Changelog source of truth        | `CHANGELOG.md`, maintained by release-please from Conventional Commits                                                             |
| Marketplace publishing state     | The release workflow requires protected `VSCE_PAT` and `OVSX_PAT` environment secrets; missing credentials fail publish validation |
| Current release verification doc | [docs/publishing.md](publishing.md)                                                                                                |

Before merging release-bound changes, use the local gate in [docs/publishing.md](publishing.md) and
verify the GitHub Release assets with:

```bash
pnpm run check:release-assets -- --tag <release-tag>
```

For the current published GitHub Release, `<release-tag>` is
`oaslananka.toon-tools-vsx-v1.0.2`.

## Historical Snapshot: 1.0.0

The original release-readiness handoff prepared version `1.0.0` from main commit
`505d92746a495d68af35fe4ce8e8268727163f8a` on 2026-05-22. It did not create a tag, GitHub
Release, Marketplace publish, Open VSX publish, or registry package.

That snapshot is retained only as historical context. Do not use its old version numbers,
toolchain pins, or release asset examples as current release instructions. Current package metadata,
runtime pins, release workflow behavior, and release asset checks live in:

- `package.json`
- `.release-please-manifest.json`
- `CHANGELOG.md`
- [docs/dependency-policy.md](dependency-policy.md)
- [docs/publishing.md](publishing.md)
