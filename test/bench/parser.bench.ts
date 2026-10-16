import { bench, describe } from 'vitest';
import { parseToonDocument, parseToonValueTokens } from '../../src/parser/toonParser';
import { buildParserPerformanceFixture } from '../fixtures/parserPerformanceFixture';
import { buildMultiBlockDocument, createSourceRotation } from './benchUtils';

const smallSource = createSourceRotation(buildParserPerformanceFixture(100));
const largeSource = createSourceRotation(buildParserPerformanceFixture());
const multiBlockSource = createSourceRotation(buildMultiBlockDocument(20, 100));
const cachedSource = buildParserPerformanceFixture();
parseToonDocument(cachedSource);

const quotedRow =
  '  value_1,"quoted,1,2","escaped ""quote"" 1_2",42,value_2,"quoted,3,4","escaped ""quote"" 3_4",84';

describe('parser', () => {
  bench('parseToonDocument - 100 rows', () => {
    parseToonDocument(smallSource());
  });

  bench('parseToonDocument - 5000 rows x 8 fields', () => {
    parseToonDocument(largeSource());
  });

  bench('parseToonDocument - 20 blocks x 100 rows', () => {
    parseToonDocument(multiBlockSource());
  });

  bench('parseToonDocument - cached 5000 rows', () => {
    parseToonDocument(cachedSource);
  });

  bench('parseToonValueTokens - quoted row x 1000', () => {
    for (let index = 0; index < 1000; index += 1) {
      parseToonValueTokens(quotedRow, 2, index);
    }
  });
});
