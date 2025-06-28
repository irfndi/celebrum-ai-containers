import { Hono } from "hono";
import { DurableObject } from "cloudflare:workers";
import { Container } from "@cloudflare/containers";
import type { Env } from "@celebrum-ai/shared";

export class CelebrumAIStorage extends DurableObject {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  async fetch(_request: Request): Promise<Response> {
    return new Response("CelebrumAIStorage is running", { status: 200 });
  }
}

export class CelebrumContainer extends Container {
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
}

// Create Hono app with proper typing for Cloudflare Workers
const app = new Hono<{
  Bindings: { 
    CELEBRUM_STORAGE: DurableObjectNamespace<CelebrumAIStorage>;
    ALCHEMY_MANAGED?: string;
    CONTAINER_VERSION?: string;
    DEPLOYMENT_STRATEGY?: string;
  };
}>();

// Home route with available endpoints
app.get("/", (c) => {
  const alchemyInfo = {
    managed: c.env.ALCHEMY_MANAGED || "false",
    version: c.env.CONTAINER_VERSION || "unknown",
    strategy: c.env.DEPLOYMENT_STRATEGY || "unknown",
  };
  
  return c.json({
    message: "Celebrum AI - Alchemy-managed Container Platform",
    alchemy: alchemyInfo,
    endpoints: {
      "/storage/<ID>": "Access Durable Object storage for each ID",
      "/container/<ID>": "Access container instance for each ID",
      "/health": "Health check endpoint for Alchemy monitoring",
      "/alchemy/status": "Alchemy deployment status",
    },
  });
});

// Health check endpoint for Alchemy monitoring
app.get("/health", (c) => {
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

// Route requests to a specific storage instance using the storage ID
app.get("/storage/:id", async (c) => {
  const id = c.req.param("id");
  const storageId = c.env.CELEBRUM_STORAGE.idFromName(`/storage/${id}`);
  const storage = c.env.CELEBRUM_STORAGE.get(storageId);
  return await storage.fetch(c.req.raw);
});

// Route requests to a specific container instance using the container ID
app.get("/container/:id", async (c) => {
  const id = c.req.param("id");
  // Container functionality will be handled by the CelebrumContainer class
  return new Response(`Container ${id} endpoint - functionality to be implemented`, { status: 200 });
});

export default app;
