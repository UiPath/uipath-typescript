// Sample UI never shows a raw error. The fixed message goes on screen and the
// error itself goes to the console, where a developer can read it.

/** Shown wherever a load fails. */
export const LOAD_FAILED = 'Something went wrong. Try again, or check the browser console for details.';

/** Logs a failure for developers and returns the fixed message to show instead. */
export function reportError(message: string, error: unknown): string {
  console.warn(message, error);
  return message;
}
