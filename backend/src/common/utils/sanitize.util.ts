/**
 * Sanitize user input to prevent XSS attacks
 * Strips HTML tags and dangerous characters
 */
export function sanitizeInput(input: string | null | undefined): string {
  if (!input) return '';
  
  // Strip HTML tags and escape dangerous characters
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>"']/g, '') // Remove dangerous characters
    .trim();
}

/**
 * Sanitize text content while preserving basic formatting
 * Allows newlines and basic punctuation but strips HTML
 */
export function sanitizeTextContent(input: string | null | undefined): string {
  if (!input) return '';
  
  // Strip HTML tags but preserve newlines and basic formatting
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>]/g, '') // Remove angle brackets
    .trim();
}

