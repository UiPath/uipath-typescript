import { existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const CHECKS_DIR = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(CHECKS_DIR, '..', '..');

const IGNORED_DIRECTORIES = new Set(['node_modules', 'dist']);

export function checkPath(...parts) {
  return join(CHECKS_DIR, ...parts);
}

export function repoPath(...parts) {
  return join(ROOT, ...parts);
}

export function toPosixPath(path) {
  return path.split(sep).join('/');
}

export function relativeTo(base, path) {
  return toPosixPath(relative(base, path));
}

export function relativeToRoot(path) {
  return relativeTo(ROOT, path);
}

export function walkFiles(dir, include, out = []) {
  if (!existsSync(dir)) return out;

  for (const entry of readdirSync(dir)) {
    if (IGNORED_DIRECTORIES.has(entry)) continue;

    const file = join(dir, entry);
    let stat;
    try {
      stat = statSync(file);
    } catch {
      continue;
    }

    if (stat.isDirectory()) {
      walkFiles(file, include, out);
    } else if (include(file)) {
      out.push(file);
    }
  }

  return out;
}

export function walkTsFiles(dir) {
  return walkFiles(dir, file => file.endsWith('.ts'));
}
