/**
 * RouteHandler class for managing unknown routes and providing fallback logic
 */
export declare class RouteHandler {
    private readonly services;
    private readonly fallbackService;
    /**
     * Creates a new RouteHandler instance
     *
     * @param services - Map of service names to their path patterns
     * @param fallbackService - Default service to use when no match is found
     */
    constructor(services: Record<string, string[]>, fallbackService: string);
    /**
     * Detects the intended service based on the request path
     *
     * @param path - The request path to analyze
     * @returns The name of the detected service or fallback service
     */
    detectService(path: string): string;
    /**
     * Checks if a path matches a given pattern
     *
     * @param path - The normalized path to check
     * @param pattern - The pattern to match against
     * @returns True if the path matches the pattern
     */
    private matchesPattern;
    /**
     * Handles unknown routes by redirecting to the appropriate service
     *
     * @param request - The incoming request
     * @returns Response with appropriate redirect or 404
     */
    handleUnknownRoute(request: Request): Promise<Response>;
    /**
     * Constructs a URL for the target service
     *
     * @param service - The target service name
     * @param originalUrl - The original request URL
     * @returns A new URL pointing to the target service
     */
    private constructServiceUrl;
    /**
     * Creates a response for routes that are not implemented yet
     *
     * @param feature - The name of the unimplemented feature
     * @returns Response with 501 Not Implemented status
     */
    notImplementedResponse(feature: string): Response;
    /**
     * Creates a maintenance mode response
     *
     * @param message - Custom maintenance message
     * @param estimatedResolution - Estimated time when service will be back
     * @returns Response with 503 Service Unavailable status
     */
    maintenanceResponse(message?: string, estimatedResolution?: Date): Response;
}
//# sourceMappingURL=handler.d.ts.map