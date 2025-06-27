import { defineConfig } from 'alchemy';

export default defineConfig({
  worker: {
    name: 'celebrum-ai-worker',
    bindings: {
      // D1 Database binding
      D1: {
        name: 'celebrum-db',
        type: 'D1Database',
      },
      // KV Namespace binding
      CELEBRUM_KV: {
        name: 'celebrum-kv',
        type: 'KVNamespace',
      },
      // R2 Bucket binding
      CELEBRUM_R2: {
        name: 'celebrum-storage',
        type: 'R2Bucket',
      },
      // Environment variables
      ENVIRONMENT: {
        value: process.env.NODE_ENV || 'development',
      },
      API_VERSION: {
        value: '1.0.0',
      },
      DEBUG: {
        value: process.env.DEBUG || 'false',
      },
    },
    routes: [
      {
        pattern: '*',
        zone: 'celebrum.ai',
      },
    ],
  },
  // D1 Database configuration
  d1: {
    name: 'celebrum-db',
    migrations: './src/db/sql',
  },
  // KV Namespace configuration
  kv: {
    name: 'celebrum-kv',
    // Optional: Set initial values
    initialValues: {
      'app:version': '1.0.0',
      'app:initialized': new Date().toISOString(),
    },
  },
  // R2 Bucket configuration
  r2: {
    name: 'celebrum-storage',
    // Optional: Enable public access
    publicAccess: false,
    // Optional: Configure CORS
    cors: {
      allowedOrigins: ['https://celebrum.ai'],
      allowedMethods: ['GET', 'PUT', 'POST', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    },
  },
});