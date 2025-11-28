import { describe, it, expect, beforeEach } from 'vitest';
import {
  cliCommand,
  isCliCommand,
  getCliCommandMetadata,
  getCliCommandsFromService,
  getCliCommandsFromClass,
  CliCommandOptions,
  CliCommandMetadata
} from '../../../src/core/cli/metadata';
import { BaseService } from '../../../src/services/base';
import { createServiceTestDependencies } from '../../../tests/utils/setup';

/**
 * Test service class with CLI commands
 */
class TestService extends BaseService {
  @cliCommand({
    command: 'test get-by-id',
    description: 'Get item by ID',
    examples: ['uipath test get-by-id <id>'],
    params: [
      { name: 'id', positional: true, required: true }
    ]
  })
  async getById(id: string): Promise<{ id: string }> {
    return { id };
  }

  @cliCommand({
    command: 'test get-all',
    description: 'Get all items',
    params: [
      { name: 'options', flag: 'page-size', type: 'number' }
    ]
  })
  async getAll(options?: { pageSize?: number }): Promise<{ items: any[] }> {
    return { items: [] };
  }

  @cliCommand({
    command: 'test create',
    description: 'Create item',
    enabled: false
  })
  async create(data: any): Promise<any> {
    return {};
  }

  // Method without CLI decorator
  async internalMethod(): Promise<void> {
    // Internal method
  }
}

describe('CLI Metadata System', () => {
  let service: TestService;
  const { config, executionContext, tokenManager } = createServiceTestDependencies();

  beforeEach(() => {
    service = new TestService(config, executionContext, tokenManager);
  });

  describe('@cliCommand decorator', () => {
    it('should mark method as CLI command', () => {
      expect(isCliCommand(service.getById)).toBe(true);
      expect(isCliCommand(service.getAll)).toBe(true);
      expect(isCliCommand(service.internalMethod)).toBe(false);
    });

    it('should store metadata on method', () => {
      const metadata = getCliCommandMetadata(service.getById);
      
      expect(metadata).not.toBeNull();
      expect(metadata?.command).toBe('test get-by-id');
      expect(metadata?.description).toBe('Get item by ID');
      expect(metadata?.methodName).toBe('getById');
      expect(metadata?.className).toBe('TestService');
    });

    it('should auto-generate command path if not provided', () => {
      class AutoService extends BaseService {
        @cliCommand({
          description: 'Test method'
        })
        async testMethod(): Promise<void> {}
      }

      const autoService = new AutoService(config, executionContext, tokenManager);
      const metadata = getCliCommandMetadata(autoService.testMethod);
      
      expect(metadata?.commandPath).toBeDefined();
      expect(metadata?.commandPath).toContain('test-method');
    });

    it('should handle nested service paths', () => {
      class NestedService extends BaseService {
        @cliCommand({
          command: 'parent.child get-all',
          description: 'Get all'
        })
        async getAll(): Promise<void> {}
      }

      const nestedService = new NestedService(config, executionContext, tokenManager);
      const metadata = getCliCommandMetadata(nestedService.getAll);
      
      expect(metadata?.commandPath).toBe('parent.child get-all');
    });

    it('should respect enabled flag', () => {
      const enabledMetadata = getCliCommandMetadata(service.getById);
      const disabledMetadata = getCliCommandMetadata(service.create);
      
      expect(enabledMetadata?.enabled).toBe(true);
      expect(disabledMetadata?.enabled).toBe(false);
    });

    it('should store parameter configurations', () => {
      const metadata = getCliCommandMetadata(service.getById);
      
      expect(metadata?.params).toBeDefined();
      expect(metadata?.params?.length).toBe(1);
      expect(metadata?.params?.[0].name).toBe('id');
      expect(metadata?.params?.[0].positional).toBe(true);
      expect(metadata?.params?.[0].required).toBe(true);
    });

    it('should store examples', () => {
      const metadata = getCliCommandMetadata(service.getById);
      
      expect(metadata?.examples).toBeDefined();
      expect(metadata?.examples?.length).toBe(1);
      expect(metadata?.examples?.[0]).toBe('uipath test get-by-id <id>');
    });
  });

  describe('getCliCommandsFromService', () => {
    it('should extract all CLI commands from service instance', () => {
      const commands = getCliCommandsFromService(service);
      
      expect(commands.size).toBe(2); // getById and getAll (create is disabled)
      expect(commands.has('test get-by-id')).toBe(true);
      expect(commands.has('test get-all')).toBe(true);
      expect(commands.has('test create')).toBe(false); // Disabled
    });

    it('should return metadata for each command', () => {
      const commands = getCliCommandsFromService(service);
      const getByIdCommand = commands.get('test get-by-id');
      
      expect(getByIdCommand).toBeDefined();
      expect(getByIdCommand?.methodName).toBe('getById');
      expect(getByIdCommand?.description).toBe('Get item by ID');
    });

    it('should only return enabled commands', () => {
      const commands = getCliCommandsFromService(service);
      
      // Should not include 'test create' because it's disabled
      expect(commands.has('test create')).toBe(false);
    });
  });

  describe('getCliCommandsFromClass', () => {
    it('should extract CLI commands from class before instantiation', () => {
      const commands = getCliCommandsFromClass(TestService);
      
      expect(commands.size).toBeGreaterThan(0);
      expect(commands.has('test get-by-id')).toBe(true);
    });
  });

  describe('Parameter configuration', () => {
    it('should support positional arguments', () => {
      const metadata = getCliCommandMetadata(service.getById);
      const param = metadata?.params?.[0];
      
      expect(param?.positional).toBe(true);
      expect(param?.required).toBe(true);
    });

    it('should support flags', () => {
      const metadata = getCliCommandMetadata(service.getAll);
      const param = metadata?.params?.[0];
      
      expect(param?.positional).toBe(false);
      expect(param?.flag).toBe('page-size');
      expect(param?.type).toBe('number');
    });

    it('should support multiple parameter types', () => {
      class MultiTypeService extends BaseService {
        @cliCommand({
          command: 'test multi',
          params: [
            { name: 'str', type: 'string' },
            { name: 'num', type: 'number' },
            { name: 'bool', type: 'boolean' },
            { name: 'arr', type: 'array', multiple: true },
            { name: 'json', type: 'json' }
          ]
        })
        async multiType(): Promise<void> {}
      }

      const multiService = new MultiTypeService(config, executionContext, tokenManager);
      const metadata = getCliCommandMetadata(multiService.multiType);
      
      expect(metadata?.params?.length).toBe(5);
      expect(metadata?.params?.find(p => p.name === 'str')?.type).toBe('string');
      expect(metadata?.params?.find(p => p.name === 'num')?.type).toBe('number');
      expect(metadata?.params?.find(p => p.name === 'bool')?.type).toBe('boolean');
      expect(metadata?.params?.find(p => p.name === 'arr')?.type).toBe('array');
      expect(metadata?.params?.find(p => p.name === 'json')?.type).toBe('json');
    });
  });

  describe('Command path generation', () => {
    it('should generate command path from service and method name', () => {
      class PathTestService extends BaseService {
        @cliCommand({
          description: 'Test'
        })
        async getById(): Promise<void> {}
      }

      const pathService = new PathTestService(config, executionContext, tokenManager);
      const metadata = getCliCommandMetadata(pathService.getById);
      
      // Should convert PathTestService -> path-test and getById -> get-by-id
      expect(metadata?.commandPath).toContain('get-by-id');
    });

    it('should use provided command path if specified', () => {
      const metadata = getCliCommandMetadata(service.getById);
      
      expect(metadata?.commandPath).toBe('test get-by-id');
      expect(metadata?.command).toBe('test get-by-id');
    });
  });

  describe('Edge cases', () => {
    it('should handle methods without params configuration', () => {
      class NoParamsService extends BaseService {
        @cliCommand({
          command: 'test no-params',
          description: 'No params'
        })
        async noParams(): Promise<void> {}
      }

      const noParamsService = new NoParamsService(config, executionContext, tokenManager);
      const metadata = getCliCommandMetadata(noParamsService.noParams);
      
      expect(metadata).not.toBeNull();
      expect(metadata?.params).toBeUndefined();
    });

    it('should handle aliases', () => {
      class AliasService extends BaseService {
        @cliCommand({
          command: 'test alias',
          aliases: ['get', 'fetch']
        })
        async aliasMethod(): Promise<void> {}
      }

      const aliasService = new AliasService(config, executionContext, tokenManager);
      const metadata = getCliCommandMetadata(aliasService.aliasMethod);
      
      expect(metadata?.aliases).toEqual(['get', 'fetch']);
    });

    it('should handle hidden commands', () => {
      class HiddenService extends BaseService {
        @cliCommand({
          command: 'test hidden',
          hidden: true
        })
        async hiddenMethod(): Promise<void> {}
      }

      const hiddenService = new HiddenService(config, executionContext, tokenManager);
      const metadata = getCliCommandMetadata(hiddenService.hiddenMethod);
      
      expect(metadata?.hidden).toBe(true);
    });
  });
});

