import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['src/shared/tests/unit/*.test.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.wrangler/**',
      '**/.taskmaster/**',
    ],
    // Skip the problematic setup file
    setupFiles: [],
    environment: 'node',
    alias: {
      '@celebrum-ai/shared': '/Users/irfandi/Coding/2025/celebrum-ai/dist-test/shared/src/index.js',
      '@celebrum-ai/db/schema': '/Users/irfandi/Coding/2025/celebrum-ai/dist-test/db/src/schema/index.js',
      '@celebrum-ai/db': '/Users/irfandi/Coding/2025/celebrum-ai/dist-test/db/src/index.js',
      '@celebrum-ai/telegram-bot': '/Users/irfandi/Coding/2025/celebrum-ai/dist-test/telegram-bot/src/index.js',
      '@celebrum-ai/services': '/Users/irfandi/Coding/2025/celebrum-ai/dist-test/services/src/index.js',
    },
  },
});