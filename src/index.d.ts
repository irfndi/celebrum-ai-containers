import { Hono } from 'hono';
import { Container } from "@cloudflare/containers";
import type { Env } from '@celebrum-ai/shared';
export declare class Celebrum_Container extends Container {
    defaultPort: number;
    sleepAfter: string;
    envVars: {
        MESSAGE: string;
    };
    onStart(): void | Promise<void>;
    onStop(_: any): void | Promise<void>;
    onError(error: unknown): any;
}
declare const app: Hono<{
    Bindings: Env;
}, import("hono/types").BlankSchema, "/">;
export default app;
//# sourceMappingURL=index.d.ts.map