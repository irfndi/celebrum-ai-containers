/**
 * RouteHandler class for managing unknown routes and providing fallback logic
 */
export class RouteHandler {
  private readonly services: Record<string, string[]>;
  private readonly fallbackService: string;

  /**
   * Creates a new RouteHandler instance
   * 
   * @param services - Map of service names to their path patterns
   * @param fallbackService - Default service to use when no match is found
   */
  constructor(services: Record<string, string[]>, fallbackService: string) {
    this.services = services;
    this.fallbackService = fallbackService;
  }

  /**
   * Detects the intended service based on the request path
   * 
   * @param path - The request path to analyze
   * @returns The name of the detected service or fallback service
   */
  public detectService(path: string): string {
    // Normalize the path
    const normalizedPath = path.toLowerCase().trim();

    // Check each service's patterns for a match
    for (const [service, patterns] of Object.entries(this.services)) {
      for (const pattern of patterns) {
        if (this.matchesPattern(normalizedPath, pattern)) {
          return service;
        }
      }
    }

    // Return the fallback service if no match is found
    return this.fallbackService;
  }

  /**
   * Checks if a path matches a given pattern
   * 
   * @param path - The normalized path to check
   * @param pattern - The pattern to match against
   * @returns True if the path matches the pattern
   */
  private matchesPattern(path: string, pattern: string): boolean {
    // Simple string match
    if (!pattern.includes('*')) {
      return path === pattern || path.startsWith(`${pattern}/`);
    }

    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\//g, '\\/') // Escape slashes
      .replace(/\./g, '\\.') // Escape dots
      .replace(/\*/g, '.*'); // Convert * to .*

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  }

  /**
   * Handles unknown routes by redirecting to the appropriate service
   * 
   * @param request - The incoming request
   * @returns Response with appropriate redirect or 404
   */
  public async handleUnknownRoute(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // Detect the service that should handle this request
    const service = this.detectService(path);
    
    if (service !== this.fallbackService) {
      // Construct the redirect URL
      const serviceUrl = this.constructServiceUrl(service, url);
      
      // Return a redirect response
      return Response.redirect(serviceUrl.toString(), 307); // 307 Temporary Redirect preserves the HTTP method
    }
    
    // If we're already at the fallback service or no service was detected
    return new Response('Not Found', { status: 404 });
  }

  /**
   * Constructs a URL for the target service
   * 
   * @param service - The target service name
   * @param originalUrl - The original request URL
   * @returns A new URL pointing to the target service
   */
  private constructServiceUrl(service: string, originalUrl: URL): URL {
    // This implementation depends on your service architecture
    // For example, you might have different subdomains or paths for each service
    
    // Example: Subdomain-based routing
    const serviceUrl = new URL(originalUrl.toString());
    serviceUrl.hostname = `${service}.${serviceUrl.hostname.split('.').slice(1).join('.')}`;
    
    // Alternative: Path-based routing
    // const serviceUrl = new URL(originalUrl.toString());
    // serviceUrl.pathname = `/services/${service}${originalUrl.pathname}`;
    
    return serviceUrl;
  }

  /**
   * Creates a response for routes that are not implemented yet
   * 
   * @param feature - The name of the unimplemented feature
   * @returns Response with 501 Not Implemented status
   */
  public notImplementedResponse(feature: string): Response {
    const body = JSON.stringify({
      error: {
        code: 'NOT_IMPLEMENTED',
        message: `The requested feature '${feature}' is not implemented yet.`,
        status: 501
      }
    });

    return new Response(body, {
      status: 501,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Creates a maintenance mode response
   * 
   * @param message - Custom maintenance message
   * @param estimatedResolution - Estimated time when service will be back
   * @returns Response with 503 Service Unavailable status
   */
  public maintenanceResponse(message?: string, estimatedResolution?: Date): Response {
    const defaultMessage = 'This service is currently undergoing maintenance. Please try again later.';
    
    const body = JSON.stringify({
      error: {
        code: 'MAINTENANCE',
        message: message || defaultMessage,
        status: 503,
        estimatedResolution: estimatedResolution?.toISOString()
      }
    });

    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };

    // Add Retry-After header if we have an estimated resolution time
    if (estimatedResolution) {
      const secondsUntilResolution = Math.max(
        0, 
        Math.floor((estimatedResolution.getTime() - Date.now()) / 1000)
      );
      headers['Retry-After'] = secondsUntilResolution.toString();
    }

    return new Response(body, {
      status: 503,
      headers
    });
  }
}