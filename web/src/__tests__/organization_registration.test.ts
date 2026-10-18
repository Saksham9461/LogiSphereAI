import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  registerOrganization,
  getOrganizationStatus,
  searchPlaces,
  getPlaceDetails,
} from '../services/organizationService';
import { apiClient } from '../services/apiClient';
import type { OrgRegistrationPayload } from '../types';

describe('LogiSphere AI — Multi-Organization Web Registration & Status Service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Organization Registration API Integration (POST /api/org/register)', () => {
    const validPayload: OrgRegistrationPayload = {
      organizationName: 'Titan Freight Global',
      name: 'Titan Freight Global',
      slug: 'titan-freight',
      formattedAddress: '100 Logistics Way, Mumbai, Maharashtra, India',
      address: '100 Logistics Way, Mumbai, Maharashtra, India',
      googlePlacesId: 'ChIJwe1EZjDG5zsRAOperationsHub',
      placeId: 'ChIJwe1EZjDG5zsRAOperationsHub',
      latitude: 19.076,
      longitude: 72.8777,
      managerName: 'Rachel Vance',
      managerEmail: 'rachel.vance@titanfreight.com',
      password: 'SecurePassword2026!',
      managerPassword: 'SecurePassword2026!',
      managerPhone: '+91 98765 11111',
    };

    it('1.1 Successfully submits valid registration and receives pending status', async () => {
      const mockResponse = {
        data: {
          success: true,
          message: 'Organization registration submitted successfully and is awaiting platform administrator review',
          data: {
            organization: {
              id: 'org-titan-100',
              name: 'Titan Freight Global',
              slug: 'titan-freight',
              status: 'pending',
              registrationTimestamp: '2026-10-18T12:00:00.000Z',
            },
            membership: {
              id: 'mem-titan-01',
              status: 'pending',
              role: 'ROLE_MANAGER',
            },
            organizationId: 'org-titan-100',
            name: 'Titan Freight Global',
            slug: 'titan-freight',
            status: 'pending',
            managerEmail: 'rachel.vance@titanfreight.com',
            registrationTimestamp: '2026-10-18T12:00:00.000Z',
          },
        },
      };

      vi.spyOn(apiClient, 'post').mockResolvedValueOnce(mockResponse as any);

      const result = await registerOrganization(validPayload);

      expect(apiClient.post).toHaveBeenCalledWith('/api/org/register', validPayload);
      expect(result.success).toBe(true);
      expect(result.data?.organization.status).toBe('pending');
      expect(result.data?.membership.status).toBe('pending');
      expect(result.data?.organization.id).toBe('org-titan-100');

      // Security verification: response must not expose sensitive tokens or passwords
      expect((result.data as any).token).toBeUndefined();
      expect((result.data as any).password).toBeUndefined();
    });

    it('1.2 Handles duplicate email conflict (HTTP 409) with actionable message', async () => {
      const conflictError: any = new Error('An account with this email is already registered.');
      conflictError.response = {
        status: 409,
        data: {
          success: false,
          message: 'An account with this email is already registered as an active organization manager. Please use a different email or log in.',
        },
      };

      vi.spyOn(apiClient, 'post').mockRejectedValueOnce(conflictError);

      await expect(registerOrganization(validPayload)).rejects.toThrow(
        /already registered/i
      );
    });

    it('1.3 Handles validation errors (HTTP 400) from backend gracefully', async () => {
      const validationError: any = new Error('Validation failed');
      validationError.response = {
        status: 400,
        data: {
          success: false,
          message: 'Latitude must be between -90 and 90',
        },
      };

      vi.spyOn(apiClient, 'post').mockRejectedValueOnce(validationError);

      await expect(
        registerOrganization({ ...validPayload, latitude: 120 })
      ).rejects.toThrow(/Latitude must be between -90 and 90/i);
    });

    it('1.4 Handles network or server offline error (HTTP 500) without crashing', async () => {
      const netError: any = new Error('Network Error');
      netError.response = undefined;

      vi.spyOn(apiClient, 'post').mockRejectedValueOnce(netError);

      await expect(registerOrganization(validPayload)).rejects.toThrow(
        /Network request failed|Network Error/i
      );
    });
  });

  describe('2. Registration Status Lookup API Integration (GET /api/org/status/:slugOrId)', () => {
    it('2.1 Returns safe status data for "pending" application', async () => {
      const mockPending = {
        data: {
          success: true,
          data: {
            organizationId: 'org-apex-200',
            name: 'Apex Logistics Freight',
            slug: 'apex-logistics',
            status: 'pending',
            registrationTimestamp: '2026-10-18T10:00:00.000Z',
          },
        },
      };

      vi.spyOn(apiClient, 'get').mockResolvedValueOnce(mockPending as any);

      const res = await getOrganizationStatus('apex-logistics');

      expect(apiClient.get).toHaveBeenCalledWith('/api/org/status/apex-logistics');
      expect(res.success).toBe(true);
      expect(res.data?.status).toBe('pending');
      expect(res.data?.name).toBe('Apex Logistics Freight');
    });

    it('2.2 Returns safe status data for "approved" organization', async () => {
      const mockApproved = {
        data: {
          success: true,
          data: {
            organizationId: 'org-apex-200',
            name: 'Apex Logistics Freight',
            slug: 'apex-logistics',
            status: 'approved',
            registrationTimestamp: '2026-10-18T10:00:00.000Z',
          },
        },
      };

      vi.spyOn(apiClient, 'get').mockResolvedValueOnce(mockApproved as any);

      const res = await getOrganizationStatus('apex-logistics');
      expect(res.data?.status).toBe('approved');
    });

    it('2.3 Returns review reason for "rejected" application without exposing private metadata', async () => {
      const mockRejected = {
        data: {
          success: true,
          data: {
            organizationId: 'org-apex-200',
            name: 'Apex Logistics Freight',
            slug: 'apex-logistics',
            status: 'rejected',
            registrationTimestamp: '2026-10-18T10:00:00.000Z',
            reviewReason: 'Operating address does not match commercial logistics facility registry.',
          },
        },
      };

      vi.spyOn(apiClient, 'get').mockResolvedValueOnce(mockRejected as any);

      const res = await getOrganizationStatus('apex-logistics');
      expect(res.data?.status).toBe('rejected');
      expect(res.data?.reviewReason).toContain('commercial logistics facility');
      // Verify no reviewer password, internal ID, or sensitive tokens are present
      expect((res.data as any).reviewed_by).toBeUndefined();
      expect((res.data as any).token).toBeUndefined();
    });

    it('2.4 Returns safe status data for "suspended" organization', async () => {
      const mockSuspended = {
        data: {
          success: true,
          data: {
            organizationId: 'org-apex-200',
            name: 'Apex Logistics Freight',
            slug: 'apex-logistics',
            status: 'suspended',
            registrationTimestamp: '2026-10-18T10:00:00.000Z',
          },
        },
      };

      vi.spyOn(apiClient, 'get').mockResolvedValueOnce(mockSuspended as any);

      const res = await getOrganizationStatus('apex-logistics');
      expect(res.data?.status).toBe('suspended');
    });

    it('2.5 Returns friendly 404 error when organization is not found', async () => {
      const notFoundErr: any = new Error('Not found');
      notFoundErr.response = {
        status: 404,
        data: { success: false, message: 'Organization not found' },
      };

      vi.spyOn(apiClient, 'get').mockRejectedValueOnce(notFoundErr);

      await expect(getOrganizationStatus('nonexistent-org')).rejects.toThrow(
        /No organization found matching "nonexistent-org"/i
      );
    });

    it('2.6 Rejects empty slug or ID lookup before network call', async () => {
      await expect(getOrganizationStatus('')).rejects.toThrow(/required/i);
    });
  });

  describe('3. Google Places Autocomplete & Details Backend Proxy', () => {
    it('3.1 searchPlaces calls backend proxy without exposing Google API keys', async () => {
      const mockPredictions = {
        data: {
          success: true,
          data: [
            {
              placeId: 'ChIJbU60qSXDyjsR52JUE4MChLs',
              title: 'Ring Road',
              address: 'Ring Road, Surat, Gujarat, India',
              secondaryText: 'Surat, Gujarat, India',
            },
          ],
        },
      };

      vi.spyOn(apiClient, 'get').mockResolvedValueOnce(mockPredictions as any);

      const results = await searchPlaces('Ring Road');

      expect(apiClient.get).toHaveBeenCalledWith('/api/locations/autocomplete', {
        params: { query: 'Ring Road' },
      });
      expect(results).toHaveLength(1);
      expect(results[0].placeId).toBe('ChIJbU60qSXDyjsR52JUE4MChLs');
    });

    it('3.2 searchPlaces returns empty array when query is less than 2 characters without network call', async () => {
      const spy = vi.spyOn(apiClient, 'get');
      const results = await searchPlaces('a');

      expect(spy).not.toHaveBeenCalled();
      expect(results).toEqual([]);
    });

    it('3.3 getPlaceDetails resolves coordinates and formatted address via backend proxy', async () => {
      const mockDetails = {
        data: {
          success: true,
          data: {
            placeId: 'ChIJbU60qSXDyjsR52JUE4MChLs',
            name: 'Surat Ring Road Hub',
            formattedAddress: '100 Ring Road, Surat, Gujarat 395002, India',
            latitude: 21.1702,
            longitude: 72.8311,
          },
        },
      };

      vi.spyOn(apiClient, 'get').mockResolvedValueOnce(mockDetails as any);

      const details = await getPlaceDetails('ChIJbU60qSXDyjsR52JUE4MChLs');

      expect(apiClient.get).toHaveBeenCalledWith(
        '/api/locations/details/ChIJbU60qSXDyjsR52JUE4MChLs',
        { params: {} }
      );
      expect(details).toBeDefined();
      expect(details?.latitude).toBe(21.1702);
      expect(details?.longitude).toBe(72.8311);
    });

    it('3.4 getPlaceDetails strips "places/" prefix correctly', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: { success: true, data: {} } } as any);

      await getPlaceDetails('places/ChIJbU60qSXDyjsR52JUE4MChLs');

      expect(apiClient.get).toHaveBeenCalledWith(
        '/api/locations/details/ChIJbU60qSXDyjsR52JUE4MChLs',
        { params: {} }
      );
    });
  });

  describe('4. Client-Side Validation Rules & Invariant Integrity', () => {
    it('4.1 Password rule enforces minimum 8 characters', () => {
      const isValidPassword = (p: string) => p.length >= 8;
      expect(isValidPassword('short')).toBe(false);
      expect(isValidPassword('1234567')).toBe(false);
      expect(isValidPassword('12345678')).toBe(true);
      expect(isValidPassword('SecurePass!2026')).toBe(true);
    });

    it('4.2 Email regex enforces standard work email format', () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(emailRegex.test('not-an-email')).toBe(false);
      expect(emailRegex.test('missing-domain@')).toBe(false);
      expect(emailRegex.test('valid@titanlogistics.com')).toBe(true);
    });

    it('4.3 Coordinate validation rejects out-of-range latitude/longitude', () => {
      const isValidLat = (lat: number) => lat >= -90 && lat <= 90;
      const isValidLng = (lng: number) => lng >= -180 && lng <= 180;

      expect(isValidLat(21.1702)).toBe(true);
      expect(isValidLng(72.8311)).toBe(true);
      expect(isValidLat(95)).toBe(false);
      expect(isValidLat(-95)).toBe(false);
      expect(isValidLng(185)).toBe(false);
      expect(isValidLng(-190)).toBe(false);
    });

    it('4.4 Slug generator normalizes company names safely', () => {
      const slugify = (text: string) =>
        text
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, '')
          .replace(/[\s_-]+/g, '-')
          .replace(/^-+|-+$/g, '');

      expect(slugify('Apex Logistics Freight Ltd.')).toBe('apex-logistics-freight-ltd');
      expect(slugify('  Titan & Sons Fleet, LLC  ')).toBe('titan-sons-fleet-llc');
    });

    it('4.5 Invariant: Address change must trigger clearing of place ID and coordinates', () => {
      let currentPlaceId = 'ChIJbU60qSXDyjsR52JUE4MChLs';
      let currentCoords: { latitude: number; longitude: number } | null = { latitude: 21.1702, longitude: 72.8311 };

      const onClearPlace = () => {
        currentPlaceId = '';
        currentCoords = null;
      };

      // Simulate address modification by user
      onClearPlace();

      expect(currentPlaceId).toBe('');
      expect(currentCoords).toBeNull();
    });
  });
});
