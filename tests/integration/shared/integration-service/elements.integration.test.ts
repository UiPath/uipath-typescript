import { describe, it, expect, beforeAll } from 'vitest';
import { getServices, getTestConfig, describeIntegration, InitMode } from '../../config/unified-setup';
import { ElementsService } from '../../../../src/services/integration-service/elements/elements';
import type {
  ElementObject,
  ElementEventObject,
} from '../../../../src/models/integration-service/elements.types';
import { NotFoundError } from '../../../../src/core/errors';

const modes: InitMode[] = ['v1'];

// Integration Service rejects PATs (401), so these suites run under UIPATH_USER_TOKEN.
describeIntegration('Integration Service Elements - Integration Tests', 'user', modes, () => {
  let elements!: ElementsService;
  let elementKey!: string;
  let connectionId!: string;
  let objectName!: string;
  let instanceObjectName!: string;
  let eventOperation!: string;
  let eventObjectName!: string;
  let instanceEventObjectName!: string;
  let objects!: ElementObject[];
  let instanceObjects!: ElementObject[];
  let eventObjects!: ElementEventObject[];
  let instanceEventObjects!: ElementEventObject[];

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

    // Use the env object name if set, else the first object listed.
    objects = await elements.getObjects(elementKey);
    if (objects.length === 0) {
      throw new Error(`Connector ${elementKey} has no objects — cannot exercise Elements tests.`);
    }
    objectName = config.integrationServiceTestObjectName ?? objects[0].name;

    // A connection may expose fewer objects than its connector.
    instanceObjects = await elements.getInstanceObjects(connectionId, elementKey);
    if (instanceObjects.length === 0) {
      throw new Error(`Connection ${connectionId} exposes no objects — cannot exercise instance tests.`);
    }
    instanceObjectName = config.integrationServiceTestObjectName ?? instanceObjects[0].name;

    eventObjects = await elements.getEventObjects(elementKey, eventOperation);
    if (eventObjects.length === 0) {
      throw new Error(
        `Connector ${elementKey} has no event objects for operation ${eventOperation}.`,
      );
    }
    eventObjectName = eventObjects[0].name;

    // Some connection event objects have no metadata (404); use one both lists share.
    instanceEventObjects = await elements.getInstanceEventObjects(connectionId, elementKey, eventOperation);
    const instanceEventNames = new Set(instanceEventObjects.map((object) => object.name));
    const sharedEventObject = eventObjects.find((object) => instanceEventNames.has(object.name));
    if (!sharedEventObject) {
      throw new Error(
        `Connection ${connectionId} exposes none of the connector's ${eventOperation} event objects — cannot exercise instance event tests.`,
      );
    }
    instanceEventObjectName = sharedEventObject.name;
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
      expect(result).not.toHaveProperty('Name');
    });

    it('getObjectMetadata should reject for an object the connector does not expose', async () => {
      await expect(
        elements.getObjectMetadata(elementKey, '__non_existent_object__'),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('instance (connection-scoped)', () => {
    it('getInstanceObjects should return named objects for the connection', () => {
      expect(Array.isArray(instanceObjects)).toBe(true);
      expect(
        instanceObjects.every((object) => typeof object.name === 'string' && object.name.length > 0),
      ).toBe(true);
    });

    it('getInstanceObjectMetadata should return an object with a matching name', async () => {
      const result = await elements.getInstanceObjectMetadata(connectionId, elementKey, instanceObjectName);
      expect(result).toBeDefined();
      expect(result.name).toBe(instanceObjectName);
      expect(result).not.toHaveProperty('Name');
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
      expect(result).not.toHaveProperty('Name');
    });

    it('getInstanceEventObjects should return named event objects for the connection', () => {
      expect(Array.isArray(instanceEventObjects)).toBe(true);
      expect(
        instanceEventObjects.every((object) => typeof object.name === 'string' && object.name.length > 0),
      ).toBe(true);
    });

    it('getInstanceEventObjectMetadata should return an object with a matching name', async () => {
      const result = await elements.getInstanceEventObjectMetadata(
        connectionId,
        elementKey,
        eventOperation,
        instanceEventObjectName,
      );
      expect(result).toBeDefined();
      expect(result.name).toBe(instanceEventObjectName);
      expect(result).not.toHaveProperty('Name');
    });
  });
});
