/**
 * Simple integration test to verify CLI framework works
 * This test verifies the basic functionality without complex imports
 */
import { describe, it, expect } from 'vitest';

// Test that we can at least import and use the decorator pattern
describe('CLI Framework Integration', () => {
  it('should be able to import CLI metadata', async () => {
    // Dynamic import to avoid module resolution issues
    const cliModule = await import('../../../src/core/cli/metadata');
    
    expect(cliModule).toBeDefined();
    expect(cliModule.cliCommand).toBeDefined();
    expect(typeof cliModule.cliCommand).toBe('function');
    expect(cliModule.isCliCommand).toBeDefined();
    expect(cliModule.getCliCommandMetadata).toBeDefined();
  });

  it('should be able to import CLI generator', async () => {
    const generatorModule = await import('../../../src/core/cli/generator');
    
    expect(generatorModule).toBeDefined();
    expect(generatorModule.generateOclifCommand).toBeDefined();
    expect(typeof generatorModule.generateOclifCommand).toBe('function');
  });

  it('should be able to import CLI extractor', async () => {
    const extractorModule = await import('../../../src/core/cli/extractor');
    
    expect(extractorModule).toBeDefined();
    expect(extractorModule.extractCliCommandsFromService).toBeDefined();
    expect(typeof extractorModule.extractCliCommandsFromService).toBe('function');
  });
});

