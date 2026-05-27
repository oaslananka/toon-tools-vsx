import * as vscode from 'vscode';
import { parseToonBlocks } from '../parser/toonParser';
import type { ToonTextRange } from '../parser/toonTypes';

const TOON_IDENTIFIER_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/;

export class ToonRenameProvider implements vscode.RenameProvider {
  prepareRename(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.ProviderResult<vscode.Range | { range: vscode.Range; placeholder: string }> {
    const token = extractTokenAt(document, position);
    if (!token) {
      return Promise.reject(new Error('No renameable token at cursor.'));
    }
    return { range: token.range, placeholder: token.text };
  }

  provideRenameEdits(
    document: vscode.TextDocument,
    position: vscode.Position,
    newName: string
  ): vscode.ProviderResult<vscode.WorkspaceEdit> {
    if (!TOON_IDENTIFIER_REGEX.test(newName)) {
      return Promise.reject(new Error('Invalid TOON identifier.'));
    }

    const token = extractTokenAt(document, position);
    if (!token) {
      return undefined;
    }

    const edit = new vscode.WorkspaceEdit();
    const blocks = parseToonBlocks(document.getText());

    for (const block of blocks) {
      if (token.kind === 'blockName' && block.name === token.text) {
        edit.replace(document.uri, toVsCodeRange(block.nameRange), newName);
      }

      if (token.kind === 'fieldName' && block.headerLine === token.blockHeaderLine) {
        for (const field of block.fieldTokens) {
          if (field.name === token.text) {
            edit.replace(document.uri, toVsCodeRange(field.valueRange), newName);
          }
        }
      }
    }

    return edit;
  }
}

interface RenameToken {
  text: string;
  range: vscode.Range;
  blockHeaderLine: number;
  kind: 'blockName' | 'fieldName';
}

function extractTokenAt(
  document: vscode.TextDocument,
  position: vscode.Position
): RenameToken | undefined {
  const blocks = parseToonBlocks(document.getText());

  for (const block of blocks) {
    if (block.headerLine !== position.line) {
      continue;
    }

    if (containsPosition(block.nameRange, position)) {
      return {
        text: block.name,
        range: toVsCodeRange(block.nameRange),
        blockHeaderLine: block.headerLine,
        kind: 'blockName',
      };
    }

    for (const field of block.fieldTokens) {
      if (containsPosition(field.range, position)) {
        return {
          text: field.name,
          range: toVsCodeRange(field.valueRange),
          blockHeaderLine: block.headerLine,
          kind: 'fieldName',
        };
      }
    }
  }

  return undefined;
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
