#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');

const root = path.resolve(__dirname, '..');
const parserPath = path.join(root, 'out', 'src', 'parser', 'toonParser.js');
const fixturePath = path.join(root, 'out', 'test', 'fixtures', 'parserPerformanceFixture.js');

const warmupIterations = integerFromEnv('TOON_PARSER_PERF_WARMUP', 10);
const measuredIterations = integerFromEnv('TOON_PARSER_PERF_ITERATIONS', 40);
const minRowsPerSecond = numberFromEnv('TOON_PARSER_MIN_ROWS_PER_SECOND', 25000);

if (!fs.existsSync(parserPath) || !fs.existsSync(fixturePath)) {
  throw new Error('Parser performance inputs are missing. Run `pnpm run compile-tests` first.');
}

const { parseToonDocument } = require(parserPath);
const {
  PARSER_PERFORMANCE_FIXTURE_FIELDS,
  PARSER_PERFORMANCE_FIXTURE_ROWS,
  buildParserPerformanceFixture,
} = require(fixturePath);

const source = buildParserPerformanceFixture();
const sourceBytes = Buffer.byteLength(source, 'utf8');

verifyParse(source);

for (let index = 0; index < warmupIterations; index += 1) {
  parseToonDocument(sourceForIteration(source, 'warmup', index));
}

const coldDurations = [];
for (let index = 0; index < measuredIterations; index += 1) {
  const sourceText = sourceForIteration(source, 'cold', index);
  const start = performance.now();
  const document = parseToonDocument(sourceText);
  coldDurations.push(performance.now() - start);
  assertParsedDocument(document);
}

const cachedDurations = [];
const cachedSource = sourceForIteration(source, 'cached', 0);
parseToonDocument(cachedSource);
for (let index = 0; index < measuredIterations; index += 1) {
  const start = performance.now();
  const document = parseToonDocument(cachedSource);
  cachedDurations.push(performance.now() - start);
  assertParsedDocument(document);
}

coldDurations.sort((left, right) => left - right);
cachedDurations.sort((left, right) => left - right);

const medianMs = percentile(coldDurations, 0.5);
const p95Ms = percentile(coldDurations, 0.95);
const cachedMedianMs = percentile(cachedDurations, 0.5);
const cachedP95Ms = percentile(cachedDurations, 0.95);
const rowsPerSecond = Math.round(PARSER_PERFORMANCE_FIXTURE_ROWS / (medianMs / 1000));

console.log(
  [
    'Parser throughput:',
    'mode=cold-parse',
    `rows=${PARSER_PERFORMANCE_FIXTURE_ROWS}`,
    `fields=${PARSER_PERFORMANCE_FIXTURE_FIELDS}`,
    `bytes=${sourceBytes}`,
    `iterations=${measuredIterations}`,
    `medianMs=${medianMs.toFixed(2)}`,
    `p95Ms=${p95Ms.toFixed(2)}`,
    `rowsPerSecond=${rowsPerSecond}`,
    `minimumRowsPerSecond=${minRowsPerSecond}`,
    `cachedMedianMs=${cachedMedianMs.toFixed(4)}`,
    `cachedP95Ms=${cachedP95Ms.toFixed(4)}`,
  ].join(' ')
);

if (rowsPerSecond < minRowsPerSecond) {
  console.error(
    `Parser throughput ${rowsPerSecond} rows/s is below the minimum ${minRowsPerSecond} rows/s.`
  );
  process.exit(1);
}

function verifyParse(sourceText) {
  const document = parseToonDocument(sourceText);
  assertParsedDocument(document);
}

function assertParsedDocument(document) {
  if (document.parseErrors.length > 0) {
    throw new Error(`Fixture produced ${document.parseErrors.length} parse errors.`);
  }

  if (document.blocks.length !== 1) {
    throw new Error(`Expected 1 block, parsed ${document.blocks.length}.`);
  }

  const [block] = document.blocks;
  if (block.rows.length !== PARSER_PERFORMANCE_FIXTURE_ROWS) {
    throw new Error(
      `Expected ${PARSER_PERFORMANCE_FIXTURE_ROWS} rows, parsed ${block.rows.length}.`
    );
  }

  if (block.fields.length !== PARSER_PERFORMANCE_FIXTURE_FIELDS) {
    throw new Error(
      `Expected ${PARSER_PERFORMANCE_FIXTURE_FIELDS} fields, parsed ${block.fields.length}.`
    );
  }
}

function sourceForIteration(sourceText, phase, index) {
  return `${sourceText}\n# benchmark:${phase}:${index}`;
}

function percentile(values, ratio) {
  const index = Math.min(values.length - 1, Math.floor(values.length * ratio));
  return values[index];
}

function numberFromEnv(name, fallback) {
  const rawValue = process.env[name];
  if (rawValue === undefined) {
    return fallback;
  }

  const value = Number(rawValue);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive number.`);
  }
  return value;
}

function integerFromEnv(name, fallback) {
  const value = numberFromEnv(name, fallback);
  if (!Number.isInteger(value)) {
    throw new Error(`${name} must be an integer.`);
  }
  return value;
}
