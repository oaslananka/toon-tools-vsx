#!/usr/bin/env node
'use strict';

const { spawnSync } = require('node:child_process');

const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const packageArgs = process.argv.slice(2);
if (packageArgs[0] === '--') {
  packageArgs.shift();
}

run(pnpm, ['run', 'build']);
run(pnpm, ['exec', 'vsce', 'package', '--no-dependencies', ...packageArgs]);

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
