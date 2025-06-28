"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const db_1 = require("@celebrum-ai/db");
class UserService {
    userQueries;
    constructor(db) {
        this.userQueries = new db_1.UserQueries(db);
    }
    async findUserByTelegramId(telegramId) {
        return this.userQueries.findByTelegramId(telegramId);
    }
    async createUser(userData) {
        const newUser = {
            telegramId: userData.telegramId,
            firstName: userData.firstName,
            lastName: userData.lastName,
            username: userData.username,
            status: 'active',
            role: 'free',
            ...userData,
        };
        return this.userQueries.create(newUser);
    }
    async updateUser(id, updates) {
        return this.userQueries.update(id, updates);
    }
}
exports.UserService = UserService;
//# sourceMappingURL=UserService.js.map