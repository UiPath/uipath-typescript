import { describe, it, expect } from 'vitest';
import {
  configFromFunctionContext,
  isFunctionContext,
  type CodedFunctionContext,
} from '@/core/config/function-context';
import type { PartialUiPathConfig } from '@/core/config/sdk-config';
import { TEST_CONSTANTS } from '../../../utils/constants/common';

describe('isFunctionContext', () => {
  it('recognises a context carrying platform coordinates', () => {
    const context: CodedFunctionContext = {
      platform: { baseUrl: TEST_CONSTANTS.BASE_URL, orgId: 'o', tenantId: 't' },
      robot: null,
    };

    expect(isFunctionContext(context)).toBe(true);
  });

  it('recognises a context carrying only a robot identity', () => {
    const context: CodedFunctionContext = { platform: null, robot: { accessToken: 't' } };

    expect(isFunctionContext(context)).toBe(true);
  });

  it('recognises a context whose platform is null, as on a local run', () => {
    const context: CodedFunctionContext = { platform: null, robot: null };

    expect(isFunctionContext(context)).toBe(true);
  });

  it('does not mistake SDK configuration for a context', () => {
    const config: PartialUiPathConfig = {
      baseUrl: TEST_CONSTANTS.BASE_URL,
      orgName: 'my-org',
      tenantName: 'my-tenant',
      secret: 'pat',
    };

    expect(isFunctionContext(config)).toBe(false);
  });
});

describe('configFromFunctionContext', () => {
  it('maps platform coordinates and the workload token onto the config fields', () => {
    const context: CodedFunctionContext = {
      platform: {
        baseUrl: TEST_CONSTANTS.BASE_URL,
        orgId: TEST_CONSTANTS.ORGANIZATION_ID,
        tenantId: TEST_CONSTANTS.TENANT_ID,
      },
      robot: { accessToken: TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN },
    };

    expect(configFromFunctionContext(context)).toEqual({
      baseUrl: TEST_CONSTANTS.BASE_URL,
      orgName: TEST_CONSTANTS.ORGANIZATION_ID,
      tenantName: TEST_CONSTANTS.TENANT_ID,
      secret: TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN,
    });
  });

  it('returns null when the host supplies no platform, so callers fall through', () => {
    const context: CodedFunctionContext = { platform: null, robot: null };

    expect(configFromFunctionContext(context)).toBeNull();
  });

  it('normalises a null accessToken to undefined', () => {
    const context: CodedFunctionContext = {
      platform: { baseUrl: TEST_CONSTANTS.BASE_URL, orgId: 'o', tenantId: 't' },
      robot: { accessToken: null },
    };
    const result = configFromFunctionContext(context);

    expect(result?.secret).toBeUndefined();
  });

  it('maps coordinates even when the robot identity is absent', () => {
    const context: CodedFunctionContext = {
      platform: { baseUrl: TEST_CONSTANTS.BASE_URL, orgId: 'o', tenantId: 't' },
      robot: null,
    };
    const result = configFromFunctionContext(context);

    expect(result?.orgName).toBe('o');
    expect(result?.secret).toBeUndefined();
  });
});
