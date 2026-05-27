import { describe, it, expect, vi } from 'vitest';
import * as vscode from 'vscode';
import { ToonExplorerProvider, ToonExplorerItem } from '../../src/ui/toonExplorer';

type MutableWorkspace = Omit<typeof vscode.workspace, 'workspaceFolders'> & {
  workspaceFolders: vscode.WorkspaceFolder[] | undefined;
};

const workspace = vscode.workspace as MutableWorkspace;

describe('ToonExplorerProvider', () => {
  it('should return root elements when getChildren is called without arguments', async () => {
    const provider = new ToonExplorerProvider();
    const children = await provider.getChildren();

    expect(children).toHaveLength(2);
    expect(children[0].label).toBe('Commands');
    expect(children[0].type).toBe('commands');
    expect(children[1].label).toBe('Workspace Files');
    expect(children[1].type).toBe('files');
  });

  it('should return command items when getChildren is called with commands item', async () => {
    const provider = new ToonExplorerProvider();
    const commandRoot = new ToonExplorerItem(
      'Commands',
      vscode.TreeItemCollapsibleState.Expanded,
      'commands'
    );
    const children = await provider.getChildren(commandRoot);

    expect(children).toHaveLength(4);
    expect(children[0].label).toBe('Convert JSON to TOON');
    expect(children[0].command?.command).toBe('toon.convertJsonToToon');

    expect(children[1].label).toBe('Convert TOON to JSON');
    expect(children[1].command?.command).toBe('toon.convertToonToJson');

    expect(children[2].label).toBe('Open Table Viewer');
    expect(children[2].command?.command).toBe('toon.openTableViewer');

    expect(children[3].label).toBe('Analyze Size / Tokens');
    expect(children[3].command?.command).toBe('toon.analyzeSizeTokens');
  });

  it('should return info item if no workspace is opened when requesting files', async () => {
    const provider = new ToonExplorerProvider();
    const filesRoot = new ToonExplorerItem(
      'Workspace Files',
      vscode.TreeItemCollapsibleState.Expanded,
      'files'
    );

    // Default mock has no workspaceFolders
    const children = await provider.getChildren(filesRoot);

    expect(children).toHaveLength(1);
    expect(children[0].label).toBe('No workspace opened');
  });

  it('should return empty item if no files are found in workspace', async () => {
    workspace.workspaceFolders = [
      { uri: vscode.Uri.file('/workspace'), name: 'workspace', index: 0 },
    ];
    vi.mocked(vscode.workspace.findFiles).mockResolvedValueOnce([]);

    const provider = new ToonExplorerProvider();
    const filesRoot = new ToonExplorerItem(
      'Workspace Files',
      vscode.TreeItemCollapsibleState.Expanded,
      'files'
    );
    const children = await provider.getChildren(filesRoot);

    expect(children).toHaveLength(1);
    expect(children[0].label).toBe('No .toon files found');

    // reset
    workspace.workspaceFolders = undefined;
  });

  it('should return files when files are found in workspace', async () => {
    workspace.workspaceFolders = [
      { uri: vscode.Uri.file('/workspace'), name: 'workspace', index: 0 },
    ];
    vi.mocked(vscode.workspace.findFiles).mockResolvedValueOnce([
      vscode.Uri.file('/workspace/b.toon'),
      vscode.Uri.file('/workspace/a.toon'),
    ]);

    const provider = new ToonExplorerProvider();
    const filesRoot = new ToonExplorerItem(
      'Workspace Files',
      vscode.TreeItemCollapsibleState.Expanded,
      'files'
    );
    const children = await provider.getChildren(filesRoot);

    expect(children).toHaveLength(2);
    // Should be sorted
    expect(children[0].label).toBe('a.toon');
    expect(children[0].command?.command).toBe('vscode.open');
    expect(children[0].command?.arguments?.[0].fsPath).toMatch(/[\\/]workspace[\\/]a\.toon$/);

    expect(children[1].label).toBe('b.toon');

    // reset
    workspace.workspaceFolders = undefined;
  });

  it('should return getTreeItem unchanged', () => {
    const provider = new ToonExplorerProvider();
    const item = new ToonExplorerItem('Test', vscode.TreeItemCollapsibleState.None, 'info');
    expect(provider.getTreeItem(item)).toBe(item);
  });

  it('should fire onDidChangeTreeData when refresh is called', () => {
    const provider = new ToonExplorerProvider();
    let fired = false;
    provider.onDidChangeTreeData(() => {
      fired = true;
    });
    provider.refresh();
    expect(fired).toBe(true);
  });
});
