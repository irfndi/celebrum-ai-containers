# Username Tracking Feature

This document describes the username tracking functionality implemented in the Celebrum AI platform.

## Overview

The username tracking feature automatically monitors and records changes to user usernames from Telegram, providing a complete history of username changes for each user.

## Database Schema

### `user_username_history` Table

```sql
CREATE TABLE user_username_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  telegram_id TEXT NOT NULL,
  username TEXT,
  changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  change_source TEXT NOT NULL DEFAULT 'telegram',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Columns:**
- `id`: Primary key
- `user_id`: Reference to the user in the `users` table
- `telegram_id`: Telegram user ID for quick lookups
- `username`: The username at this point in time (can be NULL if user removed username)
- `changed_at`: Timestamp when the change was recorded
- `change_source`: Source of the change (currently always 'telegram')

## Implementation

### Database Layer

**UserUsernameHistoryQueries** (`src/db/src/utils/queries.ts`)
- `findByTelegramId(telegramId)`: Get username history for a user
- `findByUserId(userId)`: Get username history by user ID
- `create(data)`: Create a new username history entry
- `getLatestUsername(telegramId)`: Get the most recent username for a user

### Service Layer

**UserService** (`src/shared/src/services/UserService.ts`)
- `updateFromTelegramData()`: Updates user data from Telegram and tracks username changes
- `createUserWithUsernameTracking()`: Creates a new user and records initial username
- `trackUsernameChange()`: Records a username change
- `getUsernameHistory()`: Retrieves username history
- `getLatestUsernameFromHistory()`: Gets the latest username from history

### Handler Integration

**Telegram Bot Handlers** (`src/telegram-bot/src/handlers/index.ts`)
- Automatically calls `updateFromTelegramData()` for existing users
- Uses `createUserWithUsernameTracking()` for new user creation

## Usage Examples

### Tracking Username Changes

```typescript
// When a user interacts with the bot
const userService = new UserService(db);

// For existing users - automatically tracks username changes
await userService.updateFromTelegramData(telegramId, {
  firstName: 'John',
  lastName: 'Doe',
  username: 'johndoe_new', // Will be tracked if different from current
  languageCode: 'en'
});

// For new users - tracks initial username
const newUser = await userService.createUserWithUsernameTracking({
  telegramId: '123456789',
  firstName: 'John',
  username: 'johndoe'
});
```

### Retrieving Username History

```typescript
// Get complete username history
const history = await userService.getUsernameHistory('123456789');

// Get latest username from history
const latestUsername = await userService.getLatestUsernameFromHistory('123456789');
```

## Migration

The feature includes a migration (`016_add_user_username_history.sql`) that:
1. Creates the `user_username_history` table
2. Migrates existing usernames from the `users` table
3. Sets up proper indexes for performance

## Testing

Comprehensive unit tests are provided in:
- `src/shared/tests/unit/user-service-username-tracking.test.ts`

Tests cover:
- Username change tracking
- Initial username recording
- Null username handling
- History retrieval
- Manual field updates (non-username fields)

## Benefits

1. **Audit Trail**: Complete history of username changes
2. **User Identification**: Ability to find users by previous usernames
3. **Analytics**: Track username change patterns
4. **Compliance**: Maintain records for regulatory requirements
5. **Automatic**: No manual intervention required

## Future Enhancements

- Add support for tracking changes from other sources (manual admin updates, etc.)
- Implement username search functionality
- Add analytics dashboard for username change patterns
- Consider adding retention policies for old username history