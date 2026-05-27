const fs = require('fs');
const path = require('path');

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
const trust = pkg.capabilities && pkg.capabilities.untrustedWorkspaces;

if (!trust || trust.supported !== 'limited') {
  console.error(
    'package.json must declare capabilities.untrustedWorkspaces.supported as "limited".'
  );
  process.exit(1);
}

if (!Array.isArray(trust.restrictedConfigurations)) {
  console.error('package.json untrusted workspace metadata must include restrictedConfigurations.');
  process.exit(1);
}

console.log('Untrusted workspace metadata verified.');
