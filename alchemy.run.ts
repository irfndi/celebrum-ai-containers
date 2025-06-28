import alchemy from "alchemy";
import { Worker, D1Database, KVNamespace, R2Bucket, DurableObjectNamespace } from "alchemy/cloudflare";

const app = await alchemy("celebrum-ai");

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

const durableContainer = new DurableObjectNamespace("celebrum-container", {
  className: "CelebrumContainer",
  sqlite: true,
});

// Create Worker with all bindings (adopt existing if present)
const worker = await Worker("celebrum-ai-containers", {
  name: "celebrum-ai-containers",
  entrypoint: "./src/index.ts",
  adopt: true,
  bindings: {
    DB: database,
    KV: kvNamespace,
    R2: r2Bucket,
    CELEBRUM_STORAGE: durableStorage,
  },
});

export { worker, database, kvNamespace, r2Bucket, durableStorage, durableContainer };

console.log({
  url: worker.url,
});

// Export the app for deployment scripts
export { app };

// Finalize the app
await app.finalize();