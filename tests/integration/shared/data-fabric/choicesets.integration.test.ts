import { describe, it, expect, afterAll } from 'vitest';
import { getServices, getTestConfig, setupUnifiedTests, InitMode } from '../../config/unified-setup';
import { generateRandomString } from '../../utils/helpers';

const modes: InitMode[] = ['v0', 'v1'];

describe.each(modes)('Data Fabric ChoiceSets - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);
  const testConfig = getTestConfig();
  let testChoiceSetId: string | null = testConfig.dataFabricTestChoiceSetId || null;
  const createdChoiceSetIds: string[] = [];

  afterAll(async () => {
    if (createdChoiceSetIds.length === 0) return;
    const { choiceSets } = getServices();
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

  // Value-level CRUD runs live — scope DataFabric.Data.Write is supported on PAT tokens.
  // Uses an existing choice set from env (dataFabricTestChoiceSetId) rather than
  // creating one, because choice-set create/delete needs DataFabric.Schema.Write
  // which isn't granted to external-app PATs.
  describe('value-level CRUD (insertValueById / updateValueById / deleteValuesById)', () => {
    // Multi-step tests can take time: each insertValueById/updateValueById does a
    // getAll() lookup to resolve choice-set name, plus the actual mutation. 90s budget.
    const LONG = 90_000;

    // Track value ids inserted in this suite so afterAll can clean them up.
    const insertedValueIds: string[] = [];

    afterAll(async () => {
      if (!testChoiceSetId || insertedValueIds.length === 0) return;
      const { choiceSets } = getServices();
      try {
        await choiceSets.deleteValuesById(testChoiceSetId, insertedValueIds);
      } catch {
        // ignore cleanup failures
      }
    });

    it('should round-trip a value: insert, update displayName, delete', async () => {
      if (!testChoiceSetId) {
        throw new Error(
          'dataFabricTestChoiceSetId required in .env.integration for value-level tests',
        );
      }
      const { choiceSets } = getServices();
      const valueName = `SDK_RT_${generateRandomString(6)}`;

      // Insert
      const inserted = await choiceSets.insertValueById(testChoiceSetId, valueName, {
        displayName: 'Travel',
      });
      insertedValueIds.push(inserted.id);
      expect(inserted.id).toBeDefined();
      expect(inserted.name).toBe(valueName);
      expect(inserted.displayName).toBe('Travel');

      // Update — only displayName is mutable
      const updated = await choiceSets.updateValueById(
        testChoiceSetId,
        inserted.id,
        'Business Travel',
      );
      expect(updated.id).toBe(inserted.id);
      expect(updated.name).toBe(valueName);
      expect(updated.displayName).toBe('Business Travel');

      // Confirm via getById
      const after = await choiceSets.getById(testChoiceSetId);
      const found = after.items.find((v) => v.id === inserted.id);
      expect(found?.displayName).toBe('Business Travel');

      // Delete
      await choiceSets.deleteValuesById(testChoiceSetId, [inserted.id]);
      insertedValueIds.splice(insertedValueIds.indexOf(inserted.id), 1);
      const final = await choiceSets.getById(testChoiceSetId);
      expect(final.items.find((v) => v.id === inserted.id)).toBeUndefined();
    }, LONG);

    it('should delete multiple values in one call', async () => {
      if (!testChoiceSetId) {
        throw new Error('dataFabricTestChoiceSetId required for value-level tests');
      }
      const { choiceSets } = getServices();
      const nameA = `SDK_A_${generateRandomString(6)}`;
      const nameB = `SDK_B_${generateRandomString(6)}`;

      const v1 = await choiceSets.insertValueById(testChoiceSetId, nameA, { displayName: 'A' });
      insertedValueIds.push(v1.id);
      const v2 = await choiceSets.insertValueById(testChoiceSetId, nameB, { displayName: 'B' });
      insertedValueIds.push(v2.id);

      await choiceSets.deleteValuesById(testChoiceSetId, [v1.id, v2.id]);
      insertedValueIds.splice(insertedValueIds.indexOf(v1.id), 1);
      insertedValueIds.splice(insertedValueIds.indexOf(v2.id), 1);

      const after = await choiceSets.getById(testChoiceSetId);
      expect(after.items.find((v) => v.id === v1.id)).toBeUndefined();
      expect(after.items.find((v) => v.id === v2.id)).toBeUndefined();
    }, LONG);

    it('should default displayName to name when only name is provided on insert', async () => {
      if (!testChoiceSetId) {
        throw new Error('dataFabricTestChoiceSetId required for value-level tests');
      }
      const { choiceSets } = getServices();
      const valueName = `SDK_SOLO_${generateRandomString(6)}`;

      const inserted = await choiceSets.insertValueById(testChoiceSetId, valueName);
      insertedValueIds.push(inserted.id);

      expect(inserted.name).toBe(valueName);
      expect(inserted.displayName).toBe(valueName);
    }, LONG);

    it('should return a transformed camelCase response on insert (no PascalCase fields)', async () => {
      if (!testChoiceSetId) {
        throw new Error('dataFabricTestChoiceSetId required for value-level tests');
      }
      const { choiceSets } = getServices();
      const valueName = `SDK_TX_${generateRandomString(6)}`;

      const inserted = await choiceSets.insertValueById(testChoiceSetId, valueName, {
        displayName: 'Transformed',
      });
      insertedValueIds.push(inserted.id);

      // camelCase fields populated
      expect(inserted.id).toBeDefined();
      expect(inserted.name).toBe(valueName);
      expect(inserted.displayName).toBe('Transformed');
      expect(inserted.createdTime).toBeDefined();
      expect(inserted.updatedTime).toBeDefined();
      expect(typeof inserted.numberId).toBe('number');

      // Raw PascalCase fields absent (transform pipeline validation)
      expect((inserted as any).Id).toBeUndefined();
      expect((inserted as any).Name).toBeUndefined();
      expect((inserted as any).DisplayName).toBeUndefined();
      expect((inserted as any).CreateTime).toBeUndefined();
      expect((inserted as any).UpdateTime).toBeUndefined();
    }, LONG);

    it('should preserve untouched values when deleting a subset', async () => {
      if (!testChoiceSetId) {
        throw new Error('dataFabricTestChoiceSetId required for value-level tests');
      }
      const { choiceSets } = getServices();
      const n1 = `SDK_KEEP1_${generateRandomString(6)}`;
      const n2 = `SDK_DROP_${generateRandomString(6)}`;
      const n3 = `SDK_KEEP2_${generateRandomString(6)}`;

      const v1 = await choiceSets.insertValueById(testChoiceSetId, n1);
      insertedValueIds.push(v1.id);
      const v2 = await choiceSets.insertValueById(testChoiceSetId, n2);
      insertedValueIds.push(v2.id);
      const v3 = await choiceSets.insertValueById(testChoiceSetId, n3);
      insertedValueIds.push(v3.id);

      await choiceSets.deleteValuesById(testChoiceSetId, [v2.id]);
      insertedValueIds.splice(insertedValueIds.indexOf(v2.id), 1);

      const after = await choiceSets.getById(testChoiceSetId);
      expect(after.items.find((v) => v.id === v1.id)).toBeDefined();
      expect(after.items.find((v) => v.id === v2.id)).toBeUndefined();
      expect(after.items.find((v) => v.id === v3.id)).toBeDefined();
    }, LONG);

    it('should throw when insertValueById is called with a non-existent choice set id', async () => {
      const { choiceSets } = getServices();
      const fakeId = '00000000-0000-0000-0000-deadbeefdead';

      await expect(
        choiceSets.insertValueById(fakeId, 'GHOST'),
      ).rejects.toThrow(/not found/i);
    }, LONG);

    it('should throw when updateValueById is called with a non-existent choice set id', async () => {
      const { choiceSets } = getServices();
      const fakeId = '00000000-0000-0000-0000-deadbeefdead';
      const fakeValueId = '00000000-0000-0000-0000-cafefeedcafe';

      await expect(
        choiceSets.updateValueById(fakeId, fakeValueId, 'X'),
      ).rejects.toThrow(/not found/i);
    }, LONG);
  });
});
