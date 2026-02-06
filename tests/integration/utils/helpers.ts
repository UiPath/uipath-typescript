import { randomBytes } from 'crypto';

/**
 * Generates a unique test resource name with timestamp and random ID.
 *
 * @param serviceName - The name of the service (e.g., 'Queue', 'Asset', 'Bucket')
 * @returns {string} Unique resource name in format: IntegrationTest_{Service}_{Timestamp}_{RandomId}
 *
 * @example
 * ```typescript
 * const queueName = generateTestResourceName('Queue');
 * // Result: IntegrationTest_Queue_1234567890_a7f2k3
 * ```
 */
export function generateTestResourceName(serviceName: string): string {
  const timestamp = Date.now();
  const randomId = randomBytes(3).toString('hex');
  return `IntegrationTest_${serviceName}_${timestamp}_${randomId}`;
}

/**
 * Generates a random string of specified length.
 *
 * @param length - Length of the random string
 * @returns {string} Random alphanumeric string
 */
export function generateRandomString(length: number = 8): string {
  return randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
}

/**
 * Waits for a specified amount of time.
 *
 * @param ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retries an async operation with exponential backoff.
 *
 * @param fn - Async function to retry
 * @param maxRetries - Maximum number of retry attempts
 * @param initialDelay - Initial delay in milliseconds
 * @returns {Promise<T>} Result of the function
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt);
        await wait(delay);
      }
    }
  }

  throw lastError;
}

/**
 * Validates that a response has the expected pagination structure.
 * Works with both NonPaginatedResponse and PaginatedResponse structures.
 *
 * @param response - Response object to validate
 * @returns {boolean} True if response has valid structure
 */
export function hasValidPagination(response: any): boolean {
  return (
    typeof response === 'object' &&
    response !== null &&
    Array.isArray(response.items) &&
    (typeof response.hasNextPage === 'boolean' || response.hasNextPage === undefined) &&
    (response.nextCursor === null ||
     response.nextCursor === undefined ||
     typeof response.nextCursor === 'object' ||
     typeof response.nextCursor === 'string')
  );
}

/**
 * Creates a simple text file content for testing file uploads.
 *
 * @param filename - Name of the file
 * @returns {string} File content
 */
export function createTestFileContent(filename: string): string {
  return `This is a test file: ${filename}\nCreated at: ${new Date().toISOString()}\nRandom data: ${generateRandomString(32)}`;
}
