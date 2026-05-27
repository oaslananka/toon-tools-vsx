#!/usr/bin/env bash
set -euo pipefail

vsix="$(find . -maxdepth 1 -type f -name '*.vsix' -print -quit)"
test -n "$vsix"

pnpm exec vsce publish --packagePath "$vsix"
pnpm exec ovsx publish "$vsix"
