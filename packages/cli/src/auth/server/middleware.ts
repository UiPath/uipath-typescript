/**
 * Security middleware for auth server routes
 * This file explicitly defines rate-limited route handlers to satisfy static analysis tools
 */

import { RequestHandler } from 'express';
import { authRateLimiter, tokenRateLimiter, errorRateLimiter } from './rate-limiter.js';

/**
 * Rate-limited middleware stack for OAuth callback route
 * Limits requests to prevent abuse of the authentication endpoint
 */
export const rateLimitedAuthHandler: RequestHandler[] = [authRateLimiter];

/**
 * Rate-limited middleware stack for token exchange route
 * Provides enhanced security for the critical token exchange endpoint
 */
export const rateLimitedTokenHandler: RequestHandler[] = [tokenRateLimiter];

/**
 * Rate-limited middleware stack for error logging route
 * Prevents abuse of the error reporting endpoint
 */
export const rateLimitedErrorHandler: RequestHandler[] = [errorRateLimiter];