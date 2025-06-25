// User and authentication related types

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
    currency: string;
    dateFormat: string;
    timeFormat: '12h' | '24h';
    chartType: 'candlestick' | 'line' | 'area';
  };
}

export interface UserSubscription {
  plan: 'free' | 'basic' | 'pro' | 'enterprise';
  status: 'active' | 'cancelled' | 'expired' | 'trial';
  startDate: string;
  endDate?: string;
  trialEndDate?: string;
  features: string[];
  limits: {
    portfolios: number;
    strategies: number;
    backtests: number;
    apiCalls: number;
    dataRetention: number; // days
  };
}

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  scope: string[];
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
  twoFactorCode?: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
  timezone: string;
  language: string;
  acceptTerms: boolean;
  marketingConsent?: boolean;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  username?: string;
  timezone?: string;
  language?: string;
  avatar?: string;
}

export interface UpdatePreferencesRequest {
  notifications?: Partial<UserPreferences['notifications']>;
  trading?: Partial<UserPreferences['trading']>;
  display?: Partial<UserPreferences['display']>;
}

export interface TwoFactorSetupRequest {
  password: string;
}

export interface TwoFactorSetupResponse {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface TwoFactorConfirmRequest {
  secret: string;
  code: string;
}

export interface TwoFactorDisableRequest {
  password: string;
  code: string;
}

export interface ApiKey {
  id: string;
  name: string;
  key: string; // Only returned on creation
  permissions: string[];
  lastUsed?: string;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateApiKeyRequest {
  name: string;
  permissions: string[];
  expiresAt?: string;
}

export interface UserSession {
  id: string;
  userId: string;
  deviceInfo: {
    userAgent: string;
    ip: string;
    location?: string;
    device: string;
    os: string;
    browser: string;
  };
  isActive: boolean;
  createdAt: string;
  lastActivity: string;
  expiresAt: string;
}

export interface UserActivity {
  id: string;
  userId: string;
  type: 'login' | 'logout' | 'order' | 'trade' | 'settings_change' | 'api_call';
  description: string;
  metadata: Record<string, any>;
  ip: string;
  userAgent: string;
  timestamp: string;
}

export interface UserStats {
  userId: string;
  totalPortfolios: number;
  totalStrategies: number;
  totalTrades: number;
  totalPnL: number;
  bestPerformingStrategy: string;
  worstPerformingStrategy: string;
  averageHoldingPeriod: number;
  winRate: number;
  lastTradeDate?: string;
  accountAge: number; // days
  loginStreak: number;
}

export interface UserNotification {
  id: string;
  userId: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: string;
  readAt?: string;
}

export interface UserLimit {
  type: string;
  current: number;
  maximum: number;
  resetDate?: string;
}

export interface KYCDocument {
  id: string;
  userId: string;
  type: 'passport' | 'drivers_license' | 'national_id' | 'utility_bill' | 'bank_statement';
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  fileName: string;
  uploadedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  expiresAt?: string;
}

export interface KYCStatus {
  userId: string;
  level: 'none' | 'basic' | 'intermediate' | 'advanced';
  status: 'pending' | 'approved' | 'rejected' | 'incomplete';
  requiredDocuments: string[];
  submittedDocuments: KYCDocument[];
  limits: {
    dailyWithdrawal: number;
    monthlyWithdrawal: number;
    maxPositionSize: number;
  };
  lastUpdated: string;
}