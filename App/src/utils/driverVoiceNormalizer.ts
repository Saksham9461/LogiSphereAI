/**
 * Driver Voice Input Normalizer
 * Converts raw speech recognition output into structured, standardized database format.
 */

const NUMBER_WORDS: Record<string, string> = {
  zero: '0',
  oh: '0',
  nil: '0',
  nought: '0',
  one: '1',
  won: '1',
  two: '2',
  to: '2',
  too: '2',
  three: '3',
  tree: '3',
  four: '4',
  for: '4',
  fore: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  ate: '8',
  nine: '9',
  niner: '9',
  ten: '10',
};

const MONTH_NAMES: Record<string, string> = {
  january: '01',
  jan: '01',
  february: '02',
  feb: '02',
  march: '03',
  mar: '03',
  april: '04',
  apr: '04',
  may: '05',
  june: '06',
  jun: '06',
  july: '07',
  jul: '07',
  august: '08',
  aug: '08',
  september: '09',
  sep: '09',
  sept: '09',
  october: '10',
  oct: '10',
  november: '11',
  nov: '11',
  december: '12',
  dec: '12',
};

/**
 * Converts spoken words containing numbers into digits.
 * e.g. "nine eight seven" -> "987"
 * e.g. "twenty twenty eight" -> "2028"
 * e.g. "12 slash 2028" -> "12 / 2028"
 */
export const wordsToDigits = (input: string): string => {
  if (!input) return '';
  let text = input.toLowerCase().trim();

  // Normalize spoken symbols
  text = text.replace(/\bslash\b/g, '/');
  text = text.replace(/\bdash\b/g, '-');
  text = text.replace(/\bhyphen\b/g, '-');

  // Replace common spoken compound years
  text = text.replace(/\btwenty twenty five\b/g, '2025');
  text = text.replace(/\btwenty twenty six\b/g, '2026');
  text = text.replace(/\btwenty twenty seven\b/g, '2027');
  text = text.replace(/\btwenty twenty eight\b/g, '2028');
  text = text.replace(/\btwenty twenty nine\b/g, '2029');
  text = text.replace(/\btwenty thirty\b/g, '2030');
  text = text.replace(/\btwenty thirty one\b/g, '2031');
  text = text.replace(/\btwenty thirty two\b/g, '2032');
  text = text.replace(/\btwenty thirty three\b/g, '2033');
  text = text.replace(/\btwenty thirty four\b/g, '2034');
  text = text.replace(/\btwenty thirty five\b/g, '2035');

  const words = text.split(/[\s,]+/);
  const result: string[] = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (NUMBER_WORDS[word] !== undefined && NUMBER_WORDS[word] !== '') {
      result.push(NUMBER_WORDS[word]);
    } else if (word === 'double' && i + 1 < words.length && NUMBER_WORDS[words[i + 1]]) {
      result.push(NUMBER_WORDS[words[i + 1]]);
      result.push(NUMBER_WORDS[words[i + 1]]);
      i++;
    } else if (word === 'triple' && i + 1 < words.length && NUMBER_WORDS[words[i + 1]]) {
      result.push(NUMBER_WORDS[words[i + 1]]);
      result.push(NUMBER_WORDS[words[i + 1]]);
      result.push(NUMBER_WORDS[words[i + 1]]);
      i++;
    } else {
      result.push(word);
    }
  }

  return result.join(' ');
};

/**
 * Normalizes Driver Name
 * e.g. "rahul sharma" -> "Rahul Sharma"
 */
export const normalizeName = (input: string): string => {
  if (!input) return '';
  return input
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Normalizes Driving Licence Number
 * e.g. "DL zero one twenty twenty eight one two three four five six seven" -> "DL-01-2028-1234567"
 * e.g. "D L 0 1 2 0 2 8 1 2 3 4 5 6 7" -> "DL-01-2028-1234567"
 * e.g. "R J 1 4 A B 1 2 3 4 5 6" -> "RJ14AB123456"
 */
export const normalizeLicenseNumber = (input: string): string => {
  if (!input) return '';
  let processed = wordsToDigits(input).toUpperCase();

  // Combine space-separated state code initials (e.g. "D L" -> "DL", "R J" -> "RJ", "M H" -> "MH")
  processed = processed.replace(/\b([A-Z])\s+([A-Z])\b/g, '$1$2');

  // Extract letters and numbers
  const clean = processed.replace(/[^A-Z0-9]/g, '');
  if (!clean) return input.trim().toUpperCase();

  // Standard Indian DL formatting (DL-01-2028-1234567)
  if (clean.startsWith('DL')) {
    const rest = clean.slice(2);
    if (rest.length === 13) {
      return `DL-${rest.slice(0, 2)}-${rest.slice(2, 6)}-${rest.slice(6)}`;
    } else if (rest.length > 5) {
      return `DL-${rest}`;
    }
    return `DL-${rest}`;
  }

  // Generic licence format preservation
  return clean;
};

/**
 * Normalizes Phone Contact Number
 * e.g. "nine eight seven six five four three two one zero" -> "9876543210"
 * e.g. "9 8 7 6 5 4 3 2 1 0" -> "9876543210"
 */
export const normalizePhone = (input: string): string => {
  if (!input) return '';
  const converted = wordsToDigits(input);
  const digits = converted.replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
};

/**
 * Normalizes License Expiry Date to MM/YYYY format
 * e.g. "December 2028" -> "12/2028"
 * e.g. "12 2028" -> "12/2028"
 * e.g. "December twenty twenty eight" -> "12/2028"
 * e.g. "12 slash 2028" -> "12/2028"
 */
export const normalizeExpiry = (input: string): string => {
  if (!input) return '';
  let text = input.toLowerCase().trim();

  let monthStr = '';
  let yearStr = '';

  // Check for month names
  for (const [name, num] of Object.entries(MONTH_NAMES)) {
    if (new RegExp(`\\b${name}\\b`, 'i').test(text)) {
      monthStr = num;
      text = text.replace(new RegExp(`\\b${name}\\b`, 'gi'), '').trim();
      break;
    }
  }

  // Convert remaining words to digits
  const convertedText = wordsToDigits(text);
  const digitsOnly = convertedText.replace(/\D/g, '');

  if (!monthStr) {
    if (digitsOnly.length === 6) {
      // e.g. 122028 -> 12/2028
      monthStr = digitsOnly.slice(0, 2);
      yearStr = digitsOnly.slice(2);
    } else if (digitsOnly.length === 4) {
      // e.g. 1228 -> 12/2028
      monthStr = digitsOnly.slice(0, 2);
      yearStr = '20' + digitsOnly.slice(2);
    } else {
      const parts = convertedText.split(/[\/\s-]+/);
      if (parts.length >= 2) {
        const m = parts[0].padStart(2, '0');
        const y = parts[1].length === 2 ? '20' + parts[1] : parts[1];
        if (Number(m) >= 1 && Number(m) <= 12) {
          return `${m}/${y}`;
        }
      }
    }
  } else {
    if (digitsOnly.length === 4) {
      yearStr = digitsOnly;
    } else if (digitsOnly.length === 2) {
      yearStr = '20' + digitsOnly;
    }
  }

  if (monthStr && yearStr) {
    const mNum = Math.min(Math.max(Number(monthStr), 1), 12);
    const mPadded = String(mNum).padStart(2, '0');
    return `${mPadded}/${yearStr}`;
  }

  // Fallback cleanup
  const cleanInput = input.trim();
  if (/^\d{1,2}\/\d{4}$/.test(cleanInput)) return cleanInput;
  return cleanInput;
};

/**
 * Normalizes field value according to field key
 */
export const normalizeFieldValue = (key: string, input: string): string => {
  switch (key) {
    case 'name':
      return normalizeName(input);
    case 'licenseNumber':
      return normalizeLicenseNumber(input);
    case 'licenseExpiry':
      return normalizeExpiry(input);
    case 'contact':
      return normalizePhone(input);
    default:
      return input.trim();
  }
};
