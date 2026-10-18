// ==============================================================================
// LogiSphere AI — Platform Admin Service
// Centralized API integration for platform administrator authentication &
// organization approval governance
// ==============================================================================

import apiClient from './apiClient';
import { ENDPOINTS } from './endpoints';
import type {
  AdminUser,
  AdminOrgSummary,
  AdminOrgDetails,
  AdminDashboardStats,
  ApiResponse,
} from '../types';

export const adminService = {
  /**
   * Authenticates administrator using dedicated backend fixed-credential / platform_admins login.
   * Enforces server-side verification before granting session.
   */
  async loginAdmin(identifier: string, password: string): Promise<AdminUser> {
    const trimmed = identifier.trim();
    if (!trimmed || !password) {
      throw new Error('Username and password are required');
    }

    try {
      // 1. Authenticate with dedicated server-side administrator login endpoint
      const loginRes = await apiClient.post<ApiResponse<any>>(ENDPOINTS.ADMIN.LOGIN, {
        username: trimmed,
        password,
      });

      const token =
        loginRes.data?.data?.token ||
        (loginRes.data as any)?.token ||
        loginRes.data?.serviceResult?.token;

      const adminUser =
        loginRes.data?.data?.admin ||
        (loginRes.data as any)?.admin ||
        loginRes.data?.data;

      if (!token) {
        throw new Error('Authentication succeeded but no authorization token was returned');
      }

      // 2. Save verified admin session token in local storage
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('adminToken', token);
      }

      return {
        id: adminUser?.id || 'platform-admin',
        userId: adminUser?.userId || adminUser?.id || 'platform-admin',
        name: adminUser?.name || 'Platform Administrator',
        email: adminUser?.email || (trimmed.includes('@') ? trimmed : 'admin@logisphere.ai'),
        isPlatformAdmin: true,
      };
    } catch (err: any) {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('adminToken');
      }

      const status = err?.response?.status;
      const msg = err?.response?.data?.message || err?.message || '';

      if (status === 429) {
        throw new Error(msg || 'Too many failed login attempts. Please wait before trying again.');
      }
      if (status === 401 || status === 403) {
        throw new Error('Invalid administrator credentials. Access restricted to platform administrators.');
      }
      throw new Error(msg || 'Failed to authenticate platform administrator');
    }
  },

  /**
   * Clears active platform administrator session token.
   */
  logoutAdmin(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('adminToken');
    }
  },

  /**
   * Verifies an active platform administrator session using the stored token.
   * Returns null if unauthenticated, expired, or lacking admin rights.
   */
  async verifyAdminSession(): Promise<AdminUser | null> {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('adminToken') : null;
    if (!token) return null;

    try {
      const res = await apiClient.get<ApiResponse<AdminUser>>(ENDPOINTS.ADMIN.ME, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return res.data?.data || null;
    } catch {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('adminToken');
      }
      return null;
    }
  },


  /**
   * Retrieves pending organization applications for the review queue.
   */
  async getPendingOrganizations(): Promise<AdminOrgSummary[]> {
    const res = await apiClient.get<ApiResponse<AdminOrgSummary[]>>(ENDPOINTS.ADMIN.PENDING_ORGS);
    const orgs = res.data?.data || [];
    return orgs.filter(o => o.id !== '00000000-0000-0000-0000-000000000001' && o.slug !== 'default-org');
  },

  /**
   * Lists all organizations with optional status filtering ('pending', 'approved', 'rejected', 'suspended').
   */
  async getOrganizations(status?: string): Promise<AdminOrgSummary[]> {
    const params = status && status !== 'all' ? { status: status.toLowerCase() } : undefined;
    const res = await apiClient.get<ApiResponse<AdminOrgSummary[]>>(ENDPOINTS.ADMIN.ORGS, { params });
    const orgs = res.data?.data || [];
    return orgs.filter(o => o.id !== '00000000-0000-0000-0000-000000000001' && o.slug !== 'default-org');
  },

  /**
   * Retrieves comprehensive details of a single organization including member roster.
   */
  async getOrganizationDetails(id: string): Promise<AdminOrgDetails> {
    const cleanId = String(id || '').trim();
    if (!cleanId) throw new Error('Organization ID is required');

    const res = await apiClient.get<ApiResponse<AdminOrgDetails>>(ENDPOINTS.ADMIN.ORG_DETAILS(cleanId));
    if (!res.data?.data) throw new Error('Organization details not found');
    return res.data.data;
  },

  /**
   * Approves a pending organization and activates initial manager membership.
   */
  async approveOrganization(id: string): Promise<{ organizationId: string; status: string; activatedMembershipsCount: number }> {
    const cleanId = String(id || '').trim();
    if (!cleanId) throw new Error('Organization ID is required');

    const res = await apiClient.post<ApiResponse<any>>(ENDPOINTS.ADMIN.APPROVE_ORG(cleanId));
    return res.data?.data;
  },

  /**
   * Rejects an organization registration with reviewer reason (required non-empty).
   */
  async rejectOrganization(id: string, reason: string): Promise<{ organizationId: string; status: string; reviewReason: string }> {
    const cleanId = String(id || '').trim();
    const cleanReason = String(reason || '').trim();
    if (!cleanId) throw new Error('Organization ID is required');
    if (!cleanReason) throw new Error('Rejection reason is required');

    const res = await apiClient.post<ApiResponse<any>>(
      ENDPOINTS.ADMIN.REJECT_ORG(cleanId),
      { reason: cleanReason }
    );
    return res.data?.data;
  },

  /**
   * Suspends an active organization.
   */
  async suspendOrganization(id: string, reason?: string): Promise<{ organizationId: string; status: string }> {
    const cleanId = String(id || '').trim();
    if (!cleanId) throw new Error('Organization ID is required');

    const res = await apiClient.post<ApiResponse<any>>(
      ENDPOINTS.ADMIN.SUSPEND_ORG(cleanId),
      { reason: reason?.trim() || 'Suspended by platform administrator' }
    );
    return res.data?.data;
  },

  /**
   * Retrieves platform governance audit logs.
   */
  async getAuditLogs(): Promise<any[]> {
    const res = await apiClient.get<ApiResponse<any[]>>(ENDPOINTS.ADMIN.AUDIT_LOGS);
    return res.data?.data || [];
  },

  /**
   * Aggregates real platform statistics from verified backend responses.
   * Computes counts strictly from real database records (never fabricated).
   */
  async getSummaryCounts(): Promise<{
    totalOrganizations: number;
    pendingApproval: number;
    approvedOrganizations: number;
    rejectedOrganizations: number;
    suspendedOrganizations: number;
  }> {
    try {
      const res = await apiClient.get<ApiResponse<any>>(ENDPOINTS.ADMIN.STATS);
      if (res.data?.data) {
        return res.data.data;
      }
    } catch {
      // Fallback: derive dynamically from real organizations array
    }

    const orgs = await this.getOrganizations();
    return {
      totalOrganizations: orgs.length,
      pendingApproval: orgs.filter(o => o.status === 'pending').length,
      approvedOrganizations: orgs.filter(o => o.status === 'approved').length,
      rejectedOrganizations: orgs.filter(o => o.status === 'rejected').length,
      suspendedOrganizations: orgs.filter(o => o.status === 'suspended').length,
    };
  },

  /**
   * Backward-compatible dashboard stats aggregator.
   */
  async getDashboardStats(): Promise<AdminDashboardStats> {
    const counts = await this.getSummaryCounts();
    return {
      totalOrganizations: counts.totalOrganizations,
      pendingApplications: counts.pendingApproval,
      approvedOrganizations: counts.approvedOrganizations,
      rejectedOrganizations: counts.rejectedOrganizations,
      suspendedOrganizations: counts.suspendedOrganizations,
      recentActivity: [],
    };
  },
};

