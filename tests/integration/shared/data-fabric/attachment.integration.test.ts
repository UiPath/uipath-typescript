import { beforeAll, beforeEach, describe, it, expect } from 'vitest';
import { setupUnifiedTests, getServices, InitMode } from '../../config/unified-setup';
import { wait } from '../../utils/helpers';

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

    async function uploadAndWait(content: string): Promise<void> {
      const { entities } = getServices();
      const file = new Blob([content], { type: 'text/plain' });
      await entities.uploadAttachment(
        ATTACHMENT_CONFIG.entityId,
        ATTACHMENT_CONFIG.recordId,
        ATTACHMENT_CONFIG.fieldName,
        file,
      );
      await wait(2000);
    }

    describe('deleteAttachment', () => {
      beforeEach(() => uploadAndWait('Temporary file for delete attachment tests'));

      it('should delete an attachment via service method', async () => {
        const { entities } = getServices();

        const result = await entities.deleteAttachment(
          ATTACHMENT_CONFIG.entityId,
          ATTACHMENT_CONFIG.recordId,
          ATTACHMENT_CONFIG.fieldName,
        );

        expect(result).toBeDefined();
      });

      it('should delete an attachment via entity method', async () => {
        const { entities } = getServices();

        const entity = await entities.getById(ATTACHMENT_CONFIG.entityId);

        const result = await entity.deleteAttachment(
          ATTACHMENT_CONFIG.recordId,
          ATTACHMENT_CONFIG.fieldName,
        );

        expect(result).toBeDefined();
      });
    });

    describe('downloadAttachment', () => {
      beforeAll(() => uploadAndWait('Temporary file for download attachment tests'));

      it('should download an attachment via service method', async () => {
        const { entities } = getServices();

        const downloadedFile = await entities.downloadAttachment(
          ATTACHMENT_CONFIG.entityId,
          ATTACHMENT_CONFIG.recordId,
          ATTACHMENT_CONFIG.fieldName,
        );

        expect(downloadedFile).toBeDefined();
      });

      it('should download an attachment via entity method', async () => {
        const { entities } = getServices();

        const entity = await entities.getById(ATTACHMENT_CONFIG.entityId);

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
