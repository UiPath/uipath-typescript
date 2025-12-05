export const VERSION_CONSTANTS = {
  FLAGS: ['--version', '-v'],
  CLI_NAME: 'uipath-ts-cli',
  UNKNOWN_VERSION: 'unknown',
  ERROR_READING_VERSION: 'Error reading version information',
} as const;

export const VALID_NAME_REGEX = /^[a-zA-Z0-9_-]+$/

export const ACTION_SCHEMA_CONSTANTS = {
  ACTION_SCHEMA_FILENAME: 'action-schema.json'
} as const;
