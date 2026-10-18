// ==============================================================================
// LogiSphere AI — Multi-Organization SaaS Service
// Integrates with Express backend endpoints:
// - POST /api/org/register
// - GET  /api/org/status/:slugOrId
// - GET  /api/locations/autocomplete
// - GET  /api/locations/details/:placeId
// ==============================================================================

import { apiClient } from './apiClient';
import { ENDPOINTS } from './endpoints';
import type {
  ApiResponse,
  OrgRegistrationPayload,
  OrgRegistrationResponseData,
  OrgStatusData,
  PlaceSuggestion,
  PlaceDetails,
} from '../types';

/**
 * Submits an organization registration application.
 * Creates an organization in 'pending' status and links the initial manager as 'pending'.
 * Does NOT grant business data access or platform admin privileges.
 */
export async function registerOrganization(
  payload: OrgRegistrationPayload
): Promise<ApiResponse<OrgRegistrationResponseData>> {
  try {
    const response = await apiClient.post<ApiResponse<OrgRegistrationResponseData>>(
      ENDPOINTS.ORGANIZATION.REGISTER,
      payload
    );
    return response.data;
  } catch (err: any) {
    // Extract server message from Axios error response if available
    const serverMsg =
      err?.response?.data?.message ||
      err?.message ||
      'Registration request failed. Please check your network connection and try again.';
    const error: any = new Error(serverMsg);
    error.status = err?.response?.status || (err?.status ?? 500);
    error.response = err?.response;
    throw error;
  }
}

/**
 * Queries the public review status of an organization application by slug or UUID.
 * Returns only safe status information (pending, approved, rejected, suspended).
 */
export async function getOrganizationStatus(
  slugOrId: string
): Promise<ApiResponse<OrgStatusData>> {
  const cleanId = String(slugOrId || '').trim();
  if (!cleanId) {
    throw new Error('Organization slug or ID is required to look up application status.');
  }

  try {
    const response = await apiClient.get<ApiResponse<OrgStatusData>>(
      ENDPOINTS.ORGANIZATION.STATUS(cleanId)
    );
    return response.data;
  } catch (err: any) {
    const status = err?.response?.status || err?.status;
    let serverMsg = err?.response?.data?.message || err?.message || 'Failed to check organization status';
    if (status === 404) {
      serverMsg = `No organization found matching "${cleanId}". Please check the slug or registration ID.`;
    }
    const error: any = new Error(serverMsg);
    error.status = status || 500;
    error.response = err?.response;
    throw error;
  }
}

/**
 * Searches places using the backend Google Places Autocomplete proxy.
 * Avoids exposing Google Maps API keys to the browser.
 */
export async function searchPlaces(
  query: string,
  sessionToken?: string
): Promise<PlaceSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  try {
    const params: Record<string, string> = { query: trimmed };
    if (sessionToken) params.sessionToken = sessionToken;

    const response = await apiClient.get<ApiResponse<PlaceSuggestion[]>>(
      ENDPOINTS.LOCATIONS.AUTOCOMPLETE,
      { params }
    );

    if (response.data && Array.isArray(response.data.data)) {
      return response.data.data;
    }
    return [];
  } catch (err: any) {
    console.warn('[organizationService] Places autocomplete request failed:', err?.message || err);
    return [];
  }
}

/**
 * Resolves full place details (formatted address, latitude, longitude) via backend proxy.
 */
export async function getPlaceDetails(
  placeId: string,
  sessionToken?: string
): Promise<PlaceDetails | null> {
  const cleanId = placeId.trim().replace(/^places\//, '');
  if (!cleanId) return null;

  try {
    const params: Record<string, string> = {};
    if (sessionToken) params.sessionToken = sessionToken;

    const response = await apiClient.get<ApiResponse<PlaceDetails>>(
      ENDPOINTS.LOCATIONS.DETAILS(cleanId),
      { params }
    );

    if (response.data && response.data.data) {
      return response.data.data;
    }
    return null;
  } catch (err: any) {
    console.warn('[organizationService] Place details request failed:', err?.message || err);
    return null;
  }
}
