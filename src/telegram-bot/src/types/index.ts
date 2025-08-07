// Telegram API types and interfaces

import type { Env } from '../../../shared/src/types';

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  channel_post?: TelegramMessage;
  edited_channel_post?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  entities?: TelegramMessageEntity[];
}

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface TelegramMessageEntity {
  type: string;
  offset: number;
  length: number;
  url?: string;
  user?: TelegramUser;
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

// Bot response types
export interface TelegramBotResponse {
  method: 'sendMessage' | 'editMessageText' | 'deleteMessage' | 'answerCallbackQuery';
  chat_id?: number;
  message_id?: number;
  text?: string;
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  reply_markup?: TelegramInlineKeyboard;
  callback_query_id?: string;
  show_alert?: boolean;
}

// Alias for compatibility with tests
export type BotResponse = TelegramBotResponse;

export interface TelegramInlineKeyboard {
  inline_keyboard: TelegramInlineKeyboardButton[][];
}

export interface TelegramInlineKeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
}

// Handler types
export interface TelegramHandler {
  command: string;
  description: string;
  handler: (update: TelegramUpdate, context: TelegramWebhookContext) => Promise<TelegramBotResponse | null>;
}

// Context types
export interface TelegramWebhookContext {
  env: Env;
  request: Request;
  waitUntil: (promise: Promise<unknown>) => void;
}

// Configuration types
export interface TelegramIntegrationConfig {
  botToken: string;
  webhookUrl?: string;
  allowedUsers?: number[];
  adminUsers?: number[];
}

// Error types
export interface TelegramError {
  ok: false;
  error_code: number;
  description: string;
}

// Success response types
export interface TelegramSuccess<T = unknown> {
  ok: true;
  result: T;
}

export type TelegramApiResponse<T = unknown> = TelegramSuccess<T> | TelegramError;