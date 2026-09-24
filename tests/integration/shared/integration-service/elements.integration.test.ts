import { describe, it, expect, beforeAll } from 'vitest';
import { getServices, getTestConfig, describeIntegration, InitMode } from '../../config/unified-setup';
import { ElementsService } from '../../../../src/services/integration-service/elements/elements';
import type {
  ElementObject,
  ElementEventObject,
} from '../../../../src/models/integration-service/elements.types';
import { isAuthenticationError, isUiPathError } from '../../../../src/core/errors';

const modes: InitMode[] = ['v1'];

// Integration Service validates JWTs locally (`bearerFormat: JWT` in its own
// swagger), so an opaque `rt_` PAT fails at parse before any scope check and every
// call returns a bare 401 identical to an anonymous request. The `'user'`
// requirement routes these suites to UIPATH_USER_TOKEN, so they skip on a
// PAT-only machine instead of failing.
describeIntegration('Integration Service Elements - Integration Tests', 'user', modes, () => {
  let elements!: ElementsService;
  let elementKey!: string;
  let connectionId!: string;
  let objectName!: string;
  let eventOperation!: string;
  let eventObjectName!: string;
  let objects!: ElementObject[];
  let eventObjects!: ElementEventObject[];

  beforeAll(async () => {
    const service = getServices().integrationServiceElements;
    if (!service) {
      throw new Error('Elements service is not registered for this init mode');
    }
    elements = service;

    const config = getTestConfig();
    if (!config.integrationServiceTestConnectorKey) {
      throw new Error('INTEGRATION_SERVICE_TEST_CONNECTOR_KEY must be set in .env.integration');
    }
    if (!config.integrationServiceTestConnectionId) {
      throw new Error('INTEGRATION_SERVICE_TEST_CONNECTION_ID must be set in .env.integration');
    }
    if (!config.integrationServiceTestEventOperation) {
      throw new Error('INTEGRATION_SERVICE_TEST_EVENT_OPERATION must be set in .env.integration');
    }
    elementKey = config.integrationServiceTestConnectorKey;
    connectionId = config.integrationServiceTestConnectionId;
    eventOperation = config.integrationServiceTestEventOperation;

    // Prefer the env override for the object name when supplied; otherwise resolve
    // it from the connector so each test exercises a real API path. Both listings
    // are kept for the tests that assert on them, so they are fetched only once.
    objects = await elements.getObjects(elementKey);
    if (objects.length === 0) {
      throw new Error(`Connector ${elementKey} has no objects — cannot exercise Elements tests.`);
    }
    objectName = config.integrationServiceTestObjectName ?? objects[0].name;

    eventObjects = await elements.getEventObjects(elementKey, eventOperation);
    if (eventObjects.length === 0) {
      throw new Error(
        `Connector ${elementKey} has no event objects for operation ${eventOperation}.`,
      );
    }
    eventObjectName = eventObjects[0].name;
  });

  describe('static (connection-independent)', () => {
    it('getObjects should return a non-empty array of named objects', () => {
      expect(Array.isArray(objects)).toBe(true);
      expect(objects.length).toBeGreaterThan(0);
      expect(objects.every((object) => typeof object.name === 'string' && object.name.length > 0)).toBe(true);
    });

    it('getActivities should return named activities', async () => {
      const result = await elements.getActivities(elementKey);

      expect(Array.isArray(result)).toBe(true);
      if (result.length === 0) {
        throw new Error(`Connector ${elementKey} exposes no activities — cannot verify the listing.`);
      }
      expect(result.every((activity) => typeof activity.name === 'string' && activity.name.length > 0)).toBe(true);
    });

    it('getObjectMetadata should return an object with a matching name', async () => {
      const result = await elements.getObjectMetadata(elementKey, objectName);
      expect(result).toBeDefined();
      expect(result.name).toBe(objectName);
    });

    it('getObjectMetadata should reject for an object the connector does not expose', async () => {
      // Asserting "a UiPath API error that is not an auth error" rather than
      // `isNotFoundError`: the exact status for an unknown object name is not yet
      // confirmed against the live API, and a bare `rejects.toThrow()` would be
      // satisfied by a 401 from a stale token.
      await expect(
        elements.getObjectMetadata(elementKey, '__non_existent_object__'),
      ).rejects.toSatisfy((error: unknown) => isUiPathError(error) && !isAuthenticationError(error));
    });
  });

  describe('instance (connection-scoped)', () => {
    it('getInstanceObjects should return named objects for the connection', async () => {
      const result = await elements.getInstanceObjects(connectionId, elementKey);

      // `Array.isArray` alone is tautological — the service returns
      // `response.data ?? []`, so it holds whatever the API sent. Assert the
      // item shape, which only holds if the call actually reached the connector.
      expect(Array.isArray(result)).toBe(true);
      if (result.length === 0) {
        throw new Error(
          `Connection ${connectionId} exposes no objects — cannot verify the instance object listing.`,
        );
      }
      expect(result.every((object) => typeof object.name === 'string' && object.name.length > 0)).toBe(true);
    });

    it('getInstanceObjectMetadata should return an object with a matching name', async () => {
      const result = await elements.getInstanceObjectMetadata(connectionId, elementKey, objectName);
      expect(result).toBeDefined();
      expect(result.name).toBe(objectName);
    });
  });

  describe('events', () => {
    it('getEventObjects should return a non-empty array of named event objects', () => {
      expect(Array.isArray(eventObjects)).toBe(true);
      expect(eventObjects.length).toBeGreaterThan(0);
      expect(eventObjects.every((object) => typeof object.name === 'string' && object.name.length > 0)).toBe(true);
    });

    it('getEventObjectMetadata should return an object with a matching name', async () => {
      const result = await elements.getEventObjectMetadata(elementKey, eventOperation, eventObjectName);
      expect(result).toBeDefined();
      expect(result.name).toBe(eventObjectName);
    });

    it('getInstanceEventObjects should return named event objects for the connection', async () => {
      const result = await elements.getInstanceEventObjects(connectionId, elementKey, eventOperation);

      expect(Array.isArray(result)).toBe(true);
      if (result.length === 0) {
        throw new Error(
          `Connection ${connectionId} exposes no event objects for ${eventOperation} — cannot verify the instance event listing.`,
        );
      }
      expect(result.every((object) => typeof object.name === 'string' && object.name.length > 0)).toBe(true);
    });

    it('getInstanceEventObjectMetadata should return an object with a matching name', async () => {
      const result = await elements.getInstanceEventObjectMetadata(
        connectionId,
        elementKey,
        eventOperation,
        eventObjectName,
      );
      expect(result).toBeDefined();
      expect(result.name).toBe(eventObjectName);
    });
  });
});
