/** HTML sanitisation for the rich-text and custom-HTML controls. */
import DOMPurify from 'dompurify';

export function sanitizeHtml(html: string): string {
  if (!html) return '';

  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true, svg: true } });
}
