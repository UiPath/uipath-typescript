/**
 * The I/O contract, and the single source of truth for it.
 *
 * Both sides import from here: the functions declare these as their
 * `defineSchema<T>()` types, and the app types its wrappers with them. Change a
 * field once and `tsc` fails on whichever side has not caught up, which is the
 * point — a Coded App and its functions are one deployable and drift between
 * them is a runtime 400, not a compile error, unless you do this.
 */

export interface ReadCredentialInput {
  /** Must be allowlisted in the function. @default "SamplePartnerCredential" */
  assetName?: string
}

export interface ReadCredentialOutput {
  /** The endpoint that answered, so the UI can show which path was taken. */
  route: string
  /**
   * Named `httpStatus`, never `status`. The runtime reads a numeric top-level
   * `status` on a returned object as a `FunctionResponse` envelope and sends
   * that status with an EMPTY body — the real payload disappears silently, with
   * the job still reporting Successful.
   */
  httpStatus: number
  username?: string | null
  /** Proof of use, not the secret. */
  secretLength: number
  secretFingerprint?: string | null
  verified: boolean
  verdict: string
}

/**
 * Function names as deployed. The package name prefixes them, so the app builds
 * the qualified name from `FUNCTIONS_PACKAGE` rather than hardcoding it twice.
 */
export const FUNCTIONS_PACKAGE = "secrets-functions"

export const FUNCTION_NAMES = {
  readCredential: "read-credential",
} as const

export type FunctionName = (typeof FUNCTION_NAMES)[keyof typeof FUNCTION_NAMES]

/** `<package>_<function>`, which is what `Functions.invoke({ name })` expects. */
export function qualifiedName(fn: FunctionName): string {
  return `${FUNCTIONS_PACKAGE}_${fn}`
}
