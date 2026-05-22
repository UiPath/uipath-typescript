import { describe, it, expect, afterAll } from 'vitest';
import { getServices, getTestConfig, setupUnifiedTests, InitMode } from '../../config/unified-setup';
import { generateRandomString } from '../../utils/helpers';

const modes: InitMode[] = ['v0', 'v1'];

describe.each(modes)('Data Fabric ChoiceSets - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);
  const testConfig = getTestConfig();
  let testChoiceSetId: string | null = testConfig.dataFabricTestChoiceSetId || null;
  const createdChoiceSetIds: string[] = [];
  const insertedValueIds: string[] = [];

  afterAll(async () => {
    const { choiceSets } = getServices();

    // Clean up any leftover choice-set values from the value-level CRUD block.
    if (testChoiceSetId && insertedValueIds.length > 0) {
      try {
        await choiceSets.deleteValuesById(testChoiceSetId, insertedValueIds);
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

  describe('Choice value CRUD operations', () => {
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
});
