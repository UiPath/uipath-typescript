import { describe, it, expect } from 'vitest';
import { compactConfig } from '@/core/config/config-utils';

describe('compactConfig', () => {
  it('drops keys whose value is undefined', () => {
    const result = compactConfig({ baseUrl: 'https://cloud.uipath.com', orgName: undefined });
    expect(result).toEqual({ baseUrl: 'https://cloud.uipath.com' });
    expect(result).not.toHaveProperty('orgName');
  });

  it('keeps a sparse layer from blanking out the layer beneath it on merge', () => {
    const lower = { baseUrl: 'https://cloud.uipath.com', orgName: 'from-env' };
    const upper = compactConfig({ orgName: undefined, tenantName: 'from-ctor' });

    expect({ ...lower, ...upper }).toEqual({
      baseUrl: 'https://cloud.uipath.com',
      orgName: 'from-env',
      tenantName: 'from-ctor',
    });
  });
});
