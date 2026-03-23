import { describe, it, expect } from 'vitest';
import { getServices, setupUnifiedTests, InitMode } from '../../config/unified-setup';

const modes: InitMode[] = ['v0', 'v1'];

describe.each(modes)('Orchestrator Machines - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  describe('getAll', () => {
    it('should retrieve all machines', async () => {
      const { machines } = getServices();

      const result = await machines.getAll();

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('should retrieve machines with pagination options', async () => {
      const { machines } = getServices();

      const result = await machines.getAll({
        pageSize: 5,
      });

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBeLessThanOrEqual(5);
    });

    it('should retrieve machines with filter', async () => {
      const { machines } = getServices();

      const allMachines = await machines.getAll({ pageSize: 1 });

      if (allMachines.items.length === 0) {
        console.log('No machines available to test filter. Create a machine in the tenant first.');
        return;
      }

      const machineId = allMachines.items[0].id;
      const result = await machines.getAll({
        filter: `Id eq ${machineId}`,
        pageSize: 5,
      });

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('should return paginated response with totalCount', async () => {
      const { machines } = getServices();

      const result = await machines.getAll({ pageSize: 1 });

      expect(result).toBeDefined();
      expect(result.totalCount).toBeDefined();
      expect(typeof result.totalCount).toBe('number');
    });
  });

  describe('getById', () => {
    it('should retrieve a specific machine by ID', async () => {
      const { machines } = getServices();

      const allMachines = await machines.getAll({ pageSize: 1 });

      if (allMachines.items.length === 0) {
        console.log('No machines available to test getById. Create a machine in the tenant first.');
        return;
      }

      const machineId = allMachines.items[0].id;
      const result = await machines.getById(machineId);

      expect(result).toBeDefined();
      expect(result.id).toBe(machineId);
      expect(result.name).toBeDefined();
      expect(typeof result.name).toBe('string');
    });

    it('should retrieve machine by ID with select options', async () => {
      const { machines } = getServices();

      const allMachines = await machines.getAll({ pageSize: 1 });

      if (allMachines.items.length === 0) {
        console.log('No machines available to test getById with options.');
        return;
      }

      const machineId = allMachines.items[0].id;
      const result = await machines.getById(machineId, { select: 'Id,Name,Type' });

      expect(result).toBeDefined();
      expect(result.id).toBe(machineId);
    });
  });

  describe('Machine structure validation', () => {
    it('should have expected fields in machine objects', async () => {
      const { machines } = getServices();

      const result = await machines.getAll({ pageSize: 1 });

      if (result.items.length === 0) {
        console.log('No machines available to validate structure');
        return;
      }

      const machine = result.items[0];

      expect(machine).toBeDefined();
      expect(machine.id).toBeDefined();
      expect(machine.name).toBeDefined();
      expect(machine.key).toBeDefined();
      expect(machine.type).toBeDefined();
      expect(typeof machine.id).toBe('number');
      expect(typeof machine.name).toBe('string');
      expect(typeof machine.key).toBe('string');
      expect(typeof machine.unattendedSlots).toBe('number');
      expect(typeof machine.nonProductionSlots).toBe('number');
      expect(Array.isArray(machine.robotVersions)).toBe(true);
    });
  });
});
