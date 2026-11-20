import { describe, it, expect, afterEach, vi } from 'vitest';

// The browser branch: an incomplete configuration injected by the coded-apps plugin is reported by
// the field it lacks, and that reason must reach a service constructed from the instance.
vi.mock('@/utils/platform', () => ({
  isBrowser: true,
  isInActionCenter: false,
  isHostEmbedded: false,
  embeddingOrigin: null,
}));

vi.mock('@/core/http/api-client');

vi.mock('@/core/config/runtime', () => ({ loadFromMetaTags: vi.fn(() => null) }));

import { UiPath } from '@/core/uipath';
import { loadFromMetaTags } from '@/core/config/runtime';
import { EntityService } from '@/services/data-fabric/entities';
import { TEST_CONSTANTS } from '../../../utils/constants/common';

describe('SDKInternalsRegistry error reporting in the browser', () => {
  afterEach(() => {
    vi.mocked(loadFromMetaTags).mockReturnValue(null);
  });

  it('names the empty clientId when the injected configuration is incomplete', () => {
    vi.mocked(loadFromMetaTags).mockReturnValue({
      baseUrl: TEST_CONSTANTS.BASE_URL,
      orgName: TEST_CONSTANTS.ORGANIZATION_ID,
      tenantName: TEST_CONSTANTS.TENANT_ID,
      redirectUri: TEST_CONSTANTS.REDIRECT_URI,
    });
    const sdk = new UiPath();

    expect(() => new EntityService(sdk)).toThrow(/was never configured/);
    expect(() => new EntityService(sdk)).toThrow(/clientId is empty/);
  });

  it('keeps the coded-apps plugin guidance when no configuration was injected at all', () => {
    const sdk = new UiPath();

    expect(() => new EntityService(sdk)).toThrow(/coded-apps plugin/);
  });
});
