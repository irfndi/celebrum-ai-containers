export interface Notification {
    id: string;
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: Record<string, unknown>;
    channels: NotificationChannel[];
    priority: 'low' | 'normal' | 'high' | 'urgent';
    status: 'pending' | 'sent' | 'delivered' | 'failed' | 'read';
    scheduledAt?: string;
    sentAt?: string;
    readAt?: string;
    expiresAt?: string;
    retryCount: number;
    maxRetries: number;
    createdAt: string;
    updatedAt: string;
}
export type NotificationType = 'price_alert' | 'order_filled' | 'order_cancelled' | 'order_rejected' | 'portfolio_update' | 'strategy_signal' | 'news_alert' | 'system_maintenance' | 'security_alert' | 'account_update' | 'subscription_update' | 'achievement_unlocked' | 'social_follow' | 'social_like' | 'social_comment' | 'educational_reminder' | 'market_update' | 'risk_warning' | 'margin_call' | 'api_limit_warning' | 'backup_reminder' | 'verification_required' | 'welcome' | 'custom';
export type NotificationChannel = 'email' | 'sms' | 'push' | 'telegram' | 'webhook' | 'in_app' | 'slack' | 'discord';
export interface NotificationTemplate {
    id: string;
    type: NotificationType;
    name: string;
    description: string;
    templates: {
        [key in NotificationChannel]?: {
            subject?: string;
            title: string;
            body: string;
            html?: string;
            variables: string[];
        };
    };
    defaultChannels: NotificationChannel[];
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface NotificationPreference {
    userId: string;
    type: NotificationType;
    enabled: boolean;
    channels: NotificationChannel[];
    quietHours?: {
        enabled: boolean;
        start: string;
        end: string;
        timezone: string;
        days: number[];
    };
    frequency: {
        type: 'immediate' | 'batched' | 'digest';
        interval?: string;
        maxPerHour?: number;
        maxPerDay?: number;
    };
    filters?: {
        minAmount?: number;
        symbols?: string[];
        exchanges?: string[];
        keywords?: string[];
        excludeKeywords?: string[];
    };
    updatedAt: string;
}
export interface NotificationQueue {
    id: string;
    notificationId: string;
    channel: NotificationChannel;
    recipient: string;
    payload: Record<string, unknown>;
    status: 'queued' | 'processing' | 'sent' | 'failed' | 'cancelled';
    priority: number;
    scheduledAt: string;
    attempts: number;
    maxAttempts: number;
    lastAttemptAt?: string;
    nextAttemptAt?: string;
    error?: string;
    createdAt: string;
    updatedAt: string;
}
export interface NotificationDelivery {
    id: string;
    notificationId: string;
    queueId: string;
    channel: NotificationChannel;
    recipient: string;
    status: 'delivered' | 'failed' | 'bounced' | 'complained';
    providerId?: string;
    providerResponse?: Record<string, unknown>;
    deliveredAt?: string;
    openedAt?: string;
    clickedAt?: string;
    error?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
}
export interface NotificationStats {
    userId?: string;
    type?: NotificationType;
    channel?: NotificationChannel;
    period: {
        start: string;
        end: string;
    };
    metrics: {
        sent: number;
        delivered: number;
        opened: number;
        clicked: number;
        failed: number;
        bounced: number;
        complained: number;
        unsubscribed: number;
    };
    rates: {
        deliveryRate: number;
        openRate: number;
        clickRate: number;
        failureRate: number;
        bounceRate: number;
        complaintRate: number;
    };
}
export interface NotificationBatch {
    id: string;
    userId: string;
    type: 'digest' | 'summary' | 'batch';
    notifications: string[];
    channels: NotificationChannel[];
    scheduledAt: string;
    sentAt?: string;
    status: 'pending' | 'sent' | 'failed';
    createdAt: string;
}
export interface NotificationSubscription {
    id: string;
    userId: string;
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
    userAgent?: string;
    isActive: boolean;
    createdAt: string;
    lastUsedAt?: string;
}
export interface NotificationWebhook {
    id: string;
    userId: string;
    url: string;
    events: NotificationType[];
    secret?: string;
    headers?: Record<string, string>;
    isActive: boolean;
    lastTriggeredAt?: string;
    failureCount: number;
    maxFailures: number;
    createdAt: string;
    updatedAt: string;
}
export interface NotificationRule {
    id: string;
    userId: string;
    name: string;
    description?: string;
    conditions: {
        type: NotificationType[];
        channels?: NotificationChannel[];
        timeRange?: {
            start: string;
            end: string;
        };
        frequency?: {
            max: number;
            window: string;
        };
        filters?: Record<string, unknown>;
    };
    actions: {
        type: 'suppress' | 'redirect' | 'modify' | 'escalate';
        parameters: Record<string, unknown>;
    }[];
    priority: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface NotificationEvent {
    id: string;
    type: NotificationType;
    source: string;
    userId?: string;
    data: Record<string, unknown>;
    metadata?: {
        correlationId?: string;
        sessionId?: string;
        requestId?: string;
        userAgent?: string;
        ipAddress?: string;
    };
    timestamp: string;
    processed: boolean;
    processedAt?: string;
    notificationIds?: string[];
}
export interface NotificationAnalytics {
    id: string;
    userId?: string;
    notificationId: string;
    event: 'sent' | 'delivered' | 'opened' | 'clicked' | 'dismissed' | 'unsubscribed';
    channel: NotificationChannel;
    timestamp: string;
    metadata?: {
        deviceType?: string;
        browser?: string;
        os?: string;
        location?: string;
        referrer?: string;
    };
}
export interface NotificationCampaign {
    id: string;
    name: string;
    description?: string;
    type: 'broadcast' | 'targeted' | 'triggered';
    status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'cancelled';
    template: {
        type: NotificationType;
        channels: NotificationChannel[];
        content: Record<NotificationChannel, unknown>;
    };
    targeting: {
        userIds?: string[];
        segments?: string[];
        filters?: Record<string, unknown>;
    };
    schedule?: {
        startAt: string;
        endAt?: string;
        timezone: string;
        frequency?: {
            type: 'once' | 'recurring';
            interval?: string;
            days?: number[];
            time?: string;
        };
    };
    stats: {
        targeted: number;
        sent: number;
        delivered: number;
        opened: number;
        clicked: number;
        failed: number;
    };
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    startedAt?: string;
    completedAt?: string;
}
//# sourceMappingURL=notifications.d.ts.map