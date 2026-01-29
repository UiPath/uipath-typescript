import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type { LocalFile } from './types.js';

export function computeNormalizedHash(content: Buffer | string): string {
  const contentStr = Buffer.isBuffer(content) ? content.toString('utf-8') : content;
  let normalized: string;
  try {
    const jsonContent = JSON.parse(contentStr);
    normalized = JSON.stringify(jsonContent, null, 2);
  } catch {
    normalized = contentStr.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  }
  return crypto.createHash('sha256').update(normalized, 'utf-8').digest('hex');
}

function collectFilesRecursive(
  dir: string,
  rootDir: string,
  files: LocalFile[],
  computeHash: (content: Buffer) => string
): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFilesRecursive(fullPath, rootDir, files, computeHash);
    } else if (entry.isFile()) {
      const relPath = path.relative(rootDir, fullPath).replace(/\\/g, '/');
      const content = fs.readFileSync(fullPath);
      files.push({
        path: relPath,
        absPath: fullPath,
        hash: computeHash(content),
        content,
      });
    }
  }
}

export function collectLocalFiles(rootDir: string, bundlePath: string): LocalFile[] {
  const files: LocalFile[] = [];
  const distPath = path.join(rootDir, bundlePath);
  try {
    collectFilesRecursive(distPath, rootDir, files, (content) => computeNormalizedHash(content));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return files;
    throw error;
  }
  return files;
}
