import * as path from 'path';
import { spawn } from 'child_process';
import { downloadAndUnzipVSCode } from '@vscode/test-electron';

async function main(): Promise<void> {
  const extensionDevelopmentPath = path.resolve(__dirname, '../../../');
  const extensionTestsPath = path.resolve(__dirname, './suite/index');
  const vscodeExecutablePath = await downloadAndUnzipVSCode({ version: 'stable' });
  await runTestsWithoutShell(vscodeExecutablePath, [
    extensionDevelopmentPath,
    '--no-sandbox',
    '--disable-gpu-sandbox',
    '--disable-updates',
    '--skip-welcome',
    '--skip-release-notes',
    '--disable-workspace-trust',
    `--extensionTestsPath=${extensionTestsPath}`,
    `--extensionDevelopmentPath=${extensionDevelopmentPath}`,
    `--extensions-dir=${path.resolve(extensionDevelopmentPath, '.vscode-test/extensions')}`,
    `--user-data-dir=${path.resolve(extensionDevelopmentPath, '.vscode-test/user-data')}`,
  ]);
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Integration test runner failed:', err);
    process.exit(1);
  });
}

function runTestsWithoutShell(executable: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      env: createTestEnvironment(process.env),
      shell: false,
      stdio: 'inherit',
      windowsHide: true,
    });

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(signal ? `VS Code exited with signal ${signal}` : `VS Code exited ${code}`));
    });
  });
}

export function createTestEnvironment(source: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const environment = { ...source };
  delete environment.ELECTRON_RUN_AS_NODE;
  return environment;
}
