"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.schemas = exports.createValidationMiddleware = exports.safeValidate = exports.formatValidationErrors = exports.createRequiredStringSchema = exports.createOptionalStringSchema = exports.createEnumSchema = exports.validateFiatCurrency = exports.validateCryptocurrency = exports.validateExchange = exports.validateQuantity = exports.validatePrice = exports.validateSymbol = exports.databaseConfigSchema = exports.apiConfigSchema = exports.telegramMessageSchema = exports.telegramUserSchema = exports.filterSchema = exports.dateRangeSchema = exports.paginationSchema = exports.createOpportunitySchema = exports.updatePositionSchema = exports.createPositionSchema = exports.opportunityTypeSchema = exports.positionStatusSchema = exports.positionTypeSchema = exports.changePasswordSchema = exports.loginSchema = exports.updateUserSchema = exports.createUserSchema = exports.userStatusSchema = exports.userRoleSchema = exports.exchangeIdSchema = exports.percentageSchema = exports.leverageSchema = exports.quantitySchema = exports.priceSchema = exports.symbolSchema = exports.phoneSchema = exports.usernameSchema = exports.passwordSchema = exports.emailSchema = void 0;
// @celebrum-ai/shared - Validation schemas and functions
const zod_1 = require("zod");
const constants_1 = require("../constants");
// Base validation schemas
exports.emailSchema = zod_1.z.string().email('Invalid email format');
exports.passwordSchema = zod_1.z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');
exports.usernameSchema = zod_1.z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must not exceed 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens');
exports.phoneSchema = zod_1.z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format');
// Trading validation schemas
exports.symbolSchema = zod_1.z.string()
    .min(3, 'Symbol must be at least 3 characters')
    .max(20, 'Symbol must not exceed 20 characters')
    .regex(/^[A-Z0-9]+\/[A-Z0-9]+$/, 'Symbol must be in format BASE/QUOTE (e.g., BTC/USDT)');
exports.priceSchema = zod_1.z.number()
    .positive('Price must be positive')
    .finite('Price must be a finite number')
    .refine(val => val > 0.00000001, 'Price too small')
    .refine(val => val < 1000000000, 'Price too large');
exports.quantitySchema = zod_1.z.number()
    .positive('Quantity must be positive')
    .finite('Quantity must be a finite number')
    .refine(val => val > 0.00000001, 'Quantity too small');
exports.leverageSchema = zod_1.z.number()
    .min(1, 'Leverage must be at least 1x')
    .max(100, 'Leverage cannot exceed 100x')
    .int('Leverage must be a whole number');
exports.percentageSchema = zod_1.z.number()
    .min(0, 'Percentage cannot be negative')
    .max(100, 'Percentage cannot exceed 100');
exports.exchangeIdSchema = zod_1.z.enum(['binance', 'bybit', 'okx', 'bitget', 'kucoin']);
// User validation schemas
exports.userRoleSchema = zod_1.z.enum(['admin', 'premium', 'basic']);
exports.userStatusSchema = zod_1.z.enum(['active', 'inactive', 'suspended', 'pending']);
exports.createUserSchema = zod_1.z.object({
    email: exports.emailSchema,
    username: exports.usernameSchema,
    password: exports.passwordSchema,
    firstName: zod_1.z.string().min(1, 'First name is required').max(50, 'First name too long'),
    lastName: zod_1.z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
    phone: exports.phoneSchema.optional(),
    role: exports.userRoleSchema.default('basic'),
    status: exports.userStatusSchema.default('pending'),
});
exports.updateUserSchema = exports.createUserSchema.partial().omit({ password: true });
exports.loginSchema = zod_1.z.object({
    email: exports.emailSchema,
    password: zod_1.z.string().min(1, 'Password is required'),
});
exports.changePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1, 'Current password is required'),
    newPassword: exports.passwordSchema,
    confirmPassword: zod_1.z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
});
// Trading validation schemas
exports.positionTypeSchema = zod_1.z.enum(['long', 'short']);
exports.positionStatusSchema = zod_1.z.enum(['open', 'closed', 'liquidated']);
exports.opportunityTypeSchema = zod_1.z.enum(['arbitrage', 'funding', 'spread']);
exports.createPositionSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid('Invalid user ID'),
    symbol: exports.symbolSchema,
    type: exports.positionTypeSchema,
    size: exports.quantitySchema,
    entryPrice: exports.priceSchema,
    leverage: exports.leverageSchema.default(1),
    stopLoss: exports.priceSchema.optional(),
    takeProfit: exports.priceSchema.optional(),
    exchangeId: exports.exchangeIdSchema,
});
exports.updatePositionSchema = zod_1.z.object({
    exitPrice: exports.priceSchema.optional(),
    status: exports.positionStatusSchema.optional(),
    stopLoss: exports.priceSchema.optional(),
    takeProfit: exports.priceSchema.optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
exports.createOpportunitySchema = zod_1.z.object({
    type: exports.opportunityTypeSchema,
    symbol: exports.symbolSchema,
    buyExchange: exports.exchangeIdSchema,
    sellExchange: exports.exchangeIdSchema,
    buyPrice: exports.priceSchema,
    sellPrice: exports.priceSchema,
    volume: exports.quantitySchema,
    profitPercentage: exports.percentageSchema,
    confidence: zod_1.z.number().min(0).max(1),
    expiresAt: zod_1.z.date(),
});
// API validation schemas
exports.paginationSchema = zod_1.z.object({
    page: zod_1.z.number().int().min(1).default(1),
    limit: zod_1.z.number().int().min(1).max(100).default(20),
    sortBy: zod_1.z.string().optional(),
    sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc'),
});
exports.dateRangeSchema = zod_1.z.object({
    startDate: zod_1.z.date(),
    endDate: zod_1.z.date(),
}).refine(data => data.startDate <= data.endDate, {
    message: 'Start date must be before or equal to end date',
    path: ['endDate'],
});
exports.filterSchema = zod_1.z.object({
    status: zod_1.z.string().optional(),
    type: zod_1.z.string().optional(),
    exchange: exports.exchangeIdSchema.optional(),
    symbol: exports.symbolSchema.optional(),
    minAmount: zod_1.z.number().positive().optional(),
    maxAmount: zod_1.z.number().positive().optional(),
    startDate: zod_1.z.date().optional(),
    endDate: zod_1.z.date().optional(),
});
// Telegram validation schemas
exports.telegramUserSchema = zod_1.z.object({
    id: zod_1.z.number().int().positive(),
    first_name: zod_1.z.string(),
    last_name: zod_1.z.string().optional(),
    username: zod_1.z.string().optional(),
    language_code: zod_1.z.string().optional(),
});
exports.telegramMessageSchema = zod_1.z.object({
    message_id: zod_1.z.number().int().positive(),
    from: exports.telegramUserSchema,
    chat: zod_1.z.object({
        id: zod_1.z.number().int(),
        type: zod_1.z.enum(['private', 'group', 'supergroup', 'channel']),
        title: zod_1.z.string().optional(),
        username: zod_1.z.string().optional(),
    }),
    date: zod_1.z.number().int().positive(),
    text: zod_1.z.string().optional(),
});
// Configuration validation schemas
exports.apiConfigSchema = zod_1.z.object({
    port: zod_1.z.number().int().min(1).max(65535),
    host: zod_1.z.string().min(1),
    cors: zod_1.z.object({
        origin: zod_1.z.union([zod_1.z.string(), zod_1.z.array(zod_1.z.string()), zod_1.z.boolean()]),
        credentials: zod_1.z.boolean(),
    }),
    rateLimit: zod_1.z.object({
        windowMs: zod_1.z.number().int().positive(),
        max: zod_1.z.number().int().positive(),
    }),
});
exports.databaseConfigSchema = zod_1.z.object({
    url: zod_1.z.string().url(),
    maxConnections: zod_1.z.number().int().positive(),
    connectionTimeout: zod_1.z.number().int().positive(),
    queryTimeout: zod_1.z.number().int().positive(),
    retryAttempts: zod_1.z.number().int().min(0),
});
// Utility validation functions
const validateSymbol = (symbol) => {
    try {
        exports.symbolSchema.parse(symbol);
        return true;
    }
    catch {
        return false;
    }
};
exports.validateSymbol = validateSymbol;
const validatePrice = (price) => {
    try {
        exports.priceSchema.parse(price);
        return true;
    }
    catch {
        return false;
    }
};
exports.validatePrice = validatePrice;
const validateQuantity = (quantity) => {
    try {
        exports.quantitySchema.parse(quantity);
        return true;
    }
    catch {
        return false;
    }
};
exports.validateQuantity = validateQuantity;
const validateExchange = (exchange) => {
    return Object.keys(constants_1.EXCHANGE_INFO).includes(exchange);
};
exports.validateExchange = validateExchange;
const validateCryptocurrency = (crypto) => {
    return Object.keys(constants_1.CRYPTOCURRENCIES).includes(crypto.toUpperCase());
};
exports.validateCryptocurrency = validateCryptocurrency;
const validateFiatCurrency = (fiat) => {
    return Object.keys(constants_1.FIAT_CURRENCIES).includes(fiat.toUpperCase());
};
exports.validateFiatCurrency = validateFiatCurrency;
// Custom validation helpers
const createEnumSchema = (values, name) => {
    return zod_1.z.enum(values, {
        errorMap: () => ({ message: `Invalid ${name}. Must be one of: ${values.join(', ')}` }),
    });
};
exports.createEnumSchema = createEnumSchema;
const createOptionalStringSchema = (minLength = 0, maxLength = 255) => {
    return zod_1.z.string().min(minLength).max(maxLength).optional().or(zod_1.z.literal(''));
};
exports.createOptionalStringSchema = createOptionalStringSchema;
const createRequiredStringSchema = (minLength = 1, maxLength = 255) => {
    return zod_1.z.string().min(minLength, `Must be at least ${minLength} characters`)
        .max(maxLength, `Must not exceed ${maxLength} characters`);
};
exports.createRequiredStringSchema = createRequiredStringSchema;
// Validation error formatter
const formatValidationErrors = (error) => {
    return error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code,
    }));
};
exports.formatValidationErrors = formatValidationErrors;
// Safe validation wrapper
const safeValidate = (schema, data) => {
    const result = schema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data, errors: null };
    }
    return {
        success: false,
        data: null,
        errors: (0, exports.formatValidationErrors)(result.error),
    };
};
exports.safeValidate = safeValidate;
// Validation middleware helper
const createValidationMiddleware = (schema) => {
    return (data) => {
        const result = (0, exports.safeValidate)(schema, data);
        if (!result.success) {
            throw new Error(`Validation failed: ${JSON.stringify(result.errors)}`);
        }
        return result.data;
    };
};
exports.createValidationMiddleware = createValidationMiddleware;
// Export all schemas for external use
exports.schemas = {
    // Base schemas
    email: exports.emailSchema,
    password: exports.passwordSchema,
    username: exports.usernameSchema,
    phone: exports.phoneSchema,
    // Trading schemas
    symbol: exports.symbolSchema,
    price: exports.priceSchema,
    quantity: exports.quantitySchema,
    leverage: exports.leverageSchema,
    percentage: exports.percentageSchema,
    exchangeId: exports.exchangeIdSchema,
    // User schemas
    userRole: exports.userRoleSchema,
    userStatus: exports.userStatusSchema,
    createUser: exports.createUserSchema,
    updateUser: exports.updateUserSchema,
    login: exports.loginSchema,
    changePassword: exports.changePasswordSchema,
    // Trading schemas
    positionType: exports.positionTypeSchema,
    positionStatus: exports.positionStatusSchema,
    opportunityType: exports.opportunityTypeSchema,
    createPosition: exports.createPositionSchema,
    updatePosition: exports.updatePositionSchema,
    createOpportunity: exports.createOpportunitySchema,
    // API schemas
    pagination: exports.paginationSchema,
    dateRange: exports.dateRangeSchema,
    filter: exports.filterSchema,
    // Telegram schemas
    telegramUser: exports.telegramUserSchema,
    telegramMessage: exports.telegramMessageSchema,
    // Config schemas
    apiConfig: exports.apiConfigSchema,
    databaseConfig: exports.databaseConfigSchema,
};
//# sourceMappingURL=index.js.map