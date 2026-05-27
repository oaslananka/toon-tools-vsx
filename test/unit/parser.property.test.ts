import * as fc from 'fast-check';
import { parseToonDocument } from '../../src/parser/toonParser';
import { type ToonBlock } from '../../src/parser/toonTypes';

interface GeneratedToonBlock {
  name: string;
  fields: string[];
  rows: string[][];
}

const firstIdentifierChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_'.split('');
const identifierChars = `${firstIdentifierChars.join('')}0123456789`.split('');
const valueChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-.,"'.split('');

const identifierArbitrary = fc
  .tuple(
    fc.constantFrom(...firstIdentifierChars),
    fc.array(fc.constantFrom(...identifierChars), { minLength: 0, maxLength: 10 })
  )
  .map(([first, rest]) => `${first}${rest.join('')}`);

const valueArbitrary = fc
  .array(fc.constantFrom(...valueChars), { minLength: 0, maxLength: 16 })
  .map((chars) => chars.join(''));

const blockArbitrary: fc.Arbitrary<GeneratedToonBlock> = fc
  .record({
    name: identifierArbitrary,
    fields: fc.uniqueArray(identifierArbitrary, {
      minLength: 1,
      maxLength: 5,
      selector: (value) => value.toLowerCase(),
    }),
  })
  .chain(({ name, fields }) => {
    const rowArbitrary = fc
      .integer({ min: 1, max: fields.length + 2 })
      .chain((width) => fc.array(valueArbitrary, { minLength: width, maxLength: width }));

    return fc.record({
      name: fc.constant(name),
      fields: fc.constant(fields),
      rows: fc.array(rowArbitrary, { minLength: 0, maxLength: 5 }),
    });
  });

const documentArbitrary = fc.uniqueArray(blockArbitrary, {
  minLength: 1,
  maxLength: 3,
  selector: (block) => block.name.toLowerCase(),
});

describe('parseToonDocument properties', () => {
  it('roundtrips generated valid documents through parse/render/parse', () => {
    fc.assert(
      fc.property(documentArbitrary, (blocks) => {
        const source = renderGeneratedDocument(blocks);
        const firstParse = parseToonDocument(source);
        expect(firstParse.parseErrors).toEqual([]);

        const rendered = renderParsedDocument(firstParse.blocks);
        const secondParse = parseToonDocument(rendered);
        expect(secondParse.parseErrors).toEqual([]);
        expect(simplifyBlocks(secondParse.blocks)).toEqual(simplifyBlocks(firstParse.blocks));
      }),
      { numRuns: 200, seed: 20260522 }
    );
  });
});

function renderGeneratedDocument(blocks: GeneratedToonBlock[]): string {
  return blocks.map(renderGeneratedBlock).join('\n\n');
}

function renderGeneratedBlock(block: GeneratedToonBlock): string {
  const header = `${block.name}[${block.rows.length}]{${block.fields.join(',')}}:`;
  if (block.rows.length === 0) {
    return header;
  }
  return `${header}\n${block.rows.map(renderGeneratedRow).join('\n')}`;
}

function renderGeneratedRow(values: string[]): string {
  return `  ${values.map(renderValue).join(',')}`;
}

function renderValue(value: string): string {
  return value === '' || value.includes(',') || value.includes('"')
    ? `"${value.replace(/"/g, '""')}"`
    : value;
}

function renderParsedDocument(blocks: ToonBlock[]): string {
  return blocks
    .map((block) =>
      renderGeneratedBlock({
        name: block.name,
        fields: block.fields,
        rows: block.rows.map((row) => row.values),
      })
    )
    .join('\n\n');
}

function simplifyBlocks(blocks: ToonBlock[]): Array<{
  name: string;
  rowCountDeclared: number;
  fields: string[];
  rows: string[][];
}> {
  return blocks.map((block) => ({
    name: block.name,
    rowCountDeclared: block.rowCountDeclared,
    fields: block.fields,
    rows: block.rows.map((row) => row.values),
  }));
}
