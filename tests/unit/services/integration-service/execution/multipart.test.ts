import { describe, it, expect } from 'vitest';
import { buildMultipartForm, toBlob, validateFiles } from '@/services/integration-service/execution/multipart';
import { ValidationError } from '@/core/errors';
import { CONTENT_TYPES } from '@/utils/constants/headers';
import type { ExecuteFile } from '@/models/integration-service/execution.types';
import { IS_TEST_CONSTANTS } from '@tests/utils/constants/integration-service';

const BYTES = new Uint8Array([1, 2, 3, 4]);

const file = (overrides: Partial<ExecuteFile> = {}): ExecuteFile => ({
  name: IS_TEST_CONSTANTS.FILE_PART_NAME,
  content: BYTES,
  fileName: IS_TEST_CONSTANTS.FILE_NAME,
  contentType: IS_TEST_CONSTANTS.FILE_CONTENT_TYPE,
  ...overrides,
});

describe('toBlob', () => {
  it('wraps bytes with the file content type', async () => {
    const blob = toBlob(file());

    expect(blob.type).toBe(IS_TEST_CONSTANTS.FILE_CONTENT_TYPE);
    expect(Array.from(new Uint8Array(await blob.arrayBuffer()))).toEqual(Array.from(BYTES));
  });

  it('defaults the content type', () => {
    expect(toBlob(file({ contentType: undefined })).type).toBe(CONTENT_TYPES.OCTET_STREAM);
  });

  it('keeps a Blob that already has the content type', () => {
    const content = new Blob([BYTES], { type: IS_TEST_CONSTANTS.FILE_CONTENT_TYPE });

    expect(toBlob(file({ content }))).toBe(content);
  });

  it('relabels a Blob whose content type differs', () => {
    const content = new Blob([BYTES], { type: 'text/plain' });

    const blob = toBlob(file({ content }));

    expect(blob.type).toBe(IS_TEST_CONSTANTS.FILE_CONTENT_TYPE);
    expect(blob.size).toBe(BYTES.length);
  });
});

describe('validateFiles', () => {
  it('accepts bytes and Blobs', () => {
    expect(() => validateFiles([file(), file({ content: new Blob([BYTES]) })], 'execute')).not.toThrow();
  });

  it('rejects a file without a name', () => {
    expect(() => validateFiles([file({ name: '' })], 'execute')).toThrow(ValidationError);
  });

  it('rejects a file without content', () => {
    const broken = { name: IS_TEST_CONSTANTS.FILE_PART_NAME } as ExecuteFile;

    expect(() => validateFiles([broken], 'execute')).toThrow(ValidationError);
  });
});

describe('buildMultipartForm', () => {
  it('adds one part per file under its name and file name', () => {
    const form = buildMultipartForm([file(), file({ name: 'second', fileName: undefined })], undefined);

    const first = form.get(IS_TEST_CONSTANTS.FILE_PART_NAME);
    const second = form.get('second');
    expect(first).toBeInstanceOf(File);
    expect((first as File).name).toBe(IS_TEST_CONSTANTS.FILE_NAME);
    expect((first as File).type).toBe(IS_TEST_CONSTANTS.FILE_CONTENT_TYPE);
    expect((second as File).name).toBe('file');
  });

  it('sends a non-empty body as a JSON part named body', () => {
    const form = buildMultipartForm([file()], { title: 'Report' });

    expect(form.get('body')).toBe('{"title":"Report"}');
  });

  it('uses the part name given for the body', () => {
    const form = buildMultipartForm([file()], { title: 'Report' }, 'metadata');

    expect(form.get('metadata')).toBe('{"title":"Report"}');
    expect(form.has('body')).toBe(false);
  });

  it('sends a string body as it is', () => {
    expect(buildMultipartForm([file()], 'raw').get('body')).toBe('raw');
  });

  it.each([[undefined], [null], [{}]])('adds no body part for %o', (body) => {
    expect(buildMultipartForm([file()], body).has('body')).toBe(false);
  });
});
