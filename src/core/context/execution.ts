/**
 * ExecutionContext manages the state and context of API operations.
 * It provides a way to share context across service calls and maintain
 * execution state throughout the lifecycle of operations.
 */
export class ExecutionContext {
  private context: Map<string, any> = new Map();

  /**
   * Set a context value that will be available throughout the execution
   */
  set<T>(key: string, value: T): void {
    this.context.set(key, value);
  }

  /**
   * Get a previously set context value
   */
  get<T>(key: string): T | undefined {
    return this.context.get(key);
  }

  /**
   * Clear all context
   */
  clear(): void {
    this.context.clear();
  }
}
