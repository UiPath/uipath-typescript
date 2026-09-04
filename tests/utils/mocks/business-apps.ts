/**
 * Business App mock factories.
 *
 * Shapes mirror the `v1/business-apps` wire contract — `createdTimeUtc` / `modifiedTimeUtc`
 * / `modifiedBy` are renamed by the service, so mocks must carry the API's names.
 */

import type { BusinessAppApiResponse } from '../../../src/models/maestro/business-apps.internal-types';
import { BUSINESS_APP_TEST_CONSTANTS } from '../constants/business-apps';

/**
 * Builds a single business app in the raw wire shape.
 */
export const createBasicBusinessApp = (
  overrides?: Partial<BusinessAppApiResponse>
): BusinessAppApiResponse => ({
  id: BUSINESS_APP_TEST_CONSTANTS.BUSINESS_APP_ID,
  name: BUSINESS_APP_TEST_CONSTANTS.NAME,
  description: BUSINESS_APP_TEST_CONSTANTS.DESCRIPTION,
  icon: BUSINESS_APP_TEST_CONSTANTS.ICON,
  color: BUSINESS_APP_TEST_CONSTANTS.COLOR,
  processKeys: [BUSINESS_APP_TEST_CONSTANTS.PROCESS_KEY],
  createdBy: BUSINESS_APP_TEST_CONSTANTS.USER_ID,
  createdTimeUtc: BUSINESS_APP_TEST_CONSTANTS.CREATED_TIME,
  modifiedBy: BUSINESS_APP_TEST_CONSTANTS.USER_ID,
  modifiedTimeUtc: BUSINESS_APP_TEST_CONSTANTS.MODIFIED_TIME,
  ...overrides,
});

/**
 * Builds the list-endpoint payload: items live under `businessApps`, with `nextPage`
 * carrying the continuation token.
 */
export const createBusinessAppListResponse = (
  overrides?: Partial<{
    businessApps: BusinessAppApiResponse[];
    nextPage: string | null;
    hasMoreResults: boolean;
  }>
) => ({
  businessApps: [
    createBasicBusinessApp(),
    createBasicBusinessApp({
      id: BUSINESS_APP_TEST_CONSTANTS.BUSINESS_APP_ID_ALT,
      name: BUSINESS_APP_TEST_CONSTANTS.NAME_ALT,
      icon: null,
      color: null,
    }),
  ],
  nextPage: null,
  hasMoreResults: false,
  ...overrides,
});
