import type { CitationSource, CitationSourceMedia, CitationSourceUrl, ExternalValue, InlineOrExternalValue, InlineValue } from '@/models/conversational-agent';

/**
 * Type guard that determines if an InlineOrExternalValue value is an InlineValue value.
 * @param value The value to check.
 * @returns true if the value has type InlineValue
 */
export const isInlineValue = <T>(value: InlineOrExternalValue<T> | null | undefined): value is InlineValue<T> =>
  value !== undefined && value !== null && 'inline' in value;

/**
 * Type assertion that fails if an InlineOrExternalValue value is not an InlineValue value.
 * @param value The value to check.
 * @throw TypeError if the value is not an InlineValue.
 */
export function assertInlineValue<T>(value: InlineOrExternalValue<T> | null | undefined): asserts value is InlineValue<T> {
  if (!isInlineValue(value)) {
    throw new TypeError('Value is not an InlineValue');
  }
};

/**
 * Type guard that determines if an InlineOrExternalValue value is an ExternalValue value.
 * @param value The value to check.
 * @returns true if the value has type ExternalValue
 */
export const isExternalValue = <T>(value: InlineOrExternalValue<T> | null | undefined): value is ExternalValue =>
  value !== undefined && value !== null && 'uri' in value;

/**
 * Type assertion that fails if an InlineOrExternalValue value is not an ExternalValue value.
 * @param value The value to check.
 * @throw TypeError if the value is not an ExternalValue.
 */
export function assertExternalValue<T>(value: InlineOrExternalValue<T> | null | undefined): asserts value is ExternalValue {
  if (!isExternalValue(value)) {
    throw new TypeError('Value is not an ExternalValue');
  }
};

export function isCitationSourceUrl(citationSource: CitationSource): citationSource is CitationSourceUrl {
  return typeof (citationSource as any).url === 'string';
}

export function assertCitationSourceUrl(citationSource: CitationSource): asserts citationSource is CitationSourceUrl {
  if (!isCitationSourceUrl(citationSource)) {
    throw new TypeError('Object is not a CitationSourceUrl');
  }
};

export function isCitationSourceMedia(citationSource: CitationSource): citationSource is CitationSourceMedia {
  return typeof (citationSource as any).url === 'undefined';
}

export function assertCitationSourceMedia(citationSource: CitationSource): asserts citationSource is CitationSourceMedia {
  if (!isCitationSourceMedia(citationSource)) {
    throw new TypeError('Object is not a CitationSourceMedia');
  }
};
