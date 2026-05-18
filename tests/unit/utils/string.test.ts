import { describe, it, expect } from 'vitest';
import { isNonEmptyString, truncate } from '@/utils/string';

describe('isNonEmptyString', () => {
    it('returns true for a non-empty string', () => {
        expect(isNonEmptyString('hello')).toBe(true);
    });

    it('returns false for an empty string', () => {
        expect(isNonEmptyString('')).toBe(false);
    });

    it('returns false for a whitespace-only string', () => {
        expect(isNonEmptyString('   ')).toBe(false);
    });

    it('returns false for non-string values', () => {
        expect(isNonEmptyString(42)).toBe(false);
        expect(isNonEmptyString(null)).toBe(false);
        expect(isNonEmptyString(undefined)).toBe(false);
    });
});

describe('truncate', () => {
    it('returns the string unchanged when within maxLength', () => {
        expect(truncate('hello', 10)).toBe('hello');
    });

    it('truncates and appends ellipsis when over maxLength', () => {
        expect(truncate('hello world', 5)).toBe('hello...');
    });

    it('returns unchanged when exactly at maxLength', () => {
        expect(truncate('hello', 5)).toBe('hello');
    });
});
