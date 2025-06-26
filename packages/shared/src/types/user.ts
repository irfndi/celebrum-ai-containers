export interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  timezone: string;
  language: string;
  emailVerified: boolean;
  phoneNumber?: string;
  phoneVerified: boolean;
  twoFactorEnabled: boolean;
  status: 'active' | 'suspended' | 'pending_verification';
  roles: UserRole[];
  preferences: UserPreferences;
  subscription: UserSubscription;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface UserRole {
  id: string;
  name: string;
  permissions: string[];
}

export interface UserPreferences {
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    telegram: boolean;
    priceAlerts: boolean;
    orderUpdates: boolean;
    portfolioUpdates: boolean;
    newsAlerts: boolean;
  };
  trading: {
    defaultExchange: string;
    defaultTimeframe: string;
    riskTolerance: 'low' | 'medium' | 'high';
    autoExecute: boolean;
    confirmOrders: boolean;
  };
  display: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    timezone: string;
    currency: string;
    dateFormat: string;
    timeFormat: '12h' | '24h';
    numberFormat: 'US' | 'EU' | 'IN';
  };
  privacy: {
    profileVisibility: 'public' | 'private' | 'friends';
    sharePortfolio: boolean;
    shareStrategies: boolean;
    allowAnalytics: boolean;
    allowMarketing: boolean;
  };
}

export interface UserSubscription {
  id: string;
  plan: 'free' | 'basic' | 'pro' | 'enterprise';
  status: 'active' | 'cancelled' | 'expired' | 'trial';
  startDate: string;
  endDate?: string;
  trialEndDate?: string;
  features: string[];
  limits: {
    portfolios: number;
    strategies: number;
    alerts: number;
    apiCalls: number;
    dataRetention: number; // days
  };
  billing: {
    amount: number;
    currency: string;
    interval: 'monthly' | 'yearly';
    nextBillingDate?: string;
    paymentMethod?: string;
  };
}

export interface UserSession {
  id: string;
  userId: string;
  token: string;
  refreshToken?: string;
  deviceId?: string;
  deviceName?: string;
  ipAddress: string;
  userAgent: string;
  location?: {
    country: string;
    city: string;
    region: string;
  };
  isActive: boolean;
  expiresAt: string;
  createdAt: string;
  lastActivityAt: string;
}

export interface UserActivity {
  id: string;
  userId: string;
  type: 'login' | 'logout' | 'order' | 'trade' | 'portfolio_update' | 'settings_change' | 'api_call';
  description: string;
  metadata?: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
}

export interface UserApiKey {
  id: string;
  userId: string;
  name: string;
  keyHash: string; // Hashed version of the key
  permissions: string[];
  lastUsed?: string;
  usageCount: number;
  rateLimit: {
    requests: number;
    window: string; // '1m', '1h', '1d'
  };
  isActive: boolean;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserNotificationSettings {
  userId: string;
  channels: {
    email: {
      enabled: boolean;
      address: string;
      verified: boolean;
    };
    sms: {
      enabled: boolean;
      number?: string;
      verified: boolean;
    };
    telegram: {
      enabled: boolean;
      chatId?: string;
      username?: string;
      verified: boolean;
    };
    push: {
      enabled: boolean;
      tokens: string[];
    };
    webhook: {
      enabled: boolean;
      url?: string;
      secret?: string;
    };
  };
  preferences: {
    priceAlerts: {
      enabled: boolean;
      channels: string[];
      quietHours?: {
        start: string; // HH:mm
        end: string; // HH:mm
        timezone: string;
      };
    };
    orderUpdates: {
      enabled: boolean;
      channels: string[];
      onlyImportant: boolean;
    };
    portfolioUpdates: {
      enabled: boolean;
      channels: string[];
      frequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
      threshold: number; // Percentage change to trigger
    };
    newsAlerts: {
      enabled: boolean;
      channels: string[];
      categories: string[];
      keywords: string[];
    };
    systemUpdates: {
      enabled: boolean;
      channels: string[];
      maintenance: boolean;
      features: boolean;
      security: boolean;
    };
  };
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  userId: string;
  displayName: string;
  bio?: string;
  website?: string;
  location?: string;
  avatar?: string;
  banner?: string;
  socialLinks: {
    twitter?: string;
    linkedin?: string;
    github?: string;
    telegram?: string;
  };
  stats: {
    totalReturn: number;
    totalReturnPercent: number;
    winRate: number;
    totalTrades: number;
    followersCount: number;
    followingCount: number;
    strategiesCount: number;
    portfoliosCount: number;
  };
  achievements: UserAchievement[];
  isPublic: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'trading' | 'social' | 'learning' | 'milestone';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockedAt: string;
  progress?: {
    current: number;
    target: number;
  };
}

export interface UserFollowing {
  id: string;
  followerId: string;
  followingId: string;
  type: 'user' | 'strategy' | 'portfolio';
  notifications: boolean;
  createdAt: string;
}

export interface UserWatchlist {
  id: string;
  userId: string;
  name: string;
  description?: string;
  symbols: string[];
  isDefault: boolean;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserEducation {
  id: string;
  userId: string;
  courseId: string;
  courseName: string;
  progress: number; // 0-100
  completedLessons: string[];
  currentLesson?: string;
  certificateEarned: boolean;
  certificateUrl?: string;
  startedAt: string;
  completedAt?: string;
  lastAccessedAt: string;
}

export interface UserReferral {
  id: string;
  referrerId: string;
  refereeId?: string;
  referralCode: string;
  email?: string;
  status: 'pending' | 'completed' | 'expired';
  reward: {
    type: 'credit' | 'discount' | 'feature';
    value: number;
    currency?: string;
    description: string;
  };
  createdAt: string;
  completedAt?: string;
  expiresAt?: string;
}