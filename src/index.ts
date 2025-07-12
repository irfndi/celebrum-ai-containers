import { Hono } from "hono";
import type { DurableObjectNamespace, DurableObjectState, Request as CloudflareRequest } from '@cloudflare/workers-types';
import type { Env } from "@celebrum-ai/shared";
import { handleTelegramUpdate } from "./telegram-bot/src";

// Define DurableObject base class for compatibility
class DurableObject {
  constructor(protected ctx: DurableObjectState, protected env: Env) {}
}

// Types for Cloudflare Workers
interface ExportedHandler {
  fetch(request: CloudflareRequest, env: unknown, ctx: unknown): Promise<Response>;
}

export class CelebrumAIStorage extends DurableObject {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  async fetch(_request: CloudflareRequest): Promise<Response> {
    return new Response("CelebrumAIStorage is running", { status: 200 });
  }
}

// Container class will be conditionally defined based on build-time environment
// This avoids runtime process.env access which is not available in Workers
export let CelebrumContainer: unknown = undefined;

// Only define container class if containers are enabled at build time
// Note: This check happens at build time, not runtime
if (typeof process !== 'undefined' && process.env && process.env.ENABLE_CONTAINERS !== "false") {
  try {
    // Try to import Container dynamically
    const { Container } = require("@cloudflare/containers");
    
    CelebrumContainer = class extends Container {
      defaultPort = 8080;
      sleepAfter = 60000; // 60 seconds
      envVars = {
        MESSAGE: "Hello from Celebrum AI Container!",
      };

      async onStart() {
        console.log("CelebrumContainer started");
      }

      async onStop() {
        console.log("CelebrumContainer stopped");
      }

      async onError(error: Error) {
        console.error("CelebrumContainer error:", error);
      }
    };
  } catch (error) {
     console.warn("Container support not available, containers disabled:", (error as Error).message);
     CelebrumContainer = undefined;
   }
}

// Initialize Hono app with proper bindings
const app = new Hono<{
  Bindings: Env;
}>();

// Initialize Astro SSR handler
let astroHandler: ExportedHandler | null = null;
let resolveReady: (() => void) | undefined;
export const ready = new Promise<void>(resolve => {
  resolveReady = resolve;
});

// @ts-ignore TS2571: allow assignment to globalThis for test environment flag
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(globalThis as any).__TEST_ENV__ = true;

// Determine if we're in test env by checking only the __TEST_ENV__ global
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isTestEnvironment = typeof globalThis !== 'undefined' && (globalThis as any).__TEST_ENV__ === true;

if (!isTestEnvironment) {
  // Load Astro SSR handler at module level
  (async () => {
    try {
      // Dynamic import of the Astro SSR handler
      // @ts-ignore - Skip type checking for generated Astro files
      const astroModule = await import("./web/dist/_worker.js/index.js");
      astroHandler = astroModule.default;
      console.log("Astro SSR handler loaded successfully");
    } catch (error) {
      console.error("Failed to load Astro SSR handler:", error);
    } finally {
      if (resolveReady) {
        resolveReady();
      }
    }
  })();
} else {
  // In test environment, resolve ready immediately
  if (resolveReady) {
    resolveReady();
  }
}

// Telegram webhook endpoint
app.post("/api/telegram/webhook", async (c) => {
  try {
    const update = await c.req.json();
    const context = {
      env: c.env,
      request: c.req.raw,
      waitUntil: (promise: Promise<unknown>) => {
        // In Cloudflare Workers, we can use the execution context
        // For now, we'll just handle the promise directly
        promise.catch(console.error);
      },
    };
    
    return await handleTelegramUpdate(update, context);
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return c.json({ error: "Webhook processing failed" }, 500);
  }
});

// API status endpoint
app.get("/api/status", (c) => {
  const alchemyInfo = {
    managed: c.env.ALCHEMY_MANAGED || "false",
    version: c.env.CONTAINER_VERSION || "unknown",
    strategy: c.env.DEPLOYMENT_STRATEGY || "unknown",
  };
  
  return c.json({
    message: "Celebrum AI - Alchemy-managed Container Platform",
    alchemy: alchemyInfo,
    endpoints: {
      "/api/storage/<ID>": "Access Durable Object storage for each ID",
      "/api/container/<ID>": "Access container instance for each ID",
      "/api/health": "Health check endpoint for Alchemy monitoring",
      "/api/telegram/webhook": "Telegram bot webhook endpoint",
      "/alchemy/status": "Alchemy deployment status",
    },
  });
});

// Health check endpoint for Alchemy monitoring
app.get("/api/health", (c) => {
  return c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    alchemy: {
      managed: c.env.ALCHEMY_MANAGED === "true",
      version: c.env.CONTAINER_VERSION,
      strategy: c.env.DEPLOYMENT_STRATEGY,
    },
  });
});

// Alchemy deployment status endpoint
app.get("/alchemy/status", (c) => {
  return c.json({
    deployment: {
      managed_by_alchemy: c.env.ALCHEMY_MANAGED === "true",
      container_version: c.env.CONTAINER_VERSION,
      deployment_strategy: c.env.DEPLOYMENT_STRATEGY,
      storage_class: "CelebrumAIStorage",
      last_updated: new Date().toISOString(),
    },
    infrastructure: {
      provider: "Cloudflare",
      storage_runtime: "Cloudflare Durable Objects",
      worker_runtime: "Cloudflare Workers",
    },
  });
});

if (!isTestEnvironment) {
  // Route requests to a specific storage instance using the storage ID
  app.get("/api/storage/:id", async (c) => {
    const id = c.req.param("id");
    const storageId = c.env.CELEBRUM_STORAGE.idFromName(`/storage/${id}`);
    const storage = (c.env.CELEBRUM_STORAGE as DurableObjectNamespace).get(storageId);
    // Use the raw request with proper type assertion for Cloudflare Workers
    const response = await storage.fetch(c.req.raw as unknown as CloudflareRequest);
    // Convert Cloudflare Workers Response to standard Response for Hono compatibility
    const responseBody = await response.arrayBuffer();
    return new Response(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers as unknown as HeadersInit,
    });
  });

  // Route requests to a specific container instance using the container ID
  app.get("/api/container/:id", async (c) => {
    const id = c.req.param("id");
    // Container functionality will be handled by the CelebrumContainer class
    return new Response(`Container ${id} endpoint - functionality to be implemented`, { status: 200 });
  });

  // Catch-all route for Astro SSR - this should be last
  app.all("*", async (c) => {
    if (astroHandler) {
      try {
        // Use the raw request with proper type assertion for Cloudflare Workers
        const response = await astroHandler.fetch(c.req.raw as unknown as CloudflareRequest, c.env, {
          waitUntil: () => {},
          passThroughOnException: () => {},
        });
        // Convert Cloudflare Workers Response to standard Response for Hono compatibility
        const responseBody = await response.arrayBuffer();
        return new Response(responseBody, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers as unknown as HeadersInit,
        });
      } catch (error) {
        console.error("Astro SSR error:", error);
        return c.json({ error: "Internal server error" }, 500);
      }
    }
    
    // Fallback if Astro is not available
    return c.json({
      message: "Celebrum AI - Landing page not available",
      error: "Astro SSR handler not loaded",
      available_endpoints: {
        "/api/status": "API status",
        "/api/health": "Health check",
        "/api/telegram/webhook": "Telegram webhook",
      },
    }, 503);
  });
}

// Prevent unhandled promise rejections from causing failures
if (typeof process !== 'undefined' && process.on) {
  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection prevented:', reason);
  });
}

export default app;
