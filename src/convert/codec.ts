import { parseToonBlocks } from '../parser/toonParser';
import { ToonBlock, ToonValue } from '../parser/toonTypes';

interface JsonBlock {
  name: string;
  rows: Record<string, unknown>[];
}

export type ToonJsonValueMode = 'strings' | 'typed';

export interface ToonToJsonOptions {
  valueMode?: ToonJsonValueMode;
}

const TOON_IDENTIFIER_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/;
const JSON_NUMBER_LITERAL_REGEX = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/;

export function jsonToToonSimple(input: unknown, defaultBlockName = 'data'): string {
  const blocks = normalizeJsonToBlocks(input, defaultBlockName);
  if (blocks.length === 0) {
    throw new Error('Nothing to convert to TOON.');
  }
  return blocks.map(renderBlock).join('\n\n');
}

export function toonToJsonSimple(
  text: string,
  options: ToonToJsonOptions = {}
): Record<string, unknown> {
  const blocks = parseToonBlocks(text);
  return blocksToJsonObject(blocks, options);
}

export function blocksToJsonObject(
  blocks: ToonBlock[],
  options: ToonToJsonOptions = {}
): Record<string, unknown> {
  const valueMode = options.valueMode ?? 'strings';
  const result: Record<string, unknown> = {};
  for (const block of blocks) {
    result[block.name] = block.rows.map((row) => {
      const obj: Record<string, unknown> = {};
      block.fields.forEach((field, index) => {
        obj[field] = parseJsonValue(row.valueTokens[index], valueMode);
      });
      return obj;
    });
  }
  return result;
}

/**
 * Converts a named TOON block to CSV format.
 * Returns null if the block name is not found.
 */
export function toonBlockToCsv(text: string, blockName: string): string | null {
  const blocks = parseToonBlocks(text);
  const block = blocks.find((candidate) => candidate.name === blockName);
  if (!block) {
    return null;
  }

  const header = block.fields.map(escapeCsv).join(',');
  const rows = block.rows.map((row) => {
    const values = [...row.values];
    while (values.length < block.fields.length) {
      values.push('');
    }
    return values.map(escapeCsv).join(',');
  });
  return [header, ...rows].join('\n');
}

function normalizeJsonToBlocks(input: unknown, defaultName: string): JsonBlock[] {
  if (Array.isArray(input)) {
    validateToonIdentifier(defaultName, 'block');
    return [
      {
        name: defaultName,
        rows: ensureRowsOfObjects(input, 'root array'),
      },
    ];
  }

  if (isPlainObject(input)) {
    const blocks = Object.entries(input as Record<string, unknown>)
      .filter(([, value]) => Array.isArray(value))
      .map(([name, value]) => {
        validateToonIdentifier(name, 'block');
        return { name, rows: ensureRowsOfObjects(value as unknown[], name) };
      });

    if (blocks.length > 0) {
      return blocks;
    }
  }

  throw new Error('JSON root must be an array or an object containing arrays of objects.');
}

function ensureRowsOfObjects(value: unknown[], path: string): Record<string, unknown>[] {
  return value.map((item, index) => {
    if (!isPlainObject(item)) {
      throw new Error(`Element at ${path}[${index}] is not an object.`);
    }
    return item as Record<string, unknown>;
  });
}

function renderBlock(block: JsonBlock): string {
  const fields = collectFields(block.rows);
  const header = `${block.name}[${block.rows.length}]{${fields.join(',')}}:`;
  if (block.rows.length === 0) {
    return header;
  }

  const rows = block.rows.map((row) => {
    const values = fields.map((field) => formatValue(row[field]));
    return `  ${values.join(',')}`;
  });
  return `${header}\n${rows.join('\n')}`;
}

function collectFields(rows: Record<string, unknown>[]): string[] {
  if (rows.length === 0) {
    return [];
  }
  const ordered = Object.keys(rows[0]);
  ordered.forEach((key) => validateToonIdentifier(key, 'field'));
  const seen = new Set(ordered);
  rows.slice(1).forEach((row) => {
    Object.keys(row).forEach((key) => {
      validateToonIdentifier(key, 'field');
      if (!seen.has(key)) {
        seen.add(key);
        ordered.push(key);
      }
    });
  });
  return ordered;
}

function validateToonIdentifier(value: string, kind: 'block' | 'field'): void {
  if (!TOON_IDENTIFIER_REGEX.test(value)) {
    throw new Error(`Invalid TOON ${kind} name '${value}'.`);
  }
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return quoteToonValue(text.replace(/\r?\n/g, ' '));
}

function quoteToonValue(value: string): string {
  return value.includes(',') || value.includes('"') || /^\s|\s$/.test(value)
    ? `"${value.replace(/"/g, '""')}"`
    : value;
}

function parseJsonValue(token: ToonValue | undefined, valueMode: ToonJsonValueMode): unknown {
  if (!token) {
    return null;
  }

  if (valueMode === 'strings' || isQuotedValue(token)) {
    return token.value;
  }

  if (token.value === 'true') {
    return true;
  }
  if (token.value === 'false') {
    return false;
  }
  if (token.value === 'null') {
    return null;
  }
  if (JSON_NUMBER_LITERAL_REGEX.test(token.value)) {
    return Number(token.value);
  }

  return token.value;
}

function isQuotedValue(token: ToonValue): boolean {
  return (
    token.range.start.character < token.valueRange.start.character ||
    token.range.end.character > token.valueRange.end.character
  );
}

function escapeCsv(value: string): string {
  return value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')
    ? `"${value.replace(/"/g, '""')}"`
    : value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
