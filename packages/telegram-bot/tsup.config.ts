import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node18',
  platform: 'node',
  outDir: 'dist',
  external: ['@celebrum-ai/shared', '@celebrum-ai/db'],
  dts: false,
});