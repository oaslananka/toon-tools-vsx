import * as vscode from 'vscode';

export function createDocument(text: string, languageId = 'toon'): vscode.TextDocument {
  const lines = text.split(/\r?\n/);
  return {
    uri: vscode.Uri.file('/test/document.toon'),
    languageId,
    lineCount: lines.length,
    getText: () => text,
    lineAt: (line: number) => ({ text: lines[line] ?? '' }),
  } as vscode.TextDocument;
}
