"use strict";
/**
 * Health check middleware for monitoring system status
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthCheck = void 0;
/**
 * Health check middleware for monitoring system status
 */
class HealthCheck {
    config;
    startTime;
    version;
    /**
     * Create a new health check middleware
     */
    constructor(config = {}) {
        this.config = {
            path: '/_health',
            includeDetails: true,
            checkKV: true,
            checkDB: true,
            checkTelegram: true,
            checkOpenAI: true,
            additionalChecks: [],
            ...config,
        };
        this.startTime = Date.now();
        this.version = process.env.VERSION || '1.0.0';
    }
    /**
     * Middleware function for health checks
     */
    middleware = async (request, env) => {
        const url = new URL(request.url);
        // Only respond to the configured health check path
        if (url.pathname !== this.config.path) {
            return null;
        }
        const health = await this.checkHealth(env);
        return new Response(JSON.stringify(health, null, 2), {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
            },
            status: health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503,
        });
    };
    /**
     * Check overall system health
     */
    async checkHealth(env) {
        const services = {};
        // Run all configured health checks in parallel
        const checks = [];
        if (this.config.checkKV) {
            checks.push(this.checkKV(env).then(result => ['kv', result]));
        }
        if (this.config.checkDB) {
            checks.push(this.checkDatabase(env).then(result => ['database', result]));
        }
        if (this.config.checkTelegram) {
            checks.push(this.checkTelegramAPI(env).then(result => ['telegram', result]));
        }
        if (this.config.checkOpenAI) {
            checks.push(this.checkOpenAI(env).then(result => ['openai', result]));
        }
        // Add any additional custom checks
        if (this.config.additionalChecks) {
            for (let i = 0; i < this.config.additionalChecks.length; i++) {
                const check = this.config.additionalChecks[i];
                checks.push(check(env).then(result => [`custom${i}`, result]));
            }
        }
        // Wait for all checks to complete
        const results = await Promise.all(checks);
        // Populate services with check results
        for (const [name, result] of results) {
            services[name] = result;
        }
        // Determine overall system health based on service health
        const status = this.determineOverallStatus(services);
        return {
            status,
            timestamp: new Date().toISOString(),
            version: this.version,
            environment: env.ENVIRONMENT || 'development',
            uptime: Date.now() - this.startTime,
            services: this.config.includeDetails ? services : {},
        };
    }
    /**
     * Check KV store health
     */
    async checkKV(env) {
        const startTime = Date.now();
        try {
            if (!env.CELEBRUM_KV) {
                return {
                    status: 'unhealthy',
                    lastCheck: new Date().toISOString(),
                    error: 'KV store not configured'
                };
            }
            // Simple KV operation to test connectivity
            await env.CELEBRUM_KV.put('health_check', JSON.stringify({ timestamp: Date.now() }));
            const value = await env.CELEBRUM_KV.get('health_check');
            if (!value) {
                throw new Error('KV store test failed');
            }
            return {
                status: 'healthy',
                responseTime: Date.now() - startTime,
                lastCheck: new Date().toISOString()
            };
        }
        catch (error) {
            return {
                status: 'unhealthy',
                responseTime: Date.now() - startTime,
                lastCheck: new Date().toISOString(),
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Check D1 database health
     */
    async checkDatabase(env) {
        const startTime = Date.now();
        try {
            if (!env.DB) {
                return {
                    status: 'unhealthy',
                    lastCheck: new Date().toISOString(),
                    error: 'Database not configured'
                };
            }
            // Simple query to test database connectivity
            const result = await env.DB.prepare('SELECT 1 as test').first();
            if (!result || result.test !== 1) {
                throw new Error('Database query test failed');
            }
            return {
                status: 'healthy',
                responseTime: Date.now() - startTime,
                lastCheck: new Date().toISOString()
            };
        }
        catch (error) {
            return {
                status: 'unhealthy',
                responseTime: Date.now() - startTime,
                lastCheck: new Date().toISOString(),
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Check Telegram API health
     */
    async checkTelegramAPI(env) {
        const startTime = Date.now();
        try {
            if (!env.TELEGRAM_BOT_TOKEN) {
                return {
                    status: 'degraded',
                    lastCheck: new Date().toISOString(),
                    error: 'Telegram bot token not configured'
                };
            }
            const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getMe`);
            if (!response.ok) {
                throw new Error(`Telegram API returned ${response.status}`);
            }
            const data = await response.json();
            if (data && typeof data === 'object' && 'ok' in data && !data.ok) {
                throw new Error('Telegram API response not ok');
            }
            return {
                status: 'healthy',
                responseTime: Date.now() - startTime,
                lastCheck: new Date().toISOString()
            };
        }
        catch (error) {
            return {
                status: 'unhealthy',
                responseTime: Date.now() - startTime,
                lastCheck: new Date().toISOString(),
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Check OpenAI API health
     */
    async checkOpenAI(env) {
        const startTime = Date.now();
        try {
            // Check if OpenAI API key is available in env or as a custom property
            const openaiApiKey = env.OPENAI_API_KEY;
            if (!openaiApiKey) {
                return {
                    status: 'degraded',
                    lastCheck: new Date().toISOString(),
                    error: 'OpenAI API key not configured'
                };
            }
            // Simple API call to check connectivity
            const response = await fetch('https://api.openai.com/v1/models', {
                headers: {
                    'Authorization': `Bearer ${openaiApiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error(`OpenAI API returned ${response.status}`);
            }
            return {
                status: 'healthy',
                responseTime: Date.now() - startTime,
                lastCheck: new Date().toISOString()
            };
        }
        catch (error) {
            return {
                status: 'unhealthy',
                responseTime: Date.now() - startTime,
                lastCheck: new Date().toISOString(),
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Determine overall system health status based on service health
     */
    determineOverallStatus(services) {
        const statuses = Object.values(services).map(service => service.status);
        if (statuses.some(status => status === 'unhealthy')) {
            return 'unhealthy';
        }
        if (statuses.some(status => status === 'degraded')) {
            return 'degraded';
        }
        return 'healthy';
    }
}
exports.HealthCheck = HealthCheck;
//# sourceMappingURL=health.js.map