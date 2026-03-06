/**
 * Machine service mock utilities - Machine-specific mocks only
 * Uses generic utilities from core.ts for base functionality
 */
import { MachineGetResponse, MachineHostingType, MachineScope, MachineType } from '../../../src/models/orchestrator/machines.types';
import { createMockBaseResponse, createMockCollection } from './core';
import { MACHINE_TEST_CONSTANTS } from '../constants/machines';

/**
 * Creates a mock machine with RAW API format (before transformation)
 * Uses PascalCase field names as returned by the API
 *
 * @param overrides - Optional overrides for specific fields
 * @returns Raw machine data as it comes from the API (before transformation)
 */
export const createMockRawMachine = (overrides: Partial<any> = {}): any => {
  return createMockBaseResponse({
    Id: MACHINE_TEST_CONSTANTS.MACHINE_ID,
    Key: MACHINE_TEST_CONSTANTS.MACHINE_KEY,
    Name: MACHINE_TEST_CONSTANTS.MACHINE_NAME,
    Description: MACHINE_TEST_CONSTANTS.MACHINE_DESCRIPTION,
    Type: MachineType.Standard,
    Scope: MachineScope.Tenant,
    NonProductionSlots: MACHINE_TEST_CONSTANTS.NON_PRODUCTION_SLOTS,
    UnattendedSlots: MACHINE_TEST_CONSTANTS.UNATTENDED_SLOTS,
    HeadlessSlots: MACHINE_TEST_CONSTANTS.HEADLESS_SLOTS,
    TestAutomationSlots: MACHINE_TEST_CONSTANTS.TEST_AUTOMATION_SLOTS,
    RobotVersions: [],
    ClientSecret: MACHINE_TEST_CONSTANTS.CLIENT_SECRET,
    HostingType: MachineHostingType.Standard,
    MaintenanceMode: MACHINE_TEST_CONSTANTS.MAINTENANCE_MODE,
    IsOnline: MACHINE_TEST_CONSTANTS.IS_ONLINE,
    Status: MACHINE_TEST_CONSTANTS.STATUS,
    StatusId: MACHINE_TEST_CONSTANTS.STATUS_ID,
  }, overrides);
};

/**
 * Creates a basic machine object with TRANSFORMED data (not raw API format)
 *
 * @param overrides - Optional overrides for specific fields
 * @returns Machine with transformed field names (camelCase)
 */
export const createBasicMachine = (overrides: Partial<MachineGetResponse> = {}): MachineGetResponse => {
  return createMockBaseResponse({
    id: MACHINE_TEST_CONSTANTS.MACHINE_ID,
    key: MACHINE_TEST_CONSTANTS.MACHINE_KEY,
    name: MACHINE_TEST_CONSTANTS.MACHINE_NAME,
    description: MACHINE_TEST_CONSTANTS.MACHINE_DESCRIPTION,
    type: MachineType.Standard,
    scope: MachineScope.Tenant,
    nonProductionSlots: MACHINE_TEST_CONSTANTS.NON_PRODUCTION_SLOTS,
    unattendedSlots: MACHINE_TEST_CONSTANTS.UNATTENDED_SLOTS,
    headlessSlots: MACHINE_TEST_CONSTANTS.HEADLESS_SLOTS,
    testAutomationSlots: MACHINE_TEST_CONSTANTS.TEST_AUTOMATION_SLOTS,
    robotVersions: [],
    clientSecret: MACHINE_TEST_CONSTANTS.CLIENT_SECRET,
    hostingType: MachineHostingType.Standard,
    maintenanceMode: MACHINE_TEST_CONSTANTS.MAINTENANCE_MODE,
    isOnline: MACHINE_TEST_CONSTANTS.IS_ONLINE,
    status: MACHINE_TEST_CONSTANTS.STATUS,
    statusId: MACHINE_TEST_CONSTANTS.STATUS_ID,
  }, overrides);
};

/**
 * Creates a mock transformed machine collection response as returned by PaginationHelpers.getAll
 *
 * @param count - Number of machines to include (defaults to 1)
 * @param options - Additional options like totalCount, pagination details
 * @returns Mock transformed machine collection with items array
 */
export const createMockTransformedMachineCollection = (
  count: number = 1,
  options?: {
    totalCount?: number;
    hasNextPage?: boolean;
    nextCursor?: string;
    previousCursor?: string | null;
    currentPage?: number;
    totalPages?: number;
  }
): any => {
  const items = createMockCollection(count, (index) => createBasicMachine({
    id: MACHINE_TEST_CONSTANTS.MACHINE_ID + index,
    name: `${MACHINE_TEST_CONSTANTS.MACHINE_NAME}${index + 1}`,
    key: `${index}-${MACHINE_TEST_CONSTANTS.MACHINE_KEY}`
  }));

  return createMockBaseResponse({
    items,
    totalCount: options?.totalCount || count,
    ...(options?.hasNextPage !== undefined && { hasNextPage: options.hasNextPage }),
    ...(options?.nextCursor && { nextCursor: options.nextCursor }),
    ...(options?.previousCursor !== undefined && { previousCursor: options.previousCursor }),
    ...(options?.currentPage !== undefined && { currentPage: options.currentPage }),
    ...(options?.totalPages !== undefined && { totalPages: options.totalPages })
  });
};
