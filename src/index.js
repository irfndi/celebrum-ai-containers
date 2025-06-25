import { Hono } from 'hono';
import { Container, getContainer, loadBalance } from "@cloudflare/containers";
import { ServiceRouter } from './services/router';
const serviceRouter = new ServiceRouter();
const apiRouter = serviceRouter.apiHandler();
const telegramRouter = serviceRouter.telegramBotHandler();
export class Celebrum_Container extends Container {
    // Port the container listens on (default: 8080)
    defaultPort = 8080;
    // Time before container sleeps due to inactivity (default: 30s)
    sleepAfter = "2m";
    // Environment variables passed to the container
    envVars = {
        MESSAGE: "I was passed in via the container class!",
    };
    // Optional lifecycle hooks
    onStart() {
        console.log("Container successfully started");
    }
    onStop(_) {
        console.log("Container successfully shut down");
    }
    onError(error) {
        console.log("Container error:", error);
    }
}
// Create Hono app with proper typing for Cloudflare Workers
const app = new Hono();
// Add API routes
app.route('/api/v1', apiRouter);
// Add Telegram webhook route
app.route('/telegram', telegramRouter);
// Home route with available endpoints
app.get("/", (c) => {
    return c.text("Celebrum AI - Available endpoints:\n" +
        "GET /api/v1/* - API endpoints\n" +
        "GET /container/<ID> - Start a container for each ID with a 2m timeout\n" +
        "GET /lb - Load balance requests over multiple containers\n" +
        "GET /error - Start a container that errors (demonstrates error handling)\n" +
        "GET /singleton - Get a single specific container instance");
});
// Route requests to a specific container using the container ID
app.get("/container/:id", async (c) => {
    const id = c.req.param("id");
    const container = getContainer(c.env.CELEBRUM_CONTAINERS, id);
    return await container.fetch(c.req.raw);
});
// Demonstrate error handling - this route forces a panic in the container
app.get("/error", async (c) => {
    const container = getContainer(c.env.CELEBRUM_CONTAINERS, "error-test");
    return await container.fetch(c.req.raw);
});
// Load balance requests across multiple containers
app.get("/lb", async (c) => {
    const container = await loadBalance(c.env.CELEBRUM_CONTAINERS, 3);
    return await container.fetch(c.req.raw);
});
// Get a single container instance (singleton pattern)
app.get("/singleton", async (c) => {
    const container = getContainer(c.env.CELEBRUM_CONTAINERS, "singleton");
    return await container.fetch(c.req.raw);
});
export default app;
//# sourceMappingURL=index.js.map