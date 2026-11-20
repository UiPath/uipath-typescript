import { describe, it, expect, vi } from 'vitest';

// The browser branch of missingConfigMessage: meta tags are the browser's configuration source, so
// the guidance points at the bundler plugin, never at a handler context or the environment.
vi.mock('@/utils/platform', () => ({ isBrowser: true }));

import { missingConfigMessage } from '@/core/config/config-utils';
import { TEST_CONSTANTS } from '../../../utils/constants/common';

describe('missingConfigMessage in the browser', () => {
  it('keeps the coded-apps plugin guidance without a context', () => {
    const message = missingConfigMessage();

    expect(message).toMatch(/configuration not found/);
    expect(message).toMatch(/coded-apps plugin/);
    expect(message).not.toMatch(/new UiPath\(ctx\)/);
  });

  it('names an empty clientId when the injected configuration is incomplete', () => {
    const message = missingConfigMessage({
      baseUrl: TEST_CONSTANTS.BASE_URL,
      orgName: TEST_CONSTANTS.ORGANIZATION_ID,
      tenantName: TEST_CONSTANTS.TENANT_ID,
      redirectUri: TEST_CONSTANTS.REDIRECT_URI,
    });

    expect(message).toMatch(/clientId is empty/);
    expect(message).toMatch(/non-confidential OAuth client/);
  });
});
