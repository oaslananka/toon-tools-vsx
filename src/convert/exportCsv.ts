import * as vscode from 'vscode';
import { parseToonBlocks } from '../parser/toonParser';
import { toonBlockToCsv } from './codec';

export async function exportCsvCommand(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('No active TOON document to export.');
    return;
  }

  const blocks = parseToonBlocks(editor.document.getText());
  if (blocks.length === 0) {
    vscode.window.showInformationMessage('No TOON blocks found.');
    return;
  }

  const blockName =
    blocks.length === 1
      ? blocks[0].name
      : await vscode.window.showQuickPick(
          blocks.map((block) => block.name),
          { placeHolder: 'Select block to export as CSV' }
        );

  if (!blockName) {
    return;
  }

  const csv = toonBlockToCsv(editor.document.getText(), blockName);
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
}
