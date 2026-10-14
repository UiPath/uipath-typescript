import { describe, it, expect, beforeAll } from 'vitest';
import { getServices, describeIntegration, InitMode } from '../../config/unified-setup';
import { isValidationError } from '../../../../src/core/errors';
import { OrchestratorUsers, OrchestratorUserType } from '../../../../src/services/orchestrator/users';
import type { OrchestratorUserGetResponse } from '../../../../src/services/orchestrator/users';

const modes: InitMode[] = ['v1'];

/** Escapes a value for use inside an OData single-quoted string literal. */
const odataLiteral = (value: string) => value.replace(/'/g, "''");

describeIntegration('Orchestrator Users - Integration Tests', 'both', modes, () => {
  let orchestratorUsers!: OrchestratorUsers;
  /** Full tenant listing, fetched once and shared across the read-only assertions. */
  let allUsers!: OrchestratorUserGetResponse[];
  let allUsersTotalCount!: number | undefined;

  beforeAll(async () => {
    const service = getServices().orchestratorUsers;
    if (!service) {
      throw new Error('Orchestrator Users service is not registered for this init mode');
    }
    orchestratorUsers = service;

    const result = await orchestratorUsers.getAll();
    if (result.items.length === 0) {
      throw new Error('The tenant has no Orchestrator users to run the suite against');
    }
    allUsers = result.items;
    allUsersTotalCount = result.totalCount;
  });

  describe('getAll', () => {
    it('should list users with a total count and apply the SDK transforms against the live response', () => {
      expect(allUsers.length).toBeGreaterThan(0);
      expect(allUsersTotalCount).toBeGreaterThanOrEqual(allUsers.length);

      const user = allUsers[0];

      // camelCase fields carry values
      expect(typeof user.id).toBe('number');
      expect(typeof user.key).toBe('string');
      expect(typeof user.userName).toBe('string');
      expect(typeof user.createdTime).toBe('string');
      expect(typeof user.isActive).toBe('boolean');
      expect(Array.isArray(user.rolesList)).toBe(true);
      expect(Object.values(OrchestratorUserType)).toContain(user.type);

      // Wire names are gone
      expect((user as any).CreationTime).toBeUndefined();
      expect((user as any).UserName).toBeUndefined();
      expect((user as any).Password).toBeUndefined();
      expect((user as any)['@odata.context']).toBeUndefined();

      // Dropped fields are gone
      expect((user as any).password).toBeUndefined();
      expect((user as any).notificationSubscription).toBeUndefined();
      expect((user as any).robotProvision).toBeUndefined();
      expect((user as any).unattendedRobot).toBeUndefined();
      expect((user as any).updatePolicy).toBeUndefined();
      expect((user as any).externalRoles).toBeUndefined();
    });

    it('should filter by user type', async () => {
      const result = await orchestratorUsers.getAll({ filter: "type eq 'DirectoryUser'" });

      expect(result.items.length).toBeGreaterThan(0);
      for (const user of result.items) {
        expect(user.type).toBe(OrchestratorUserType.DirectoryUser);
      }
    });

    it('should look up a single user by sign-in name', async () => {
      const target = allUsers[0];

      const result = await orchestratorUsers.getAll({
        filter: `userName eq '${odataLiteral(target.userName)}'`,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe(target.id);
      expect(result.items[0].userName).toBe(target.userName);
    });

    it('should order by the renamed createdTime field', async () => {
      const result = await orchestratorUsers.getAll({ orderby: 'createdTime desc', pageSize: 10 });

      expect(result.items.length).toBeGreaterThan(1);
      const times = result.items.map((u) => new Date(u.createdTime).getTime());
      for (let i = 1; i < times.length; i++) {
        expect(times[i]).toBeLessThanOrEqual(times[i - 1]);
      }
    });

    it('should honor select', async () => {
      const result = await orchestratorUsers.getAll({ select: 'id,userName', pageSize: 3 });

      expect(result.items.length).toBeGreaterThan(0);
      for (const user of result.items) {
        expect(typeof user.id).toBe('number');
        expect(typeof user.userName).toBe('string');
        expect((user as any).Id).toBeUndefined();
        expect(user).not.toHaveProperty('key');
      }
    });

    it('should expand userRoles into a camelCased array', async () => {
      const result = await orchestratorUsers.getAll({ expand: 'userRoles', pageSize: 5 });

      expect(result.items.length).toBeGreaterThan(0);
      for (const user of result.items) {
        expect(Array.isArray(user.userRoles)).toBe(true);
        for (const role of user.userRoles!) {
          expect(typeof role.roleName).toBe('string');
          expect(role.userId).toBe(user.id);
          expect((role as any).RoleName).toBeUndefined();
        }
      }
    });

    it('should paginate with pageSize, cursor and jumpToPage', async () => {
      const page1 = await orchestratorUsers.getAll({ pageSize: 2 });

      expect(page1.items.length).toBeGreaterThan(0);
      expect(page1.items.length).toBeLessThanOrEqual(2);
      expect(page1.totalCount).toBeGreaterThanOrEqual(page1.items.length);
      expect(page1.hasNextPage).toBe(true);
      expect(page1.nextCursor).toBeDefined();
      expect(page1.supportsPageJump).toBe(true);
      const page1Ids = page1.items.map((u) => u.id);

      const page2 = await orchestratorUsers.getAll({ cursor: page1.nextCursor! });
      expect(page2.items.length).toBeGreaterThan(0);
      for (const user of page2.items) {
        expect(page1Ids).not.toContain(user.id);
      }

      const jumped = await orchestratorUsers.getAll({ jumpToPage: 2, pageSize: 2 });
      expect(jumped.currentPage).toBe(2);
      expect(jumped.items.length).toBeGreaterThan(0);
      expect(jumped.items.length).toBeLessThanOrEqual(2);
      for (const user of jumped.items) {
        expect(page1Ids).not.toContain(user.id);
      }
    });

    it('should reject an unknown filter field with a ValidationError', async () => {
      await expect(
        orchestratorUsers.getAll({ filter: "notARealField eq 'x'" }),
      ).rejects.toSatisfy(isValidationError);
    });
  });
});
