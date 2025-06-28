"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionService = void 0;
class SessionService {
    kv;
    sessionTTL;
    constructor(kv, sessionTTL = 3600 * 24) {
        this.kv = kv;
        this.sessionTTL = sessionTTL;
    }
    async createSession(user) {
        const sessionId = crypto.randomUUID();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + this.sessionTTL * 1000);
        const session = {
            id: sessionId,
            sessionId: sessionId,
            userId: user.id,
            telegramId: user.telegramId,
            createdAt: now,
            expiresAt,
            isActive: true
        };
        // Store session in KV with expiration
        await this.kv.put(`session:${sessionId}`, JSON.stringify(session), { expirationTtl: this.sessionTTL });
        // Store telegram ID mapping for quick lookup
        await this.kv.put(`telegram:${user.telegramId}`, sessionId, { expirationTtl: this.sessionTTL });
        return session;
    }
    async getSession(sessionId) {
        const sessionData = await this.kv.get(`session:${sessionId}`);
        if (!sessionData) {
            return null;
        }
        try {
            const session = JSON.parse(sessionData);
            // Convert date strings back to Date objects
            session.createdAt = new Date(session.createdAt);
            session.expiresAt = new Date(session.expiresAt);
            // Check if session is expired
            if (session.expiresAt < new Date()) {
                await this.deleteSession(sessionId);
                return null;
            }
            return session;
        }
        catch (error) {
            console.error('Failed to parse session data:', error);
            return null;
        }
    }
    async getSessionByTelegramId(telegramId) {
        const sessionId = await this.kv.get(`telegram:${telegramId}`);
        if (!sessionId) {
            return null;
        }
        return this.getSession(sessionId);
    }
    async deleteSession(sessionId) {
        const session = await this.getSession(sessionId);
        if (session) {
            await this.kv.delete(`telegram:${session.telegramId}`);
        }
        await this.kv.delete(`session:${sessionId}`);
    }
    async deleteSessionByTelegramId(telegramId) {
        const sessionId = await this.kv.get(`telegram:${telegramId}`);
        if (sessionId) {
            await this.deleteSession(sessionId);
        }
    }
    async refreshSession(sessionId) {
        const session = await this.getSession(sessionId);
        if (!session) {
            return null;
        }
        // Extend expiration
        const now = new Date();
        session.expiresAt = new Date(now.getTime() + this.sessionTTL * 1000);
        // Update in KV
        await this.kv.put(`session:${sessionId}`, JSON.stringify(session), { expirationTtl: this.sessionTTL });
        await this.kv.put(`telegram:${session.telegramId}`, sessionId, { expirationTtl: this.sessionTTL });
        return session;
    }
    async isSessionValid(sessionId) {
        const session = await this.getSession(sessionId);
        return session !== null && session.isActive;
    }
}
exports.SessionService = SessionService;
//# sourceMappingURL=SessionService.js.map