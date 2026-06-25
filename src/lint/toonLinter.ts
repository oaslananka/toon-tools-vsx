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
    }),
    vscode.languages.registerCodeActionsProvider(LANGUAGE_ID, new ToonCodeActionProvider(), {
      providedCodeActionKinds: [vscode.CodeActionKind.QuickFix],
    })
  );

  vscode.workspace.textDocuments.forEach(schedule);
}

export class ToonCodeActionProvider implements vscode.CodeActionProvider {
  provideCodeActions(
    document: vscode.TextDocument,
    _range: vscode.Range,
    context: vscode.CodeActionContext
  ): vscode.CodeAction[] {
    return createToonCodeActions(document, context.diagnostics);
  }
}

export function createToonCodeActions(
  document: vscode.TextDocument,
  diagnostics: readonly vscode.Diagnostic[]
): vscode.CodeAction[] {
  const actions: vscode.CodeAction[] = [];

  for (const diagnostic of diagnostics) {
    const rowCountMatch = /^Row count mismatch\. Declared \d+, found (\d+)\.$/.exec(
      diagnostic.message
    );
    if (rowCountMatch) {
      const foundRows = rowCountMatch[1];
      const line = document.lineAt(diagnostic.range.start.line).text;
      const fixedLine = line.replace(/\[\d+\]/, `[${foundRows}]`);
      if (fixedLine !== line) {
        actions.push(
          createReplaceLineAction(
            document,
            diagnostic,
            `Update declared row count to ${foundRows}`,
            fixedLine
          )
        );
      }
      continue;
    }

    const valueCountMatch = /^Expected (\d+) values, found (\d+)\.$/.exec(diagnostic.message);
    if (valueCountMatch) {
      const expectedValues = Number(valueCountMatch[1]);
      const foundValues = Number(valueCountMatch[2]);
      if (foundValues < expectedValues) {
        const missingValues = expectedValues - foundValues;
        const line = document.lineAt(diagnostic.range.start.line).text;
        actions.push(
          createReplaceLineAction(
            document,
            diagnostic,
            `Pad row with ${missingValues} empty ${missingValues === 1 ? 'value' : 'values'}`,
            `${line}${','.repeat(missingValues)}`
          )
        );
      }
    }
  }

  return actions;
}

function createReplaceLineAction(
  document: vscode.TextDocument,
  diagnostic: vscode.Diagnostic,
  title: string,
  newText: string
): vscode.CodeAction {
  const action = new vscode.CodeAction(title, vscode.CodeActionKind.QuickFix);
  const line = document.lineAt(diagnostic.range.start.line).text;
  const edit = new vscode.WorkspaceEdit();
  edit.replace(
    document.uri,
    new vscode.Range(diagnostic.range.start.line, 0, diagnostic.range.start.line, line.length),
    newText
  );
  action.diagnostics = [diagnostic];
  action.edit = edit;
  action.isPreferred = true;
  return action;
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
