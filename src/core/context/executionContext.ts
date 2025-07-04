import { RequestSpec } from '../../models/common/requestSpec';

/**
 * ExecutionContext manages the state and context of API operations.
 * It provides a way to share context across service calls and maintain
 * execution state throughout the lifecycle of operations.
 */
export class ExecutionContext {
  private context: Map<string, any> = new Map();
  private headers: Record<string, string> = {};
  
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
   * Set custom headers that will be included in all API requests
   */
  setHeaders(headers: Record<string, string>): void {
    this.headers = { ...this.headers, ...headers };
  }

  /**
   * Get all custom headers
   */
  getHeaders(): Record<string, string> {
    return { ...this.headers };
  }

  /**
   * Clear all context and headers
   */
  clear(): void {
    this.context.clear();
    this.headers = {};
  }

  /**
   * Create a request spec for an API call
   */
  createRequestSpec(spec: Partial<RequestSpec> = {}): RequestSpec {
    return {
      ...spec,
      headers: {
        ...this.getHeaders(),
        ...spec.headers
      }
    };
  }
}
