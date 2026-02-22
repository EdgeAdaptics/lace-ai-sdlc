import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['test/**/*.test.ts']
  },
  resolve: {
    alias: {
      vscode: resolve(__dirname, 'test/mocks/vscode.ts')
    }
  },
  server: {
    deps: {
      inline: ['web-tree-sitter']
    }
  }
});
