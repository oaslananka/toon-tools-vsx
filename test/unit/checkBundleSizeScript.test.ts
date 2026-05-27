import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const { checkBundleSize } = require('../../scripts/check-bundle-size.js') as {
  checkBundleSize: (options: {
    bundleFile: string;
    baselineFile: string;
    maxSizeBytes?: number;
    maxGrowthRatio?: number;
  }) => { ok: boolean; summary: string; message?: string };
};

function createBundleFixture(
  sizeBytes: number,
  baselineSizeBytes: number
): {
  baselineFile: string;
  bundleFile: string;
  cleanup: () => void;
} {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'toon-bundle-size-'));
  const bundleFile = path.join(directory, 'extension.js');
  const baselineFile = path.join(directory, 'bundle-size-baseline.json');

  fs.writeFileSync(bundleFile, Buffer.alloc(sizeBytes, 'x'));
  fs.writeFileSync(baselineFile, JSON.stringify({ sizeBytes: baselineSizeBytes }));

  return {
    baselineFile,
    bundleFile,
    cleanup: () => fs.rmSync(directory, { force: true, recursive: true }),
  };
}

describe('check-bundle-size script helpers', () => {
  it('passes when the bundle matches the audited baseline', () => {
    const fixture = createBundleFixture(100, 100);

    try {
      expect(checkBundleSize(fixture)).toMatchObject({
        ok: true,
        summary: 'Bundle: 100 bytes (baseline: 100, delta 0.0%)',
      });
    } finally {
      fixture.cleanup();
    }
  });

  it('fails when bundle growth exceeds the allowed threshold', () => {
    const fixture = createBundleFixture(112, 100);

    try {
      expect(checkBundleSize(fixture)).toMatchObject({
        ok: false,
        message: expect.stringContaining('Bundle grew more than 10%'),
      });
    } finally {
      fixture.cleanup();
    }
  });

  it('fails when the bundle exceeds the absolute limit', () => {
    const fixture = createBundleFixture(150, 100);

    try {
      expect(checkBundleSize({ ...fixture, maxSizeBytes: 120 })).toMatchObject({
        ok: false,
        message: 'Bundle size 150 bytes exceeds limit of 120 bytes.',
      });
    } finally {
      fixture.cleanup();
    }
  });
});
