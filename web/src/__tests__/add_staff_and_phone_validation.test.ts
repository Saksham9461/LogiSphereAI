// ==============================================================================
// LogiSphere AI — Add Staff & Frontend Phone Number Validation Test Suite
// Verifies:
// 1. Phone number validation across all website frontend screens
// 2. Add Staff RBAC route permissions
// 3. Fleet service registerStaff endpoint integration
// ==============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isValidPhoneNumber, cleanPhoneNumber, isValidEmail } from '../utils/validation';
import { isRouteAllowed, CanonicalRole, Permission, hasPermission } from '../utils/rbac';
import { fleetService } from '../services/fleetService';
import apiClient from '../services/apiClient';

describe('LogiSphere AI — Add Staff & Phone Number Validation Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Frontend Phone / Mobile Number Validation', () => {
    it('1.1 Validates standard 10-digit mobile numbers', () => {
      expect(isValidPhoneNumber('9876543210')).toBe(true);
      expect(isValidPhoneNumber('8765432109')).toBe(true);
      expect(isValidPhoneNumber('7654321098')).toBe(true);
    });

    it('1.2 Validates formatted mobile numbers with spaces, dashes, or parentheses', () => {
      expect(isValidPhoneNumber('98765 43210')).toBe(true);
      expect(isValidPhoneNumber('987-654-3210')).toBe(true);
      expect(isValidPhoneNumber('(555) 019-2834')).toBe(true);
    });

    it('1.3 Validates international mobile numbers with country codes', () => {
      expect(isValidPhoneNumber('+91 98765 43210')).toBe(true);
      expect(isValidPhoneNumber('+919876543210')).toBe(true);
      expect(isValidPhoneNumber('+1 (555) 019-2834')).toBe(true);
    });

    it('1.4 Rejects invalid phone numbers (too short, letters, empty, special characters)', () => {
      expect(isValidPhoneNumber('12345')).toBe(false);
      expect(isValidPhoneNumber('98765')).toBe(false);
      expect(isValidPhoneNumber('abcdefghij')).toBe(false);
      expect(isValidPhoneNumber('')).toBe(false);
      expect(isValidPhoneNumber('   ')).toBe(false);
      expect(isValidPhoneNumber(null as any)).toBe(false);
      expect(isValidPhoneNumber(undefined as any)).toBe(false);
      expect(isValidPhoneNumber('98765@43210')).toBe(false);
    });

    it('1.5 Cleans phone number by trimming extraneous whitespace', () => {
      expect(cleanPhoneNumber('  9876543210  ')).toBe('9876543210');
      expect(cleanPhoneNumber('+91 98765 43210')).toBe('+91 98765 43210');
      expect(cleanPhoneNumber(null)).toBe('');
    });
  });

  describe('2. Add Staff RBAC Permissions', () => {
    it('2.1 Allows Fleet Manager to access add-staff route', () => {
      expect(isRouteAllowed(CanonicalRole.MANAGER, 'add-staff')).toBe(true);
      expect(hasPermission(CanonicalRole.MANAGER, Permission.USERS_MANAGE)).toBe(true);
    });

    it('2.2 Restricts Driver from accessing add-staff route', () => {
      expect(isRouteAllowed(CanonicalRole.DRIVER, 'add-staff')).toBe(false);
      expect(hasPermission(CanonicalRole.DRIVER, Permission.USERS_MANAGE)).toBe(false);
    });

    it('2.3 Restricts unauthorized callers from accessing add-staff route', () => {
      expect(isRouteAllowed(CanonicalRole.UNAUTHORIZED, 'add-staff')).toBe(false);
      expect(isRouteAllowed(undefined, 'add-staff')).toBe(false);
    });
  });

  describe('3. Fleet Service registerStaff API Integration', () => {
    it('3.1 Dispatches POST to /api/user/create with staff payload', async () => {
      const mockResult = {
        data: {
          success: true,
          user: {
            id: 'usr-999',
            name: 'Elena Rostova',
            email: 'elena@logisphere.ai',
            role: 'ROLE_DISPATCHER',
            phoneNo: '9876543210',
          },
          credentials: {
            email: 'elena@logisphere.ai',
            temporaryPassword: 'TempPassword123!',
          },
        },
      };

      const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce(mockResult);

      const payload = {
        name: 'Elena Rostova',
        email: 'elena@logisphere.ai',
        phoneNo: '9876543210',
        password: 'TempPassword123!',
        role: 'ROLE_DISPATCHER',
      };

      const response = await fleetService.registerStaff(payload);

      expect(postSpy).toHaveBeenCalledWith('/api/user/create', payload);
      expect(response.user.id).toBe('usr-999');
      expect(response.credentials?.temporaryPassword).toBe('TempPassword123!');
    });
  });

  describe('4. Email Validation Helper', () => {
    it('4.1 Correctly validates email patterns', () => {
      expect(isValidEmail('marcus@logisphere.ai')).toBe(true);
      expect(isValidEmail('test.user+tag@domain.co.uk')).toBe(true);
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('missing@domain')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });
  });
});
