// Debug script to test database mock functionality
const { createMockEnv } = require('./src/shared/tests/utils/test-helpers.ts');

async function testDatabaseMock() {
  try {
    console.log('Creating mock environment...');
    const mockEnv = createMockEnv();
    
    console.log('Testing user creation...');
    const testUser = {
      id: 'test-user-1',
      telegramId: '12345',
      firstName: 'Test',
      lastName: 'User',
      username: 'testuser',
      role: 'free',
      status: 'active'
    };
    
    // Insert user
    console.log('Inserting user...');
    await mockEnv.db.insert(mockEnv.db.schema.users).values(testUser);
    
    // Try to find user
    console.log('Finding user by ID...');
    const foundUser = await mockEnv.db.query.users.findFirst({
      where: { id: testUser.id }
    });
    
    console.log('Found user:', foundUser);
    
    if (foundUser) {
      console.log('✅ Database mock is working correctly');
    } else {
      console.log('❌ Database mock failed to find inserted user');
    }
    
  } catch (error) {
    console.error('Error testing database mock:', error);
  }
}

testDatabaseMock();