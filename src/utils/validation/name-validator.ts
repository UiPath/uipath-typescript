import { ValidationError } from '../../core/errors';

export interface ValidatedGetByNameArgs {
  name: string;
  folderPath?: string;
  folderKey?: string;
}

/**
 * Validates arguments passed to a `getByName(name, { folderPath?, folderKey? })`
 * method. Catches bad input at the SDK boundary instead of failing
 * mid-request with an opaque server error.
 *
 * Checks:
 * - `name` is a non-empty string (trimmed)
 * - `folderPath` / `folderKey` are strings if provided; empty strings are
 *   normalized to `undefined` so callers don't have to guard themselves
 *
 * @param resourceType - Resource label used in error messages (e.g. 'Asset',
 *                       'Process'). Keeps errors contextual for the caller.
 * @throws ValidationError when any argument fails validation
 * @returns Trimmed, type-checked copies of the inputs ready to be passed to HTTP layers
 */
export function validateGetByNameArgs(
  resourceType: string,
  name: unknown,
  folderPath?: unknown,
  folderKey?: unknown,
): ValidatedGetByNameArgs {
  if (typeof name !== 'string') {
    throw new ValidationError({
      message: `${resourceType} name must be a string, received ${name === null ? 'null' : typeof name}.`,
    });
  }
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new ValidationError({
      message: `${resourceType} name is required and cannot be empty.`,
    });
  }

  const trimmedPath = validateOptionalString('folderPath', folderPath);
  const trimmedKey = validateOptionalString('folderKey', folderKey);

  return { name: trimmedName, folderPath: trimmedPath, folderKey: trimmedKey };
}

function validateOptionalString(fieldName: string, value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') {
    throw new ValidationError({
      message: `${fieldName} must be a string, received ${typeof value}.`,
    });
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}
