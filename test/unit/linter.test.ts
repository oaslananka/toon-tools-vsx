import * as vscode from 'vscode';
import { vi } from 'vitest';
import {
  createToonCodeActions,
  mapSeverity,
  registerToonLinter,
  validateToonBlocks,
  validateToonDocument,
} from '../../src/lint/toonLinter';
import { parseToonBlocks, parseToonDocument } from '../../src/parser/toonParser';
import { createDocument } from './testUtils';
import { __events, __setConfiguration } from './vscodeMock';

describe('validateToonBlocks', () => {
  it('reports row count mismatch as an error diagnostic', () => {
    const document = createDocument('users[2]{id}:\n  1');
    const diagnostics = validateToonBlocks(parseToonBlocks(document.getText()));

    expect(diagnostics[0].message).toContain('Row count mismatch');
    expect(diagnostics[0].severity).toBe('error');
    expect(diagnostics[0].range).toEqual({
      start: { line: 0, character: 0 },
      end: { line: 0, character: 13 },
    });
  });

  it('reports duplicate field names as a warning diagnostic', () => {
    const document = createDocument('users[0]{id,ID}:');
    const diagnostics = validateToonBlocks(parseToonBlocks(document.getText()));

    expect(diagnostics[0].message).toContain('Duplicate field names');
    expect(diagnostics[0].severity).toBe('warning');
    expect(diagnostics[0].range).toEqual({
      start: { line: 0, character: 9 },
      end: { line: 0, character: 14 },
    });
  });

  it('reports wrong value count per row as an error diagnostic', () => {
    const document = createDocument('users[1]{id,name}:\n  1');
    const diagnostics = validateToonBlocks(parseToonBlocks(document.getText()));

    expect(
      diagnostics.some((diagnostic) => diagnostic.message === 'Expected 2 values, found 1.')
    ).toBe(true);
  });

  it('returns zero diagnostics for a valid document', () => {
    const document = createDocument('users[1]{id,name}:\n  1,Alice');

    expect(validateToonBlocks(parseToonBlocks(document.getText()))).toEqual([]);
  });

  [
    {
      name: 'malformed header',
      source: 'users[one]{id}:',
      message: 'Malformed TOON header.',
    },
    {
      name: 'stray row',
      source: '  1,Alice',
      message: 'Row found before a TOON header.',
    },
    {
      name: 'unterminated quoted value',
      source: 'users[1]{id,name}:\n  1,"Alice',
      message: 'Unterminated quoted value.',
    },
    {
      name: 'duplicate block',
      source: 'users[0]{}:\nusers[0]{}:',
      message: 'Duplicate block name: users',
    },
    {
      name: 'empty field name',
      source: 'users[1]{id,,name}:\n  1,Alice',
      message: 'Empty field name.',
    },
  ].forEach(({ name, source, message }) => {
    it(`maps parser errors for ${name}`, () => {
      const diagnostics = validateToonDocument(parseToonDocument(source));

      expect(diagnostics.some((diagnostic) => diagnostic.message === message)).toBe(true);
    });
  });

  it('maps all severity levels', () => {
    expect(mapSeverity('error')).toBe(vscode.DiagnosticSeverity.Error);
    expect(mapSeverity('warning')).toBe(vscode.DiagnosticSeverity.Warning);
    expect(mapSeverity('info')).toBe(vscode.DiagnosticSeverity.Information);
  });

  it('creates a quick fix for row count mismatches', () => {
    const document = createDocument('users[2]{id}:\n  1');
    const diagnostic = new vscode.Diagnostic(
      new vscode.Range(0, 0, 0, 13),
      'Row count mismatch. Declared 2, found 1.',
      vscode.DiagnosticSeverity.Error
    );

    const actions = createToonCodeActions(document, [diagnostic]);

    expect(actions).toHaveLength(1);
    expect(actions[0].title).toBe('Update declared row count to 1');
    expect(actions[0].kind).toBe(vscode.CodeActionKind.QuickFix);
    expect(actions[0].diagnostics).toEqual([diagnostic]);
    expect(actions[0].isPreferred).toBe(true);
    const edit = actions[0].edit as unknown as { edits: unknown[] };
    expect(edit.edits).toEqual([
      {
        uri: document.uri,
        range: new vscode.Range(0, 0, 0, 13),
        newText: 'users[1]{id}:',
      },
    ]);
  });

  it('creates a quick fix for rows with missing trailing values', () => {
    const document = createDocument('users[1]{id,name,note}:\n  1,Alice');
    const diagnostic = new vscode.Diagnostic(
      new vscode.Range(1, 2, 1, 9),
      'Expected 3 values, found 2.',
      vscode.DiagnosticSeverity.Error
    );

    const actions = createToonCodeActions(document, [diagnostic]);

    expect(actions).toHaveLength(1);
    expect(actions[0].title).toBe('Pad row with 1 empty value');
    const edit = actions[0].edit as unknown as { edits: unknown[] };
    expect(edit.edits).toEqual([
      {
        uri: document.uri,
        range: new vscode.Range(1, 0, 1, 9),
        newText: '  1,Alice,',
      },
    ]);
  });

  it('does not create unsafe quick fixes for rows with too many values', () => {
    const document = createDocument('users[1]{id}:\n  1,Alice');
    const diagnostic = new vscode.Diagnostic(
      new vscode.Range(1, 2, 1, 9),
      'Expected 1 values, found 2.',
      vscode.DiagnosticSeverity.Error
    );

    expect(createToonCodeActions(document, [diagnostic])).toEqual([]);
  });

  it('registers linter events and schedules initial TOON documents', () => {
    vi.useFakeTimers();
    __setConfiguration({ 'linter.debounceMs': 0 });
    const document = createDocument('users[2]{id}:\n  1');
    const workspaceMock = vscode.workspace as unknown as { textDocuments: vscode.TextDocument[] };
    workspaceMock.textDocuments = [document];
    const collection = {
      set: vi.fn(),
      delete: vi.fn(),
      dispose: vi.fn(),
    } as unknown as vscode.DiagnosticCollection;
    const context = {
      subscriptions: [],
    } as unknown as vscode.ExtensionContext;

    registerToonLinter(collection, context);
    vi.runOnlyPendingTimers();

    expect(collection.set).toHaveBeenCalled();
    expect(context.subscriptions.length).toBeGreaterThanOrEqual(3);
    workspaceMock.textDocuments = [];
    __setConfiguration({});
    vi.useRealTimers();
  });

  it('publishes parser errors through registered diagnostics', () => {
    vi.useFakeTimers();
    __setConfiguration({ 'linter.debounceMs': 0 });
    const document = createDocument('users[one]{id}:');
    const workspaceMock = vscode.workspace as unknown as { textDocuments: vscode.TextDocument[] };
    workspaceMock.textDocuments = [];
    const collection = {
      set: vi.fn(),
      delete: vi.fn(),
      dispose: vi.fn(),
    } as unknown as vscode.DiagnosticCollection;

    registerToonLinter(collection, {
      subscriptions: [],
    } as unknown as vscode.ExtensionContext);
    __events.change?.({ document });
    vi.runOnlyPendingTimers();

    expect(collection.set).toHaveBeenCalledTimes(1);
    expect(collection.set).toHaveBeenCalledWith(document.uri, [
      expect.objectContaining({
        message: 'Malformed TOON header.',
        range: new vscode.Range(0, 0, 0, 15),
        severity: vscode.DiagnosticSeverity.Error,
      }),
    ]);
    __setConfiguration({});
    vi.useRealTimers();
  });

  it('skips non-TOON documents', () => {
    const document = createDocument('{"ok":true}', 'json');
    const workspaceMock = vscode.workspace as unknown as { textDocuments: vscode.TextDocument[] };
    workspaceMock.textDocuments = [document];
    const collection = {
      set: vi.fn(),
      delete: vi.fn(),
      dispose: vi.fn(),
    } as unknown as vscode.DiagnosticCollection;

    registerToonLinter(collection, {
      subscriptions: [],
    } as unknown as vscode.ExtensionContext);

    expect(collection.set).not.toHaveBeenCalled();
    expect(collection.delete).not.toHaveBeenCalled();
    workspaceMock.textDocuments = [];
  });

  it('clears pending timers and diagnostics when a TOON document closes', () => {
    vi.useFakeTimers();
    __setConfiguration({ 'linter.debounceMs': 20 });
    const document = createDocument('users[2]{id}:\n  1');
    const workspaceMock = vscode.workspace as unknown as { textDocuments: vscode.TextDocument[] };
    workspaceMock.textDocuments = [];
    const collection = {
      set: vi.fn(),
      delete: vi.fn(),
      dispose: vi.fn(),
    } as unknown as vscode.DiagnosticCollection;

    registerToonLinter(collection, {
      subscriptions: [],
    } as unknown as vscode.ExtensionContext);
    __events.change?.({ document });
    __events.close?.(document);
    vi.runOnlyPendingTimers();

    expect(collection.set).not.toHaveBeenCalled();
    expect(collection.delete).toHaveBeenCalledWith(document.uri);
    __setConfiguration({});
    vi.useRealTimers();
  });

  it('clears a prior pending lint when a second change arrives', () => {
    vi.useFakeTimers();
    __setConfiguration({ 'linter.debounceMs': 20 });
    const document = createDocument('users[1]{id}:\n  1');
    const collection = {
      set: vi.fn(),
      delete: vi.fn(),
      dispose: vi.fn(),
    } as unknown as vscode.DiagnosticCollection;

    registerToonLinter(collection, {
      subscriptions: [],
    } as unknown as vscode.ExtensionContext);
    __events.change?.({ document });
    __events.change?.({ document });
    vi.runOnlyPendingTimers();

    expect(collection.set).toHaveBeenCalledTimes(1);
    __setConfiguration({});
    vi.useRealTimers();
  });

  it('surfaces parser failures as linter errors', () => {
    vi.useFakeTimers();
    const badDocument = {
      ...createDocument('users[1]{id}:\n  1'),
      getText: () => {
        throw new Error('read failed');
      },
    } as vscode.TextDocument;
    const collection = {
      set: vi.fn(),
      delete: vi.fn(),
      dispose: vi.fn(),
    } as unknown as vscode.DiagnosticCollection;

    registerToonLinter(collection, {
      subscriptions: [],
    } as unknown as vscode.ExtensionContext);
    __events.change?.({ document: badDocument });
    vi.runOnlyPendingTimers();

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('TOON linter failed: read failed');
    vi.useRealTimers();
  });

  it('clears diagnostics when linting is disabled', () => {
    __setConfiguration({ 'linter.enabled': false });
    const document = createDocument('users[1]{id}:\n  1');
    const workspaceMock = vscode.workspace as unknown as { textDocuments: vscode.TextDocument[] };
    workspaceMock.textDocuments = [document];
    const collection = {
      set: vi.fn(),
      delete: vi.fn(),
      dispose: vi.fn(),
    } as unknown as vscode.DiagnosticCollection;

    registerToonLinter(collection, {
      subscriptions: [],
    } as unknown as vscode.ExtensionContext);

    expect(collection.delete).toHaveBeenCalledWith(document.uri);
    workspaceMock.textDocuments = [];
    __setConfiguration({});
  });
});
