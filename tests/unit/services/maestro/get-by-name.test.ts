import { describe, it, expect } from 'vitest';
import {
  findMaestroResourceByName,
  MaestroResourceType,
} from '../../../../src/services/maestro/helpers/get-by-name';
import { NotFoundError, ValidationError } from '../../../../src/core/errors';
import { MAESTRO_TEST_CONSTANTS } from '../../../utils/mocks';

const RESOURCE = MaestroResourceType.MaestroProcess;

interface TestItem {
  name: string;
  folderName: string;
  folderKey: string;
  marker: string;
}

const makeItem = (overrides: Partial<TestItem> = {}): TestItem => ({
  name: 'Alpha',
  folderName: 'Shared/Finance',
  folderKey: MAESTRO_TEST_CONSTANTS.FOLDER_KEY,
  marker: '',
  ...overrides,
});

describe('findMaestroResourceByName', () => {
  it('throws ValidationError when no folder context can be resolved', () => {
    expect(() => findMaestroResourceByName(RESOURCE, [makeItem()], 'Alpha', {})).toThrowError(
      ValidationError,
    );
  });

  it('filters by folderKey when multiple items share a name', () => {
    const items = [
      makeItem({ name: 'Alpha', folderKey: MAESTRO_TEST_CONSTANTS.FOLDER_KEY_OTHER, marker: 'other' }),
      makeItem({ name: 'Alpha', folderKey: MAESTRO_TEST_CONSTANTS.FOLDER_KEY, marker: 'wanted' }),
    ];

    const result = findMaestroResourceByName(RESOURCE,items, 'Alpha', {
      folderKey: MAESTRO_TEST_CONSTANTS.FOLDER_KEY,
    });

    expect(result.marker).toBe('wanted');
  });

  it('filters by folderPath against the folderName field', () => {
    const items = [
      makeItem({ name: 'Alpha', folderName: MAESTRO_TEST_CONSTANTS.FOLDER_PATH_OTHER, marker: 'other' }),
      makeItem({ name: 'Alpha', folderName: MAESTRO_TEST_CONSTANTS.FOLDER_PATH, marker: 'wanted' }),
    ];

    const result = findMaestroResourceByName(RESOURCE,items, 'Alpha', {
      folderPath: MAESTRO_TEST_CONSTANTS.FOLDER_PATH,
    });

    expect(result.marker).toBe('wanted');
  });

  it('falls back to fallbackFolderKey when no explicit folder is supplied', () => {
    const items = [
      makeItem({ name: 'Alpha', folderKey: MAESTRO_TEST_CONSTANTS.FOLDER_KEY_OTHER, marker: 'other' }),
      makeItem({ name: 'Alpha', folderKey: MAESTRO_TEST_CONSTANTS.FOLDER_KEY, marker: 'wanted' }),
    ];

    const result = findMaestroResourceByName(RESOURCE,items, 'Alpha', {
      fallbackFolderKey: MAESTRO_TEST_CONSTANTS.FOLDER_KEY,
    });

    expect(result.marker).toBe('wanted');
  });

  it('suppresses fallbackFolderKey when folderPath is supplied', () => {
    const items = [
      makeItem({
        name: 'Alpha',
        folderKey: MAESTRO_TEST_CONSTANTS.FOLDER_KEY_OTHER,
        folderName: MAESTRO_TEST_CONSTANTS.FOLDER_PATH,
        marker: 'wanted',
      }),
    ];

    const result = findMaestroResourceByName(RESOURCE,items, 'Alpha', {
      folderPath: MAESTRO_TEST_CONSTANTS.FOLDER_PATH,
      fallbackFolderKey: MAESTRO_TEST_CONSTANTS.FOLDER_KEY,
    });

    expect(result.marker).toBe('wanted');
  });

  it('throws NotFoundError when no item matches', () => {
    expect(() =>
      findMaestroResourceByName(RESOURCE, [makeItem()], 'Missing', {
        folderKey: MAESTRO_TEST_CONSTANTS.FOLDER_KEY,
      }),
    ).toThrowError(NotFoundError);
  });

  it('includes folderPath in the NotFoundError message when supplied', () => {
    expect(() =>
      findMaestroResourceByName(RESOURCE,[makeItem()], 'Missing', {
        folderPath: MAESTRO_TEST_CONSTANTS.FOLDER_PATH,
      }),
    ).toThrowError(`in folder '${MAESTRO_TEST_CONSTANTS.FOLDER_PATH}'`);
  });

  it('includes folderKey in the NotFoundError message when supplied', () => {
    expect(() =>
      findMaestroResourceByName(RESOURCE,[makeItem()], 'Missing', {
        folderKey: MAESTRO_TEST_CONSTANTS.FOLDER_KEY,
      }),
    ).toThrowError(`in folder (key: ${MAESTRO_TEST_CONSTANTS.FOLDER_KEY})`);
  });

});
