import { defineConfig } from 'astro/config';
import cloudflare from "@astrojs/cloudflare";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: cloudflare({
    imageService: 'compile',
    sessionKVBindingName: 'SESSIONS',
    platformProxy: {
      enabled: true,
    },
    runtime: {
      mode: 'local',
      type: 'pages',
    },
  }),
  srcDir: './src',
  integrations: [],
  vite: {
    // @ts-ignore - Tailwind CSS v4 vite plugin compatibility
    plugins: [tailwindcss()],
    define: {
      global: 'globalThis',
      'crypto.randomUUID': 'globalThis.crypto.randomUUID',
      'crypto.subtle': 'globalThis.crypto.subtle',
      'crypto.getRandomValues': 'globalThis.crypto.getRandomValues',
    },
    optimizeDeps: {
      exclude: ['crypto']
    }
  },
});