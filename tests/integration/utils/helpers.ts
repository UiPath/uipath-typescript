import { randomBytes, randomInt } from 'crypto';
import { expect } from 'vitest';
import { GetTopRunCountResponse, ElementCountByStatus } from '../../../src/models/maestro/insights.types';
import type { InstanceStatusTimelineResponse } from '../../../src/models/maestro';

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
 * Generates a cryptographically secure random integer in the range [min, max).
 *
 * @param min - Inclusive lower bound
 * @param max - Exclusive upper bound
 * @returns {number} Random integer
 */
export function generateRandomInt(min: number, max: number): number {
  return randomInt(min, max);
}

/**
 * Generates a cryptographically secure random float in the range [min, max).
 *
 * @param min - Inclusive lower bound
 * @param max - Exclusive upper bound
 * @param precision - Number of decimal places
 * @returns {number} Random float
 */
export function generateRandomFloat(min: number, max: number, precision: number = 2): number {
  const range = max - min;
  // Use 4 random bytes to get a uniform value in [0, 1)
  const randomValue = randomBytes(4).readUInt32BE(0) / 0x100000000;
  return Number.parseFloat((randomValue * range + min).toFixed(precision));
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

/** Minimal interface for services that support getTopRunCount integration testing */
interface TopRunCountService {
  getTopRunCount(startTime: Date, endTime: Date): Promise<GetTopRunCountResponse[]>;
}

/**
 * Integration test helper: calls getTopRunCount and validates the response shape.
 * Shared between MaestroProcessesService and CasesService.
 *
 * @param service - Service instance (maestroProcesses or cases)
 */
export async function testGetTopRunCount(
  service: TopRunCountService
): Promise<void> {
  const now = new Date();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const result = await service.getTopRunCount(sevenDaysAgo, now);

  expect(result).toBeDefined();
  expect(Array.isArray(result)).toBe(true);

  if (result.length === 0) {
    throw new Error('No top processes returned — cannot validate response structure');
  }

  const topProcess = result[0];
  expect(topProcess.packageId).toBeDefined();
  expect(typeof topProcess.packageId).toBe('string');
  expect(topProcess.runCount).toBeDefined();
  expect(typeof topProcess.runCount).toBe('number');
  expect(topProcess.processKey).toBeDefined();
  expect(typeof topProcess.processKey).toBe('string');
}

/** Minimal interface for services that support getInstanceStatusTimeline integration testing */
interface InstanceStatusTimelineService {
  getInstanceStatusTimeline(startTime: Date, endTime: Date): Promise<InstanceStatusTimelineResponse[]>;
}

/**
 * Integration test helper: calls getInstanceStatusTimeline and validates the response shape.
 * Shared between MaestroProcessesService and CasesService.
 *
 * @param service - Service instance (maestroProcesses or cases)
 */
export async function testGetInstanceStatusTimeline(
  service: InstanceStatusTimelineService,
): Promise<void> {
  const now = new Date();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const result = await service.getInstanceStatusTimeline(sevenDaysAgo, now);

  expect(result).toBeDefined();
  expect(Array.isArray(result)).toBe(true);

  if (result.length > 0) {
    const entry = result[0];
    expect(entry.startTime).toBeDefined();
    expect(typeof entry.startTime).toBe('string');
    expect(entry.status).toBeDefined();
    expect(typeof entry.status).toBe('string');
    expect(entry.count).toBeDefined();
    expect(typeof entry.count).toBe('number');
  }
}

/**
 * Validates that an ElementCountByStatus object has the expected shape
 * with all required numeric fields.
 *
 * @param element - Element count by status object to validate
 */
export function expectValidElementCountByStatus(element: ElementCountByStatus): void {
  expect(element.elementId).toBeDefined();
  expect(typeof element.successCount).toBe('number');
  expect(typeof element.failCount).toBe('number');
  expect(typeof element.terminatedCount).toBe('number');
  expect(typeof element.pausedCount).toBe('number');
  expect(typeof element.inProgressCount).toBe('number');
  expect(typeof element.minDurationMs).toBe('number');
  expect(typeof element.maxDurationMs).toBe('number');
  expect(typeof element.avgDurationMs).toBe('number');
  expect(typeof element.p50DurationMs).toBe('number');
  expect(typeof element.p95DurationMs).toBe('number');
  expect(typeof element.p99DurationMs).toBe('number');
}

/** Minimal interface for services that support getElementCountByStatus integration testing */
interface ElementCountByStatusService {
  getAll(): Promise<Array<{ processKey: string; packageId: string; packageVersions: string[] }>>;
  getElementCountByStatus(processKey: string, packageId: string, startTime: Date, endTime: Date, packageVersion: string): Promise<ElementCountByStatus[]>;
}

/**
 * Integration test helper: fetches a process/case, calls getElementCountByStatus,
 * and validates the response shape. Shared between MaestroProcesses and Cases.
 *
 * @param service - Service instance (maestroProcesses or cases)
 * @param serviceName - Name for error messages (e.g., 'processes')
 */
export async function testGetElementCountByStatus(
  service: ElementCountByStatusService,
  serviceName: string
): Promise<void> {
  const processes = await service.getAll();
  if (processes.length === 0) {
    throw new Error(`No ${serviceName} available for testing getElementCountByStatus`);
  }

  const process = processes[0];
  const packageVersion = process.packageVersions[0];
  if (!packageVersion) {
    throw new Error(`No package versions available for ${serviceName} getElementCountByStatus test`);
  }

  const result = await service.getElementCountByStatus(
    process.processKey,
    process.packageId,
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    new Date(),
    packageVersion
  );

  expect(result).toBeDefined();
  expect(Array.isArray(result)).toBe(true);

  if (result.length > 0) {
    expectValidElementCountByStatus(result[0]);
  }
}
