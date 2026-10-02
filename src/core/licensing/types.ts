/**
 * Raw response from `POST /api/StudioWeb/AcquireLicense`. The endpoint already
 * answers in camelCase, so no key transform is applied.
 */
export interface RawStudioWebLicenseResponse {
  /** Robot type the license was granted for, e.g. `StudioX`. */
  robotType: string;
  /** Every robot type the acquired license covers. */
  robotTypes: string[];
  /** Whether the license came from an external provider. */
  externalLicense: boolean;
  /** Whether the caller ended up licensed. */
  isLicensed: boolean;
  /** Start of the licensed user session (ISO 8601). Refreshed on every call. */
  started: string;
  /** Last update of the licensed user session (ISO 8601). */
  lastUpdated: string;
  /** Unsigned JWT carrying the granted license units and its own validity window. Null when the platform issues none. */
  licenseToken: string | null;
}

/** Claims the SDK reads from the unsigned license token. Never verified. */
export interface StudioWebLicenseTokenClaims {
  /** Expiry, seconds since the Unix epoch. */
  exp?: number;
  /** Not-before, seconds since the Unix epoch. */
  nbf?: number;
  /** User's base license tier, e.g. `BASICNU`. Absent for an unlicensed user. */
  ubl?: string;
  /** Licensed units granted, e.g. `['APPS', 'STDW', 'AGENT']`. */
  lu?: string[];
  /** Validity of the token, e.g. `VALID`. */
  status?: string;
}

/** A license acquired for the signed-in user. */
export interface StudioWebLicense {
  /** Robot type the license was granted for, e.g. `StudioX`. */
  robotType: string;
  /** Every robot type the acquired license covers. */
  robotTypes: string[];
  /** Whether the caller ended up licensed. */
  isLicensed: boolean;
  /** Start of the licensed user session (ISO 8601). Refreshed on every acquisition. */
  startedTime: string;
  /** When the license stops being valid (ISO 8601), read from the token. */
  expiresTime?: string;
  /** The user's base license tier, e.g. `BASICNU`. Absent for an unlicensed user. */
  licenseTier?: string;
  /** Licensed units the token grants. */
  licensedUnits?: string[];
}
