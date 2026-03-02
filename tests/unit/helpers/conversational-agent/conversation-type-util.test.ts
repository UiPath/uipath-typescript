// ===== IMPORTS =====
import { describe, it, expect } from 'vitest';
import {
  isInlineValue,
  isExternalValue,
  assertInlineValue,
  assertExternalValue,
  isCitationSourceUrl,
  isCitationSourceMedia,
  assertCitationSourceUrl,
  assertCitationSourceMedia,
} from '@/services/conversational-agent/helpers/conversation-type-util';

// ===== TEST SUITE =====
describe('Conversation Type Utility Functions', () => {
  describe('isInlineValue', () => {
    it('should return true for inline value', () => {
      expect(isInlineValue({ inline: 'test content' })).toBe(true);
    });

    it('should return true for empty inline string', () => {
      expect(isInlineValue({ inline: '' })).toBe(true);
    });

    it('should return false for external value', () => {
      expect(isInlineValue({ uri: 'https://example.com/file' })).toBe(false);
    });

    it('should return false for null', () => {
      expect(isInlineValue(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isInlineValue(undefined)).toBe(false);
    });
  });

  describe('isExternalValue', () => {
    it('should return true for external value with uri', () => {
      expect(isExternalValue({ uri: 'https://example.com/file.pdf' })).toBe(true);
    });

    it('should return true for external value with uri and byteCount', () => {
      expect(isExternalValue({ uri: 'https://example.com/file.pdf', byteCount: 12345 })).toBe(true);
    });

    it('should return false for inline value', () => {
      expect(isExternalValue({ inline: 'test content' })).toBe(false);
    });

    it('should return false for null', () => {
      expect(isExternalValue(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isExternalValue(undefined)).toBe(false);
    });
  });

  describe('assertInlineValue', () => {
    it('should not throw for inline value', () => {
      expect(() => assertInlineValue({ inline: 'content' })).not.toThrow();
    });

    it('should throw TypeError for external value', () => {
      expect(() => assertInlineValue({ uri: 'https://example.com' })).toThrow(TypeError);
      expect(() => assertInlineValue({ uri: 'https://example.com' })).toThrow('Value is not an InlineValue');
    });

    it('should throw TypeError for null', () => {
      expect(() => assertInlineValue(null)).toThrow(TypeError);
    });

    it('should throw TypeError for undefined', () => {
      expect(() => assertInlineValue(undefined)).toThrow(TypeError);
    });
  });

  describe('assertExternalValue', () => {
    it('should not throw for external value', () => {
      expect(() => assertExternalValue({ uri: 'https://example.com/file' })).not.toThrow();
    });

    it('should throw TypeError for inline value', () => {
      expect(() => assertExternalValue({ inline: 'content' })).toThrow(TypeError);
      expect(() => assertExternalValue({ inline: 'content' })).toThrow('Value is not an ExternalValue');
    });

    it('should throw TypeError for null', () => {
      expect(() => assertExternalValue(null)).toThrow(TypeError);
    });

    it('should throw TypeError for undefined', () => {
      expect(() => assertExternalValue(undefined)).toThrow(TypeError);
    });
  });

  describe('isCitationSourceUrl', () => {
    it('should return true for citation source with url', () => {
      expect(isCitationSourceUrl({ title: 'Source', number: 1, url: 'https://example.com' } as any)).toBe(true);
    });

    it('should return false for citation source without url', () => {
      expect(isCitationSourceUrl({ title: 'Source', number: 1 } as any)).toBe(false);
    });

    it('should return false for citation source with undefined url', () => {
      expect(isCitationSourceUrl({ title: 'Source', number: 1, url: undefined } as any)).toBe(false);
    });
  });

  describe('assertCitationSourceUrl', () => {
    it('should not throw for citation source with url', () => {
      expect(() => assertCitationSourceUrl({ title: 'Source', number: 1, url: 'https://example.com' } as any)).not.toThrow();
    });

    it('should throw TypeError for citation source without url', () => {
      expect(() => assertCitationSourceUrl({ title: 'Source', number: 1 } as any)).toThrow(TypeError);
      expect(() => assertCitationSourceUrl({ title: 'Source', number: 1 } as any)).toThrow('Object is not a CitationSourceUrl');
    });
  });

  describe('isCitationSourceMedia', () => {
    it('should return true for citation source without url', () => {
      expect(isCitationSourceMedia({ title: 'Media', number: 1 } as any)).toBe(true);
    });

    it('should return false for citation source with url', () => {
      expect(isCitationSourceMedia({ title: 'Source', number: 1, url: 'https://example.com' } as any)).toBe(false);
    });
  });

  describe('assertCitationSourceMedia', () => {
    it('should not throw for citation source without url (media)', () => {
      expect(() => assertCitationSourceMedia({ title: 'Media', number: 1 } as any)).not.toThrow();
    });

    it('should throw TypeError for citation source with url', () => {
      expect(() => assertCitationSourceMedia({ title: 'Source', number: 1, url: 'https://example.com' } as any)).toThrow(TypeError);
      expect(() => assertCitationSourceMedia({ title: 'Source', number: 1, url: 'https://example.com' } as any)).toThrow('Object is not a CitationSourceMedia');
    });
  });
});
