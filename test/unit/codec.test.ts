import {
  blocksToJsonObject,
  jsonToToonSimple,
  toonBlockToCsv,
  toonToJsonSimple,
} from '../../src/convert/codec';
import { parseToonBlocks } from '../../src/parser/toonParser';

describe('codec', () => {
  it('converts an array of objects to a TOON block', () => {
    const toon = jsonToToonSimple([{ id: 1, name: 'Alice' }]);

    expect(toon).toBe('data[1]{id,name}:\n  1,Alice');
  });

  it('converts an object of arrays to multiple blocks', () => {
    const toon = jsonToToonSimple({
      users: [{ id: 1 }],
      roles: [{ name: 'admin' }],
    });

    expect(toon).toContain('users[1]{id}:');
    expect(toon).toContain('roles[1]{name}:');
  });

  it('roundtrips TOON to JSON object keys', () => {
    const json = toonToJsonSimple('users[1]{id,name}:\n  1,Alice');

    expect(Object.keys(json)).toEqual(['users']);
    expect(json.users).toEqual([{ id: '1', name: 'Alice' }]);
  });

  it('keeps string-only TOON to JSON conversion as the default', () => {
    const json = toonToJsonSimple('items[1]{count,active,deleted,note}:\n  42,true,null,Alice');

    expect(json.items).toEqual([
      {
        count: '42',
        active: 'true',
        deleted: 'null',
        note: 'Alice',
      },
    ]);
  });

  it('infers unquoted primitive values in typed mode', () => {
    const json = toonToJsonSimple(
      'items[2]{count,ratio,active,deleted,note}:\n  42,-3.5,true,null,Alice\n  1e3,0,false,null,Bob',
      { valueMode: 'typed' }
    );

    expect(json.items).toEqual([
      {
        count: 42,
        ratio: -3.5,
        active: true,
        deleted: null,
        note: 'Alice',
      },
      {
        count: 1000,
        ratio: 0,
        active: false,
        deleted: null,
        note: 'Bob',
      },
    ]);
  });

  it('keeps quoted primitive-like values as strings in typed mode', () => {
    const json = toonToJsonSimple(
      'items[1]{count,active,deleted,name}:\n  "42","true","null","Alice"',
      { valueMode: 'typed' }
    );

    expect(json.items).toEqual([
      {
        count: '42',
        active: 'true',
        deleted: 'null',
        name: 'Alice',
      },
    ]);
  });

  it('leaves non-JSON number forms as strings in typed mode', () => {
    const json = toonToJsonSimple('items[1]{code,hex,word}:\n  001,0x10,False', {
      valueMode: 'typed',
    });

    expect(json.items).toEqual([{ code: '001', hex: '0x10', word: 'False' }]);
  });

  it('exports CSV with escaped comma values', () => {
    const csv = toonBlockToCsv('users[1]{id,name}:\n  1,"Bob, Jr."', 'users');

    expect(csv).toBe('id,name\n1,"Bob, Jr."');
  });

  it('exports CSV with quoted values and empty cells', () => {
    const csv = toonBlockToCsv(
      'users[2]{id,name,note,empty}:\n  1,"Bob, Jr.","said ""hi""",\n  2,Alice,plain,',
      'users'
    );

    expect(csv).toBe('id,name,note,empty\n1,"Bob, Jr.","said ""hi""",\n2,Alice,plain,');
  });

  it('pads CSV rows when trailing values are missing', () => {
    const csv = toonBlockToCsv(
      'users[2]{id,name,email}:\n  1,Alice,alice@example.com\n  2,Bob',
      'users'
    );

    expect(csv).toBe('id,name,email\n1,Alice,alice@example.com\n2,Bob,');
  });

  it('quotes CSV values containing line break characters', () => {
    const csv = toonBlockToCsv('users[1]{id,note}:\n  1,"hello\rworld"', 'users');

    expect(csv).toBe('id,note\n1,"hello\rworld"');
  });

  it('returns null when exporting an unknown block', () => {
    expect(toonBlockToCsv('users[0]{}:', 'missing')).toBeNull();
  });

  it('throws on non-array and non-object roots', () => {
    expect(() => jsonToToonSimple('bad')).toThrow('JSON root must be an array');
  });

  it('throws when an array item is not an object', () => {
    expect(() => jsonToToonSimple([1])).toThrow('Element at root array[0] is not an object.');
  });

  it('throws when an object-array key is not a valid TOON block name', () => {
    expect(() => jsonToToonSimple({ 'invalid-name': [{ id: 1 }] })).toThrow(
      "Invalid TOON block name 'invalid-name'."
    );
  });

  it('throws when a JSON object key is not a valid TOON field name', () => {
    expect(() => jsonToToonSimple([{ 'display name': 'Alice' }])).toThrow(
      "Invalid TOON field name 'display name'."
    );
  });

  it('renders empty arrays as empty TOON blocks', () => {
    expect(jsonToToonSimple({ items: [] })).toBe('items[0]{}:');
  });

  it('collects fields from later rows and renders null values as empty cells', () => {
    const toon = jsonToToonSimple([
      { id: 1, name: null },
      { id: 2, role: 'admin', meta: { active: true } },
    ]);

    expect(toon).toContain('data[2]{id,name,role,meta}:');
    expect(toon).toContain('  1,,,');
    expect(toon).toContain('"{"');
  });

  it('fills missing trailing row values as null when converting parsed blocks', () => {
    const json = blocksToJsonObject(parseToonBlocks('users[1]{id,name}:\n  1'));

    expect(json.users).toEqual([{ id: '1', name: null }]);
  });

  it('quotes comma-containing JSON values for parser-safe roundtrip', () => {
    const toon = jsonToToonSimple([{ id: 1, name: 'Bob, Jr.' }]);
    const json = toonToJsonSimple(toon);

    expect(json.data).toEqual([{ id: '1', name: 'Bob, Jr.' }]);
  });
});
