import {
  ToonBlock,
  ToonComment,
  ToonDocument,
  ToonField,
  ToonParseError,
  ToonRow,
  ToonTextRange,
  ToonValue,
} from './toonTypes';

const HEADER_REGEX = /^([A-Za-z_][A-Za-z0-9_]*)\[(\d+)\]\{([^}]*)\}:\s*$/;

interface HeaderParseResult {
  name: string;
  rowCountDeclared: number;
  fields: string[];
  fieldTokens: ToonField[];
  headerRange: ToonTextRange;
  nameRange: ToonTextRange;
  rowCountRange: ToonTextRange;
  fieldsRange: ToonTextRange;
  parseErrors: ToonParseError[];
}

interface FieldParseResult {
  fields: ToonField[];
  parseErrors: ToonParseError[];
}

interface TrimmedLine {
  start: number;
  end: number;
  trimmed: string;
}

interface ValueParseResult {
  values: ToonValue[];
  parseErrors: ToonParseError[];
}

export function parseToonBlocks(text: string): ToonBlock[] {
  return parseToonDocument(text).blocks;
}

const documentCache = new Map<string, ToonDocument>();

export function parseToonDocument(text: string): ToonDocument {
  const cached = documentCache.get(text);
  if (cached) {
    return cached;
  }

  const lines = text.split(/\r?\n/);
  const document: ToonDocument = {
    blocks: [],
    comments: [],
    parseErrors: [],
  };
  const seenBlockNames = new Set<string>();
  let currentBlock: ToonBlock | undefined;

  const pushCurrent = (): void => {
    if (currentBlock) {
      if (currentBlock.bodyStartLine === -1) {
        currentBlock.bodyStartLine = currentBlock.headerLine + 1;
      }
      if (currentBlock.bodyEndLine === -1) {
        currentBlock.bodyEndLine = currentBlock.headerLine;
      }
      document.blocks.push(currentBlock);
      currentBlock = undefined;
    }
  };

  const pushParseError = (error: ToonParseError, block?: ToonBlock): void => {
    document.parseErrors.push(error);
    block?.parseErrors.push(error);
  };

  lines.forEach((lineText, lineNumber) => {
    const trimmedLine = getTrimmedLine(lineText);
    if (!trimmedLine) {
      return;
    }

    if (trimmedLine.trimmed.startsWith('#')) {
      const comment: ToonComment = {
        line: lineNumber,
        text: trimmedLine.trimmed.slice(1).trim(),
        range: rangeForLine(lineNumber, trimmedLine.start, trimmedLine.end),
      };
      document.comments.push(comment);
      if (currentBlock) {
        currentBlock.comments.push(comment);
      }
      return;
    }

    const header = tryParseHeader(lineText, lineNumber);
    if (header) {
      pushCurrent();
      const block: ToonBlock = {
        name: header.name,
        rowCountDeclared: header.rowCountDeclared,
        fields: header.fields,
        fieldTokens: header.fieldTokens,
        headerLine: lineNumber,
        headerRange: header.headerRange,
        nameRange: header.nameRange,
        rowCountRange: header.rowCountRange,
        fieldsRange: header.fieldsRange,
        bodyStartLine: -1,
        bodyEndLine: -1,
        rows: [],
        comments: [],
        parseErrors: [],
      };
      currentBlock = block;
      const normalizedName = header.name.toLowerCase();
      if (seenBlockNames.has(normalizedName)) {
        pushParseError(
          {
            message: `Duplicate block name: ${header.name}`,
            severity: 'error',
            range: header.nameRange,
          },
          block
        );
      } else {
        seenBlockNames.add(normalizedName);
      }
      header.parseErrors.forEach((error) => pushParseError(error, block));
      return;
    }

    if (looksLikeMalformedHeader(trimmedLine.trimmed)) {
      document.parseErrors.push({
        message: 'Malformed TOON header.',
        severity: 'error',
        range: rangeForLine(lineNumber, trimmedLine.start, trimmedLine.end),
      });
      return;
    }

    if (!currentBlock) {
      document.parseErrors.push({
        message: 'Row found before a TOON header.',
        severity: 'error',
        range: rangeForLine(lineNumber, trimmedLine.start, trimmedLine.end),
      });
      return;
    }

    const parsedValues = parseToonValueLine(trimmedLine.trimmed, lineNumber, trimmedLine.start);
    const row: ToonRow = {
      line: lineNumber,
      values: parsedValues.values.map((token) => token.value),
      valueTokens: parsedValues.values,
      range: rangeForLine(lineNumber, trimmedLine.start, trimmedLine.end),
    };
    currentBlock.rows.push(row);
    parsedValues.parseErrors.forEach((error) => pushParseError(error, currentBlock));
    if (currentBlock.bodyStartLine === -1) {
      currentBlock.bodyStartLine = lineNumber;
    }
    currentBlock.bodyEndLine = lineNumber;
  });

  pushCurrent();

  if (documentCache.size >= 10) {
    const firstKey = documentCache.keys().next().value;
    if (firstKey !== undefined) {
      documentCache.delete(firstKey);
    }
  }
  documentCache.set(text, document);

  return document;
}

export function parseToonValueTokens(
  source: string,
  lineNumber = 0,
  startCharacter = 0
): ToonValue[] {
  return parseToonValueLine(source, lineNumber, startCharacter).values;
}

function parseToonValueLine(
  source: string,
  lineNumber: number,
  startCharacter: number
): ValueParseResult {
  const values: ToonValue[] = [];
  const parseErrors: ToonParseError[] = [];
  let current = '';
  let inQuote = false;
  let quoteStart: number | undefined;
  let segmentStart = 0;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];

    if (char === '"') {
      if (inQuote && source[index + 1] === '"') {
        current += '"';
        index += 1;
        continue;
      }
      quoteStart = inQuote ? undefined : index;
      inQuote = !inQuote;
      continue;
    }

    if (char === ',' && !inQuote) {
      values.push(
        createValueToken(source, segmentStart, index, current, lineNumber, startCharacter)
      );
      current = '';
      segmentStart = index + 1;
      continue;
    }

    current += char;
  }

  values.push(
    createValueToken(source, segmentStart, source.length, current, lineNumber, startCharacter)
  );
  if (inQuote) {
    parseErrors.push({
      message: 'Unterminated quoted value.',
      severity: 'error',
      range: rangeForLine(
        lineNumber,
        startCharacter + (quoteStart ?? segmentStart),
        startCharacter + source.length
      ),
    });
  }

  return {
    values,
    parseErrors,
  };
}

function tryParseHeader(lineText: string, lineNumber: number): HeaderParseResult | undefined {
  const trimmedLine = getTrimmedLine(lineText);
  if (!trimmedLine) {
    return undefined;
  }

  const match = HEADER_REGEX.exec(trimmedLine.trimmed);
  if (!match) {
    return undefined;
  }

  const [, name, rowCount, fieldsSection] = match;
  const openBracket = trimmedLine.trimmed.indexOf('[');
  const closeBracket = trimmedLine.trimmed.indexOf(']', openBracket + 1);
  const openBrace = trimmedLine.trimmed.indexOf('{', closeBracket + 1);
  const closeBrace = trimmedLine.trimmed.indexOf('}', openBrace + 1);
  const fieldStartCharacter = trimmedLine.start + openBrace + 1;
  const parsedFields = splitFieldsWithSpans(fieldsSection, lineNumber, fieldStartCharacter);

  return {
    name,
    rowCountDeclared: Number.parseInt(rowCount, 10),
    fields: parsedFields.fields.map((field) => field.name),
    fieldTokens: parsedFields.fields,
    headerRange: rangeForLine(lineNumber, trimmedLine.start, trimmedLine.end),
    nameRange: rangeForLine(lineNumber, trimmedLine.start, trimmedLine.start + name.length),
    rowCountRange: rangeForLine(
      lineNumber,
      trimmedLine.start + openBracket + 1,
      trimmedLine.start + closeBracket
    ),
    fieldsRange: rangeForLine(lineNumber, fieldStartCharacter, trimmedLine.start + closeBrace),
    parseErrors: parsedFields.parseErrors,
  };
}

function splitFieldsWithSpans(
  source: string,
  lineNumber: number,
  startCharacter: number
): FieldParseResult {
  const fields: ToonField[] = [];
  const parseErrors: ToonParseError[] = [];
  let segmentStart = 0;

  for (let index = 0; index <= source.length; index += 1) {
    if (index !== source.length && source[index] !== ',') {
      continue;
    }

    const bounds = getTrimmedSegment(source, segmentStart, index);
    if (bounds) {
      const range = rangeForLine(
        lineNumber,
        startCharacter + bounds.start,
        startCharacter + bounds.end
      );
      fields.push({
        name: source.slice(bounds.start, bounds.end),
        range,
        valueRange: range,
      });
    } else if (source.length > 0) {
      parseErrors.push({
        message: 'Empty field name.',
        severity: 'error',
        range: rangeForLine(lineNumber, startCharacter + segmentStart, startCharacter + index),
      });
    }

    segmentStart = index + 1;
  }

  return {
    fields,
    parseErrors,
  };
}

function createValueToken(
  source: string,
  segmentStart: number,
  segmentEnd: number,
  value: string,
  lineNumber: number,
  startCharacter: number
): ToonValue {
  const bounds = getTrimmedSegment(source, segmentStart, segmentEnd) ?? {
    start: segmentStart,
    end: segmentEnd,
  };
  const range = rangeForLine(
    lineNumber,
    startCharacter + bounds.start,
    startCharacter + bounds.end
  );
  const valueRangeBounds = getValueRangeBounds(source, bounds.start, bounds.end);

  return {
    value: value.trim(),
    range,
    valueRange: rangeForLine(
      lineNumber,
      startCharacter + valueRangeBounds.start,
      startCharacter + valueRangeBounds.end
    ),
  };
}

function getValueRangeBounds(
  source: string,
  segmentStart: number,
  segmentEnd: number
): { start: number; end: number } {
  if (
    segmentEnd - segmentStart >= 2 &&
    source[segmentStart] === '"' &&
    source[segmentEnd - 1] === '"'
  ) {
    return {
      start: segmentStart + 1,
      end: segmentEnd - 1,
    };
  }

  return {
    start: segmentStart,
    end: segmentEnd,
  };
}

function getTrimmedLine(lineText: string): TrimmedLine | undefined {
  const start = lineText.search(/\S/);
  if (start === -1) {
    return undefined;
  }

  const trailingWhitespace = /\s*$/.exec(lineText);
  const end = trailingWhitespace ? trailingWhitespace.index : lineText.length;
  return {
    start,
    end,
    trimmed: lineText.slice(start, end),
  };
}

function looksLikeMalformedHeader(source: string): boolean {
  return (
    source.endsWith(':') && (source.includes('[') || source.includes('{') || source.includes('}'))
  );
}

function getTrimmedSegment(
  source: string,
  segmentStart: number,
  segmentEnd: number
): { start: number; end: number } | undefined {
  let start = segmentStart;
  let end = segmentEnd;

  while (start < end && /\s/.test(source[start])) {
    start += 1;
  }

  while (end > start && /\s/.test(source[end - 1])) {
    end -= 1;
  }

  if (start === end) {
    return undefined;
  }

  return { start, end };
}

function rangeForLine(line: number, start: number, end: number): ToonTextRange {
  return {
    start: { line, character: start },
    end: { line, character: end },
  };
}
