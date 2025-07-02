import { Hono } from 'hono';
import type { Env } from '../types';

/**
 * ServiceRouter handles routing requests to appropriate services
 * based on URL patterns and service availability
 */
export class ServiceRouter {

  
  /**
   * Handle API requests
   * Routes to core API service
   */
  apiHandler() {
    const apiApp = new Hono<{ Bindings: Env }>();
    
    // All API routes
    apiApp.all('/*', async (c) => {
      const urlString = c.req.url;
      const url = urlString.startsWith('/') ? new URL(urlString, 'http://dummybase.com') : new URL(urlString);
      let path = url.pathname;
      
      // Normalize API paths
      if (path.startsWith('/api/')) {
        path = path.replace('/api', '');
      } else if (path.startsWith('/v1/')) {
        path = path.replace('/v1', '/api/v1');
      }
      
      // Route to API service
      if (c.env.API_SERVICE_URL) {
        const targetUrl = new URL(path + url.search, c.env.API_SERVICE_URL);
        const fetchOptions: RequestInit = {
          method: c.req.method,
          headers: c.req.header(),
        };
        
        if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
          fetchOptions.body = await c.req.arrayBuffer();
        }
        
        return fetch(targetUrl.toString(), fetchOptions);
      }
      
      // Fallback: basic API response
      return c.json({
        service: 'celebrum-ai-api',
        version: '1.0.0',
        path: path,
        method: c.req.method,
        timestamp: new Date().toISOString(),
        message: 'API service routing placeholder',
      });
    });
    
    return apiApp;
  }
  
  /**
   * Handle Telegram bot webhook requests
   */
  telegramBotHandler(handleTelegramUpdate?: (update: unknown, context: unknown) => Promise<Response>) {
    const telegramApp = new Hono<{ Bindings: Env }>();
    
    telegramApp.post('/webhook', async (c) => {
      if (!handleTelegramUpdate) {
        return c.json({ error: 'Telegram handler not configured' }, 500);
      }
      
      const update = await c.req.json();
      const context = { 
        env: c.env, 
        request: c.req.raw,
        waitUntil: c.executionCtx.waitUntil.bind(c.executionCtx)
      };
      return handleTelegramUpdate(update, context);
    });
    
    return telegramApp;
  }
  

  

  

  

  
  /**
   * Handle Discord bot webhook requests
   */
  discordBotHandler() {
    const discordApp = new Hono<{ Bindings: Env }>();
    
    discordApp.all('/*', async (c) => {
      const url = new URL(c.req.url);
      const path = url.pathname.replace('/webhook/discord', '');
      
      // Route to Discord bot service
      if (c.env.DISCORD_BOT_SERVICE_URL) {
        const targetUrl = new URL(path + url.search, c.env.DISCORD_BOT_SERVICE_URL);
        const fetchOptions: RequestInit = {
          method: c.req.method,
          headers: c.req.header(),
        };
        
        if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
          fetchOptions.body = await c.req.arrayBuffer();
        }
        
        return fetch(targetUrl.toString(), fetchOptions);
      }
      
      // Fallback: acknowledge webhook
      return c.json({
        ok: true,
        service: 'discord-bot',
        message: 'Webhook received',
        timestamp: new Date().toISOString(),
      });
    });
    
    return discordApp;
  }
  
  /**
   * Handle admin panel requests
   */
  adminHandler() {
    const adminApp = new Hono<{ Bindings: Env }>();
    
    adminApp.all('/*', async (c) => {
      const url = new URL(c.req.url);
      const path = url.pathname.replace('/admin', '');
      
      // Basic admin authentication check
      const authHeader = c.req.header('Authorization');
      if (!authHeader || !this.isValidAdminAuth(authHeader)) {
        return c.json({ error: 'Unauthorized' }, 401);
      }
      
      // Route to admin service or API
      if (c.env.API_SERVICE_URL) {
        const targetUrl = new URL('/admin' + path + url.search, c.env.API_SERVICE_URL);
        const fetchOptions: RequestInit = {
          method: c.req.method,
          headers: c.req.header(),
        };
        
        if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
          fetchOptions.body = await c.req.arrayBuffer();
        }
        
        return fetch(targetUrl.toString(), fetchOptions);
      }
      
      // Fallback: basic admin panel
      return c.html(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>ArbEdge Admin Panel</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body>
          <h1>ArbEdge Admin Panel</h1>
          <p>Admin functionality placeholder</p>
          <ul>
            <li><a href="/admin/users">User Management</a></li>
            <li><a href="/admin/trading">Trading Settings</a></li>
            <li><a href="/admin/analytics">Analytics</a></li>
            <li><a href="/api/health">System Health</a></li>
          </ul>
        </body>
        </html>
      `);
    });
    
    return adminApp;
  }
  
  /**
   * Get content type based on file extension
   */
  private getContentType(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase();
    
    const contentTypes: Record<string, string> = {
      'html': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript',
      'json': 'application/json',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'ico': 'image/x-icon',
      'woff': 'font/woff',
      'woff2': 'font/woff2',
      'ttf': 'font/ttf',
      'eot': 'application/vnd.ms-fontobject',
    };
    
    return contentTypes[ext || ''] || 'application/octet-stream';
  }
  
  /**
   * Validate admin authentication
   */
  private isValidAdminAuth(authHeader: string): boolean {
    // Basic validation - in production, this should be more robust
    const token = authHeader.replace('Bearer ', '');
    
    // For now, just check if it's a non-empty token
    // In production, validate against a proper auth service
    return token.length > 10;
  }
}

// Create and export router instance
const serviceRouter = new ServiceRouter();

// Export the main API router
export const router = new Hono<{ Bindings: Env }>();

// Mount the telegram bot handler
router.route('/telegram', serviceRouter.telegramBotHandler());

// Mount the API handler
router.route('/api', serviceRouter.apiHandler());

// Mount the admin handler
router.route('/admin', serviceRouter.adminHandler());

// Mount the discord handler
router.route('/discord', serviceRouter.discordBotHandler());

// Health check endpoint
router.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'celebrum-ai-worker'
  });
});