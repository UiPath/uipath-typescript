import { vi } from 'vitest';
import { SessionLicense } from '../../../src/core/licensing/session-license';
import { UiPathConfig } from '../../../src/core/config/config';
import { MemoryStore } from '../../../src/utils/storage/memory-store';
import { TEST_CONSTANTS } from '../constants/common';
import { createMockApiClient } from '../setup';

export function createHeldSessionLicense(): { license: SessionLicense; release: () => void } {
  const license = new SessionLicense(
    new UiPathConfig({
      baseUrl: TEST_CONSTANTS.BASE_URL,
      orgName: TEST_CONSTANTS.ORGANIZATION_ID,
      tenantName: TEST_CONSTANTS.TENANT_ID,
    }),
    createMockApiClient(),
    new MemoryStore(),
  );
  let release!: () => void;
  vi.spyOn(license, 'ensure').mockReturnValue(new Promise<void>((resolve) => { release = resolve; }));
  return { license, release };
}
