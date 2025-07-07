import { NewUser } from '@celebrum-ai/db/schema';

export const mockUser: NewUser = {
  id: 1,
  telegramId: '123456789',
  firstName: 'Test',
  lastName: 'User',
  username: 'testuser',
  languageCode: 'en',
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockUsers: NewUser[] = [
  {
    id: 2,
    telegramId: '987654321',
    firstName: 'Another',
    lastName: 'User',
    username: 'anotheruser',
    languageCode: 'en',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 3,
    telegramId: '112233445',
    firstName: 'Third',
    lastName: 'User',
    username: 'thirduser',
    languageCode: 'fr',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];