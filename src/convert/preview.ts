import * as vscode from 'vscode';
import { jsonToToonSimple, toonToJsonSimple } from './codec';

export async function openJsonPreviewCommand(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('No active TOON document to preview.');
    return;
  }

  try {
    const jsonValue = toonToJsonSimple(editor.document.getText());
    const pretty = JSON.stringify(jsonValue, null, 2);
    await openInSideDocument(pretty, 'json');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Failed to open JSON preview: ${message}`);
  }
}

export async function openToonPreviewCommand(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('No active JSON document to preview.');
    return;
  }

  try {
    const jsonValue = JSON.parse(editor.document.getText());
    const toonText = jsonToToonSimple(jsonValue);
    await openInSideDocument(toonText, 'toon');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Failed to open TOON preview: ${message}`);
  }
}

async function openInSideDocument(content: string, language: string): Promise<void> {
  const doc = await vscode.workspace.openTextDocument({ content, language });
  await vscode.window.showTextDocument(doc, {
    preview: true,
    viewColumn: vscode.ViewColumn.Beside,
  });
}
