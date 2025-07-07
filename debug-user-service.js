// Debug script to test UserService with mock database
import { createDb } from './src/db/src/utils/connection.js';
import { UserService } from './src/shared/src/services/UserService.js';
import { createMockD1Database } from './src/shared/tests/utils/test-helpers.js';
import * as schema from './src/db/src/schema/index.js';

async function testUserService() {
  console.log('=== Testing UserService with Mock Database ===');
  
  // Create mock database
  const mockD1 = createMockD1Database();
  const db = createDb(mockD1);
  
  // Insert a test user
  console.log('Inserting test user...');
  await db.insert(schema.users).values({
    telegramId: '222',
    firstName: 'Admin',
    lastName: 'User',
    username: 'adminuser',
    email: 'adminuser@test.com',
    role: 'superadmin',
    languageCode: 'en'
  });
  
  // Test UserService
  const userService = new UserService(db);
  console.log('Testing UserService.findUserByTelegramId...');
  
  const user = await userService.findUserByTelegramId('222');
  console.log('Found user:', JSON.stringify(user, null, 2));
  
  if (user && user.role === 'superadmin') {
    console.log('✅ UserService is working correctly!');
  } else {
    console.log('❌ UserService is not working correctly!');
  }
}

testUserService().catch(console.error);