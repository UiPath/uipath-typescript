import { describe, it, expect } from 'vitest';
import { setupUnifiedTests, getServices, InitMode } from '../../config/unified-setup';

/**
 * Integration tests for entity attachment operations (upload, remove)
 *
 * Required environment variables:
 *   DATA_FABRIC_TEST_ENTITY_ID   - UUID of an entity that has a File-type field
 *   DATA_FABRIC_TEST_RECORD_ID   - UUID of a record in that entity
 *   DATA_FABRIC_TEST_ATTACHMENT_FIELD - Name of the File-type field
 *
 * Run with:
 *   npx vitest run tests/integration/shared/data-fabric/attachment.integration.test.ts --config vitest.integration.config.ts
 */

const ATTACHMENT_CONFIG = {
  entityId: process.env.DATA_FABRIC_TEST_ENTITY_ID || '',
  recordId: process.env.DATA_FABRIC_TEST_RECORD_ID || '',
  fieldName: process.env.DATA_FABRIC_TEST_ATTACHMENT_FIELD || '',
};

const hasAttachmentConfig = !!(
  ATTACHMENT_CONFIG.entityId &&
  ATTACHMENT_CONFIG.recordId &&
  ATTACHMENT_CONFIG.fieldName
);

const modes: InitMode[] = ['v1'];

describe.skipIf(!hasAttachmentConfig).each(modes)(
  'Entity Attachment - Integration Tests [%s]',
  (mode) => {
    setupUnifiedTests(mode);

    describe('uploadAttachment', () => {
      it('should upload an attachment via service method', async () => {
        const { entities } = getServices();

        const fileContent = 'Hello from UiPath TypeScript SDK integration test!';
        const file = new Blob([fileContent], { type: 'text/plain' });

        const result = await entities.uploadAttachment(
          ATTACHMENT_CONFIG.entityId,
          ATTACHMENT_CONFIG.recordId,
          ATTACHMENT_CONFIG.fieldName,
          file,
        );

        expect(result).toBeDefined();
      });

      it('should upload an attachment via entity method', async () => {
        const { entities } = getServices();

        const entity = await entities.getById(ATTACHMENT_CONFIG.entityId);

        const fileContent = 'Hello from entity method upload test!';
        const file = new Blob([fileContent], { type: 'text/plain' });

        const result = await entity.uploadAttachment(
          ATTACHMENT_CONFIG.recordId,
          ATTACHMENT_CONFIG.fieldName,
          file,
        );

        expect(result).toBeDefined();
      });
    });

    describe('deleteAttachment', () => {
      it('should upload and then delete an attachment via service method', async () => {
        const { entities } = getServices();

        // First upload an attachment so there's something to delete
        const fileContent = 'Temporary file for delete attachment test';
        const file = new Blob([fileContent], { type: 'text/plain' });

        await entities.uploadAttachment(
          ATTACHMENT_CONFIG.entityId,
          ATTACHMENT_CONFIG.recordId,
          ATTACHMENT_CONFIG.fieldName,
          file,
        );

        // Now delete the attachment
        const result = await entities.deleteAttachment(
          ATTACHMENT_CONFIG.entityId,
          ATTACHMENT_CONFIG.recordId,
          ATTACHMENT_CONFIG.fieldName,
        );

        expect(result).toBeDefined();
      });

      it('should upload and then delete an attachment via entity method', async () => {
        const { entities } = getServices();

        const entity = await entities.getById(ATTACHMENT_CONFIG.entityId);

        // First upload an attachment so there's something to delete
        const fileContent = 'Temporary file for entity method delete test';
        const file = new Blob([fileContent], { type: 'text/plain' });

        await entity.uploadAttachment(
          ATTACHMENT_CONFIG.recordId,
          ATTACHMENT_CONFIG.fieldName,
          file,
        );

        // Now delete the attachment
        const result = await entity.deleteAttachment(
          ATTACHMENT_CONFIG.recordId,
          ATTACHMENT_CONFIG.fieldName,
        );

        expect(result).toBeDefined();
      });
    });

    describe('downloadAttachment', () => {
      it('should upload and then download an attachment via service method', async () => {
        const { entities } = getServices();

        // First upload an attachment so there's something to download
        const fileContent = 'Temporary file for download attachment test';
        const file = new Blob([fileContent], { type: 'text/plain' });

        await entities.uploadAttachment(
          ATTACHMENT_CONFIG.entityId,
          ATTACHMENT_CONFIG.recordId,
          ATTACHMENT_CONFIG.fieldName,
          file,
        );

        // Now download the attachment
        const downloadedFile = await entities.downloadAttachment(
          ATTACHMENT_CONFIG.entityId,
          ATTACHMENT_CONFIG.recordId,
          ATTACHMENT_CONFIG.fieldName,
        );

        expect(downloadedFile).toBeDefined();
      });

      it('should upload and then download an attachment via entity method', async () => {
        const { entities } = getServices();

        const entity = await entities.getById(ATTACHMENT_CONFIG.entityId);

        // First upload an attachment so there's something to download
        const fileContent = 'Temporary file for entity method download test';
        const file = new Blob([fileContent], { type: 'text/plain' });

        await entity.uploadAttachment(
          ATTACHMENT_CONFIG.recordId,
          ATTACHMENT_CONFIG.fieldName,
          file,
        );

        // Now download the attachment
        const downloadedFile = await entity.downloadAttachment(
          ATTACHMENT_CONFIG.recordId,
          ATTACHMENT_CONFIG.fieldName,
        );

        expect(downloadedFile).toBeDefined();
      });
    });
  },
  { timeout: 30000 }
);
