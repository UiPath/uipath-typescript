import { it, expect, beforeAll, afterAll } from 'vitest';
import {
  getServices,
  getTestConfig,
  describeIntegration,
  InitMode,
} from '../../config/unified-setup';
import { createEntityAwaitingReady, generateRandomString, wait } from '../../utils/helpers';
import {
  EntityFieldDataType,
  EntityCloneScopeType,
  EntityCloneMode,
  EntityCloneJobState,
} from '../../../../src/models/data-fabric/entities.types';

// Clone is a schema+data write that runs in a background job. Like the schema suite it is
// v1-only (both init modes resolve to the same EntityService, so v0 re-proves nothing).
const modes: InitMode[] = ['v1'];

// Skipped in CI by design: clone drives an asynchronous, server-side job that can take many
// minutes to reach a terminal state, which is too slow for a per-PR run. Flip `skip` to false
// (or run this file directly) to exercise it manually against a live tenant.
const TERMINAL_STATES: EntityCloneJobState[] = [
  EntityCloneJobState.Done,
  EntityCloneJobState.Failed,
  EntityCloneJobState.RolledBack,
  EntityCloneJobState.RollbackFailed,
];

describeIntegration('Data Fabric Entities Clone - Integration Tests', 'both', modes, () => {

  // Tenant-level sources created by this suite, and folder-scoped clones landed in the
  // target folder — both cleaned up in afterAll. A source is registered only after its
  // clone reaches a terminal state, so a timeout never deletes a source mid-copy (which
  // would fault the still-running job with a TOCTOU rollback).
  const createdTenantEntityIds: string[] = [];
  const createdFolderEntityIds: string[] = [];
  let targetFolderKey!: string;

  beforeAll(() => {
    const folderKey = getTestConfig().folderKey;
    if (!folderKey) {
      throw new Error('INTEGRATION_TEST_FOLDER_KEY is required for the clone suite (used as the clone target folder).');
    }
    targetFolderKey = folderKey;
  });

  it('clones a tenant entity into a folder and reaches Done', async () => {
    const { entities } = getServices();
    const sourceName = `sdk_clone_src_${generateRandomString(8).toLowerCase()}`;

    // 1. Create a fresh, uniquely-named tenant entity so the target folder has no name conflict.
    const sourceId = await createEntityAwaitingReady(entities, sourceName, [
      { name: 'title', displayName: 'Title', type: EntityFieldDataType.STRING },
      { name: 'count', displayName: 'Count', type: EntityFieldDataType.DECIMAL, decimalPrecision: 0 },
    ], { description: 'Clone integration source' });

    // 2. Start the clone.
    const job = await entities.clone({
      source: { scopeType: EntityCloneScopeType.Tenant },
      target: { scopeType: EntityCloneScopeType.Folder, folderId: targetFolderKey },
      entityIds: [sourceId],
      options: { mode: EntityCloneMode.SchemaAndData },
    });

    expect(typeof job.jobId).toBe('string');
    expect(job.jobId.length).toBeGreaterThan(0);
    expect(Object.values(EntityCloneJobState)).toContain(job.state);

    // Transform validation: the SDK exposes createdTime, never the API's createdAt.
    expect(typeof job.createdTime).toBe('string');
    expect((job as any).createdAt).toBeUndefined();

    // 3. Poll to a terminal state. Only the status read is wrapped — transient 5xx during
    //    a minutes-long job should retry, not fail the test. The source is deleted only
    //    after this loop terminates, so it survives the whole copy.
    let status = job;
    const deadline = Date.now() + 15 * 60 * 1000;
    while (!TERMINAL_STATES.includes(status.state)) {
      if (Date.now() > deadline) {
        // Leave the source registered for cleanup only now that we've stopped polling —
        // the job is abandoned, so deleting the source can no longer fault an active copy.
        createdTenantEntityIds.push(sourceId);
        throw new Error(`Clone job ${job.jobId} did not reach a terminal state within 15 minutes (last: ${status.state}).`);
      }
      await wait(5000);
      try {
        status = await entities.getCloneStatus(job.jobId);
      } catch (error) {
        console.warn(`[clone] transient status poll error for ${job.jobId}, retrying:`, error);
      }
    }

    // Terminal — now safe to register the source (and any clone) for teardown.
    createdTenantEntityIds.push(sourceId);
    const folderEntities = await entities.getAll({ folderKey: targetFolderKey });
    const cloned = folderEntities.find((e) => e.name === sourceName);
    if (cloned?.id) {
      createdFolderEntityIds.push(cloned.id);
    }

    expect(status.state).toBe(EntityCloneJobState.Done);
    // Transform validation: getCloneStatus() must also expose createdTime, never the API's createdAt.
    expect(typeof status.createdTime).toBe('string');
    expect((status as any).createdAt).toBeUndefined();
  }, 18 * 60 * 1000);

  it('throws when polling a non-existent clone job', async () => {
    const { entities } = getServices();
    const missingJobId = '00000000-0000-0000-0000-0000000000ff';

    await expect(entities.getCloneStatus(missingJobId)).rejects.toThrow();
  });

  afterAll(async () => {
    const { entities } = getServices();
    for (const id of createdFolderEntityIds) {
      try {
        await entities.deleteById(id, { folderKey: targetFolderKey });
      } catch (error) {
        console.warn(`Failed to clean up cloned entity ${id}:`, error);
      }
    }
    for (const id of createdTenantEntityIds) {
      try {
        await entities.deleteById(id);
      } catch (error) {
        console.warn(`Failed to clean up source entity ${id}:`, error);
      }
    }
  }, 120_000);
}, { skip: true });
