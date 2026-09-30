import { describe, it, expect, beforeAll } from 'vitest';
import { getServices, getTestConfig, describeIntegration, InitMode } from '../../config/unified-setup';
import { CaseApp, CaseAppElementType } from '../../../../src/services/maestro/case-app';
import type { CaseAppInstanceGetResponse } from '../../../../src/models/maestro';

const modes: InitMode[] = ['v1'];

// 'user': the v3 routes authorize through the caller's Case persona grants, and the grant lookup
// fails closed with 403 for a PAT, so this suite runs under the user token only.
describeIntegration('Maestro Case App - Integration Tests', 'user', modes, () => {
  let caseApp!: CaseApp;
  let folderKey!: string;
  let instance!: CaseAppInstanceGetResponse;

  beforeAll(async () => {
    const service = getServices().caseApp;
    if (!service) {
      throw new Error('CaseApp service is not registered for this init mode');
    }
    caseApp = service;

    const config = getTestConfig();
    if (!config.folderKey) {
      throw new Error('INTEGRATION_TEST_FOLDER_KEY is required for Case App integration tests');
    }
    folderKey = config.folderKey;

    const result = await caseApp.getAll(folderKey, { processKey: config.maestroCaseProcessKey, pageSize: 20 });
    const [first] = result.items;
    if (!first) {
      throw new Error('No case instance visible to this credential in the configured folder');
    }
    instance = first;
  });

  describe('getAll', () => {
    it('should return case instances with SDK field names', async () => {
      expect(instance.instanceId).toBeDefined();
      expect(instance.folderKey).toBe(folderKey);
      expect(instance.startedTime).toBeDefined();
      expect((instance as unknown as Record<string, unknown>).startedTimeUtc).toBeUndefined();
      expect((instance as unknown as Record<string, unknown>).externalId).toBeUndefined();
    });
  });

  describe('getStages', () => {
    it('should return the stages of the case instance', async () => {
      const result = await caseApp.getStages(instance.instanceId, folderKey);

      expect(result.caseInstanceId).toBe(instance.instanceId);
      expect(Array.isArray(result.stages)).toBe(true);
    });
  });

  describe('getSlaSummary', () => {
    it('should return the case-level SLA summary', async () => {
      const result = await caseApp.getSlaSummary(instance.instanceId, folderKey);

      expect(result.caseInstanceId).toBe(instance.instanceId);
      expect(result.instanceStatus).toBeDefined();
      expect((result as unknown as Record<string, unknown>).externalId).toBeUndefined();
    });
  });

  describe('getCaseJson', () => {
    it('should return the case plan as an object', async () => {
      const result = await caseApp.getCaseJson(instance.instanceId, folderKey);

      expect(typeof result).toBe('object');
      expect(result).not.toBeNull();
    });
  });

  describe('getElementExecutions', () => {
    it('should return the timeline with SDK time field names', async () => {
      const result = await caseApp.getElementExecutions(instance.instanceId, folderKey);

      expect(result.instanceId).toBe(instance.instanceId);
      expect(result.startedTime).toBeDefined();
      expect((result as unknown as Record<string, unknown>).startedTimeUtc).toBeUndefined();
      result.elementExecutions.forEach(execution => {
        expect((execution as unknown as Record<string, unknown>).startedTimeUtc).toBeUndefined();
      });
    });

    it('should accept an element-type filter', async () => {
      const result = await caseApp.getElementExecutions(instance.instanceId, folderKey, {
        elementTypes: [CaseAppElementType.Hitl],
      });

      expect(Array.isArray(result.elementExecutions)).toBe(true);
    });
  });

  describe('getIncidents', () => {
    it('should return an array of incidents', async () => {
      const result = await caseApp.getIncidents(instance.instanceId, folderKey);

      expect(Array.isArray(result)).toBe(true);
      result.forEach(incident => {
        expect(incident.errorTime).toBeDefined();
        expect((incident as unknown as Record<string, unknown>).errorTimeUtc).toBeUndefined();
      });
    });
  });

  describe('getAdhocTasks', () => {
    it('should return the triggerable ad-hoc tasks grouped by stage', async () => {
      const result = await caseApp.getAdhocTasks(instance.instanceId, folderKey);

      expect(Array.isArray(result)).toBe(true);
      result.forEach(stage => expect(Array.isArray(stage.tasks)).toBe(true));
    });
  });
});
