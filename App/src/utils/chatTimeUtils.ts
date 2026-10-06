/**
 * Converts a UTC ISO timestamp from the server into the user's local timezone display format.
 * Example output: "6:42 PM" or "10:15 AM"
 */
export function formatLocalMessageTime(isoString?: string | null): string {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';

    return date.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch (err) {
    return '';
  }
}

/**
 * Checks if a timestamp is strictly within the last 24 hours (86,400,000 ms).
 */
export function isWithin24Hours(isoString?: string | null): boolean {
  if (!isoString) return false;
  try {
    const date = new Date(isoString);
    const timestamp = date.getTime();
    if (isNaN(timestamp)) return false;

    const now = Date.now();
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;
    return now - timestamp < twentyFourHoursMs && timestamp <= now + 60000; // Allow slight clock skew
  } catch (err) {
    return false;
  }
}
