import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import {
  getServices,
  getTestConfig,
  setupUnifiedTests,
  cleanupTestEntityRecords,
  InitMode,
} from '../../config/unified-setup';
import { registerResource } from '../../utils/cleanup';
import { generateRandomString, generateRandomInt, generateRandomFloat, hasValidPagination } from '../../utils/helpers';
import {
  EntityFieldDataType,
  EntityRecord,
  FieldDisplayType,
  FieldMetaData,
  QueryFilterOperator,
  RawEntityGetResponse,
} from '../../../../src/models/data-fabric/entities.types';
import { DATA_FABRIC_TENANT_FOLDER_ID } from '../../../../src/utils/constants/endpoints/data-fabric';

// Cache for choice set values to avoid repeated API calls within a test run
const choiceSetValueCache = new Map<string, any[]>();

/**
 * Fetches and caches choice set values for a given choice set ID.
 * When the target choice set lives in a folder (not tenant-level), pass that
 * folder's key so the lookup carries the X-UIPATH-FolderKey header — otherwise
 * the server returns empty values and required CS fields end up undefined.
 */
async function getChoiceSetValues(choiceSetId: string, folderKey?: string): Promise<any[]> {
  const cacheKey = `${folderKey ?? ''}::${choiceSetId}`;
  if (choiceSetValueCache.has(cacheKey)) {
    return choiceSetValueCache.get(cacheKey)!;
  }
  const { choiceSets } = getServices();
  const result = await choiceSets.getById(choiceSetId, folderKey ? { folderKey } : undefined);
  const values = result.items || [];
  choiceSetValueCache.set(cacheKey, values);
  return values;
}

/**
 * Generates a dummy value for a given entity field based on its data type.
 * Handles all EntityFieldDataType values so tests work regardless of entity schema.
 */
function generateFieldValue(field: FieldMetaData): any {
  const { fieldDataType } = field;

  if (!fieldDataType) return `Test_${generateRandomString(6)}`;

  switch (fieldDataType.name) {
    case EntityFieldDataType.STRING:
      return `Test_${generateRandomString(8)}`;
    case EntityFieldDataType.MULTILINE_TEXT:
      return `Test multiline\n${generateRandomString(12)}`;
    case EntityFieldDataType.MULTILINE_MAX:
      return `Test multiline max\n${generateRandomString(64)}`;
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
      f.fieldDataType?.name !== EntityFieldDataType.UUID
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

      // When the target CS lives in a folder, the lookup needs that folder's
      // key to return values. Tenant-level CS targets carry the all-zeros
      // folderId — treat that as "no folder header".
      const csFolderId = field.referenceChoiceSet?.folderId;
      const csFolderKey = csFolderId && csFolderId !== DATA_FABRIC_TENANT_FOLDER_ID ? csFolderId : undefined;
      const values = await getChoiceSetValues(choiceSetId, csFolderKey);
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

describe.each(modes)('Data Fabric Entities Records - Integration Tests [%s]', (mode) => {
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
        // Prefer a stable entity for the fallback id — the entities-schema file
        // runs on a parallel worker and can delete its transient sdk_* entities
        // mid-run.
        testEntityId = result.find((e) => !e.name.startsWith('sdk_'))?.id ?? result[0].id;
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
      expect(typeof entity.deleteRecord).toBe('function');
      expect(typeof entity.getAllRecords).toBe('function');
      expect(typeof entity.getRecord).toBe('function');
      expect(typeof entity.downloadAttachment).toBe('function');
    });

    // The Data Fabric entity list is scoped exclusively: omitting folderKey returns
    // only tenant entities; passing folderKey returns only entities in that folder.
    // The two sets are disjoint.
    it('should return only folder-scoped entities when folderKey is provided', async () => {
      const { entities } = getServices();
      const folderKey = getTestConfig().folderKey;

      if (!folderKey) {
        throw new Error('INTEGRATION_TEST_FOLDER_KEY is required to exercise folder-scoped getAll');
      }

      const [tenantEntities, folderEntities] = await Promise.all([
        entities.getAll(),
        entities.getAll({ folderKey }),
      ]);

      expect(Array.isArray(folderEntities)).toBe(true);

      // Every folder-scoped entity carries the requested folder key
      for (const entity of folderEntities) {
        expect(entity.folderId).toBe(folderKey);
      }

      // Tenant scope and folder scope are disjoint — no entity appears in both
      const folderIds = new Set(folderEntities.map((e) => e.id));
      for (const tenantEntity of tenantEntities) {
        expect(folderIds.has(tenantEntity.id)).toBe(false);
      }
    });

    // includeFolderEntities switches to the v2 endpoint, which returns tenant-level and
    // folder-level entities together — a superset of the default tenant-only result.
    // Requires the OR.Users OAuth scope on the integration token.
    it('should return tenant and folder entities together when includeFolderEntities is true', async () => {
      const { entities } = getServices();

      const [tenantEntities, allEntities] = await Promise.all([
        entities.getAll(),
        entities.getAll({ includeFolderEntities: true }),
      ]);

      expect(Array.isArray(allEntities)).toBe(true);

      // The entities-schema file runs on a parallel worker and creates/deletes
      // transient sdk_* entities; one deleted between the two list calls above
      // would break the superset check, so compare stable entities only.
      const stableTenantEntities = tenantEntities.filter((e) => !e.name.startsWith('sdk_'));

      // The combined list is a superset of the tenant-only list
      expect(allEntities.length).toBeGreaterThanOrEqual(stableTenantEntities.length);

      const allIds = new Set(allEntities.map((e) => e.id));
      for (const tenantEntity of stableTenantEntities) {
        expect(allIds.has(tenantEntity.id)).toBe(true);
      }

      // Each entity still carries metadata with methods attached
      for (const entity of allEntities) {
        expect(entity.id).toBeDefined();
        expect(typeof entity.getAllRecords).toBe('function');
      }
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
      expect(field.fieldDataType?.name).toBeDefined();
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
      expect(typeof result.deleteRecord).toBe('function');
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

      // Build update payloads: each must include `Id` plus at least one updated field.
      // Skip ChoiceSet fields — they need a numeric CS-value id, not the string
      // that generateFieldValue would fall back to; buildDummyRecord already covers
      // that path for full-record inserts.
      const updateField = getWritableFields(entityMetadata.fields).find(
        (f) =>
          f.fieldDisplayType !== FieldDisplayType.ChoiceSetSingle &&
          f.fieldDisplayType !== FieldDisplayType.ChoiceSetMultiple,
      );
      const updateData: EntityRecord[] = serviceLevelRecordIds.map((id) => {
        const updates = { Id: id } as EntityRecord;
        if (updateField) {
          updates[updateField.name] = generateFieldValue(updateField);
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

      const updateField = getWritableFields(entity.fields).find(
        (f) =>
          f.fieldDisplayType !== FieldDisplayType.ChoiceSetSingle &&
          f.fieldDisplayType !== FieldDisplayType.ChoiceSetMultiple,
      );
      const updateData: EntityRecord[] = entityMethodRecordIds.map((id) => {
        const updates = { Id: id } as EntityRecord;
        if (updateField) {
          updates[updateField.name] = generateFieldValue(updateField);
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

  describe('importRecordsById', () => {
    it('should import records from a CSV blob', async () => {
      const { entities } = getServices();
      const config = getTestConfig();
      const entityId = config.dataFabricTestEntityId || testEntityId;

      if (!entityId) {
        throw new Error('No entity ID available for testing. Set DATA_FABRIC_TEST_ENTITY_ID.');
      }

      if (entityMetadata?.id !== entityId) {
        entityMetadata = await entities.getById(entityId);
      }

      // Build CSV from writable string fields
      const writableFields = getWritableFields(entityMetadata.fields).filter(
        f => f.fieldDataType?.name === EntityFieldDataType.STRING
      );

      if (writableFields.length === 0) {
        throw new Error('No string fields available for bulk import test');
      }

      const fieldName = writableFields[0].name;
      const importedValues = [`BulkImport_${generateRandomString(8)}`, `BulkImport_${generateRandomString(8)}`];
      const csvContent = `${fieldName}\n${importedValues.join('\n')}`;
      const csvBlob = new Blob([csvContent], { type: 'text/csv' });
      const result = await entities.importRecordsById(entityId, csvBlob);

      expect(result).toBeDefined();
      expect(typeof result.totalRecords).toBe('number');
      expect(typeof result.insertedRecords).toBe('number');
      expect(result.totalRecords).toBeGreaterThanOrEqual(0);

      // The import response carries counts, not record IDs — resolve the IDs of
      // the rows this test created so the afterAll cleanup can delete them.
      // Untracked imports previously accumulated in the test entity forever.
      const importedRecords = await Promise.all(
        importedValues.map((value) =>
          entities.queryRecordsById(entityId, {
            filterGroup: {
              queryFilters: [{ fieldName, operator: QueryFilterOperator.Equals, value }],
            },
          }),
        ),
      );
      const importedIds = importedRecords.flatMap((r) => r.items.map((item) => item.Id));
      createdRecordIds.push(...importedIds);
      registerResource('entityRecords', { entityId, recordIds: importedIds });
    });
  });

  // ─── Single Record Delete ─────────────────────────────────────────────────

  describe('deleteRecordById (service-level)', () => {
    it('should delete a single record using deleteRecordById', async () => {
      const { entities } = getServices();
      const config = getTestConfig();

      const entityId = config.dataFabricTestEntityId || testEntityId;

      if (!entityId) {
        throw new Error('No entity ID available for testing. Set DATA_FABRIC_TEST_ENTITY_ID.');
      }

      if (entityMetadata?.id !== entityId) {
        entityMetadata = await entities.getById(entityId);
      }

      const testData = await buildDummyRecord(entityMetadata);
      const inserted = await entities.insertRecordById(entityId, testData);

      expect(inserted).toBeDefined();
      expect(inserted.Id).toBeDefined();
      createdRecordIds.push(inserted.Id);
      registerResource('entityRecords', { entityId, recordIds: [inserted.Id] });

      await entities.deleteRecordById(entityId, inserted.Id);

      const idx = createdRecordIds.indexOf(inserted.Id);
      if (idx !== -1) createdRecordIds.splice(idx, 1);
    });

    it('should throw for a non-existent record', async () => {
      const { entities } = getServices();
      const config = getTestConfig();

      const entityId = config.dataFabricTestEntityId || testEntityId;

      if (!entityId) {
        throw new Error('No entity ID available for testing');
      }

      await expect(
        entities.deleteRecordById(entityId, '00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow();
    });
  });

  describe('deleteRecord (entity-level method)', () => {
    it('should delete a single record via entity.deleteRecord', async () => {
      const { entities } = getServices();
      const config = getTestConfig();

      const entityId = config.dataFabricTestEntityId || testEntityId;

      if (!entityId) {
        throw new Error('No entity ID available for testing');
      }

      const entity = await entities.getById(entityId);

      const testData = await buildDummyRecord(entity);
      const inserted = await entity.insertRecord(testData);

      expect(inserted).toBeDefined();
      expect(inserted.Id).toBeDefined();
      createdRecordIds.push(inserted.Id);
      registerResource('entityRecords', { entityId, recordIds: [inserted.Id] });

      await entity.deleteRecord(inserted.Id);

      const idx = createdRecordIds.indexOf(inserted.Id);
      if (idx !== -1) createdRecordIds.splice(idx, 1);
    });
  });

  // ─── Folder-scoped record CRUD ────────────────────────────────────────────
  // Mirrors the tenant-scope record CRUD block above, but against a folder-scoped
  // entity (DATA_FABRIC_TEST_FOLDER_ENTITY_ID + INTEGRATION_TEST_FOLDER_KEY).
  // Record CRUD works with PAT auth; schema create/delete on the folder entity
  // is NOT exercised here (lives in entities-schema.integration.test.ts).
  describe('Folder-scoped record CRUD', () => {
    let folderEntityId!: string;
    let folderKey!: string;
    let folderEntityMetadata!: RawEntityGetResponse;
    const folderRecordIds: string[] = [];

    beforeAll(async () => {
      const config = getTestConfig();
      if (!config.folderKey) {
        throw new Error('INTEGRATION_TEST_FOLDER_KEY is required for folder-scoped record CRUD tests');
      }
      if (!config.dataFabricTestFolderEntityId) {
        throw new Error('DATA_FABRIC_TEST_FOLDER_ENTITY_ID is required — set to the UUID of a folder-scoped entity in the same folder');
      }
      folderKey = config.folderKey;
      folderEntityId = config.dataFabricTestFolderEntityId;

      // Fetch schema once so per-test record bodies match the entity's shape.
      const { entities } = getServices();
      folderEntityMetadata = await entities.getById(folderEntityId, { folderKey });
    });

    it('should insert a single record with folderKey via insertRecordById', async () => {
      const { entities } = getServices();
      const data = await buildDummyRecord(folderEntityMetadata);
      const result = await entities.insertRecordById(folderEntityId, data, { folderKey });

      expect(result).toBeDefined();
      expect(result.Id).toBeDefined();
      folderRecordIds.push(result.Id);
    });

    it('should batch-insert records with folderKey via insertRecordsById', async () => {
      const { entities } = getServices();
      const batch = await Promise.all([
        buildDummyRecord(folderEntityMetadata),
        buildDummyRecord(folderEntityMetadata),
      ]);

      const result = await entities.insertRecordsById(folderEntityId, batch, { folderKey });

      expect(result.successRecords).toBeDefined();
      expect(result.successRecords.length).toBe(batch.length);

      const ids = result.successRecords.map((r) => r.Id).filter(Boolean) as string[];
      folderRecordIds.push(...ids);
    });

    it('should get a single record with folderKey via getRecordById', async () => {
      const { entities } = getServices();
      const record = await entities.getRecordById(folderEntityId, folderRecordIds[0], { folderKey });

      expect(record).toBeDefined();
      expect(record.Id).toBe(folderRecordIds[0]);
    });

    it('should list paginated records with folderKey via getAllRecords', async () => {
      const { entities } = getServices();
      const result = await entities.getAllRecords(folderEntityId, { folderKey, pageSize: 10 });

      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(hasValidPagination(result)).toBe(true);
    });

    it('should query records with folderKey via queryRecordsById', async () => {
      const { entities } = getServices();
      const result = await entities.queryRecordsById(folderEntityId, {
        folderKey,
        filterGroup: {
          queryFilters: [
            { fieldName: 'Id', operator: QueryFilterOperator.Equals, value: folderRecordIds[0] },
          ],
        },
      });

      expect(Array.isArray(result.items)).toBe(true);
      // The folder header must reach the server for the row to be retrievable; the
      // filter narrows to the record we just inserted in this run.
      expect(result.items.some((r) => r.Id === folderRecordIds[0])).toBe(true);
    });

    it('should update a record with folderKey via updateRecordById', async () => {
      const { entities } = getServices();
      const patch = await buildDummyRecord(folderEntityMetadata);
      const result = await entities.updateRecordById(folderEntityId, folderRecordIds[0], patch, { folderKey });

      expect(result).toBeDefined();
      expect(result.Id).toBe(folderRecordIds[0]);
    });

    it('should batch-update records with folderKey via updateRecordsById', async () => {
      const { entities } = getServices();
      const updates: EntityRecord[] = await Promise.all(
        folderRecordIds.slice(1).map(async (id) => {
          const patch = await buildDummyRecord(folderEntityMetadata);
          return { Id: id, ...patch } as EntityRecord;
        }),
      );
      if (updates.length === 0) {
        throw new Error('No batch-inserted records to update — prior insert test must have failed');
      }

      const result = await entities.updateRecordsById(folderEntityId, updates, { folderKey });

      expect(result.successRecords).toBeDefined();
      expect(result.successRecords.length).toBe(updates.length);
    });

    it('should delete a single record with folderKey via deleteRecordById', async () => {
      const { entities } = getServices();
      const idToDelete = folderRecordIds.pop()!;

      await entities.deleteRecordById(folderEntityId, idToDelete, { folderKey });

      // Verify gone via queryRecordsById — the deleted Id should not appear.
      const result = await entities.queryRecordsById(folderEntityId, {
        folderKey,
        filterGroup: {
          queryFilters: [
            { fieldName: 'Id', operator: QueryFilterOperator.Equals, value: idToDelete },
          ],
        },
      });
      expect(result.items.some((r) => r.Id === idToDelete)).toBe(false);
    });

    it('should batch-delete records with folderKey via deleteRecordsById', async () => {
      const { entities } = getServices();
      if (folderRecordIds.length === 0) {
        throw new Error('No folder records to batch-delete — prior insert tests may have failed to track IDs');
      }

      const result = await entities.deleteRecordsById(
        folderEntityId,
        [...folderRecordIds],
        { folderKey },
      );

      expect(result.successRecords).toBeDefined();
      folderRecordIds.length = 0;
    });

    afterAll(async () => {
      const config = getTestConfig();
      if (config.skipCleanup) return;
      const { entities } = getServices();

      // Records only — the test entity is owned by the tenant, not created here.
      if (folderRecordIds.length > 0) {
        await entities
          .deleteRecordsById(folderEntityId, folderRecordIds, { folderKey })
          .catch(() => undefined);
      }
    });
  });

  // ─── Cleanup ──────────────────────────────────────────────────────────────

  afterAll(async () => {
    const config = getTestConfig();
    if (!config.skipCleanup) {
      if (createdRecordIds.length > 0 && testEntityId) {
        await cleanupTestEntityRecords(testEntityId, createdRecordIds);
      }
    }
  });
});
