const fs = require('fs');
const path = require('path');

const bundleFile = path.join(__dirname, '..', 'dist', 'extension.js');
const baselineFile = path.join(__dirname, 'bundle-size-baseline.json');
const maxSizeBytes = 512 * 1024;

const stats = fs.statSync(bundleFile);
if (stats.size > maxSizeBytes) {
  console.error(`Bundle size ${stats.size} bytes exceeds limit of ${maxSizeBytes} bytes.`);
  process.exit(1);
}

const baseline = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));
const delta = stats.size - baseline.sizeBytes;
const pct = ((delta / baseline.sizeBytes) * 100).toFixed(1);

console.log(`Bundle: ${stats.size} bytes (baseline: ${baseline.sizeBytes}, delta ${pct}%)`);

if (delta > baseline.sizeBytes * 0.1) {
  console.warn('WARNING: Bundle grew more than 10% from baseline.');
}
