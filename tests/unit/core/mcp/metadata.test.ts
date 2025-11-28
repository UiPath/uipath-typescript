import { describe, it, expect, beforeEach } from 'vitest';
import {
  mcpTool,
  isMcpTool,
  getMcpToolMetadata,
  getMcpToolsFromService,
  getMcpToolsFromClass,
  McpToolOptions,
  McpToolMetadata
} from '../../../../src/core/mcp/metadata';
import { BaseService } from '../../../../src/services/base';
import { createServiceTestDependencies } from '../../../utils/setup';

/**
 * Test service class with MCP tools
 */
class TestService extends BaseService {
  @mcpTool({
    name: 'test_getById',
    description: 'Get item by ID'
  })
  async getById(id: string): Promise<{ id: string }> {
    return { id };
  }

  @mcpTool({
    name: 'test_getAll',
    description: 'Get all items'
  })
  async getAll(): Promise<{ items: any[] }> {
    return { items: [] };
  }

  @mcpTool({
    name: 'test_create',
    description: 'Create item',
    enabled: false
  })
  async create(data: any): Promise<any> {
    return {};
  }

  // Method without MCP decorator
  async internalMethod(): Promise<void> {
    // Internal method
  }
}

describe('MCP Metadata System', () => {
  let service: TestService;
  const { config, executionContext, tokenManager } = createServiceTestDependencies();

  beforeEach(() => {
    service = new TestService(config, executionContext, tokenManager);
  });

  describe('@mcpTool decorator', () => {
    it('should mark method as MCP tool', () => {
      expect(isMcpTool(service.getById)).toBe(true);
      expect(isMcpTool(service.getAll)).toBe(true);
      expect(isMcpTool(service.internalMethod)).toBe(false);
    });

    it('should store metadata on method', () => {
      const metadata = getMcpToolMetadata(service.getById);
      
      expect(metadata).not.toBeNull();
      expect(metadata?.name).toBe('test_getById');
      expect(metadata?.description).toBe('Get item by ID');
      expect(metadata?.methodName).toBe('getById');
      expect(metadata?.className).toBe('TestService');
    });

    it('should respect enabled flag', () => {
      const enabledMetadata = getMcpToolMetadata(service.getById);
      const disabledMetadata = getMcpToolMetadata(service.create);
      
      expect(enabledMetadata?.enabled).toBe(true);
      expect(disabledMetadata?.enabled).toBe(false);
    });

    it('should store service path', () => {
      const metadata = getMcpToolMetadata(service.getById);
      
      expect(metadata?.servicePath).toBeDefined();
      expect(metadata?.servicePath).toBe('test');
    });
  });

  describe('getMcpToolsFromService', () => {
    it('should extract all MCP tools from service instance', () => {
      const tools = getMcpToolsFromService(service);
      
      expect(tools.size).toBe(2); // getById and getAll (create is disabled)
      expect(tools.has('test_getById')).toBe(true);
      expect(tools.has('test_getAll')).toBe(true);
      expect(tools.has('test_create')).toBe(false); // Disabled
    });

    it('should return metadata for each tool', () => {
      const tools = getMcpToolsFromService(service);
      const getByIdTool = tools.get('test_getById');
      
      expect(getByIdTool).toBeDefined();
      expect(getByIdTool?.methodName).toBe('getById');
      expect(getByIdTool?.description).toBe('Get item by ID');
    });

    it('should only return enabled tools', () => {
      const tools = getMcpToolsFromService(service);
      
      // Should not include 'test_create' because it's disabled
      expect(tools.has('test_create')).toBe(false);
    });
  });

  describe('getMcpToolsFromClass', () => {
    it('should extract MCP tools from class before instantiation', () => {
      const tools = getMcpToolsFromClass(TestService);
      
      expect(tools.size).toBeGreaterThan(0);
      expect(tools.has('test_getById')).toBe(true);
    });
  });

  describe('Nested service paths', () => {
    it('should handle nested service paths', () => {
      class NestedService extends BaseService {
        @mcpTool({
          name: 'parent.child_getAll',
          description: 'Get all'
        })
        async getAll(): Promise<void> {}
      }

      const nestedService = new NestedService(config, executionContext, tokenManager);
      const metadata = getMcpToolMetadata(nestedService.getAll);
      
      expect(metadata?.name).toBe('parent.child_getAll');
      expect(metadata?.servicePath).toBeDefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle methods without description', () => {
      class NoDescService extends BaseService {
        @mcpTool({
          name: 'test_noDesc'
        })
        async noDesc(): Promise<void> {}
      }

      const noDescService = new NoDescService(config, executionContext, tokenManager);
      const metadata = getMcpToolMetadata(noDescService.noDesc);
      
      expect(metadata).not.toBeNull();
      expect(metadata?.description).toBeUndefined();
    });

    it('should handle services with no MCP tools', () => {
      class NoToolService extends BaseService {
        async regularMethod(): Promise<void> {}
      }

      const noToolService = new NoToolService(config, executionContext, tokenManager);
      const tools = getMcpToolsFromService(noToolService);
      
      expect(tools.size).toBe(0);
    });
  });
});

