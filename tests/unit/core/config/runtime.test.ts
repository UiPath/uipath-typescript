import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Must mock platform before importing runtime
vi.mock('@/utils/platform', () => ({ isBrowser: true }));

import { loadFromMetaTags } from '@/core/config/runtime';
import { UiPathMetaTags } from '@/utils/runtime/constants';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const mockQuerySelector = vi.fn();

function setMetaTags(tags: Partial<Record<UiPathMetaTags, string>>): void {
  mockQuerySelector.mockImplementation((selector: string) => {
    for (const [name, content] of Object.entries(tags)) {
      if (selector === `meta[name="${name}"]`) {
        return { content } as HTMLMetaElement;
      }
    }
    return null;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  global.document = { querySelector: mockQuerySelector } as unknown as Document;
});

afterEach(() => {
  delete (global as unknown as Record<string, unknown>).document;
});

// ---------------------------------------------------------------------------
// loadFromMetaTags
// ---------------------------------------------------------------------------
describe('loadFromMetaTags', () => {
  it('returns null when no meta tags are present', () => {
    mockQuerySelector.mockReturnValue(null);
    expect(loadFromMetaTags()).toBeNull();
  });

  it('reads orgName from meta tag', () => {
    setMetaTags({ [UiPathMetaTags.ORG_NAME]: 'myorg' });
    expect(loadFromMetaTags()?.orgName).toBe('myorg');
  });

  it('reads clientId from meta tag', () => {
    setMetaTags({ [UiPathMetaTags.ORG_NAME]: 'myorg', [UiPathMetaTags.CLIENT_ID]: 'client-123' });
    expect(loadFromMetaTags()?.clientId).toBe('client-123');
  });

  it('reads folderKey from meta tag', () => {
    setMetaTags({ [UiPathMetaTags.ORG_NAME]: 'myorg', [UiPathMetaTags.FOLDER_KEY]: 'folder-abc' });
    expect(loadFromMetaTags()?.folderKey).toBe('folder-abc');
  });
});
