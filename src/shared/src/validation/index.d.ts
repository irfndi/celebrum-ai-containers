import { z } from 'zod';
import { EXCHANGE_INFO } from '../constants';
export declare const emailSchema: z.ZodString;
export declare const passwordSchema: z.ZodString;
export declare const usernameSchema: z.ZodString;
export declare const phoneSchema: z.ZodString;
export declare const symbolSchema: z.ZodString;
export declare const priceSchema: z.ZodEffects<z.ZodEffects<z.ZodNumber, number, number>, number, number>;
export declare const quantitySchema: z.ZodEffects<z.ZodNumber, number, number>;
export declare const leverageSchema: z.ZodNumber;
export declare const percentageSchema: z.ZodNumber;
export declare const exchangeIdSchema: z.ZodEnum<["binance", "bybit", "okx", "bitget", "kucoin"]>;
export declare const userRoleSchema: z.ZodEnum<["admin", "premium", "basic"]>;
export declare const userStatusSchema: z.ZodEnum<["active", "inactive", "suspended", "pending"]>;
export declare const createUserSchema: z.ZodObject<{
    email: z.ZodString;
    username: z.ZodString;
    password: z.ZodString;
    firstName: z.ZodString;
    lastName: z.ZodString;
    phone: z.ZodOptional<z.ZodString>;
    role: z.ZodDefault<z.ZodEnum<["admin", "premium", "basic"]>>;
    status: z.ZodDefault<z.ZodEnum<["active", "inactive", "suspended", "pending"]>>;
}, "strip", z.ZodTypeAny, {
    email: string;
    status: "active" | "inactive" | "pending" | "suspended";
    firstName: string;
    lastName: string;
    username: string;
    role: "basic" | "admin" | "premium";
    password: string;
    phone?: string | undefined;
}, {
    email: string;
    firstName: string;
    lastName: string;
    username: string;
    password: string;
    status?: "active" | "inactive" | "pending" | "suspended" | undefined;
    role?: "basic" | "admin" | "premium" | undefined;
    phone?: string | undefined;
}>;
export declare const updateUserSchema: z.ZodObject<Omit<{
    email: z.ZodOptional<z.ZodString>;
    username: z.ZodOptional<z.ZodString>;
    password: z.ZodOptional<z.ZodString>;
    firstName: z.ZodOptional<z.ZodString>;
    lastName: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    role: z.ZodOptional<z.ZodDefault<z.ZodEnum<["admin", "premium", "basic"]>>>;
    status: z.ZodOptional<z.ZodDefault<z.ZodEnum<["active", "inactive", "suspended", "pending"]>>>;
}, "password">, "strip", z.ZodTypeAny, {
    email?: string | undefined;
    status?: "active" | "inactive" | "pending" | "suspended" | undefined;
    firstName?: string | undefined;
    lastName?: string | undefined;
    username?: string | undefined;
    role?: "basic" | "admin" | "premium" | undefined;
    phone?: string | undefined;
}, {
    email?: string | undefined;
    status?: "active" | "inactive" | "pending" | "suspended" | undefined;
    firstName?: string | undefined;
    lastName?: string | undefined;
    username?: string | undefined;
    role?: "basic" | "admin" | "premium" | undefined;
    phone?: string | undefined;
}>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const changePasswordSchema: z.ZodEffects<z.ZodObject<{
    currentPassword: z.ZodString;
    newPassword: z.ZodString;
    confirmPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}, {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}>, {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}, {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}>;
export declare const positionTypeSchema: z.ZodEnum<["long", "short"]>;
export declare const positionStatusSchema: z.ZodEnum<["open", "closed", "liquidated"]>;
export declare const opportunityTypeSchema: z.ZodEnum<["arbitrage", "funding", "spread"]>;
export declare const createPositionSchema: z.ZodObject<{
    userId: z.ZodString;
    symbol: z.ZodString;
    type: z.ZodEnum<["long", "short"]>;
    size: z.ZodEffects<z.ZodNumber, number, number>;
    entryPrice: z.ZodEffects<z.ZodEffects<z.ZodNumber, number, number>, number, number>;
    leverage: z.ZodDefault<z.ZodNumber>;
    stopLoss: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodNumber, number, number>, number, number>>;
    takeProfit: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodNumber, number, number>, number, number>>;
    exchangeId: z.ZodEnum<["binance", "bybit", "okx", "bitget", "kucoin"]>;
}, "strip", z.ZodTypeAny, {
    symbol: string;
    type: "long" | "short";
    userId: string;
    exchangeId: "binance" | "bybit" | "okx" | "bitget" | "kucoin";
    entryPrice: number;
    leverage: number;
    size: number;
    stopLoss?: number | undefined;
    takeProfit?: number | undefined;
}, {
    symbol: string;
    type: "long" | "short";
    userId: string;
    exchangeId: "binance" | "bybit" | "okx" | "bitget" | "kucoin";
    entryPrice: number;
    size: number;
    stopLoss?: number | undefined;
    takeProfit?: number | undefined;
    leverage?: number | undefined;
}>;
export declare const updatePositionSchema: z.ZodObject<{
    exitPrice: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodNumber, number, number>, number, number>>;
    status: z.ZodOptional<z.ZodEnum<["open", "closed", "liquidated"]>>;
    stopLoss: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodNumber, number, number>, number, number>>;
    takeProfit: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodNumber, number, number>, number, number>>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    status?: "open" | "closed" | "liquidated" | undefined;
    stopLoss?: number | undefined;
    takeProfit?: number | undefined;
    exitPrice?: number | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    status?: "open" | "closed" | "liquidated" | undefined;
    stopLoss?: number | undefined;
    takeProfit?: number | undefined;
    exitPrice?: number | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export declare const createOpportunitySchema: z.ZodObject<{
    type: z.ZodEnum<["arbitrage", "funding", "spread"]>;
    symbol: z.ZodString;
    buyExchange: z.ZodEnum<["binance", "bybit", "okx", "bitget", "kucoin"]>;
    sellExchange: z.ZodEnum<["binance", "bybit", "okx", "bitget", "kucoin"]>;
    buyPrice: z.ZodEffects<z.ZodEffects<z.ZodNumber, number, number>, number, number>;
    sellPrice: z.ZodEffects<z.ZodEffects<z.ZodNumber, number, number>, number, number>;
    volume: z.ZodEffects<z.ZodNumber, number, number>;
    profitPercentage: z.ZodNumber;
    confidence: z.ZodNumber;
    expiresAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    symbol: string;
    type: "arbitrage" | "funding" | "spread";
    profitPercentage: number;
    confidence: number;
    expiresAt: Date;
    volume: number;
    buyExchange: "binance" | "bybit" | "okx" | "bitget" | "kucoin";
    sellExchange: "binance" | "bybit" | "okx" | "bitget" | "kucoin";
    buyPrice: number;
    sellPrice: number;
}, {
    symbol: string;
    type: "arbitrage" | "funding" | "spread";
    profitPercentage: number;
    confidence: number;
    expiresAt: Date;
    volume: number;
    buyExchange: "binance" | "bybit" | "okx" | "bitget" | "kucoin";
    sellExchange: "binance" | "bybit" | "okx" | "bitget" | "kucoin";
    buyPrice: number;
    sellPrice: number;
}>;
export declare const paginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    sortOrder: "asc" | "desc";
    sortBy?: string | undefined;
}, {
    limit?: number | undefined;
    sortBy?: string | undefined;
    page?: number | undefined;
    sortOrder?: "asc" | "desc" | undefined;
}>;
export declare const dateRangeSchema: z.ZodEffects<z.ZodObject<{
    startDate: z.ZodDate;
    endDate: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    startDate: Date;
    endDate: Date;
}, {
    startDate: Date;
    endDate: Date;
}>, {
    startDate: Date;
    endDate: Date;
}, {
    startDate: Date;
    endDate: Date;
}>;
export declare const filterSchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodString>;
    exchange: z.ZodOptional<z.ZodEnum<["binance", "bybit", "okx", "bitget", "kucoin"]>>;
    symbol: z.ZodOptional<z.ZodString>;
    minAmount: z.ZodOptional<z.ZodNumber>;
    maxAmount: z.ZodOptional<z.ZodNumber>;
    startDate: z.ZodOptional<z.ZodDate>;
    endDate: z.ZodOptional<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    symbol?: string | undefined;
    exchange?: "binance" | "bybit" | "okx" | "bitget" | "kucoin" | undefined;
    startDate?: Date | undefined;
    endDate?: Date | undefined;
    status?: string | undefined;
    type?: string | undefined;
    minAmount?: number | undefined;
    maxAmount?: number | undefined;
}, {
    symbol?: string | undefined;
    exchange?: "binance" | "bybit" | "okx" | "bitget" | "kucoin" | undefined;
    startDate?: Date | undefined;
    endDate?: Date | undefined;
    status?: string | undefined;
    type?: string | undefined;
    minAmount?: number | undefined;
    maxAmount?: number | undefined;
}>;
export declare const telegramUserSchema: z.ZodObject<{
    id: z.ZodNumber;
    first_name: z.ZodString;
    last_name: z.ZodOptional<z.ZodString>;
    username: z.ZodOptional<z.ZodString>;
    language_code: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: number;
    first_name: string;
    username?: string | undefined;
    last_name?: string | undefined;
    language_code?: string | undefined;
}, {
    id: number;
    first_name: string;
    username?: string | undefined;
    last_name?: string | undefined;
    language_code?: string | undefined;
}>;
export declare const telegramMessageSchema: z.ZodObject<{
    message_id: z.ZodNumber;
    from: z.ZodObject<{
        id: z.ZodNumber;
        first_name: z.ZodString;
        last_name: z.ZodOptional<z.ZodString>;
        username: z.ZodOptional<z.ZodString>;
        language_code: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: number;
        first_name: string;
        username?: string | undefined;
        last_name?: string | undefined;
        language_code?: string | undefined;
    }, {
        id: number;
        first_name: string;
        username?: string | undefined;
        last_name?: string | undefined;
        language_code?: string | undefined;
    }>;
    chat: z.ZodObject<{
        id: z.ZodNumber;
        type: z.ZodEnum<["private", "group", "supergroup", "channel"]>;
        title: z.ZodOptional<z.ZodString>;
        username: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "private" | "group" | "supergroup" | "channel";
        id: number;
        username?: string | undefined;
        title?: string | undefined;
    }, {
        type: "private" | "group" | "supergroup" | "channel";
        id: number;
        username?: string | undefined;
        title?: string | undefined;
    }>;
    date: z.ZodNumber;
    text: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    date: number;
    message_id: number;
    from: {
        id: number;
        first_name: string;
        username?: string | undefined;
        last_name?: string | undefined;
        language_code?: string | undefined;
    };
    chat: {
        type: "private" | "group" | "supergroup" | "channel";
        id: number;
        username?: string | undefined;
        title?: string | undefined;
    };
    text?: string | undefined;
}, {
    date: number;
    message_id: number;
    from: {
        id: number;
        first_name: string;
        username?: string | undefined;
        last_name?: string | undefined;
        language_code?: string | undefined;
    };
    chat: {
        type: "private" | "group" | "supergroup" | "channel";
        id: number;
        username?: string | undefined;
        title?: string | undefined;
    };
    text?: string | undefined;
}>;
export declare const apiConfigSchema: z.ZodObject<{
    port: z.ZodNumber;
    host: z.ZodString;
    cors: z.ZodObject<{
        origin: z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">, z.ZodBoolean]>;
        credentials: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        origin: string | boolean | string[];
        credentials: boolean;
    }, {
        origin: string | boolean | string[];
        credentials: boolean;
    }>;
    rateLimit: z.ZodObject<{
        windowMs: z.ZodNumber;
        max: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        windowMs: number;
        max: number;
    }, {
        windowMs: number;
        max: number;
    }>;
}, "strip", z.ZodTypeAny, {
    port: number;
    host: string;
    cors: {
        origin: string | boolean | string[];
        credentials: boolean;
    };
    rateLimit: {
        windowMs: number;
        max: number;
    };
}, {
    port: number;
    host: string;
    cors: {
        origin: string | boolean | string[];
        credentials: boolean;
    };
    rateLimit: {
        windowMs: number;
        max: number;
    };
}>;
export declare const databaseConfigSchema: z.ZodObject<{
    url: z.ZodString;
    maxConnections: z.ZodNumber;
    connectionTimeout: z.ZodNumber;
    queryTimeout: z.ZodNumber;
    retryAttempts: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    url: string;
    maxConnections: number;
    connectionTimeout: number;
    queryTimeout: number;
    retryAttempts: number;
}, {
    url: string;
    maxConnections: number;
    connectionTimeout: number;
    queryTimeout: number;
    retryAttempts: number;
}>;
export declare const validateSymbol: (symbol: string) => boolean;
export declare const validatePrice: (price: number) => boolean;
export declare const validateQuantity: (quantity: number) => boolean;
export declare const validateExchange: (exchange: string) => exchange is keyof typeof EXCHANGE_INFO;
export declare const validateCryptocurrency: (crypto: string) => boolean;
export declare const validateFiatCurrency: (fiat: string) => boolean;
export declare const createEnumSchema: <T extends readonly [string, ...string[]]>(values: T, name: string) => z.ZodEnum<z.Writeable<T>>;
export declare const createOptionalStringSchema: (minLength?: number, maxLength?: number) => z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
export declare const createRequiredStringSchema: (minLength?: number, maxLength?: number) => z.ZodString;
export declare const formatValidationErrors: (error: z.ZodError) => {
    field: string;
    message: string;
    code: "custom" | "unrecognized_keys" | "invalid_union" | "invalid_union_discriminator" | "invalid_arguments" | "invalid_return_type" | "invalid_string" | "not_multiple_of" | "invalid_literal" | "invalid_type" | "invalid_enum_value" | "invalid_intersection_types" | "invalid_date" | "not_finite" | "too_big" | "too_small";
}[];
export declare const safeValidate: <T>(schema: z.ZodSchema<T>, data: unknown) => {
    success: boolean;
    data: T;
    errors: null;
} | {
    success: boolean;
    data: null;
    errors: {
        field: string;
        message: string;
        code: "custom" | "unrecognized_keys" | "invalid_union" | "invalid_union_discriminator" | "invalid_arguments" | "invalid_return_type" | "invalid_string" | "not_multiple_of" | "invalid_literal" | "invalid_type" | "invalid_enum_value" | "invalid_intersection_types" | "invalid_date" | "not_finite" | "too_big" | "too_small";
    }[];
};
export declare const createValidationMiddleware: <T>(schema: z.ZodSchema<T>) => (data: unknown) => T | null;
export declare const schemas: {
    email: z.ZodString;
    password: z.ZodString;
    username: z.ZodString;
    phone: z.ZodString;
    symbol: z.ZodString;
    price: z.ZodEffects<z.ZodEffects<z.ZodNumber, number, number>, number, number>;
    quantity: z.ZodEffects<z.ZodNumber, number, number>;
    leverage: z.ZodNumber;
    percentage: z.ZodNumber;
    exchangeId: z.ZodEnum<["binance", "bybit", "okx", "bitget", "kucoin"]>;
    userRole: z.ZodEnum<["admin", "premium", "basic"]>;
    userStatus: z.ZodEnum<["active", "inactive", "suspended", "pending"]>;
    createUser: z.ZodObject<{
        email: z.ZodString;
        username: z.ZodString;
        password: z.ZodString;
        firstName: z.ZodString;
        lastName: z.ZodString;
        phone: z.ZodOptional<z.ZodString>;
        role: z.ZodDefault<z.ZodEnum<["admin", "premium", "basic"]>>;
        status: z.ZodDefault<z.ZodEnum<["active", "inactive", "suspended", "pending"]>>;
    }, "strip", z.ZodTypeAny, {
        email: string;
        status: "active" | "inactive" | "pending" | "suspended";
        firstName: string;
        lastName: string;
        username: string;
        role: "basic" | "admin" | "premium";
        password: string;
        phone?: string | undefined;
    }, {
        email: string;
        firstName: string;
        lastName: string;
        username: string;
        password: string;
        status?: "active" | "inactive" | "pending" | "suspended" | undefined;
        role?: "basic" | "admin" | "premium" | undefined;
        phone?: string | undefined;
    }>;
    updateUser: z.ZodObject<Omit<{
        email: z.ZodOptional<z.ZodString>;
        username: z.ZodOptional<z.ZodString>;
        password: z.ZodOptional<z.ZodString>;
        firstName: z.ZodOptional<z.ZodString>;
        lastName: z.ZodOptional<z.ZodString>;
        phone: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        role: z.ZodOptional<z.ZodDefault<z.ZodEnum<["admin", "premium", "basic"]>>>;
        status: z.ZodOptional<z.ZodDefault<z.ZodEnum<["active", "inactive", "suspended", "pending"]>>>;
    }, "password">, "strip", z.ZodTypeAny, {
        email?: string | undefined;
        status?: "active" | "inactive" | "pending" | "suspended" | undefined;
        firstName?: string | undefined;
        lastName?: string | undefined;
        username?: string | undefined;
        role?: "basic" | "admin" | "premium" | undefined;
        phone?: string | undefined;
    }, {
        email?: string | undefined;
        status?: "active" | "inactive" | "pending" | "suspended" | undefined;
        firstName?: string | undefined;
        lastName?: string | undefined;
        username?: string | undefined;
        role?: "basic" | "admin" | "premium" | undefined;
        phone?: string | undefined;
    }>;
    login: z.ZodObject<{
        email: z.ZodString;
        password: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        email: string;
        password: string;
    }, {
        email: string;
        password: string;
    }>;
    changePassword: z.ZodEffects<z.ZodObject<{
        currentPassword: z.ZodString;
        newPassword: z.ZodString;
        confirmPassword: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        currentPassword: string;
        newPassword: string;
        confirmPassword: string;
    }, {
        currentPassword: string;
        newPassword: string;
        confirmPassword: string;
    }>, {
        currentPassword: string;
        newPassword: string;
        confirmPassword: string;
    }, {
        currentPassword: string;
        newPassword: string;
        confirmPassword: string;
    }>;
    positionType: z.ZodEnum<["long", "short"]>;
    positionStatus: z.ZodEnum<["open", "closed", "liquidated"]>;
    opportunityType: z.ZodEnum<["arbitrage", "funding", "spread"]>;
    createPosition: z.ZodObject<{
        userId: z.ZodString;
        symbol: z.ZodString;
        type: z.ZodEnum<["long", "short"]>;
        size: z.ZodEffects<z.ZodNumber, number, number>;
        entryPrice: z.ZodEffects<z.ZodEffects<z.ZodNumber, number, number>, number, number>;
        leverage: z.ZodDefault<z.ZodNumber>;
        stopLoss: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodNumber, number, number>, number, number>>;
        takeProfit: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodNumber, number, number>, number, number>>;
        exchangeId: z.ZodEnum<["binance", "bybit", "okx", "bitget", "kucoin"]>;
    }, "strip", z.ZodTypeAny, {
        symbol: string;
        type: "long" | "short";
        userId: string;
        exchangeId: "binance" | "bybit" | "okx" | "bitget" | "kucoin";
        entryPrice: number;
        leverage: number;
        size: number;
        stopLoss?: number | undefined;
        takeProfit?: number | undefined;
    }, {
        symbol: string;
        type: "long" | "short";
        userId: string;
        exchangeId: "binance" | "bybit" | "okx" | "bitget" | "kucoin";
        entryPrice: number;
        size: number;
        stopLoss?: number | undefined;
        takeProfit?: number | undefined;
        leverage?: number | undefined;
    }>;
    updatePosition: z.ZodObject<{
        exitPrice: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodNumber, number, number>, number, number>>;
        status: z.ZodOptional<z.ZodEnum<["open", "closed", "liquidated"]>>;
        stopLoss: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodNumber, number, number>, number, number>>;
        takeProfit: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodNumber, number, number>, number, number>>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        status?: "open" | "closed" | "liquidated" | undefined;
        stopLoss?: number | undefined;
        takeProfit?: number | undefined;
        exitPrice?: number | undefined;
        metadata?: Record<string, unknown> | undefined;
    }, {
        status?: "open" | "closed" | "liquidated" | undefined;
        stopLoss?: number | undefined;
        takeProfit?: number | undefined;
        exitPrice?: number | undefined;
        metadata?: Record<string, unknown> | undefined;
    }>;
    createOpportunity: z.ZodObject<{
        type: z.ZodEnum<["arbitrage", "funding", "spread"]>;
        symbol: z.ZodString;
        buyExchange: z.ZodEnum<["binance", "bybit", "okx", "bitget", "kucoin"]>;
        sellExchange: z.ZodEnum<["binance", "bybit", "okx", "bitget", "kucoin"]>;
        buyPrice: z.ZodEffects<z.ZodEffects<z.ZodNumber, number, number>, number, number>;
        sellPrice: z.ZodEffects<z.ZodEffects<z.ZodNumber, number, number>, number, number>;
        volume: z.ZodEffects<z.ZodNumber, number, number>;
        profitPercentage: z.ZodNumber;
        confidence: z.ZodNumber;
        expiresAt: z.ZodDate;
    }, "strip", z.ZodTypeAny, {
        symbol: string;
        type: "arbitrage" | "funding" | "spread";
        profitPercentage: number;
        confidence: number;
        expiresAt: Date;
        volume: number;
        buyExchange: "binance" | "bybit" | "okx" | "bitget" | "kucoin";
        sellExchange: "binance" | "bybit" | "okx" | "bitget" | "kucoin";
        buyPrice: number;
        sellPrice: number;
    }, {
        symbol: string;
        type: "arbitrage" | "funding" | "spread";
        profitPercentage: number;
        confidence: number;
        expiresAt: Date;
        volume: number;
        buyExchange: "binance" | "bybit" | "okx" | "bitget" | "kucoin";
        sellExchange: "binance" | "bybit" | "okx" | "bitget" | "kucoin";
        buyPrice: number;
        sellPrice: number;
    }>;
    pagination: z.ZodObject<{
        page: z.ZodDefault<z.ZodNumber>;
        limit: z.ZodDefault<z.ZodNumber>;
        sortBy: z.ZodOptional<z.ZodString>;
        sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
    }, "strip", z.ZodTypeAny, {
        limit: number;
        page: number;
        sortOrder: "asc" | "desc";
        sortBy?: string | undefined;
    }, {
        limit?: number | undefined;
        sortBy?: string | undefined;
        page?: number | undefined;
        sortOrder?: "asc" | "desc" | undefined;
    }>;
    dateRange: z.ZodEffects<z.ZodObject<{
        startDate: z.ZodDate;
        endDate: z.ZodDate;
    }, "strip", z.ZodTypeAny, {
        startDate: Date;
        endDate: Date;
    }, {
        startDate: Date;
        endDate: Date;
    }>, {
        startDate: Date;
        endDate: Date;
    }, {
        startDate: Date;
        endDate: Date;
    }>;
    filter: z.ZodObject<{
        status: z.ZodOptional<z.ZodString>;
        type: z.ZodOptional<z.ZodString>;
        exchange: z.ZodOptional<z.ZodEnum<["binance", "bybit", "okx", "bitget", "kucoin"]>>;
        symbol: z.ZodOptional<z.ZodString>;
        minAmount: z.ZodOptional<z.ZodNumber>;
        maxAmount: z.ZodOptional<z.ZodNumber>;
        startDate: z.ZodOptional<z.ZodDate>;
        endDate: z.ZodOptional<z.ZodDate>;
    }, "strip", z.ZodTypeAny, {
        symbol?: string | undefined;
        exchange?: "binance" | "bybit" | "okx" | "bitget" | "kucoin" | undefined;
        startDate?: Date | undefined;
        endDate?: Date | undefined;
        status?: string | undefined;
        type?: string | undefined;
        minAmount?: number | undefined;
        maxAmount?: number | undefined;
    }, {
        symbol?: string | undefined;
        exchange?: "binance" | "bybit" | "okx" | "bitget" | "kucoin" | undefined;
        startDate?: Date | undefined;
        endDate?: Date | undefined;
        status?: string | undefined;
        type?: string | undefined;
        minAmount?: number | undefined;
        maxAmount?: number | undefined;
    }>;
    telegramUser: z.ZodObject<{
        id: z.ZodNumber;
        first_name: z.ZodString;
        last_name: z.ZodOptional<z.ZodString>;
        username: z.ZodOptional<z.ZodString>;
        language_code: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: number;
        first_name: string;
        username?: string | undefined;
        last_name?: string | undefined;
        language_code?: string | undefined;
    }, {
        id: number;
        first_name: string;
        username?: string | undefined;
        last_name?: string | undefined;
        language_code?: string | undefined;
    }>;
    telegramMessage: z.ZodObject<{
        message_id: z.ZodNumber;
        from: z.ZodObject<{
            id: z.ZodNumber;
            first_name: z.ZodString;
            last_name: z.ZodOptional<z.ZodString>;
            username: z.ZodOptional<z.ZodString>;
            language_code: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: number;
            first_name: string;
            username?: string | undefined;
            last_name?: string | undefined;
            language_code?: string | undefined;
        }, {
            id: number;
            first_name: string;
            username?: string | undefined;
            last_name?: string | undefined;
            language_code?: string | undefined;
        }>;
        chat: z.ZodObject<{
            id: z.ZodNumber;
            type: z.ZodEnum<["private", "group", "supergroup", "channel"]>;
            title: z.ZodOptional<z.ZodString>;
            username: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            type: "private" | "group" | "supergroup" | "channel";
            id: number;
            username?: string | undefined;
            title?: string | undefined;
        }, {
            type: "private" | "group" | "supergroup" | "channel";
            id: number;
            username?: string | undefined;
            title?: string | undefined;
        }>;
        date: z.ZodNumber;
        text: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        date: number;
        message_id: number;
        from: {
            id: number;
            first_name: string;
            username?: string | undefined;
            last_name?: string | undefined;
            language_code?: string | undefined;
        };
        chat: {
            type: "private" | "group" | "supergroup" | "channel";
            id: number;
            username?: string | undefined;
            title?: string | undefined;
        };
        text?: string | undefined;
    }, {
        date: number;
        message_id: number;
        from: {
            id: number;
            first_name: string;
            username?: string | undefined;
            last_name?: string | undefined;
            language_code?: string | undefined;
        };
        chat: {
            type: "private" | "group" | "supergroup" | "channel";
            id: number;
            username?: string | undefined;
            title?: string | undefined;
        };
        text?: string | undefined;
    }>;
    apiConfig: z.ZodObject<{
        port: z.ZodNumber;
        host: z.ZodString;
        cors: z.ZodObject<{
            origin: z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">, z.ZodBoolean]>;
            credentials: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            origin: string | boolean | string[];
            credentials: boolean;
        }, {
            origin: string | boolean | string[];
            credentials: boolean;
        }>;
        rateLimit: z.ZodObject<{
            windowMs: z.ZodNumber;
            max: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            windowMs: number;
            max: number;
        }, {
            windowMs: number;
            max: number;
        }>;
    }, "strip", z.ZodTypeAny, {
        port: number;
        host: string;
        cors: {
            origin: string | boolean | string[];
            credentials: boolean;
        };
        rateLimit: {
            windowMs: number;
            max: number;
        };
    }, {
        port: number;
        host: string;
        cors: {
            origin: string | boolean | string[];
            credentials: boolean;
        };
        rateLimit: {
            windowMs: number;
            max: number;
        };
    }>;
    databaseConfig: z.ZodObject<{
        url: z.ZodString;
        maxConnections: z.ZodNumber;
        connectionTimeout: z.ZodNumber;
        queryTimeout: z.ZodNumber;
        retryAttempts: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        url: string;
        maxConnections: number;
        connectionTimeout: number;
        queryTimeout: number;
        retryAttempts: number;
    }, {
        url: string;
        maxConnections: number;
        connectionTimeout: number;
        queryTimeout: number;
        retryAttempts: number;
    }>;
};
//# sourceMappingURL=index.d.ts.map