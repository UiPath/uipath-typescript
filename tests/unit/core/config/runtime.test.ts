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

  it('reads organizationId from the org-id meta tag, separately from orgName', () => {
    setMetaTags({
      [UiPathMetaTags.ORG_NAME]: 'myorg',
      [UiPathMetaTags.ORG_ID]: '11111111-2222-3333-4444-555555555555',
    });
    const config = loadFromMetaTags();
    expect(config?.orgName).toBe('myorg');
    expect(config?.organizationId).toBe('11111111-2222-3333-4444-555555555555');
  });

  it('reads clientId from meta tag', () => {
    setMetaTags({ [UiPathMetaTags.ORG_NAME]: 'myorg', [UiPathMetaTags.CLIENT_ID]: 'client-123' });
    expect(loadFromMetaTags()?.clientId).toBe('client-123');
  });

  describe('appUniqueToken (IP restriction trusted public app)', () => {
    const folderKey = '76bfed5b-ce69-4107-a4a4-208a6b36ce30';
    const publicPage = {
      [UiPathMetaTags.APP_KEY]: 'uapp_key',
      [UiPathMetaTags.FOLDER_KEY]: folderKey,
      [UiPathMetaTags.TENANT_ID]: '22986E36-8B04-4593-B82F-AAE4C14BB2DC',
      [UiPathMetaTags.CDN_BASE]: `https://cdn.example.net/codedapps/IDa834382e/${folderKey}/4`,
    };

    it("builds it from the page's folder key, tenant id and the system name in the CDN path", () => {
      setMetaTags(publicPage);
      const token = loadFromMetaTags()?.appUniqueToken;
      expect(JSON.parse(atob(token!))).toEqual({
        folderId: folderKey,
        tenantId: '22986e36-8b04-4593-b82f-aae4c14bb2dc',
        appSystemName: 'IDa834382e',
      });
    });

    it('leaves it out when the page is not a public app', () => {
      setMetaTags({ ...publicPage, [UiPathMetaTags.APP_KEY]: undefined as unknown as string });
      expect(loadFromMetaTags()?.appUniqueToken).toBeUndefined();
    });

    it("leaves it out when the CDN path doesn't carry the folder key", () => {
      setMetaTags({ ...publicPage, [UiPathMetaTags.CDN_BASE]: 'https://cdn.example.net/other/4' });
      expect(loadFromMetaTags()?.appUniqueToken).toBeUndefined();
    });
  });

  it('reads appKey from meta tag', () => {
    setMetaTags({ [UiPathMetaTags.ORG_NAME]: 'myorg', [UiPathMetaTags.APP_KEY]: 'uapp_key' });
    expect(loadFromMetaTags()?.appKey).toBe('uapp_key');
  });

  it('reads folderKey from meta tag', () => {
    setMetaTags({ [UiPathMetaTags.ORG_NAME]: 'myorg', [UiPathMetaTags.FOLDER_KEY]: 'folder-abc' });
    expect(loadFromMetaTags()?.folderKey).toBe('folder-abc');
  });
});
