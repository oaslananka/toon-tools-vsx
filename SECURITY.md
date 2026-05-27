# Security Policy

## Supported Versions

Security fixes are provided for the latest published major version of TOON Tools.

## Reporting a Vulnerability

Report security issues through GitHub private vulnerability reporting or by opening a private
security advisory in the repository when you have maintainer access.

Please include:

- A clear description of the issue.
- Steps to reproduce.
- Impacted versions.
- Any known mitigations.

Do not publish exploit details until a fix is available and users have had a reasonable upgrade
window.

## Webview Security

All webviews must use:

- `localResourceRoots` for local assets.
- A restrictive Content-Security-Policy.
- Crypto-safe nonces from `src/utils/nonce.ts`.
- No `unsafe-inline` or `unsafe-eval`.
