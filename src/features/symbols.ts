import * as vscode from 'vscode';
import { parseToonBlocks } from '../parser/toonParser';

export class ToonSymbolProvider implements vscode.DocumentSymbolProvider {
  provideDocumentSymbols(document: vscode.TextDocument): vscode.DocumentSymbol[] {
    const blocks = parseToonBlocks(document.getText());
    return blocks.map((block) => createSymbol(block, document));
  }
}

function createSymbol(
  block: ReturnType<typeof parseToonBlocks>[number],
  document: vscode.TextDocument
): vscode.DocumentSymbol {
  const headerRange = new vscode.Range(
    block.headerLine,
    0,
    block.headerLine,
    document.lineAt(block.headerLine).text.length
  );
  const bodyEndLine = Math.max(block.bodyEndLine, block.headerLine);
  const bodyLineText = document.lineAt(bodyEndLine).text;
  const fullRange = new vscode.Range(block.headerLine, 0, bodyEndLine, bodyLineText.length);

  const label = `${block.name} (${block.fields.join(', ')})`;
  return new vscode.DocumentSymbol(
    label,
    'TOON block',
    vscode.SymbolKind.Object,
    fullRange,
    headerRange
  );
}
