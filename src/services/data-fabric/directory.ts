import { ValidationError } from '../../core/errors';
import { track } from '../../core/telemetry';
import { DataFabricDirectoryServiceModel } from '../../models/data-fabric/directory.models';
import {
  DataFabricDirectoryAssignOptions,
  DataFabricDirectoryAssignmentResult,
  DataFabricDirectoryEntityType,
  DataFabricDirectoryEntityTypeInput,
  DataFabricDirectoryEntry,
  DataFabricDirectoryGetAllOptions,
  DataFabricDirectoryListOptions,
  DataFabricDirectoryListResponse,
} from '../../models/data-fabric/directory.types';
import {
  DataFabricDirectoryAssignPayload,
  DataFabricDirectoryRevokePayload,
  RawDataFabricDirectoryListResponse,
} from '../../models/data-fabric/directory.internal-types';
import { DATA_FABRIC_ENDPOINTS } from '../../utils/constants/endpoints/data-fabric';
import { createParams } from '../../utils/http/params';
import { BaseService } from '../base';

const DEFAULT_DIRECTORY_PAGE_SIZE = 100;
const MAX_DIRECTORY_PAGE_SIZE = 100;

function extractDirectoryItems(data: RawDataFabricDirectoryListResponse | DataFabricDirectoryEntry[]): DataFabricDirectoryEntry[] {
  if (Array.isArray(data)) {
    return data;
  }
  return data.results ?? data.value ?? data.data ?? [];
}

function extractTotalCount(data: RawDataFabricDirectoryListResponse | DataFabricDirectoryEntry[]): number | undefined {
  if (Array.isArray(data)) {
    return undefined;
  }
  return data.totalCount;
}

function normalizeDirectoryEntry(entry: DataFabricDirectoryEntry): DataFabricDirectoryEntry {
  return {
    ...entry,
    roles: entry.roles ?? [],
  };
}

function normalizePrincipalIds(principalIds: string | string[]): string[] {
  const ids = Array.isArray(principalIds) ? principalIds : [principalIds];
  return [...new Set(ids.map(id => id.trim()).filter(Boolean))];
}

function normalizeRoleIds(roleIds: string[]): string[] {
  return [...new Set(roleIds.map(id => id.trim()).filter(Boolean))];
}

function normalizePrincipalType(type: DataFabricDirectoryEntityTypeInput): DataFabricDirectoryEntityType {
  if (typeof type === 'number') {
    if (
      type === DataFabricDirectoryEntityType.User ||
      type === DataFabricDirectoryEntityType.Group ||
      type === DataFabricDirectoryEntityType.Application
    ) {
      return type;
    }
    throw new ValidationError({
      message: 'Invalid Data Fabric principal type.',
    });
  }

  switch (type.toLowerCase()) {
    case 'user':
    case 'robot':
    case 'directoryrobot':
    case 'directoryrobotuser':
      return DataFabricDirectoryEntityType.User;
    case 'group':
    case 'directorygroup':
      return DataFabricDirectoryEntityType.Group;
    case 'application':
    case 'externalapplication':
    case 'directoryexternalapplication':
      return DataFabricDirectoryEntityType.Application;
    default:
      throw new ValidationError({
        message: 'Invalid Data Fabric principal type.',
      });
  }
}

function roleIdsFromEntry(entry: DataFabricDirectoryEntry | undefined): string[] {
  if (!entry) {
    return [];
  }
  return normalizeRoleIds(entry.roles.map(role => role.id));
}

function clampDirectoryPageSize(pageSize?: number): number {
  return Math.max(1, Math.min(pageSize ?? DEFAULT_DIRECTORY_PAGE_SIZE, MAX_DIRECTORY_PAGE_SIZE));
}

/**
 * @internal
 */
export class DataFabricDirectoryService extends BaseService implements DataFabricDirectoryServiceModel {
  private async fetchAllEntries(options: DataFabricDirectoryGetAllOptions = {}): Promise<DataFabricDirectoryEntry[]> {
    const top = clampDirectoryPageSize(options.pageSize);
    const entries: DataFabricDirectoryEntry[] = [];
    let skip = 0;

    while (true) {
      const page = await this.list(skip === 0 ? { top } : { top, skip });
      entries.push(...page.results);

      if (page.results.length < top || (page.totalCount !== undefined && entries.length >= page.totalCount)) {
        return entries;
      }

      skip += top;
    }
  }

  /**
   * Lists one page of Data Fabric directory principals and their current roles.
   *
   * Returns directory entries with external IDs, principal metadata, and
   * assigned Data Fabric roles.
   *
   * @param options - Optional offset paging options
   * @returns Promise resolving to {@link DataFabricDirectoryListResponse}
   *
   * @example
   * ```typescript
   * import { DataFabricDirectoryService } from '@uipath/uipath-typescript/entities';
   *
   * const directory = new DataFabricDirectoryService(sdk);
   * const page = await directory.list({ skip: 0, top: 50 });
   * const firstPrincipal = page.results[0];
   * ```
   *
   * @internal
   */
  @track('DataFabricDirectory.List')
  async list(options: DataFabricDirectoryListOptions = {}): Promise<DataFabricDirectoryListResponse> {
    const params = createParams({
      skip: options.skip,
      top: options.top ?? DEFAULT_DIRECTORY_PAGE_SIZE,
    });
    const response = await this.get<RawDataFabricDirectoryListResponse | DataFabricDirectoryEntry[]>(
      DATA_FABRIC_ENDPOINTS.DIRECTORY.GET_ALL,
      { params }
    );
    const results = extractDirectoryItems(response.data).map(normalizeDirectoryEntry);
    return {
      totalCount: extractTotalCount(response.data),
      results,
    };
  }

  /**
   * Lists all Data Fabric directory principals and their current roles.
   *
   * Follows the Data Fabric directory top/skip pagination and returns
   * normalized entries. Entries without assigned roles include an empty
   * `roles` array.
   *
   * @param options - Optional page-size options
   * @returns Promise resolving to an array of {@link DataFabricDirectoryEntry}
   *
   * @example
   * ```typescript
   * import { DataFabricDirectoryService } from '@uipath/uipath-typescript/entities';
   *
   * const directory = new DataFabricDirectoryService(sdk);
   * const principals = await directory.getAll({ pageSize: 100 });
   * ```
   *
   * @internal
   */
  @track('DataFabricDirectory.GetAll')
  async getAll(options: DataFabricDirectoryGetAllOptions = {}): Promise<DataFabricDirectoryEntry[]> {
    return this.fetchAllEntries(options);
  }

  /**
   * Assigns Data Fabric roles to one or more principals.
   *
   * The Data Fabric API replaces the role set for each principal, so this
   * method preserves existing roles by default and posts the union of current
   * and requested role IDs.
   *
   * Role IDs can be discovered with `DataFabricRoleService.getAll()`. Set
   * `preserveExisting: false` only when intentionally replacing a principal's
   * Data Fabric role set.
   *
   * @param principalIds - Principal external ID or IDs
   * @param principalType - Principal type
   * @param roleIds - Data Fabric role IDs to assign
   * @param options - Optional assignment behavior
   * @returns Promise resolving to an array of {@link DataFabricDirectoryAssignmentResult}
   *
   * @example
   * ```typescript
   * import { DataFabricDirectoryService, DataFabricRoleService } from '@uipath/uipath-typescript/entities';
   *
   * const roles = new DataFabricRoleService(sdk);
   * const directory = new DataFabricDirectoryService(sdk);
   *
   * const dataWriter = (await roles.getAll()).find(role => role.name === 'DataWriter');
   * if (!dataWriter) {
   *   throw new Error('DataWriter role not found');
   * }
   *
   * await directory.assignRoles('<identity-group-id>', 'Group', [dataWriter.id]);
   * ```
   *
   * @example
   * ```typescript
   * await directory.assignRoles('<identity-user-id>', 'User', ['<role-id>'], {
   *   preserveExisting: false,
   * });
   * ```
   *
   * @internal
   */
  @track('DataFabricDirectory.AssignRoles')
  async assignRoles(
    principalIds: string | string[],
    principalType: DataFabricDirectoryEntityTypeInput,
    roleIds: string[],
    options: DataFabricDirectoryAssignOptions = {}
  ): Promise<DataFabricDirectoryAssignmentResult[]> {
    const normalizedPrincipalIds = normalizePrincipalIds(principalIds);
    const normalizedRoleIds = normalizeRoleIds(roleIds);
    if (normalizedPrincipalIds.length === 0) {
      throw new ValidationError({ message: 'At least one principal ID is required.' });
    }
    if (normalizedRoleIds.length === 0) {
      throw new ValidationError({ message: 'At least one Data Fabric role ID is required.' });
    }

    const type = normalizePrincipalType(principalType);
    const preserveExisting = options.preserveExisting ?? true;
    const existingById = new Map<string, DataFabricDirectoryEntry>();
    if (preserveExisting) {
      for (const entry of await this.fetchAllEntries()) {
        existingById.set(entry.externalId.toLowerCase(), entry);
      }
    }

    return Promise.all(normalizedPrincipalIds.map(async (principalId) => {
      const existing = existingById.get(principalId.toLowerCase());
      const mergedRoleIds = preserveExisting
        ? normalizeRoleIds([...roleIdsFromEntry(existing), ...normalizedRoleIds])
        : normalizedRoleIds;
      const payload: DataFabricDirectoryAssignPayload = {
        directoryEntities: [
          {
            externalId: principalId,
            type,
            resolved: true,
          },
        ],
        roles: mergedRoleIds,
        isUIEnabled: options.uiEnabled ?? true,
      };
      await this.post(DATA_FABRIC_ENDPOINTS.DIRECTORY.ASSIGN_ROLES, payload);
      return {
        principalId,
        roleIds: mergedRoleIds,
      };
    }));
  }

  /**
   * Revokes all direct Data Fabric roles from one or more principals.
   *
   * The Data Fabric API removes all role assignments for each supplied external
   * ID. Use this when a principal should no longer have direct Data Fabric
   * access. Inherited access through groups is not changed.
   *
   * @param principalIds - Principal external ID or IDs
   * @returns Promise resolving when the roles are revoked
   *
   * @example
   * ```typescript
   * import { DataFabricDirectoryService } from '@uipath/uipath-typescript/entities';
   *
   * const directory = new DataFabricDirectoryService(sdk);
   *
   * await directory.revokeRoles('<identity-user-id>');
   * ```
   *
   * @example
   * ```typescript
   * await directory.revokeRoles([
   *   '<identity-user-id>',
   *   '<identity-group-id>',
   * ]);
   * ```
   *
   * @internal
   */
  @track('DataFabricDirectory.RevokeRoles')
  async revokeRoles(principalIds: string | string[]): Promise<void> {
    const normalizedPrincipalIds = normalizePrincipalIds(principalIds);
    if (normalizedPrincipalIds.length === 0) {
      throw new ValidationError({ message: 'At least one principal ID is required.' });
    }

    const payload: DataFabricDirectoryRevokePayload = {
      externalIds: normalizedPrincipalIds,
    };
    await this.post(DATA_FABRIC_ENDPOINTS.DIRECTORY.REVOKE_ROLES, payload);
  }
}
