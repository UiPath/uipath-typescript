/**
 * Turns any failure into a short message that is safe to show users, and logs the
 * full error for developers.
 *
 * Keys on the HTTP status rather than the SDK's error classes: each SDK subpath
 * bundles its own copy of those classes, so an `instanceof` check imported from
 * one entry point does not recognise an error thrown by another.
 */
export function toUserMessage(err: unknown, fallback: string): string {
  console.error(err);
  const status = typeof err === 'object' && err !== null && 'statusCode' in err ? err.statusCode : undefined;
  if (status === 401) return 'Your session has expired. Sign in again.';
  if (status === 403) return "You don't have permission to do that. Ask an administrator for access.";
  if (status === 404) return 'That item no longer exists. Refresh and try again.';
  return fallback;
}
