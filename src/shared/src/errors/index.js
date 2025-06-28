"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOperationalError = exports.isAppError = exports.logError = exports.formatErrorResponse = exports.handleError = exports.createDuplicateError = exports.createNotFoundError = exports.createValidationError = exports.TimeoutError = exports.NetworkError = exports.ExchangeError = exports.InvalidSymbolError = exports.InsufficientBalanceError = exports.TradingError = exports.ExternalAPIError = exports.DatabaseError = exports.RateLimitError = exports.NotFoundError = exports.AuthorizationError = exports.AuthenticationError = exports.ValidationError = exports.AppError = void 0;
const config_1 = require("../config");
// Base Error Class
class AppError extends Error {
    statusCode;
    code;
    isOperational;
    timestamp;
    details;
    constructor(message, statusCode = config_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, code = config_1.ERROR_CODES.INTERNAL_ERROR, isOperational = true, details) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = isOperational;
        this.timestamp = new Date().toISOString();
        this.details = details;
        // Maintains proper stack trace for where our error was thrown
        Error.captureStackTrace(this, this.constructor);
    }
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            statusCode: this.statusCode,
            code: this.code,
            timestamp: this.timestamp,
            details: this.details,
            stack: this.stack,
        };
    }
}
exports.AppError = AppError;
// Validation Error
class ValidationError extends AppError {
    constructor(message, details) {
        super(message, config_1.HTTP_STATUS.BAD_REQUEST, config_1.ERROR_CODES.INVALID_REQUEST, true, details);
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
// Authentication Error
class AuthenticationError extends AppError {
    constructor(message = 'Authentication failed') {
        super(message, config_1.HTTP_STATUS.UNAUTHORIZED, config_1.ERROR_CODES.UNAUTHORIZED, true);
        this.name = 'AuthenticationError';
    }
}
exports.AuthenticationError = AuthenticationError;
// Authorization Error
class AuthorizationError extends AppError {
    constructor(message = 'Access denied') {
        super(message, config_1.HTTP_STATUS.FORBIDDEN, config_1.ERROR_CODES.FORBIDDEN, true);
        this.name = 'AuthorizationError';
    }
}
exports.AuthorizationError = AuthorizationError;
// Not Found Error
class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(`${resource} not found`, config_1.HTTP_STATUS.NOT_FOUND, config_1.ERROR_CODES.NOT_FOUND, true);
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
// Rate Limit Error
class RateLimitError extends AppError {
    constructor(message = 'Rate limit exceeded') {
        super(message, config_1.HTTP_STATUS.TOO_MANY_REQUESTS, config_1.ERROR_CODES.RATE_LIMITED, true);
        this.name = 'RateLimitError';
    }
}
exports.RateLimitError = RateLimitError;
// Database Error
class DatabaseError extends AppError {
    constructor(message, details) {
        super(message, config_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, config_1.ERROR_CODES.DATABASE_ERROR, true, details);
        this.name = 'DatabaseError';
    }
}
exports.DatabaseError = DatabaseError;
// External API Error
class ExternalAPIError extends AppError {
    constructor(service, message, details) {
        super(`${service} API error: ${message}`, config_1.HTTP_STATUS.SERVICE_UNAVAILABLE, config_1.ERROR_CODES.EXTERNAL_API_ERROR, true, details);
        this.name = 'ExternalAPIError';
    }
}
exports.ExternalAPIError = ExternalAPIError;
// Trading Error
class TradingError extends AppError {
    constructor(message, statusCode = config_1.HTTP_STATUS.UNPROCESSABLE_ENTITY, code = config_1.ERROR_CODES.ORDER_FAILED, details) {
        super(message, statusCode, code, true, details);
        this.name = 'TradingError';
    }
}
exports.TradingError = TradingError;
// Insufficient Balance Error
class InsufficientBalanceError extends TradingError {
    constructor(required, available) {
        super('Insufficient balance for this operation', config_1.HTTP_STATUS.BAD_REQUEST, config_1.ERROR_CODES.INSUFFICIENT_BALANCE, {
            required,
            available,
            shortfall: required - available,
        });
        this.name = 'InsufficientBalanceError';
    }
}
exports.InsufficientBalanceError = InsufficientBalanceError;
// Invalid Symbol Error
class InvalidSymbolError extends TradingError {
    constructor(symbol) {
        super(`Invalid trading symbol: ${symbol}`, config_1.HTTP_STATUS.BAD_REQUEST, config_1.ERROR_CODES.INVALID_SYMBOL, { symbol });
        this.name = 'InvalidSymbolError';
    }
}
exports.InvalidSymbolError = InvalidSymbolError;
// Exchange Error
class ExchangeError extends AppError {
    constructor(exchange, message, details) {
        super(`${exchange} exchange error: ${message}`, config_1.HTTP_STATUS.SERVICE_UNAVAILABLE, config_1.ERROR_CODES.EXCHANGE_ERROR, true, { exchange, ...details });
        this.name = 'ExchangeError';
    }
}
exports.ExchangeError = ExchangeError;
// Network Error
class NetworkError extends AppError {
    constructor(message = 'Network connection failed', details) {
        super(message, config_1.HTTP_STATUS.SERVICE_UNAVAILABLE, config_1.ERROR_CODES.EXTERNAL_API_ERROR, true, details);
        this.name = 'NetworkError';
    }
}
exports.NetworkError = NetworkError;
// Timeout Error
class TimeoutError extends AppError {
    constructor(operation, timeout) {
        super(`Operation '${operation}' timed out after ${timeout}ms`, config_1.HTTP_STATUS.SERVICE_UNAVAILABLE, config_1.ERROR_CODES.EXTERNAL_API_ERROR, true, { operation, timeout });
        this.name = 'TimeoutError';
    }
}
exports.TimeoutError = TimeoutError;
// Error Factory Functions
const createValidationError = (field, value, rule) => {
    return new ValidationError(`Validation failed for field '${field}': ${rule}`, { field, value, rule });
};
exports.createValidationError = createValidationError;
const createNotFoundError = (resource, id) => {
    return new NotFoundError(`${resource} with ID '${id}' not found`);
};
exports.createNotFoundError = createNotFoundError;
const createDuplicateError = (resource, field, value) => {
    return new AppError(`${resource} with ${field} '${value}' already exists`, config_1.HTTP_STATUS.CONFLICT, config_1.ERROR_CODES.USER_ALREADY_EXISTS, true, { resource, field, value });
};
exports.createDuplicateError = createDuplicateError;
// Error Handler Utility
const handleError = (error) => {
    if (error instanceof AppError) {
        return error;
    }
    if (error instanceof Error) {
        return new AppError(error.message, config_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, config_1.ERROR_CODES.INTERNAL_ERROR, false);
    }
    return new AppError('An unknown error occurred', config_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, config_1.ERROR_CODES.INTERNAL_ERROR, false);
};
exports.handleError = handleError;
// Error Response Formatter
const formatErrorResponse = (error) => {
    return {
        success: false,
        error: {
            message: error.message,
            code: error.code,
            statusCode: error.statusCode,
            timestamp: error.timestamp,
            ...(error.details && { details: error.details }),
        },
    };
};
exports.formatErrorResponse = formatErrorResponse;
// Error Logger
const logError = (error, context) => {
    const logData = {
        ...error.toJSON(),
        context,
    };
    if (error.statusCode >= 500) {
        console.error('Server Error:', logData);
    }
    else if (error.statusCode >= 400) {
        console.warn('Client Error:', logData);
    }
    else {
        console.info('Error:', logData);
    }
};
exports.logError = logError;
// Type Guards
const isAppError = (error) => {
    return error instanceof AppError;
};
exports.isAppError = isAppError;
const isOperationalError = (error) => {
    return (0, exports.isAppError)(error) && error.isOperational;
};
exports.isOperationalError = isOperationalError;
//# sourceMappingURL=index.js.map