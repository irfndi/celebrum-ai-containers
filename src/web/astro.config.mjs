import { defineConfig } from "astro/config";
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
  }),
  srcDir: './src',
  integrations: [],
  vite: {
    // @ts-ignore - Tailwind CSS v4 vite plugin compatibility
    plugins: [tailwindcss()],
  },
});