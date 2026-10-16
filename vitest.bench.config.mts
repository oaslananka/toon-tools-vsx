import { fileURLToPath } from 'node:url';
import codspeedPlugin from '@codspeed/vitest-plugin';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [codspeedPlugin()],
  resolve: {
    alias: {
      vscode: fileURLToPath(new URL('./test/unit/vscodeMock.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    include: [],
    coverage: {
      enabled: false,
    },
    benchmark: {
      include: ['test/bench/**/*.bench.ts'],
    },
  },
});
