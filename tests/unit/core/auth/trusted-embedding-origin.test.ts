import { afterEach, describe, expect, it, vi } from 'vitest';

interface PlatformMock {
  isBrowser: boolean;
  isInActionCenter: boolean;
  isHostEmbedded: boolean;
  embeddingOrigin: string | null;
}

// trustedEmbeddingOrigin is a module-level const evaluated at import time from the
// platform flags, so each scenario re-mocks platform and re-imports the module.
async function loadTrustedEmbeddingOrigin(platform: PlatformMock): Promise<string | null> {
  vi.resetModules();
  vi.doMock('@/utils/platform', () => platform);
  const mod = await import('@/core/auth/host-token-request');
  return mod.trustedEmbeddingOrigin;
}

describe('trustedEmbeddingOrigin', () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock('@/utils/platform');
  });

  it('resolves to the origin when host-embedded with a trusted UiPath origin', async () => {
    const origin = await loadTrustedEmbeddingOrigin({
      isBrowser: true,
      isInActionCenter: false,
      isHostEmbedded: true,
      embeddingOrigin: 'https://cloud.uipath.com',
    });
    expect(origin).toBe('https://cloud.uipath.com');
  });

  it('is null when not host-embedded even with a valid origin', async () => {
    const origin = await loadTrustedEmbeddingOrigin({
      isBrowser: true,
      isInActionCenter: false,
      isHostEmbedded: false,
      embeddingOrigin: 'https://cloud.uipath.com',
    });
    expect(origin).toBeNull();
  });

  it('is null when the embedding origin is not a trusted UiPath host', async () => {
    const origin = await loadTrustedEmbeddingOrigin({
      isBrowser: true,
      isInActionCenter: false,
      isHostEmbedded: true,
      embeddingOrigin: 'https://evil.example.com',
    });
    expect(origin).toBeNull();
  });

  it('is null when embeddingOrigin is null', async () => {
    const origin = await loadTrustedEmbeddingOrigin({
      isBrowser: true,
      isInActionCenter: false,
      isHostEmbedded: true,
      embeddingOrigin: null,
    });
    expect(origin).toBeNull();
  });
});
