import { describe, it, expect, afterAll } from 'vitest';
import {
  getServices,
  getTestConfig,
  setupUnifiedTests,
  InitMode,
} from '../../config/unified-setup';
import { registerResource } from '../../utils/cleanup';
import { generateRandomString } from '../../utils/helpers';
import {
  EntityFieldDataType,
  FieldDisplayType,
} from '../../../../src/models/data-fabric/entities.types';

const modes: InitMode[] = ['v0', 'v1'];

describe.each(modes)('Data Fabric Entities Schema - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  const createdEntityIds: string[] = [];

  // ─── Schema Management ────────────────────────────────────────────────────

  // Entity schema write operations require write-schema PAT scope — not supported yet
  describe('create', () => {
    it('should create a new entity and return its ID', async () => {
      const { entities } = getServices();
      const name = `sdk_test_${generateRandomString(8).toLowerCase()}`;

      const entityId = await entities.create(name, [
        { name: 'title', displayName: 'Title', type: EntityFieldDataType.STRING, isRequired: true },
        { name: 'count', displayName: 'Count', type: EntityFieldDataType.DECIMAL, decimalPrecision: 0 },
      ], { displayName: `SDK Test Entity ${name}`, description: 'Created by integration test' });

      expect(typeof entityId).toBe('string');
      expect(entityId.length).toBeGreaterThan(0);
      createdEntityIds.push(entityId);
    });

    it('should create entity with RELATIONSHIP and FILE fields and verify metadata', async () => {
      const { entities } = getServices();
      const stamp = generateRandomString(8).toLowerCase();

      // 1. Create the target entity. The platform auto-adds a primary-key `Id`
      //    field we'll use as the FK target.
      const targetName = `sdk_target_${stamp}`;
      const targetId = await entities.create(targetName, [
        { name: 'label', type: EntityFieldDataType.STRING },
      ]);
      createdEntityIds.push(targetId);

      // 2. Find the primary-key field UUID on the target (referenceFieldId).
      const targetMeta = await entities.getById(targetId);
      const pkField = targetMeta.fields.find(f => f.isPrimaryKey);
      if (!pkField?.id) {
        throw new Error(`Target entity ${targetId} has no primary-key field — cannot bind a RELATIONSHIP to it`);
      }

      // 3. Create the source entity with a RELATIONSHIP field bound to target.Id
      const sourceName = `sdk_source_${stamp}`;
      const sourceId = await entities.create(sourceName, [
        { name: 'name', type: EntityFieldDataType.STRING },
        {
          name: 'parent',
          type: EntityFieldDataType.RELATIONSHIP,
          referenceEntityId: targetId,
          referenceFieldId: pkField.id,
        },
        { name: 'attachfile', type: EntityFieldDataType.FILE },
      ]);
      createdEntityIds.push(sourceId);

      // 4. Read it back and verify both fields landed correctly. The server
      //    resolves `referenceEntity { id }` → a full entity reference
      const sourceMeta = await entities.getById(sourceId);
      const parentField = sourceMeta.fields.find(f => f.name === 'parent');
      expect(parentField).toBeDefined();
      expect(parentField?.isForeignKey).toBe(true);
      expect(parentField?.referenceEntity?.id).toBe(targetId);
      expect(parentField?.referenceField?.id).toBe(pkField.id);

      const fileField = sourceMeta.fields.find(f => f.name === 'attachfile');
      expect(fileField).toBeDefined();
      expect(fileField?.fieldDisplayType).toBe(FieldDisplayType.File);
      // FILE fields are wired to the internal EntityAttachment blob-holder entity,
      // not to a user-created reference — verify it's not pointing at our target.
      expect(fileField?.referenceEntity?.name).toBe('EntityAttachment');
      expect(fileField?.referenceEntity?.id).not.toBe(targetId);
    }, 90_000);
  });

  describe('updateById', () => {
    it('should update entity display name and description', async () => {
      const { entities } = getServices();
      const name = `sdk_test_${generateRandomString(8).toLowerCase()}`;
      const entityId = await entities.create(name, [], { displayName: `Original ${name}`, description: 'Original description' });
      createdEntityIds.push(entityId);

      const newDisplayName = `Updated ${name}`;
      await entities.updateById(entityId, {
        displayName: newDisplayName,
        description: 'Updated description',
      });

      const updated = await entities.getById(entityId);
      expect(updated.displayName).toBe(newDisplayName);
      expect(updated.description).toBe('Updated description');
    });

    it('should add a new field to an existing entity', async () => {
      const { entities } = getServices();
      const name = `sdk_test_${generateRandomString(8).toLowerCase()}`;
      const entityId = await entities.create(name, [
        { name: 'baseField', type: EntityFieldDataType.STRING },
      ]);
      createdEntityIds.push(entityId);

      await entities.updateById(entityId, {
        addFields: [{ name: 'newField', type: EntityFieldDataType.DECIMAL, decimalPrecision: 0 }],
      });

      const updated = await entities.getById(entityId);
      const fieldNames = updated.fields.map(f => f.name);
      expect(fieldNames).toContain('newField');
    }, 60_000);

    it('should remove a field from an existing entity', async () => {
      const { entities } = getServices();
      const name = `sdk_test_${generateRandomString(8).toLowerCase()}`;
      const entityId = await entities.create(name, [
        { name: 'keepField', type: EntityFieldDataType.STRING },
        { name: 'removeMe', type: EntityFieldDataType.DECIMAL, decimalPrecision: 0 },
      ]);
      createdEntityIds.push(entityId);

      await entities.updateById(entityId, {
        removeFields: [{ name: 'removeMe' }],
      });

      const updated = await entities.getById(entityId);
      const fieldNames = updated.fields.map(f => f.name);
      expect(fieldNames).not.toContain('removeMe');
      expect(fieldNames).toContain('keepField');
    });

    it('should update an existing field metadata', async () => {
      const { entities } = getServices();
      const name = `sdk_test_${generateRandomString(8).toLowerCase()}`;
      const entityId = await entities.create(name, [
        { name: 'updatableField', displayName: 'Original Name', type: EntityFieldDataType.STRING },
      ]);
      createdEntityIds.push(entityId);

      // Get the raw entity to find the field ID (transformData renames sqlType but preserves id)
      const before = await entities.getById(entityId);
      const field = before.fields.find(f => f.name === 'updatableField');
      if (!field?.id) {
        throw new Error('Could not find updatable_field id in entity schema');
      }

      await entities.updateById(entityId, {
        updateFields: [{ id: field.id, displayName: 'Updated Name', isRequired: true }],
      });

      const after = await entities.getById(entityId);
      const updatedField = after.fields.find(f => f.name === 'updatableField');
      expect(updatedField).toBeDefined();
      expect(updatedField?.displayName).toBe('Updated Name');
      expect(updatedField?.isRequired).toBe(true);
    });

    it('should add, update, and remove fields in a single call', async () => {
      const { entities } = getServices();
      const name = `sdk_test_${generateRandomString(8).toLowerCase()}`;
      const entityId = await entities.create(name, [
        { name: 'toUpdate', displayName: 'Before Update', type: EntityFieldDataType.STRING },
        { name: 'toRemove', type: EntityFieldDataType.DECIMAL, decimalPrecision: 0 },
      ]);
      createdEntityIds.push(entityId);

      const before = await entities.getById(entityId);
      const fieldToUpdate = before.fields.find(f => f.name === 'toUpdate');
      if (!fieldToUpdate?.id) {
        throw new Error('Could not find to_update field id');
      }

      await entities.updateById(entityId, {
        addFields: [{ name: 'newAddition', type: EntityFieldDataType.BOOLEAN }],
        updateFields: [{ id: fieldToUpdate.id, displayName: 'After Update' }],
        removeFields: [{ name: 'toRemove' }],
      });

      const after = await entities.getById(entityId);
      const fieldNames = after.fields.map(f => f.name);

      // new field was added
      expect(fieldNames).toContain('newAddition');
      // removed field is gone
      expect(fieldNames).not.toContain('toRemove');
      // updated field has new display name
      const updated = after.fields.find(f => f.name === 'toUpdate');
      expect(updated?.displayName).toBe('After Update');
    });
  });

  describe('sqlType constraint defaults', () => {
    it('should create STRING field with default lengthLimit 200', async () => {
      const { entities } = getServices();
      const name = `sdk_str_${generateRandomString(8).toLowerCase()}`;
      const entityId = await entities.create(name, [
        { name: 'strField', type: EntityFieldDataType.STRING },
      ]);
      createdEntityIds.push(entityId);

      const entity = await entities.getById(entityId);
      const field = entity.fields.find(f => f.name === 'strField');
      expect(field).toBeDefined();
      expect(field?.fieldDataType.lengthLimit).toBe(200);
    });

    it('should create STRING field with user-provided lengthLimit', async () => {
      const { entities } = getServices();
      const name = `sdk_str_${generateRandomString(8).toLowerCase()}`;
      const entityId = await entities.create(name, [
        { name: 'strField', type: EntityFieldDataType.STRING, lengthLimit: 500 },
      ]);
      createdEntityIds.push(entityId);

      const entity = await entities.getById(entityId);
      const field = entity.fields.find(f => f.name === 'strField');
      expect(field?.fieldDataType.lengthLimit).toBe(500);
    });

    it('should create MULTILINE_TEXT field with default lengthLimit 200', async () => {
      const { entities } = getServices();
      const name = `sdk_ml_${generateRandomString(8).toLowerCase()}`;
      const entityId = await entities.create(name, [
        { name: 'mlField', type: EntityFieldDataType.MULTILINE_TEXT },
      ]);
      createdEntityIds.push(entityId);

      const entity = await entities.getById(entityId);
      const field = entity.fields.find(f => f.name === 'mlField');
      expect(field?.fieldDataType.lengthLimit).toBe(200);
    });

    it('should create MULTILINE_MAX field with default lengthLimit 128 KB', async () => {
      const { entities } = getServices();
      const name = `sdk_mlmax_${generateRandomString(8).toLowerCase()}`;
      const entityId = await entities.create(name, [
        { name: 'mlmaxField', type: EntityFieldDataType.MULTILINE_MAX },
      ]);
      createdEntityIds.push(entityId);

      const entity = await entities.getById(entityId);
      const field = entity.fields.find(f => f.name === 'mlmaxField');
      expect(field?.fieldDataType.name).toBe(EntityFieldDataType.MULTILINE_MAX);
      expect(field?.fieldDataType.lengthLimit).toBe(128 * 1024);
    });

    it('should create DECIMAL field with correct default constraints', async () => {
      const { entities } = getServices();
      const name = `sdk_dec_${generateRandomString(8).toLowerCase()}`;
      const entityId = await entities.create(name, [
        { name: 'decField', type: EntityFieldDataType.DECIMAL },
      ]);
      createdEntityIds.push(entityId);

      const entity = await entities.getById(entityId);
      const field = entity.fields.find(f => f.name === 'decField');
      expect(field?.fieldDataType.lengthLimit).toBe(1000);
      expect(field?.fieldDataType.decimalPrecision).toBe(2);
      expect(field?.fieldDataType.maxValue).toBe(1000000000000);
      expect(field?.fieldDataType.minValue).toBe(-1000000000000);
    });

    it('should create DECIMAL field with user-provided constraints', async () => {
      const { entities } = getServices();
      const name = `sdk_dec_${generateRandomString(8).toLowerCase()}`;
      const entityId = await entities.create(name, [
        {
          name: 'decField',
          type: EntityFieldDataType.DECIMAL,
          decimalPrecision: 4,
          maxValue: 99999,
          minValue: -99999,
        },
      ]);
      createdEntityIds.push(entityId);

      const entity = await entities.getById(entityId);
      const field = entity.fields.find(f => f.name === 'decField');
      expect(field?.fieldDataType.decimalPrecision).toBe(4);
      expect(field?.fieldDataType.maxValue).toBe(99999);
      expect(field?.fieldDataType.minValue).toBe(-99999);
    });

    it('should create BOOLEAN field with fixed lengthLimit 100', async () => {
      const { entities } = getServices();
      const name = `sdk_bit_${generateRandomString(8).toLowerCase()}`;
      const entityId = await entities.create(name, [
        { name: 'boolField', type: EntityFieldDataType.BOOLEAN },
      ]);
      createdEntityIds.push(entityId);

      const entity = await entities.getById(entityId);
      const field = entity.fields.find(f => f.name === 'boolField');
      expect(field?.fieldDataType.lengthLimit).toBe(100);
    });

    it('should create DATE field with fixed lengthLimit 1000', async () => {
      const { entities } = getServices();
      const name = `sdk_date_${generateRandomString(8).toLowerCase()}`;
      const entityId = await entities.create(name, [
        { name: 'dateField', type: EntityFieldDataType.DATE },
      ]);
      createdEntityIds.push(entityId);

      const entity = await entities.getById(entityId);
      const field = entity.fields.find(f => f.name === 'dateField');
      expect(field?.fieldDataType.lengthLimit).toBe(1000);
    });

    it('should create DATETIME_WITH_TZ field with fixed lengthLimit 1000', async () => {
      const { entities } = getServices();
      const name = `sdk_dtz_${generateRandomString(8).toLowerCase()}`;
      const entityId = await entities.create(name, [
        { name: 'dtzField', type: EntityFieldDataType.DATETIME_WITH_TZ },
      ]);
      createdEntityIds.push(entityId);

      const entity = await entities.getById(entityId);
      const field = entity.fields.find(f => f.name === 'dtzField');
      expect(field?.fieldDataType.lengthLimit).toBe(1000);
    });

    it('should allow updating STRING field lengthLimit without "Field type cannot be changed" error', async () => {
      const { entities } = getServices();
      const name = `sdk_upd_${generateRandomString(8).toLowerCase()}`;
      const entityId = await entities.create(name, [
        { name: 'strField', type: EntityFieldDataType.STRING },
      ]);
      createdEntityIds.push(entityId);

      const before = await entities.getById(entityId);
      const field = before.fields.find(f => f.name === 'strField');
      if (!field?.id) {
        throw new Error('Could not find str_field id in entity schema');
      }

      // Must not throw "Field type cannot be changed"
      await entities.updateById(entityId, {
        updateFields: [{ id: field.id, lengthLimit: 500 }],
      });

      const after = await entities.getById(entityId);
      const updated = after.fields.find(f => f.name === 'strField');
      expect(updated?.fieldDataType.lengthLimit).toBe(500);
    }, 60_000);

    it('should allow updating DECIMAL field constraints via updateById', async () => {
      const { entities } = getServices();
      const name = `sdk_upddec_${generateRandomString(8).toLowerCase()}`;
      const entityId = await entities.create(name, [
        { name: 'decField', type: EntityFieldDataType.DECIMAL },
      ]);
      createdEntityIds.push(entityId);

      const before = await entities.getById(entityId);
      const field = before.fields.find(f => f.name === 'decField');
      if (!field?.id) {
        throw new Error('Could not find dec_field id in entity schema');
      }

      await entities.updateById(entityId, {
        updateFields: [{ id: field.id, decimalPrecision: 4, maxValue: 9999, minValue: -9999 }],
      });

      const after = await entities.getById(entityId);
      const updated = after.fields.find(f => f.name === 'decField');
      expect(updated?.fieldDataType.decimalPrecision).toBe(4);
      expect(updated?.fieldDataType.maxValue).toBe(9999);
      expect(updated?.fieldDataType.minValue).toBe(-9999);
    }, 60_000);

    it('should apply default lengthLimit (200) when STRING lengthLimit is omitted, confirmed via GET', async () => {
      const { entities } = getServices();
      const name = `sdk_str_default_${generateRandomString(8).toLowerCase()}`;

      const entityId = await entities.create(name, [
        { name: 'strField', type: EntityFieldDataType.STRING },
      ]);
      createdEntityIds.push(entityId);

      const entity = await entities.getById(entityId);
      const field = entity.fields.find(f => f.name === 'strField');
      // Default is applied client-side and round-trips through the API as 200
      expect(field?.fieldDataType.lengthLimit).toBe(200);
    }, 60_000);

  });

  // Custom user-defined RELATIONSHIP fields must follow the same expansion rules as
  // system reference fields. Placed after sqlType so both modes hit a warm DF backend
  // (avoids read-after-write flakes on the first schema-write of the session).
  describe('RELATIONSHIP field expansion', () => {
    it('should expand a custom RELATIONSHIP field at each expansionLevel (0-3)', async () => {
      const { entities } = getServices();
      const stamp = generateRandomString(8).toLowerCase();

      // 1. Target entity with a user-defined string field we can assert on at L2+.
      const targetId = await entities.create(`sdk_target_${stamp}`, [
        { name: 'label', type: EntityFieldDataType.STRING, isRequired: true },
      ]);
      createdEntityIds.push(targetId);

      const targetMeta = await entities.getById(targetId);
      const targetPk = targetMeta.fields.find(f => f.isPrimaryKey);
      if (!targetPk?.id) {
        throw new Error(`Target entity ${targetId} has no primary-key field`);
      }

      // 2. Source entity with a RELATIONSHIP field bound to target.Id.
      const sourceId = await entities.create(`sdk_source_${stamp}`, [
        { name: 'name', type: EntityFieldDataType.STRING },
        {
          name: 'parent',
          type: EntityFieldDataType.RELATIONSHIP,
          referenceEntityId: targetId,
          referenceFieldId: targetPk.id,
        },
      ]);
      createdEntityIds.push(sourceId);

      // 3. Insert a target record so the FK has something to resolve.
      const labelValue = `Target_${stamp}`;
      const targetInsert = await entities.insertRecordById(targetId, { label: labelValue });
      const targetRecordId = targetInsert.Id;
      registerResource('entityRecords', { entityId: targetId, recordIds: [targetRecordId] });

      // 4. Insert the source record with the FK populated.
      const sourceInsert = await entities.insertRecordById(sourceId, {
        name: `Source_${stamp}`,
        parent: targetRecordId,
      });
      registerResource('entityRecords', { entityId: sourceId, recordIds: [sourceInsert.Id] });

      // 5. Query the source at every expansion level.
      const levels = [0, 1, 2, 3] as const;
      const responses = await Promise.all(
        levels.map(level => entities.queryRecordsById(sourceId, { expansionLevel: level, pageSize: 10 })),
      );

      const sourceRecords = responses.map(r =>
        (r.items as Record<string, any>[]).find(item => item.Id === sourceInsert.Id),
      );
      sourceRecords.forEach((rec, i) => {
        expect(rec, `expansionLevel=${levels[i]} did not return the inserted source record`).toBeDefined();
      });
      const [l0, l1, l2, l3] = sourceRecords as Record<string, any>[];

      // L0: FK is the raw target record Id string.
      expect(typeof l0.parent).toBe('string');
      expect(l0.parent).toBe(targetRecordId);

      // L1+: FK inflates into an object envelope carrying the target Id.
      for (const [level, rec] of [[1, l1], [2, l2], [3, l3]] as const) {
        expect(typeof rec.parent, `L${level} parent should be object`).toBe('object');
        expect(rec.parent, `L${level} parent should not be null`).not.toBeNull();
        expect(rec.parent, `L${level} parent should carry target Id`).toHaveProperty('Id', targetRecordId);
      }

      // L2 surfaces the user-defined `label` field from the target record.
      expect(l2.parent.label).toBe(labelValue);

      // L3 cannot shrink relative to L2.
      expect(Object.keys(l3.parent).length).toBeGreaterThanOrEqual(Object.keys(l2.parent).length);
    }, 150_000);
  });

  // Verifies the MULTILINE_MAX round-trip end to end: create + insert + read the
  // full value back via getRecordById (v2 read). The list endpoint's size-marker
  // projection is not asserted — the server threshold is inconsistent and the
  // consumer-facing guarantee is the full-content read.
  describe('MULTILINE_MAX field lifecycle', () => {
    it('should round-trip a MULTILINE_MAX value via getRecordById', async () => {
      const { entities } = getServices();
      const name = `sdk_mlmax_life_${generateRandomString(8).toLowerCase()}`;

      const entityId = await entities.create(name, [
        { name: 'body', type: EntityFieldDataType.MULTILINE_MAX },
      ]);
      createdEntityIds.push(entityId);

      const bodyValue = `Large body content ${generateRandomString(256)}`;
      const inserted = await entities.insertRecordById(entityId, { body: bodyValue });
      expect(inserted.Id).toBeDefined();
      registerResource('entityRecords', { entityId, recordIds: [inserted.Id] });

      const full = await entities.getRecordById(entityId, inserted.Id);
      expect(full.body).toBe(bodyValue);
    }, 90_000);
  });

  describe('deleteById', () => {
    it('should delete an entity created for this test', async () => {
      const { entities } = getServices();

      const name = `sdk_test_${generateRandomString(8).toLowerCase()}`;
      const entityId = await entities.create(name, []);

      // Delete it immediately (not added to createdEntityIds so afterAll won't double-delete)
      await entities.deleteById(entityId);

      // Verify it no longer appears in getAll
      const all = await entities.getAll();
      const found = all.find(e => e.id === entityId);
      expect(found).toBeUndefined();
    });
  });

  describe('entity schema methods (bound)', () => {
    it('should call deleteById via bound method on entity', async () => {
      const { entities } = getServices();

      const name = `sdk_test_${generateRandomString(8).toLowerCase()}`;
      const entityId = await entities.create(name, []);

      const entity = await entities.getById(entityId);
      expect(typeof entity.delete).toBe('function');
      expect(typeof entity.update).toBe('function');

      // Delete via bound method — do NOT add to createdEntityIds
      await entity.delete();

      const all = await entities.getAll();
      expect(all.find(e => e.id === entityId)).toBeUndefined();
    }, 60_000);
  });

  // ─── Cleanup ──────────────────────────────────────────────────────────────

  afterAll(async () => {
    const config = getTestConfig();
    if (!config.skipCleanup) {
      // Clean up any entities created by schema management tests (no-op when those tests are skipped)
      if (createdEntityIds.length > 0) {
        const { entities } = getServices();
        await Promise.all(
          createdEntityIds.map(entityId =>
            entities.deleteById(entityId).catch(() => {
              // Best-effort cleanup — entity may have already been deleted
            })
          )
        );
      }
    }
  });
});
