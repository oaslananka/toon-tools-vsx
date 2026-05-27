import * as vscode from 'vscode';
import { parseToonBlocks } from '../parser/toonParser';
import { ToonBlock, ToonRow, ToonValue } from '../parser/toonTypes';

export interface FormatToonOptions {
  indentWidth?: 2 | 4;
  fieldSpacing?: 'compact' | 'spaced';
}

export class ToonFormattingProvider implements vscode.DocumentFormattingEditProvider {
  provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
    if (document.lineCount === 0) {
      return [];
    }

    const config = vscode.workspace.getConfiguration('toon');
    const indentWidth = config.get<2 | 4>('formatter.indentWidth', 2);
    const fieldSpacing = config.get<'compact' | 'spaced'>('formatter.fieldSpacing', 'compact');
    const lastLine = document.lineAt(document.lineCount - 1);
    const fullRange = new vscode.Range(0, 0, document.lineCount - 1, lastLine.text.length);
    const formatted = formatToonDocument(document.getText(), { indentWidth, fieldSpacing });
    return [vscode.TextEdit.replace(fullRange, formatted)];
  }
}

export function formatToonDocument(text: string, options: FormatToonOptions = {}): string {
  const blocks = parseToonBlocks(text);
  if (blocks.length === 0) {
    return text.trimEnd();
  }

  const lines = text.split(/\r?\n/);
  const blockByHeader = new Map<number, ToonBlock>();
  blocks.forEach((block) => blockByHeader.set(block.headerLine, block));

  const formattedLines: string[] = [];
  let currentLine = 0;
  let lastSegmentWasBlock = false;

  while (currentLine < lines.length) {
    const block = blockByHeader.get(currentLine);
    if (block) {
      if (lastSegmentWasBlock && formattedLines.length > 0 && lastValue(formattedLines) !== '') {
        formattedLines.push('');
      }

      const blockLines = formatBlock(block, lines, options).split('\n');
      formattedLines.push(...blockLines);
      lastSegmentWasBlock = !lastValue(blockLines)?.trimStart().startsWith('#');
      currentLine = getBlockEndLine(block) + 1;
      continue;
    }

    const trimmed = lines[currentLine].trim();
    if (trimmed.startsWith('#') || !trimmed) {
      formattedLines.push(lines[currentLine].trimEnd());
    } else {
      formattedLines.push(lines[currentLine]);
    }
    lastSegmentWasBlock = false;
    currentLine += 1;
  }

  return formattedLines.join('\n').trimEnd();
}

function formatBlock(block: ToonBlock, sourceLines: string[], options: FormatToonOptions): string {
  const indent = ' '.repeat(options.indentWidth ?? 2);
  const separator = options.fieldSpacing === 'spaced' ? ', ' : ',';
  const header = `${block.name}[${block.rowCountDeclared}]{${block.fieldTokens.map((field) => field.name).join(separator)}}:`;
  const lines = [header];
  const rowByLine = new Map(block.rows.map((row) => [row.line, row]));
  const commentByLine = new Map(block.comments.map((comment) => [comment.line, comment]));

  for (
    let lineNumber = block.headerLine + 1;
    lineNumber <= getBlockEndLine(block);
    lineNumber += 1
  ) {
    const row = rowByLine.get(lineNumber);
    if (row) {
      lines.push(`${indent}${formatRow(row)}`);
      continue;
    }

    const comment = commentByLine.get(lineNumber);
    if (comment) {
      lines.push(formatComment(sourceLines[lineNumber]));
      continue;
    }

    lines.push('');
  }

  return lines.join('\n');
}

function formatRow(row: ToonRow): string {
  return row.valueTokens.map(formatToonValue).join(',');
}

function formatComment(sourceLine: string | undefined): string {
  return (sourceLine ?? '').trimEnd();
}

function formatToonValue(token: ToonValue): string {
  const value = token.value;
  return value.includes(',') || value.includes('"') || /^\s|\s$/.test(value)
    ? `"${value.replace(/"/g, '""')}"`
    : value;
}

function getBlockEndLine(block: ToonBlock): number {
  return Math.max(
    block.headerLine,
    block.bodyEndLine,
    ...block.comments.map((comment) => comment.line)
  );
}

function lastValue(values: string[]): string | undefined {
  return values[values.length - 1];
}
