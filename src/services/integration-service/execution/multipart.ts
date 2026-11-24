import { ValidationError } from '@/core/errors';
import { CONTENT_TYPES } from '@/utils/constants/headers';
import type { ExecuteFile } from '@/models/integration-service/execution.types';

const DEFAULT_BODY_PART_NAME = 'body';
const DEFAULT_FILE_NAME = 'file';

/**
 * A file as a Blob with its content type.
 *
 * @internal
 */
export function toBlob(file: ExecuteFile): Blob {
  const type = file.contentType ?? CONTENT_TYPES.OCTET_STREAM;
  if (file.content instanceof Blob) {
    return file.content.type === type ? file.content : new Blob([file.content], { type });
  }
  // Copy into a fresh buffer: a view over a shared buffer is not a valid Blob part
  return new Blob([new Uint8Array(file.content)], { type });
}

/**
 * Checks the files of a call before anything is sent.
 *
 * @internal
 */
export function validateFiles(files: ExecuteFile[], method: string): void {
  for (const file of files) {
    if (!file?.name) {
      throw new ValidationError({ message: `every file passed to ${method} needs a name` });
    }
    if (!(file.content instanceof Blob) && !(file.content instanceof Uint8Array)) {
      throw new ValidationError({ message: `file "${file.name}" passed to ${method} has no content` });
    }
  }
}

/**
 * Builds the multipart form for a connector call that uploads files. Each file is one part,
 * and a non-empty body travels as a JSON part of its own.
 *
 * @param files - Files to send
 * @param body - Body of the call
 * @param bodyPartName - Name of the part that carries the body
 * @returns The form to send
 * @internal
 */
export function buildMultipartForm(files: ExecuteFile[], body: unknown, bodyPartName?: string): FormData {
  const form = new FormData();

  const hasBody = body !== undefined && body !== null &&
    !(typeof body === 'object' && Object.keys(body).length === 0);
  if (hasBody) {
    form.append(bodyPartName ?? DEFAULT_BODY_PART_NAME, typeof body === 'string' ? body : JSON.stringify(body));
  }

  for (const file of files) {
    form.append(file.name, toBlob(file), file.fileName ?? DEFAULT_FILE_NAME);
  }
  return form;
}
