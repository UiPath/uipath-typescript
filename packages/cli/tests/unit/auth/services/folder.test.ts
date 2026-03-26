import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockFetch } = vi.hoisted(() => ({ mockFetch: vi.fn() }));
vi.stubGlobal('fetch', mockFetch);

import { getFolders } from '../../../../src/auth/services/folder.js';

describe('auth/services/folder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getFolders', () => {
    it('should fetch and return folders', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          PageItems: [
            { Key: 'k1', DisplayName: 'Folder1', FullyQualifiedName: 'Root/Folder1' },
          ],
        }),
      });
      const folders = await getFolders('token', 'https://cloud.uipath.com', 'org', 'tenant');
      expect(folders).toHaveLength(1);
      expect(folders[0].key).toBe('k1');
      expect(folders[0].displayName).toBe('Folder1');
    });

    it('should throw on 401 response', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 401, statusText: 'Unauthorized' });
      await expect(getFolders('token', 'https://cloud.uipath.com', 'org', 'tenant'))
        .rejects.toThrow('Unauthorized');
    });

    it('should throw on other errors', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500, statusText: 'Server Error' });
      await expect(getFolders('token', 'https://cloud.uipath.com', 'org', 'tenant'))
        .rejects.toThrow('Failed to fetch folders');
    });

    it('should handle value array format', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          value: [{ Key: 'k2', DisplayName: 'Folder2', FullyQualifiedName: 'Root/Folder2' }],
        }),
      });
      const folders = await getFolders('token', 'https://cloud.uipath.com', 'org', 'tenant');
      expect(folders).toHaveLength(1);
    });
  });
});
