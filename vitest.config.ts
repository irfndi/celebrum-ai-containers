import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
	watch: false,
    reporters: [
      'default',
      ['junit', { outputFile: 'test-results.xml' }],
      ['json', { outputFile: 'test-results.json' }]
    ],
    include: [
      'src/**/*.test.ts',
      'tests/unit/**/*.test.ts',
      'tests/setup/**/*.test.ts'
    ],
    exclude: [
      'tests/integration/**/*.test.ts'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/.temporary-code/**',
      ],
    },
    setupFiles: ['tests/setup/setup.ts'],
    environment: 'node',
    globals: true,
  },
});
