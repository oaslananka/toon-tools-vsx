import * as vscode from 'vscode';
import { parseToonBlocks } from '../parser/toonParser';

export class ToonCompletionProvider implements vscode.CompletionItemProvider {
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.ProviderResult<vscode.CompletionItem[]> {
    if (!isInsideFieldSection(document, position)) {
      return undefined;
    }

    const blocks = parseToonBlocks(document.getText());
    const suggestions = new Set<string>();
    blocks.forEach((block) => block.fields.forEach((field) => suggestions.add(field)));

    return Array.from(suggestions)
      .sort((a, b) => a.localeCompare(b))
      .map((field) => new vscode.CompletionItem(field, vscode.CompletionItemKind.Field));
  }
}

function isInsideFieldSection(document: vscode.TextDocument, position: vscode.Position): boolean {
  const lineText = document.lineAt(position.line).text;
  const openBrace = lineText.indexOf('{');
  const closeBrace = lineText.indexOf('}', openBrace + 1);
  if (openBrace === -1 || closeBrace === -1) {
    return false;
  }
  return position.character > openBrace && position.character < closeBrace;
}
