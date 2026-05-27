import * as vscode from 'vscode';
import { parseToonBlocks } from '../parser/toonParser';

export class ToonFoldingProvider implements vscode.FoldingRangeProvider {
  provideFoldingRanges(document: vscode.TextDocument): vscode.FoldingRange[] {
    const blocks = parseToonBlocks(document.getText());
    return blocks
      .filter((block) => block.bodyEndLine > block.headerLine)
      .map(
        (block) =>
          new vscode.FoldingRange(
            block.headerLine,
            Math.max(block.bodyEndLine, block.headerLine),
            vscode.FoldingRangeKind.Region
          )
      );
  }
}
