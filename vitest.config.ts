import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.temporary-code/**',
      '**/coverage/**'
    ],
  },
  resolve: {
    alias: {
      '@celebrum-ai/shared': path.resolve(__dirname, './src/shared/src'),
      '@celebrum-ai/db': path.resolve(__dirname, './src/db/src'),
      '@celebrum-ai/telegram-bot': path.resolve(__dirname, './src/telegram-bot/src'),
    },
  },
});