import { describe, it, expect } from 'vitest';
import { COMMON_FLAGS } from '../../../src/utils/flags.js';

describe('utils/flags', () => {
  it('should export COMMON_FLAGS with expected keys', () => {
    expect(COMMON_FLAGS).toHaveProperty('baseUrl');
    expect(COMMON_FLAGS).toHaveProperty('orgId');
    expect(COMMON_FLAGS).toHaveProperty('orgName');
    expect(COMMON_FLAGS).toHaveProperty('tenantId');
    expect(COMMON_FLAGS).toHaveProperty('folderKey');
    expect(COMMON_FLAGS).toHaveProperty('accessToken');
  });
});
