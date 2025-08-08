import { Miniflare } from 'miniflare';
import * as fs from 'fs';
import * as path from 'path';

// This function will be called by the test setup file to start the miniflare server.
export async function startTestServer() {
  // Read the wrangler.jsonc file to get the configuration.
  const wranglerConfig = JSON.parse(
    fs.readFileSync(path.resolve(process.cwd(), 'wrangler.jsonc'), 'utf-8')
  );

  // Create a new Miniflare instance with the configuration from wrangler.jsonc.
  const mf = new Miniflare({
    scriptPath: 'dist-test/index.js',
    modules: true,
    modulesRules: [{ type: 'ESModule', include: ['**/*.js'], fallthrough: true }],
    compatibilityDate: wranglerConfig.compatibility_date,
    compatibilityFlags: wranglerConfig.compatibility_flags,
    d1Databases: wranglerConfig.d1_databases.reduce((acc: any, db: any) => {
      acc[db.binding] = db.database_id;
      return acc;
    }, {}),
    kvNamespaces: wranglerConfig.kv_namespaces.reduce((acc: any, ns: any) => {
      acc[ns.binding] = ns.id;
      return acc;
    }, {}),
    durableObjects: wranglerConfig.durable_objects.bindings.reduce(
      (acc: any, obj: any) => {
        acc[obj.name] = obj.class_name;
        return acc;
      },
      {}
    ),
    bindings: {
        ...wranglerConfig.vars
    },
  });

  // Return the Miniflare instance so it can be used in the tests.
  return mf;
} 