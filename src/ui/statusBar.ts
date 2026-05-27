import * as vscode from 'vscode';
import { parseToonBlocks } from '../parser/toonParser';

export function createStatusBarItem(context: vscode.ExtensionContext): vscode.StatusBarItem {
  const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  item.command = 'toon.openTableViewer';

  const updateItem = (document?: vscode.TextDocument): void => {
    const config = vscode.workspace.getConfiguration('toon');
    if (!config.get<boolean>('statusBar.enabled', true)) {
      item.hide();
      return;
    }

    const doc = document ?? vscode.window.activeTextEditor?.document;
    if (doc?.languageId !== 'toon') {
      item.hide();
      return;
    }

    const blocks = parseToonBlocks(doc.getText());
    item.text = `$(table) ${blocks.length} block${blocks.length !== 1 ? 's' : ''}`;
    item.tooltip =
      blocks.map((block) => `${block.name}[${block.rows.length}]`).join('\n') || 'No blocks';
    item.show();
  };

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => updateItem(editor?.document)),
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document === vscode.window.activeTextEditor?.document) {
        updateItem(event.document);
      }
    }),
    item
  );

  updateItem();
  return item;
}
