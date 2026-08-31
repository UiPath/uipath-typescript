import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getServices, getTestConfig, setupUnifiedTests, InitMode } from '../../config/unified-setup';
import { generateRandomString } from '../../utils/helpers';

const modes: InitMode[] = ['v0', 'v1'];

describe.each(modes)('Data Fabric ChoiceSets - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);
  const testConfig = getTestConfig();
  let testChoiceSetId: string | null = testConfig.dataFabricTestChoiceSetId || null;
  const createdChoiceSetIds: string[] = [];

  // Folder-scoped CS created in the Folder-scoped operations describe block.
  // Tracked here so the file-level afterAll can clean it up if a test failed
  // before its own delete step ran.
  let folderScopedChoiceSetId: string | null = null;
  let folderScopedFolderKey: string | null = null;

  afterAll(async () => {
    const { choiceSets } = getServices();

    if (folderScopedChoiceSetId && folderScopedFolderKey) {
      try {
        await choiceSets.deleteById(folderScopedChoiceSetId, { folderKey: folderScopedFolderKey });
      } catch {
        // Ignore cleanup failures — test resources are sandboxed.
      }
    }

    for (const id of createdChoiceSetIds) {
      try {
        await choiceSets.deleteById(id);
      } catch {
        // Ignore cleanup failures — test resources are sandboxed.
      }
    }
  });

  describe('getAll', () => {
    it('should retrieve all choice sets', async () => {
      const { choiceSets } = getServices();
      const result = await choiceSets.getAll();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      if (result.length === 0) {
        throw new Error('No choice sets available for getById testing');
      }

      const choiceSet = result[0];
      
      expect(choiceSet.name).toBeDefined();
      expect(choiceSet.displayName).toBeDefined();
      expect(typeof choiceSet.name).toBe('string');
      expect(typeof choiceSet.displayName).toBe('string');
    });
  });

  describe('getById', () => {
    it('should retrieve choice set values by choice set ID', async () => {
      const { choiceSets } = getServices();

      if (!testChoiceSetId) {
        throw new Error('No choice set ID available for getById testing');
      }

      const result = await choiceSets.getById(testChoiceSetId);

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);

      if (result.items.length > 0) {
        const value = result.items[0];
        expect(value.id).toBeDefined();
        expect(value.name).toBeDefined();
        expect(value.displayName).toBeDefined();
        expect(typeof value.id).toBe('string');
      }
    });

    it('should retrieve choice set values with pagination options', async () => {
      const { choiceSets } = getServices();

      if (!testChoiceSetId) {
        throw new Error('No choice set ID available for paginated getById testing');
      }

      const result = await choiceSets.getById(testChoiceSetId, {
        pageSize: 5,
      });

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBeLessThanOrEqual(5);
    });
  });

  // Skipped: local run shows tenant-scoped `updateById` / `deleteById` return 403 on
  // this env (test PAT can create but not update/delete tenant choicesets); un-skip
  // once the tenant permission model or PAT is aligned.
  describe.skip('create / updateById / deleteById', () => {
    it('should create a choice set and return its UUID', async () => {
      const { choiceSets } = getServices();
      const name = `sdk_cs_${generateRandomString(8)}`;
      const id = await choiceSets.create(name, {
        displayName: `SDK Test ${name}`,
        description: 'Created by integration test',
      });

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);

      createdChoiceSetIds.push(id);

      // Confirm it shows up in getAll
      const all = await choiceSets.getAll();
      const found = all.find((cs) => cs.id === id);
      expect(found).toBeDefined();
      expect(found?.name).toBe(name);
      expect(found?.displayName).toBe(`SDK Test ${name}`);
    });

    it('should update a choice set\'s displayName and description', async () => {
      const { choiceSets } = getServices();
      const name = `sdk_cs_${generateRandomString(8)}`;
      const id = await choiceSets.create(name);
      createdChoiceSetIds.push(id);

      await choiceSets.updateById(id, {
        displayName: 'Renamed via SDK',
        description: 'Updated description',
      });

      const all = await choiceSets.getAll();
      const updated = all.find((cs) => cs.id === id);
      expect(updated?.displayName).toBe('Renamed via SDK');
      expect(updated?.description).toBe('Updated description');
    });

    it('should delete a choice set and remove it from getAll', async () => {
      const { choiceSets } = getServices();
      const name = `sdk_cs_${generateRandomString(8)}`;
      const id = await choiceSets.create(name);
      createdChoiceSetIds.push(id);

      await choiceSets.deleteById(id);
      // Successful delete — remove from cleanup registry so afterAll doesn't retry.
      createdChoiceSetIds.splice(createdChoiceSetIds.indexOf(id), 1);

      const all = await choiceSets.getAll();
      const deleted = all.find((cs) => cs.id === id);
      expect(deleted).toBeUndefined();
    });
  });

  // Choice value-CRUD (insertValueById / updateValueById / deleteValuesById) is not
  // exercised here: the endpoints (`POST /api/EntityService/{name}/choiceset/insert |
  // /{recordId}/update | /entity/{id}/choiceset/delete`) accept only the first-party
  // `DataServiceApiUserAccess` scope, so PAT + `DataFabric.*` scopes cannot reach them.
  // Restore tests once the DF team wires `DataFabric.Data.Write` onto those endpoints.

  // Skipped: local run shows folder-scoped `create` returns 403 "Missing permissions:
  // EntitySchema.Create" — the test PAT lacks the folder-level schema-create right on
  // the target folder. Un-skip once that role is granted.
  describe.skip('Folder-scoped operations', () => {
    beforeAll(() => {
      const config = getTestConfig();
      if (!config.folderKey) {
        throw new Error('INTEGRATION_TEST_FOLDER_KEY is required for folder-scoped choice-set tests');
      }
      folderScopedFolderKey = config.folderKey;
    });

    it('should return only folder-scoped choice sets when folderKey is provided', async () => {
      const { choiceSets } = getServices();
      const folderKey = folderScopedFolderKey!;

      const [tenantSets, folderSets] = await Promise.all([
        choiceSets.getAll(),
        choiceSets.getAll({ folderKey }),
      ]);

      expect(Array.isArray(folderSets)).toBe(true);

      // Every folder-scoped choice set carries the requested folder key
      for (const cs of folderSets) {
        expect(cs.folderId).toBe(folderKey);
      }

      // Tenant scope and folder scope are disjoint
      const folderIds = new Set(folderSets.map((cs) => cs.id));
      for (const tenantSet of tenantSets) {
        expect(folderIds.has(tenantSet.id)).toBe(false);
      }
    });

    it('should create a folder-scoped choice set, list its values, and delete it', async () => {
      const { choiceSets } = getServices();
      const folderKey = folderScopedFolderKey!;
      const name = `sdk_cs_fld_${generateRandomString(8)}`;

      folderScopedChoiceSetId = await choiceSets.create(name, {
        displayName: `SDK Folder ${name}`,
        folderKey,
      });
      expect(typeof folderScopedChoiceSetId).toBe('string');

      // The new choice set should appear in the folder-scoped listing
      const folderSets = await choiceSets.getAll({ folderKey });
      const found = folderSets.find((cs) => cs.id === folderScopedChoiceSetId);
      expect(found).toBeDefined();
      expect(found?.folderId).toBe(folderKey);

      // ...and NOT in the tenant listing
      const tenantSets = await choiceSets.getAll();
      expect(tenantSets.find((cs) => cs.id === folderScopedChoiceSetId)).toBeUndefined();

      // getById on the new (empty) choice set should succeed with folderKey
      const values = await choiceSets.getById(folderScopedChoiceSetId, { folderKey });
      expect(Array.isArray(values.items)).toBe(true);
    });

    it('should delete a folder-scoped choice set with folderKey', async () => {
      const { choiceSets } = getServices();
      const folderKey = folderScopedFolderKey!;

      if (!folderScopedChoiceSetId) {
        throw new Error('Folder-scoped choice set was not created earlier in the suite');
      }

      await choiceSets.deleteById(folderScopedChoiceSetId, { folderKey });

      const folderSets = await choiceSets.getAll({ folderKey });
      expect(folderSets.find((cs) => cs.id === folderScopedChoiceSetId)).toBeUndefined();

      // Clear so the top-level afterAll doesn't try to delete it again
      folderScopedChoiceSetId = null;
    });
  });

  // Folder-scoped Choice value-CRUD is likewise absent — same first-party-only scope
  // restriction as the tenant value-CRUD block. Restore when the endpoints accept a
  // third-party `DataFabric.*` scope.
});
