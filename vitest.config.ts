import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      vscode: resolve(__dirname, 'test/unit/vscodeMock.ts'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['test/unit/**/*.test.ts'],
    coverage: {
      enabled: true,
      provider: 'v8',
      reportsDirectory: 'coverage',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        // Extension entrypoint: tested via integration tests (test/integration/suite/extension.test.ts)
        'src/extension.ts',
        // Webview commands: tested via integration and mock-based unit tests
        'src/ui/tableViewer.ts',
        'src/ui/sizeAnalyzer.ts',
        // VS Code UI feature providers: tested via integration tests or very thin wrappers
        'src/features/folding.ts',
        'src/features/symbols.ts',
        'src/ui/statusBar.ts',
      ],
      thresholds: {
        branches: 88,
        functions: 95,
        lines: 95,
        statements: 95,
      },
    },
  },
});
