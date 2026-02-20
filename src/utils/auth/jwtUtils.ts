import type { TokenClaims } from '../../core/auth/types';

/**
 * Safely decodes a base64url encoded string using Buffer.
 * Targetting Node 20+ so standard Buffer usage is preferred over atob.
 *
 * @param value The base64url encoded string
 * @returns The decoded utf-8 string
 */
export function base64UrlDecode(value: string): string {
    const base64 = value
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        .padEnd(Math.ceil(value.length / 4) * 4, '=');

    return Buffer.from(base64, 'base64').toString('utf-8');
}

/**
 * Parses a JWT token and returns its claims payload.
 *
 * @param token The raw JWT string
 * @returns The parsed TokenClaims object, or undefined if the token is invalid or missing
 */
export function parseJwtToken(token: string | undefined): TokenClaims | undefined {
    if (!token) {
        return undefined;
    }

    const parts = token.split('.');
    if (parts.length !== 3 || parts.some((part) => part.length === 0)) {
        return undefined;
    }

    try {
        const payload = base64UrlDecode(parts[1]);
        const parsed = JSON.parse(payload);

        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return undefined;
        }

        return parsed as TokenClaims;
    } catch {
        return undefined;
    }
}
