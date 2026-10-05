import { describe, it, expect } from 'vitest';
import {
  configFromFunctionContext,
  folderKeyFromFunctionContext,
  isFunctionContext,
} from '@/core/config/function-context';
import type { PartialUiPathConfig } from '@/core/config/sdk-config';
import { TEST_CONSTANTS } from '../../../utils/constants/common';
import { functionContext, TEST_PLATFORM } from '../../../utils/function-context';

describe('isFunctionContext', () => {
  it('recognises a context carrying platform coordinates', () => {
    expect(isFunctionContext(functionContext({ robot: null }))).toBe(true);
  });

  it('recognises a context carrying only a robot identity', () => {
    expect(isFunctionContext(functionContext({ platform: null }))).toBe(true);
  });

  it('recognises a context whose platform is null, as on a local run', () => {
    expect(isFunctionContext(functionContext({ platform: null, robot: null }))).toBe(true);
  });

  it('does not mistake SDK configuration for a context', () => {
    const config: PartialUiPathConfig = {
      baseUrl: TEST_CONSTANTS.BASE_URL,
      orgName: TEST_CONSTANTS.ORGANIZATION_ID,
      tenantName: TEST_CONSTANTS.TENANT_ID,
      secret: TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN,
    };

    expect(isFunctionContext(config)).toBe(false);
  });
});

describe('configFromFunctionContext', () => {
  it('maps platform coordinates and the workload token onto the config fields', () => {
    expect(configFromFunctionContext(functionContext())).toEqual({
      baseUrl: TEST_CONSTANTS.BASE_URL,
      orgName: TEST_CONSTANTS.ORGANIZATION_ID,
      tenantName: TEST_CONSTANTS.TENANT_ID,
      secret: TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN,
    });
  });

  it('returns null when the context carries neither platform nor token, so callers fall through', () => {
    expect(configFromFunctionContext(functionContext({ platform: null, robot: null }))).toBeNull();
  });

  it('contributes the token alone when the platform is null', () => {
    expect(configFromFunctionContext(functionContext({ platform: null }))).toEqual({
      secret: TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN,
    });
  });

  it('maps a folder-only context to null, so the folder key alone never counts as configuration', () => {
    const context = functionContext({
      platform: { baseUrl: '', orgId: '', tenantId: '', folderKey: TEST_CONSTANTS.FOLDER_KEY },
      robot: null,
    });

    expect(configFromFunctionContext(context)).toBeNull();
  });

  it('normalises a null accessToken to undefined', () => {
    const result = configFromFunctionContext(functionContext({ robot: { accessToken: null } }));

    expect(result?.secret).toBeUndefined();
  });

  it('maps coordinates even when the robot identity is absent', () => {
    const result = configFromFunctionContext(functionContext({ robot: null }));

    expect(result?.orgName).toBe(TEST_CONSTANTS.ORGANIZATION_ID);
    expect(result?.secret).toBeUndefined();
  });

  // A blank copied into the configuration would win the merge over the environment's value.
  it('leaves a blank coordinate out so the environment can fill it', () => {
    const context = functionContext({
      platform: { ...TEST_PLATFORM, orgId: '', tenantId: TEST_CONSTANTS.FOLDER_KEY_WHITESPACE },
    });

    const result = configFromFunctionContext(context);

    expect(result?.baseUrl).toBe(TEST_CONSTANTS.BASE_URL);
    expect(result?.orgName).toBeUndefined();
    expect(result?.tenantName).toBeUndefined();
  });

  // The organization and tenant are appended to baseUrl, so a host that hands over a longer URL
  // would otherwise address a tenant one level too deep.
  it.each([
    ['a tenant-scoped path', TEST_CONSTANTS.BASE_URL_WITH_PATH],
    ['a query string', TEST_CONSTANTS.BASE_URL_WITH_QUERY],
    ['a fragment', TEST_CONSTANTS.BASE_URL_WITH_HASH],
    ['a trailing slash', TEST_CONSTANTS.BASE_URL_TRAILING_SLASH],
  ])('reduces a baseUrl carrying %s to its origin', (_label, baseUrl) => {
    const context = functionContext({ platform: { ...TEST_PLATFORM, baseUrl } });

    expect(configFromFunctionContext(context)?.baseUrl).toBe(TEST_CONSTANTS.BASE_URL);
  });

  it('leaves out a baseUrl that is not http(s), keeping the other coordinates', () => {
    const context = functionContext({ platform: { ...TEST_PLATFORM, baseUrl: TEST_CONSTANTS.BASE_URL_NON_HTTP } });

    const result = configFromFunctionContext(context);

    expect(result?.baseUrl).toBeUndefined();
    expect(result?.orgName).toBe(TEST_CONSTANTS.ORGANIZATION_ID);
  });

  it('does not put the folder key on the configuration', () => {
    const context = functionContext({ platform: { ...TEST_PLATFORM, folderKey: TEST_CONSTANTS.FOLDER_KEY } });

    expect(configFromFunctionContext(context)).not.toHaveProperty('folderKey');
  });
});

describe('folderKeyFromFunctionContext', () => {
  it('returns the folder key of the invocation, trimmed', () => {
    const context = functionContext({ platform: { ...TEST_PLATFORM, folderKey: ` ${TEST_CONSTANTS.FOLDER_KEY} ` } });

    expect(folderKeyFromFunctionContext(context)).toBe(TEST_CONSTANTS.FOLDER_KEY);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['empty', ''],
    ['whitespace-only', TEST_CONSTANTS.FOLDER_KEY_WHITESPACE],
  ])('treats a %s folder key as absent', (_label, folderKey) => {
    const context = functionContext({ platform: { ...TEST_PLATFORM, folderKey } });

    expect(folderKeyFromFunctionContext(context)).toBeUndefined();
  });

  it('returns undefined when the platform is null, as on a local run', () => {
    expect(folderKeyFromFunctionContext(functionContext({ platform: null }))).toBeUndefined();
  });
});
