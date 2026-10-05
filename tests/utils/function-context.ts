import type { CodedFunctionContext, CodedFunctionPlatform } from '@/core/config/function-context';
import { TEST_CONSTANTS } from './constants/common';

/** The platform coordinates a deployed function receives, as the SDK reads them. */
export const TEST_PLATFORM: CodedFunctionPlatform = {
  baseUrl: TEST_CONSTANTS.BASE_URL,
  orgId: TEST_CONSTANTS.ORGANIZATION_ID,
  tenantId: TEST_CONSTANTS.TENANT_ID,
};

/** A handler context carrying the test platform and the default workload token, unless overridden. */
export function functionContext(overrides: Partial<CodedFunctionContext> = {}): CodedFunctionContext {
  return {
    platform: TEST_PLATFORM,
    robot: { accessToken: TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN },
    ...overrides,
  };
}
