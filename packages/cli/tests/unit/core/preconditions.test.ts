import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import { Preconditions } from '../../../src/core/preconditions.js';

vi.mock('node:fs', async () => {
  const actual = await vi.importActual('node:fs');
  return {
    ...actual,
    existsSync: vi.fn(),
    statSync: vi.fn(),
  };
});

describe('Preconditions', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('validate', () => {
    it('should pass when build dir exists and is a directory', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as fs.Stats);

      expect(() => Preconditions.validate('/project', 'dist')).not.toThrow();
    });

    it('should throw when build dir does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      expect(() => Preconditions.validate('/project', 'dist')).toThrow(
        /Build directory not found/
      );
    });

    it('should throw when path is not a directory', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => false } as fs.Stats);

      expect(() => Preconditions.validate('/project', 'dist')).toThrow(
        /not a directory/
      );
    });

    it('should use default bundlePath of dist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as fs.Stats);

      Preconditions.validate('/project');
      expect(fs.existsSync).toHaveBeenCalledWith(expect.stringContaining('dist'));
    });

    it('should include remediation steps in error message', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      expect(() => Preconditions.validate('/project', 'dist')).toThrow(/Steps:/);
      expect(() => Preconditions.validate('/project', 'dist')).toThrow(/npm run build/);
    });
  });
});
