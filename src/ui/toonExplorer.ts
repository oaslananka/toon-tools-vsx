import * as vscode from 'vscode';
import * as path from 'path';

export class ToonExplorerProvider implements vscode.TreeDataProvider<ToonExplorerItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<ToonExplorerItem | undefined | void> =
    new vscode.EventEmitter<ToonExplorerItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<ToonExplorerItem | undefined | void> =
    this._onDidChangeTreeData.event;

  constructor() {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ToonExplorerItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: ToonExplorerItem): Promise<ToonExplorerItem[]> {
    if (element) {
      if (element.type === 'commands') {
        return this.getCommandItems();
      } else if (element.type === 'files') {
        return this.getFileItems();
      }
      return [];
    } else {
      // Root items
      return [
        new ToonExplorerItem('Commands', vscode.TreeItemCollapsibleState.Expanded, 'commands'),
        new ToonExplorerItem('Workspace Files', vscode.TreeItemCollapsibleState.Expanded, 'files'),
      ];
    }
  }

  private getCommandItems(): ToonExplorerItem[] {
    return [
      new ToonExplorerItem(
        'Convert JSON to TOON',
        vscode.TreeItemCollapsibleState.None,
        'command',
        {
          command: 'toon.convertJsonToToon',
          title: 'Convert JSON to TOON',
        }
      ),
      new ToonExplorerItem(
        'Convert TOON to JSON',
        vscode.TreeItemCollapsibleState.None,
        'command',
        {
          command: 'toon.convertToonToJson',
          title: 'Convert TOON to JSON',
        }
      ),
      new ToonExplorerItem('Open Table Viewer', vscode.TreeItemCollapsibleState.None, 'command', {
        command: 'toon.openTableViewer',
        title: 'Open Table Viewer',
      }),
      new ToonExplorerItem(
        'Analyze Size / Tokens',
        vscode.TreeItemCollapsibleState.None,
        'command',
        {
          command: 'toon.analyzeSizeTokens',
          title: 'Analyze Size / Tokens',
        }
      ),
    ];
  }

  private async getFileItems(): Promise<ToonExplorerItem[]> {
    if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
      return [
        new ToonExplorerItem('No workspace opened', vscode.TreeItemCollapsibleState.None, 'info'),
      ];
    }

    const files = await vscode.workspace.findFiles('**/*.toon', '**/node_modules/**');

    if (files.length === 0) {
      return [
        new ToonExplorerItem('No .toon files found', vscode.TreeItemCollapsibleState.None, 'info'),
      ];
    }

    // Sort files alphabetically by name
    files.sort((a, b) => {
      const nameA = path.basename(a.fsPath).toLowerCase();
      const nameB = path.basename(b.fsPath).toLowerCase();
      return nameA.localeCompare(nameB);
    });

    return files.map((file) => {
      const fileName = path.basename(file.fsPath);
      return new ToonExplorerItem(
        fileName,
        vscode.TreeItemCollapsibleState.None,
        'file',
        {
          command: 'vscode.open',
          title: 'Open File',
          arguments: [file],
        },
        file
      );
    });
  }
}

export class ToonExplorerItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly type: 'commands' | 'files' | 'command' | 'file' | 'info',
    command?: vscode.Command,
    resourceUri?: vscode.Uri
  ) {
    super(label, collapsibleState);
    if (command) {
      this.command = command;
    }
    if (resourceUri) {
      this.resourceUri = resourceUri;
    }

    if (type === 'commands' || type === 'files') {
      this.iconPath = new vscode.ThemeIcon('folder');
    } else if (type === 'command') {
      this.iconPath = new vscode.ThemeIcon('play');
    } else if (type === 'file') {
      this.iconPath = new vscode.ThemeIcon('file');
      // Set context value so we can add right-click actions on files in the future if we want
      this.contextValue = 'toonFile';
    } else if (type === 'info') {
      this.iconPath = new vscode.ThemeIcon('info');
    }
  }
}
