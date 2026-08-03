import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import {
  getServices,
  getTestConfig,
  setupUnifiedTests,
  cleanupTestEntityRecords,
  InitMode,
} from '../../config/unified-setup';
import { registerResource } from '../../utils/cleanup';
import {
  generateRandomString,
  generateRandomInt,
  generateRandomFloat,
  hasValidPagination,
} from '../../utils/helpers';
import { EntityV3Service } from '../../../../src/services/data-fabric/entities-v3';
import { EntityV3CreateRequest } from '../../../../src/models/data-fabric/entities-v3.types';
import {
  EntityFieldDataType,
  FieldDisplayType,
  FieldMetaData,
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
 * File fields are excluded because they require a separate upload API.
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

// entitiesV3 is only registered in v1 mode — v0 (legacy SDK) does not expose it.
const modes: InitMode[] = ['v1'];

describe.each(modes)('Data Fabric Entities v3 - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  let entitiesV3!: EntityV3Service;
  // A known-good entity used for the read/list surface (addressed by id and name).
  let readEntityId!: string;
  let readEntityName!: string;

  beforeAll(async () => {
    const services = getServices();
    if (!services.entitiesV3) {
      throw new Error(
        `entitiesV3 service is not available in "${mode}" init mode — it is registered in v1 mode only`
      );
    }
    entitiesV3 = services.entitiesV3;

    const config = getTestConfig();
    const list = await entitiesV3.getAll();
    if (list.length === 0) {
      throw new Error('No Data Fabric entities available in the test tenant — cannot run v3 read tests');
    }

    readEntityId = config.dataFabricTestEntityId ?? list[0].id;
    const meta = await entitiesV3.getById(readEntityId);
    readEntityName = meta.name;
  });

  describe('getAll', () => {
    it('should list entities in the tenant', async () => {
      const result = await entitiesV3.getAll();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return entities with valid metadata structure', async () => {
      const result = await entitiesV3.getAll();

      const entity = result[0];
      expect(typeof entity.id).toBe('string');
      expect(typeof entity.name).toBe('string');
      expect(typeof entity.displayName).toBe('string');
    });

    it('should filter the listing by entityClass', async () => {
      // entityClass narrows the listing server-side; the result is still a valid
      // (possibly empty) array of entity metadata.
      const result = await entitiesV3.getAll({ entityClass: 'CaseComposite' });

      expect(Array.isArray(result)).toBe(true);
      for (const entity of result) {
        expect(typeof entity.id).toBe('string');
      }
    });
  });

  describe('getAllWithChoiceSets', () => {
    it('should list entities together with choice sets using a start/limit window', async () => {
      const result = await entitiesV3.getAllWithChoiceSets({ start: 0, limit: 50 });

      expect(result).toBeDefined();
      if (result.entities) {
        expect(Array.isArray(result.entities)).toBe(true);
      }
      if (result.choicesets) {
        expect(Array.isArray(result.choicesets)).toBe(true);
      }
    });
  });

  describe('getFolderEntities', () => {
    it('should list tenant-level and folder-level entities together', async () => {
      const result = await entitiesV3.getFolderEntities();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getById', () => {
    it('should retrieve entity metadata by ID with operation methods attached', async () => {
      const result = await entitiesV3.getById(readEntityId);

      expect(result).toBeDefined();
      expect(result.id).toBe(readEntityId);
      expect(typeof result.name).toBe('string');

      // Bound operation methods must be attached to the response.
      expect(typeof result.getRecords).toBe('function');
      expect(typeof result.getRecord).toBe('function');
      expect(typeof result.query).toBe('function');
      expect(typeof result.insert).toBe('function');
      expect(typeof result.update).toBe('function');
      expect(typeof result.deleteRecord).toBe('function');
      expect(typeof result.delete).toBe('function');
    });
  });

  describe('getMetadata', () => {
    it('should retrieve entity metadata by name with operation methods attached', async () => {
      const result = await entitiesV3.getMetadata(readEntityName);

      expect(result).toBeDefined();
      expect(result.name).toBe(readEntityName);
      expect(typeof result.getRecords).toBe('function');
      expect(typeof result.insert).toBe('function');
    });
  });

  describe('getRecords', () => {
    it('should retrieve a page of records addressed by entity name', async () => {
      const result = await entitiesV3.getRecords(readEntityName);

      expect(result).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('should return a paginated response when pageSize is provided', async () => {
      const result = await entitiesV3.getRecords(readEntityName, { pageSize: 5 });

      expect(result).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBeLessThanOrEqual(5);
      expect(hasValidPagination(result)).toBe(true);
    });

    // Data Fabric record fields are user-defined schema columns and must be
    // returned exactly as stored — no camelCase renaming. The system Id field
    // is PascalCase `Id`.
    it('should return records with field names exactly as stored', async () => {
      const result = await entitiesV3.getRecords(readEntityName, { pageSize: 1 });

      if (result.items.length === 0) {
        throw new Error(
          `Entity "${readEntityName}" has no records — cannot verify field-name preservation. ` +
          'Set DATA_FABRIC_TEST_ENTITY_ID to an entity with at least one record.'
        );
      }

      const record = result.items[0];
      expect(Object.prototype.hasOwnProperty.call(record, 'Id')).toBe(true);
      expect(typeof record.Id).toBe('string');
    });
  });

  describe('query', () => {
    it('should query records with no filters', async () => {
      const result = await entitiesV3.query(readEntityName);

      expect(result).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(typeof result.totalCount).toBe('number');
    });

    it('should return a paginated response when pageSize is provided', async () => {
      const result = await entitiesV3.query(readEntityName, { pageSize: 2 });

      expect(result).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBeLessThanOrEqual(2);
      expect(hasValidPagination(result)).toBe(true);
    });
  });

  // Data-plane record lifecycle against an existing entity — runnable under PAT
  // (no schema-write scope required). Builds a schema-conformant record via the
  // typed v1 metadata, then exercises the v3 write surface addressed by name.
  describe('record lifecycle (insert -> read -> update -> delete)', () => {
    let lifecycleEntityId!: string;
    let lifecycleEntityName!: string;
    let lifecycleEntityMeta!: RawEntityGetResponse;
    let insertedRecordId: string | undefined;
    const createdRecordIds: string[] = [];

    beforeAll(async () => {
      const config = getTestConfig();
      lifecycleEntityId = config.dataFabricTestEntityId ?? readEntityId;
      if (!lifecycleEntityId) {
        throw new Error('No entity ID available for the v3 record lifecycle test. Set DATA_FABRIC_TEST_ENTITY_ID.');
      }
      // The typed v1 metadata gives strongly-typed fields for building a dummy record.
      const { entities } = getServices();
      lifecycleEntityMeta = await entities.getById(lifecycleEntityId);
      lifecycleEntityName = lifecycleEntityMeta.name;
    });

    afterAll(async () => {
      if (createdRecordIds.length > 0) {
        await cleanupTestEntityRecords(lifecycleEntityId, createdRecordIds);
      }
    });

    it('should insert a single record via insert', async () => {
      const data = await buildDummyRecord(lifecycleEntityMeta);
      const result = await entitiesV3.insert(lifecycleEntityName, data);

      expect(result).toBeDefined();
      expect(typeof result.Id).toBe('string');

      insertedRecordId = result.Id;
      createdRecordIds.push(result.Id);
      registerResource('entityRecords', {
        entityId: lifecycleEntityId,
        recordIds: [result.Id],
      });
    });

    it('should read the inserted record back via getRecord with field names unchanged', async () => {
      if (!insertedRecordId) {
        throw new Error('No inserted record available to read back');
      }

      const record = await entitiesV3.getRecord(lifecycleEntityName, insertedRecordId);

      expect(record).toBeDefined();
      expect(Object.prototype.hasOwnProperty.call(record, 'Id')).toBe(true);
      expect(record.Id).toBe(insertedRecordId);
    });

    it('should update the inserted record via update', async () => {
      if (!insertedRecordId) {
        throw new Error('No inserted record available to update');
      }

      const writableFields = getWritableFields(lifecycleEntityMeta.fields);
      if (writableFields.length === 0) {
        throw new Error(`Entity "${lifecycleEntityName}" has no writable fields to update`);
      }

      const field = writableFields[0];
      const result = await entitiesV3.update(lifecycleEntityName, insertedRecordId, {
        [field.name]: generateFieldValue(field),
      });

      expect(result).toBeDefined();
      expect(result.Id).toBe(insertedRecordId);
    });

    it('should delete the inserted record via deleteRecord', async () => {
      if (!insertedRecordId) {
        throw new Error('No inserted record available to delete');
      }

      const result = await entitiesV3.deleteRecord(lifecycleEntityName, insertedRecordId);

      expect(result).toBeDefined();

      // The record is gone — drop it from the cleanup list so afterAll does not
      // attempt to delete an already-deleted record.
      const idx = createdRecordIds.indexOf(insertedRecordId);
      if (idx !== -1) {
        createdRecordIds.splice(idx, 1);
      }
      insertedRecordId = undefined;
    });
  });

  // Schema-write operations (create/delete entity, field CRUD, composite members)
  // require the DataFabric.Schema.Write OAuth scope, which PAT tokens cannot hold
  // (insufficient_scope). This mirrors the skipped schema-write blocks in
  // entities.integration.test.ts. The body is written as it will run once the scope
  // is available: create a temporary entity, exercise the write surface, then tear
  // the entity down.
  describe.skip('entity schema + record lifecycle (requires DataFabric.Schema.Write scope)', () => {
    const createdEntityIds: string[] = [];
    const createdRecordIds: Array<{ entityId: string; recordId: string }> = [];

    afterAll(async () => {
      // Records first (cascade-safe), then the entities themselves.
      for (const { entityId, recordId } of createdRecordIds) {
        await entitiesV3.deleteRecord(entityId, recordId).catch(() => undefined);
      }
      for (const entityId of createdEntityIds) {
        await entitiesV3.deleteById(entityId).catch(() => undefined);
      }
    });

    it('should create an entity, insert/read/update/delete a record, then delete the entity', async () => {
      const name = `sdk_v3_${generateRandomString(8).toLowerCase()}`;
      const request: EntityV3CreateRequest = {
        displayName: `SDK V3 Test ${name}`,
        entityDefinition: {
          name,
          fields: [
            { name: 'Title', isRequired: true, fieldDataType: { name: EntityFieldDataType.STRING } },
            { name: 'Count', fieldDataType: { name: EntityFieldDataType.INTEGER } },
          ],
        },
      };

      const created = await entitiesV3.create(request);
      const entityId = typeof created === 'string' ? created : created.entityId;
      expect(typeof entityId).toBe('string');
      createdEntityIds.push(entityId);

      // Add a field through the schema-write surface.
      const fieldId = await entitiesV3.createField(entityId, {
        fieldDefinition: { name: 'Notes', fieldDataType: { name: EntityFieldDataType.STRING } },
      });
      expect(typeof fieldId).toBe('string');

      // Insert a record addressed by name.
      const inserted = await entitiesV3.insert(name, {
        Title: `Row_${generateRandomString(6)}`,
        Count: generateRandomInt(0, 1000),
      });
      expect(typeof inserted.Id).toBe('string');
      createdRecordIds.push({ entityId: name, recordId: inserted.Id });

      // Read it back with field names preserved.
      const record = await entitiesV3.getRecord(name, inserted.Id);
      expect(record.Id).toBe(inserted.Id);

      // Update it.
      const updated = await entitiesV3.update(name, inserted.Id, { Title: 'Updated' });
      expect(updated.Id).toBe(inserted.Id);

      // Delete the record, then remove it from the cleanup list.
      await entitiesV3.deleteRecord(name, inserted.Id);
      const idx = createdRecordIds.findIndex((r) => r.recordId === inserted.Id);
      if (idx !== -1) {
        createdRecordIds.splice(idx, 1);
      }

      // Tear the entity down.
      await entitiesV3.deleteById(entityId);
      const eidx = createdEntityIds.indexOf(entityId);
      if (eidx !== -1) {
        createdEntityIds.splice(eidx, 1);
      }
    });
  });

  // Autopilot requires the AI backend and an OAuth token; PAT tokens cannot reach it.
  // Written to run once those prerequisites are in place.
  describe.skip('autopilot (requires AI backend + OAuth)', () => {
    it('should return an autopilot action for a natural-language instruction', async () => {
      const result = await entitiesV3.manageWithAutopilot({
        query: 'Create a Customers entity with a name field',
      });

      expect(result).toBeDefined();
      expect(typeof result.isSuccess).toBe('boolean');
    });
  });
});
