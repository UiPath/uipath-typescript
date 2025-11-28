import { describe, it, expect, vi } from 'vitest';
import {
  extractCliCommandsFromService,
  extractMethodParameters
} from '../../../src/core/cli/extractor';
import { BaseService } from '../../../src/services/base';
import { cliCommand } from '../../../src/core/cli/metadata';
import { createServiceTestDependencies } from '../../../tests/utils/setup';

/**
 * Test service for extraction tests
 */
class ExtractionTestService extends BaseService {
  @cliCommand({
    command: 'test get-by-id',
    description: 'Get by ID',
    params: [
      { name: 'id', positional: true, required: true }
    ]
  })
  async getById(id: string): Promise<{ id: string }> {
    return { id };
  }

  @cliCommand({
    command: 'test get-all',
    description: 'Get all',
    params: [
      { name: 'options', flag: 'page-size', type: 'number' }
    ]
  })
  async getAll(options?: { pageSize?: number }): Promise<{ items: any[] }> {
    return { items: [] };
  }
}

describe('CLI Extractor', () => {
  const { config, executionContext, tokenManager } = createServiceTestDependencies();

  describe('extractCliCommandsFromService', () => {
    it('should extract CLI commands from service instance', () => {
      const service = new ExtractionTestService(config, executionContext, tokenManager);
      const commands = extractCliCommandsFromService(service, 'test');

      expect(commands.size).toBe(2);
      expect(commands.has('test get-by-id')).toBe(true);
      expect(commands.has('test get-all')).toBe(true);
    });

    it('should return GeneratedOclifCommand objects', () => {
      const service = new ExtractionTestService(config, executionContext, tokenManager);
      const commands = extractCliCommandsFromService(service, 'test');
      const getByIdCommand = commands.get('test get-by-id');

      expect(getByIdCommand).toBeDefined();
      expect(getByIdCommand?.id).toBe('test:get-by-id');
      expect(getByIdCommand?.description).toBe('Get by ID');
      expect(getByIdCommand?.args.length).toBe(1);
      expect(getByIdCommand?.args[0].name).toBe('id');
    });

    it('should handle services with no CLI commands', () => {
      class NoCommandService extends BaseService {
        async regularMethod(): Promise<void> {}
      }

      const service = new NoCommandService(config, executionContext, tokenManager);
      const commands = extractCliCommandsFromService(service, 'no-command');

      expect(commands.size).toBe(0);
    });
  });

  describe('extractMethodParameters', () => {
    it('should return empty array for now (placeholder)', () => {
      // This is a placeholder function that would use TypeScript compiler API
      // in a real implementation
      const result = extractMethodParameters(function test(id: string) {});

      expect(Array.isArray(result)).toBe(true);
    });
  });
});

