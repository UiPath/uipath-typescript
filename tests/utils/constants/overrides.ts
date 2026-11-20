/**
 * Resource override test constants
 *
 * Values a host publishes on the override channel, plus the redirect targets
 * a lookup is expected to land on.
 */

export const OVERRIDE_TEST_CONSTANTS = {
  /** The channel key hosts install their accessor under. */
  CHANNEL_KEY: 'uipath.resourceOverwrites.v1',

  /** Redirect target for a design-time name. */
  TARGET_NAME: 'Prod-DatabaseConnection',

  /** Redirect target folder, and its `X-UIPATH-FolderPath-Encoded` form. */
  TARGET_FOLDER_PATH: 'Production/Live',
  TARGET_FOLDER_PATH_ENCODED: 'UAByAG8AZAB1AGMAdABpAG8AbgAvAEwAaQB2AGUA',

  /** Redirect target published under a folder-scoped key. */
  SCOPED_TARGET_NAME: 'Finance-DatabaseConnection',

  /** Connection an admin mapped a connection binding to, and that connection's folder. */
  TARGET_CONNECTION_ID: '0f8e7d6c-5b4a-4392-8171-6a5b4c3d2e1f',
  TARGET_CONNECTION_FOLDER_KEY: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
} as const;
