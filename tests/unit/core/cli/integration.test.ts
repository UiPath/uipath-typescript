/**
 * Integration test for CLI framework
 * Tests the CLI decorator on actual service methods
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { EntityService } from '../../../src/services/data-fabric/entities';
import { createServiceTestDependencies } from '../../../tests/utils/setup';
import { getCliCommandsFromService, isCliCommand, getCliCommandMetadata } from '../../../src/core/cli/metadata';

describe('CLI Framework Integration', () => {
  let entityService: EntityService;
  const { config, executionContext, tokenManager } = createServiceTestDependencies();

  beforeEach(() => {
    entityService = new EntityService(config, executionContext, tokenManager);
  });

  it('should detect CLI command on getById method', () => {
    // The getById method should have @cliCommand decorator
    expect(isCliCommand(entityService.getById)).toBe(true);
  });

  it('should extract CLI metadata from getById', () => {
    const metadata = getCliCommandMetadata(entityService.getById);
    
    expect(metadata).not.toBeNull();
    expect(metadata?.command).toBe('entities get-by-id');
    expect(metadata?.description).toBeDefined();
    expect(metadata?.methodName).toBe('getById');
  });

  it('should extract CLI commands from EntityService', () => {
    const commands = getCliCommandsFromService(entityService);
    
    // Should have at least getById command
    expect(commands.size).toBeGreaterThan(0);
    expect(commands.has('entities get-by-id')).toBe(true);
  });

  it('should have parameter configuration for getById', () => {
    const metadata = getCliCommandMetadata(entityService.getById);
    
    expect(metadata?.params).toBeDefined();
    expect(metadata?.params?.length).toBeGreaterThan(0);
    expect(metadata?.params?.[0].name).toBe('id');
    expect(metadata?.params?.[0].positional).toBe(true);
  });
});

