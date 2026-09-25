import { DriverVoiceFormData } from '../types/driverVoice';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const validateDriverField = (key: string, value: string): ValidationResult => {
  const trimmed = (value || '').trim();

  switch (key) {
    case 'name':
      if (!trimmed) {
        return { isValid: false, error: 'Driver name is required.' };
      }
      if (trimmed.length < 2) {
        return { isValid: false, error: 'Driver name must be at least 2 characters.' };
      }
      return { isValid: true };

    case 'licenseNumber':
      if (!trimmed) {
        return { isValid: false, error: 'Licence number is required.' };
      }
      if (trimmed.length < 4) {
        return { isValid: false, error: 'Please enter a valid licence number.' };
      }
      return { isValid: true };

    case 'licenseExpiry':
      if (!trimmed) {
        return { isValid: false, error: 'Expiry date is required (MM/YYYY).' };
      }
      const parts = trimmed.split('/');
      if (parts.length !== 2) {
        return { isValid: false, error: 'Expiry must be in MM/YYYY format.' };
      }
      const month = Number(parts[0]);
      const year = Number(parts[1]);
      if (isNaN(month) || month < 1 || month > 12) {
        return { isValid: false, error: 'Invalid month in expiry date.' };
      }
      if (isNaN(year) || year < 2020 || year > 2060) {
        return { isValid: false, error: 'Invalid year in expiry date.' };
      }
      return { isValid: true };

    case 'contact':
      if (!trimmed) {
        return { isValid: false, error: 'Contact number is required.' };
      }
      const digitsOnly = trimmed.replace(/\D/g, '');
      if (digitsOnly.length < 10) {
        return { isValid: false, error: 'Contact number must be 10 digits.' };
      }
      return { isValid: true };

    default:
      return { isValid: true };
  }
};

export const validateFullDriverForm = (data: Partial<DriverVoiceFormData>): ValidationResult => {
  const nameVal = validateDriverField('name', data.name || '');
  if (!nameVal.isValid) return nameVal;

  const licVal = validateDriverField('licenseNumber', data.licenseNumber || '');
  if (!licVal.isValid) return licVal;

  const expVal = validateDriverField('licenseExpiry', data.licenseExpiry || '');
  if (!expVal.isValid) return expVal;

  const phoneVal = validateDriverField('contact', data.contact || '');
  if (!phoneVal.isValid) return phoneVal;

  return { isValid: true };
};
