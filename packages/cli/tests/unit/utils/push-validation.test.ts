import { describe, it, expect, vi, beforeEach } from 'vitest';
import inquirer from 'inquirer';

vi.mock('../../../src/core/webapp-file-handler/local-files.js', () => ({
  collectLocalFiles: vi.fn().mockReturnValue([]),
  collectSourceFiles: vi.fn().mockReturnValue([]),
}));

import { validatePushFiles } from '../../../src/utils/push-validation.js';
import { collectLocalFiles, collectSourceFiles } from '../../../src/core/webapp-file-handler/local-files.js';
import { createMockLogger } from '../../helpers/index.js';

function makeFile(filePath: string, sizeBytes: number) {
  return {
    path: filePath,
    absPath: `/project/${filePath}`,
    hash: 'abc123',
    content: Buffer.alloc(sizeBytes),
  };
}

describe('validatePushFiles', () => {
  const mockLogger = createMockLogger();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(collectLocalFiles).mockReturnValue([]);
    vi.mocked(collectSourceFiles).mockReturnValue([]);
  });

  it('should pass when all files have allowed extensions and are small', async () => {
    vi.mocked(collectLocalFiles).mockReturnValue([
      makeFile('dist/index.html', 100),
      makeFile('dist/app.js', 500),
      makeFile('dist/style.css', 200),
    ]);

    await expect(validatePushFiles('/project', 'dist', mockLogger)).resolves.toBeUndefined();
  });

  it('should pass with no files', async () => {
    await expect(validatePushFiles('/project', 'dist', mockLogger)).resolves.toBeUndefined();
  });

  it('should allow files without extensions', async () => {
    vi.mocked(collectSourceFiles).mockReturnValue([
      makeFile('LICENSE', 100),
      makeFile('Makefile', 50),
    ]);

    await expect(validatePushFiles('/project', 'dist', mockLogger)).resolves.toBeUndefined();
  });

  describe('extension validation', () => {
    it('should block disallowed extensions', async () => {
      vi.mocked(collectLocalFiles).mockReturnValue([
        makeFile('dist/index.html', 100),
        makeFile('dist/video.mp4', 1000),
      ]);

      await expect(
        validatePushFiles('/project', 'dist', mockLogger)
      ).rejects.toThrow(/disallowed extensions/);
    });

    it('should block executable files', async () => {
      vi.mocked(collectSourceFiles).mockReturnValue([
        makeFile('tools/helper.exe', 500),
      ]);

      await expect(
        validatePushFiles('/project', 'dist', mockLogger)
      ).rejects.toThrow(/disallowed extensions/);
    });

    it('should block archive files', async () => {
      vi.mocked(collectSourceFiles).mockReturnValue([
        makeFile('assets/bundle.zip', 500),
      ]);

      await expect(
        validatePushFiles('/project', 'dist', mockLogger)
      ).rejects.toThrow(/disallowed extensions/);
    });

    it('should check both build and source files', async () => {
      vi.mocked(collectLocalFiles).mockReturnValue([
        makeFile('dist/index.html', 100),
      ]);
      vi.mocked(collectSourceFiles).mockReturnValue([
        makeFile('src/data.dll', 100),
      ]);

      await expect(
        validatePushFiles('/project', 'dist', mockLogger)
      ).rejects.toThrow(/disallowed extensions/);
    });
  });

  describe('file size validation', () => {
    const SIZE_3MB = 3 * 1024 * 1024;
    const SIZE_11MB = 11 * 1024 * 1024;

    it('should hard block files over 10 MB', async () => {
      vi.mocked(collectLocalFiles).mockReturnValue([
        makeFile('dist/huge-image.png', SIZE_11MB),
      ]);

      await expect(
        validatePushFiles('/project', 'dist', mockLogger)
      ).rejects.toThrow(/10 MB size limit/);
    });

    it('should prompt for files between 2-10 MB and proceed if accepted', async () => {
      vi.mocked(collectLocalFiles).mockReturnValue([
        makeFile('dist/large-font.woff2', SIZE_3MB),
      ]);

      const originalIsTTY = process.stdin.isTTY;
      Object.defineProperty(process.stdin, 'isTTY', { value: true, writable: true });

      vi.mocked(inquirer.prompt).mockResolvedValue({ proceed: true });

      try {
        await expect(validatePushFiles('/project', 'dist', mockLogger)).resolves.toBeUndefined();
        expect(inquirer.prompt).toHaveBeenCalled();
      } finally {
        Object.defineProperty(process.stdin, 'isTTY', { value: originalIsTTY, writable: true });
      }
    });

    it('should prompt for files between 2-10 MB and block if declined', async () => {
      vi.mocked(collectLocalFiles).mockReturnValue([
        makeFile('dist/large-font.woff2', SIZE_3MB),
      ]);

      const originalIsTTY = process.stdin.isTTY;
      Object.defineProperty(process.stdin, 'isTTY', { value: true, writable: true });

      vi.mocked(inquirer.prompt).mockResolvedValue({ proceed: false });

      try {
        await expect(
          validatePushFiles('/project', 'dist', mockLogger)
        ).rejects.toThrow(/cancelled/i);
      } finally {
        Object.defineProperty(process.stdin, 'isTTY', { value: originalIsTTY, writable: true });
      }
    });

    it('should hard block large files in non-TTY mode', async () => {
      vi.mocked(collectLocalFiles).mockReturnValue([
        makeFile('dist/large-font.woff2', SIZE_3MB),
      ]);

      const originalIsTTY = process.stdin.isTTY;
      Object.defineProperty(process.stdin, 'isTTY', { value: false, writable: true });

      try {
        await expect(
          validatePushFiles('/project', 'dist', mockLogger)
        ).rejects.toThrow(/cancelled/i);
        expect(inquirer.prompt).not.toHaveBeenCalled();
      } finally {
        Object.defineProperty(process.stdin, 'isTTY', { value: originalIsTTY, writable: true });
      }
    });

    it('should check extension before size (extension error takes precedence)', async () => {
      vi.mocked(collectLocalFiles).mockReturnValue([
        makeFile('dist/video.mp4', SIZE_11MB),
      ]);

      await expect(
        validatePushFiles('/project', 'dist', mockLogger)
      ).rejects.toThrow(/disallowed extensions/);
    });
  });
});
