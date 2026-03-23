/** File extensions allowed for push. Lowercase, with leading dot. */
export const ALLOWED_PUSH_EXTENSIONS = new Set([
  // Web markup & styles
  '.html', '.htm', '.css', '.scss', '.sass', '.less',
  // JavaScript / TypeScript
  '.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx', '.vue', '.svelte',
  // Data & config
  '.json', '.yaml', '.yml', '.xml', '.toml', '.graphql', '.gql', '.env', '.config',
  // Images
  '.svg', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp', '.avif',
  // Fonts
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  // Maps & text
  '.map', '.txt', '.md',
  // Misc web
  '.wasm', '.webmanifest', '.lock', '.LICENSE',
]);

/** Per-file soft warning threshold in bytes (2 MB). */
export const PUSH_FILE_SIZE_WARN_BYTES = 2 * 1024 * 1024;

/** Per-file hard block threshold in bytes (10 MB). */
export const PUSH_FILE_SIZE_BLOCK_BYTES = 10 * 1024 * 1024;
