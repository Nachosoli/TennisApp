/**
 * Parse a date string (YYYY-MM-DD) as a local date, not UTC
 * This prevents timezone conversion issues when displaying dates
 * 
 * When JavaScript parses "2025-11-30" with new Date(), it interprets it as UTC midnight,
 * which then gets converted to local time (e.g., Nov 29 7pm EST). This function
 * parses the date string as a local date to avoid this issue.
 * 
 * @param dateString - Date string in format "YYYY-MM-DD"
 * @returns Date object representing the date in local timezone
 */
export function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day); // month is 0-indexed in JavaScript
}

