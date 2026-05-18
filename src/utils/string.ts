/** Returns true if the value is a non-empty string. */
export function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}

/** Truncates a string to the given max length, appending '...' if truncated. */
export function truncate(value: string, maxLength: number): string {
    if (value.length <= maxLength) return value;
    return value.slice(0, maxLength) + '...';
}
