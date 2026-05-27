import * as vscode from 'vscode';
import { toonBlockToCsv } from '../convert/codec';
import { parseToonBlocks } from '../parser/toonParser';
import { createTableViewerHtml } from './tableViewerHtml';

interface TableMessage {
  command?: string;
  blockName?: string;
}

export async function openTableViewerCommand(context: vscode.ExtensionContext): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('No active TOON document to view.');
    return;
  }

  try {
    const sourceText = editor.document.getText();
    const blocks = parseToonBlocks(sourceText);
    if (blocks.length === 0) {
      vscode.window.showInformationMessage('No TOON blocks found to display.');
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'toonTableViewer',
      'TOON Table Viewer',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')],
      }
    );

    panel.webview.html = createTableViewerHtml(panel.webview, context.extensionUri, blocks);
    context.subscriptions.push(
      panel.webview.onDidReceiveMessage(async (message: TableMessage) => {
        if (message.command !== 'exportCsv' || !message.blockName) {
          return;
        }

        const csv = toonBlockToCsv(sourceText, message.blockName);
        if (!csv) {
          vscode.window.showErrorMessage(`Block '${message.blockName}' not found.`);
          return;
        }

        const uri = await vscode.window.showSaveDialog({
          filters: { CSV: ['csv'] },
          defaultUri: vscode.Uri.file(`${message.blockName}.csv`),
        });
        if (!uri) {
          return;
        }

        await vscode.workspace.fs.writeFile(uri, Buffer.from(csv, 'utf-8'));
        vscode.window.showInformationMessage(`Exported '${message.blockName}' to ${uri.fsPath}`);
      })
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Failed to open TOON Table Viewer: ${message}`);
  }
}
