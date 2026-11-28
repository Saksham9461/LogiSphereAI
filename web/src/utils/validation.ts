// ==============================================================================
// LogiSphere AI — Shared Frontend Validation Utilities
// Consistent validation rules across web application screens
// ==============================================================================

/**
 * Validates phone / mobile numbers across all LogiSphere AI web forms.
 * Accepts standard 10-digit local numbers and 10-15 digit international numbers
 * (e.g. "9876543210", "+91 98765 43210", "+1 (555) 019-2834").
 * Strips whitespace, dashes, parentheses, dots, and plus signs.
 */
export function isValidPhoneNumber(phone: string | null | undefined): boolean {
  if (!phone || typeof phone !== 'string') return false;
  const trimmed = phone.trim();
  if (!trimmed) return false;
  const digitsOnly = trimmed.replace(/[\s\-+().]/g, '');
  return /^\d{10,15}$/.test(digitsOnly);
}

/**
 * Validates email addresses using standard RFC-compliant pattern.
 */
export function isValidEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (!trimmed) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(trimmed);
}

/**
 * Cleans phone number by trimming extraneous whitespace.
 */
export function cleanPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '';
  return phone.trim();
}
