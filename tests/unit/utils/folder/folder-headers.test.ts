import { describe, it, expect } from 'vitest';
import { resolveFolderHeaders } from '../../../../src/utils/folder/folder-headers';
import { encodeFolderPathHeader } from '../../../../src/utils/encoding/folder-path';
import { FOLDER_ID, FOLDER_KEY, FOLDER_PATH_ENCODED } from '../../../../src/utils/constants/headers';
import { ValidationError } from '../../../../src/core/errors';

const GUID = '5f6dadf1-3677-49dc-8aca-c2999dd4b3ba';

describe('resolveFolderHeaders', () => {
  describe('field routing', () => {
    it('routes folderId to X-UIPATH-OrganizationUnitId', () => {
      const headers = resolveFolderHeaders({ folderId: 123, resourceType: 'Test' });
      expect(headers).toEqual({ [FOLDER_ID]: '123' });
    });

    it('routes folderKey to X-UIPATH-FolderKey', () => {
      const headers = resolveFolderHeaders({ folderKey: GUID, resourceType: 'Test' });
      expect(headers).toEqual({ [FOLDER_KEY]: GUID });
    });

    it('routes folderPath to X-UIPATH-FolderPath-Encoded (base64-of-UTF-16-LE)', () => {
      const headers = resolveFolderHeaders({ folderPath: 'Shared/Finance', resourceType: 'Test' });
      expect(headers).toEqual({
        [FOLDER_PATH_ENCODED]: encodeFolderPathHeader('Shared/Finance'),
      });
    });

    it('trims whitespace around folderKey', () => {
      const headers = resolveFolderHeaders({ folderKey: `  ${GUID}  `, resourceType: 'Test' });
      expect(headers).toEqual({ [FOLDER_KEY]: GUID });
    });

    it('trims whitespace around folderPath before encoding', () => {
      const headers = resolveFolderHeaders({ folderPath: '  Shared/Finance  ', resourceType: 'Test' });
      expect(headers).toEqual({
        [FOLDER_PATH_ENCODED]: encodeFolderPathHeader('Shared/Finance'),
      });
    });

    it('treats an empty folderKey as missing', () => {
      const headers = resolveFolderHeaders({
        folderKey: '',
        resourceType: 'Test',
        fallbackFolderKey: GUID,
      });
      expect(headers).toEqual({ [FOLDER_KEY]: GUID });
    });

    it('treats an empty folderPath as missing', () => {
      const headers = resolveFolderHeaders({
        folderPath: '',
        resourceType: 'Test',
        fallbackFolderKey: GUID,
      });
      expect(headers).toEqual({ [FOLDER_KEY]: GUID });
    });
  });

  describe('combined fields', () => {
    it('forwards all three headers when all fields are set (server resolves precedence)', () => {
      const headers = resolveFolderHeaders({
        folderId: 123,
        folderKey: GUID,
        folderPath: 'Shared/Finance',
        resourceType: 'Test',
      });
      expect(headers).toEqual({
        [FOLDER_ID]: '123',
        [FOLDER_KEY]: GUID,
        [FOLDER_PATH_ENCODED]: encodeFolderPathHeader('Shared/Finance'),
      });
    });

    it('forwards both headers when folderId + folderPath are set', () => {
      const headers = resolveFolderHeaders({
        folderId: 123,
        folderPath: 'Shared/Finance',
        resourceType: 'Test',
      });
      expect(headers).toEqual({
        [FOLDER_ID]: '123',
        [FOLDER_PATH_ENCODED]: encodeFolderPathHeader('Shared/Finance'),
      });
    });
  });

  describe('fallback', () => {
    it('uses fallbackFolderKey when no folder is supplied', () => {
      const headers = resolveFolderHeaders({ resourceType: 'Test', fallbackFolderKey: GUID });
      expect(headers).toEqual({ [FOLDER_KEY]: GUID });
    });

    it('does not use fallback when folderId is supplied', () => {
      const headers = resolveFolderHeaders({
        folderId: 123,
        resourceType: 'Test',
        fallbackFolderKey: GUID,
      });
      expect(headers).toEqual({ [FOLDER_ID]: '123' });
    });

    it('does not use fallback when folderKey is supplied', () => {
      const headers = resolveFolderHeaders({
        folderKey: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        resourceType: 'Test',
        fallbackFolderKey: GUID,
      });
      expect(headers).toEqual({ [FOLDER_KEY]: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' });
    });

    it('does not use fallback when folderPath is supplied', () => {
      const headers = resolveFolderHeaders({
        folderPath: 'Shared/Finance',
        resourceType: 'Test',
        fallbackFolderKey: GUID,
      });
      expect(headers).toEqual({
        [FOLDER_PATH_ENCODED]: encodeFolderPathHeader('Shared/Finance'),
      });
    });
  });

  describe('errors', () => {
    it('throws ValidationError when no folder context is supplied and no fallback', () => {
      expect(() => resolveFolderHeaders({ resourceType: 'Test' }))
        .toThrow(ValidationError);
    });

    it('includes the resourceType in the error message', () => {
      expect(() => resolveFolderHeaders({ resourceType: 'Asset.getByName' }))
        .toThrow(/Asset\.getByName/);
    });
  });
});
