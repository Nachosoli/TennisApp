/**
 * Sanitize user-generated content to prevent XSS attacks
 * Strips HTML tags and escapes special characters
 */
export function sanitizeHtml(text: string | null | undefined): string {
  if (!text) return '';
  
  // Create a temporary div element to decode HTML entities
  const div = document.createElement('div');
  div.textContent = text;
  const decoded = div.textContent || div.innerText || '';
  
  // Strip any remaining HTML tags and escape special characters
  return decoded
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize text content (strips HTML tags but keeps text)
 * Use this when you want to display user input as plain text
 */
export function sanitizeText(text: string | null | undefined): string {
  if (!text) return '';
  
  // Create a temporary div element to strip HTML tags
  const div = document.createElement('div');
  div.textContent = text;
  return div.textContent || div.innerText || '';
}

