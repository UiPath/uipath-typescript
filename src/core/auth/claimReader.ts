import type { TokenClaims } from './types';

/**
 * A utility class to read and normalize claims from a parsed JWT payload.
 * Provides getters that handle fallback aliases for standard identity properties.
 */
export class ClaimReader {
    private readonly claims: TokenClaims;

    constructor(claims: TokenClaims) {
        this.claims = claims;
    }

    /**
     * Reads the user ID claim.
     * Priority: 'sub' -> 'user_id' -> 'uid'
     */
    getUserId(): string | undefined {
        return this.getFirstStringClaim(['sub', 'user_id', 'uid']);
    }

    /**
     * Reads the username claim.
     * Priority: 'preferred_username' -> 'upn' -> 'unique_name'
     */
    getUsername(): string | undefined {
        return this.getFirstStringClaim(['preferred_username', 'upn', 'unique_name']);
    }

    /**
     * Reads the user's email address claim.
     */
    getEmail(): string | undefined {
        return this.getFirstStringClaim(['email']);
    }

    /**
     * Reads the full name claim.
     */
    getName(): string | undefined {
        return this.getFirstStringClaim(['name']);
    }

    /**
     * Reads the given (first) name claim.
     */
    getGivenName(): string | undefined {
        return this.getFirstStringClaim(['given_name']);
    }

    /**
     * Reads the family (last) name claim.
     */
    getFamilyName(): string | undefined {
        return this.getFirstStringClaim(['family_name']);
    }

    /**
     * Reads the tenant name claim.
     * Priority: 'tenantName' -> 'tenant'
     */
    getTenantName(): string | undefined {
        return this.getFirstStringClaim(['tenantName', 'tenant']);
    }

    /**
     * Reads the organization name claim.
     * Priority: 'orgName' -> 'org'
     */
    getOrgName(): string | undefined {
        return this.getFirstStringClaim(['orgName', 'org']);
    }

    /**
     * Returns the raw claims object exactly as decoded.
     */
    getRawClaims(): TokenClaims {
        return this.claims;
    }

    /**
     * Helper to find the first non-empty string claim matching the given keys.
     */
    private getFirstStringClaim(keys: string[]): string | undefined {
        for (const key of keys) {
            const value = this.claims[key];
            if (typeof value === 'string' && value.length > 0) {
                return value;
            }
        }

        return undefined;
    }
}
