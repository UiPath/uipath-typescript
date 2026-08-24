/**
 * Internal types for the Functions service — raw API wire formats before
 * transformation. Not exported through the public barrel.
 */


/**
 * Raw HTTP trigger row from `GET /odata/HttpTriggers` after
 * `pascalToCamelCaseKeys()`. Only the fields consumed by the service are
 * declared; the API returns many more job-runner fields that the SDK drops.
 */
export interface RawFunctionTrigger {
  /** Trigger identifier (GUID). */
  id: string;
  /** Trigger name — unique within a folder. */
  name: string;
  /** URL path segment within the package. */
  slug: string;
  /** HTTP verb, e.g. `Post`. */
  method: string;
  /** Description from the function definition. */
  description?: string | null;
  /** Whether the trigger is enabled. */
  enabled: boolean;
  /** Default input arguments as a JSON string. */
  inputArguments?: string | null;
  /** Source file path inside the package. */
  entryPointPath?: string | null;
  /** Key (GUID) of the release that owns the trigger. */
  releaseKey: string;
  /** Numeric ID of the folder the trigger lives in. */
  organizationUnitId: number;
  /** Release (process) that packages the function. */
  release: {
    name: string;
    slug: string;
  };
}

/**
 * Raw folder entity from `GET /odata/Folders({id})` — PascalCase wire format,
 * limited to the field the Functions service consumes.
 */
export interface RawFolderResponse {
  /** Folder key (GUID) — the `t/{key}` segment of the function invoke URL. */
  Key: string;
}

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
  /**
   * Unsigned JWT carrying the granted license units and its own validity
   * window; its `exp` claim is what the SDK reuses the license against. Null
   * when the platform issues no token, in which case the SDK holds the license
   * only for the fallback lifetime.
   */
  licenseToken: string | null;
}

/** Claims the SDK reads from the unsigned license token. Never verified. */
export interface StudioWebLicenseTokenClaims {
  /** Expiry, seconds since the Unix epoch. Drives the cache lifetime. */
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

/** A license acquired for the calling user. */
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

/**
 * Options for acquiring a license directly.
 *
 * @internal
 */
export interface FunctionAcquireLicenseOptions {
  /**
   * Acquires a fresh license instead of returning the one already held.
   * Defaults to `false`.
   */
  refresh?: boolean;
}

/** A resolved or in-flight license acquisition held in the service's cache. */
export interface LicenseCacheEntry {
  /**
   * The acquisition. Stored while still pending so concurrent invokes share one
   * round trip.
   */
  acquisition: Promise<StudioWebLicense>;
  /** Epoch milliseconds after which the entry is stale. */
  expiresAtMs: number;
}

