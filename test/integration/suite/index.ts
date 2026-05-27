import * as path from 'path';
import * as fs from 'fs';
import Mocha = require('mocha');

export function run(): Promise<void> {
  const mocha = new Mocha({
    ui: 'tdd',
    color: true,
  });

  const testsRoot = __dirname;

  return new Promise((resolve, reject) => {
    findTests(testsRoot).forEach((file) => mocha.addFile(file));
    mocha.run((failures) => {
      if (failures > 0) {
        reject(new Error(`${failures} tests failed.`));
      } else {
        resolve();
      }
    });
  });
}

function findTests(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return findTests(fullPath);
    }
    return entry.isFile() && entry.name.endsWith('.test.js') ? [fullPath] : [];
  });
}
