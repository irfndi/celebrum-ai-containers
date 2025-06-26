import alchemy from 'alchemy';
import { Worker, D1Database } from 'alchemy/cloudflare';

// Configuration function that initializes Alchemy resources
export async function createAlchemyConfig() {
  // Validate environment variables
  validateEnvironment();
  
  // Initialize the Alchemy app for Cloudflare Workers
  const app = await alchemy('cloudflare-worker');

  // Define a D1 Database for data storage
  const celebrumDatabase = await D1Database('celebrum-db', {
    name: 'celebrum-ai-database',
  });

  // Define the Cloudflare Worker
  const celebrumWorker = await Worker('celebrum-worker', {
    name: 'celebrum-ai-worker',
    entrypoint: './src/index.ts',
    bindings: {
      DB: celebrumDatabase,
      MESSAGE: alchemy.secret(process.env.CONTAINER_MESSAGE || 'Hello from Alchemy!'),
      NODE_ENV: alchemy.secret(process.env.NODE_ENV || 'production'),
      CLOUDFLARE_ACCOUNT_ID: alchemy.secret(process.env.CLOUDFLARE_ACCOUNT_ID),
      CLOUDFLARE_API_TOKEN: alchemy.secret(process.env.CLOUDFLARE_API_TOKEN),
    },
    routes: [
       {
         pattern: 'celebrum-ai.com/*',
         zoneId: 'celebrum-ai.com',
       },
     ],
  });

  return {
    app,
    resources: {
      database: celebrumDatabase,
      worker: celebrumWorker,
    },
    finalize: () => app.finalize(),
  };
}

// Default export for compatibility
export default createAlchemyConfig;

// Environment variables validation function
export function validateEnvironment() {
  if (!process.env.CLOUDFLARE_ACCOUNT_ID) {
    throw new Error('CLOUDFLARE_ACCOUNT_ID environment variable is required');
  }

  if (!process.env.CLOUDFLARE_API_TOKEN) {
    throw new Error('CLOUDFLARE_API_TOKEN environment variable is required');
  }
}