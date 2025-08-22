import rateLimit from 'express-rate-limit';
import { AUTH_CONSTANTS } from '../../constants/auth.js';

/**
 * Standard express-rate-limit configuration
 * Using the well-known express-rate-limit library for better static analysis recognition
 */

// Pre-configured rate limiters for different endpoints
export const authRateLimiter = rateLimit({
  windowMs: AUTH_CONSTANTS.RATE_LIMIT.WINDOW_MS,
  max: AUTH_CONSTANTS.RATE_LIMIT.AUTH_MAX_REQUESTS,
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

export const tokenRateLimiter = rateLimit({
  windowMs: AUTH_CONSTANTS.RATE_LIMIT.WINDOW_MS,
  max: AUTH_CONSTANTS.RATE_LIMIT.TOKEN_MAX_REQUESTS,
  message: 'Too many token exchange attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

export const errorRateLimiter = rateLimit({
  windowMs: AUTH_CONSTANTS.RATE_LIMIT.WINDOW_MS,
  max: AUTH_CONSTANTS.RATE_LIMIT.ERROR_MAX_REQUESTS,
  message: 'Too many error reports, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});