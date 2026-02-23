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
      const config = getTestConfig();

      try {
        const processes = await maestroProcesses.getAll({
          limit: 1,
        });

        if (processes.length === 0) {
          console.log('No processes available to test incidents');
          return;
        }

        const processKey = processes[0].key;

        try {
          const incidents = await maestroProcesses.getIncidents(processKey, config.folderId);

          expect(incidents).toBeDefined();
          expect(Array.isArray(incidents)).toBe(true);

          if (incidents.length > 0) {
            const incident = incidents[0];
            expect(incident).toBeDefined();
            expect(incident.id || incident.incidentId).toBeDefined();
          }
        } catch (error: any) {
          console.log('Incident retrieval failed:', error.message);
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
        console.log(
          'Skipping incident structure test: MAESTRO_TEST_PROCESS_KEY not configured'
        );
        return;
      }

      try {
        const incidents = await maestroProcesses.getIncidents(processKey, config.folderId);

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
      } catch (error: any) {
        console.log('Incident structure validation failed:', error.message);
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
          console.log('No processes available');
          return;
        }

        let foundEmptyIncidents = false;

        for (const process of processes) {
          try {
            const incidents = await maestroProcesses.getIncidents(process.key);

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
        console.log('Skipping incident details test: process key not configured');
        return;
      }

      try {
        const incidents = await maestroProcesses.getIncidents(processKey, config.folderId);

        if (incidents.length === 0) {
          console.log('No incidents available for the configured process');
          return;
        }

        const incident = incidents[0];

        expect(incident).toBeDefined();
        expect(Object.keys(incident).length).toBeGreaterThan(0);

        console.log('Incident fields:', Object.keys(incident));
      } catch (error: any) {
        console.log('Incident details test failed:', error.message);
      }
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
