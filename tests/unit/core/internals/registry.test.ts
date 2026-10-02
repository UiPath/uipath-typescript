import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@/utils/platform', () => ({
  isBrowser: false,
  isInActionCenter: false,
  isHostEmbedded: false,
  embeddingOrigin: null,
}));

vi.mock('@/core/http/api-client');

import { UiPath } from '@/core/uipath';
import { UiPathEnvVars } from '@/core/config/environment';
import { EntityService } from '@/services/data-fabric/entities';
import { clearContractEnv } from '../../../utils/env-contract';
import { TEST_CONSTANTS } from '../../../utils/constants/common';
import { functionContext } from '../../../utils/function-context';

let restoreEnv: () => void;

beforeEach(() => {
  restoreEnv = clearContractEnv();
});

afterEach(() => {
  restoreEnv();
});

describe('SDKInternalsRegistry error reporting', () => {
  it('explains the missing configuration when the instance never resolved one', () => {
    // The deployed-Function failure mode: no contract present, so `new UiPath()`
    // cannot configure itself and the service must report why.
    const sdk = new UiPath();

    expect(() => new EntityService(sdk)).toThrow(/was never configured/);
    expect(() => new EntityService(sdk)).toThrow(/new UiPath\(ctx\)/);
  });

  it('names the missing coordinate when the instance was built from an incomplete handler context', () => {
    const sdk = new UiPath(functionContext({ robot: null }));

    expect(() => new EntityService(sdk)).toThrow(/was never configured/);
    expect(() => new EntityService(sdk)).toThrow(/ctx\.robot\.accessToken is null/);
    expect(() => new EntityService(sdk)).not.toThrow(/pass the handler context/);
  });

  it('names a null platform when the handler context carried only a token', () => {
    const sdk = new UiPath(functionContext({ platform: null }));

    expect(() => new EntityService(sdk)).toThrow(/ctx\.platform is null/);
    expect(() => new EntityService(sdk)).not.toThrow(/ctx\.robot\.accessToken/);
  });

  it('keeps the generic guidance for a UiPath-like instance that recorded no reason', () => {
    // An older core bundle registers nothing for an unconfigured instance; the structural check
    // still tells it apart from a stray object.
    const olderCore: UiPath = Object.create(UiPath.prototype);

    expect(() => new EntityService(olderCore)).toThrow(/was never configured/);
    expect(() => new EntityService(olderCore)).toThrow(/new UiPath\(ctx\)/);
  });

  it('constructs services once the configuration completes on initialize()', async () => {
    const sdk = new UiPath(functionContext({ robot: null }));
    expect(() => new EntityService(sdk)).toThrow(/was never configured/);

    process.env[UiPathEnvVars.ACCESS_TOKEN] = TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN;
    await sdk.initialize();

    expect(() => new EntityService(sdk)).not.toThrow();
  });

  it('keeps the generic message for something that is not a UiPath instance', () => {
    const notAnSdk = {} as unknown as UiPath;

    expect(() => new EntityService(notAnSdk)).toThrow(/Invalid SDK instance/);
    expect(() => new EntityService(notAnSdk)).not.toThrow(/was never configured/);
  });

  it('constructs services normally from a configured instance', () => {
    const sdk = new UiPath({
      baseUrl: TEST_CONSTANTS.BASE_URL,
      orgName: TEST_CONSTANTS.ORGANIZATION_ID,
      tenantName: TEST_CONSTANTS.TENANT_ID,
      secret: TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN,
    });

    expect(() => new EntityService(sdk)).not.toThrow();
  });
});
