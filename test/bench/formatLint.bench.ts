import { bench, describe } from 'vitest';
import { formatToonDocument } from '../../src/format/toonFormatter';
import { validateToonBlocks, validateToonDocument } from '../../src/lint/toonLinter';
import { parseToonBlocks, parseToonDocument } from '../../src/parser/toonParser';
import {
  buildInvalidDocument,
  buildMultiBlockDocument,
  buildUnformattedDocument,
  createSourceRotation,
} from './benchUtils';

const unformattedSource = createSourceRotation(buildUnformattedDocument(1000));
const multiBlockSource = createSourceRotation(buildMultiBlockDocument(10, 100));
const invalidSource = createSourceRotation(buildInvalidDocument(1000));
const preParsedInvalidBlocks = parseToonBlocks(buildInvalidDocument(1000));

describe('formatter', () => {
  bench('formatToonDocument - 1000 unformatted rows, compact', () => {
    formatToonDocument(unformattedSource(), { indentWidth: 2, fieldSpacing: 'compact' });
  });

  bench('formatToonDocument - 1000 unformatted rows, spaced/4', () => {
    formatToonDocument(unformattedSource(), { indentWidth: 4, fieldSpacing: 'spaced' });
  });

  bench('formatToonDocument - 10 blocks x 100 rows', () => {
    formatToonDocument(multiBlockSource());
  });
});

describe('linter', () => {
  bench('parse + validateToonDocument - 1000 invalid rows', () => {
    validateToonDocument(parseToonDocument(invalidSource()));
  });

  bench('validateToonBlocks - pre-parsed 1000 invalid rows', () => {
    validateToonBlocks(preParsedInvalidBlocks);
  });

  bench('parse + validateToonDocument - 10 valid blocks x 100 rows', () => {
    validateToonDocument(parseToonDocument(multiBlockSource()));
  });
});
