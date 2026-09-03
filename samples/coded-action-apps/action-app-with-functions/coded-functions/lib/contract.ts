/**
 * Shared I/O contract.
 *
 * The function imports these types directly; the action app imports them with
 * `import type`, so both halves share one definition and nothing is bundled
 * across the boundary. Keep this file dependency-free.
 */

/** Asset types the robot endpoint can resolve, as Orchestrator reports them. */
export type ResolvedValueType = 'Text' | 'Integer' | 'Bool' | 'Credential' | 'Secret';

/** What the action app asks for: the name of an asset in the function's folder. */
export interface ReadCredentialInput {
  assetName: string;
}

/**
 * The resolved credential.
 *
 * `value` is the secret itself. It is returned because this sample exists to
 * demonstrate runtime asset retrieval end to end — a production reviewer app
 * should return a verdict (a fingerprint, or the result of a live token
 * exchange) and leave the secret inside the function.
 */
export interface ReadCredentialOutput {
  assetName: string;
  /** How Orchestrator classifies the asset. */
  valueType: ResolvedValueType;
  /** The secret. For a Credential asset this is the password half. */
  value: string;
  /**
   * The identity half of a Credential asset — typically the client id.
   * Absent for every other asset type.
   */
  username?: string;
  /** ISO timestamp of the resolution, so the app can show how fresh the read is. */
  resolvedTime: string;
}

/**
 * The function refuses to resolve any asset whose name does not start with this
 * prefix.
 *
 * This is an authorization boundary, not cosmetics. The function reads assets
 * with the *robot's* identity, which can read every Credential and Secret asset
 * in the folder — including ones the calling user could never read themselves.
 * The asset name arrives from the caller, and the function's HTTP trigger is
 * directly callable by anyone who can invoke it, so the app's dropdown is not a
 * security boundary. Without this check, one invocation per guessed name would
 * exfiltrate every secret in the folder — a classic confused deputy.
 *
 * Keep the prefix as narrow as the demo allows. For production, prefer an
 * explicit list of permitted names, or an authorization check against
 * `ctx.user`, over a prefix.
 */
export const RESOLVABLE_ASSET_PREFIX = 'demo-';

/**
 * A deployed function's registered name is package-prefixed: `read-credential`
 * inside the `action-app-with-functions-fn` package registers as
 * `action-app-with-functions-fn_read-credential`. Passing the bare name returns
 * a not-found error listing what the folder actually exposes.
 */
export const FUNCTION_NAMES = {
  readCredential: 'action-app-with-functions-fn_read-credential',
} as const;
