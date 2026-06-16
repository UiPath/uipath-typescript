import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getServices, getTestConfig, setupUnifiedTests, InitMode } from '../../config/unified-setup';
import { generateRandomString } from '../../utils/helpers';

const modes: InitMode[] = ['v0', 'v1'];

describe.each(modes)('Data Fabric ChoiceSets - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);
  const testConfig = getTestConfig();
  let testChoiceSetId: string | null = testConfig.dataFabricTestChoiceSetId || null;
  const createdChoiceSetIds: string[] = [];
  const insertedValueIds: string[] = [];

  // Folder-scoped CS created in the Folder-scoped operations describe block.
  // Tracked here so the file-level afterAll can clean it up if a test failed
  // before its own delete step ran.
  let folderScopedChoiceSetId: string | null = null;
  let folderScopedFolderKey: string | null = null;

  afterAll(async () => {
    const { choiceSets } = getServices();

    if (testChoiceSetId && insertedValueIds.length > 0) {
      try {
        await choiceSets.deleteValuesById(testChoiceSetId, insertedValueIds);
      } catch {
        // Ignore cleanup failures — test resources are sandboxed.
      }
    }

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

  // Skipped: choiceset CRUD methods are tagged @internal and validated live on alpha.
  // Re-enable locally with describe.only when a fresh tenant secret is configured.
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

  // Skipped: choice-value CRUD requires DataFabric.Schema.Write OAuth scope, not available in standard test environment
  describe.skip('Choice value CRUD operations', () => {
    const serviceLevelValueIds: string[] = [];

    it('should insert a single value using insertValueById', async () => {
      const { choiceSets } = getServices();
      const config = getTestConfig();

      const choiceSetId = config.dataFabricTestChoiceSetId || testChoiceSetId;

      if (!choiceSetId) {
        throw new Error('No choice set ID available for testing. Set DATA_FABRIC_TEST_CHOICESET_ID.');
      }

      const valueName = `SDK_RT_${generateRandomString(6)}`;
      const result = await choiceSets.insertValueById(choiceSetId, valueName, {
        displayName: 'Travel',
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();

      serviceLevelValueIds.push(result.id);
      insertedValueIds.push(result.id);
    });

    it('should verify inserted value via getById', async () => {
      const { choiceSets } = getServices();
      const config = getTestConfig();

      const choiceSetId = config.dataFabricTestChoiceSetId || testChoiceSetId;

      if (!choiceSetId || serviceLevelValueIds.length === 0) {
        throw new Error('No inserted value available to verify');
      }

      const valueId = serviceLevelValueIds[0];
      const result = await choiceSets.getById(choiceSetId);
      const found = result.items.find((v) => v.id === valueId);

      expect(found).toBeDefined();
      expect(found?.id).toBe(valueId);
    });

    it('should insert another value with default displayName', async () => {
      const { choiceSets } = getServices();
      const config = getTestConfig();

      const choiceSetId = config.dataFabricTestChoiceSetId || testChoiceSetId;

      if (!choiceSetId) {
        throw new Error('No choice set ID available for testing');
      }

      const valueName = `SDK_SOLO_${generateRandomString(6)}`;
      const result = await choiceSets.insertValueById(choiceSetId, valueName);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe(valueName);
      expect(result.displayName).toBe(valueName);

      serviceLevelValueIds.push(result.id);
      insertedValueIds.push(result.id);
    });

    it('should update value using updateValueById', async () => {
      const { choiceSets } = getServices();
      const config = getTestConfig();

      const choiceSetId = config.dataFabricTestChoiceSetId || testChoiceSetId;

      if (!choiceSetId || serviceLevelValueIds.length === 0) {
        throw new Error('No values available to update');
      }

      const valueId = serviceLevelValueIds[0];
      const result = await choiceSets.updateValueById(
        choiceSetId,
        valueId,
        'Business Travel',
      );

      expect(result).toBeDefined();
      expect(result.id).toBe(valueId);
      expect(result.displayName).toBe('Business Travel');
    });

    it('should delete values using deleteValuesById', async () => {
      const { choiceSets } = getServices();
      const config = getTestConfig();

      const choiceSetId = config.dataFabricTestChoiceSetId || testChoiceSetId;

      if (!choiceSetId || serviceLevelValueIds.length === 0) {
        throw new Error('No values available to delete');
      }

      await choiceSets.deleteValuesById(choiceSetId, serviceLevelValueIds);

      // Verify the deleted values are no longer present on the choice set
      const remaining = await choiceSets.getById(choiceSetId);
      const remainingIds = new Set(remaining.items.map((v) => v.id));
      for (const deletedId of serviceLevelValueIds) {
        expect(remainingIds.has(deletedId)).toBe(false);
      }

      // Remove deleted IDs from the file-level tracking list
      for (const id of serviceLevelValueIds) {
        const idx = insertedValueIds.indexOf(id);
        if (idx !== -1) {
          insertedValueIds.splice(idx, 1);
        }
      }
      serviceLevelValueIds.length = 0;
    });
  });

  // Skipped: folder-scoped choice-set value CRUD requires the DataFabric.Schema.Write
  // OAuth scope (same restriction as the tenant-scope value CRUD block above), which
  // PAT-authenticated CI runs do not have. Re-enable locally with describe.only when
  // INTEGRATION_TEST_FOLDER_KEY is set and OAuth is configured.
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

  // ─── Folder-scoped Choice value CRUD ──────────────────────────────────────
  // Mirrors the tenant-scope `Choice value CRUD operations` block above, but
  // against a pre-existing folder-scoped choice set named
  // `aIntegrationTestFolderScoped` in the folder identified by
  // INTEGRATION_TEST_FOLDER_KEY (looked up by name in beforeAll so the test
  // env doesn't need a separate CS UUID).
  //
  // Skipped: same DataFabric.Schema.Write OAuth-scope restriction as the tenant
  // value-CRUD block. Re-enable locally with describe.only when
  // INTEGRATION_TEST_FOLDER_KEY is set, OAuth is configured, and the named
  // choice set exists in that folder.
  describe.skip('Folder-scoped Choice value CRUD operations', () => {
    const FOLDER_CHOICE_SET_NAME = 'aIntegrationTestFolderScoped';
    const folderValueIds: string[] = [];
    let folderKey!: string;
    let folderChoiceSetId!: string;

    beforeAll(async () => {
      const config = getTestConfig();
      if (!config.folderKey) {
        throw new Error('INTEGRATION_TEST_FOLDER_KEY is required for folder-scoped value-CRUD tests');
      }
      folderKey = config.folderKey;

      const { choiceSets } = getServices();
      const folderSets = await choiceSets.getAll({ folderKey });
      const match = folderSets.find((cs) => cs.name === FOLDER_CHOICE_SET_NAME);
      if (!match) {
        throw new Error(
          `Folder-scoped choice set '${FOLDER_CHOICE_SET_NAME}' not found in folder '${folderKey}' — create it first or update FOLDER_CHOICE_SET_NAME.`,
        );
      }
      folderChoiceSetId = match.id;
    });

    afterAll(async () => {
      if (folderValueIds.length === 0) return;
      const { choiceSets } = getServices();
      try {
        await choiceSets.deleteValuesById(folderChoiceSetId, folderValueIds, { folderKey });
      } catch {
        // Ignore cleanup failures — test resources are sandboxed.
      }
    });

    it('should insert a single value using insertValueById', async () => {
      const { choiceSets } = getServices();

      const valueName = `SDK_FLD_${generateRandomString(6)}`;
      const result = await choiceSets.insertValueById(folderChoiceSetId, valueName, {
        displayName: 'Travel',
        folderKey,
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      folderValueIds.push(result.id);
    });

    it('should verify inserted value via getById', async () => {
      const { choiceSets } = getServices();

      if (folderValueIds.length === 0) {
        throw new Error('No inserted value available to verify');
      }

      const valueId = folderValueIds[0];
      const result = await choiceSets.getById(folderChoiceSetId, { folderKey });
      const found = result.items.find((v) => v.id === valueId);

      expect(found).toBeDefined();
      expect(found?.id).toBe(valueId);
    });

    it('should insert another value with default displayName', async () => {
      const { choiceSets } = getServices();

      const valueName = `SDK_FLD_SOLO_${generateRandomString(6)}`;
      const result = await choiceSets.insertValueById(folderChoiceSetId, valueName, { folderKey });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe(valueName);
      expect(result.displayName).toBe(valueName);
      folderValueIds.push(result.id);
    });

    it('should update value using updateValueById', async () => {
      const { choiceSets } = getServices();

      if (folderValueIds.length === 0) {
        throw new Error('No values available to update');
      }

      const valueId = folderValueIds[0];
      const result = await choiceSets.updateValueById(
        folderChoiceSetId,
        valueId,
        'Business Travel',
        { folderKey },
      );

      expect(result).toBeDefined();
      expect(result.id).toBe(valueId);
      expect(result.displayName).toBe('Business Travel');
    });

    it('should delete values using deleteValuesById', async () => {
      const { choiceSets } = getServices();

      if (folderValueIds.length === 0) {
        throw new Error('No values available to delete');
      }

      await choiceSets.deleteValuesById(folderChoiceSetId, folderValueIds, { folderKey });

      // Verify the deleted values are no longer present on the choice set
      const remaining = await choiceSets.getById(folderChoiceSetId, { folderKey });
      const remainingIds = new Set(remaining.items.map((v) => v.id));
      for (const deletedId of folderValueIds) {
        expect(remainingIds.has(deletedId)).toBe(false);
      }

      folderValueIds.length = 0;
    });
  });
});
