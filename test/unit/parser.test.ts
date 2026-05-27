import {
  parseToonBlocks,
  parseToonDocument,
  parseToonValueTokens,
} from '../../src/parser/toonParser';

describe('parseToonBlocks', () => {
  it('parses a single block with correct row count', () => {
    const [block] = parseToonBlocks('users[2]{id,name}:\n  1,Alice\n  2,Bob');

    expect(block.name).toBe('users');
    expect(block.rowCountDeclared).toBe(2);
    expect(block.fields).toEqual(['id', 'name']);
    expect(block.rows).toHaveLength(2);
  });

  it('parses multiple blocks in sequence', () => {
    const blocks = parseToonBlocks('users[1]{id}:\n  1\nroles[1]{name}:\n  admin');

    expect(blocks.map((block) => block.name)).toEqual(['users', 'roles']);
  });

  it('parses a block with no rows', () => {
    const [block] = parseToonBlocks('empty[0]{}:');

    expect(block.rows).toEqual([]);
    expect(block.bodyStartLine).toBe(1);
    expect(block.bodyEndLine).toBe(0);
  });

  it('ignores commented lines', () => {
    const [block] = parseToonBlocks('# top\nusers[1]{id,name}:\n  # note\n  1,Alice');

    expect(block.rows).toHaveLength(1);
    expect(block.rows[0].values).toEqual(['1', 'Alice']);
  });

  it('handles CRLF line endings', () => {
    const [block] = parseToonBlocks('users[1]{id}\r\n  1'.replace('{id}', '{id}:'));

    expect(block.rows[0].line).toBe(1);
  });

  it('handles empty documents', () => {
    expect(parseToonBlocks('')).toEqual([]);
  });

  it('ignores malformed headers before any block', () => {
    expect(parseToonBlocks('users[one]{id}:\n  1')).toEqual([]);
  });

  it('assigns body start and end lines from parsed rows', () => {
    const [block] = parseToonBlocks('users[2]{id}:\n\n  1\n  2');

    expect(block.bodyStartLine).toBe(2);
    expect(block.bodyEndLine).toBe(3);
  });

  it('parses quoted values containing commas and escaped quotes', () => {
    const [block] = parseToonBlocks('users[1]{id,name}:\n  1,"Bob, ""The Builder"""');

    expect(block.rows[0].values).toEqual(['1', 'Bob, "The Builder"']);
  });

  it('returns zero-based spans for headers and fields', () => {
    const [block] = parseToonBlocks('users[1]{id,name}:\n  1,"Ada, Lovelace"');

    expect(block.headerRange).toEqual({
      start: { line: 0, character: 0 },
      end: { line: 0, character: 18 },
    });
    expect(block.nameRange).toEqual({
      start: { line: 0, character: 0 },
      end: { line: 0, character: 5 },
    });
    expect(block.rowCountRange).toEqual({
      start: { line: 0, character: 6 },
      end: { line: 0, character: 7 },
    });
    expect(block.fieldsRange).toEqual({
      start: { line: 0, character: 9 },
      end: { line: 0, character: 16 },
    });
    expect(block.fieldTokens).toEqual([
      {
        name: 'id',
        range: {
          start: { line: 0, character: 9 },
          end: { line: 0, character: 11 },
        },
        valueRange: {
          start: { line: 0, character: 9 },
          end: { line: 0, character: 11 },
        },
      },
      {
        name: 'name',
        range: {
          start: { line: 0, character: 12 },
          end: { line: 0, character: 16 },
        },
        valueRange: {
          start: { line: 0, character: 12 },
          end: { line: 0, character: 16 },
        },
      },
    ]);
  });

  it('returns row value spans without splitting quoted commas', () => {
    const [block] = parseToonBlocks('users[1]{id,name}:\n  1,"Ada, Lovelace"');
    const [id, name] = block.rows[0].valueTokens;

    expect(block.rows[0].range).toEqual({
      start: { line: 1, character: 2 },
      end: { line: 1, character: 19 },
    });
    expect(id).toEqual({
      value: '1',
      range: {
        start: { line: 1, character: 2 },
        end: { line: 1, character: 3 },
      },
      valueRange: {
        start: { line: 1, character: 2 },
        end: { line: 1, character: 3 },
      },
    });
    expect(name).toEqual({
      value: 'Ada, Lovelace',
      range: {
        start: { line: 1, character: 4 },
        end: { line: 1, character: 19 },
      },
      valueRange: {
        start: { line: 1, character: 5 },
        end: { line: 1, character: 18 },
      },
    });
  });

  it('tracks comment spans inside a block', () => {
    const [block] = parseToonBlocks('users[1]{id}:\n  # note\n  1');

    expect(block.comments).toEqual([
      {
        line: 1,
        text: 'note',
        range: {
          start: { line: 1, character: 2 },
          end: { line: 1, character: 8 },
        },
      },
    ]);
  });

  it('returns a parse error for malformed headers', () => {
    const document = parseToonDocument('users[one]{id}:');

    expect(document.blocks).toEqual([]);
    expect(document.parseErrors).toEqual([
      {
        message: 'Malformed TOON header.',
        severity: 'error',
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 15 },
        },
      },
    ]);
  });

  it('returns a parse error for stray rows', () => {
    const document = parseToonDocument('  1,Alice');

    expect(document.blocks).toEqual([]);
    expect(document.parseErrors).toEqual([
      {
        message: 'Row found before a TOON header.',
        severity: 'error',
        range: {
          start: { line: 0, character: 2 },
          end: { line: 0, character: 9 },
        },
      },
    ]);
  });

  it('returns a parse error for unterminated quoted values', () => {
    const document = parseToonDocument('users[1]{id,name}:\n  1,"Alice');

    expect(document.parseErrors).toEqual([
      {
        message: 'Unterminated quoted value.',
        severity: 'error',
        range: {
          start: { line: 1, character: 4 },
          end: { line: 1, character: 10 },
        },
      },
    ]);
    expect(document.blocks[0].parseErrors).toEqual(document.parseErrors);
  });

  it('returns a parse error for duplicate blocks', () => {
    const document = parseToonDocument('users[0]{}:\nusers[0]{}:');

    expect(document.parseErrors).toEqual([
      {
        message: 'Duplicate block name: users',
        severity: 'error',
        range: {
          start: { line: 1, character: 0 },
          end: { line: 1, character: 5 },
        },
      },
    ]);
    expect(document.blocks).toHaveLength(2);
    expect(document.blocks[1].parseErrors).toEqual(document.parseErrors);
  });

  it('returns a parse error for empty field names', () => {
    const document = parseToonDocument('users[1]{id,,name}:\n  1,Alice');

    expect(document.blocks[0].fields).toEqual(['id', 'name']);
    expect(document.parseErrors).toEqual([
      {
        message: 'Empty field name.',
        severity: 'error',
        range: {
          start: { line: 0, character: 12 },
          end: { line: 0, character: 12 },
        },
      },
    ]);
    expect(document.blocks[0].parseErrors).toEqual(document.parseErrors);
  });
});

describe('parseToonValueTokens', () => {
  it('preserves value tokens for quoted commas', () => {
    expect(parseToonValueTokens('1,"Ada, Lovelace"', 3, 4)).toEqual([
      {
        value: '1',
        range: {
          start: { line: 3, character: 4 },
          end: { line: 3, character: 5 },
        },
        valueRange: {
          start: { line: 3, character: 4 },
          end: { line: 3, character: 5 },
        },
      },
      {
        value: 'Ada, Lovelace',
        range: {
          start: { line: 3, character: 6 },
          end: { line: 3, character: 21 },
        },
        valueRange: {
          start: { line: 3, character: 7 },
          end: { line: 3, character: 20 },
        },
      },
    ]);
  });
});
