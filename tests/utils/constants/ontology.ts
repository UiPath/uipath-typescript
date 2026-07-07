/**
 * Ontology service test constants
 */

export const ONTOLOGY_TEST_CONSTANTS = {
  ONTOLOGY_ID: 'a1b2c3d4-0000-0000-0000-000000000001',
  ONTOLOGY_ID_2: 'a1b2c3d4-0000-0000-0000-000000000002',
  ONTOLOGY_NAME: 'ecommerce',
  ONTOLOGY_NAME_2: 'procurement',
  ONTOLOGY_DISPLAY_NAME: 'E-Commerce',
  ONTOLOGY_DISPLAY_NAME_ALT: 'E-Commerce v2',
  ONTOLOGY_DESCRIPTION: 'Sales pipeline ontology',

  CREATE_TIME: '2026-07-01T10:00:00Z',
  UPDATE_TIME: '2026-07-08T12:30:00Z',
  CREATED_BY: 'user@acme.com',
  UPDATED_BY: 'reviewer@acme.com',

  ARTIFACT_FILE_NAME: 'schema.ofn',
  ARTIFACT_FILE_NAME_2: 'po-shapes.ttl',
  ARTIFACT_TYPE_SCHEMA: 'schema',
  ARTIFACT_TYPE_CONSTRAINTS: 'constraints',
  ARTIFACT_MEDIA_TYPE_OFN: 'text/owl-functional',
  ARTIFACT_MEDIA_TYPE_TURTLE: 'text/turtle',
  ARTIFACT_CONTENT_OFN: 'Prefix(:=<http://example.com/ecommerce#>)\nOntology( … )',
  ARTIFACT_CONTENT_SHACL: '@prefix sh: <http://www.w3.org/ns/shacl#> .',
  ARTIFACT_SIZE_BYTES: 3210,
  ARTIFACT_CHECKSUM: '9f2c4ae1deadbeef9f2c4ae1deadbeef9f2c4ae1deadbeef9f2c4ae1deadbeef',

  ERROR_NOT_FOUND: 'Ontology not found',
  ERROR_CONFLICT: 'Ontology already exists',
  ERROR_VALIDATION_FAILED: 'Content failed W3C standards validation',

  FOLDER_KEY: 'test-folder-key',
};
