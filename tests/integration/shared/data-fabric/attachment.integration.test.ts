import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupUnifiedTests, getServices, InitMode } from '../../config/unified-setup';
import { registerResource } from '../../utils/cleanup';

/**
 * Integration tests for entity attachment operations (upload, remove, download)
 *
 * Required environment variables:
 *   DATA_FABRIC_TEST_ENTITY_ID        - UUID of an entity that has a File-type field
 *   DATA_FABRIC_TEST_ATTACHMENT_FIELD - Name of the File-type field
 *
 * A fresh record is created per test run and deleted in afterAll — no shared
 * record ID is needed and concurrent runs operate on completely different records.
 *
 * Run with:
 *   npx vitest run tests/integration/shared/data-fabric/attachment.integration.test.ts --config vitest.integration.config.ts
 */

const ATTACHMENT_CONFIG = {
  entityId: process.env.DATA_FABRIC_TEST_ENTITY_ID || '',
  fieldName: process.env.DATA_FABRIC_TEST_ATTACHMENT_FIELD || '',
};

const hasAttachmentConfig = !!(
  ATTACHMENT_CONFIG.entityId &&
  ATTACHMENT_CONFIG.fieldName
);

const modes: InitMode[] = ['v1'];

describe.skipIf(!hasAttachmentConfig).each(modes)(
  'Entity Attachment - Integration Tests [%s]',
  (mode) => {
    setupUnifiedTests(mode);

    let recordId!: string;

    beforeAll(async () => {
      const { entities } = getServices();

      const inserted = await entities.insertRecordById(ATTACHMENT_CONFIG.entityId, {});

      if (!inserted.Id) {
        throw new Error('Failed to insert test record for attachment tests');
      }

      recordId = inserted.Id;

      registerResource('entityRecords', {
        entityId: ATTACHMENT_CONFIG.entityId,
        recordIds: [recordId],
      });
    });

    afterAll(async () => {
      if (!recordId) return;
      const { entities } = getServices();
      await entities.deleteRecordsById(ATTACHMENT_CONFIG.entityId, [recordId]);
    });

    describe('uploadAttachment', () => {
      it('should upload an attachment via service method', async () => {
        const { entities } = getServices();

        const file = new Blob(['Hello from UiPath TypeScript SDK integration test!'], { type: 'text/plain' });

        const result = await entities.uploadAttachment(
          ATTACHMENT_CONFIG.entityId,
          recordId,
          ATTACHMENT_CONFIG.fieldName,
          file,
        );

        expect(result).toBeDefined();
      });

      it('should upload an attachment via entity method', async () => {
        const { entities } = getServices();

        const entity = await entities.getById(ATTACHMENT_CONFIG.entityId);
        const file = new Blob(['Hello from entity method upload test!'], { type: 'text/plain' });

        const result = await entity.uploadAttachment(
          recordId,
          ATTACHMENT_CONFIG.fieldName,
          file,
        );

        expect(result).toBeDefined();
      });
    });

    describe('downloadAttachment', () => {
      it('should upload and then download an attachment via service method', async () => {
        const { entities } = getServices();

        const file = new Blob(['Temporary file for download attachment test'], { type: 'text/plain' });

        await entities.uploadAttachment(
          ATTACHMENT_CONFIG.entityId,
          recordId,
          ATTACHMENT_CONFIG.fieldName,
          file,
        );

        const downloadedFile = await entities.downloadAttachment(
          ATTACHMENT_CONFIG.entityId,
          recordId,
          ATTACHMENT_CONFIG.fieldName,
        );

        expect(downloadedFile).toBeDefined();
      });

      it('should upload and then download an attachment via entity method', async () => {
        const { entities } = getServices();

        const entity = await entities.getById(ATTACHMENT_CONFIG.entityId);
        const file = new Blob(['Temporary file for entity method download test'], { type: 'text/plain' });

        await entity.uploadAttachment(
          recordId,
          ATTACHMENT_CONFIG.fieldName,
          file,
        );

        const downloadedFile = await entity.downloadAttachment(
          recordId,
          ATTACHMENT_CONFIG.fieldName,
        );

        expect(downloadedFile).toBeDefined();
      });
    });

    describe('deleteAttachment', () => {
      it('should upload and then delete an attachment via service method', async () => {
        const { entities } = getServices();

        const file = new Blob(['Temporary file for delete attachment test'], { type: 'text/plain' });

        await entities.uploadAttachment(
          ATTACHMENT_CONFIG.entityId,
          recordId,
          ATTACHMENT_CONFIG.fieldName,
          file,
        );

        const result = await entities.deleteAttachment(
          ATTACHMENT_CONFIG.entityId,
          recordId,
          ATTACHMENT_CONFIG.fieldName,
        );

        expect(result).toBeDefined();
      });

      it('should upload and then delete an attachment via entity method', async () => {
        const { entities } = getServices();

        const entity = await entities.getById(ATTACHMENT_CONFIG.entityId);
        const file = new Blob(['Temporary file for entity method delete test'], { type: 'text/plain' });

        await entity.uploadAttachment(
          recordId,
          ATTACHMENT_CONFIG.fieldName,
          file,
        );

        const result = await entity.deleteAttachment(
          recordId,
          ATTACHMENT_CONFIG.fieldName,
        );

        expect(result).toBeDefined();
      });
    });
  },
  { timeout: 30000 }
);
