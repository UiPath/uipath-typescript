import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getServices, getTestConfig, setupUnifiedTests, InitMode } from '../../config/unified-setup';
import { generateRandomString } from '../../utils/helpers';
import type { JobGetResponse } from '../../../../src/models/orchestrator/jobs.models';

const modes: InitMode[] = ['v1'];

function getJobsService() {
  const { jobs } = getServices();
  const config = getTestConfig();

  if (!jobs) {
    throw new Error('Jobs service not available in test services');
  }

  const folderId = config.folderId ? Number(config.folderId) : undefined;

  return { jobs, folderId };
}

describe.each(modes)('Orchestrator Jobs - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  describe('getAll', () => {
    it('should retrieve all jobs', async () => {
      const { jobs, folderId } = getJobsService();

      const result = await jobs.getAll({
        folderId,
        pageSize: 100,
      });

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('should retrieve jobs with pagination options', async () => {
      const { jobs, folderId } = getJobsService();

      const result = await jobs.getAll({
        folderId,
        pageSize: 10,
      });

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBeLessThanOrEqual(10);
    });

    it('should retrieve jobs with filter', async () => {
      const { jobs, folderId } = getJobsService();

      const result = await jobs.getAll({
        folderId,
        pageSize: 5,
        filter: "State eq 'Successful'",
      });

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('should retrieve jobs filtered and sorted by SDK field names', async () => {
      const { jobs, folderId } = getJobsService();

      // Uses SDK names that the field map renames:
      //   processName → releaseName, createdTime → creationTime.
      // If the rewriter doesn't translate these, the API returns 400.
      const result = await jobs.getAll({
        folderId,
        pageSize: 5,
        orderby: 'createdTime desc',
        select: 'key,processName,state,createdTime',
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      // Response is also in SDK shape — `createdTime` is the renamed key.
      if (result.items.length > 0) {
        expect(result.items[0]).toHaveProperty('createdTime');
      }
    });
  });

  describe('getById', () => {
    it('should retrieve a job by key with bound methods', async () => {
      const { jobs, folderId } = getJobsService();

      if (!folderId) {
        throw new Error('INTEGRATION_TEST_FOLDER_ID is required for getById tests.');
      }

      const allJobs = await jobs.getAll({
        folderId,
        pageSize: 1,
      });

      if (allJobs.items.length === 0) {
        throw new Error('No jobs available in the test environment to test getById.');
      }

      const jobKey = allJobs.items[0].key;
      const job = await jobs.getById(jobKey, folderId);

      // Core fields
      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
      expect(job.key).toBe(jobKey);
      expect(job.state).toBeDefined();
      expect(typeof job.id).toBe('number');

      // Bound methods
      expect(job.getOutput).toBeDefined();
      expect(typeof job.getOutput).toBe('function');
    });

    it('should apply transform pipeline correctly', async () => {
      const { jobs, folderId } = getJobsService();

      if (!folderId) {
        throw new Error('INTEGRATION_TEST_FOLDER_ID is required for getById tests.');
      }

      const allJobs = await jobs.getAll({
        folderId,
        pageSize: 1,
      });

      if (allJobs.items.length === 0) {
        throw new Error('No jobs available in the test environment to test getById.');
      }

      const jobKey = allJobs.items[0].key;
      const job = await jobs.getById(jobKey, folderId);

      // Verify transformed camelCase fields exist
      expect(job.createdTime).toBeDefined();
      expect(job.processName).toBeDefined();
      expect(job.folderId).toBeDefined();

      // Verify original PascalCase API fields are absent
      expect((job as any).CreationTime).toBeUndefined();
      expect((job as any).ReleaseName).toBeUndefined();
      expect((job as any).OrganizationUnitId).toBeUndefined();
    });

    it('should retrieve a job with expand options', async () => {
      const { jobs, folderId } = getJobsService();

      if (!folderId) {
        throw new Error('INTEGRATION_TEST_FOLDER_ID is required for getById tests.');
      }

      const allJobs = await jobs.getAll({
        folderId,
        pageSize: 1,
      });

      if (allJobs.items.length === 0) {
        throw new Error('No jobs available in the test environment to test getById with expand.');
      }

      const jobKey = allJobs.items[0].key;
      const job = await jobs.getById(jobKey, folderId, {
        expand: 'robot,machine',
      });

      expect(job).toBeDefined();
      expect(job.key).toBe(jobKey);

      // Verify expand affected the response — expanded entities may not be
      // present in all test environments, so guard assertions.
      if (job.robot) {
        expect(job.robot.id).toBeDefined();
      }
      if (job.machine) {
        expect(job.machine.id).toBeDefined();
      }
    });
  });

  describe('getOutput', () => {
    it('should return parsed output or null for a completed job', async () => {
      const { jobs, folderId } = getJobsService();

      if (!folderId) {
        throw new Error('INTEGRATION_TEST_FOLDER_ID is required for getOutput tests (GetByKey requires a folder ID).');
      }

      // Find a successful job that might have output
      const result = await jobs.getAll({
        folderId,
        pageSize: 5,
        filter: "State eq 'Successful'",
      });

      if (result.items.length === 0) {
        throw new Error('No successful jobs found in the test environment to test getOutput.');
      }

      const job = result.items[0];
      const output = await jobs.getOutput(job.key, folderId);

      // Output can be null (if the job had no output) or a parsed object
      if (output !== null) {
        expect(typeof output).toBe('object');
      }
    });
  });

  describe('stop', () => {
    it('should start a process and then stop the resulting job', async () => {
      const { jobs, folderId } = getJobsService();
      const { processes } = getServices();
      const config = getTestConfig();

      if (!folderId) {
        throw new Error('INTEGRATION_TEST_FOLDER_ID not configured — cannot run stop test.');
      }

      const processKey = config.orchestratorTestProcessKey;
      if (!processKey) {
        throw new Error('ORCHESTRATOR_TEST_PROCESS_KEY not configured — cannot run stop test.');
      }

      // Start a process to create a job
      const startedJobs = await processes.start({ processKey }, folderId);
      expect(startedJobs.length).toBeGreaterThan(0);

      const jobKey = startedJobs[0].key;

      // Stop the job we just started — resolves without error on success
      await jobs.stop([jobKey], folderId);
    });

    it('should return empty result when called with empty array', async () => {
      const { jobs } = getJobsService();

      // folderId is unused for empty-array inputs — stop() returns early before reading it
      await jobs.stop([], 0);
    });
  });

  describe('resume', () => {
    it('should resume a suspended job', async () => {
      const { jobs } = getJobsService();
      const config = getTestConfig();

      const resumeFolderId = config.jobsTestFolderId
        ? Number(config.jobsTestFolderId)
        : config.folderId
          ? Number(config.folderId)
          : undefined;

      if (!resumeFolderId) {
        throw new Error('JOBS_TEST_FOLDER_ID or INTEGRATION_TEST_FOLDER_ID is required for resume tests.');
      }

      // Find a suspended job
      const result = await jobs.getAll({
        folderId: resumeFolderId,
        pageSize: 1,
        filter: "state eq 'Suspended'",
      });

      if (result.items.length === 0) {
        throw new Error('No suspended jobs found in the test environment to test resume.');
      }

      const job = result.items[0];
      await jobs.resume(job.key, resumeFolderId);
    });
  });

  describe('restart', () => {
    let restartResult!: JobGetResponse;

    beforeAll(async () => {
      const { jobs: svc, folderId: fId } = getJobsService();

      if (!fId) {
        throw new Error('INTEGRATION_TEST_FOLDER_ID is required for restart tests.');
      }

      const result = await svc.getAll({
        folderId: fId,
        pageSize: 1,
        filter: "state eq 'Faulted' or state eq 'Successful' or state eq 'Stopped'",
      });

      if (result.items.length === 0) {
        throw new Error('No restartable jobs (Faulted/Successful/Stopped) found in the test environment.');
      }

      restartResult = await svc.restart(result.items[0].key, fId);
    });

    it('should restart a job in a final state', () => {
      expect(restartResult).toBeDefined();
      expect(restartResult.state).toBeDefined();
      expect(restartResult.key).toBeDefined();
    });

    it('should apply transform pipeline correctly on restarted job', () => {
      // Verify transformed camelCase fields present with values
      expect(restartResult.createdTime).toBeDefined();
      expect(restartResult.processName).toBeDefined();
      expect(restartResult.folderId).toBeDefined();

      // Verify original PascalCase API fields absent
      expect((restartResult as any).CreationTime).toBeUndefined();
      expect((restartResult as any).ReleaseName).toBeUndefined();
      expect((restartResult as any).OrganizationUnitId).toBeUndefined();
    });
  });

  describe('Job structure validation', () => {
    it('should have expected fields in job objects', async () => {
      const { jobs, folderId } = getJobsService();

      const result = await jobs.getAll({
        folderId,
        pageSize: 1,
      });

      if (result.items.length === 0) {
        throw new Error('No jobs available to validate structure.');
      }

      const job = result.items[0];

      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
      expect(job.key).toBeDefined();
      expect(job.state).toBeDefined();
      expect(typeof job.id).toBe('number');
      expect(typeof job.key).toBe('string');
      expect(typeof job.state).toBe('string');
    });
  });

  /**
   * Orchestrator exposes no endpoint for unlinking a job attachment, so each
   * test links a throwaway attachment created for the purpose and deletes that
   * attachment afterwards — removing the link with it. Creating and deleting
   * the attachment itself is not part of the SDK surface, so those two calls
   * go straight to the API.
   */
  describe('job attachments', () => {
    /** How many jobs to check when looking for one without attachments. */
    const MAX_EMPTY_JOB_SCAN = 10;

    let jobKey!: string;
    let attachmentFolderId!: number;
    let seededAttachmentId!: string;

    /** Attachment IDs to delete once the suite finishes. */
    const createdAttachmentIds: string[] = [];

    function orchestratorBaseUrl(): string {
      const config = getTestConfig();
      return `${config.baseUrl}/${config.orgName}/${config.tenantName}/orchestrator_`;
    }

    function apiHeaders(): Record<string, string> {
      const config = getTestConfig();
      return {
        Authorization: `Bearer ${config.secret}`,
        'Content-Type': 'application/json',
        'X-UIPATH-OrganizationUnitId': String(attachmentFolderId),
      };
    }

    /** Creates an empty attachment to link, and registers it for cleanup. */
    async function createThrowawayAttachment(): Promise<string> {
      const response = await fetch(`${orchestratorBaseUrl()}/odata/Attachments`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ Name: `IntegrationTest_JobAttachment_${generateRandomString()}.txt` }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create test attachment: ${response.status} ${await response.text()}`);
      }

      const attachment = await response.json() as { Id: string };
      createdAttachmentIds.push(attachment.Id);
      return attachment.Id;
    }

    beforeAll(async () => {
      const { jobs, folderId } = getJobsService();

      if (!folderId) {
        throw new Error('INTEGRATION_TEST_FOLDER_ID is required for job attachment tests');
      }
      attachmentFolderId = folderId;

      // Any job in the folder will do — the link is what the tests exercise.
      const result = await jobs.getAll({ folderId, pageSize: 1 });
      if (!result.items.length) {
        throw new Error(`No jobs found in folder ${folderId} to attach test attachments to`);
      }
      jobKey = result.items[0].key;

      // Seed one link so getAttachments always has something to return.
      seededAttachmentId = await createThrowawayAttachment();
      await jobs.linkAttachment(seededAttachmentId, jobKey, folderId, { category: 'IntegrationTest' });
    });

    afterAll(async () => {
      // Deleting the attachment removes the job link along with it.
      for (const attachmentId of createdAttachmentIds) {
        await fetch(`${orchestratorBaseUrl()}/odata/Attachments(${attachmentId})`, {
          method: 'DELETE',
          headers: apiHeaders(),
        });
      }
    });

    it('should retrieve the attachments linked to a job', async () => {
      const { jobs } = getJobsService();

      const result = await jobs.getAttachments(jobKey, attachmentFolderId);

      expect(Array.isArray(result)).toBe(true);

      const seeded = result.find(link => link.attachmentId === seededAttachmentId);
      expect(seeded).toBeDefined();
      expect(seeded!.jobKey).toBe(jobKey);
      expect(seeded!.category).toBe('IntegrationTest');
      expect(typeof seeded!.id).toBe('string');
      expect(typeof seeded!.attachmentName).toBe('string');
    });

    it('should validate transform: renamed fields present, raw API names absent', async () => {
      const { jobs } = getJobsService();

      const result = await jobs.getAttachments(jobKey, attachmentFolderId);
      const seeded = result.find(link => link.attachmentId === seededAttachmentId);

      expect(seeded).toBeDefined();

      // creationTime -> createdTime
      expect(typeof seeded!.createdTime).toBe('string');
      expect((seeded as any).creationTime).toBeUndefined();

      // lastModificationTime -> lastModifiedTime
      expect((seeded as any).lastModificationTime).toBeUndefined();
    });

    it('should return an empty array for a job with no attachments', async () => {
      const { jobs } = getJobsService();

      // Bounded scan — most jobs carry no attachments, so a short sweep suffices
      // and keeps the suite from firing one request per job in the folder.
      const candidates = await jobs.getAll({ folderId: attachmentFolderId, pageSize: MAX_EMPTY_JOB_SCAN });

      let jobWithoutAttachments: string | undefined;
      for (const job of candidates.items) {
        if (job.key === jobKey) continue;
        const links = await jobs.getAttachments(job.key, attachmentFolderId);
        if (!links.length) {
          jobWithoutAttachments = job.key;
          break;
        }
      }

      if (!jobWithoutAttachments) {
        throw new Error(
          `All ${MAX_EMPTY_JOB_SCAN} scanned jobs in folder ${attachmentFolderId} have attachments; cannot verify the empty case`
        );
      }

      const result = await jobs.getAttachments(jobWithoutAttachments, attachmentFolderId);
      expect(result).toEqual([]);
    });

    it('should link an attachment to a job with a category', async () => {
      const { jobs } = getJobsService();
      const attachmentId = await createThrowawayAttachment();

      const result = await jobs.linkAttachment(attachmentId, jobKey, attachmentFolderId, {
        category: 'IntegrationTestCategory',
      });

      expect(result).toBeDefined();
      expect(result.attachmentId).toBe(attachmentId);
      expect(result.jobKey).toBe(jobKey);
      expect(result.category).toBe('IntegrationTestCategory');
      expect(typeof result.id).toBe('string');
      expect(typeof result.createdTime).toBe('string');
      expect((result as any).creationTime).toBeUndefined();
    });

    it('should link an attachment without a category', async () => {
      const { jobs } = getJobsService();
      const attachmentId = await createThrowawayAttachment();

      const result = await jobs.linkAttachment(attachmentId, jobKey, attachmentFolderId);

      expect(result.attachmentId).toBe(attachmentId);
      expect(result.category).toBeNull();
    });

    it('should make the new link visible to getAttachments', async () => {
      const { jobs } = getJobsService();
      const attachmentId = await createThrowawayAttachment();

      await jobs.linkAttachment(attachmentId, jobKey, attachmentFolderId, { category: 'RoundTrip' });

      const links = await jobs.getAttachments(jobKey, attachmentFolderId);
      const created = links.find(link => link.attachmentId === attachmentId);

      expect(created).toBeDefined();
      expect(created!.category).toBe('RoundTrip');
      // The name is absent on the link response but populated when read back.
      expect(typeof created!.attachmentName).toBe('string');
    });
  });
});
