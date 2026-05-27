import * as vscode from 'vscode';
import { parseToonDocument } from '../parser/toonParser';
import {
  ToonBlock,
  ToonDocument,
  ToonDiagnostic,
  ToonDiagnosticSeverity,
  ToonTextRange,
} from '../parser/toonTypes';

const LANGUAGE_ID = 'toon';

export function registerToonLinter(
  collection: vscode.DiagnosticCollection,
  context: vscode.ExtensionContext
): void {
  const timers = new Map<string, NodeJS.Timeout>();

  const schedule = (document: vscode.TextDocument): void => {
    if (document.languageId !== LANGUAGE_ID) {
      return;
    }

    const config = vscode.workspace.getConfiguration('toon');
    if (!config.get<boolean>('linter.enabled', true)) {
      collection.delete(document.uri);
      return;
    }

    const key = document.uri.toString();
    const pending = timers.get(key);
    if (pending) {
      clearTimeout(pending);
    }

    const delay = config.get<number>('linter.debounceMs', 300);
    const handle = setTimeout(() => {
      timers.delete(key);
      lintDocument(document, collection);
    }, delay);
    timers.set(key, handle);
  };

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(schedule),
    vscode.workspace.onDidChangeTextDocument((event) => schedule(event.document)),
    vscode.workspace.onDidCloseTextDocument((document) => {
      const pending = timers.get(document.uri.toString());
      if (pending) {
        clearTimeout(pending);
      }
      timers.delete(document.uri.toString());
      if (document.languageId === LANGUAGE_ID) {
        collection.delete(document.uri);
      }
    })
  );

  vscode.workspace.textDocuments.forEach(schedule);
}

function lintDocument(
  document: vscode.TextDocument,
  collection: vscode.DiagnosticCollection
): void {
  try {
    const toonDocument = parseToonDocument(document.getText());
    const toonDiagnostics = validateToonDocument(toonDocument);
    const diagnostics = toonDiagnostics.map(
      (diag) =>
        new vscode.Diagnostic(toVsCodeRange(diag.range), diag.message, mapSeverity(diag.severity))
    );
    collection.set(document.uri, diagnostics);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`TOON linter failed: ${message}`);
  }
}

export function validateToonDocument(document: ToonDocument): ToonDiagnostic[] {
  return [...document.parseErrors, ...validateToonBlocks(document.blocks)];
}

export function validateToonBlocks(blocks: ToonBlock[]): ToonDiagnostic[] {
  const diagnostics: ToonDiagnostic[] = [];

  for (const block of blocks) {
    if (block.rows.length !== block.rowCountDeclared) {
      diagnostics.push({
        message: `Row count mismatch. Declared ${block.rowCountDeclared}, found ${block.rows.length}.`,
        severity: 'error',
        range: block.headerRange,
      });
    }

    const duplicateFields = getDuplicateFields(block.fields);
    if (duplicateFields.length > 0) {
      diagnostics.push({
        message: `Duplicate field names: ${duplicateFields.join(', ')}`,
        severity: 'warning',
        range: block.fieldsRange,
      });
    }

    for (const row of block.rows) {
      if (row.values.length !== block.fields.length) {
        diagnostics.push({
          message: `Expected ${block.fields.length} values, found ${row.values.length}.`,
          severity: 'error',
          range: row.range,
        });
      }
    }
  }

  return diagnostics;
}

export function mapSeverity(severity: ToonDiagnosticSeverity): vscode.DiagnosticSeverity {
  switch (severity) {
    case 'warning':
      return vscode.DiagnosticSeverity.Warning;
    case 'info':
      return vscode.DiagnosticSeverity.Information;
    case 'error':
      return vscode.DiagnosticSeverity.Error;
  }
}

function toVsCodeRange(range: ToonTextRange): vscode.Range {
  return new vscode.Range(
    range.start.line,
    range.start.character,
    range.end.line,
    range.end.character
  );
}

function getDuplicateFields(fields: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  fields.forEach((field) => {
    const lower = field.toLowerCase();
    if (seen.has(lower)) {
      duplicates.add(field);
    } else {
      seen.add(lower);
    }
  });
  return Array.from(duplicates.values());
}
