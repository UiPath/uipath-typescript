/**
 * Push command constants. Keeps magic strings and patterns in one place for maintainability.
 */

/** Path segment prefix for dotfiles/dotdirs; entries with this prefix are never pushed (avoids 409s and keeps secrets out). */
export const DOTFILE_PREFIX = '.';

/**
 * Patterns always excluded from source push (git-like). Applied even without .gitignore.
 * Used by buildPushIgnoreFilter; dotfiles are also skipped by name in the collector.
 */
export const PUSH_IGNORE_PATTERNS = [
  'node_modules/',
  '.uipath/',
  '.gitignore',
  '.env',
  '.env.local',
  '.env.*.local',
  '.env.development',
  '.env.production',
  '.env.test',
  '.env.example',
  '.gitkeep',
] as const;

/** Remote path segment between folder and filename when building metadata path checks. */
export const REMOTE_PATH_SEP = '/';
