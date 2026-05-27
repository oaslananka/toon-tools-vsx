import * as vscode from 'vscode';
import { parseToonBlocks } from '../parser/toonParser';
import type { ToonBlock, ToonTextRange } from '../parser/toonTypes';

export class ToonDefinitionProvider implements vscode.DefinitionProvider {
  provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.ProviderResult<vscode.Definition> {
    const blocks = parseToonBlocks(document.getText());
    for (const block of blocks) {
      if (!containsBlockLine(block, position.line)) {
        continue;
      }

      const targetRange = findDefinitionTarget(block, position);
      if (!targetRange) {
        continue;
      }

      return new vscode.Location(document.uri, toVsCodeRange(targetRange));
    }
    return undefined;
  }
}

function findDefinitionTarget(
  block: ToonBlock,
  position: vscode.Position
): ToonTextRange | undefined {
  if (position.line === block.headerLine) {
    const field = block.fieldTokens.find((candidate) =>
      containsPosition(candidate.range, position)
    );
    return field?.valueRange ?? block.nameRange;
  }

  const row = block.rows.find((candidate) => candidate.line === position.line);
  if (row) {
    const valueIndex = row.valueTokens.findIndex((value) =>
      containsPosition(value.range, position)
    );
    return block.fieldTokens[valueIndex]?.valueRange ?? block.nameRange;
  }

  const comment = block.comments.find((candidate) => candidate.line === position.line);
  if (comment) {
    return block.nameRange;
  }

  return undefined;
}

function containsBlockLine(block: ToonBlock, line: number): boolean {
  return line >= block.headerLine && line <= getBlockEndLine(block);
}

function getBlockEndLine(block: ToonBlock): number {
  return Math.max(
    block.headerLine,
    block.bodyEndLine,
    ...block.comments.map((comment) => comment.line)
  );
}

function containsPosition(range: ToonTextRange, position: vscode.Position): boolean {
  if (position.line < range.start.line || position.line > range.end.line) {
    return false;
  }

  if (position.line === range.start.line && position.character < range.start.character) {
    return false;
  }

  if (position.line === range.end.line && position.character >= range.end.character) {
    return false;
  }

  return true;
}

function toVsCodeRange(range: ToonTextRange): vscode.Range {
  return new vscode.Range(
    range.start.line,
    range.start.character,
    range.end.line,
    range.end.character
  );
}
