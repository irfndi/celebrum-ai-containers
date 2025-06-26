import { Container, loadBalance, getContainer } from "@cloudflare/containers";
import { Hono } from "hono";

export class CelebrumContainer extends Container {
  // Port the container listens on (default: 8080)
  defaultPort = 8080;
  // Time before container sleeps due to inactivity (default: 2m)
  sleepAfter = "2m";
  // Environment variables passed to the container
  envVars = {
    MESSAGE: "Hello from Alchemy-managed Celebrum AI!",
    NODE_ENV: "production",
    ALCHEMY_MANAGED: "true",
    CONTAINER_VERSION: "1.0.0",
  };

  // Optional lifecycle hooks
  override onStart() {
    console.log("[Alchemy] Celebrum AI Container successfully started");
    console.log("[Alchemy] Container managed by Alchemy.run");
  }

  override onStop() {
    console.log("[Alchemy] Celebrum AI Container successfully shut down");
  }

  override onError(error: unknown) {
    console.log("[Alchemy] Celebrum AI Container error:", error);
    // Enhanced error reporting for Alchemy monitoring
    if (error instanceof Error) {
      console.log("[Alchemy] Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });
    }
  }
}

// Create Hono app with proper typing for Cloudflare Workers
const app = new Hono<{
  Bindings: { 
    CELEBRUM_CONTAINER: DurableObjectNamespace<CelebrumContainer>;
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
      "/container/<ID>": "Start a container for each ID with a 2m timeout",
      "/lb": "Load balance requests over multiple containers",
      "/error": "Start a container that errors (demonstrates error handling)",
      "/singleton": "Get a single specific container instance",
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
      container_class: "CelebrumContainer",
      last_updated: new Date().toISOString(),
    },
    infrastructure: {
      provider: "Cloudflare",
      container_runtime: "Cloudflare Containers",
      worker_runtime: "Cloudflare Workers",
    },
  });
});

// Route requests to a specific container using the container ID
app.get("/container/:id", async (c) => {
  const id = c.req.param("id");
  const containerId = c.env.CELEBRUM_CONTAINER.idFromName(`/container/${id}`);
  const container = c.env.CELEBRUM_CONTAINER.get(containerId);
  return await container.fetch(c.req.raw);
});

// Demonstrate error handling - this route forces a panic in the container
app.get("/error", async (c) => {
  const container = getContainer(c.env.CELEBRUM_CONTAINER, "error-test");
  return await container.fetch(c.req.raw);
});

// Load balance requests across multiple containers
app.get("/lb", async (c) => {
  const container = await loadBalance(c.env.CELEBRUM_CONTAINER, 3);
  return await container.fetch(c.req.raw);
});

// Get a single container instance (singleton pattern)
app.get("/singleton", async (c) => {
  const container = getContainer(c.env.CELEBRUM_CONTAINER);
  return await container.fetch(c.req.raw);
});

export default app;
