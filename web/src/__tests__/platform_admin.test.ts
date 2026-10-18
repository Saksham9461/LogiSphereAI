// ==============================================================================
// LogiSphere AI — Platform Admin Web Dashboard Test Suite (Step 5)
// Unit & Integration tests for admin authentication, authorization verification,
// organization approvals, rejections, suspensions, and audit logs.
// ==============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adminService } from '../services/adminService';
import apiClient from '../services/apiClient';
import { ENDPOINTS } from '../services/endpoints';
import type { AdminUser, AdminOrgSummary, AdminOrgDetails, AuditLogEntry } from '../types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('LogiSphere AI — Platform Admin Web Dashboard Service (Step 5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // ===========================================================================
  // 1. Platform Admin Authentication & Verification (POST /login -> GET /admin/me)
  // ===========================================================================
  describe('1. Platform Admin Authentication & Server-Side Verification', () => {
    it('1.1 Successfully authenticates platform admin and stores admin token', async () => {
      const mockToken = 'mock.jwt.token.for.admin';
      const mockAdminUser: AdminUser = {
        id: 'usr-admin-001',
        userId: 'usr-admin-001',
        name: 'Global Administrator',
        email: 'admin@logisphere.ai',
        isPlatformAdmin: true,
      };

      // Mock login endpoint
      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        data: {
          success: true,
          message: 'Administrator login successful',
          data: {
            token: mockToken,
            admin: mockAdminUser,
          },
        },
      } as any);

      const result = await adminService.loginAdmin('admin@logisphere.ai', 'SuperAdminSecret123!');

      expect(apiClient.post).toHaveBeenCalledWith(ENDPOINTS.ADMIN.LOGIN, {
        username: 'admin@logisphere.ai',
        password: 'SuperAdminSecret123!',
      });

      expect(result.isPlatformAdmin).toBe(true);
      expect(result.email).toBe('admin@logisphere.ai');
      expect(localStorage.getItem('adminToken')).toBe(mockToken);
    });

    it('1.2 Strictly rejects non-admin users (e.g. fleet manager) and clears token', async () => {
      // Backend admin login returns 403 Forbidden for non-admin credentials
      vi.spyOn(apiClient, 'post').mockRejectedValueOnce({
        response: {
          status: 403,
          data: {
            message: 'Invalid administrator credentials. Access restricted to platform administrators.',
          },
        },
      });

      await expect(
        adminService.loginAdmin('manager@apex.com', 'ManagerPass123!')
      ).rejects.toThrow(/Access restricted to platform administrators/i);

      // Invariant: Privileged admin token must NOT be preserved in localStorage
      expect(localStorage.getItem('adminToken')).toBeNull();
    });

    it('1.3 Rejects invalid password or unauthenticated user (HTTP 401)', async () => {
      vi.spyOn(apiClient, 'post').mockRejectedValueOnce({
        response: {
          status: 401,
          data: {
            message: 'Invalid administrator credentials',
          },
        },
      });

      await expect(
        adminService.loginAdmin('admin@logisphere.ai', 'WrongPassword!')
      ).rejects.toThrow('Invalid administrator credentials');

      expect(localStorage.getItem('adminToken')).toBeNull();
    });

    it('1.4 Validates required email and password fields before making network request', async () => {
      const postSpy = vi.spyOn(apiClient, 'post');

      await expect(adminService.loginAdmin('', 'secret')).rejects.toThrow(
        'Username and password are required'
      );
      await expect(adminService.loginAdmin('admin@logisphere.ai', '')).rejects.toThrow(
        'Username and password are required'
      );

      expect(postSpy).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // 2. Session Restoration & Logout
  // ===========================================================================
  describe('2. Session Restoration & Lifecycle', () => {
    it('2.1 Restores active session when token is valid and admin verified', async () => {
      localStorage.setItem('adminToken', 'valid.admin.jwt.token');

      const mockAdminUser: AdminUser = {
        id: 'usr-admin-001',
        userId: 'usr-admin-001',
        name: 'System Admin',
        email: 'sysadmin@logisphere.ai',
        isPlatformAdmin: true,
      };

      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
        data: {
          success: true,
          data: mockAdminUser,
        },
      } as any);

      const session = await adminService.verifyAdminSession();
      expect(session).not.toBeNull();
      expect(session?.email).toBe('sysadmin@logisphere.ai');
      expect(session?.isPlatformAdmin).toBe(true);
    });

    it('2.2 Returns null when no token exists in localStorage without network request', async () => {
      const getSpy = vi.spyOn(apiClient, 'get');
      const session = await adminService.verifyAdminSession();
      expect(session).toBeNull();
      expect(getSpy).not.toHaveBeenCalled();
    });

    it('2.3 Clears invalid or expired session token on verification failure', async () => {
      localStorage.setItem('adminToken', 'expired.jwt.token');

      vi.spyOn(apiClient, 'get').mockRejectedValueOnce(new Error('Invalid or expired token'));

      const session = await adminService.verifyAdminSession();
      expect(session).toBeNull();
      expect(localStorage.getItem('adminToken')).toBeNull();
    });

    it('2.4 Logout cleans up administrator token', () => {
      localStorage.setItem('adminToken', 'active.token');
      adminService.logoutAdmin();
      expect(localStorage.getItem('adminToken')).toBeNull();
    });
  });

  // ===========================================================================
  // 3. Organization Approval Queue & Inspection (GET /api/admin/orgs/pending)
  // ===========================================================================
  describe('3. Organization Review Queue & Details Inspection', () => {
    it('3.1 Fetches pending applications for the administrator review queue', async () => {
      const mockPending: AdminOrgSummary[] = [
        {
          id: 'org-101',
          name: 'Blue Star Cargo',
          slug: 'blue-star-cargo',
          formattedAddress: 'Port Terminal, Mumbai',
          status: 'pending',
          registrationTimestamp: '2026-10-18T10:00:00Z',
          manager: {
            id: 'usr-mgr-101',
            name: 'Priya Sharma',
            email: 'priya@bluestar.com',
          },
        },
      ];

      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
        data: {
          success: true,
          data: mockPending,
        },
      } as any);

      const data = await adminService.getPendingOrganizations();
      expect(apiClient.get).toHaveBeenCalledWith(ENDPOINTS.ADMIN.PENDING_ORGS);
      expect(data).toHaveLength(1);
      expect(data[0].name).toBe('Blue Star Cargo');
      expect(data[0].status).toBe('pending');
    });

    it('3.2 Fetches full organization details including member roster', async () => {
      const mockDetails: AdminOrgDetails = {
        id: 'org-101',
        name: 'Blue Star Cargo',
        slug: 'blue-star-cargo',
        formattedAddress: 'Port Terminal, Mumbai',
        googlePlacesId: 'ChIJPlace123',
        latitude: 19.076,
        longitude: 72.8777,
        status: 'pending',
        registrationTimestamp: '2026-10-18T10:00:00Z',
        manager: {
          id: 'usr-mgr-101',
          name: 'Priya Sharma',
          email: 'priya@bluestar.com',
        },
        members: [
          {
            membershipId: 'mem-001',
            userId: 'usr-mgr-101',
            name: 'Priya Sharma',
            email: 'priya@bluestar.com',
            role: 'ROLE_MANAGER',
            status: 'pending',
          },
        ],
      };

      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
        data: {
          success: true,
          data: mockDetails,
        },
      } as any);

      const data = await adminService.getOrganizationDetails('org-101');
      expect(apiClient.get).toHaveBeenCalledWith(ENDPOINTS.ADMIN.ORG_DETAILS('org-101'));
      expect(data.members).toHaveLength(1);
      expect(data.latitude).toBe(19.076);
    });

    it('3.3 Rejects empty organization ID lookup before network call', async () => {
      const getSpy = vi.spyOn(apiClient, 'get');
      await expect(adminService.getOrganizationDetails('')).rejects.toThrow(
        'Organization ID is required'
      );
      expect(getSpy).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // 4. Organization Lifecycle Actions (Approve, Reject, Suspend)
  // ===========================================================================
  describe('4. Organization Lifecycle Governance', () => {
    it('4.1 Approves pending organization and activates initial manager membership', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        data: {
          success: true,
          message: 'Organization approved successfully',
          data: {
            organizationId: 'org-101',
            status: 'approved',
            activatedMembershipsCount: 1,
          },
        },
      } as any);

      const res = await adminService.approveOrganization('org-101');
      expect(apiClient.post).toHaveBeenCalledWith(ENDPOINTS.ADMIN.APPROVE_ORG('org-101'));
      expect(res.status).toBe('approved');
      expect(res.activatedMembershipsCount).toBe(1);
    });

    it('4.2 Rejects organization with custom review reason', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        data: {
          success: true,
          message: 'Organization application rejected',
          data: {
            organizationId: 'org-102',
            status: 'rejected',
            reviewReason: 'Incomplete business registration documentation',
          },
        },
      } as any);

      const res = await adminService.rejectOrganization(
        'org-102',
        'Incomplete business registration documentation'
      );

      expect(apiClient.post).toHaveBeenCalledWith(ENDPOINTS.ADMIN.REJECT_ORG('org-102'), {
        reason: 'Incomplete business registration documentation',
      });
      expect(res.status).toBe('rejected');
      expect(res.reviewReason).toBe('Incomplete business registration documentation');
    });

    it('4.3 Suspends active organization with audit reason', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        data: {
          success: true,
          message: 'Organization suspended',
          data: {
            organizationId: 'org-103',
            status: 'suspended',
          },
        },
      } as any);

      const res = await adminService.suspendOrganization(
        'org-103',
        'Safety compliance audit in progress'
      );

      expect(apiClient.post).toHaveBeenCalledWith(ENDPOINTS.ADMIN.SUSPEND_ORG('org-103'), {
        reason: 'Safety compliance audit in progress',
      });
      expect(res.status).toBe('suspended');
    });

    it('4.4 Does not show false success when approve request fails (HTTP 500)', async () => {
      vi.spyOn(apiClient, 'post').mockRejectedValueOnce(
        new Error('Database transaction aborted')
      );

      await expect(adminService.approveOrganization('org-err')).rejects.toThrow(
        'Database transaction aborted'
      );
    });
  });

  // ===========================================================================
  // 5. Audit Log Viewer & Dashboard Aggregation
  // ===========================================================================
  describe('5. Audit Logs & Real Dashboard Metrics Aggregation', () => {
    it('5.1 Fetches chronological administrative audit records', async () => {
      const mockAuditLogs: AuditLogEntry[] = [
        {
          id: 'aud-001',
          action: 'ORG_APPROVED',
          actorEmail: 'admin@logisphere.ai',
          actorRole: 'PLATFORM_ADMIN',
          targetOrgId: 'org-101',
          timestamp: '2026-10-18T10:15:00Z',
          metadata: { name: 'Blue Star Cargo' },
        },
      ];

      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
        data: {
          success: true,
          data: mockAuditLogs,
        },
      } as any);

      const logs = await adminService.getAuditLogs();
      expect(apiClient.get).toHaveBeenCalledWith(ENDPOINTS.ADMIN.AUDIT_LOGS);
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe('ORG_APPROVED');
    });

    it('5.2 Computes dashboard metrics truthfully from real backend list (no fabricated stats)', async () => {
      const mockOrgs: AdminOrgSummary[] = [
        { id: '1', name: 'Org 1', slug: 'org-1', formattedAddress: '', status: 'approved', registrationTimestamp: '' },
        { id: '2', name: 'Org 2', slug: 'org-2', formattedAddress: '', status: 'approved', registrationTimestamp: '' },
        { id: '3', name: 'Org 3', slug: 'org-3', formattedAddress: '', status: 'pending', registrationTimestamp: '' },
        { id: '4', name: 'Org 4', slug: 'org-4', formattedAddress: '', status: 'rejected', registrationTimestamp: '' },
        { id: '5', name: 'Org 5', slug: 'org-5', formattedAddress: '', status: 'suspended', registrationTimestamp: '' },
      ];

      vi.spyOn(adminService, 'getOrganizations').mockResolvedValueOnce(mockOrgs);
      vi.spyOn(adminService, 'getAuditLogs').mockResolvedValueOnce([]);

      const stats = await adminService.getDashboardStats();

      expect(stats.totalOrganizations).toBe(5);
      expect(stats.approvedOrganizations).toBe(2);
      expect(stats.pendingApplications).toBe(1);
      expect(stats.rejectedOrganizations).toBe(1);
      expect(stats.suspendedOrganizations).toBe(1);
    });
  });
});
