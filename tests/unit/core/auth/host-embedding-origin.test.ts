import { afterEach, describe, expect, it, vi } from 'vitest';

interface PlatformMock {
  isBrowser: boolean;
  isInActionCenter: boolean;
  isHostEmbedded: boolean;
  embeddingOrigin: string | null;
}

// hostEmbeddingOrigin is a module-level const evaluated at import time from the
// platform flags, so each scenario re-mocks platform and re-imports the module.
async function loadHostEmbeddingOrigin(platform: PlatformMock): Promise<string | null> {
  vi.resetModules();
  vi.doMock('@/utils/platform', () => platform);
  const mod = await import('@/core/auth/host-token-request');
  return mod.hostEmbeddingOrigin;
}

describe('hostEmbeddingOrigin', () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock('@/utils/platform');
  });

  it('resolves to the origin when host-embedded', async () => {
    const origin = await loadHostEmbeddingOrigin({
      isBrowser: true,
      isInActionCenter: false,
      isHostEmbedded: true,
      embeddingOrigin: 'https://cloud.uipath.com',
    });
    expect(origin).toBe('https://cloud.uipath.com');
  });

  it('is null when not host-embedded even with an origin present', async () => {
    const origin = await loadHostEmbeddingOrigin({
      isBrowser: true,
      isInActionCenter: false,
      isHostEmbedded: false,
      embeddingOrigin: 'https://cloud.uipath.com',
    });
    expect(origin).toBeNull();
  });

  // Host origins are customer-configurable and follow no fixed pattern, so any
  // origin the host supplies is taken as given and simply pinned.
  it('resolves to the origin for a non-uipath.com host domain', async () => {
    const origin = await loadHostEmbeddingOrigin({
      isBrowser: true,
      isInActionCenter: false,
      isHostEmbedded: true,
      embeddingOrigin: 'https://automation.customer-sf.internal',
    });
    expect(origin).toBe('https://automation.customer-sf.internal');
  });

  it('is null when embeddingOrigin is null', async () => {
    const origin = await loadHostEmbeddingOrigin({
      isBrowser: true,
      isInActionCenter: false,
      isHostEmbedded: true,
      embeddingOrigin: null,
    });
    expect(origin).toBeNull();
  });
});
