import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    pool: 'threads',
    watch: false,
    reporters: ['default', 'verbose'],
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.temporary-code/**',
      '**/dist-test/**',
    ],
  },
  resolve: {
    alias: {
      '@celebrum-ai/shared': '/Users/irfandi/Coding/2025/celebrum-ai/src/shared/src/index.ts',
      '@celebrum-ai/shared/infrastructure/data-sources': '/Users/irfandi/Coding/2025/celebrum-ai/src/shared/src/infrastructure/data-sources.ts',
      '@celebrum-ai/shared/infrastructure/ccxt-data-source': '/Users/irfandi/Coding/2025/celebrum-ai/src/shared/src/infrastructure/ccxt-data-source.ts',
    },
  },
});