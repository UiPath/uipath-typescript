import { describe, it, expect, beforeAll } from 'vitest';
import { getServices, getTestConfig, setupUnifiedTests, InitMode } from '../../config/unified-setup';
import { ElementsService } from '../../../../src/services/integration-service/elements/elements';

const modes: InitMode[] = ['v1'];

describe.each(modes)('Integration Service — Elements [%s]', (mode) => {
  setupUnifiedTests(mode);

  let elements!: ElementsService;
  let elementKey!: string;
  let connectionId!: string;
  let objectName!: string;
  let eventOperation: string | undefined;
  let eventObjectName!: string;

  beforeAll(async () => {
    const service = getServices().isElements;
    if (!service) {
      throw new Error('Elements service is not registered for this init mode');
    }
    elements = service;

    const config = getTestConfig();
    if (!config.isConnectorKey) {
      throw new Error('INTEGRATION_SERVICE_TEST_CONNECTOR_KEY must be set in .env.integration');
    }
    if (!config.isConnectionId) {
      throw new Error('INTEGRATION_SERVICE_TEST_CONNECTION_ID must be set in .env.integration');
    }
    elementKey = config.isConnectorKey;
    connectionId = config.isConnectionId;
    eventOperation = config.isEventOperation;

    // Resolve an objectName + eventObjectName from the connector itself so each
    // test exercises a real API path. Fallback to the env override when supplied.
    const objects = await elements.getObjects(elementKey);
    if (objects.length === 0) {
      throw new Error(`Connector ${elementKey} has no objects — cannot exercise Elements tests.`);
    }
    objectName = config.isObjectName ?? objects[0].name;

    if (eventOperation) {
      const eventObjects = await elements.getEventObjects(elementKey, eventOperation);
      if (eventObjects.length === 0) {
        throw new Error(
          `Connector ${elementKey} has no event objects for operation ${eventOperation}.`,
        );
      }
      eventObjectName = eventObjects[0].name;
    }
  });

  describe('static (connection-independent)', () => {
    it('getObjects should return a plain array of objects', async () => {
      const result = await elements.getObjects(elementKey);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      const sample = result[0];
      expect(typeof sample.name).toBe('string');
    });

    it('getActivities should return a plain array', async () => {
      const result = await elements.getActivities(elementKey);
      expect(Array.isArray(result)).toBe(true);
    });

    it('getObjectMetadata should return an object with name + fields', async () => {
      const result = await elements.getObjectMetadata(elementKey, objectName);
      expect(result).toBeDefined();
      expect(result.name).toBe(objectName);
    });
  });

  describe('instance (connection-scoped)', () => {
    it('getInstanceObjects should return a plain array', async () => {
      const result = await elements.getInstanceObjects(connectionId, elementKey);
      expect(Array.isArray(result)).toBe(true);
    });

    it('getInstanceObjectMetadata should return an object with name', async () => {
      const result = await elements.getInstanceObjectMetadata(connectionId, elementKey, objectName);
      expect(result).toBeDefined();
      expect(result.name).toBe(objectName);
    });
  });

  describe('events', () => {
    it('getEventObjects should return a plain array', async () => {
      if (!eventOperation) {
        throw new Error(
          'INTEGRATION_SERVICE_TEST_EVENT_OPERATION must be set to exercise event endpoints',
        );
      }
      const result = await elements.getEventObjects(elementKey, eventOperation);
      expect(Array.isArray(result)).toBe(true);
    });

    it('getEventObjectMetadata should return an object with name + eventMode', async () => {
      if (!eventOperation) {
        throw new Error(
          'INTEGRATION_SERVICE_TEST_EVENT_OPERATION must be set to exercise event endpoints',
        );
      }
      const result = await elements.getEventObjectMetadata(elementKey, eventOperation, eventObjectName);
      expect(result).toBeDefined();
      expect(result.name).toBe(eventObjectName);
    });

    it('getInstanceEventObjects should return a plain array', async () => {
      if (!eventOperation) {
        throw new Error(
          'INTEGRATION_SERVICE_TEST_EVENT_OPERATION must be set to exercise event endpoints',
        );
      }
      const result = await elements.getInstanceEventObjects(connectionId, elementKey, eventOperation);
      expect(Array.isArray(result)).toBe(true);
    });

    it('getInstanceEventObjectMetadata should return an object', async () => {
      if (!eventOperation) {
        throw new Error(
          'INTEGRATION_SERVICE_TEST_EVENT_OPERATION must be set to exercise event endpoints',
        );
      }
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
