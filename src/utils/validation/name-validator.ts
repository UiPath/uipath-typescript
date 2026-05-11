import { ValidationError } from '../../core/errors';

/**
 * Validates the `name` argument passed to a `getByName(name, ...)` method.
 * Trims whitespace and rejects empty/whitespace-only names.
 *
 * @param resourceType - Resource label used in error messages (e.g. 'Asset', 'Process')
 * @param name - Resource name to validate
 * @returns The trimmed name
 * @throws ValidationError when `name` is missing or empty after trimming
 */
export function validateName(resourceType: string, name: string): string {
  if (!name) {
    throw new ValidationError({
      message: `${resourceType} name is required and cannot be empty.`,
    });
  }
  const trimmed = name.trim();
  if (!trimmed) {
    throw new ValidationError({
      message: `${resourceType} name is required and cannot be empty.`,
    });
  }
  return trimmed;
}
