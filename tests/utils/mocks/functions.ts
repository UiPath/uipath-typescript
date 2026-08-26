import { RawFunctionGetResponse, FunctionHttpMethod } from '../../../src/models/orchestrator/functions.types';
import { RawStudioWebLicenseResponse, StudioWebLicenseTokenClaims } from '../../../src/models/orchestrator/functions.internal-types';
import { FunctionGetResponse } from '../../../src/models/orchestrator/functions.models';
import { NonPaginatedResponse } from '../../../src/utils/pagination';
import { FUNCTION_TEST_CONSTANTS, FUNCTION_LICENSE_TEST_CONSTANTS } from '../constants/functions';
import { TEST_CONSTANTS } from '../constants/common';
import { createMockBaseResponse, createMockCollection } from './core';

/**
 * Builds an unsigned license token carrying the given claims, in the shape
 * Orchestrator issues: an empty header, a base64url payload, and no signature.
 */
export const createMockLicenseToken = (claims: StudioWebLicenseTokenClaims): string => {
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  return `e30.${payload}.`;
};

/**
 * Creates a raw `POST /api/StudioWeb/AcquireLicense` response.
 *
 * The token's expiry is relative to now, so a mock license is live for the
 * duration of a test rather than instantly stale.
 */
export const createMockRawStudioWebLicense = (
  overrides: Partial<RawStudioWebLicenseResponse> = {},
  claimOverrides: Partial<StudioWebLicenseTokenClaims> = {}
): RawStudioWebLicenseResponse => {
  const nowSeconds = Math.floor(Date.now() / 1000);

  return {
    robotType: FUNCTION_LICENSE_TEST_CONSTANTS.ROBOT_TYPE,
    robotTypes: [...FUNCTION_LICENSE_TEST_CONSTANTS.ROBOT_TYPES],
    externalLicense: false,
    isLicensed: true,
    started: FUNCTION_LICENSE_TEST_CONSTANTS.STARTED,
    lastUpdated: '0001-01-01T00:00:00Z',
    licenseToken: createMockLicenseToken({
      nbf: nowSeconds,
      exp: nowSeconds + FUNCTION_LICENSE_TEST_CONSTANTS.TTL_SECONDS,
      ubl: FUNCTION_LICENSE_TEST_CONSTANTS.LICENSE_TIER,
      lu: [...FUNCTION_LICENSE_TEST_CONSTANTS.LICENSED_UNITS],
      status: 'VALID',
      ...claimOverrides,
    }),
    ...overrides,
  };
};

/**
 * Creates a raw HttpTriggers row as the API returns it (PascalCase wire format,
 * including job-runner fields the SDK drops).
 */
export const createMockRawFunctionTrigger = (
  overrides: Record<string, unknown> = {}
): Record<string, unknown> => {
  return {
    Type: 'Http',
    OrganizationUnitId: TEST_CONSTANTS.FOLDER_ID,
    OrganizationUnitFullyQualifiedName: null,
    Enabled: true,
    ReleaseKey: FUNCTION_TEST_CONSTANTS.PROCESS_KEY,
    Name: FUNCTION_TEST_CONSTANTS.NAME,
    Description: FUNCTION_TEST_CONSTANTS.DESCRIPTION,
    JobPriority: 45,
    RunAsMe: false,
    RunAsCaller: true,
    InputArguments: FUNCTION_TEST_CONSTANTS.INPUT_ARGUMENTS,
    EntryPointPath: FUNCTION_TEST_CONSTANTS.ENTRY_POINT_PATH,
    Id: FUNCTION_TEST_CONSTANTS.ID,
    CallingMode: 'LongPolling',
    Method: FUNCTION_TEST_CONSTANTS.METHOD,
    Slug: FUNCTION_TEST_CONSTANTS.SLUG,
    CallbackMode: 'Disabled',
    Release: {
      Id: 972287,
      Name: FUNCTION_TEST_CONSTANTS.PROCESS_NAME,
      Slug: FUNCTION_TEST_CONSTANTS.PROCESS_SLUG,
    },
    MachineRobots: [],
    Tags: [],
    ...overrides,
  };
};

/**
 * Creates a transformed function (SDK shape, without bound methods).
 */
export const createBasicFunction = (
  overrides: Partial<RawFunctionGetResponse> = {}
): RawFunctionGetResponse => {
  return {
    id: FUNCTION_TEST_CONSTANTS.ID,
    name: FUNCTION_TEST_CONSTANTS.NAME,
    slug: FUNCTION_TEST_CONSTANTS.SLUG,
    method: FunctionHttpMethod.Post,
    description: FUNCTION_TEST_CONSTANTS.DESCRIPTION,
    enabled: true,
    inputArguments: FUNCTION_TEST_CONSTANTS.INPUT_ARGUMENTS,
    entryPointPath: FUNCTION_TEST_CONSTANTS.ENTRY_POINT_PATH,
    processKey: FUNCTION_TEST_CONSTANTS.PROCESS_KEY,
    processName: FUNCTION_TEST_CONSTANTS.PROCESS_NAME,
    processSlug: FUNCTION_TEST_CONSTANTS.PROCESS_SLUG,
    folderId: TEST_CONSTANTS.FOLDER_ID,
    ...overrides,
  };
};

/**
 * Creates a mock transformed function collection response.
 */
export const createMockTransformedFunctionCollection = (
  count: number = 1,
  options?: {
    totalCount?: number;
    hasNextPage?: boolean;
    nextCursor?: string;
    previousCursor?: string | null;
    currentPage?: number;
    totalPages?: number;
  }
): NonPaginatedResponse<FunctionGetResponse> => {
  const items = createMockCollection(count, (index) => createBasicFunction({
    name: `${FUNCTION_TEST_CONSTANTS.NAME}-${index}`,
    slug: `${FUNCTION_TEST_CONSTANTS.SLUG}-${index}`,
  }));

  return createMockBaseResponse({
    items,
    totalCount: options?.totalCount || count,
    ...(options?.hasNextPage !== undefined && { hasNextPage: options.hasNextPage }),
    ...(options?.nextCursor && { nextCursor: options.nextCursor }),
    ...(options?.previousCursor !== undefined && { previousCursor: options.previousCursor }),
    ...(options?.currentPage && { currentPage: options.currentPage }),
    ...(options?.totalPages && { totalPages: options.totalPages }),
  });
};
