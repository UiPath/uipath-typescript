/** Shared types. The functions import these; the app imports them as types. */

/** Both functions take and return the same shape, so the two channels compare directly. */
export interface CallInput {
  /** Text to send. Only its size matters. */
  data?: string
  /** How much text to send back, in KB. */
  outputKb?: number
  label?: string
}

export interface CallOutput {
  label: string
  /** What the function actually received — measured on its side. */
  receivedKb: number
  returnedKb: number
  data: string
  elapsedMs: number
}

/**
 * Both channels hold about 10,000 characters of input inline.
 *
 * A job can go past it by uploading an attachment. An HTTP trigger cannot —
 * measured: 9.7 KB answers 200, 10 KB answers
 * `500 errorCode 4801 "JobArguments length should be less than 10000 characters"`.
 */
export const INPUT_INLINE_LIMIT_KB = 10

/**
 * Both channels carry about 512 KB of output inline, and past it they differ.
 *
 * A job moves the result to an attachment. An HTTP response does not — measured:
 * 480 KB comes back fine, 512 KB answers **200 with an empty body** and no
 * error at all.
 */
export const OUTPUT_INLINE_LIMIT_KB = 512

export const FUNCTIONS_PACKAGE = "calling-mode-functions"

export const FUNCTION_NAMES = {
  /** HTTP semantics: method + path, answered synchronously. */
  echo: "echo",
  /** Job semantics: no method, no path. */
  bulk: "bulk",
} as const

export type FunctionName = (typeof FUNCTION_NAMES)[keyof typeof FUNCTION_NAMES]

/** Deployed function names are package-prefixed. */
export function qualifiedName(fn: FunctionName): string {
  return `${FUNCTIONS_PACKAGE}_${fn}`
}

/** StartJobs wants the file path inside the package, not the function name. */
export function entryPointPath(fn: FunctionName): string {
  return `content/functions/${fn}.ts`
}

export function sizeKb(text: string): number {
  return Math.round((text.length / 1024) * 10) / 10
}

/** Filler text of roughly the requested size. */
export function makeText(kb: number): string {
  const target = Math.max(0, Math.round(kb * 1024))
  if (target === 0) return ""
  const line = "The quick brown fox jumps over the lazy dog. 0123456789 "
  return line.repeat(Math.ceil(target / line.length)).slice(0, target)
}
