import * as vscode from 'vscode';
import { toonToJsonSimple } from '../convert/codec';
import { generateNonce } from '../utils/nonce';

export async function openSizeAnalyzerCommand(context: vscode.ExtensionContext): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('No active TOON document to analyze.');
    return;
  }

  try {
    const toonText = editor.document.getText();
    const toonLength = Buffer.byteLength(toonText, 'utf-8');
    const toonLines = editor.document.lineCount;

    const jsonValue = toonToJsonSimple(toonText);
    const jsonString = JSON.stringify(jsonValue, null, 2);
    const jsonLength = Buffer.byteLength(jsonString, 'utf-8');
    const jsonLines = jsonString.split(/\r?\n/).length;

    const savings = jsonLength > 0 ? 1 - toonLength / jsonLength : 0;
    const toonTokens = approximateTokens(toonLength);
    const jsonTokens = approximateTokens(jsonLength);

    const panel = vscode.window.createWebviewPanel(
      'toonSizeAnalyzer',
      'TOON Size Analyzer',
      vscode.ViewColumn.Beside,
      {
        enableScripts: false,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')],
      }
    );

    panel.webview.html = getHtml(panel.webview, context, {
      toonLength,
      jsonLength,
      toonLines,
      jsonLines,
      savings,
      toonTokens,
      jsonTokens,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Failed to analyze TOON document: ${message}`);
  }
}

function approximateTokens(chars: number): number {
  return Math.ceil(chars / 4);
}

interface AnalyzerStats {
  toonLength: number;
  jsonLength: number;
  toonLines: number;
  jsonLines: number;
  savings: number;
  toonTokens: number;
  jsonTokens: number;
}

function getHtml(
  webview: vscode.Webview,
  context: vscode.ExtensionContext,
  stats: AnalyzerStats
): string {
  const nonce = generateNonce();
  const resetUri = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'media', 'reset.css')
  );
  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'media', 'sizeAnalyzer.css')
  );
  const comparison = stats.jsonLength > 0 ? `${(stats.savings * 100).toFixed(1)}%` : 'n/a';
  const maxLength = Math.max(stats.toonLength, stats.jsonLength, 1);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';" />
<link rel="stylesheet" href="${resetUri}" />
<link rel="stylesheet" href="${styleUri}" />
<title>TOON Size Analyzer</title>
</head>
<body>
  <main class="size-shell">
    <header class="size-header">
      <h1>Size / Token Analysis</h1>
      <p>Estimated savings: <strong>${escapeHtml(comparison)}</strong></p>
    </header>
    <section class="comparison" aria-label="TOON and JSON size comparison">
      <div class="bar-row">
        <span>TOON</span>
        <meter class="size-meter toon" min="0" max="${maxLength}" value="${stats.toonLength}"></meter>
        <strong>${stats.toonLength} bytes</strong>
      </div>
      <div class="bar-row">
        <span>JSON</span>
        <meter class="size-meter json" min="0" max="${maxLength}" value="${stats.jsonLength}"></meter>
        <strong>${stats.jsonLength} bytes</strong>
      </div>
    </section>
    <table class="stats">
      <tr><th>TOON length</th><td>${stats.toonLength} bytes</td></tr>
      <tr><th>JSON length</th><td>${stats.jsonLength} bytes</td></tr>
      <tr><th>TOON lines</th><td>${stats.toonLines}</td></tr>
      <tr><th>JSON lines</th><td>${stats.jsonLines}</td></tr>
      <tr><th>Approx. TOON tokens</th><td>${stats.toonTokens}</td></tr>
      <tr><th>Approx. JSON tokens</th><td>${stats.jsonTokens}</td></tr>
    </table>
    <p class="note">Token counts use a chars/4 heuristic for quick budgeting.</p>
  </main>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
