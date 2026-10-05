# Webview and UI Instructions

These instructions apply to `src/ui/**` and supplement the repository root instructions.

This subtree handles webviews, webview HTML, message passing, previews, table viewing, and user-triggered export flows. Treat every webview message and rendered document value as untrusted.

## Webview security

- Keep Content-Security-Policy restrictive and nonce-based.
- Use the repository's crypto-safe nonce helper.
- Keep `localResourceRoots` limited to the minimum extension-owned assets.
- Do not add `unsafe-inline`, `unsafe-eval`, remote script origins, `eval`, or `new Function`.
- Escape or structurally encode document-derived values before inserting them into HTML/JavaScript.

## Message validation

- Treat `onDidReceiveMessage` payloads as untrusted.
- Validate command names and all fields before side effects.
- Bind actions to values derived from the current parsed document rather than trusting caller-supplied names/IDs.
- Ignore unknown message shapes and commands rather than guessing intent.

## File export

- User-facing export must preserve explicit destination selection.
- Do not introduce hidden writes to workspace or filesystem locations.
- Keep generated CSV/text deterministic for the same parsed input.
- Do not surface private document contents in logs or error telemetry.

## Testing

UI/security changes need focused tests for malformed messages, escaping/CSP behavior, empty state, and export cancellation/success where applicable. Run the root package-content and integration gates for changes that affect bundled assets or VSIX behavior.
