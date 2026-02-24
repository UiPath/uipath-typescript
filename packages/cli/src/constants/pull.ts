/**
 * Pull command constants. Used for project type validation and pull behavior.
 */

/** Root-level manifest that indicates a Web App project (Studio Web). Must match structure.WEB_APP_MANIFEST_FILENAME. */
export const PULL_WEB_APP_MANIFEST = 'webAppManifest.json';

/** Required value in webAppManifest.json "type" field for pull to be allowed. */
export const PULL_WEB_APP_MANIFEST_TYPE = 'App_ProCode';

/** Filename used as a project-root marker (e.g. for isProjectRootDirectory). */
export const PACKAGE_JSON_FILENAME = 'package.json';

/** Fallback build dir to exclude from pull when remote push_metadata.json is missing or invalid (matches push default). */
export const PULL_DEFAULT_BUILD_DIR = 'dist';

/** Max number of files to download (and write) in parallel. */
export const PULL_DOWNLOAD_CONCURRENCY = 10;

/** Max number of conflicting paths to show when overwrite would be required (rest shown as "... and N more."). */
export const PULL_OVERWRITE_LIST_MAX_DISPLAY = 10;
