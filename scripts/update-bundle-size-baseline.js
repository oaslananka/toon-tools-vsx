const fs = require('fs');
const path = require('path');

const bundleFile = path.join(__dirname, '..', 'dist', 'extension.js');
const baselineFile = path.join(__dirname, 'bundle-size-baseline.json');

if (!fs.existsSync(bundleFile)) {
  console.error(`Bundle file not found: ${bundleFile}`);
  console.error('Run pnpm run build before updating the bundle-size baseline.');
  process.exit(1);
}

const stats = fs.statSync(bundleFile);
if (!stats.isFile()) {
  console.error(`Bundle path is not a file: ${bundleFile}`);
  process.exit(1);
}
if (stats.size <= 0) {
  console.error(`Bundle file is empty: ${bundleFile}`);
  process.exit(1);
}

const baseline = {
  sizeBytes: stats.size,
  note: 'Run pnpm run update:bundle-size-baseline after an intentional bundle-size change.',
};

fs.writeFileSync(baselineFile, `${JSON.stringify(baseline, null, 2)}\n`);
console.log(`Updated bundle-size baseline to ${stats.size} bytes.`);
