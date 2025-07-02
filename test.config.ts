import { defineConfig } from 'vitest/config';
import path from 'node:path';

/**
 * Test configuration for different environments
 */
export const testConfig = {
  // Test environment variables
  env: {
    NODE_ENV: 'test',
    TELEGRAM_BOT_TOKEN: 'test_token',
    TELEGRAM_WEBHOOK_SECRET: 'test_secret',
    DATABASE_URL: ':memory:',
    KV_NAMESPACE: 'test_kv',
    DURABLE_OBJECT_NAMESPACE: 'test_do',
    CLOUDFLARE_ACCOUNT_ID: 'test_account',
    CLOUDFLARE_API_TOKEN: 'test_token',
    ALCHEMY_API_KEY: 'test_alchemy_key',
    ENCRYPTION_KEY: 'test_encryption_key_32_characters',
    JWT_SECRET: 'test_jwt_secret_key',
    RATE_LIMIT_REQUESTS: '100',
    RATE_LIMIT_WINDOW: '60000',
    LOG_LEVEL: 'error'
  },

  // Test timeouts (in milliseconds)
  timeouts: {
    unit: 5000,
    integration: 10000,
    e2e: 30000,
    performance: 60000
  },

  // Coverage thresholds
  coverage: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    perFile: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },

  // Test patterns
  patterns: {
    unit: 'src/**/tests/unit/**/*.test.ts',
    integration: 'src/**/tests/integration/**/*.test.ts',
    e2e: 'src/**/tests/e2e/**/*.test.ts',
    telegram: 'src/telegram-bot/tests/**/*.test.ts',
    web: 'src/web/tests/**/*.test.ts',
    shared: 'src/shared/tests/**/*.test.ts',
    services: 'src/services/tests/**/*.test.ts',
    db: 'src/db/tests/**/*.test.ts'
  },

  // Mock configurations
  mocks: {
    // Cloudflare Workers APIs
    cloudflare: {
      env: {
        KV: 'MockKVNamespace',
        DB: 'MockD1Database',
        DURABLE_OBJECTS: 'MockDurableObjectNamespace'
      }
    },

    // External APIs
    external: {
      telegram: 'https://api.telegram.org',
      alchemy: 'https://api.alchemy.com'
    },

    // Database
    database: {
      type: 'sqlite',
      database: ':memory:',
      synchronize: true,
      logging: false
    }
  },

  // Test data
  fixtures: {
    users: {
      admin: {
        id: 'admin_user_id',
        telegramId: 123456789,
        username: 'admin_user',
        role: 'admin',
        isActive: true
      },
      regular: {
        id: 'regular_user_id',
        telegramId: 987654321,
        username: 'regular_user',
        role: 'user',
        isActive: true
      }
    },

    sessions: {
      valid: {
        id: 'valid_session_id',
        userId: 'regular_user_id',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        isActive: true
      },
      expired: {
        id: 'expired_session_id',
        userId: 'regular_user_id',
        expiresAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        isActive: false
      }
    },

    invitations: {
      valid: {
        id: 'valid_invitation_id',
        code: 'VALID_CODE',
        createdBy: 'admin_user_id',
        maxUses: 10,
        currentUses: 0,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        isActive: true
      },
      expired: {
        id: 'expired_invitation_id',
        code: 'EXPIRED_CODE',
        createdBy: 'admin_user_id',
        maxUses: 5,
        currentUses: 0,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        isActive: false
      }
    },

    telegram: {
      updates: {
        message: {
          update_id: 123456,
          message: {
            message_id: 1,
            from: {
              id: 987654321,
              is_bot: false,
              first_name: 'Test',
              username: 'testuser'
            },
            chat: {
              id: 987654321,
              first_name: 'Test',
              username: 'testuser',
              type: 'private'
            },
            date: Math.floor(Date.now() / 1000),
            text: '/start'
          }
        },
        callbackQuery: {
          update_id: 123457,
          callback_query: {
            id: 'callback_123',
            from: {
              id: 987654321,
              is_bot: false,
              first_name: 'Test',
              username: 'testuser'
            },
            message: {
              message_id: 2,
              from: {
                id: 123456789,
                is_bot: true,
                first_name: 'Bot',
                username: 'testbot'
              },
              chat: {
                id: 987654321,
                first_name: 'Test',
                username: 'testuser',
                type: 'private'
              },
              date: Math.floor(Date.now() / 1000),
              text: 'Choose an option:'
            },
            data: 'button_action'
          }
        }
      }
    }
  },

  // Performance benchmarks
  performance: {
    api: {
      maxResponseTime: 500, // ms
      maxMemoryUsage: 100, // MB
      maxCpuUsage: 80 // %
    },
    database: {
      maxQueryTime: 100, // ms
      maxConnectionTime: 50, // ms
      maxTransactionTime: 200 // ms
    },
    telegram: {
      maxWebhookProcessingTime: 1000, // ms
      maxMessageResponseTime: 2000 // ms
    }
  }
};

/**
 * Vitest configuration for different test types
 */
export const createTestConfig = (type: 'unit' | 'integration' | 'e2e' | 'all' = 'all') => {
  const includePatterns = type !== 'all' 
    ? [testConfig.patterns[type as keyof typeof testConfig.patterns]]
    : Object.values(testConfig.patterns);

  return defineConfig({
    test: {
      globals: true,
      environment: 'node',
      setupFiles: [path.resolve(__dirname, 'src/shared/tests/setup.ts')],
      include: includePatterns,
      testTimeout: testConfig.timeouts[type as keyof typeof testConfig.timeouts] || testConfig.timeouts.unit,
      hookTimeout: 10000,
      teardownTimeout: 10000,
      env: testConfig.env
    },
    resolve: {
      alias: {
        '@celebrum-ai/shared': path.resolve(__dirname, 'src/shared'),
        '@celebrum-ai/db': path.resolve(__dirname, 'src/db'),
        '@celebrum-ai/telegram-bot': path.resolve(__dirname, 'src/telegram-bot'),
        '@celebrum-ai/web': path.resolve(__dirname, 'src/web'),
        '@celebrum-ai/services': path.resolve(__dirname, 'src/services'),
        '@': path.resolve(__dirname, 'src')
      }
    }
  });
};

export default createTestConfig();