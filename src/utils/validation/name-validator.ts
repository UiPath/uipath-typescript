import { ValidationError } from '../../core/errors';

export interface ValidatedGetByNameArgs {
  name: string;
  folderPath?: string;
  folderKey?: string;
}

/**
 * Validates arguments passed to a `getByName(name, { folderPath?, folderKey? })`
 * method. Trims whitespace, normalizes empty optional strings to `undefined`.
 *
 * @param resourceType - Resource label used in error messages (e.g. 'Asset', 'Process')
 * @throws ValidationError when `name` is missing or empty after trimming
 */
export function validateGetByNameArgs(
  resourceType: string,
  name: string,
  folderPath?: string,
  folderKey?: string,
): ValidatedGetByNameArgs {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new ValidationError({
      message: `${resourceType} name is required and cannot be empty.`,
    });
  }
  return {
    name: trimmedName,
    folderPath: folderPath?.trim() || undefined,
    folderKey: folderKey?.trim() || undefined,
  };
}
