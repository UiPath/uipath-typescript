import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';

vi.mock('../../src/utils/resolve-credentials.js', () => ({
  loadAuthCredentials: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/commands/push.js', () => ({
  registerPushCommand: vi.fn(),
}));
vi.mock('../../src/commands/pull.js', () => ({
  registerPullCommand: vi.fn(),
}));
vi.mock('../../src/commands/pack.js', () => ({
  registerPackCommand: vi.fn(),
}));
vi.mock('../../src/commands/publish.js', () => ({
  registerPublishCommand: vi.fn(),
}));
vi.mock('../../src/commands/deploy.js', () => ({
  registerDeployCommand: vi.fn(),
}));

import { metadata, registerCommands } from '../../src/tool.js';
import { registerPushCommand } from '../../src/commands/push.js';
import { registerPullCommand } from '../../src/commands/pull.js';
import { registerPackCommand } from '../../src/commands/pack.js';
import { registerPublishCommand } from '../../src/commands/publish.js';
import { registerDeployCommand } from '../../src/commands/deploy.js';

describe('codedapp-tool', () => {
  describe('metadata', () => {
    it('should export correct tool name', () => {
      expect(metadata.name).toBe('codedapp-tool');
    });

    it('should have codedapp command prefix', () => {
      expect(metadata.commandPrefix).toBe('codedapp');
    });

    it('should have a version', () => {
      expect(metadata.version).toBeDefined();
      expect(typeof metadata.version).toBe('string');
    });

    it('should have a description', () => {
      expect(metadata.description).toBeDefined();
    });
  });

  describe('registerCommands', () => {
    let program: Command;

    beforeEach(() => {
      vi.clearAllMocks();
      program = new Command();
    });

    it('should register all 5 commands', () => {
      registerCommands(program);

      expect(registerPushCommand).toHaveBeenCalledWith(program);
      expect(registerPullCommand).toHaveBeenCalledWith(program);
      expect(registerPackCommand).toHaveBeenCalledWith(program);
      expect(registerPublishCommand).toHaveBeenCalledWith(program);
      expect(registerDeployCommand).toHaveBeenCalledWith(program);
    });

    it('should add a preAction hook', () => {
      const hookSpy = vi.spyOn(program, 'hook');
      registerCommands(program);

      expect(hookSpy).toHaveBeenCalledWith('preAction', expect.any(Function));
    });
  });
});
