import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getServices, getTestConfig, setupUnifiedTests, InitMode } from '../../config/unified-setup';
import { Roles } from '../../../../src/services/platform';
import { PlatformRoleType, PlatformPrincipalType } from '../../../../src/models/platform';
import type { PlatformRoleAction } from '../../../../src/models/platform';
import { generateRandomString } from '../../utils/helpers';

const modes: InitMode[] = ['v1'];

describe.each(modes)('Platform Roles - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  let roles!: Roles;
  let organizationId!: string;
  let tenantId!: string;
  let mutableUserId!: string;
  /** An action to grant on probe roles, picked from the live catalog. */
  let probeAction!: PlatformRoleAction;
  /** IDs of custom roles created by this suite; deleted in afterAll. */
  const createdRoleIds: string[] = [];

  beforeAll(async () => {
    const service = getServices().platformRoles;
    if (!service) {
      throw new Error('Platform Roles service is not registered for this init mode');
    }
    roles = service;

    const { organizationId: configuredOrganizationId, tenantId: configuredTenantId, identityMutableTestUserId } = getTestConfig();
    if (!configuredOrganizationId || !identityMutableTestUserId) {
      throw new Error('UIPATH_ORGANIZATION_ID and IDENTITY_MUTABLE_TEST_USER_ID must be configured for the Roles suite.');
    }
    if (!configuredTenantId) {
      throw new Error('UIPATH_TENANT_ID must be configured for the effective-access test.');
    }
    organizationId = configuredOrganizationId;
    tenantId = configuredTenantId;
    mutableUserId = identityMutableTestUserId;

    const actions = await roles.getActions({ serviceName: 'AuthZ' });
    if (actions.length === 0) {
      throw new Error('The AuthZ action catalog is empty; probe roles cannot be created.');
    }
    probeAction = actions.find((a) => a.resourceAction === 'Read') ?? actions[0];
  });

  afterAll(async () => {
    if (!roles) return;
    for (const id of createdRoleIds) {
      await roles.deleteById(id);
    }
  });

  describe('getAll', () => {
    it('should list roles including built-ins with their permissions', async () => {
      const result = await roles.getAll({ pageSize: 20 });

      expect(result.items.length).toBeGreaterThan(0);
      expect(result.totalCount).toBeGreaterThan(0);
      const builtIn = result.items.find((r) => r.type === PlatformRoleType.BuiltIn)!;
      expect(builtIn).toBeDefined();
      expect(Array.isArray(builtIn.actionDetails)).toBe(true);
    });

    it('should apply the SDK transforms against the live response', async () => {
      const result = await roles.getAll({ pageSize: 5 });
      const role = result.items[0];

      // Renamed fields carry values
      expect(typeof role.createdTime).toBe('string');
      // Wire names are gone
      expect((role as any).createdOn).toBeUndefined();
      // Internal action fields are dropped
      if (role.actionDetails.length > 0) {
        expect((role.actionDetails[0] as any).originalResourceAction).toBeUndefined();
      }
      // Enum values arrive as-is from the wire
      expect(Object.values(PlatformRoleType)).toContain(role.type);
      // Bound method attached
      expect(typeof role.delete).toBe('function');
    });

    it('should filter by roleType and contains', async () => {
      const result = await roles.getAll({ roleType: PlatformRoleType.BuiltIn, contains: 'Admin', pageSize: 50 });

      expect(result.items.length).toBeGreaterThan(0);
      for (const role of result.items) {
        expect(role.type).toBe(PlatformRoleType.BuiltIn);
        expect(role.name.toLowerCase()).toContain('admin');
      }
    });
  });

  describe('upsert, getById, deleteById', () => {
    it('should round-trip a custom role lifecycle', async () => {
      const roleName = `sdk-it-${generateRandomString(8)}`;

      // Create — actions are referenced by fully qualified name
      const created = await roles.upsert({
        roleName,
        roleScopeType: 'ORGANIZATION',
        organizationId,
        roleDescription: 'SDK integration probe role',
        actionsGrantedByRole: [probeAction.name],
      });
      createdRoleIds.push(created.id);
      expect(created.name).toBe(roleName);
      expect(created.type).toBe(PlatformRoleType.Custom);

      // Read back
      const fetched = await roles.getById(created.id);
      expect(fetched.id).toBe(created.id);
      expect(fetched.actionDetails.map((a) => a.name)).toContain(probeAction.name);

      // Delete via bound method
      await fetched.delete();
      createdRoleIds.splice(createdRoleIds.indexOf(created.id), 1);
    });
  });

  describe('assignments', () => {
    it('should grant and revoke a role assignment for a user', async () => {
      const created = await roles.upsert({
        roleName: `sdk-it-${generateRandomString(8)}`,
        roleScopeType: 'ORGANIZATION',
        organizationId,
        roleDescription: 'SDK integration probe role',
        actionsGrantedByRole: [probeAction.name],
      });
      createdRoleIds.push(created.id);

      // Grant
      await roles.updateAssignments({
        toAdd: [{
          roleId: created.id,
          securityPrincipalId: mutableUserId,
          securityPrincipalType: PlatformPrincipalType.User,
          scope: '/',
        }],
      });

      // The assignment is visible, grouped by principal
      const assignments = await roles.getAssignments('/', { securityPrincipalId: mutableUserId });
      const principal = assignments.items.find((p) => p.securityPrincipalId === mutableUserId);
      if (!principal) {
        throw new Error('Granted assignment did not appear for the principal');
      }
      const assignment = principal.roleAssignments.find((a) => a.roleId === created.id);
      if (!assignment) {
        throw new Error('Granted assignment did not appear in the principal role assignments');
      }
      expect(assignment.roleName).toBe(created.name);
      expect((assignment as any).createdOn).toBeUndefined();
      expect(typeof assignment.createdTime).toBe('string');

      // Revoke
      await roles.updateAssignments({ toDelete: [assignment.id] });
      const after = await roles.getAssignments('/', { securityPrincipalId: mutableUserId });
      const principalAfter = after.items.find((p) => p.securityPrincipalId === mutableUserId);
      const stillThere = principalAfter?.roleAssignments.some((a) => a.id === assignment.id) ?? false;
      expect(stillThere).toBe(false);
    });
  });

  describe('exportAssignments', () => {
    it('should export the assignments as CSV', async () => {
      const csv = await roles.exportAssignments();

      expect(typeof csv).toBe('string');
      const [header] = csv.split('\n');
      expect(header).toContain('RoleName');
      expect(header).toContain('SecurityPrincipal');
    });
  });

  describe('getEffectiveAccess', () => {
    it('should compute effective access for a user in the tenant', async () => {
      const access = await roles.getEffectiveAccess({ tenantId, userId: mutableUserId });

      // The reshaped envelope is always present, even when the principal holds nothing
      expect(Array.isArray(access.roles)).toBe(true);
      expect(typeof access.totalCount).toBe('number');
      expect(Array.isArray(access.grantedServices)).toBe(true);
      expect(Array.isArray(access.grantedRoles)).toBe(true);
      // Wire envelope names are gone
      expect((access as any).roleAssignments).toBeUndefined();
      expect((access as any).grantedServicesMetadata).toBeUndefined();
    });
  });

  describe('getActions', () => {
    it('should list the action catalog filtered by service', async () => {
      const actions = await roles.getActions({ serviceName: 'AuthZ' });

      expect(actions.length).toBeGreaterThan(0);
      for (const action of actions) {
        expect(action.namespace).toBe('AUTHZ');
        expect((action as any).originalResourceAction).toBeUndefined();
      }
    });
  });
});
