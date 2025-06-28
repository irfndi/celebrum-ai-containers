import { Hono } from "hono";
import { DurableObject } from "cloudflare:workers";
import { Container } from "@cloudflare/containers";
import type { Env } from "@celebrum-ai/shared";
export declare class CelebrumAIStorage extends DurableObject {
    constructor(ctx: DurableObjectState, env: Env);
    fetch(_request: Request): Promise<Response>;
}
export declare class CelebrumContainer extends Container {
    defaultPort: number;
    sleepAfter: number;
    envVars: {
        MESSAGE: string;
    };
    onStart(): Promise<void>;
    onStop(): Promise<void>;
    onError(error: Error): Promise<void>;
}
declare const app: Hono<{
    Bindings: {
        CELEBRUM_STORAGE: DurableObjectNamespace<CelebrumAIStorage>;
        ALCHEMY_MANAGED?: string;
        CONTAINER_VERSION?: string;
        DEPLOYMENT_STRATEGY?: string;
    };
}, import("hono/types").BlankSchema, "/">;
export default app;
//# sourceMappingURL=index.d.ts.map