import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
	test: {
    watch: false,
    reporters: ['basic'],
		exclude: [
			'**/node_modules/**',
			'**/dist/**',
			'**/.temporary-code/**',
			'**/dist-test/**',
		],
		server: {
			deps: {
				external: [
					// Externalize Node.js built-in modules that are not available in Workers runtime
					"node:readline",
					"node:domain", 
					"node:inspector",
					"node:fs",
					"node:path",
					"node:util",
					"node:crypto",
					"node:buffer",
					"node:stream",
					"node:url",
				],
			},
		},
		deps: {
			optimizer: {
				ssr: {
					enabled: true,
					include: [
						"hono", 
						"grammy", 
						"drizzle-orm", 
						"undici",
						"@cloudflare/workers-types",
						"@cloudflare/vitest-pool-workers",
						"src/db/src/schema/**",
					],
				},
			},
		},
		poolOptions: {
			workers: {
				wrangler: { configPath: "./wrangler.jsonc" },
				miniflare: {
					// Use compatibility date that supports modern Workers features
					compatibilityDate: "2024-07-01",
					// Disable wrangler CLI in test environment to avoid terminal issues
					logLevel: "debug",
					// Add process polyfill for stdout.columns access
					bindings: {
						process: {
							stdout: {
								columns: 80, // Default terminal width
							},
						},
					},
				},
			},
		},
	},
	resolve: {
		alias: {
			// Clean alias configuration - no polyfills needed
		},
	},
});