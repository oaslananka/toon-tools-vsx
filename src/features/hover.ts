import * as vscode from 'vscode';
import { parseToonBlocks } from '../parser/toonParser';
import type { ToonTextRange } from '../parser/toonTypes';

export class ToonHoverProvider implements vscode.HoverProvider {
  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.ProviderResult<vscode.Hover> {
    const blocks = parseToonBlocks(document.getText());
    for (const block of blocks) {
      if (position.line === block.headerLine) {
        const fieldIndex = block.fieldTokens.findIndex((field) =>
          containsPosition(field.range, position)
        );
        const field = block.fieldTokens[fieldIndex];
        if (field) {
          return createFieldHover(
            field.name,
            fieldIndex,
            block.fieldTokens.length,
            field.valueRange
          );
        }

        const md = new vscode.MarkdownString();
        md.appendMarkdown(`**Block:** \`${block.name}\`  \n`);
        md.appendMarkdown(`**Declared rows:** ${block.rowCountDeclared}  \n`);
        md.appendMarkdown(`**Actual rows:** ${block.rows.length}  \n`);
        md.appendMarkdown(
          `**Fields (${block.fields.length}):** ${block.fields
            .map((field) => `\`${field}\``)
            .join(', ')}`
        );
        return new vscode.Hover(md);
      }

      const row = block.rows.find((candidate) => candidate.line === position.line);
      if (row) {
        const valueIndex = row.valueTokens.findIndex((value) =>
          containsPosition(value.range, position)
        );
        const field = block.fieldTokens[valueIndex];
        if (field) {
          return createFieldHover(
            field.name,
            valueIndex,
            block.fieldTokens.length,
            row.valueTokens[valueIndex].valueRange
          );
        }
      }
    }
    return undefined;
  }
}

function createFieldHover(
  fieldName: string,
  index: number,
  total: number,
  range: ToonTextRange
): vscode.Hover {
  const md = new vscode.MarkdownString();
  md.appendMarkdown(`**Field:** \`${fieldName}\` (column ${index + 1} of ${total})`);
  return new vscode.Hover(md, toVsCodeRange(range));
}

function containsPosition(range: ToonTextRange, position: vscode.Position): boolean {
  return (
    position.line === range.start.line &&
    position.character >= range.start.character &&
    position.character < range.end.character
  );
}

function toVsCodeRange(range: ToonTextRange): vscode.Range {
  return new vscode.Range(
    range.start.line,
    range.start.character,
    range.end.line,
    range.end.character
  );
}
