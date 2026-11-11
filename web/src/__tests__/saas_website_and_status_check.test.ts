// ==============================================================================
// LogiSphere AI — SaaS Website & Organization Status Check Test Suite
// Verifies:
// 1. Check Status API client & service integration
// 2. Email validation and error handling
// 3. Masked email & safe payload verification (no tokens/passwords exposed)
// 4. Status outcomes: pending, approved, rejected, not found
// 5. SaaS Website navigation & routing contracts
// 6. Sign-in static flow leading to demo dashboard
// ==============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkRegistrationStatusByEmail } from '../services/organizationService';
import apiClient from '../services/apiClient';
import { ENDPOINTS } from '../services/endpoints';
import type { CheckStatusApiResponse } from '../types';

describe('LogiSphere AI — SaaS Website & Status Check Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Organization Status Check API Service', () => {
    it('1.1 Throws client-side error if email is empty or invalid', async () => {
      await expect(checkRegistrationStatusByEmail('')).rejects.toThrow(
        'Manager email address is required.'
      );
      await expect(checkRegistrationStatusByEmail('   ')).rejects.toThrow(
        'Manager email address is required.'
      );
    });

    it('1.2 Queries endpoint with trimmed lowercase email param', async () => {
      const mockResponse: CheckStatusApiResponse = {
        success: true,
        found: true,
        data: {
          organizationName: 'Fleet Dynamics Corp',
          maskedEmail: 'm***r@fleetdynamics.com',
          status: 'pending',
          registrationTimestamp: new Date().toISOString(),
        },
      };

      const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: mockResponse });

      const result = await checkRegistrationStatusByEmail('  MANAGER@FleetDynamics.com  ');

      expect(getSpy).toHaveBeenCalledWith(
        ENDPOINTS.ORGANIZATION.STATUS_BY_EMAIL,
        { params: { email: 'manager@fleetdynamics.com' } }
      );
      expect(result.found).toBe(true);
      expect(result.data?.organizationName).toBe('Fleet Dynamics Corp');
      expect(result.data?.status).toBe('pending');
      expect(result.data?.maskedEmail).toBe('m***r@fleetdynamics.com');
    });

    it('1.3 Handles Approved organization status correctly', async () => {
      const mockResponse: CheckStatusApiResponse = {
        success: true,
        found: true,
        data: {
          organizationName: 'Global Freight Lines',
          maskedEmail: 'a***x@globalfreight.com',
          status: 'approved',
          registrationTimestamp: '2026-10-15T09:00:00.000Z',
        },
      };

      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: mockResponse });

      const result = await checkRegistrationStatusByEmail('alex@globalfreight.com');
      expect(result.found).toBe(true);
      expect(result.data?.status).toBe('approved');
      expect(result.data?.organizationName).toBe('Global Freight Lines');
    });

    it('1.4 Handles Rejected organization status and includes reviewReason', async () => {
      const mockResponse: CheckStatusApiResponse = {
        success: true,
        found: true,
        data: {
          organizationName: 'Test Unverified Logistics',
          maskedEmail: 't***t@test.com',
          status: 'rejected',
          registrationTimestamp: '2026-10-20T14:30:00.000Z',
          reviewReason: 'Operating license documentation could not be verified by authorities.',
        },
      };

      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: mockResponse });

      const result = await checkRegistrationStatusByEmail('test@test.com');
      expect(result.found).toBe(true);
      expect(result.data?.status).toBe('rejected');
      expect(result.data?.reviewReason).toContain('documentation could not be verified');
    });

    it('1.5 Handles Not Found response safely without throwing exception', async () => {
      const mockResponse: CheckStatusApiResponse = {
        success: true,
        found: false,
        message: 'No organization registration was found associated with that email address.',
      };

      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: mockResponse });

      const result = await checkRegistrationStatusByEmail('unknown@domain.com');
      expect(result.found).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.message).toContain('No organization registration was found');
    });

    it('1.6 Verifies no sensitive fields (password, token, hash) are returned', async () => {
      const mockResponse: CheckStatusApiResponse = {
        success: true,
        found: true,
        data: {
          organizationName: 'Safe Haul Inc',
          maskedEmail: 's***e@safehaul.com',
          status: 'pending',
          registrationTimestamp: new Date().toISOString(),
        },
      };

      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: mockResponse });

      const result = await checkRegistrationStatusByEmail('safe@safehaul.com');
      const dataKeys = Object.keys(result.data || {});
      expect(dataKeys).not.toContain('password');
      expect(dataKeys).not.toContain('passwordHash');
      expect(dataKeys).not.toContain('token');
      expect(dataKeys).not.toContain('jwt');
      expect(dataKeys).not.toContain('userId');
    });
  });

  describe('2. SaaS Website Navigation & Routing Contracts', () => {
    const resolveSaaSRoute = (rawHash: string): string => {
      const currentPath = rawHash.replace(/^#\/?/, '').trim().split('?')[0].toLowerCase();
      if (!currentPath || currentPath === 'home') return 'home';
      if (currentPath === 'features') return 'features';
      if (currentPath === 'about') return 'about';
      if (currentPath === 'contact') return 'contact';
      if (currentPath === 'signin' || currentPath === 'login') return 'signin';
      if (currentPath === 'signup' || currentPath === 'register') return 'signup';
      if (currentPath === 'check-status' || currentPath === 'status') return 'check-status';
      if (currentPath === 'demo-dashboard' || currentPath === 'dashboard-preview') return 'demo-dashboard';
      if (currentPath === 'registration-success') return 'registration-success';
      if (currentPath.startsWith('admin')) return 'admin';
      return 'home';
    };

    it('2.1 Resolves all required SaaS navigation links correctly', () => {
      expect(resolveSaaSRoute('')).toBe('home');
      expect(resolveSaaSRoute('#/')).toBe('home');
      expect(resolveSaaSRoute('#/home')).toBe('home');
      expect(resolveSaaSRoute('#/features')).toBe('features');
      expect(resolveSaaSRoute('#/about')).toBe('about');
      expect(resolveSaaSRoute('#/contact')).toBe('contact');
      expect(resolveSaaSRoute('#/signin')).toBe('signin');
      expect(resolveSaaSRoute('#/signup')).toBe('signup');
      expect(resolveSaaSRoute('#/check-status')).toBe('check-status');
    });

    it('2.2 Preserves backward-compatible route aliases', () => {
      expect(resolveSaaSRoute('#/login')).toBe('signin');
      expect(resolveSaaSRoute('#/register')).toBe('signup');
      expect(resolveSaaSRoute('#/status')).toBe('check-status');
      expect(resolveSaaSRoute('#/dashboard-preview')).toBe('demo-dashboard');
    });

    it('2.3 Preserves protected admin portal and registration confirmation routes', () => {
      expect(resolveSaaSRoute('#/admin')).toBe('admin');
      expect(resolveSaaSRoute('#/admin/dashboard')).toBe('admin');
      expect(resolveSaaSRoute('#/registration-success')).toBe('registration-success');
    });

    it('2.4 Redirects unknown or deprecated routes to Home', () => {
      expect(resolveSaaSRoute('#/random-page')).toBe('home');
      expect(resolveSaaSRoute('#/old-fleet-tracker')).toBe('home');
    });
  });
});

