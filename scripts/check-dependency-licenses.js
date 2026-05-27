#!/usr/bin/env node
'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const policyPath = path.join(root, '.github', 'dependency-license-policy.json');
const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));

const allowedLicenses = new Set(policy.allowedLicenses);
const exceptionKeys = new Set();

for (const entry of policy.packageExceptions) {
  if (!entry.name || !entry.license || !entry.reason) {
    throw new Error('Every package exception must include name, license, and reason.');
  }
  exceptionKeys.add(`${entry.name}\0${entry.license}`);
}

function licenseIds(expression) {
  return [...new Set(expression.match(/[A-Za-z0-9.+-]+/g) ?? [])].filter(
    (token) => token !== 'AND' && token !== 'OR' && token !== 'WITH'
  );
}

function isAllowedExpression(expression) {
  if (allowedLicenses.has(expression)) {
    return true;
  }

  const ids = licenseIds(expression);
  if (ids.length === 0) {
    return false;
  }

  if (/\bOR\b/.test(expression)) {
    return ids.some((id) => allowedLicenses.has(id));
  }

  return ids.every((id) => allowedLicenses.has(id));
}

if (!process.env.npm_execpath) {
  throw new Error('Run this checker through pnpm so npm_execpath points to the active pnpm CLI.');
}

const stdout = execFileSync(
  process.execPath,
  [process.env.npm_execpath, 'licenses', 'list', '--json'],
  {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }
);

const licenses = JSON.parse(stdout);
const violations = [];

for (const [license, packages] of Object.entries(licenses)) {
  if (isAllowedExpression(license)) {
    continue;
  }

  for (const pkg of packages) {
    if (exceptionKeys.has(`${pkg.name}\0${license}`)) {
      continue;
    }
    violations.push(`${pkg.name}@${pkg.versions.join(',')} uses ${license}`);
  }
}

if (violations.length > 0) {
  console.error('Dependency license policy failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log(
  `Dependency license policy passed: ${Object.keys(licenses).length} license groups checked, ${exceptionKeys.size} explicit exceptions.`
);
