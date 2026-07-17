import { describe, it, expect } from 'vitest';
import {
  DataFabricDirectoryEntityType,
  DataFabricDirectoryEntityTypeName,
  DataFabricDirectoryService,
  DataFabricRoleService,
  DataFabricRoleType,
  type DataFabricDirectoryAssignOptions,
  type DataFabricDirectoryAssignmentResult,
  type DataFabricDirectoryEntityTypeInput,
  type DataFabricDirectoryEntry,
  type DataFabricDirectoryGetAllOptions,
  type DataFabricDirectoryListOptions,
  type DataFabricDirectoryListResponse,
  type DataFabricDirectoryServiceModel,
  type DataFabricRole,
  type DataFabricRoleGetAllOptions,
  type DataFabricRoleServiceModel,
} from '../../../../src/services/data-fabric';

describe('Data Fabric barrel exports', () => {
  it('should export roles and directory runtime values from the entities subpath barrel', () => {
    expect(DataFabricDirectoryService).toBeTypeOf('function');
    expect(DataFabricRoleService).toBeTypeOf('function');
    expect(DataFabricDirectoryEntityType.Group).toBe(1);
    expect(DataFabricDirectoryEntityTypeName.Group).toBe('Group');
    expect(DataFabricRoleType.System).toBe('System');
  });

  it('should export roles and directory types usable in consumer signatures', () => {
    // Compile-time check: assigning to the exported types verifies they are
    // re-exported through the barrel; a removal breaks typecheck, not runtime.
    const principalType: DataFabricDirectoryEntityTypeInput =
      DataFabricDirectoryEntityTypeName.User;
    const assignOptions: DataFabricDirectoryAssignOptions = { preserveExisting: false };
    const listOptions: DataFabricDirectoryListOptions = { top: 1 };
    const getAllOptions: DataFabricDirectoryGetAllOptions = { pageSize: 1 };
    const roleOptions: DataFabricRoleGetAllOptions = { stats: false };
    const role: DataFabricRole = {
      id: 'role-id',
      name: 'DataWriter',
      type: DataFabricRoleType.UserDefined,
    };
    const entry: DataFabricDirectoryEntry = {
      externalId: 'external-id',
      name: 'Automation Users',
      type: DataFabricDirectoryEntityTypeName.Group,
      roles: [{ id: role.id, name: role.name }],
      isUIEnabled: true,
    };
    const listResponse: DataFabricDirectoryListResponse = {
      totalCount: 1,
      results: [entry],
    };
    const assignmentResult: DataFabricDirectoryAssignmentResult = {
      principalId: entry.externalId,
      roleIds: [role.id],
    };
    const directoryModel: DataFabricDirectoryServiceModel | undefined = undefined;
    const roleModel: DataFabricRoleServiceModel | undefined = undefined;

    expect(principalType).toBe(DataFabricDirectoryEntityTypeName.User);
    expect(assignOptions.preserveExisting).toBe(false);
    expect(listOptions.top).toBe(1);
    expect(getAllOptions.pageSize).toBe(1);
    expect(roleOptions.stats).toBe(false);
    expect(listResponse.results[0]).toBe(entry);
    expect(assignmentResult.roleIds).toEqual([role.id]);
    expect(directoryModel).toBeUndefined();
    expect(roleModel).toBeUndefined();
  });
});
