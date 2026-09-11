import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import {
  getServices,
  getTestConfig,
  setupUnifiedTests,
  cleanupTestEntityRecords,
  InitMode,
} from '../../config/unified-setup';
import { hasValidPagination, generateRandomString, awaitRecordVisible } from '../../utils/helpers';
import { registerResource } from '../../utils/cleanup';
import {
  EntityAggregateFunction,
  EntityHavingOperator,
  EntityQueryFilterGroup,
  JoinType,
  QueryFilterOperator,
} from '../../../../src/models/data-fabric/entities.types';

const modes: InitMode[] = ['v0', 'v1'];

describe.each(modes)('Data Fabric Entities Query - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  let testEntityId: string | null = null;

  // In the original single-file suite the getAll block captured a fallback entity
  // id; that block now lives in entities-records.integration.test.ts, so resolve
  // the fallback here. Transient sdk_* entities created by the concurrently
  // running schema file are skipped — they can be deleted mid-run.
  beforeAll(async () => {
    if (!getTestConfig().dataFabricTestEntityId) {
      const { entities } = getServices();
      const all = await entities.getAll();
      testEntityId = all.find((e) => !e.name.startsWith('sdk_'))?.id ?? null;
    }
  });

  describe('queryRecordsById', () => {
    it('should query records with no filters', async () => {
      const { entities } = getServices();
      const config = getTestConfig();
      const entityId = config.dataFabricTestEntityId || testEntityId;
      if (!entityId) {
        throw new Error('No entity ID available for testing');
      }
      const result = await entities.queryRecordsById(entityId);
      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(typeof result.totalCount).toBe('number');
    });

    it('should return paginated records when pageSize is provided', async () => {
      const { entities } = getServices();
      const config = getTestConfig();
      const entityId = config.dataFabricTestEntityId || testEntityId;
      if (!entityId) {
        throw new Error('No entity ID available for testing');
      }
      const result = await entities.queryRecordsById(entityId, { pageSize: 2 });
      expect(result).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBeLessThanOrEqual(2);
      expect(hasValidPagination(result)).toBe(true);
    });

    it('should return aggregate count when aggregates is provided without groupBy', async () => {
      const { entities } = getServices();
      const config = getTestConfig();
      const entityId = config.dataFabricTestEntityId || testEntityId;
      if (!entityId) {
        throw new Error('No entity ID available for testing');
      }
      const result = await entities.queryRecordsById(entityId, {
        aggregates: [
          { function: EntityAggregateFunction.Count, field: 'Id', alias: 'total' },
        ],
      });
      expect(result).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBe(1);
      const row = result.items[0] as Record<string, any>;
      expect(row.total).toBeDefined();
      expect(typeof row.total).toBe('number');
      expect(row.total).toBeGreaterThanOrEqual(0);
    });

    // The tenant must have the `enable-having-on-query` feature flag; without it the
    // server rejects havingFilter with a 400 naming the flag, which fails this test
    // loudly rather than letting the coverage be silently absent.
    it('should filter grouped results with havingFilter (HAVING)', async () => {
      const { entities } = getServices();
      const config = getTestConfig();
      const entityId = config.dataFabricTestEntityId || testEntityId;
      if (!entityId) {
        throw new Error('No entity ID available for testing');
      }
      // Group by Id: always present on every entity, no fixture coupling — one
      // group per record, each with cnt = 1, which keeps both assertions meaningful.
      const base = {
        selectedFields: ['Id'],
        groupBy: ['Id'],
        aggregates: [
          { function: EntityAggregateFunction.Count, field: 'Id', alias: 'cnt' },
        ],
      };

      // Every group has at least one record, so `cnt >= 1` must return every group.
      const all = await entities.queryRecordsById(entityId, {
        ...base,
        havingFilter: {
          aggregateFilters: [
            { aggregateAlias: 'cnt', operator: EntityHavingOperator.GreaterThanOrEqual, value: '1' },
          ],
        },
      });
      expect(all.items.length).toBeGreaterThan(0);
      all.items.forEach(item => {
        expect((item as Record<string, unknown>).cnt).toBeGreaterThanOrEqual(1);
      });

      // An unsatisfiable threshold must return no groups. A backend that ignores
      // havingFilter returns every group here — that is the failing signal.
      const none = await entities.queryRecordsById(entityId, {
        ...base,
        havingFilter: {
          aggregateFilters: [
            { aggregateAlias: 'cnt', operator: EntityHavingOperator.GreaterThan, value: '1000000000' },
          ],
        },
      });
      expect(none.items).toHaveLength(0);
    });

    // Regression guard: DF reads `expansionLevel` only from the URL on POST record endpoints.
    // If the SDK sends it in the body, DF silently ignores it and every level collapses to L0.
    it('should expand reference fields at each expansionLevel (0-3)', async () => {
      const { entities } = getServices();
      const config = getTestConfig();
      const entityId = config.dataFabricTestEntityId || testEntityId;
      if (!entityId) {
        throw new Error('No entity ID available for testing');
      }

      const levels = [0, 1, 2, 3] as const;
      const responses = await Promise.all(
        levels.map(level => entities.queryRecordsById(entityId, { expansionLevel: level, pageSize: 1 })),
      );

      responses.forEach((resp, i) => {
        expect(resp, `expansionLevel=${levels[i]} returned no response`).toBeDefined();
        expect(Array.isArray(resp.items), `expansionLevel=${levels[i]} items not an array`).toBe(true);
      });

      if (responses.some(r => r.items.length === 0)) {
        throw new Error('Test entity has no records — expansionLevel diff cannot be verified. Insert at least one record into DATA_FABRIC_TEST_ENTITY_ID.');
      }

      const records = responses.map(r => r.items[0] as Record<string, any>);
      const [l0Record, l1Record, l2Record, l3Record] = records;

      // CreatedBy is a system reference field on every DF record.
      // L0: raw GUID string. L1+: object envelope with Id.
      expect(typeof l0Record.CreatedBy).toBe('string');

      for (const [level, rec] of [[1, l1Record], [2, l2Record], [3, l3Record]] as const) {
        expect(typeof rec.CreatedBy, `L${level} CreatedBy should be object`).toBe('object');
        expect(rec.CreatedBy, `L${level} CreatedBy should not be null`).not.toBeNull();
        expect(rec.CreatedBy, `L${level} CreatedBy should have Id`).toHaveProperty('Id');
      }

      // L2 inflates the L1 envelope into the referenced user's full record.
      expect(Object.keys(l2Record.CreatedBy).length).toBeGreaterThan(
        Object.keys(l1Record.CreatedBy).length,
      );

      // L3 must remain at least as expanded as L2 (deeper nesting is schema-dependent, but never shrinks).
      expect(Object.keys(l3Record.CreatedBy).length).toBeGreaterThanOrEqual(
        Object.keys(l2Record.CreatedBy).length,
      );
    });

    // Multi-join. Requires the join fixture (a second, related entity, seeded
    // with one record that matches a base record on the join key and one that
    // matches nothing) provisioned in the test tenant and named via the
    // DATA_FABRIC_TEST_JOIN_* env vars; throws when they are missing.
    //
    // These tests assert the join EFFECT, not just the response envelope: a
    // backend that accepts the request but silently ignores the `joins` body
    // key returns a perfectly normal envelope, so envelope-shape assertions
    // alone cannot fail for the exact defect they exist to catch (this is how
    // the original non-functional joins wiring shipped).
    describe('cross-entity joins', () => {
      let joinEntityId!: string;
      let baseEntityName!: string;
      let relatedEntity!: string;
      let joinFieldName!: string;
      let relatedFieldName!: string;
      let baseOnlyValue!: string;
      let filterGroup!: EntityQueryFilterGroup;
      let selectedFields!: string[];
      const seededRecordIds: string[] = [];

      beforeAll(async () => {
        const { entities } = getServices();
        const config = getTestConfig();
        const entityId = config.dataFabricTestEntityId || testEntityId;
        if (!entityId) {
          throw new Error('No entity ID available for testing');
        }
        if (
          !config.dataFabricTestJoinFieldName ||
          !config.dataFabricTestJoinRelatedEntityName ||
          !config.dataFabricTestJoinRelatedFieldName
        ) {
          throw new Error('DATA_FABRIC_TEST_JOIN_* env vars are required for the join tests');
        }
        joinEntityId = entityId;
        // The SDK defaults the join's base entity to the queried entity; the
        // name is still needed here to address the entity-qualified keys the
        // multi-entity route returns for base columns.
        baseEntityName = (await entities.getById(entityId)).name;
        relatedEntity = config.dataFabricTestJoinRelatedEntityName;
        joinFieldName = config.dataFabricTestJoinFieldName;
        relatedFieldName = config.dataFabricTestJoinRelatedFieldName;

        // Address the seeded match directly instead of assuming it lands in
        // the first page — leaked records on the shared fixture once pushed it
        // past pageSize, making these tests fail deterministically. Filtering
        // the base query to the related entity's own join values (plus one
        // seeded no-match value, below) keeps the assertions fixture-driven
        // and page-independent.
        const relatedRecords = await entities.getRecordsByName(relatedEntity, { pageSize: 50 });
        const relatedValues = relatedRecords.items
          .map((r) => r[relatedFieldName])
          .filter((v): v is string => typeof v === 'string' && v.length > 0);
        if (relatedValues.length === 0) {
          throw new Error(`Join fixture ${relatedEntity} has no ${relatedFieldName} values`);
        }

        // Seed one base row whose join value matches nothing on the related
        // entity, so LEFT and INNER produce provably different row sets.
        baseOnlyValue = `sdk-join-base-only-${generateRandomString()}`;
        const inserted = await entities.insertRecordById(joinEntityId, { [joinFieldName]: baseOnlyValue });
        seededRecordIds.push(inserted.Id);
        registerResource('entityRecords', { entityId: joinEntityId, recordIds: [inserted.Id] });
        await awaitRecordVisible(entities, joinEntityId, inserted.Id);

        filterGroup = {
          queryFilters: [
            {
              fieldName: joinFieldName,
              operator: QueryFilterOperator.In,
              valueList: [...relatedValues, baseOnlyValue],
            },
          ],
        };
        // Join queries require a projection; select the two join keys — the
        // multi-entity route returns every column entity-qualified
        // ("Entity.Field"), including the base entity's.
        selectedFields = [joinFieldName, `${relatedEntity}.${relatedFieldName}`];

        // getRecordById readiness does not guarantee the query index has
        // caught up; poll the exact query shape the tests run until the
        // seeded row appears.
        for (let attempt = 1; attempt <= 8; attempt++) {
          const probe = await entities.queryRecordsById(joinEntityId, {
            selectedFields,
            joins: [
              {
                joinType: JoinType.LeftJoin,
                joinFieldName,
                relatedEntityName: relatedEntity,
                relatedFieldName,
              },
            ],
            filterGroup: {
              queryFilters: [
                { fieldName: joinFieldName, operator: QueryFilterOperator.In, valueList: [baseOnlyValue] },
              ],
            },
            pageSize: 5,
          });
          if (probe.items.length > 0) return;
          console.warn(`[joins beforeAll] seeded base-only row not yet queryable (attempt ${attempt}/8)`);
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
        throw new Error(`Seeded base-only record never became queryable on ${baseEntityName}`);
      }, 90_000);

      // These tests seed into the shared fixture, so they must delete what they
      // wrote — an unswept row here is exactly the bloat that broke the page-
      // bound assertions these tests replaced.
      afterAll(async () => {
        if (seededRecordIds.length === 0) {
          return;
        }
        await cleanupTestEntityRecords(joinEntityId, seededRecordIds);
        seededRecordIds.length = 0;
      }, 60_000);

      it('should return related-entity fields for a cross-entity LEFT join', async () => {
        const { entities } = getServices();

        const result = await entities.queryRecordsById(joinEntityId, {
          selectedFields,
          joins: [
            {
              joinType: JoinType.LeftJoin,
              joinFieldName,
              relatedEntityName: relatedEntity,
              relatedFieldName,
            },
          ],
          filterGroup,
          pageSize: 25,
        });

        expect(Array.isArray(result.items)).toBe(true);
        expect(result.items.length).toBeGreaterThan(0);
        // Multi-entity result rows use entity-qualified keys ("Entity.Field").
        // At least one base record has a matching related record, so at least
        // one row must carry the related entity's join key with a value — this
        // is the assertion that fails when the backend ignores the `joins`
        // clause.
        const matchedRows = result.items.filter(
          (item) => item[`${relatedEntity}.${relatedFieldName}`] != null,
        );
        expect(matchedRows.length).toBeGreaterThan(0);
        expect(hasValidPagination(result)).toBe(true);
      });

      it('should return only matched rows for an INNER join', async () => {
        const { entities } = getServices();
        const join = {
          joinFieldName,
          relatedEntityName: relatedEntity,
          relatedFieldName,
        };

        const left = await entities.queryRecordsById(joinEntityId, {
          selectedFields,
          joins: [{ ...join, joinType: JoinType.LeftJoin }],
          filterGroup,
          pageSize: 25,
        });
        const inner = await entities.queryRecordsById(joinEntityId, {
          selectedFields,
          joins: [{ ...join, joinType: JoinType.InnerJoin }],
          filterGroup,
          pageSize: 25,
        });

        // INNER keeps only matched rows, while LEFT also keeps the seeded
        // no-match row — exactly one row apart. Compare totalCount, not
        // items.length: both pages cap at pageSize, so item counts converge
        // as the fixture grows and the contrast would silently vanish.
        expect(inner.totalCount).toBeGreaterThan(0);
        expect(left.totalCount).toBe((inner.totalCount ?? 0) + 1);
        // No INNER row may carry the seeded no-match value or lack the
        // related entity's qualified keys.
        expect(inner.items.length).toBeGreaterThan(0);
        inner.items.forEach((item) => {
          expect(item[`${baseEntityName}.${joinFieldName}`]).not.toBe(baseOnlyValue);
          expect(Object.keys(item).some((key) => key.startsWith(`${relatedEntity}.`))).toBe(true);
        });
        // Two sequential queries share this budget; the 30s default leaves no
        // room for a single tenant stall.
      }, 60_000);
    });

    it('should reject a join to a nonexistent entity', async () => {
      const { entities } = getServices();
      const config = getTestConfig();
      const entityId = config.dataFabricTestEntityId || testEntityId;
      if (!entityId) {
        throw new Error('No entity ID available for testing');
      }

      // Negative control: the joins-aware route validates the join clause. If
      // this resolves successfully, the SDK is hitting an endpoint that ignores
      // `joins` — the regression this suite exists to prevent.
      await expect(
        entities.queryRecordsById(entityId, {
          selectedFields: ['NoSuchEntityForJoinTest.Id'],
          joins: [
            {
              joinType: JoinType.LeftJoin,
              joinFieldName: 'Id',
              relatedEntityName: 'NoSuchEntityForJoinTest',
              relatedFieldName: 'Id',
            },
          ],
          pageSize: 5,
        }),
      ).rejects.toThrow();
    });
  });
});
