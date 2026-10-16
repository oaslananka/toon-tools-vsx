import { bench, describe } from 'vitest';
import {
  blocksToJsonObject,
  jsonToToonSimple,
  toonBlockToCsv,
  toonToJsonSimple,
} from '../../src/convert/codec';
import { parseToonBlocks } from '../../src/parser/toonParser';
import { buildTableViewerPayload, serializeWebviewPayload } from '../../src/ui/tableViewerHtml';
import { buildParserPerformanceFixture } from '../fixtures/parserPerformanceFixture';
import { buildJsonRecords, createSourceRotation } from './benchUtils';

const ROWS = 1000;

const jsonRecords = buildJsonRecords(ROWS);
const toonFromJson = jsonToToonSimple(jsonRecords);
const toonSource = createSourceRotation(toonFromJson);
const csvSource = createSourceRotation(buildParserPerformanceFixture(ROWS));

const parsedBlocks = parseToonBlocks(toonFromJson);
const parsedFixtureBlocks = parseToonBlocks(buildParserPerformanceFixture(ROWS));

describe('convert', () => {
  bench('jsonToToonSimple - 1000 records', () => {
    jsonToToonSimple(jsonRecords);
  });

  bench('toonToJsonSimple - strings mode, 1000 rows', () => {
    toonToJsonSimple(toonSource(), { valueMode: 'strings' });
  });

  bench('toonToJsonSimple - typed mode, 1000 rows', () => {
    toonToJsonSimple(toonSource(), { valueMode: 'typed' });
  });

  bench('blocksToJsonObject - typed mode, pre-parsed 1000 rows', () => {
    blocksToJsonObject(parsedBlocks, { valueMode: 'typed' });
  });

  bench('toonBlockToCsv - 1000 rows x 8 fields', () => {
    toonBlockToCsv(csvSource(), 'items');
  });

  bench('JSON -> TOON -> JSON roundtrip - 1000 records', () => {
    toonToJsonSimple(jsonToToonSimple(jsonRecords), { valueMode: 'typed' });
  });
});

describe('table viewer payload', () => {
  bench('buildTableViewerPayload + serializeWebviewPayload - 1000 rows', () => {
    serializeWebviewPayload(buildTableViewerPayload(parsedFixtureBlocks));
  });
});
