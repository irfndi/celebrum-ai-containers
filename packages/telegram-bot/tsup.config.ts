import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node20',
  platform: 'node',
  outDir: 'dist',
  dts: true,
  clean: true,
  sourcemap: true,
  external: [
    '@celebrum-ai/shared',
    '@celebrum-ai/db',
    '@cloudflare/workers-types'
  ],
  esbuildOptions(options) {
    options.conditions = ['worker', 'browser'];
  }
});