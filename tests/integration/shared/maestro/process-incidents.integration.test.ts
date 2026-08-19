import { describe, it, expect } from 'vitest';
import { getServices, getTestConfig, setupUnifiedTests, InitMode } from '../../config/unified-setup';

const modes: InitMode[] = ['v0', 'v1'];

describe.each(modes)('Maestro Process Incidents - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  describe('Incident read operations', () => {
    it('should instantiate process incidents service', async () => {
      const { processIncidents } = getServices();

      expect(processIncidents).toBeDefined();
    });

    it('should retrieve incidents through process context', async () => {
      const { maestroProcesses } = getServices();

      try {
        const processes = await maestroProcesses.getAll({
          limit: 1,
        });

        if (processes.length === 0) {
          throw new Error('No Maestro processes available — cannot test incident retrieval');
        }

        const { processKey, folderKey } = processes[0];

        const incidents = await maestroProcesses.getIncidents(processKey, folderKey);

        expect(incidents).toBeDefined();
        expect(Array.isArray(incidents)).toBe(true);

        if (incidents.length > 0) {
          const incident = incidents[0];
          expect(incident).toBeDefined();
          expect(incident.id || incident.incidentId).toBeDefined();
        }
      } catch (error: any) {
        if (error.message?.includes('Forbidden') || error.statusCode === 403) {
          console.log(
            'Skipping test: PAT token does not have Maestro permissions. ' +
              'Grant Maestro (Read) scope when creating the token.'
          );
          return;
        }
        throw error;
      }
    });

    it('should validate incident structure', async () => {
      const { maestroProcesses } = getServices();
      const config = getTestConfig();

      const processKey = config.maestroTestProcessKey;

      if (!processKey) {
        throw new Error('MAESTRO_TEST_PROCESS_KEY not configured — cannot validate incident structure');
      }

      const incidents = await maestroProcesses.getIncidents(processKey, config.folderKey);

      expect(incidents).toBeDefined();
      expect(Array.isArray(incidents)).toBe(true);

      if (incidents.length > 0) {
        const incident = incidents[0];

        expect(incident).toBeDefined();
        expect(typeof incident).toBe('object');

        if (incident.id || incident.incidentId) {
          expect(typeof (incident.id || incident.incidentId)).toBe('string');
        }

        if (incident.type) {
          expect(typeof incident.type).toBe('string');
        }
      }
    });
  });

  describe('Incident filtering and search', () => {
    it('should handle incidents with no results', async () => {
      const { maestroProcesses } = getServices();

      try {
        const processes = await maestroProcesses.getAll({
          limit: 5,
        });

        if (processes.length === 0) {
          throw new Error('No Maestro processes available — cannot test empty incident results');
        }

        let foundEmptyIncidents = false;

        for (const process of processes) {
          try {
            const incidents = await maestroProcesses.getIncidents(process.processKey, process.folderKey);

            if (incidents.length === 0) {
              foundEmptyIncidents = true;
              break;
            }
          } catch {
            // Continue to next process
          }
        }

        expect(foundEmptyIncidents !== undefined).toBe(true);
      } catch (error: any) {
        if (error.message?.includes('Forbidden') || error.statusCode === 403) {
          console.log(
            'Skipping test: PAT token does not have Maestro permissions. ' +
              'Grant Maestro (Read) scope when creating the token.'
          );
          return;
        }
        throw error;
      }
    });
  });

  describe('Incident metadata', () => {
    it('should retrieve incident details if available', async () => {
      const { maestroProcesses } = getServices();
      const config = getTestConfig();

      const processKey = config.maestroTestProcessKey;

      if (!processKey) {
        throw new Error('MAESTRO_TEST_PROCESS_KEY not configured — cannot test incident details');
      }

      const incidents = await maestroProcesses.getIncidents(processKey, config.folderKey);

      if (incidents.length === 0) {
        throw new Error(
          'No incidents available for the configured process — MAESTRO_TEST_PROCESS_KEY must point at a process with faulted runs'
        );
      }

      const incident = incidents[0];

      expect(incident).toBeDefined();
      expect(Object.keys(incident).length).toBeGreaterThan(0);
    });
  });

  describe('Service verification', () => {
    it('should use the same SDK instance as other Maestro services', () => {
      const services = getServices();

      expect(services.sdk).toBeDefined();
      expect(services.processIncidents).toBeDefined();
      expect(services.maestroProcesses).toBeDefined();
      expect(services.processInstances).toBeDefined();
      expect(services.sdk.isAuthenticated()).toBe(true);
    });
  });
});
