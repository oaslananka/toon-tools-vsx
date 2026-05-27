const fs = require('fs');
const path = require('path');

const bundleFile = path.join(__dirname, '..', 'dist', 'extension.js');
const baselineFile = path.join(__dirname, 'bundle-size-baseline.json');
const maxSizeBytes = 512 * 1024;
const maxGrowthRatio = 0.1;

function readBundleSize(filePath) {
  return fs.statSync(filePath).size;
}

function readBaseline(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function checkBundleSize(options = {}) {
  const currentBundleFile = options.bundleFile ?? bundleFile;
  const currentBaselineFile = options.baselineFile ?? baselineFile;
  const absoluteLimit = options.maxSizeBytes ?? maxSizeBytes;
  const growthLimit = options.maxGrowthRatio ?? maxGrowthRatio;
  const sizeBytes = readBundleSize(currentBundleFile);
  const baseline = readBaseline(currentBaselineFile);
  const delta = sizeBytes - baseline.sizeBytes;
  const pct = ((delta / baseline.sizeBytes) * 100).toFixed(1);
  const summary = `Bundle: ${sizeBytes} bytes (baseline: ${baseline.sizeBytes}, delta ${pct}%)`;

  if (sizeBytes > absoluteLimit) {
    return {
      ok: false,
      summary,
      message: `Bundle size ${sizeBytes} bytes exceeds limit of ${absoluteLimit} bytes.`,
    };
  }

  if (delta > baseline.sizeBytes * growthLimit) {
    return {
      ok: false,
      summary,
      message:
        'Bundle grew more than 10% from baseline. Update the baseline only after auditing the size change.',
    };
  }

  return { ok: true, summary };
}

function main() {
  const result = checkBundleSize();
  console.log(result.summary);

  if (!result.ok) {
    console.error(result.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { checkBundleSize };
