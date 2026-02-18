/**
 * Pull command: error type for pull failures (validation, overwrite, download, or write).
 * Separated so validation and run-pull can both throw without circular dependency.
 */
export class ProjectPullError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'ProjectPullError';
  }
}
