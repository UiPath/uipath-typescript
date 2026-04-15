import { describe, it, expect, vi } from 'vitest';
import {
  computeExecutionPlan,
  computeFirstPushPlan,
  convertPlanToMigration,
} from '../../../../src/core/webapp-file-handler/push-plan.js';
import type {
  LocalFileWithRemote,
  ProjectFile,
  ProjectFolder,
  FileOperationPlan,
} from '../../../../src/core/webapp-file-handler/types.js';

const mockLocalFile = (remotePath: string, hash = 'hash1') => ({
  localFile: {
    path: remotePath.replace('source/', ''),
    absPath: `/root/${remotePath.replace('source/', '')}`,
    hash,
    content: Buffer.from('content'),
  },
  remotePath,
});

describe('push-plan', () => {
  describe('computeExecutionPlan', () => {
    it('should plan upload for new files', async () => {
      const localFiles: LocalFileWithRemote[] = [mockLocalFile('source/dist/app.js')];
      const remoteFiles = new Map<string, ProjectFile>();
      const remoteFolders = new Map<string, ProjectFolder>();
      const plan = await computeExecutionPlan(localFiles, remoteFiles, remoteFolders, {
        bundlePath: 'dist',
        remoteContentRoot: 'source/dist',
        downloadRemoteFile: vi.fn(),
        computeHash: vi.fn(),
      });
      expect(plan.uploadFiles.length).toBe(1);
      expect(plan.uploadFiles[0].path).toBe('source/dist/app.js');
    });

    it('should plan update for changed files', async () => {
      const localFiles: LocalFileWithRemote[] = [mockLocalFile('source/dist/app.js', 'new-hash')];
      const remoteFiles = new Map<string, ProjectFile>([['source/dist/app.js', { id: 'f1', name: 'app.js' }]]);
      const remoteFolders = new Map<string, ProjectFolder>();
      const plan = await computeExecutionPlan(localFiles, remoteFiles, remoteFolders, {
        bundlePath: 'dist',
        remoteContentRoot: 'source/dist',
        downloadRemoteFile: vi.fn().mockResolvedValue(Buffer.from('old')),
        computeHash: vi.fn().mockReturnValue('old-hash'),
      });
      expect(plan.updateFiles.length).toBe(1);
    });

    it('should skip unchanged files', async () => {
      const localFiles: LocalFileWithRemote[] = [mockLocalFile('source/dist/app.js', 'same-hash')];
      const remoteFiles = new Map<string, ProjectFile>([['source/dist/app.js', { id: 'f1', name: 'app.js' }]]);
      const plan = await computeExecutionPlan(localFiles, remoteFiles, new Map(), {
        bundlePath: 'dist',
        remoteContentRoot: 'source/dist',
        downloadRemoteFile: vi.fn().mockResolvedValue(Buffer.from('content')),
        computeHash: vi.fn().mockReturnValue('same-hash'),
      });
      expect(plan.updateFiles.length).toBe(0);
      expect(plan.uploadFiles.length).toBe(0);
    });

    it('should plan delete for remote files not in local', async () => {
      const localFiles: LocalFileWithRemote[] = [];
      const remoteFiles = new Map<string, ProjectFile>([['source/dist/old.js', { id: 'f1', name: 'old.js' }]]);
      const remoteFolders = new Map<string, ProjectFolder>();
      const plan = await computeExecutionPlan(localFiles, remoteFiles, remoteFolders, {
        bundlePath: 'dist',
        remoteContentRoot: 'source/dist',
        downloadRemoteFile: vi.fn(),
        computeHash: vi.fn(),
      });
      expect(plan.deleteFiles.length).toBe(1);
    });

    it('should collect required folders to create', async () => {
      const localFiles: LocalFileWithRemote[] = [mockLocalFile('source/dist/assets/img.png')];
      const plan = await computeExecutionPlan(localFiles, new Map(), new Map(), {
        bundlePath: 'dist',
        remoteContentRoot: 'source/dist',
        downloadRemoteFile: vi.fn(),
        computeHash: vi.fn(),
      });
      expect(plan.createFolders.length).toBeGreaterThan(0);
    });
  });

  describe('computeFirstPushPlan', () => {
    it('should create upload entries for all local files', () => {
      const localFiles: LocalFileWithRemote[] = [
        mockLocalFile('source/dist/app.js'),
        mockLocalFile('source/package.json'),
      ];
      const plan = computeFirstPushPlan(localFiles, new Map());
      expect(plan.uploadFiles.length).toBe(2);
      expect(plan.deleteFiles.length).toBe(0);
    });

    it('should collect folder paths from files', () => {
      const localFiles: LocalFileWithRemote[] = [mockLocalFile('source/dist/assets/style.css')];
      const plan = computeFirstPushPlan(localFiles, new Map());
      expect(plan.createFolders.length).toBeGreaterThan(0);
    });

    it('should handle empty file list', () => {
      const plan = computeFirstPushPlan([], new Map());
      expect(plan.uploadFiles.length).toBe(0);
      expect(plan.createFolders.length).toBe(0);
    });
  });

  describe('convertPlanToMigration', () => {
    it('should convert upload to addedResources', () => {
      const plan: FileOperationPlan = {
        createFolders: [],
        uploadFiles: [
          {
            path: 'source/dist/app.js',
            localFile: { path: 'dist/app.js', absPath: '/x', hash: 'h', content: Buffer.from('x') },
            parentPath: 'source/dist',
          },
        ],
        updateFiles: [],
        deleteFiles: [],
        deleteFolders: [],
      };
      const migration = convertPlanToMigration(plan);
      expect(migration.addedResources.length).toBe(1);
    });

    it('should convert update to modifiedResources', () => {
      const plan: FileOperationPlan = {
        createFolders: [],
        uploadFiles: [],
        updateFiles: [
          {
            path: 'source/dist/app.js',
            localFile: { path: 'dist/app.js', absPath: '/x', hash: 'h', content: Buffer.from('x') },
            fileId: 'f1',
          },
        ],
        deleteFiles: [],
        deleteFolders: [],
      };
      const migration = convertPlanToMigration(plan);
      expect(migration.modifiedResources.length).toBe(1);
      expect(migration.modifiedResources[0].id).toBe('f1');
    });

    it('should convert delete to deletedResources', () => {
      const plan: FileOperationPlan = {
        createFolders: [],
        uploadFiles: [],
        updateFiles: [],
        deleteFiles: [{ fileId: 'f1', path: 'source/dist/old.js' }],
        deleteFolders: [],
      };
      const migration = convertPlanToMigration(plan);
      expect(migration.deletedResources.length).toBe(1);
      expect(migration.deletedResources[0]).toBe('f1');
    });
  });
});
