// ==============================================================================
// LogiSphere AI — Web API Endpoints Registry
// Mirrors backend route definitions from backend/src/app.ts
// ==============================================================================

export const ENDPOINTS = {
  // System Health
  HEALTH: '/health',

  // Multi-Organization SaaS Onboarding & Status
  ORGANIZATION: {
    REGISTER: '/api/org/register',
    STATUS: (slugOrId: string) => `/api/org/status/${encodeURIComponent(slugOrId)}`,
    MY_ORGANIZATIONS: '/api/org/my-organizations',
  },

  // Platform Administration & Organization Approval
  ADMIN: {
    LOGIN: '/api/admin/login',
    ME: '/api/admin/me',
    STATS: '/api/admin/stats',
    ORGS: '/api/admin/orgs',
    PENDING_ORGS: '/api/admin/orgs/pending',
    ORG_DETAILS: (id: string) => `/api/admin/orgs/${encodeURIComponent(id)}`,
    APPROVE_ORG: (id: string) => `/api/admin/orgs/${encodeURIComponent(id)}/approve`,
    REJECT_ORG: (id: string) => `/api/admin/orgs/${encodeURIComponent(id)}/reject`,
    SUSPEND_ORG: (id: string) => `/api/admin/orgs/${encodeURIComponent(id)}/suspend`,
    AUDIT_LOGS: '/api/admin/audit-logs',
  },

  // Google Places Location Autocomplete & Details Proxy
  LOCATIONS: {
    AUTOCOMPLETE: '/api/locations/autocomplete',
    DETAILS: (placeId: string) => `/api/locations/details/${encodeURIComponent(placeId)}`,
  },

  // Authentication
  AUTH: {
    LOGIN: '/api/auth/login',
  },
} as const;
