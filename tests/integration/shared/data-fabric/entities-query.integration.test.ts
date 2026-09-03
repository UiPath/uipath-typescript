import { describe, it, expect, beforeAll } from 'vitest';
import {
  getServices,
  getTestConfig,
  setupUnifiedTests,
  InitMode,
} from '../../config/unified-setup';
import { hasValidPagination } from '../../utils/helpers';
import {
  EntityAggregateFunction,
  EntityHavingOperator,
  JoinType,
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
    it('should return related-entity fields for a cross-entity LEFT join', async () => {
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
        throw new Error('DATA_FABRIC_TEST_JOIN_* env vars are required for the join test');
      }
      const relatedEntity = config.dataFabricTestJoinRelatedEntityName;

      const result = await entities.queryRecordsById(entityId, {
        // Join queries require a projection; select the two join keys — the
        // base-entity key unqualified (non-ambiguous), the related key qualified.
        selectedFields: [
          config.dataFabricTestJoinFieldName,
          `${relatedEntity}.${config.dataFabricTestJoinRelatedFieldName}`,
        ],
        joins: [
          {
            entityName: config.dataFabricTestJoinEntityName,
            joinType: JoinType.LeftJoin,
            joinFieldName: config.dataFabricTestJoinFieldName,
            relatedEntityName: relatedEntity,
            relatedFieldName: config.dataFabricTestJoinRelatedFieldName,
          },
        ],
        pageSize: 25,
      });

      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBeGreaterThan(0);
      // Multi-entity result rows use entity-qualified keys ("Entity.Field").
      // At least one base record has a matching related record, so at least one
      // row must carry a key qualified with the related entity's name — this is
      // the assertion that fails when the backend ignores the `joins` clause.
      const joinedRows = result.items.filter(item =>
        Object.keys(item).some(key => key.startsWith(`${relatedEntity}.`)),
      );
      expect(joinedRows.length).toBeGreaterThan(0);
      expect(hasValidPagination(result)).toBe(true);
    });

    it('should return only matched rows for an INNER join', async () => {
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
        throw new Error('DATA_FABRIC_TEST_JOIN_* env vars are required for the join test');
      }
      const relatedEntity = config.dataFabricTestJoinRelatedEntityName;
      const join = {
        entityName: config.dataFabricTestJoinEntityName,
        joinFieldName: config.dataFabricTestJoinFieldName,
        relatedEntityName: relatedEntity,
        relatedFieldName: config.dataFabricTestJoinRelatedFieldName,
      };
      const selectedFields = [
        config.dataFabricTestJoinFieldName,
        `${relatedEntity}.${config.dataFabricTestJoinRelatedFieldName}`,
      ];

      const left = await entities.queryRecordsById(entityId, {
        selectedFields,
        joins: [{ ...join, joinType: JoinType.LeftJoin }],
        pageSize: 25,
      });
      const inner = await entities.queryRecordsById(entityId, {
        selectedFields,
        joins: [{ ...join, joinType: JoinType.InnerJoin }],
        pageSize: 25,
      });

      // INNER keeps only matched rows; LEFT keeps every base row. The fixture
      // guarantees at least one match, and every INNER row must carry the
      // related entity's qualified keys.
      expect(inner.items.length).toBeGreaterThan(0);
      expect(inner.items.length).toBeLessThanOrEqual(left.items.length);
      inner.items.forEach(item => {
        expect(Object.keys(item).some(key => key.startsWith(`${relatedEntity}.`))).toBe(true);
      });
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
