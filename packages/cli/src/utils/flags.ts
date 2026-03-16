import { Flags } from '@oclif/core';

/**
 * Common credential flags shared across CLI commands.
 */
export const COMMON_FLAGS = {
  baseUrl: Flags.string({
    description: 'UiPath base URL (default: https://cloud.uipath.com)',
  }),
  orgId: Flags.string({
    description: 'UiPath organization ID',
  }),
  orgName: Flags.string({
    description: 'UiPath organization name',
  }),
  tenantId: Flags.string({
    description: 'UiPath tenant ID',
  }),
  folderKey: Flags.string({
    description: 'UiPath folder key',
  }),
  accessToken: Flags.string({
    description: 'UiPath bearer token for authentication',
  }),
};
