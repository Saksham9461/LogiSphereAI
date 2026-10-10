export interface JwtPayload {
  userId?: string;
  email?: string;
  role?: string;
  exp?: number;
  iat?: number;
  [key: string]: any;
}

function base64Decode(str: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  const input = str.replace(/[^A-Za-z0-9+/=]/g, '');

  for (let i = 0; i < input.length; i += 4) {
    const enc1 = chars.indexOf(input.charAt(i));
    const enc2 = chars.indexOf(input.charAt(i + 1));
    const enc3 = chars.indexOf(input.charAt(i + 2));
    const enc4 = chars.indexOf(input.charAt(i + 3));

    const chr1 = (enc1 << 2) | (enc2 >> 4);
    const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    const chr3 = ((enc3 & 3) << 6) | enc4;

    output += String.fromCharCode(chr1);
    if (enc3 !== 64 && enc3 !== -1) {
      output += String.fromCharCode(chr2);
    }
    if (enc4 !== 64 && enc4 !== -1) {
      output += String.fromCharCode(chr3);
    }
  }
  return output;
}

function decodeUtf8(binaryString: string): string {
  try {
    return decodeURIComponent(
      binaryString
        .split('')
        .map((c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  } catch {
    return binaryString;
  }
}

/**
 * Decodes the payload of a JWT without any external dependencies or DOM types.
 */
export function decodeJwt(token: string): JwtPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.trim().split('.');
  if (parts.length !== 3) return null;

  try {
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }

    const decodedBinary = base64Decode(base64);
    const jsonStr = decodeUtf8(decodedBinary);

    return JSON.parse(jsonStr) as JwtPayload;
  } catch (err) {
    return null;
  }
}

/**
 * Checks if a JWT token is expired or structurally invalid.
 * Includes a 10-second skew buffer.
 */
export function isJwtExpired(token: string, bufferSeconds = 10): boolean {
  const payload = decodeJwt(token);
  if (!payload) return true; // Invalid/corrupted token treated as expired
  if (typeof payload.exp !== 'number') return false; // If no exp specified, treat as non-expiring

  const currentTimeSeconds = Math.floor(Date.now() / 1000);
  return payload.exp <= currentTimeSeconds + bufferSeconds;
}
