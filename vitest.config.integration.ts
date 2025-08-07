import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineWorkersConfig({
  plugins: [tsconfigPaths()],
  test: {
    watch: false,
    reporters: [
      'default',
      ['junit', { outputFile: 'test-results.xml' }],
      ['json', { outputFile: 'test-results.json' }]
    ],
    include: ['tests/integration/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/tests/**',
        '**/.temporary-code/**',
      ],
    },
    setupFiles: ['tests/setup/setup-db-cloudflare.ts'],
    poolOptions: {
      workers: {
        wrangler: {
          configPath: './wrangler.jsonc',
          environment: 'test'
        },
      },
    },
  },
});
