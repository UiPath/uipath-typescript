/**
 * Extracts a user-friendly error message from various error shapes.
 */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;

  const err = error as Record<string, unknown> | null;
  if (err && typeof err === "object") {
    const msg = err.message ?? err.messageV2 ?? err.title;
    if (typeof msg === "string") return msg;
  }

  return String(error);
}
