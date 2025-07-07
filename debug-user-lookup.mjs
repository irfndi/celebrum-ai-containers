import { createMockDatabase } from './src/shared/tests/utils/test-helpers.ts';
import { UserService } from './src/shared/src/services/UserService.ts';
import { users } from './src/db/src/schema/users.ts';

// Create mock database
const mockDb = createMockDatabase();

// Insert admin user
console.log('=== INSERTING ADMIN USER ===');
const insertResult = await mockDb.insert(users).values({
  telegramId: '222',
  firstName: 'Admin',
  lastName: 'User', 
  username: 'adminuser',
  email: 'adminuser@test.com',
  role: 'superadmin',
  languageCode: 'en'
}).returning().execute();

console.log('Insert result:', JSON.stringify(insertResult, null, 2));

// Check if user exists in mock data store
console.log('=== CHECKING MOCK DATA STORE ===');
const allUsers = mockDb.mockDataStore.users || [];
console.log('All users in mock data store:', JSON.stringify(allUsers, null, 2));

// Test direct query
console.log('=== TESTING DIRECT QUERY ===');
const directQuery = await mockDb.query.users.findFirst({ 
  where: (users, {eq}) => eq(users.telegramId, '222')
});
console.log('Direct query result:', JSON.stringify(directQuery, null, 2));

// Test UserService
console.log('=== TESTING USER SERVICE ===');
const userService = new UserService(mockDb);
const userServiceResult = await userService.findUserByTelegramId('222');
console.log('UserService result:', JSON.stringify(userServiceResult, null, 2));

// Test raw select query
console.log('=== TESTING RAW SELECT QUERY ===');
const rawResult = await mockDb
  .select()
  .from(users)
  .where((users, {eq}) => eq(users.telegramId, '222'))
  .limit(1)
  .execute();
console.log('Raw select result:', JSON.stringify(rawResult, null, 2));