import * as vscode from 'vscode';
import { vi, type Mock } from 'vitest';
import { convertJsonToToonCommand } from '../../src/convert/jsonToToon';
import { convertToonToJsonCommand } from '../../src/convert/toonToJson';
import { exportCsvCommand } from '../../src/convert/exportCsv';
import { openJsonPreviewCommand, openToonPreviewCommand } from '../../src/convert/preview';
import { activate } from '../../src/extension';
import { openSizeAnalyzerCommand } from '../../src/ui/sizeAnalyzer';
import { openTableViewerCommand } from '../../src/ui/tableViewer';
import {
  __getRegisteredCommand,
  __getRegisteredCommandIds,
  __resetCommandRegistry,
  type Disposable,
} from './vscodeMock';
import { createDocument } from './testUtils';

const EXPECTED_COMMANDS = [
  'toon.convertJsonToToon',
  'toon.convertToonToJson',
  'toon.openJsonPreview',
  'toon.openToonPreview',
  'toon.openTableViewer',
  'toon.analyzeSizeTokens',
  'toon.exportCsv',
];

describe('extension command registration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetCommandRegistry();
    Object.assign(vscode.window, { activeTextEditor: undefined });
  });

  it('registers every contributed command with an executable handler', async () => {
    const context = createContext();

    activate(context);

    expect(__getRegisteredCommandIds().sort()).toEqual([...EXPECTED_COMMANDS].sort());
    for (const command of EXPECTED_COMMANDS) {
      expect(__getRegisteredCommand(command)).toEqual(expect.any(Function));
    }
    expect(vscode.commands.registerCommand).toHaveBeenCalledTimes(EXPECTED_COMMANDS.length);
  });
});

describe('conversion and preview command outcomes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    configureVirtualDocumentOpen();
    Object.assign(vscode.window, { activeTextEditor: undefined });
  });

  it('converts active JSON content to a TOON virtual document', async () => {
    setActiveDocument('{"users":[{"id":1,"name":"Alice"}]}', 'json');

    await convertJsonToToonCommand();

    expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith({
      content: 'users[1]{id,name}:\n  1,Alice',
      language: 'toon',
    });
    expect(vscode.window.showTextDocument).toHaveBeenCalledWith(expect.anything(), {
      preview: false,
    });
  });

  it('converts active TOON content to a JSON virtual document', async () => {
    setActiveDocument('users[1]{id,name}:\n  1,Alice');

    await convertToonToJsonCommand();

    expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith({
      content: JSON.stringify({ users: [{ id: '1', name: 'Alice' }] }, null, 2),
      language: 'json',
    });
    expect(vscode.window.showTextDocument).toHaveBeenCalledWith(expect.anything(), {
      preview: false,
    });
  });

  it('opens a side JSON preview for active TOON content', async () => {
    setActiveDocument('users[1]{id,name}:\n  1,Alice');

    await openJsonPreviewCommand();

    expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith({
      content: JSON.stringify({ users: [{ id: '1', name: 'Alice' }] }, null, 2),
      language: 'json',
    });
    expect(vscode.window.showTextDocument).toHaveBeenCalledWith(expect.anything(), {
      preview: true,
      viewColumn: vscode.ViewColumn.Beside,
    });
  });

  it('opens a side TOON preview for active JSON content', async () => {
    setActiveDocument('{"users":[{"id":1,"name":"Alice"}]}', 'json');

    await openToonPreviewCommand();

    expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith({
      content: 'users[1]{id,name}:\n  1,Alice',
      language: 'toon',
    });
    expect(vscode.window.showTextDocument).toHaveBeenCalledWith(expect.anything(), {
      preview: true,
      viewColumn: vscode.ViewColumn.Beside,
    });
  });

  const noEditorCases: Array<{
    name: string;
    command: () => Promise<void>;
    expectedMessage: string;
  }> = [
    {
      name: 'JSON conversion',
      command: convertJsonToToonCommand,
      expectedMessage: 'No active editor to convert from JSON.',
    },
    {
      name: 'TOON conversion',
      command: convertToonToJsonCommand,
      expectedMessage: 'No active editor to convert from TOON.',
    },
    {
      name: 'JSON preview',
      command: openJsonPreviewCommand,
      expectedMessage: 'No active TOON document to preview.',
    },
    {
      name: 'TOON preview',
      command: openToonPreviewCommand,
      expectedMessage: 'No active JSON document to preview.',
    },
  ];

  for (const { name, command, expectedMessage } of noEditorCases) {
    it(`reports the no-editor error for ${name}`, async () => {
      Object.assign(vscode.window, { activeTextEditor: undefined });

      await command();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(expectedMessage);
      expect(vscode.workspace.openTextDocument).not.toHaveBeenCalled();
    });
  }
});

describe('webview and export command outcomes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(vscode.window, { activeTextEditor: undefined });
    (vscode.window.showSaveDialog as Mock).mockResolvedValue(undefined);
    (vscode.workspace.fs.writeFile as Mock).mockResolvedValue(undefined);
  });

  it('opens the table viewer and handles the webview CSV export command', async () => {
    const panel = createWebviewPanel();
    const csvUri = vscode.Uri.file('/tmp/users.csv');
    const context = createContext();
    (vscode.window.createWebviewPanel as Mock).mockReturnValue(panel);
    (vscode.window.showSaveDialog as Mock).mockResolvedValue(csvUri);
    setActiveDocument('users[1]{id,name}:\n  1,Alice');

    await openTableViewerCommand(context);

    expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
      'toonTableViewer',
      'TOON Table Viewer',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')],
      }
    );
    expect(panel.webview.html).toContain('window.__TOON_TABLE_DATA__');

    await panel.messages[0]({ command: 'exportCsv', blockName: 'users' });

    expect(vscode.window.showSaveDialog).toHaveBeenCalledWith({
      filters: { CSV: ['csv'] },
      defaultUri: vscode.Uri.file('users.csv'),
    });
    expect(vscode.workspace.fs.writeFile).toHaveBeenCalledWith(
      csvUri,
      Buffer.from('id,name\n1,Alice', 'utf-8')
    );
  });

  it('opens the size analyzer with byte and token statistics', async () => {
    const panel = createWebviewPanel();
    const context = createContext();
    (vscode.window.createWebviewPanel as Mock).mockReturnValue(panel);
    setActiveDocument('users[1]{id,name}:\n  1,Alice');

    await openSizeAnalyzerCommand(context);

    expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
      'toonSizeAnalyzer',
      'TOON Size Analyzer',
      vscode.ViewColumn.Beside,
      {
        enableScripts: false,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')],
      }
    );
    expect(panel.webview.html).toContain('Size / Token Analysis');
    expect(panel.webview.html).toContain('TOON length');
    expect(panel.webview.html).toContain('Approx. JSON tokens');
  });

  it('writes a CSV file from the active TOON document', async () => {
    const csvUri = vscode.Uri.file('/tmp/users.csv');
    (vscode.window.showSaveDialog as Mock).mockResolvedValue(csvUri);
    setActiveDocument('users[1]{id,name}:\n  1,Alice');

    await exportCsvCommand();

    expect(vscode.workspace.fs.writeFile).toHaveBeenCalledWith(
      csvUri,
      Buffer.from('id,name\n1,Alice', 'utf-8')
    );
    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
      "Exported 'users' to /tmp/users.csv"
    );
  });

  const noEditorCases: Array<{
    name: string;
    command: () => Promise<void>;
    expectedMessage: string;
  }> = [
    {
      name: 'table viewer',
      command: () => openTableViewerCommand(createContext()),
      expectedMessage: 'No active TOON document to view.',
    },
    {
      name: 'size analyzer',
      command: () => openSizeAnalyzerCommand(createContext()),
      expectedMessage: 'No active TOON document to analyze.',
    },
    {
      name: 'CSV export',
      command: exportCsvCommand,
      expectedMessage: 'No active TOON document to export.',
    },
  ];

  for (const { name, command, expectedMessage } of noEditorCases) {
    it(`reports the no-editor error for ${name}`, async () => {
      Object.assign(vscode.window, { activeTextEditor: undefined });

      await command();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(expectedMessage);
      expect(vscode.window.createWebviewPanel).not.toHaveBeenCalled();
      expect(vscode.workspace.fs.writeFile).not.toHaveBeenCalled();
    });
  }
});

function createContext(): vscode.ExtensionContext {
  return {
    extensionUri: vscode.Uri.file('/extension'),
    subscriptions: [],
  } as unknown as vscode.ExtensionContext;
}

function setActiveDocument(text: string, languageId = 'toon'): vscode.TextDocument {
  const document = createDocument(text, languageId);
  Object.assign(vscode.window, {
    activeTextEditor: {
      document,
      selection: new vscode.Selection(0, 0, 0, 0),
    },
  });
  return document;
}

function configureVirtualDocumentOpen(): void {
  (vscode.workspace.openTextDocument as Mock).mockImplementation(
    async (options: { content: string; language: string }) =>
      createDocument(options.content, options.language)
  );
  (vscode.window.showTextDocument as Mock).mockImplementation(
    async (document: vscode.TextDocument) => {
      Object.assign(vscode.window, {
        activeTextEditor: {
          document,
          selection: new vscode.Selection(0, 0, 0, 0),
        },
      });
      return vscode.window.activeTextEditor;
    }
  );
}

function createWebviewPanel(): {
  webview: vscode.Webview;
  messages: Array<(message: unknown) => unknown>;
} {
  const messages: Array<(message: unknown) => unknown> = [];
  const webview = {
    cspSource: 'vscode-webview://test',
    asWebviewUri: vi.fn((uri: vscode.Uri) => uri),
    html: '',
    onDidReceiveMessage: vi.fn((callback: (message: unknown) => unknown): Disposable => {
      messages.push(callback);
      return { dispose: vi.fn() };
    }),
  } as unknown as vscode.Webview;

  return { webview, messages };
}
