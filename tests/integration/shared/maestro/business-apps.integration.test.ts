import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getServices, setupUnifiedTests, InitMode } from '../../config/unified-setup';
import { BusinessApps } from '../../../../src/services/maestro/business-apps';
import type { BusinessAppGetResponse } from '../../../../src/models/maestro';
import { generateRandomString } from '../../utils/helpers';
import { registerResource } from '../../utils/cleanup';

const modes: InitMode[] = ['v1'];

/**
 * PIMS stores process keys verbatim — it does not resolve them against Orchestrator — so a
 * generated GUID is a valid key here and keeps the suite from depending on which processes
 * happen to be published in the test tenant.
 */
const newProcessKey = () => crypto.randomUUID();

/** Names are unique per tenant, so every created app gets a fresh one. */
const newAppName = () => `sdk-it-${generateRandomString(10)}`;

// skip: mutations on v1/business-apps are not yet supported for the app-token credential this
// suite authenticates with — PIMS accepts the token but the tenant-scoped ORCHESTRATOR.APPS.*
// permission check (TenantPermissionHandler) rejects create/update/delete with a 403. Re-enable
// once the credential this suite uses can hold that permission (see PR #671 discussion).
describe.skip.each(modes)('Business Apps - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  let businessApps!: BusinessApps;
  const createdAppIds: string[] = [];

  const trackApp = (app: BusinessAppGetResponse) => {
    createdAppIds.push(app.id);
    registerResource('businessApps', { id: app.id });
    return app;
  };

  beforeAll(async () => {
    const service = getServices().businessApps;
    if (!service) {
      throw new Error('BusinessApps service is not registered for this init mode');
    }
    businessApps = service;
  });

  afterAll(async () => {
    if (!businessApps) return;
    // Ids of apps already removed by the delete tests are spliced out as they go, so
    // everything left here still exists.
    for (const id of createdAppIds) {
      await businessApps.deleteById(id);
    }
    createdAppIds.length = 0;
  });

  describe('create', () => {
    it('should create an app with only the required fields', async () => {
      const name = newAppName();
      const processKey = newProcessKey();

      const app = trackApp(await businessApps.create(name, [processKey]));

      expect(app.id).toBeTruthy();
      expect(app.name).toBe(name);
      expect(app.processKeys).toEqual([processKey]);
      // Every optional field, description included, is stored as null when not supplied
      expect(app.description).toBeNull();
      expect(app.icon).toBeNull();
      expect(app.color).toBeNull();
    });

    it('should create an app with an icon and color', async () => {
      const app = trackApp(
        await businessApps.create(newAppName(), [newProcessKey()], {
          description: 'Has display metadata',
          icon: 'claims-icon',
          color: '#1F6FEB',
        })
      );

      expect(app.description).toBe('Has display metadata');
      expect(app.icon).toBe('claims-icon');
      expect(app.color).toBe('#1F6FEB');
    });

    it('should reject a duplicate name within the tenant', async () => {
      const name = newAppName();
      trackApp(await businessApps.create(name, [newProcessKey()], { description: 'The original' }));

      // Uniqueness is case-insensitive, so this differs only in case and must still conflict
      await expect(
        businessApps.create(name.toUpperCase(), [newProcessKey()], { description: 'The duplicate' })
      ).rejects.toThrow();
    });
  });

  describe('getById', () => {
    let existing!: BusinessAppGetResponse;

    beforeAll(async () => {
      existing = trackApp(
        await businessApps.create(newAppName(), [newProcessKey()], {
          description: 'Read back by getById',
          icon: 'read-icon',
          color: '#ABCDEF',
        })
      );
    });

    it('should retrieve the app by id', async () => {
      const app = await businessApps.getById(existing.id);

      expect(app.id).toBe(existing.id);
      expect(app.name).toBe(existing.name);
      expect(app.processKeys).toEqual(existing.processKeys);
    });

    it('should return SDK-named audit fields and none of the wire names', async () => {
      const app = await businessApps.getById(existing.id);

      expect(app.createdTime).toBeTruthy();
      expect(app.lastModifiedTime).toBeTruthy();
      expect(app.createdBy).toBeTruthy();
      expect(app.lastModifiedBy).toBeTruthy();
      expect((app as unknown as Record<string, unknown>).createdTimeUtc).toBeUndefined();
      expect((app as unknown as Record<string, unknown>).modifiedTimeUtc).toBeUndefined();
      expect((app as unknown as Record<string, unknown>).modifiedBy).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should list the tenant apps including one just created', async () => {
      const created = trackApp(
        await businessApps.create(newAppName(), [newProcessKey()], { description: 'Listed by getAll' })
      );

      // getAll() returns a single page, and apps are ordered by name, so a tenant with more
      // apps than one page holds can push a newly created one past the first page.
      let page = await businessApps.getAll({ pageSize: 100 });
      let found = page.items.some(app => app.id === created.id);
      while (!found && page.hasNextPage && page.nextCursor) {
        page = await businessApps.getAll({ cursor: page.nextCursor });
        found = page.items.some(app => app.id === created.id);
      }

      expect(Array.isArray(page.items)).toBe(true);
      expect(found).toBe(true);
    });

    it('should honour pageSize and expose a cursor for the following page', async () => {
      // Two apps guarantee more than one page at pageSize 1
      trackApp(await businessApps.create(newAppName(), [newProcessKey()], { description: 'Paging fixture one' }));
      trackApp(await businessApps.create(newAppName(), [newProcessKey()], { description: 'Paging fixture two' }));

      const firstPage = await businessApps.getAll({ pageSize: 1 });

      expect(firstPage.items).toHaveLength(1);
      expect(firstPage.hasNextPage).toBe(true);
      expect(firstPage.nextCursor).toBeDefined();

      const secondPage = await businessApps.getAll({ cursor: firstPage.nextCursor });

      expect(secondPage.items.length).toBeGreaterThan(0);
      expect(secondPage.items[0].id).not.toBe(firstPage.items[0].id);
    });
  });

  describe('updateById', () => {
    it('should replace the editable fields', async () => {
      const app = trackApp(
        await businessApps.create(newAppName(), [newProcessKey()], { description: 'Before the update' })
      );
      const newName = newAppName();
      const replacementKeys = [newProcessKey(), newProcessKey()];

      const updated = await businessApps.updateById(app.id, newName, replacementKeys, {
        description: 'After the update',
        icon: 'updated-icon',
        color: '#123456',
      });

      expect(updated.id).toBe(app.id);
      expect(updated.name).toBe(newName);
      expect(updated.description).toBe('After the update');
      expect(updated.processKeys).toEqual(replacementKeys);
      expect(updated.icon).toBe('updated-icon');
    });

    it('should clear an omitted optional field, since the update is a full replace', async () => {
      const app = trackApp(
        await businessApps.create(newAppName(), [newProcessKey()], {
          description: 'Starts with an icon',
          icon: 'will-be-cleared',
          color: '#FFFFFF',
        })
      );

      const updated = await businessApps.updateById(app.id, app.name, app.processKeys);

      expect(updated.icon).toBeNull();
      expect(updated.color).toBeNull();
      // description is optional now, so an omitted one is cleared alongside icon and color
      expect(updated.description).toBeNull();
    });
  });

  describe('bound entity methods', () => {
    it('should update the app through the method attached to it', async () => {
      const app = trackApp(
        await businessApps.create(newAppName(), [newProcessKey()], { description: 'Updated via bound method' })
      );

      const updated = await app.update(app.name, app.processKeys, {
        description: 'Changed by app.update()',
      });

      expect(updated.id).toBe(app.id);
      expect(updated.description).toBe('Changed by app.update()');
    });

    it('should delete the app through the method attached to it', async () => {
      const app = trackApp(
        await businessApps.create(newAppName(), [newProcessKey()], { description: 'Deleted via bound method' })
      );

      await app.delete();
      createdAppIds.splice(createdAppIds.indexOf(app.id), 1);

      await expect(businessApps.getById(app.id)).rejects.toThrow();
    });
  });

  describe('deleteById', () => {
    it('should delete the app and make it unreadable afterwards', async () => {
      const app = trackApp(
        await businessApps.create(newAppName(), [newProcessKey()], { description: 'Deleted by deleteById' })
      );

      await businessApps.deleteById(app.id);
      createdAppIds.splice(createdAppIds.indexOf(app.id), 1);

      await expect(businessApps.getById(app.id)).rejects.toThrow();
    });
  });
});
