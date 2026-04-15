import { describe, it, expect } from 'vitest';
import { getServices, getTestConfig, setupUnifiedTests, InitMode } from '../../config/unified-setup';
import { AttachmentService } from '../../../../src/services/orchestrator/attachments';

/**
 * Integration tests for the Orchestrator Attachment service.
 */

const modes: InitMode[] = ['v1'];

describe.each(modes)('Orchestrator Attachments - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  describe('getById', () => {
    it('should retrieve an attachment by ID', async () => {
      const { sdk } = getServices();
      const config = getTestConfig();
      const attachmentId = config.orchestratorAttachmentId!;
      const attachments = new AttachmentService(sdk);

      const result = await attachments.getById(attachmentId);

      expect(result).toBeDefined();
      expect(result.id).toBe(attachmentId);
      expect(result.name).toBeDefined();
      expect(typeof result.name).toBe('string');
    });

    it('should include blobFileAccess in the response', async () => {
      const { sdk } = getServices();
      const config = getTestConfig();
      const attachmentId = config.orchestratorAttachmentId!;
      const attachments = new AttachmentService(sdk);

      const result = await attachments.getById(attachmentId);

      expect(result.blobFileAccess).toBeDefined();
      expect(result.blobFileAccess.uri).toBeDefined();
      expect(typeof result.blobFileAccess.uri).toBe('string');
      expect(result.blobFileAccess.httpMethod).toBeDefined();
    });

    it('should validate transform: camelCase fields present, PascalCase absent', async () => {
      const { sdk } = getServices();
      const config = getTestConfig();
      const attachmentId = config.orchestratorAttachmentId!;
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
      const config = getTestConfig();
      const attachmentId = config.orchestratorAttachmentId!;
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
});
