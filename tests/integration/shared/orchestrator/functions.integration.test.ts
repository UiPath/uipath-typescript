import { describe, it, expect, beforeAll } from 'vitest';
import { getServices, getTestConfig, setupUnifiedTests, InitMode } from '../../config/unified-setup';
import { Functions } from '../../../../src/services/orchestrator/functions';
import { FunctionGetResponse } from '../../../../src/models/orchestrator/functions.models';

// New modular service — v1 init only.
const modes: InitMode[] = ['v1'];

describe.each(modes)('Functions - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  let functions!: Functions;
  let folderId!: number;
  let functionName!: string;
  let seededFunction!: FunctionGetResponse;

  beforeAll(async () => {
    const service = getServices().functions;
    if (!service) {
      throw new Error('Functions service is not registered for this init mode');
    }
    functions = service;

    const config = getTestConfig();
    if (!config.functionsTestFolderId) {
      throw new Error(
        'FUNCTIONS_TEST_FOLDER_ID is not configured. Set it to the numeric ID of a folder ' +
          'that contains at least one deployed coded function.',
      );
    }
    folderId = Number(config.functionsTestFolderId);

    if (!config.functionsTestFunctionName) {
      throw new Error(
        'FUNCTIONS_TEST_FUNCTION_NAME is not configured. Set it to the name of a deployed ' +
          'coded function in the test folder.',
      );
    }
    functionName = config.functionsTestFunctionName;

    // Shared lookup: fetch the function once so invoke tests can reuse it.
    const all = await functions.getAll({ folderId });
    const match = all.items.find((f) => f.name === functionName);
    if (!match) {
      throw new Error(
        `Function '${functionName}' was not found in folder ${folderId}. ` +
          'Ensure it is deployed and its release is added to the folder.',
      );
    }
    seededFunction = match;
  });

  describe('getAll', () => {
    it('should retrieve functions in the folder', async () => {
      const result = await functions.getAll({ folderId });

      expect(result).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBeGreaterThan(0);
    });

    it('should return functions with the transformed SDK shape (no raw PascalCase fields)', async () => {
      const fn = seededFunction;

      // Transformed camelCase / reshaped fields are present
      expect(typeof fn.name).toBe('string');
      expect(typeof fn.slug).toBe('string');
      expect(typeof fn.method).toBe('string');
      expect(typeof fn.processName).toBe('string');
      expect(typeof fn.processSlug).toBe('string');
      expect(typeof fn.folderId).toBe('number');

      // Raw API fields must be absent after transformation
      expect((fn as any).OrganizationUnitId).toBeUndefined();
      expect((fn as any).ReleaseKey).toBeUndefined();
      expect((fn as any).Release).toBeUndefined();

      // Bound method is attached
      expect(typeof fn.invoke).toBe('function');
    });

    it('should support pagination', async () => {
      const result = await functions.getAll({ folderId, pageSize: 1 });

      expect(result.items.length).toBeLessThanOrEqual(1);
      expect(result.currentPage).toBe(1);
      expect(typeof result.hasNextPage).toBe('boolean');
    });

    it('should resolve folder context from folderKey', async () => {
      const config = getTestConfig();
      if (!config.folderKey) {
        throw new Error(
          'INTEGRATION_TEST_FOLDER_KEY is not configured; required to exercise folderKey scoping.',
        );
      }

      const result = await functions.getAll({ folderKey: config.folderKey });
      expect(Array.isArray(result.items)).toBe(true);
    });
  });

  describe('invoke', () => {
    it('should invoke a function by name and return its output', async () => {
      const output = await functions.invoke<Record<string, unknown>, unknown>(
        functionName,
        {},
        { folderId },
      );

      expect(output).toBeDefined();
    });

    it('should invoke via the bound method on a function response', async () => {
      const output = await seededFunction.invoke({});

      expect(output).toBeDefined();
    });
  });
});
