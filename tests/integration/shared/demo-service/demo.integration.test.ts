import { describe, it, expect } from 'vitest';
import { getServices, describeIntegration, InitMode } from '../../config/unified-setup';

const modes: InitMode[] = ['v0', 'v1'];

// Throwaway demo for #775: a suite folder named after the new service folder.
describeIntegration('Demo Service - Integration Tests', 'both', modes, () => {
  describe('wiring', () => {
    it('authenticates the SDK the service would be built on', () => {
      expect(getServices().sdk.isAuthenticated()).toBe(true);
    });
  });
});
