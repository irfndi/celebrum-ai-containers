// Notification and messaging related types

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  channel: NotificationChannel[];
  title: string;
  message: string;
  data?: Record<string, any>;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'read';
  scheduledAt?: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  expiresAt?: string;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  updatedAt: string;
}

export type NotificationType = 
  | 'price_alert'
  | 'order_filled'
  | 'order_cancelled'
  | 'position_opened'
  | 'position_closed'
  | 'stop_loss_triggered'
  | 'take_profit_triggered'
  | 'margin_call'
  | 'risk_alert'
  | 'portfolio_update'
  | 'strategy_signal'
  | 'arbitrage_opportunity'
  | 'system_maintenance'
  | 'security_alert'
  | 'account_update'
  | 'subscription_update'
  | 'news_alert'
  | 'market_update'
  | 'custom';

export type NotificationChannel = 
  | 'email'
  | 'push'
  | 'sms'
  | 'telegram'
  | 'webhook'
  | 'in_app';

export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  name: string;
  description: string;
  templates: {
    [key in NotificationChannel]?: {
      subject?: string;
      body: string;
      format: 'text' | 'html' | 'markdown';
    };
  };
  variables: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreference {
  userId: string;
  type: NotificationType;
  channels: NotificationChannel[];
  enabled: boolean;
  quietHours?: {
    start: string; // HH:mm format
    end: string; // HH:mm format
    timezone: string;
  };
  frequency?: 'immediate' | 'batched' | 'daily' | 'weekly';
  conditions?: {
    minAmount?: number;
    minPercentage?: number;
    symbols?: string[];
    exchanges?: string[];
  };
}

export interface PushSubscription {
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent: string;
  isActive: boolean;
  createdAt: string;
  lastUsed?: string;
}

export interface EmailTemplate {
  subject: string;
  htmlBody: string;
  textBody: string;
  variables: Record<string, any>;
}

export interface SMSTemplate {
  body: string;
  variables: Record<string, any>;
}

export interface TelegramTemplate {
  message: string;
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  keyboard?: TelegramKeyboard;
  variables: Record<string, any>;
}

export interface TelegramKeyboard {
  inline_keyboard: TelegramButton[][];
}

export interface TelegramButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export interface WebhookTemplate {
  url: string;
  method: 'POST' | 'PUT' | 'PATCH';
  headers: Record<string, string>;
  body: Record<string, any>;
  variables: Record<string, any>;
}

export interface NotificationBatch {
  id: string;
  userId: string;
  type: NotificationType;
  notifications: string[]; // Notification IDs
  status: 'pending' | 'processing' | 'sent' | 'failed';
  scheduledAt: string;
  processedAt?: string;
  summary: {
    total: number;
    sent: number;
    failed: number;
  };
}

export interface NotificationStats {
  userId: string;
  period: string; // '1d', '7d', '30d'
  byType: Record<NotificationType, {
    sent: number;
    delivered: number;
    read: number;
    failed: number;
  }>;
  byChannel: Record<NotificationChannel, {
    sent: number;
    delivered: number;
    failed: number;
  }>;
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  totalFailed: number;
  deliveryRate: number;
  readRate: number;
  timestamp: string;
}

export interface NotificationQueue {
  id: string;
  priority: number;
  notification: Notification;
  attempts: number;
  nextRetry?: string;
  lastError?: string;
  createdAt: string;
}

export interface NotificationLog {
  id: string;
  notificationId: string;
  channel: NotificationChannel;
  status: 'sent' | 'delivered' | 'failed' | 'bounced';
  response?: string;
  error?: string;
  timestamp: string;
}

export interface AlertRule {
  id: string;
  userId: string;
  name: string;
  description: string;
  conditions: AlertCondition[];
  actions: AlertAction[];
  isActive: boolean;
  cooldownPeriod: number; // minutes
  lastTriggered?: string;
  triggerCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AlertCondition {
  type: 'price' | 'volume' | 'portfolio_value' | 'pnl' | 'position_size' | 'risk_score';
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'between';
  value: number | [number, number];
  symbol?: string;
  exchange?: string;
  timeframe?: string;
}

export interface AlertAction {
  type: 'notification' | 'close_position' | 'place_order' | 'pause_strategy' | 'webhook';
  parameters: Record<string, any>;
}

export interface MarketNewsAlert {
  id: string;
  title: string;
  summary: string;
  content: string;
  source: string;
  category: 'market' | 'crypto' | 'regulation' | 'technology' | 'company';
  sentiment: 'positive' | 'negative' | 'neutral';
  impact: 'low' | 'medium' | 'high';
  symbols: string[];
  tags: string[];
  publishedAt: string;
  url?: string;
}

export interface SystemAlert {
  id: string;
  type: 'maintenance' | 'outage' | 'performance' | 'security' | 'update';
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  affectedServices: string[];
  startTime: string;
  endTime?: string;
  estimatedDuration?: number; // minutes
  status: 'scheduled' | 'ongoing' | 'resolved';
  updates: SystemAlertUpdate[];
}

export interface SystemAlertUpdate {
  id: string;
  message: string;
  timestamp: string;
  status?: 'investigating' | 'identified' | 'monitoring' | 'resolved';
}