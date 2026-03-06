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

        const entity = await entities.getById(ATTACHMENT_CONFIG.entityId);
        const entityName = entity.name;

        const fileContent = 'Hello from UiPath TypeScript SDK integration test!';
        const file = new Blob([fileContent], { type: 'text/plain' });

        const result = await entities.uploadAttachment({
          entityName,
          recordId: ATTACHMENT_CONFIG.recordId,
          fieldName: ATTACHMENT_CONFIG.fieldName,
          file,
        });

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

    describe('removeAttachment', () => {
      it('should upload and then remove an attachment via service method', async () => {
        const { entities } = getServices();

        const entity = await entities.getById(ATTACHMENT_CONFIG.entityId);
        const entityName = entity.name;

        // First upload an attachment so there's something to remove
        const fileContent = 'Temporary file for remove attachment test';
        const file = new Blob([fileContent], { type: 'text/plain' });

        await entities.uploadAttachment({
          entityName,
          recordId: ATTACHMENT_CONFIG.recordId,
          fieldName: ATTACHMENT_CONFIG.fieldName,
          file,
        });

        // Now remove the attachment
        await expect(
          entities.removeAttachment({
            entityName,
            recordId: ATTACHMENT_CONFIG.recordId,
            fieldName: ATTACHMENT_CONFIG.fieldName,
          })
        ).resolves.toBeUndefined();
      });

      it('should upload and then remove an attachment via entity method', async () => {
        const { entities } = getServices();

        const entity = await entities.getById(ATTACHMENT_CONFIG.entityId);

        // First upload an attachment so there's something to remove
        const fileContent = 'Temporary file for entity method remove test';
        const file = new Blob([fileContent], { type: 'text/plain' });

        await entity.uploadAttachment(
          ATTACHMENT_CONFIG.recordId,
          ATTACHMENT_CONFIG.fieldName,
          file,
        );

        // Now remove the attachment
        await expect(
          entity.removeAttachment(
            ATTACHMENT_CONFIG.recordId,
            ATTACHMENT_CONFIG.fieldName,
          )
        ).resolves.toBeUndefined();
      });
    });
  },
  { timeout: 30000 }
);
