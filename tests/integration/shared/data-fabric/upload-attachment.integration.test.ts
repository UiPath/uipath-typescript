import { describe, it, expect, beforeAll } from 'vitest';
import { UiPath } from '../../../../src/core';
import { Entities } from '../../../../src/services/data-fabric';

/**
 * Integration test for uploadAttachment
 *
 * Run with:
 *   npx vitest run tests/integration/shared/data-fabric/upload-attachment.integration.test.ts --config vitest.integration.config.ts
 */
describe('Entity uploadAttachment - Integration Test', () => {
  let sdk: UiPath;
  let entities: Entities;

  const TEST_CONFIG = {
    baseUrl: 'https://alpha.uipath.com',
    orgName: 'entity',
    tenantName: 'a4e',
    secret: 'rt_EFB9EC17CA732C09AFB34875984D500FA7FA5BF42230EB5F66EA183927FD82E0-1',
  };

  const ATTACHMENT_CONFIG = {
    entityId: 'f4d722f7-abd5-f011-8d4d-6045bd024ab4',
    recordId: '046427D1-3F16-F111-832E-000D3A58D4AA',
    fieldName: 'SarathReddy',
  };

  beforeAll(() => {
    sdk = new UiPath({
      baseUrl: TEST_CONFIG.baseUrl,
      orgName: TEST_CONFIG.orgName,
      tenantName: TEST_CONFIG.tenantName,
      secret: TEST_CONFIG.secret,
    });
    entities = new Entities(sdk);
  });

  it('should get entity metadata to find entity name', async () => {
    const entity = await entities.getById(ATTACHMENT_CONFIG.entityId);

    expect(entity).toBeDefined();
    expect(entity.id).toBe(ATTACHMENT_CONFIG.entityId);
    expect(entity.name).toBeDefined();

    console.log(`Entity name: ${entity.name}`);
    console.log(`Entity fields: ${entity.fields.map(f => `${f.name} (${f.fieldDisplayType})`).join(', ')}`);
  });

  it('should upload an attachment via service method', async () => {
    // First get entity name
    const entity = await entities.getById(ATTACHMENT_CONFIG.entityId);
    const entityName = entity.name;

    // Create a small test file
    const fileContent = 'Hello from UiPath TypeScript SDK integration test!';
    const file = new Blob([fileContent], { type: 'text/plain' });

    const result = await entities.uploadAttachment({
      entityName,
      recordId: ATTACHMENT_CONFIG.recordId,
      fieldName: ATTACHMENT_CONFIG.fieldName,
      file,
    });

    console.log('Upload result:', JSON.stringify(result, null, 2));
    expect(result).toBeDefined();
  });

  it('should upload an attachment via entity method', async () => {
    const entity = await entities.getById(ATTACHMENT_CONFIG.entityId);

    // Create a small test file
    const fileContent = 'Hello from entity method upload test!';
    const file = new Blob([fileContent], { type: 'text/plain' });

    const result = await entity.uploadAttachment(
      ATTACHMENT_CONFIG.recordId,
      ATTACHMENT_CONFIG.fieldName,
      file,
    );

    console.log('Entity method upload result:', JSON.stringify(result, null, 2));
    expect(result).toBeDefined();
  });
}, { timeout: 30000 });
