import { vi, type Mock } from 'vitest';

type MockableFunction = (...args: never[]) => unknown;

function mockFn<T extends MockableFunction>(implementation?: T): Mock<T> {
  return vi.fn(implementation);
}

let configuration: Record<string, unknown> = {};
const diagnosticStore = new Map<string, Diagnostic[]>();
const commandRegistry = new Map<string, (...args: unknown[]) => unknown>();

export const __events: {
  open?: (document: TextDocument) => void;
  change?: (event: { document: TextDocument }) => void;
  close?: (document: TextDocument) => void;
} = {};

export function __setConfiguration(next: Record<string, unknown>): void {
  configuration = next;
}

export function __resetCommandRegistry(): void {
  commandRegistry.clear();
}

export function __getRegisteredCommand(
  command: string
): ((...args: unknown[]) => unknown) | undefined {
  return commandRegistry.get(command);
}

export function __getRegisteredCommandIds(): string[] {
  return [...commandRegistry.keys()];
}

function createDisposable(): Disposable {
  return {
    dispose: mockFn(),
  };
}

export interface Disposable {
  dispose(): void;
}

export interface WorkspaceFolder {
  uri: Uri;
  name: string;
  index: number;
}

export const workspace = {
  textDocuments: [] as TextDocument[],
  isTrusted: true,
  workspaceFolders: undefined as WorkspaceFolder[] | undefined,
  findFiles: mockFn(async () => []),
  getConfiguration: (_section?: string) => ({
    get: <T>(key: string, fallback?: T): T =>
      Object.prototype.hasOwnProperty.call(configuration, key)
        ? (configuration[key] as T)
        : (fallback as T),
    inspect: <T>(
      key: string
    ):
      | {
          globalValue?: T;
          workspaceValue?: T;
          workspaceFolderValue?: T;
        }
      | undefined =>
      Object.prototype.hasOwnProperty.call(configuration, key)
        ? { globalValue: configuration[key] as T }
        : undefined,
    update: mockFn(),
  }),
  fs: {
    writeFile: mockFn(async () => undefined),
    readFile: mockFn(),
    stat: mockFn(),
  },
  onDidOpenTextDocument: mockFn((handler: (document: TextDocument) => void) => {
    __events.open = handler;
    return createDisposable();
  }),
  onDidChangeTextDocument: mockFn((handler: (event: { document: TextDocument }) => void) => {
    __events.change = handler;
    return createDisposable();
  }),
  onDidCloseTextDocument: mockFn((handler: (document: TextDocument) => void) => {
    __events.close = handler;
    return createDisposable();
  }),
  onDidChangeConfiguration: mockFn(() => createDisposable()),
  openTextDocument: mockFn(),
};

export const window = {
  activeTextEditor: undefined as TextEditor | undefined,
  showErrorMessage: mockFn(),
  showInformationMessage: mockFn(),
  showWarningMessage: mockFn(),
  showQuickPick: mockFn(),
  showSaveDialog: mockFn(),
  showTextDocument: mockFn(),
  createWebviewPanel: mockFn(),
  createStatusBarItem: mockFn(() => ({
    text: '',
    tooltip: '',
    command: undefined,
    show: mockFn(),
    hide: mockFn(),
    dispose: mockFn(),
  })),
  onDidChangeActiveTextEditor: mockFn(() => createDisposable()),
  registerTreeDataProvider: mockFn(() => createDisposable()),
};

export const languages = {
  createDiagnosticCollection: mockFn(() => ({
    set: mockFn((uri: Uri, diagnostics: Diagnostic[]) => {
      diagnosticStore.set(uri.toString(), diagnostics);
    }),
    delete: mockFn((uri: Uri) => {
      diagnosticStore.delete(uri.toString());
    }),
    dispose: mockFn(),
  })),
  getDiagnostics: mockFn((uri?: Uri) => (uri ? (diagnosticStore.get(uri.toString()) ?? []) : [])),
  setLanguageConfiguration: mockFn(() => createDisposable()),
  registerDocumentFormattingEditProvider: mockFn(() => createDisposable()),
  registerCompletionItemProvider: mockFn(() => createDisposable()),
  registerFoldingRangeProvider: mockFn(() => createDisposable()),
  registerDocumentSymbolProvider: mockFn(() => createDisposable()),
  registerHoverProvider: mockFn(() => createDisposable()),
  registerInlayHintsProvider: mockFn(() => createDisposable()),
  registerRenameProvider: mockFn(() => createDisposable()),
  registerDefinitionProvider: mockFn(() => createDisposable()),
  registerCodeActionsProvider: mockFn(() => createDisposable()),
};

export const commands = {
  registerCommand: mockFn((command: string, callback: (...args: unknown[]) => unknown) => {
    commandRegistry.set(command, callback);
    return createDisposable();
  }),
  executeCommand: mockFn((command: string, ...args: unknown[]) => {
    const callback = commandRegistry.get(command);
    return callback?.(...args);
  }),
};

export const DiagnosticSeverity = {
  Error: 0,
  Warning: 1,
  Information: 2,
  Hint: 3,
};

export const CodeActionKind = {
  QuickFix: 'quickfix',
};

export const TreeItemCollapsibleState = {
  None: 0,
  Collapsed: 1,
  Expanded: 2,
};

export const FoldingRangeKind = {
  Region: 1,
};

export const SymbolKind = {
  Object: 1,
  Field: 2,
};

export const CompletionItemKind = {
  Field: 5,
  Keyword: 14,
};

export const InlayHintKind = {
  Type: 1,
  Parameter: 2,
};

export const StatusBarAlignment = {
  Left: 1,
  Right: 2,
};

export const ViewColumn = {
  Active: 1,
  Beside: 2,
};

export class Position {
  constructor(
    public readonly line: number,
    public readonly character: number
  ) {}
}

export class Range {
  public readonly start: Position;
  public readonly end: Position;

  constructor(start: Position, end: Position);
  constructor(startLine: number, startCharacter: number, endLine: number, endCharacter: number);
  constructor(
    startOrLine: Position | number,
    startCharacterOrEnd: Position | number,
    endLine?: number,
    endCharacter?: number
  ) {
    if (startOrLine instanceof Position && startCharacterOrEnd instanceof Position) {
      this.start = startOrLine;
      this.end = startCharacterOrEnd;
      return;
    }
    this.start = new Position(startOrLine as number, startCharacterOrEnd as number);
    this.end = new Position(endLine ?? 0, endCharacter ?? 0);
  }
}

export class Selection extends Range {
  get isEmpty(): boolean {
    return this.start.line === this.end.line && this.start.character === this.end.character;
  }
}

export class Uri {
  constructor(public readonly fsPath: string) {}

  static file(fsPath: string): Uri {
    return new Uri(fsPath);
  }

  static joinPath(base: Uri, ...paths: string[]): Uri {
    return new Uri([base.fsPath, ...paths].join('/'));
  }

  static parse(value: string): Uri {
    return new Uri(value);
  }

  toString(): string {
    return this.fsPath;
  }
}

export class Diagnostic {
  constructor(
    public readonly range: Range,
    public readonly message: string,
    public readonly severity: number
  ) {}
}

export class TextEdit {
  constructor(
    public readonly range: Range,
    public readonly newText: string
  ) {}

  static replace(range: Range, newText: string): TextEdit {
    return new TextEdit(range, newText);
  }
}

export class CodeAction {
  diagnostics?: Diagnostic[];
  edit?: WorkspaceEdit;
  isPreferred?: boolean;

  constructor(
    public readonly title: string,
    public readonly kind?: string
  ) {}
}

export class WorkspaceEdit {
  readonly edits: Array<{ uri: Uri; range: Range; newText: string }> = [];

  replace(uri: Uri, range: Range, newText: string): void {
    this.edits.push({ uri, range, newText });
  }
}

export class Location {
  constructor(
    public readonly uri: Uri,
    public readonly range: Range
  ) {}
}

export class FoldingRange {
  constructor(
    public readonly start: number,
    public readonly end: number,
    public readonly kind?: number
  ) {}
}

export class DocumentSymbol {
  constructor(
    public readonly name: string,
    public readonly detail: string,
    public readonly kind: number,
    public readonly range: Range,
    public readonly selectionRange: Range
  ) {}
}

export class CompletionItem {
  detail?: string;
  insertText?: string;
  range?: Range;

  constructor(
    public readonly label: string,
    public readonly kind?: number
  ) {}
}

export class InlayHint {
  paddingLeft?: boolean;
  paddingRight?: boolean;

  constructor(
    public readonly position: Position,
    public readonly label: string,
    public readonly kind?: number
  ) {}
}

export class MarkdownString {
  value: string;

  constructor(value = '') {
    this.value = value;
  }

  appendMarkdown(value: string): MarkdownString {
    this.value += value;
    return this;
  }
}

export class Hover {
  constructor(
    public readonly contents: MarkdownString | MarkdownString[] | string[],
    public readonly range?: Range
  ) {}
}

export class EventEmitter<T> {
  private listeners: ((e: T) => void)[] = [];
  event = mockFn((cb: (e: T) => void) => {
    this.listeners.push(cb);
    return createDisposable();
  });
  fire = mockFn((e: T) => {
    for (const listener of this.listeners) {
      listener(e);
    }
  });
}

export class ThemeIcon {
  constructor(public readonly id: string) {}
}

export class TreeItem {
  iconPath?: ThemeIcon | Uri | { light: Uri; dark: Uri } | string;
  command?: unknown;
  contextValue?: string;

  constructor(
    public readonly label: string | unknown,
    public readonly collapsibleState?: number
  ) {}
}

export interface TextLine {
  text: string;
}

export interface TextDocument {
  uri: Uri;
  languageId: string;
  lineCount: number;
  getText(range?: Range): string;
  lineAt(line: number): TextLine;
}

export interface TextEditor {
  document: TextDocument;
  selection?: Selection;
}

export interface ExtensionContext {
  extensionUri: Uri;
  subscriptions: Disposable[];
}

export type DocumentSelector = unknown;
export type ProviderResult<T> = T | undefined | null | Promise<T | undefined | null>;
export type Definition = Location | Location[];
export type DiagnosticCollection = ReturnType<typeof languages.createDiagnosticCollection>;
export type StatusBarItem = ReturnType<typeof window.createStatusBarItem>;
export type Webview = {
  cspSource: string;
  asWebviewUri(uri: Uri): Uri;
  html: string;
  onDidReceiveMessage(callback: (message: unknown) => unknown): Disposable;
};
export type CompletionItemProvider = unknown;
export type DocumentFormattingEditProvider = unknown;
export type FoldingRangeProvider = unknown;
export type DocumentSymbolProvider = unknown;
export type HoverProvider = unknown;
export type InlayHintsProvider = unknown;
export type RenameProvider = unknown;
export type DefinitionProvider = unknown;
export type CodeActionProvider = unknown;
export type CodeActionContext = { diagnostics: Diagnostic[] };
