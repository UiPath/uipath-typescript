import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import { getServices, getTestConfig, setupUnifiedTests, InitMode } from '../../config/unified-setup';
import { AttachmentService } from '../../../../src/services/orchestrator/attachments';
import { generateRandomString } from '../../utils/helpers';

/**
 * Integration tests for the Orchestrator Attachment service.
*/

const modes: InitMode[] = ['v1'];

describe.each(modes)(
  'Orchestrator Attachments - Integration Tests [%s]',
  (mode) => {
    setupUnifiedTests(mode);

    describe('getById', () => {
      // The configured ORCHESTRATOR_ATTACHMENT_ID may point at an attachment in a
      // folder the caller cannot reach (getById is folder-authorized, and a user
      // token is bounded by folder membership where an external app's scopes are
      // not). Create our own so the block does not depend on tenant state.
      let attachmentId!: string;

      beforeAll(async () => {
        const { sdk } = getServices();
        const attachments = new AttachmentService(sdk);
        const created = await attachments.create(
          `IntegrationTest_Attachment_${generateRandomString()}.txt`,
          new Blob([`getById fixture ${new Date().toISOString()}`]),
        );
        attachmentId = created.id;
      });

      afterAll(async () => {
        const config = getTestConfig();
        const base = `${config.baseUrl}/${config.orgName}/${config.tenantName}/orchestrator_`;
        await fetch(`${base}/odata/Attachments(${attachmentId})`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${config.userToken ?? config.secret}` },
        });
      });

      it('should retrieve an attachment by ID', async () => {
        const { sdk } = getServices();
        const attachments = new AttachmentService(sdk);

        const result = await attachments.getById(attachmentId);

        expect(result).toBeDefined();
        expect(result.id).toBe(attachmentId);
        expect(result.name).toBeDefined();
        expect(typeof result.name).toBe('string');
      });

      it('should include blobFileAccess in the response', async () => {
        const { sdk } = getServices();
        const attachments = new AttachmentService(sdk);

        const result = await attachments.getById(attachmentId);

        expect(result.blobFileAccess).toBeDefined();
        expect(result.blobFileAccess.uri).toBeDefined();
        expect(typeof result.blobFileAccess.uri).toBe('string');
        expect(result.blobFileAccess.httpMethod).toBeDefined();
      });

      it('should validate transform: camelCase fields present, PascalCase absent', async () => {
        const { sdk } = getServices();
        const attachments = new AttachmentService(sdk);

        const result = await attachments.getById(attachmentId);

        // Transformed fields should be present
        expect(result.id).toBeDefined();
        expect(result.name).toBeDefined();

        // PascalCase fields from the API should not be present
        expect((result as any).Id).toBeUndefined();
        expect((result as any).Name).toBeUndefined();
        expect((result as any).CreationTime).toBeUndefined();
        expect((result as any).LastModificationTime).toBeUndefined();

        // Verify semantic renames
        if (result.createdTime) {
          expect(typeof result.createdTime).toBe('string');
          expect((result as any).CreationTime).toBeUndefined();
        }
        if (result.lastModifiedTime) {
          expect(typeof result.lastModifiedTime).toBe('string');
          expect((result as any).LastModificationTime).toBeUndefined();
        }
      });

      it('should retrieve an attachment with select option', async () => {
        const { sdk } = getServices();
        const attachments = new AttachmentService(sdk);

        const result = await attachments.getById(attachmentId, {
          select: 'Id,Name',
        });

        expect(result).toBeDefined();
        expect(result.id).toBeDefined();
        expect(result.name).toBeDefined();
      });

      it('should throw when id is empty', async () => {
        const { sdk } = getServices();
        const attachments = new AttachmentService(sdk);

        await expect(attachments.getById('')).rejects.toThrow('id is required for getById');
      });
    });

    describe('create', () => {
      /**
       * Each test creates a real attachment; they are deleted afterwards via the
       * API since the SDK exposes no delete for attachments.
       */
      const createdAttachmentIds: string[] = [];

      afterAll(async () => {
        const config = getTestConfig();
        const base = `${config.baseUrl}/${config.orgName}/${config.tenantName}/orchestrator_`;

        for (const id of createdAttachmentIds) {
          await fetch(`${base}/odata/Attachments(${id})`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${config.userToken ?? config.secret}` },
          });
        }
      });

      it('should create an attachment and upload its content', async () => {
        const { sdk } = getServices();
        const attachments = new AttachmentService(sdk);
        const name = `IntegrationTest_Attachment_${generateRandomString()}.txt`;
        const content = `uploaded at ${new Date().toISOString()}`;

        const result = await attachments.create(name, new Blob([content]));
        createdAttachmentIds.push(result.id);

        expect(result.id).toBeDefined();
        expect(result.name).toBe(name);
        // The write URI is spent during upload and must not reach the caller
        expect((result as any).blobFileAccess).toBeUndefined();

        // Read it back and confirm the content actually landed in storage
        const stored = await attachments.getById(result.id);
        expect(stored.name).toBe(name);
        expect(stored.blobFileAccess.uri).toBeDefined();

        const download = await fetch(stored.blobFileAccess.uri);
        expect(download.ok).toBe(true);
        expect(await download.text()).toBe(content);
      });

      it('should validate transform: camelCase fields present, PascalCase absent', async () => {
        const { sdk } = getServices();
        const attachments = new AttachmentService(sdk);
        const name = `IntegrationTest_Attachment_${generateRandomString()}.txt`;

        const result = await attachments.create(name, new Blob(['transform check']));
        createdAttachmentIds.push(result.id);

        expect(typeof result.createdTime).toBe('string');
        expect((result as any).CreationTime).toBeUndefined();
        expect((result as any).Name).toBeUndefined();
        expect((result as any).Id).toBeUndefined();
      });

      it('should link the attachment to a job when jobKey is supplied', async () => {
        const { sdk, jobs } = getServices();
        const config = getTestConfig();
        const attachments = new AttachmentService(sdk);

        if (!jobs) {
          throw new Error('Jobs service not available in test services');
        }

        const folderId = Number(config.jobsTestFolderId ?? config.folderId);
        if (!folderId) {
          throw new Error('JOBS_TEST_FOLDER_ID or INTEGRATION_TEST_FOLDER_ID is required for this test');
        }

        const jobList = await jobs.getAll({ folderId, pageSize: 1 });
        if (!jobList.items.length) {
          throw new Error(`No jobs found in folder ${folderId} to link an attachment to`);
        }
        const jobKey = jobList.items[0].key;

        const name = `IntegrationTest_Attachment_${generateRandomString()}.txt`;
        const result = await attachments.create(name, new Blob(['linked on create']), {
          jobKey,
          category: 'IntegrationTest',
          folderId,
        });
        createdAttachmentIds.push(result.id);

        // Creating with a jobKey links it, so no separate linkAttachment call is needed
        const links = await jobs.getAttachments(jobKey, folderId);
        const linked = links.find(link => link.attachmentId === result.id);

        expect(linked).toBeDefined();
        expect(linked!.category).toBe('IntegrationTest');
        expect(linked!.attachmentName).toBe(name);
      });
    });
  }
);
