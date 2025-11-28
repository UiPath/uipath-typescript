import { describe, it, expect } from 'vitest';
import {
  generateOclifCommand,
  generateOclifCommandClass,
  GeneratedOclifCommand,
  OclifFlagDefinition
} from '../../../src/core/cli/generator';
import { CliCommandMetadata } from '../../../src/core/cli/metadata';

describe('CLI Generator', () => {
  describe('generateOclifCommand', () => {
    it('should generate OCLIF command structure from metadata', () => {
      const metadata: CliCommandMetadata = {
        command: 'entities get-by-id',
        commandPath: 'entities get-by-id',
        description: 'Get entity by ID',
        methodName: 'getById',
        className: 'EntityService',
        servicePath: 'entities',
        enabled: true,
        params: [
          {
            name: 'id',
            positional: true,
            required: true,
            description: 'Entity UUID'
          }
        ]
      };

      const command = generateOclifCommand(metadata);

      expect(command.id).toBe('entities:get-by-id');
      expect(command.description).toBe('Get entity by ID');
      expect(command.args.length).toBe(1);
      expect(command.args[0].name).toBe('id');
      expect(command.args[0].required).toBe(true);
      expect(Object.keys(command.flags).length).toBe(0); // No flags, only positional
    });

    it('should convert command path to OCLIF command ID', () => {
      const metadata: CliCommandMetadata = {
        command: 'maestro cases get-all',
        commandPath: 'maestro cases get-all',
        description: 'Get all cases',
        methodName: 'getAll',
        className: 'CasesService',
        servicePath: 'maestro.cases',
        enabled: true
      };

      const command = generateOclifCommand(metadata);

      expect(command.id).toBe('maestro:cases:get-all');
    });

    it('should map positional arguments correctly', () => {
      const metadata: CliCommandMetadata = {
        command: 'test command',
        commandPath: 'test command',
        description: 'Test',
        methodName: 'test',
        className: 'TestService',
        servicePath: 'test',
        enabled: true,
        params: [
          { name: 'id', positional: true, required: true, description: 'ID' },
          { name: 'name', positional: true, required: false, description: 'Name' }
        ]
      };

      const command = generateOclifCommand(metadata);

      expect(command.args.length).toBe(2);
      expect(command.args[0].name).toBe('id');
      expect(command.args[0].required).toBe(true);
      expect(command.args[1].name).toBe('name');
      expect(command.args[1].required).toBe(false);
    });

    it('should map flags correctly', () => {
      const metadata: CliCommandMetadata = {
        command: 'test command',
        commandPath: 'test command',
        description: 'Test',
        methodName: 'test',
        className: 'TestService',
        servicePath: 'test',
        enabled: true,
        params: [
          {
            name: 'options',
            flag: 'page-size',
            char: 'p',
            type: 'number',
            description: 'Page size',
            default: 50
          },
          {
            name: 'options',
            flag: 'verbose',
            type: 'boolean',
            description: 'Verbose output'
          }
        ]
      };

      const command = generateOclifCommand(metadata);

      expect(command.flags['page-size']).toBeDefined();
      expect(command.flags['page-size'].char).toBe('p');
      expect(command.flags['page-size'].type).toBe('number');
      expect(command.flags['page-size'].default).toBe(50);
      expect(command.flags['verbose']).toBeDefined();
      expect(command.flags['verbose'].type).toBe('boolean');
    });

    it('should handle mixed positional and flag parameters', () => {
      const metadata: CliCommandMetadata = {
        command: 'test command',
        commandPath: 'test command',
        description: 'Test',
        methodName: 'test',
        className: 'TestService',
        servicePath: 'test',
        enabled: true,
        params: [
          { name: 'id', positional: true, required: true },
          { name: 'options', flag: 'page-size', type: 'number' }
        ]
      };

      const command = generateOclifCommand(metadata);

      expect(command.args.length).toBe(1);
      expect(command.flags['page-size']).toBeDefined();
    });

    it('should include examples if provided', () => {
      const metadata: CliCommandMetadata = {
        command: 'test command',
        commandPath: 'test command',
        description: 'Test',
        methodName: 'test',
        className: 'TestService',
        servicePath: 'test',
        enabled: true,
        examples: [
          'uipath test command <id>',
          'uipath test command <id> --flag value'
        ]
      };

      const command = generateOclifCommand(metadata);

      expect(command.examples).toEqual([
        'uipath test command <id>',
        'uipath test command <id> --flag value'
      ]);
    });

    it('should include aliases if provided', () => {
      const metadata: CliCommandMetadata = {
        command: 'test command',
        commandPath: 'test command',
        description: 'Test',
        methodName: 'test',
        className: 'TestService',
        servicePath: 'test',
        enabled: true,
        aliases: ['get', 'fetch']
      };

      const command = generateOclifCommand(metadata);

      expect(command.aliases).toEqual(['get', 'fetch']);
    });

    it('should mark hidden commands', () => {
      const metadata: CliCommandMetadata = {
        command: 'test command',
        commandPath: 'test command',
        description: 'Test',
        methodName: 'test',
        className: 'TestService',
        servicePath: 'test',
        enabled: true,
        hidden: true
      };

      const command = generateOclifCommand(metadata);

      expect(command.hidden).toBe(true);
    });

    it('should auto-generate flag names from parameter names', () => {
      const metadata: CliCommandMetadata = {
        command: 'test command',
        commandPath: 'test command',
        description: 'Test',
        methodName: 'test',
        className: 'TestService',
        servicePath: 'test',
        enabled: true,
        params: [
          {
            name: 'entityId',
            // No flag specified, should auto-generate
            type: 'string',
            description: 'Entity ID'
          }
        ]
      };

      const command = generateOclifCommand(metadata);

      // Should convert entityId to entity-id
      expect(command.flags['entity-id']).toBeDefined();
    });
  });

  describe('generateOclifCommandClass', () => {
    it('should generate TypeScript code for OCLIF command class', () => {
      const command: GeneratedOclifCommand = {
        id: 'entities:get-by-id',
        description: 'Get entity by ID',
        examples: ['uipath entities get-by-id <id>'],
        flags: {},
        args: [
          {
            name: 'id',
            description: 'Entity UUID',
            required: true
          }
        ],
        metadata: {
          command: 'entities get-by-id',
          commandPath: 'entities get-by-id',
          methodName: 'getById',
          className: 'EntityService',
          servicePath: 'entities',
          enabled: true
        }
      };

      const code = generateOclifCommandClass(command, 'entities', 'getById');

      expect(code).toContain('class EntitiesGetById');
      expect(code).toContain("description = 'Get entity by ID'");
      expect(code).toContain("'uipath entities get-by-id <id>'");
      expect(code).toContain("name: 'id'");
      expect(code).toContain('sdk.entities.getById');
    });

    it('should generate flags code', () => {
      const command: GeneratedOclifCommand = {
        id: 'test:command',
        description: 'Test',
        flags: {
          'page-size': {
            char: 'p',
            description: 'Page size',
            type: 'number',
            default: 50
          },
          'verbose': {
            description: 'Verbose output',
            type: 'boolean'
          }
        },
        args: [],
        metadata: {
          command: 'test command',
          commandPath: 'test command',
          methodName: 'test',
          className: 'TestService',
          servicePath: 'test',
          enabled: true
        }
      };

      const code = generateOclifCommandClass(command, 'test', 'test');

      expect(code).toContain('page-size');
      expect(code).toContain("char: 'p'");
      expect(code).toContain('Flags.number');
      expect(code).toContain('Flags.boolean');
    });

    it('should generate method call with positional args', () => {
      const command: GeneratedOclifCommand = {
        id: 'test:command',
        description: 'Test',
        flags: {},
        args: [
          { name: 'id', description: 'ID', required: true },
          { name: 'name', description: 'Name', required: false }
        ],
        metadata: {
          command: 'test command',
          commandPath: 'test command',
          methodName: 'test',
          className: 'TestService',
          servicePath: 'test',
          enabled: true
        }
      };

      const code = generateOclifCommandClass(command, 'test', 'test');

      expect(code).toContain('args.id');
      expect(code).toContain('args.name');
    });

    it('should generate method call with flags as options', () => {
      const command: GeneratedOclifCommand = {
        id: 'test:command',
        description: 'Test',
        flags: {
          'page-size': {
            description: 'Page size',
            type: 'number'
          }
        },
        args: [{ name: 'id', description: 'ID', required: true }],
        metadata: {
          command: 'test command',
          commandPath: 'test command',
          methodName: 'test',
          className: 'TestService',
          servicePath: 'test',
          enabled: true
        }
      };

      const code = generateOclifCommandClass(command, 'test', 'test');

      expect(code).toContain('flags.page-size');
      expect(code).toContain('pageSize: flags.page-size');
    });
  });
});

