import * as vscode from 'vscode';
import { toonBlockToCsv } from '../convert/codec';
import { parseToonBlocks } from '../parser/toonParser';
import { createTableViewerHtml } from './tableViewerHtml';

interface TableMessage {
  command?: unknown;
  blockName?: unknown;
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

    const allowedBlockNames = new Set(blocks.map((block) => block.name));
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
      panel.webview.onDidReceiveMessage(async (message: unknown) => {
        const blockName = getExportBlockName(message, allowedBlockNames);
        if (!blockName) {
          return;
        }

        const csv = toonBlockToCsv(sourceText, blockName);
        if (!csv) {
          vscode.window.showErrorMessage(`Block '${blockName}' not found.`);
          return;
        }

        const uri = await vscode.window.showSaveDialog({
          filters: { CSV: ['csv'] },
          defaultUri: vscode.Uri.file(`${blockName}.csv`),
        });
        if (!uri) {
          return;
        }

        await vscode.workspace.fs.writeFile(uri, Buffer.from(csv, 'utf-8'));
        vscode.window.showInformationMessage(`Exported '${blockName}' to ${uri.fsPath}`);
      })
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Failed to open TOON Table Viewer: ${message}`);
  }
}

function getExportBlockName(
  message: unknown,
  allowedBlockNames: ReadonlySet<string>
): string | undefined {
  if (!isTableMessage(message)) {
    return undefined;
  }

  if (message.command !== 'exportCsv' || typeof message.blockName !== 'string') {
    return undefined;
  }

  if (!allowedBlockNames.has(message.blockName)) {
    return undefined;
  }

  return message.blockName;
}

function isTableMessage(message: unknown): message is TableMessage {
  return typeof message === 'object' && message !== null && !Array.isArray(message);
}
