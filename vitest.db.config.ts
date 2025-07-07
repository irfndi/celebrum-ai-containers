import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import * as path from 'node:path';

// This is a dedicated Vitest configuration for testing the database and shared logic.
// It runs in a simple Node.js environment, avoiding the complexities of the
// Cloudflare Workers test environment for these specific tests.

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'node', // Use a simple node environment
    setupFiles: ['./src/shared/tests/setup-db-only.ts'], // A new, simplified setup file
    include: [
      'src/db/tests/unit/**/*.test.ts',
      'src/shared/tests/unit/**/*.test.ts',
      'src/db/tests/integration/**/*.test.ts',
      'src/shared/tests/integration/**/*.test.ts',
    ],
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 5000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@celebrum-ai/shared': path.resolve(__dirname, './src/shared/src'),
      '@celebrum-ai/db': path.resolve(__dirname, './src/db/src'),
      '@celebrum-ai/services': path.resolve(__dirname, './src/services/src')
    },
  },
}); 