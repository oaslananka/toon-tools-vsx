#!/usr/bin/env node
'use strict';

const { execFileSync } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const ansiEscapePattern = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');

const requiredPaths = [
  'CHANGELOG.md',
  'LICENSE',
  'README.md',
  'SECURITY.md',
  'language-configuration.json',
  'package.json',
  'dist/extension.js',
  'docs/contributing.md',
  'docs/publishing.md',
  'docs/repository-rules.md',
  'docs/toon-spec.md',
  'icons/toon-file-dark.svg',
  'icons/toon-file-light.svg',
  'images/toon-tools-icon.png',
  'media/reset.css',
  'media/sizeAnalyzer.css',
  'media/tableViewer.css',
  'media/tableViewer.js',
  'schemas/toon-config.schema.json',
  'snippets/toon.code-snippets',
  'syntaxes/toon.tmLanguage.json',
];

const forbiddenPaths = new Set([
  '.env.example',
  '.release-please-manifest.json',
  '.gitignore',
  '.gitleaks.toml',
  '.node-version',
  '.nvmrc',
  '.pre-commit-config.yaml',
  '.prettierignore',
  '.yamllint.yml',
  'PLAN.md',
  'Taskfile.yml',
  'commitlint.config.cjs',
  'dist/extension.d.ts',
  'dist/extension.js.map',
  'eslint.config.cjs',
  'jest.config.js',
  'package-lock.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'release-please-config.json',
  'renovate.json',
  'stryker.conf.json',
  'tsconfig.json',
  'tsconfig.test.json',
  'vitest.config.ts',
  'webpack.config.js',
]);

const forbiddenDirectories = [
  '.codex-checkpoints',
  '.github',
  '.husky',
  '.stryker-tmp',
  '.vscode',
  'coverage',
  'node_modules',
  'out',
  'reports',
  'scripts',
  'src',
  'test',
  'test-fixtures',
];

function runVsce(args) {
  if (!process.env.npm_execpath) {
    throw new Error('Run this checker through pnpm so npm_execpath points to the active pnpm CLI.');
  }

  return execFileSync(process.execPath, [process.env.npm_execpath, 'exec', 'vsce', ...args], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function stripAnsi(text) {
  return text.replace(ansiEscapePattern, '');
}

function parseFlatList(output) {
  return new Set(
    stripAnsi(output)
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter(Boolean)
  );
}

function isForbiddenPackagePath(entryPath) {
  if (forbiddenPaths.has(entryPath)) {
    return true;
  }

  return forbiddenDirectories.some(
    (directory) => entryPath === directory || entryPath.startsWith(`${directory}/`)
  );
}

const treeOutput = runVsce(['ls', '--tree', '--no-dependencies']);
const flatOutput = runVsce(['ls', '--no-dependencies']);
const entries = parseFlatList(flatOutput);

if (entries.size === 0) {
  console.error('VSIX package contents check failed: no package entries were parsed.');
  console.error(treeOutput.trim());
  process.exit(1);
}

const missing = requiredPaths.filter((entryPath) => !entries.has(entryPath));
const forbidden = [...entries].filter(isForbiddenPackagePath).sort();

if (missing.length > 0 || forbidden.length > 0) {
  console.error('VSIX package contents check failed.');

  if (missing.length > 0) {
    console.error('Missing required package paths:');
    for (const entryPath of missing) {
      console.error(`- ${entryPath}`);
    }
  }

  if (forbidden.length > 0) {
    console.error('Forbidden package paths:');
    for (const entryPath of forbidden) {
      console.error(`- ${entryPath}`);
    }
  }

  console.error('Package listing:');
  console.error(treeOutput.trim());
  process.exit(1);
}

console.log(`VSIX package contents verified: ${entries.size} entries checked.`);
