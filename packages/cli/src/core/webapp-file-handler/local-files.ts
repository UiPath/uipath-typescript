import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type { LocalFile } from './types.js';

/** Extensions treated as text: normalized (JSON + line endings) before hashing. All others use raw-byte hash. */
const TEXT_EXTENSIONS = new Set([
  '.html', '.htm', '.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx', '.css', '.scss', '.less',
  '.json', '.svg', '.txt', '.md', '.xml', '.yaml', '.yml', '.map', '.graphql', '.gql',
]);

function isTextPath(filePath: string): boolean {
  return TEXT_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

/** Normalized hash for text: JSON parse/stringify and line-ending normalization so formatting-only changes don't trigger updates. */
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

/** Raw-byte hash for binary files; avoids unreliable utf-8 interpretation. */
function computeRawHash(content: Buffer): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Path-based hash: text extensions use normalized hash; everything else uses raw-byte hash.
 * Use the same filePath (e.g. local path) when hashing local and remote content for the same file.
 */
export function computeHash(content: Buffer | string, filePath: string): string {
  if (isTextPath(filePath)) return computeNormalizedHash(content);
  const buf = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf-8');
  return computeRawHash(buf);
}

function collectFilesRecursive(
  dir: string,
  rootDir: string,
  files: LocalFile[],
  computeHashForFile: (content: Buffer, filePath: string) => string
): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFilesRecursive(fullPath, rootDir, files, computeHashForFile);
    } else if (entry.isFile()) {
      const relPath = path.relative(rootDir, fullPath).replace(/\\/g, '/');
      const content = fs.readFileSync(fullPath);
      files.push({
        path: relPath,
        absPath: fullPath,
        hash: computeHashForFile(content, relPath),
        content,
      });
    }
  }
}

export function collectLocalFiles(rootDir: string, bundlePath: string): LocalFile[] {
  const files: LocalFile[] = [];
  const distPath = path.join(rootDir, bundlePath);
  try {
    collectFilesRecursive(distPath, rootDir, files, computeHash);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return files;
    throw error;
  }
  return files;
}
