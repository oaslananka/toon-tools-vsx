import * as vscode from 'vscode';
import type { ToonBlock } from '../parser/toonTypes';
import { generateNonce } from '../utils/nonce';

export interface TableViewerPayloadBlock {
  name: string;
  declaredRows: number;
  fields: string[];
  rows: string[][];
}

export interface TableViewerResourceUris {
  reset: string;
  style: string;
  script: string;
}

export interface TableViewerHtmlOptions {
  cspSource: string;
  nonce: string;
  resources: TableViewerResourceUris;
  payload: readonly TableViewerPayloadBlock[];
}

const SCRIPT_CONTEXT_ESCAPE_PATTERN = /[<>&\u2028\u2029]/g;
const SCRIPT_CONTEXT_ESCAPES: Record<string, string> = {
  '<': '\\u003c',
  '>': '\\u003e',
  '&': '\\u0026',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029',
};

export function createTableViewerHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  blocks: readonly ToonBlock[]
): string {
  return buildTableViewerHtml({
    cspSource: webview.cspSource,
    nonce: generateNonce(),
    resources: resolveTableViewerResourceUris(webview, extensionUri),
    payload: buildTableViewerPayload(blocks),
  });
}

export function buildTableViewerPayload(blocks: readonly ToonBlock[]): TableViewerPayloadBlock[] {
  return blocks.map((block) => ({
    name: block.name,
    declaredRows: block.rowCountDeclared,
    fields: block.fields,
    rows: block.rows.map((row) => row.values),
  }));
}

export function resolveTableViewerResourceUris(
  webview: Pick<vscode.Webview, 'asWebviewUri'>,
  extensionUri: vscode.Uri
): TableViewerResourceUris {
  return {
    reset: webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'reset.css')).toString(),
    style: webview
      .asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'tableViewer.css'))
      .toString(),
    script: webview
      .asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'tableViewer.js'))
      .toString(),
  };
}

export function buildTableViewerHtml(options: TableViewerHtmlOptions): string {
  const data = serializeWebviewPayload(options.payload);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${options.cspSource}; style-src ${options.cspSource}; script-src 'nonce-${options.nonce}'; base-uri 'none'; form-action 'none'; frame-ancestors 'none';" />
<link rel="stylesheet" href="${options.resources.reset}" />
<link rel="stylesheet" href="${options.resources.style}" />
<title>TOON Table Viewer</title>
</head>
<body>
  <main class="toon-shell">
    <section class="toon-toolbar" aria-label="Table controls">
      <label class="toon-control">
        <span>Block</span>
        <select id="blockSelect" class="toon-select"></select>
      </label>
      <label class="toon-control toon-control-grow">
        <span>Filter</span>
        <input id="filter" class="toon-filter" type="search" placeholder="Filter rows" />
      </label>
      <button id="exportCsv" class="toon-btn" type="button">Export CSV</button>
    </section>
    <section id="summary" class="toon-summary" aria-live="polite"></section>
    <section id="table" class="toon-table-wrap" aria-live="polite"></section>
  </main>
  <script nonce="${options.nonce}">window.__TOON_TABLE_DATA__ = ${data};</script>
  <script nonce="${options.nonce}" src="${options.resources.script}"></script>
</body>
</html>`;
}

export function serializeWebviewPayload(value: unknown): string {
  const json = JSON.stringify(value) ?? 'null';
  return json.replace(
    SCRIPT_CONTEXT_ESCAPE_PATTERN,
    (character) => SCRIPT_CONTEXT_ESCAPES[character]
  );
}
