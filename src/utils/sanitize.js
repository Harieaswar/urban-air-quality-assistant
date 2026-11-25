/**
 * Input sanitization — SmogGuard
 * Strips HTML tags and limits length. No dangerouslySetInnerHTML used anywhere.
 */

export function sanitizeInput(text, maxLength = 200) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-z0-9#]+;/gi, '')
    .trim()
    .slice(0, maxLength);
}

export function sanitizeForDisplay(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
