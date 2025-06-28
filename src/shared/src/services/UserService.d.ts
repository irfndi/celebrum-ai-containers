import type { User, NewUser } from '@celebrum-ai/db/schema';
import { type Database } from '@celebrum-ai/db';
export declare class UserService {
    private userQueries;
    constructor(db: Database);
    findUserByTelegramId(telegramId: string): Promise<User | undefined>;
    createUser(userData: Partial<NewUser>): Promise<User>;
    updateUser(id: number, updates: Partial<NewUser>): Promise<User | undefined>;
}
//# sourceMappingURL=UserService.d.ts.map