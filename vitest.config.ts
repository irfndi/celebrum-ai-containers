import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import * as path from 'node:path';

export default defineWorkersConfig({
  plugins: [tsconfigPaths({ configNames: ['tsconfig.test.json'], loose: true })],
  test: {
    globals: true,
    environment: 'node',
    deps: {
      optimizer: {
        ssr: {
          enabled: true,
          include: [
            'grammy',
            'hono',
            'zod',
            'better-sqlite3',
            'drizzle-orm',
            '@cloudflare/workers-types'
          ],
        },
      },
    },
    poolOptions: {
      workers: {
        wrangler: {
          configPath: './wrangler.jsonc',
        },
        miniflare: {
          // Enable service worker testing
          compatibilityDate: '2024-01-01',
          compatibilityFlags: ['nodejs_compat'],
        },
      },
    },
    include: [
      'src/**/*.test.ts',
      'src/**/*.spec.ts'
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.temporary-code/**',
      '**/coverage/**',
      '**/.wrangler/**'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/**/tests/**',
        'dist/**',
        '.wrangler/**'
      ],
      thresholds: {
        global: {
          branches: 0,
          functions: 0,
          lines: 0,
          statements: 0
        }
      }
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 5000
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@celebrum-ai/shared': path.resolve(__dirname, './src/shared/src'),
      '@celebrum-ai/db': path.resolve(__dirname, './src/db/src'),
      '@celebrum-ai/telegram-bot': path.resolve(__dirname, './src/telegram-bot/src'),
      '@celebrum-ai/web': path.resolve(__dirname, './src/web'),
      '@celebrum-ai/services': path.resolve(__dirname, './src/services/src')
    },
  },
  define: {
    // Define environment variables for testing
    'process.env.NODE_ENV': '"test"',
    'process.env.TELEGRAM_BOT_TOKEN': '"test-token"',
    'process.env.WEBHOOK_SECRET': '"test-secret"',
    'process.env.DATABASE_URL': '"test-db"'
  }
});