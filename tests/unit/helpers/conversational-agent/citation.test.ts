import { describe, it, expect } from 'vitest';
import { resolveCitationMimeType } from '@/services/conversational-agent/helpers/citation';
import type { CitationSourceMedia } from '@/models/conversational-agent';

const media = (over: Partial<CitationSourceMedia> = {}): CitationSourceMedia => ({
  title: 'doc.pdf',
  number: 1,
  downloadUrl: 'https://alpha.uipath.com/org/tenant/ecs_/v1.1/reference/abc',
  ...over,
});

describe('resolveCitationMimeType', () => {
  it('prefers the source mimeType', () => {
    expect(resolveCitationMimeType(media({ mimeType: 'application/pdf' }), 'text/html')).toBe(
      'application/pdf',
    );
  });

  it('uses the response Content-Type when no source mimeType and it is meaningful', () => {
    expect(resolveCitationMimeType(media({ mimeType: undefined }), 'image/png')).toBe('image/png');
  });

  it('falls back to the title extension when the response is octet-stream', () => {
    expect(
      resolveCitationMimeType(media({ mimeType: undefined, title: 'report.pdf' }), 'application/octet-stream'),
    ).toBe('application/pdf');
  });

  it('falls back to octet-stream when nothing else is known', () => {
    expect(
      resolveCitationMimeType(media({ mimeType: undefined, title: 'noext' }), 'application/octet-stream'),
    ).toBe('application/octet-stream');
  });

  it('downgrades an .html extension fallback to octet-stream (no inline execution)', () => {
    expect(
      resolveCitationMimeType(media({ mimeType: undefined, title: 'page.html' }), 'application/octet-stream'),
    ).toBe('application/octet-stream');
  });

  it('downgrades a declared text/html source mimeType to octet-stream', () => {
    expect(resolveCitationMimeType(media({ mimeType: 'text/html', title: 'page.html' }), '')).toBe(
      'application/octet-stream',
    );
  });

  it('downgrades a text/html response Content-Type (with charset) to octet-stream', () => {
    expect(
      resolveCitationMimeType(media({ mimeType: undefined, title: 'page' }), 'text/html; charset=utf-8'),
    ).toBe('application/octet-stream');
  });
});
