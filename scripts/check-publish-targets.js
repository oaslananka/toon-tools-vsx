const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const defaultTargetVersion = process.argv[2] || pkg.version;
const defaultExtensionId = `${pkg.publisher}.${pkg.name}`;
function runTool(args) {
  const command = process.platform === 'win32' ? 'cmd.exe' : 'pnpm';
  const commandArgs =
    process.platform === 'win32'
      ? ['/d', '/c', ['pnpm', 'exec', ...args].map(quoteCmdArg).join(' ')]
      : ['exec', ...args];

  return execFileSync(command, commandArgs, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function quoteCmdArg(value) {
  const text = String(value);
  return /^[A-Za-z0-9._:/@=-]+$/.test(text) ? text : `"${text.replace(/(["^&|<>%])/g, '^$1')}"`;
}

function isNotFoundError(error) {
  const text = `${error.stdout || ''}\n${error.stderr || ''}`;
  return /not found|could not find|does not exist/i.test(text);
}

function parseToolJson(output, source) {
  const text = String(output).trim();
  if (text === '' || text === 'undefined' || text === 'null') {
    return undefined;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${source} returned non-JSON output: ${text.slice(0, 200)}`, {
      cause: error,
    });
  }
}

function readMarketplaceVersions(extensionId) {
  try {
    const metadata = parseToolJson(
      runTool(['vsce', 'show', extensionId, '--json']),
      `VS Marketplace version lookup for ${extensionId}`
    );
    if (!metadata) {
      return [];
    }
    return (metadata.versions || []).map((entry) => entry.version).filter(Boolean);
  } catch (error) {
    if (isNotFoundError(error)) {
      return [];
    }
    throw new Error(`VS Marketplace version lookup failed for ${extensionId}: ${error.message}`, {
      cause: error,
    });
  }
}

function readOpenVsxVersion(extensionId, targetVersion) {
  try {
    const metadata = parseToolJson(
      runTool(['ovsx', 'get', extensionId, '--metadata', '--versionRange', targetVersion]),
      `Open VSX version lookup for ${extensionId}`
    );
    if (!metadata) {
      return [];
    }
    return metadata.version ? [metadata.version] : [];
  } catch (error) {
    if (isNotFoundError(error)) {
      return [];
    }
    throw new Error(`Open VSX version lookup failed for ${extensionId}: ${error.message}`, {
      cause: error,
    });
  }
}

function main({ extensionId = defaultExtensionId, targetVersion = defaultTargetVersion } = {}) {
  const marketplaceVersions = readMarketplaceVersions(extensionId);
  const openVsxVersions = readOpenVsxVersion(extensionId, targetVersion);
  const conflicts = [];

  if (marketplaceVersions.includes(targetVersion)) {
    conflicts.push(`VS Marketplace already has ${extensionId}@${targetVersion}`);
  }

  if (openVsxVersions.includes(targetVersion)) {
    conflicts.push(`Open VSX already has ${extensionId}@${targetVersion}`);
  }

  if (conflicts.length > 0) {
    console.error('safe_to_publish=false');
    conflicts.forEach((conflict) => console.error(conflict));
    process.exit(1);
  }

  console.log(`safe_to_publish=true ${extensionId}@${targetVersion}`);
  console.log(
    `VS Marketplace latest: ${marketplaceVersions[0] || 'not found'}; Open VSX target: ${
      openVsxVersions[0] || 'not found'
    }`
  );
}

if (require.main === module) {
  main();
}

module.exports = { parseToolJson };
