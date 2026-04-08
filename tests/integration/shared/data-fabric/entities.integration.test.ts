import { describe, it, expect, afterAll } from 'vitest';
import {
  getServices,
  getTestConfig,
  setupUnifiedTests,
  cleanupTestEntityRecords,
  InitMode,
} from '../../config/unified-setup';
import { registerResource } from '../../utils/cleanup';
import { generateRandomString, generateRandomInt, generateRandomFloat } from '../../utils/helpers';
import {
  EntityFieldDataType,
  EntityFieldType,
  EntityRecord,
  FieldDisplayType,
  FieldMetaData,
  RawEntityGetResponse,
} from '../../../../src/models/data-fabric/entities.types';

// Cache for choice set values to avoid repeated API calls within a test run
const choiceSetValueCache = new Map<string, any[]>();

/**
 * Fetches and caches choice set values for a given choice set ID.
 */
async function getChoiceSetValues(choiceSetId: string): Promise<any[]> {
  if (choiceSetValueCache.has(choiceSetId)) {
    return choiceSetValueCache.get(choiceSetId)!;
  }
  const { choiceSets } = getServices();
  const result = await choiceSets.getById(choiceSetId);
  const values = result.items || [];
  choiceSetValueCache.set(choiceSetId, values);
  return values;
}

/**
 * Generates a dummy value for a given entity field based on its data type.
 * Handles all EntityFieldDataType values so tests work regardless of entity schema.
 */
function generateFieldValue(field: FieldMetaData): any {
  const { fieldDataType } = field;

  switch (fieldDataType.name) {
    case EntityFieldDataType.STRING:
      return `Test_${generateRandomString(8)}`;
    case EntityFieldDataType.MULTILINE_TEXT:
      return `Test multiline\n${generateRandomString(12)}`;
    case EntityFieldDataType.INTEGER: {
      const max = fieldDataType.maxValue ?? 10000;
      const min = fieldDataType.minValue ?? 0;
      return generateRandomInt(min, max);
    }
    case EntityFieldDataType.BIG_INTEGER: {
      const max = fieldDataType.maxValue ?? 100000;
      const min = fieldDataType.minValue ?? 0;
      return generateRandomInt(min, max);
    }
    case EntityFieldDataType.FLOAT:
    case EntityFieldDataType.DOUBLE: {
      const max = fieldDataType.maxValue ?? 1000;
      const min = fieldDataType.minValue ?? 0;
      return generateRandomFloat(min, max);
    }
    case EntityFieldDataType.DECIMAL: {
      const precision = fieldDataType.decimalPrecision ?? 2;
      const max = fieldDataType.maxValue ?? 1000;
      const min = fieldDataType.minValue ?? 0;
      return generateRandomFloat(min, max, precision);
    }
    case EntityFieldDataType.BOOLEAN:
      return true;
    case EntityFieldDataType.DATE:
      return new Date().toISOString().split('T')[0];
    case EntityFieldDataType.DATETIME:
      return new Date().toISOString();
    case EntityFieldDataType.DATETIME_WITH_TZ:
      return new Date().toISOString();
    case EntityFieldDataType.UUID:
      return undefined; // UUIDs are typically auto-generated
    default:
      return `Test_${generateRandomString(6)}`;
  }
}

/**
 * Returns only the fields that are safe to write to when inserting a record.
 * Filters out system fields, primary keys, auto-numbers, relationships, and UUIDs.
 * File fields are excluded because the SDK does not expose a file upload API.
 */
function getWritableFields(fields: FieldMetaData[]): FieldMetaData[] {
  return fields.filter(
    (f) =>
      !f.isSystemField &&
      !f.isPrimaryKey &&
      !f.isHiddenField &&
      f.fieldDisplayType !== FieldDisplayType.AutoNumber &&
      f.fieldDisplayType !== FieldDisplayType.Relationship &&
      f.fieldDisplayType !== FieldDisplayType.File &&
      f.fieldDataType.name !== EntityFieldDataType.UUID
  );
}

/**
 * Builds a dummy record object that conforms to the entity's schema.
 * Discovers the schema dynamically and generates appropriate values, including
 * looking up valid choice set values for ChoiceSetSingle/ChoiceSetMultiple fields.
 */
async function buildDummyRecord(entityMetadata: RawEntityGetResponse): Promise<Record<string, any>> {
  const writableFields = getWritableFields(entityMetadata.fields);
  const record: Record<string, any> = {};

  for (const field of writableFields) {
    if (
      field.fieldDisplayType === FieldDisplayType.ChoiceSetSingle ||
      field.fieldDisplayType === FieldDisplayType.ChoiceSetMultiple
    ) {
      const choiceSetId = field.choiceSetId || field.referenceChoiceSet?.id;
      if (!choiceSetId) continue;

      const values = await getChoiceSetValues(choiceSetId);
      if (values.length === 0) continue;

      if (field.fieldDisplayType === FieldDisplayType.ChoiceSetSingle) {
        record[field.name] = values[0].numberId;
      } else {
        record[field.name] = [values[0].numberId];
      }
    } else {
      const value = generateFieldValue(field);
      if (value !== undefined) {
        record[field.name] = value;
      }
    }
  }

  return record;
}

const modes: InitMode[] = ['v0', 'v1'];

describe.each(modes)('Data Fabric Entities - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  let testEntityId: string | null = null;
  let entityMetadata: RawEntityGetResponse | null = null;
  const createdRecordIds: string[] = [];

  describe('getAll', () => {
    it('should retrieve all entities', async () => {
      const { entities } = getServices();

      const result = await entities.getAll();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      if (result.length > 0) {
        testEntityId = result[0].id;
      }
    });

    it('should have valid entity structure', async () => {
      const { entities } = getServices();

      const result = await entities.getAll();

      if (result.length === 0) {
        throw new Error('No entities available to validate structure');
      }

      const entity = result[0];
      expect(entity.id).toBeDefined();
      expect(entity.name).toBeDefined();
      expect(typeof entity.id).toBe('string');
      expect(typeof entity.name).toBe('string');
    });

    it('should return entities with entity methods attached', async () => {
      const { entities } = getServices();

      const result = await entities.getAll();

      if (result.length === 0) {
        throw new Error('No entities available to validate methods');
      }

      const entity = result[0];
      expect(typeof entity.insertRecord).toBe('function');
      expect(typeof entity.insertRecords).toBe('function');
      expect(typeof entity.updateRecords).toBe('function');
      expect(typeof entity.deleteRecords).toBe('function');
      expect(typeof entity.getAllRecords).toBe('function');
      expect(typeof entity.getRecord).toBe('function');
      expect(typeof entity.downloadAttachment).toBe('function');
    });
  });

  describe('getById', () => {
    it('should retrieve entity metadata by ID', async () => {
      const { entities } = getServices();
      const config = getTestConfig();

      const entityId = config.dataFabricTestEntityId || testEntityId;

      if (!entityId) {
        throw new Error('No entity ID available for testing');
      }

      const result = await entities.getById(entityId);

      expect(result).toBeDefined();
      expect(result.id).toBe(entityId);
      expect(result.name).toBeDefined();

      testEntityId = entityId;
      entityMetadata = result;
    });

    it('should return entity with fields metadata', async () => {
      const { entities } = getServices();
      const config = getTestConfig();

      const entityId = config.dataFabricTestEntityId || testEntityId;

      if (!entityId) {
        throw new Error('No entity ID available for testing');
      }

      const result = await entities.getById(entityId);

      expect(result.fields).toBeDefined();
      expect(Array.isArray(result.fields)).toBe(true);
      expect(result.fields.length).toBeGreaterThan(0);

      const field = result.fields[0];
      expect(field.name).toBeDefined();
      expect(field.fieldDataType).toBeDefined();
      expect(field.fieldDataType.name).toBeDefined();
      expect(typeof field.isSystemField).toBe('boolean');
      expect(typeof field.isRequired).toBe('boolean');

      entityMetadata = result;
    });

    it('should have entity methods attached', async () => {
      const { entities } = getServices();
      const config = getTestConfig();

      const entityId = config.dataFabricTestEntityId || testEntityId;

      if (!entityId) {
        throw new Error('No entity ID available for testing');
      }

      const result = await entities.getById(entityId);

      expect(typeof result.insertRecord).toBe('function');
      expect(typeof result.insertRecords).toBe('function');
      expect(typeof result.updateRecords).toBe('function');
      expect(typeof result.deleteRecords).toBe('function');
      expect(typeof result.getAllRecords).toBe('function');
      expect(typeof result.getRecord).toBe('function');
      expect(typeof result.downloadAttachment).toBe('function');
    });
  });

  describe('getAllRecords', () => {
    it('should retrieve entity records', async () => {
      const { entities } = getServices();
      const config = getTestConfig();

      const entityId = config.dataFabricTestEntityId || testEntityId;

      if (!entityId) {
        throw new Error('No entity ID available for testing');
      }

      const result = await entities.getAllRecords(entityId);

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('should retrieve records with pageSize', async () => {
      const { entities } = getServices();
      const config = getTestConfig();

      const entityId = config.dataFabricTestEntityId || testEntityId;

      if (!entityId) {
        throw new Error('No entity ID available for testing');
      }

      const result = await entities.getAllRecords(entityId, {
        pageSize: 5,
      });

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(result.items.length).toBeLessThanOrEqual(5);
    });

    it('should handle pagination with cursor', async () => {
      const { entities } = getServices();
      const config = getTestConfig();

      const entityId = config.dataFabricTestEntityId || testEntityId;

      if (!entityId) {
        throw new Error('No entity ID available for testing');
      }

      const firstPage = await entities.getAllRecords(entityId, {
        pageSize: 2,
      });

      expect(firstPage).toBeDefined();
      expect(firstPage.items).toBeDefined();

      if (firstPage.hasNextPage && firstPage.nextCursor) {
        const secondPage = await entities.getAllRecords(entityId, {
          pageSize: 2,
          cursor: firstPage.nextCursor,
        });

        expect(secondPage).toBeDefined();
        expect(secondPage.items).toBeDefined();
        expect(secondPage.items).not.toEqual(firstPage.items);
      }
    });
  });

  describe('getRecordById', () => {
    it('should retrieve a single record by entity ID and record ID', async () => {
      const { entities } = getServices();
      const config = getTestConfig();

      const entityId = config.dataFabricTestEntityId || testEntityId;

      if (!entityId) {
        throw new Error('No entity ID available for testing');
      }

      const records = await entities.getAllRecords(entityId, { pageSize: 1 });

      if (records.items.length === 0) {
        throw new Error('No records available to test getRecordById');
      }

      const recordId = records.items[0].Id;
      const record = await entities.getRecordById(entityId, recordId);

      expect(record).toBeDefined();
      expect(record.Id).toBe(recordId);
    });
  });

  describe('Record CRUD operations (service-level)', () => {
    const serviceLevelRecordIds: string[] = [];

    it('should insert a single record using insertRecordById', async () => {
      const { entities } = getServices();
      const config = getTestConfig();

      const entityId = config.dataFabricTestEntityId || testEntityId;

      if (!entityId) {
        throw new Error('No entity ID available for testing. Set DATA_FABRIC_TEST_ENTITY_ID.');
      }

      // Fetch schema dynamically if not already loaded
      if (entityMetadata?.id !== entityId) {
        entityMetadata = await entities.getById(entityId);
      }

      const testData = await buildDummyRecord(entityMetadata);

      const result = await entities.insertRecordById(entityId, testData);

      expect(result).toBeDefined();
      expect(result.Id).toBeDefined();

      serviceLevelRecordIds.push(result.Id);
      createdRecordIds.push(result.Id);
      registerResource('entityRecords', {
        entityId,
        recordIds: [result.Id],
      });
    });

    it('should verify inserted record via getRecordById', async () => {
      const { entities } = getServices();
      const config = getTestConfig();

      const entityId = config.dataFabricTestEntityId || testEntityId;

      if (!entityId || serviceLevelRecordIds.length === 0) {
        throw new Error('No inserted record available to verify');
      }

      const recordId = serviceLevelRecordIds[0];
      const record = await entities.getRecordById(entityId, recordId);

      expect(record).toBeDefined();
      expect(record.Id).toBe(recordId);
    });

    it('should batch insert multiple records using insertRecordsById', async () => {
      const { entities } = getServices();
      const config = getTestConfig();

      const entityId = config.dataFabricTestEntityId || testEntityId;

      if (!entityId) {
        throw new Error('No entity ID available for testing');
      }

      if (entityMetadata?.id !== entityId) {
        entityMetadata = await entities.getById(entityId);
      }

      const testData = await Promise.all([buildDummyRecord(entityMetadata), buildDummyRecord(entityMetadata)]);

      const result = await entities.insertRecordsById(entityId, testData);

      expect(result).toBeDefined();
      expect(result.successRecords).toBeDefined();
      expect(Array.isArray(result.successRecords)).toBe(true);

      const insertedIds = result.successRecords
        .filter((r) => r.Id)
        .map((r) => r.Id);
      serviceLevelRecordIds.push(...insertedIds);
      createdRecordIds.push(...insertedIds);
      registerResource('entityRecords', {
        entityId,
        recordIds: insertedIds,
      });
    });

    it('should update records using updateRecordsById', async () => {
      const { entities } = getServices();
      const config = getTestConfig();

      const entityId = config.dataFabricTestEntityId || testEntityId;

      if (!entityId || serviceLevelRecordIds.length === 0) {
        throw new Error('No records available to update');
      }

      if (entityMetadata?.id !== entityId) {
        entityMetadata = await entities.getById(entityId);
      }

      // Build update payloads: each must include `Id` plus at least one updated field
      const writableFields = getWritableFields(entityMetadata.fields);
      const updateData: EntityRecord[] = serviceLevelRecordIds.map((id) => {
        const updates = { Id: id } as EntityRecord;
        // Update the first writable field with a new value
        if (writableFields.length > 0) {
          const field = writableFields[0];
          updates[field.name] = generateFieldValue(field);
        }
        return updates;
      });

      const result = await entities.updateRecordsById(entityId, updateData);

      expect(result).toBeDefined();
      expect(result.successRecords).toBeDefined();
      expect(Array.isArray(result.successRecords)).toBe(true);
    });

    it('should delete records using deleteRecordsById', async () => {
      const { entities } = getServices();
      const config = getTestConfig();

      const entityId = config.dataFabricTestEntityId || testEntityId;

      if (!entityId || serviceLevelRecordIds.length === 0) {
        throw new Error('No records available to delete');
      }

      const result = await entities.deleteRecordsById(entityId, serviceLevelRecordIds);

      expect(result).toBeDefined();
      expect(result.successRecords).toBeDefined();

      // Remove deleted IDs from the global tracking list
      for (const id of serviceLevelRecordIds) {
        const idx = createdRecordIds.indexOf(id);
        if (idx !== -1) {
          createdRecordIds.splice(idx, 1);
        }
      }
      serviceLevelRecordIds.length = 0;
    });
  });

  describe('Entity-level methods (via getById)', () => {
    const entityMethodRecordIds: string[] = [];

    it('should insert a single record via entity.insertRecord', async () => {
      const { entities } = getServices();
      const config = getTestConfig();

      const entityId = config.dataFabricTestEntityId || testEntityId;

      if (!entityId) {
        throw new Error('No entity ID available for testing');
      }

      const entity = await entities.getById(entityId);
      entityMetadata = entity;

      const testData = await buildDummyRecord(entity);
      const result = await entity.insertRecord(testData);

      expect(result).toBeDefined();
      expect(result.Id).toBeDefined();

      entityMethodRecordIds.push(result.Id);
      createdRecordIds.push(result.Id);
      registerResource('entityRecords', {
        entityId,
        recordIds: [result.Id],
      });
    });

    it('should insert multiple records via entity.insertRecords', async () => {
      const { entities } = getServices();
      const config = getTestConfig();

      const entityId = config.dataFabricTestEntityId || testEntityId;

      if (!entityId) {
        throw new Error('No entity ID available for testing');
      }

      const entity = await entities.getById(entityId);
      entityMetadata = entity;

      const testData = await Promise.all([buildDummyRecord(entity), buildDummyRecord(entity)]);
      const result = await entity.insertRecords(testData);

      expect(result).toBeDefined();
      expect(result.successRecords).toBeDefined();
      expect(Array.isArray(result.successRecords)).toBe(true);

      const insertedIds = result.successRecords
        .filter((r) => r.Id)
        .map((r) => r.Id);
      entityMethodRecordIds.push(...insertedIds);
      createdRecordIds.push(...insertedIds);
      registerResource('entityRecords', {
        entityId,
        recordIds: insertedIds,
      });
    });

    it('should retrieve all records via entity.getAllRecords', async () => {
      const { entities } = getServices();
      const config = getTestConfig();

      const entityId = config.dataFabricTestEntityId || testEntityId;

      if (!entityId) {
        throw new Error('No entity ID available for testing');
      }

      const entity = await entities.getById(entityId);
      const result = await entity.getAllRecords({ pageSize: 5 });

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBeLessThanOrEqual(5);
    });

    it('should retrieve a single record via entity.getRecord', async () => {
      const { entities } = getServices();
      const config = getTestConfig();

      const entityId = config.dataFabricTestEntityId || testEntityId;

      if (!entityId || entityMethodRecordIds.length === 0) {
        throw new Error('No records available to test getRecord');
      }

      const entity = await entities.getById(entityId);
      const recordId = entityMethodRecordIds[0];
      const record = await entity.getRecord(recordId);

      expect(record).toBeDefined();
      expect(record.Id).toBe(recordId);
    });

    it('should update records via entity.updateRecords', async () => {
      const { entities } = getServices();
      const config = getTestConfig();

      const entityId = config.dataFabricTestEntityId || testEntityId;

      if (!entityId || entityMethodRecordIds.length === 0) {
        throw new Error('No records available to update');
      }

      const entity = await entities.getById(entityId);
      entityMetadata = entity;

      const writableFields = getWritableFields(entity.fields);
      const updateData: EntityRecord[] = entityMethodRecordIds.map((id) => {
        const updates = { Id: id } as EntityRecord;
        if (writableFields.length > 0) {
          const field = writableFields[0];
          updates[field.name] = generateFieldValue(field);
        }
        return updates;
      });

      const result = await entity.updateRecords(updateData);

      expect(result).toBeDefined();
      expect(result.successRecords).toBeDefined();
      expect(Array.isArray(result.successRecords)).toBe(true);
    });

    it('should delete records via entity.deleteRecords', async () => {
      const { entities } = getServices();
      const config = getTestConfig();

      const entityId = config.dataFabricTestEntityId || testEntityId;

      if (!entityId || entityMethodRecordIds.length === 0) {
        throw new Error('No records available to delete');
      }

      const entity = await entities.getById(entityId);
      const result = await entity.deleteRecords(entityMethodRecordIds);

      expect(result).toBeDefined();
      expect(result.successRecords).toBeDefined();

      for (const id of entityMethodRecordIds) {
        const idx = createdRecordIds.indexOf(id);
        if (idx !== -1) {
          createdRecordIds.splice(idx, 1);
        }
      }
      entityMethodRecordIds.length = 0;
    });
  });

  describe('updateRecordById', () => {
    it('should update a single record', async () => {
      const { entities } = getServices();
      const config = getTestConfig();

      const entityId = config.dataFabricTestEntityId || testEntityId;

      if (!entityId) {
        throw new Error('No entity ID available for testing. Set DATA_FABRIC_TEST_ENTITY_ID.');
      }

      // Insert a record to update
      const insertData = {
        name: `IntegrationTest_${mode}_updateRecordById_${generateRandomString(8)}`,
        description: 'Before update',
      };

      const inserted = await entities.insertRecordById(entityId, insertData);
      const updateTestRecordId = inserted.Id;

      if (!updateTestRecordId) {
        throw new Error('Could not get inserted record ID');
      }

      createdRecordIds.push(updateTestRecordId);
      registerResource('entityRecords', {
        entityId,
        recordIds: [updateTestRecordId],
      });

      // Update the record using updateRecordById
      const result = await entities.updateRecordById(entityId, updateTestRecordId, {
        Description: 'After update',
      });

      expect(result).toBeDefined();
      expect(result.Id).toBe(updateTestRecordId);
    });

    it('should handle API errors for non-existent record', async () => {
      const { entities } = getServices();
      const config = getTestConfig();

      const entityId = config.dataFabricTestEntityId || testEntityId;

      if (!entityId) {
        throw new Error('No entity ID available for testing');
      }

      await expect(
        entities.updateRecordById(entityId, 'non-existent-record-id', { description: 'No ID' })
      ).rejects.toThrow();
    });
  });

  describe('queryRecords', () => {
    it('should query records with no filters', async () => {
      const { entities } = getServices();
      const config = getTestConfig();
      const entityId = config.dataFabricTestEntityId || testEntityId;
      if (!entityId) {
        throw new Error('No entity ID available for testing');
      }
      const result = await entities.queryRecords(entityId);
      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(typeof result.totalCount).toBe('number');
    });

    it('should query records with filter options', async () => {
      const { entities } = getServices();
      const config = getTestConfig();
      const entityId = config.dataFabricTestEntityId || testEntityId;
      if (!entityId) {
        throw new Error('No entity ID available for testing');
      }
      const result = await entities.queryRecords(entityId, {
        start: 0,
        limit: 5,
      });
      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(result.items.length).toBeLessThanOrEqual(5);
      expect(typeof result.totalCount).toBe('number');
    });
  });

  describe('bulkImport', () => {
    it('should import records from CSV content', async () => {
      const { entities } = getServices();
      const config = getTestConfig();
      const entityId = config.dataFabricTestEntityId || testEntityId;
      if (!entityId) {
        throw new Error('No entity ID available for testing. Set DATA_FABRIC_TEST_ENTITY_ID.');
      }

      if (!entityMetadata || entityMetadata.id !== entityId) {
        entityMetadata = await entities.getById(entityId);
      }

      // Build CSV from writable fields
      const writableFields = getWritableFields(entityMetadata.fields).filter(
        f => f.fieldDataType.name === EntityFieldDataType.STRING
      );

      if (writableFields.length === 0) {
        throw new Error('No string fields available for bulk import test');
      }

      const fieldName = writableFields[0].name;
      const csvContent = `${fieldName}\nBulkImport_${generateRandomString(8)}\nBulkImport_${generateRandomString(8)}`;
      const result = await entities.bulkImport(entityId, csvContent, 'test-import.csv');

      expect(result).toBeDefined();
      expect(typeof result.totalRecords).toBe('number');
      expect(typeof result.insertedRecords).toBe('number');
      expect(result.totalRecords).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Entity schema management (createEntity, deleteEntity, addField, removeField)', () => {
    let schemaTestEntityId: string | null = null;

    it('should create a new entity', async () => {
      const { entities } = getServices();
      const entityName = `sdktest${generateRandomString(6)}`;
      const result = await entities.createEntity(entityName, 'Integration test entity', [
        { name: 'title', type: EntityFieldType.Text, isRequired: false },
      ]);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      schemaTestEntityId = result;
    });

    it('should add a field to the created entity', async () => {
      const { entities } = getServices();
      if (!schemaTestEntityId) {
        throw new Error('No schema test entity available — createEntity test must run first');
      }
      await entities.addField(schemaTestEntityId, { name: 'notes', type: EntityFieldType.Text });
      const updated = await entities.getById(schemaTestEntityId);
      const fieldNames = updated.fields.map(f => f.name.toLowerCase());
      expect(fieldNames).toContain('notes');
    });

    it('should remove a field from the created entity', async () => {
      const { entities } = getServices();
      if (!schemaTestEntityId) {
        throw new Error('No schema test entity available — createEntity test must run first');
      }
      await entities.removeField(schemaTestEntityId, 'notes');
      const updated = await entities.getById(schemaTestEntityId);
      const fieldNames = updated.fields.map(f => f.name.toLowerCase());
      expect(fieldNames).not.toContain('notes');
    });

    it('should delete the created entity', async () => {
      const { entities } = getServices();
      if (!schemaTestEntityId) {
        throw new Error('No schema test entity available — createEntity test must run first');
      }
      await entities.deleteEntity(schemaTestEntityId);
      schemaTestEntityId = null;
    });

    afterAll(async () => {
      if (schemaTestEntityId) {
        const { entities } = getServices();
        await entities.deleteEntity(schemaTestEntityId).catch(() => {});
      }
    });
  });

  afterAll(async () => {
    const config = getTestConfig();
    if (!config.skipCleanup && createdRecordIds.length > 0 && testEntityId) {
      await cleanupTestEntityRecords(testEntityId, createdRecordIds);
    }
  });
});
