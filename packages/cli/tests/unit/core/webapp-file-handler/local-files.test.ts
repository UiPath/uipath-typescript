import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs';

vi.mock('node:fs', async () => {
  const actual = await vi.importActual('node:fs');
  return {
    ...actual,
    readFileSync: vi.fn(),
    readdirSync: vi.fn(),
    existsSync: vi.fn(),
    statSync: vi.fn(),
  };
});

import {
  buildPushIgnoreFilter,
  computeNormalizedHash,
  computeHash,
  collectLocalFiles,
  collectSourceFiles,
} from '../../../../src/core/webapp-file-handler/local-files.js';

describe('local-files', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('computeNormalizedHash', () => {
    it('should produce consistent hash for same content', () => {
      const h1 = computeNormalizedHash('hello world');
      const h2 = computeNormalizedHash('hello world');
      expect(h1).toBe(h2);
    });

    it('should normalize JSON content', () => {
      const compact = computeNormalizedHash('{"a":1}');
      const pretty = computeNormalizedHash('{\n  "a": 1\n}');
      expect(compact).toBe(pretty);
    });

    it('should normalize line endings for non-JSON', () => {
      const unix = computeNormalizedHash('line1\nline2');
      const windows = computeNormalizedHash('line1\r\nline2');
      expect(unix).toBe(windows);
    });

    it('should return hex string', () => {
      const hash = computeNormalizedHash('test');
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('computeHash', () => {
    it('should use normalized hash for .js files', () => {
      const h1 = computeHash('const a = 1;\n', 'app.js');
      const h2 = computeHash('const a = 1;\r\n', 'app.js');
      expect(h1).toBe(h2);
    });

    it('should use raw hash for .png files', () => {
      const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
      const hash = computeHash(buf, 'image.png');
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should use normalized hash for .json files', () => {
      const h1 = computeHash('{"a":1}', 'config.json');
      const h2 = computeHash('{\n  "a": 1\n}', 'config.json');
      expect(h1).toBe(h2);
    });
  });

  describe('buildPushIgnoreFilter', () => {
    it('should build filter with default patterns', () => {
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('ENOENT');
      });
      const ig = buildPushIgnoreFilter('/root');
      expect(ig.ignores('node_modules/package.json')).toBe(true);
    });

    it('should include .gitignore patterns when present', () => {
      vi.mocked(fs.readFileSync).mockImplementation((filePath) => {
        if (String(filePath).endsWith('.gitignore')) return 'build/';
        throw new Error('ENOENT');
      });
      const ig = buildPushIgnoreFilter('/root');
      expect(ig.ignores('build/output.js')).toBe(true);
    });

    it('should include .uipathignore patterns when present', () => {
      vi.mocked(fs.readFileSync).mockImplementation((filePath) => {
        if (String(filePath).endsWith('.uipathignore')) return 'secrets/';
        throw new Error('ENOENT');
      });
      const ig = buildPushIgnoreFilter('/root');
      expect(ig.ignores('secrets/key.pem')).toBe(true);
    });
  });

  describe('collectLocalFiles', () => {
    it('should return empty array when build dir does not exist', () => {
      vi.mocked(fs.readdirSync).mockImplementation(() => {
        const err = new Error('ENOENT') as NodeJS.ErrnoException;
        err.code = 'ENOENT';
        throw err;
      });
      const files = collectLocalFiles('/root', 'dist');
      expect(files).toEqual([]);
    });

    it('should collect files from build directory', () => {
      vi.mocked(fs.readdirSync).mockReturnValue([
        { name: 'index.html', isDirectory: () => false, isFile: () => true },
      ] as any);
      vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from('<html></html>'));
      const files = collectLocalFiles('/root', 'dist');
      expect(files.length).toBe(1);
      expect(files[0].path).toContain('index.html');
    });
  });

  describe('collectSourceFiles', () => {
    it('should return empty array when root dir does not exist', () => {
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('ENOENT');
      });
      vi.mocked(fs.readdirSync).mockImplementation(() => {
        const err = new Error('ENOENT') as NodeJS.ErrnoException;
        err.code = 'ENOENT';
        throw err;
      });
      const files = collectSourceFiles('/nonexistent', 'dist');
      expect(files).toEqual([]);
    });
  });
});
