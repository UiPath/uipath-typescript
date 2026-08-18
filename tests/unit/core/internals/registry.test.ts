import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@/utils/platform', () => ({
  isBrowser: false,
  isInActionCenter: false,
  isHostEmbedded: false,
  embeddingOrigin: null,
}));

vi.mock('@/core/http/api-client');

import { UiPath } from '@/core/uipath';
import { EntityService } from '@/services/data-fabric/entities';
import { clearContractEnv } from '../../../utils/env-contract';
import { TEST_CONSTANTS } from '../../../utils/constants/common';

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
