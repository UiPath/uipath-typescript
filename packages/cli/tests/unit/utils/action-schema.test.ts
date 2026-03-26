import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs';

vi.mock('node:fs', async () => {
  const actual = await vi.importActual('node:fs');
  return { ...actual, readFileSync: vi.fn() };
});

import { readAndParseActionSchema } from '../../../src/utils/action-schema.js';

const emptySection = { type: 'object', properties: {} };

function makeSchema(overrides: Record<string, unknown> = {}) {
  return {
    inputs: emptySection,
    outputs: emptySection,
    inOuts: emptySection,
    outcomes: emptySection,
    ...overrides,
  };
}

describe('action-schema', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('readAndParseActionSchema', () => {
    it('should parse a valid action schema with inputs and outputs', () => {
      const schema = makeSchema({
        inputs: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'User name', required: true },
            age: { type: 'integer', description: 'User age' },
          },
        },
        outputs: {
          type: 'object',
          properties: {
            result: { type: 'boolean', description: 'Success flag' },
          },
        },
      });
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(schema));
      const result = readAndParseActionSchema();
      expect(result.inputs.length).toBe(2);
      expect(result.outputs.length).toBe(1);
      expect(result.inputs[0].name).toBe('name');
      expect(result.key).toBeDefined();
    });

    it('should parse schema with array types', () => {
      const schema = makeSchema({
        inputs: {
          type: 'object',
          properties: {
            tags: { type: 'array', items: { type: 'string' }, description: 'Tags' },
          },
        },
      });
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(schema));
      const result = readAndParseActionSchema();
      expect(result.inputs[0].isList).toBe(true);
    });

    it('should parse schema with object types and nested properties', () => {
      const schema = makeSchema({
        inputs: {
          type: 'object',
          properties: {
            address: {
              type: 'object',
              description: 'Address',
              properties: {
                street: { type: 'string', description: 'Street' },
                city: { type: 'string', description: 'City' },
              },
            },
          },
        },
      });
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(schema));
      const result = readAndParseActionSchema();
      expect(result.inputs[0].properties!.length).toBe(2);
    });

    it('should parse schema with outcomes', () => {
      const schema = makeSchema({
        outcomes: {
          type: 'object',
          properties: {
            success: { type: 'string', description: 'Success' },
            failure: { type: 'string', description: 'Failure' },
          },
        },
      });
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(schema));
      const result = readAndParseActionSchema();
      expect(result.outcomes.length).toBe(2);
    });

    it('should parse schema with inOuts', () => {
      const schema = makeSchema({
        inOuts: {
          type: 'object',
          properties: {
            counter: { type: 'integer', description: 'Counter' },
          },
        },
      });
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(schema));
      const result = readAndParseActionSchema();
      expect(result.inOuts.length).toBe(1);
    });

    it('should handle format types (uuid, date)', () => {
      const schema = makeSchema({
        inputs: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', description: 'ID' },
            birthday: { type: 'string', format: 'date', description: 'Birthday' },
          },
        },
      });
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(schema));
      const result = readAndParseActionSchema();
      expect(result.inputs.length).toBe(2);
    });

    it('should throw for invalid JSON', () => {
      vi.mocked(fs.readFileSync).mockReturnValue('not valid json');
      expect(() => readAndParseActionSchema()).toThrow();
    });

    it('should handle number type', () => {
      const schema = makeSchema({
        inputs: {
          type: 'object',
          properties: {
            amount: { type: 'number', description: 'Amount' },
          },
        },
      });
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(schema));
      const result = readAndParseActionSchema();
      expect(result.inputs[0].name).toBe('amount');
    });

    it('should handle empty sections', () => {
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(makeSchema()));
      const result = readAndParseActionSchema();
      expect(result.inputs).toEqual([]);
      expect(result.outputs).toEqual([]);
    });

    it('should throw for invalid schema (missing required sections)', () => {
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ inputs: emptySection }));
      expect(() => readAndParseActionSchema()).toThrow();
    });

    it('should parse array of objects with nested properties', () => {
      const schema = makeSchema({
        inputs: {
          type: 'object',
          properties: {
            users: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'Name' },
                },
              },
              description: 'Users',
            },
          },
        },
      });
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(schema));
      const result = readAndParseActionSchema();
      expect(result.inputs[0].isList).toBe(true);
      expect(result.inputs[0].properties!.length).toBe(1);
    });
  });
});
