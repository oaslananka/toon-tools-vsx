#!/usr/bin/env bash
set -euo pipefail

pnpm audit --audit-level high

if command -v gitleaks >/dev/null 2>&1; then
  gitleaks detect --source . --no-git --redact
else
  echo "gitleaks not installed; skipped local secret scan."
fi
