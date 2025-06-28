import type { KVNamespace } from '@cloudflare/workers-types';
import type { User } from '@celebrum-ai/db/schema';
export interface Session {
    id: string;
    sessionId: string;
    userId: number;
    telegramId: string;
    createdAt: Date;
    expiresAt: Date;
    isActive: boolean;
}
export declare class SessionService {
    private kv;
    private sessionTTL;
    constructor(kv: KVNamespace, sessionTTL?: number);
    createSession(user: User): Promise<Session>;
    getSession(sessionId: string): Promise<Session | null>;
    getSessionByTelegramId(telegramId: string): Promise<Session | null>;
    deleteSession(sessionId: string): Promise<void>;
    deleteSessionByTelegramId(telegramId: string): Promise<void>;
    refreshSession(sessionId: string): Promise<Session | null>;
    isSessionValid(sessionId: string): Promise<boolean>;
}
//# sourceMappingURL=SessionService.d.ts.map