import crypto from 'crypto';

export const id = (prefix = '') => `${prefix}${crypto.randomUUID()}`;
