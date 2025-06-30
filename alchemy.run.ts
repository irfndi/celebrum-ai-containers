import alchemy from "alchemy";
import { Worker, D1Database, KVNamespace, R2Bucket, DurableObjectNamespace } from "alchemy/cloudflare";

// Create app with proper scope configuration
const app = await alchemy("celebrum-ai", {
  stage: process.env.NODE_ENV === "production" ? "prod" : "dev"
});

// Create D1 Database (adopt existing if present)
const database = await D1Database("celebrum-db", {
  name: "celebrum-db",
  adopt: true,
});

// Create KV Namespace (adopt existing if present)
const kvNamespace = await KVNamespace("celebrum-kv", {
  title: "celebrum-kv",
  adopt: true,
});

// Create R2 Bucket (adopt existing if present)
const r2Bucket = await R2Bucket("celebrum-r2-storage", {
  name: "celebrum-r2-storage",
  adopt: true,
});

// Create Durable Objects
const durableStorage = new DurableObjectNamespace("celebrum-storage", {
  className: "CelebrumAIStorage",
  sqlite: true,
});

// Only create container durable object if containers are supported/enabled
let durableContainer;
if (process.env.ENABLE_CONTAINERS !== "false") {
  try {
    durableContainer = new DurableObjectNamespace("celebrum-container", {
      className: "CelebrumContainer",
      sqlite: true,
    });
  } catch (error) {
    console.warn("Container support not available, skipping container configuration:", error.message);
  }
}

// Create Worker with all bindings (adopt existing if present)
const bindings: Record<string, unknown> = {
  DB: database,
  ArbEdgeD1: database, // Using same database for now
  SESSIONS: kvNamespace,
  CELEBRUM_KV: kvNamespace,
  PROD_BOT_MARKET_CACHE: kvNamespace,
  PROD_BOT_SESSION_STORE: kvNamespace,
  CELEBRUM_STORAGE: durableStorage,
  CELEBRUM_CONTAINERS: durableStorage, // Using same durable object for now
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || "",
  ADMIN_TELEGRAM_IDS: process.env.ADMIN_TELEGRAM_IDS || "",
  RATE_LIMIT_REQUESTS_PER_MINUTE: process.env.RATE_LIMIT_REQUESTS_PER_MINUTE || "60",
  ENVIRONMENT: process.env.NODE_ENV || "development",
};

// Only add container binding if it was successfully created
if (durableContainer) {
  bindings.CELEBRUM_CONTAINER = durableContainer;
}

const worker = await Worker("celebrum-ai-containers", {
  name: "celebrum-ai-containers",
  entrypoint: "./src/index.ts",
  adopt: true,
  bindings,
});

// Export resources
export { worker, database, kvNamespace, r2Bucket, durableStorage };

// Conditionally export container if it exists
export const container = durableContainer || undefined;

console.log({
  url: worker.url,
});

// Export the app for deployment scripts
export { app };

// Finalize the app
await app.finalize();