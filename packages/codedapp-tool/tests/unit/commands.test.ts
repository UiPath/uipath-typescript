import { describe, it, expect, vi } from 'vitest';
import { Command } from 'commander';

vi.mock('@uipath/uipath-ts-cli/actions', () => ({
  executePush: vi.fn().mockResolvedValue(undefined),
  executePull: vi.fn().mockResolvedValue(undefined),
  executePack: vi.fn().mockResolvedValue(undefined),
  executePublish: vi.fn().mockResolvedValue(undefined),
  executeDeploy: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@uipath/auth', () => ({
  getLoginStatusAsync: vi.fn().mockResolvedValue({ loginStatus: 'Not logged in' }),
  resolveEnvFilePathAsync: vi.fn(),
  saveEnvFileAsync: vi.fn(),
}));

vi.mock('../../src/utils/folder-selection.js', () => ({
  ensureFolderKey: vi.fn().mockResolvedValue(undefined),
}));

import { registerPushCommand } from '../../src/commands/push.js';
import { registerPullCommand } from '../../src/commands/pull.js';
import { registerPackCommand } from '../../src/commands/pack.js';
import { registerPublishCommand } from '../../src/commands/publish.js';
import { registerDeployCommand } from '../../src/commands/deploy.js';

describe('Command Registration', () => {
  describe('push command', () => {
    it('should register push command on program', () => {
      const program = new Command();
      registerPushCommand(program);

      const pushCmd = program.commands.find((c) => c.name() === 'push');
      expect(pushCmd).toBeDefined();
      expect(pushCmd!.description()).toContain('Push');
    });

    it('should have correct options', () => {
      const program = new Command();
      registerPushCommand(program);

      const pushCmd = program.commands.find((c) => c.name() === 'push')!;
      const optionNames = pushCmd.options.map((o) => o.long);
      expect(optionNames).toContain('--buildDir');
      expect(optionNames).toContain('--ignoreResources');
      expect(optionNames).toContain('--baseUrl');
      expect(optionNames).toContain('--orgId');
      expect(optionNames).toContain('--tenantId');
      expect(optionNames).toContain('--accessToken');
    });
  });

  describe('pull command', () => {
    it('should register pull command on program', () => {
      const program = new Command();
      registerPullCommand(program);

      const pullCmd = program.commands.find((c) => c.name() === 'pull');
      expect(pullCmd).toBeDefined();
      expect(pullCmd!.description()).toContain('Pull');
    });

    it('should have overwrite option', () => {
      const program = new Command();
      registerPullCommand(program);

      const pullCmd = program.commands.find((c) => c.name() === 'pull')!;
      const optionNames = pullCmd.options.map((o) => o.long);
      expect(optionNames).toContain('--overwrite');
      expect(optionNames).toContain('--targetDir');
    });
  });

  describe('pack command', () => {
    it('should register pack command on program', () => {
      const program = new Command();
      registerPackCommand(program);

      const packCmd = program.commands.find((c) => c.name() === 'pack');
      expect(packCmd).toBeDefined();
      expect(packCmd!.description()).toContain('Package');
    });

    it('should require dist argument', () => {
      const program = new Command();
      registerPackCommand(program);

      const packCmd = program.commands.find((c) => c.name() === 'pack')!;
      const args = packCmd.registeredArguments;
      expect(args.length).toBeGreaterThan(0);
      expect(args[0].required).toBe(true);
    });

    it('should have packaging options', () => {
      const program = new Command();
      registerPackCommand(program);

      const packCmd = program.commands.find((c) => c.name() === 'pack')!;
      const optionNames = packCmd.options.map((o) => o.long);
      expect(optionNames).toContain('--name');
      expect(optionNames).toContain('--version');
      expect(optionNames).toContain('--output');
      expect(optionNames).toContain('--dry-run');
    });
  });

  describe('publish command', () => {
    it('should register publish command on program', () => {
      const program = new Command();
      registerPublishCommand(program);

      const publishCmd = program.commands.find((c) => c.name() === 'publish');
      expect(publishCmd).toBeDefined();
      expect(publishCmd!.description()).toContain('Publish');
    });

    it('should have publish options', () => {
      const program = new Command();
      registerPublishCommand(program);

      const publishCmd = program.commands.find((c) => c.name() === 'publish')!;
      const optionNames = publishCmd.options.map((o) => o.long);
      expect(optionNames).toContain('--name');
      expect(optionNames).toContain('--version');
      expect(optionNames).toContain('--type');
      expect(optionNames).toContain('--uipathDir');
    });
  });

  describe('deploy command', () => {
    it('should register deploy command on program', () => {
      const program = new Command();
      registerDeployCommand(program);

      const deployCmd = program.commands.find((c) => c.name() === 'deploy');
      expect(deployCmd).toBeDefined();
      expect(deployCmd!.description()).toContain('Deploy');
    });

    it('should have deploy options', () => {
      const program = new Command();
      registerDeployCommand(program);

      const deployCmd = program.commands.find((c) => c.name() === 'deploy')!;
      const optionNames = deployCmd.options.map((o) => o.long);
      expect(optionNames).toContain('--name');
      expect(optionNames).toContain('--folderKey');
      expect(optionNames).toContain('--orgName');
    });
  });
});
