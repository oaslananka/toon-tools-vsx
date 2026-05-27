#!/usr/bin/env node
'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const sbomAssetName = 'sbom.cdx.json';
const checksumAssetName = 'checksums.sha256';

function printUsage() {
  console.log(`Usage:
  node scripts/verify-release-assets.js --tag <release-tag> [--repo <owner/repo>]
  node scripts/verify-release-assets.js --tag <release-tag> --fixture <path>

Checks that a GitHub Release exposes the VSIX, sbom.cdx.json, and checksums.sha256 assets.
The fixture mode accepts the JSON shape returned by:
  gh release view <tag> --json tagName,isDraft,isPrerelease,assets,url`);
}

function parseArgs(argv) {
  const options = {
    fixture: undefined,
    repo: process.env.GITHUB_REPOSITORY || undefined,
    tag: undefined,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    if (arg === '--fixture') {
      options.fixture = readRequiredValue(argv, (index += 1), arg);
      continue;
    }

    if (arg === '--repo') {
      options.repo = readRequiredValue(argv, (index += 1), arg);
      continue;
    }

    if (arg === '--tag') {
      options.tag = readRequiredValue(argv, (index += 1), arg);
      continue;
    }

    if (!options.tag && !arg.startsWith('-')) {
      options.tag = arg;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function readRequiredValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith('-')) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

function runGh(args) {
  try {
    return execFileSync('gh', args, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    throw new Error(`gh ${args.join(' ')} failed.\n${formatCommandError(error)}`, { cause: error });
  }
}

function formatCommandError(error) {
  const stderr = typeof error.stderr === 'string' ? error.stderr.trim() : '';
  const stdout = typeof error.stdout === 'string' ? error.stdout.trim() : '';
  return [error.message, stderr && `stderr: ${stderr}`, stdout && `stdout: ${stdout}`]
    .filter(Boolean)
    .join('\n');
}

function resolveRepository(explicitRepo) {
  if (explicitRepo) {
    return explicitRepo;
  }

  try {
    return runGh(['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner']).trim();
  } catch (error) {
    throw new Error(
      `Unable to resolve GitHub repository. Pass --repo <owner/repo>.\n${error.message}`,
      { cause: error }
    );
  }
}

function readRelease(options) {
  if (options.fixture) {
    const fixturePath = path.resolve(root, options.fixture);
    return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  }

  const repo = resolveRepository(options.repo);
  const output = runGh([
    'release',
    'view',
    options.tag,
    '--repo',
    repo,
    '--json',
    'tagName,isDraft,isPrerelease,assets,url',
  ]);
  return JSON.parse(output);
}

function deriveVersion(tag) {
  const match = /(?:^|[-/])v?(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)/u.exec(tag || '');
  return match ? match[1] : pkg.version;
}

function getAssetName(asset) {
  if (typeof asset === 'string') {
    return asset;
  }
  return typeof asset?.name === 'string' ? asset.name : undefined;
}

function getAssetSize(asset) {
  return typeof asset?.size === 'number' ? asset.size : undefined;
}

function buildRequiredAssetNames(version) {
  return [`${pkg.name}-${version}.vsix`, sbomAssetName, checksumAssetName];
}

function verifyRelease(release, expectedTag) {
  const errors = [];

  if (!release || typeof release !== 'object') {
    return ['Release payload must be a JSON object.'];
  }

  if (!Array.isArray(release.assets)) {
    errors.push('Release payload must include an assets array.');
  }

  if (expectedTag && release.tagName !== expectedTag) {
    errors.push(
      `Release tag mismatch: expected ${expectedTag}, got ${release.tagName || '<missing>'}.`
    );
  }

  if (release.isDraft === true) {
    errors.push('Release is still marked as draft.');
  }

  const version = deriveVersion(expectedTag || release.tagName);
  const requiredAssetNames = buildRequiredAssetNames(version);
  const assets = Array.isArray(release.assets) ? release.assets : [];
  const assetNames = assets.map(getAssetName).filter(Boolean);
  const assetsByName = new Map(
    assets.map((asset) => [getAssetName(asset), asset]).filter(([name]) => name)
  );

  for (const requiredName of requiredAssetNames) {
    if (!assetsByName.has(requiredName)) {
      errors.push(`Missing release asset: ${requiredName}.`);
      continue;
    }

    const size = getAssetSize(assetsByName.get(requiredName));
    if (typeof size !== 'number' || !Number.isFinite(size)) {
      errors.push(`Release asset size is not numeric: ${requiredName}.`);
      continue;
    }

    if (size <= 0) {
      errors.push(`Release asset has invalid size: ${requiredName} (${size}).`);
    }
  }

  return { assetNames, errors, requiredAssetNames, version };
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printUsage();
    return;
  }

  if (!options.tag) {
    throw new Error('A release tag is required. Pass --tag <release-tag>.');
  }

  const release = readRelease(options);
  const result = verifyRelease(release, options.tag);

  if (Array.isArray(result)) {
    result.forEach((error) => console.error(error));
    process.exit(1);
  }

  if (result.errors.length > 0) {
    console.error('release_assets_verified=false');
    result.errors.forEach((error) => console.error(error));
    process.exit(1);
  }

  console.log(`release_assets_verified=true tag=${release.tagName} version=${result.version}`);
  console.log(`required_assets=${result.requiredAssetNames.join(',')}`);
  console.log(`release_assets=${result.assetNames.join(',')}`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
