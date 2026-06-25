import { parseToonBlocks, parseToonDocument } from '../../src/parser/toonParser';

describe('parser malformed corpus', () => {
  it('recovers after a stray row and still parses later blocks', () => {
    const document = parseToonDocument('  stray\nusers[1]{id}:\n  1');

    expect(document.parseErrors).toEqual([
      expect.objectContaining({
        message: 'Row found before a TOON header.',
        severity: 'error',
      }),
    ]);
    expect(document.blocks).toHaveLength(1);
    expect(document.blocks[0].name).toBe('users');
    expect(document.blocks[0].rows[0].values).toEqual(['1']);
  });

  it('rejects malformed headers without creating a block', () => {
    const document = parseToonDocument('users[one]{id}:\n  1');

    expect(document.blocks).toEqual([]);
    expect(document.parseErrors).toEqual([
      expect.objectContaining({
        message: 'Malformed TOON header.',
        severity: 'error',
      }),
      expect.objectContaining({
        message: 'Row found before a TOON header.',
        severity: 'error',
      }),
    ]);
  });

  it('diagnoses duplicate block names case-insensitively', () => {
    const document = parseToonDocument('users[0]{}:\nUsers[0]{}:');

    expect(document.blocks.map((block) => block.name)).toEqual(['users', 'Users']);
    expect(document.parseErrors).toEqual([
      expect.objectContaining({
        message: 'Duplicate block name: Users',
        severity: 'error',
      }),
    ]);
  });

  it('diagnoses leading, middle, and trailing empty field names', () => {
    const sources = [
      'users[1]{,id}:\n  1',
      'users[1]{id,,name}:\n  1,Alice',
      'users[1]{id,}:\n  1',
    ];

    for (const source of sources) {
      const document = parseToonDocument(source);

      expect(document.parseErrors).toEqual([
        expect.objectContaining({
          message: 'Empty field name.',
          severity: 'error',
        }),
      ]);
      expect(document.blocks).toHaveLength(1);
    }
  });

  it('keeps inline hash characters as row data instead of comments', () => {
    const [block] = parseToonBlocks('users[1]{id,note}:\n  1,#not-a-comment');

    expect(block.rows[0].values).toEqual(['1', '#not-a-comment']);
    expect(block.comments).toEqual([]);
  });

  it('does not count comments and blank lines as rows', () => {
    const [block] = parseToonBlocks('users[2]{id}:\n\n  # first\n  1\n\n  # second\n  2');

    expect(block.rows).toHaveLength(2);
    expect(block.comments.map((comment) => comment.text)).toEqual(['first', 'second']);
  });

  it('preserves empty row values from leading, middle, and trailing commas', () => {
    const [block] = parseToonBlocks(
      'users[3]{id,name,note}:\n  ,Alice,missing id\n  2,,pending\n  3,Bob,'
    );

    expect(block.rows.map((row) => row.values)).toEqual([
      ['', 'Alice', 'missing id'],
      ['2', '', 'pending'],
      ['3', 'Bob', ''],
    ]);
  });

  it('reports unterminated quoted values while retaining the recoverable row', () => {
    const document = parseToonDocument('users[1]{id,name}:\n  1,"Alice');

    expect(document.blocks).toHaveLength(1);
    expect(document.blocks[0].rows[0].values).toEqual(['1', 'Alice']);
    expect(document.parseErrors).toEqual([
      expect.objectContaining({
        message: 'Unterminated quoted value.',
        severity: 'error',
      }),
    ]);
    expect(document.blocks[0].parseErrors).toEqual(document.parseErrors);
  });

  it('treats numeric and boolean-looking values as strings', () => {
    const [block] = parseToonBlocks('values[1]{id,active,count}:\n  1,true,42');

    expect(block.rows[0].values).toEqual(['1', 'true', '42']);
  });
});
