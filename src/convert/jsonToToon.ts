import * as vscode from 'vscode';
import { jsonToToonSimple } from './codec';

export async function convertJsonToToonCommand(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('No active editor to convert from JSON.');
    return;
  }

  const text = getSelectedOrFullText(editor);
  try {
    const jsonValue = JSON.parse(text);
    const toonText = jsonToToonSimple(jsonValue);
    await openVirtualDocument(toonText, 'toon');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Failed to convert JSON to TOON: ${message}`);
  }
}

function getSelectedOrFullText(editor: vscode.TextEditor): string {
  return editor.selection && !editor.selection.isEmpty
    ? editor.document.getText(editor.selection)
    : editor.document.getText();
}

async function openVirtualDocument(content: string, language: string): Promise<void> {
  const doc = await vscode.workspace.openTextDocument({ content, language });
  await vscode.window.showTextDocument(doc, { preview: false });
}
