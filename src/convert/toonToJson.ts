import * as vscode from 'vscode';
import { toonToJsonSimple, type ToonJsonValueMode, type ToonToJsonOptions } from './codec';

export async function convertToonToJsonCommand(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('No active editor to convert from TOON.');
    return;
  }

  const text = getSelectedOrFullText(editor);
  try {
    const jsonValue = toonToJsonSimple(text, getToonToJsonOptions());
    const pretty = JSON.stringify(jsonValue, null, 2);
    await openVirtualDocument(pretty, 'json');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Failed to convert TOON to JSON: ${message}`);
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

function getToonToJsonOptions(): ToonToJsonOptions {
  const config = vscode.workspace.getConfiguration('toon');
  const valueMode = config.get<ToonJsonValueMode>('conversion.toJsonValueMode', 'strings');
  return { valueMode: valueMode === 'typed' ? 'typed' : 'strings' };
}
