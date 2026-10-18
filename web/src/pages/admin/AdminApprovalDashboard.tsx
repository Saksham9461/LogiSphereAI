// ==============================================================================
// LogiSphere AI — Minimal Organization Approval Dashboard
// Platform Administrator Tenant Governance & Review Queue
// Strictly uses real backend responses (zero mock data, zero unnecessary UI)
// ==============================================================================

import { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  Eye,
  Check,
  X,
  MapPin,
  Mail,
  Phone,
  AlertTriangle,
  Loader2,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import type { AdminOrgSummary, AdminOrgDetails, AdminUser } from '../../types';

interface AdminApprovalDashboardProps {
  adminUser: AdminUser;
  onLogout: () => void;
}

export function AdminApprovalDashboard({ adminUser, onLogout }: AdminApprovalDashboardProps) {
  // Data State
  const [organizations, setOrganizations] = useState<AdminOrgSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals State
  const [detailsOrg, setDetailsOrg] = useState<AdminOrgDetails | AdminOrgSummary | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [orgToApprove, setOrgToApprove] = useState<AdminOrgSummary | null>(null);
  const [orgToReject, setOrgToReject] = useState<AdminOrgSummary | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [actionProcessing, setActionProcessing] = useState(false);

  // Fetch verified backend data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const orgs = await adminService.getOrganizations();
      setOrganizations(orgs);
    } catch (err: any) {
      setError(err?.message || 'Failed to load organization requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const orgs = await adminService.getOrganizations();
        if (active) {
          setOrganizations(orgs);
          setLoading(false);
        }
      } catch (err: any) {
        if (active) {
          setError(err?.message || 'Failed to load organization requests');
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  // Open Details Modal
  const handleOpenDetails = async (org: AdminOrgSummary) => {
    setDetailsOrg(org);
    setDetailsLoading(true);
    try {
      const fullDetails = await adminService.getOrganizationDetails(org.id);
      setDetailsOrg({
        ...org,
        ...fullDetails,
        manager: fullDetails?.manager || org.manager || null,
      });
    } catch {
      // Keep basic summary if detailed lookup is unavailable
    } finally {
      setDetailsLoading(false);
    }
  };

  // Execute Approval
  const handleConfirmApprove = async () => {
    if (!orgToApprove) return;
    setActionProcessing(true);
    setError(null);
    try {
      await adminService.approveOrganization(orgToApprove.id);
      const approvedOrgName = orgToApprove.name;
      setOrgToApprove(null);
      setActionSuccessMessage(`Successfully approved "${approvedOrgName}". Initial manager membership activated.`);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to approve organization');
    } finally {
      setActionProcessing(false);
    }
  };

  // Open Rejection Dialog
  const handleOpenReject = (org: AdminOrgSummary) => {
    setOrgToReject(org);
    setRejectionReason('');
    setRejectError(null);
  };

  // Execute Rejection
  const handleConfirmReject = async () => {
    if (!orgToReject) return;
    const cleanReason = rejectionReason.trim();
    if (!cleanReason) {
      setRejectError('Please provide a rejection reason before rejecting the application.');
      return;
    }

    setActionProcessing(true);
    setRejectError(null);
    try {
      await adminService.rejectOrganization(orgToReject.id, cleanReason);
      const rejectedOrgName = orgToReject.name;
      setOrgToReject(null);
      setActionSuccessMessage(`Application for "${rejectedOrgName}" has been rejected.`);
      await loadData();
    } catch (err: any) {
      setRejectError(err?.message || 'Failed to reject organization application');
    } finally {
      setActionProcessing(false);
    }
  };

  // Real organizations (strictly real onboarding applications, zero default org mock data)
  const realOrganizations = organizations.filter(
    org => org.id !== '00000000-0000-0000-0000-000000000001' && org.slug !== 'default-org'
  );

  const stats = {
    total: realOrganizations.length,
    pending: realOrganizations.filter(o => o.status === 'pending').length,
    approved: realOrganizations.filter(o => o.status === 'approved').length,
    rejected: realOrganizations.filter(o => o.status === 'rejected').length,
  };

  // Filter organizations by search and status tab
  const filteredOrgs = realOrganizations.filter(org => {
    const matchesStatus =
      statusFilter === 'all' ? true : org.status?.toLowerCase() === statusFilter;
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      org.name?.toLowerCase().includes(query) ||
      org.slug?.toLowerCase().includes(query) ||
      org.manager?.name?.toLowerCase().includes(query) ||
      org.manager?.email?.toLowerCase().includes(query) ||
      org.formattedAddress?.toLowerCase().includes(query);

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="admin-wrapper" style={{ minHeight: '100vh', background: '#0a0f1d', color: '#e2e8f0' }}>
      {/* 1. Header */}
      <header
        style={{
          background: '#0d1527',
          borderBottom: '1px solid #1e293b',
          padding: '1rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
            }}
          >
            <ShieldCheck size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc' }}>LogiSphere AI</span>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '4px',
                  background: '#1e3a8a',
                  color: '#93c5fd',
                }}
              >
                Platform Admin
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Organization Approval Portal</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0' }}>
              {adminUser.name || 'Administrator'}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{adminUser.email}</div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'transparent',
              border: '1px solid #334155',
              color: '#cbd5e1',
              padding: '0.45rem 0.85rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </header>

      {/* 2. Main Content */}
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        {/* Alerts */}
        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid #ef4444',
              color: '#fca5a5',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, fontSize: '0.875rem' }}>{error}</div>
            <button
              type="button"
              onClick={() => setError(null)}
              style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer' }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {actionSuccessMessage && (
          <div
            style={{
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid #22c55e',
              color: '#86efac',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, fontSize: '0.875rem' }}>{actionSuccessMessage}</div>
            <button
              type="button"
              onClick={() => setActionSuccessMessage(null)}
              style={{ background: 'none', border: 'none', color: '#86efac', cursor: 'pointer' }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* 3. Summary Cards (Genuine Backend Data) */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem',
          }}
        >
          {/* Card 1: Total Organizations */}
          <div
            style={{
              background: '#0d1527',
              border: '1px solid #1e293b',
              borderRadius: '10px',
              padding: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>
                Total Organizations
              </span>
              <Building2 size={18} color="#3b82f6" />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f8fafc' }}>
              {loading ? '...' : stats.total}
            </div>
          </div>

          {/* Card 2: Pending Approval */}
          <div
            style={{
              background: '#0d1527',
              border: '1px solid #1e293b',
              borderRadius: '10px',
              padding: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 600, textTransform: 'uppercase' }}>
                Pending Approval
              </span>
              <Clock size={18} color="#f59e0b" />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f59e0b' }}>
              {loading ? '...' : stats.pending}
            </div>
          </div>

          {/* Card 3: Approved Organizations */}
          <div
            style={{
              background: '#0d1527',
              border: '1px solid #1e293b',
              borderRadius: '10px',
              padding: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600, textTransform: 'uppercase' }}>
                Approved Organizations
              </span>
              <CheckCircle2 size={18} color="#10b981" />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#10b981' }}>
              {loading ? '...' : stats.approved}
            </div>
          </div>

          {/* Card 4: Rejected Organizations */}
          <div
            style={{
              background: '#0d1527',
              border: '1px solid #1e293b',
              borderRadius: '10px',
              padding: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: 600, textTransform: 'uppercase' }}>
                Rejected Organizations
              </span>
              <XCircle size={18} color="#ef4444" />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#ef4444' }}>
              {loading ? '...' : stats.rejected}
            </div>
          </div>
        </section>

        {/* 4. Filter and Search Bar */}
        <div
          style={{
            background: '#0d1527',
            border: '1px solid #1e293b',
            borderRadius: '10px',
            padding: '1rem',
            marginBottom: '1rem',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          {/* Status Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {(['all', 'pending', 'approved', 'rejected'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  background: statusFilter === tab ? '#2563eb' : '#1e293b',
                  color: statusFilter === tab ? '#ffffff' : '#94a3b8',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab === 'all' ? 'All Requests' : tab}
              </button>
            ))}
          </div>

          {/* Search Input & Refresh */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '1 1 300px', maxWidth: '450px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                placeholder="Search by company, slug, manager, email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  background: '#080d1a',
                  border: '1px solid #334155',
                  color: '#f8fafc',
                  padding: '0.5rem 1rem 0.5rem 2.25rem',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              />
              <Search
                size={15}
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#64748b',
                  pointerEvents: 'none',
                }}
              />
            </div>

            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              title="Refresh requests"
              style={{
                background: '#1e293b',
                border: '1px solid #334155',
                color: '#cbd5e1',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.8rem',
              }}
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* 5. Organization Requests Table */}
        <div
          style={{
            background: '#0d1527',
            border: '1px solid #1e293b',
            borderRadius: '10px',
            overflow: 'hidden',
          }}
        >
          {loading && organizations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3.5rem 0', color: '#94a3b8' }}>
              <Loader2 size={32} className="spin" style={{ margin: '0 auto 1rem auto', color: '#3b82f6' }} />
              <p style={{ margin: 0 }}>Loading organization applications...</p>
            </div>
          ) : filteredOrgs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3.5rem 0', color: '#94a3b8' }}>
              <Building2 size={36} style={{ margin: '0 auto 1rem auto', color: '#475569' }} />
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#e2e8f0', fontSize: '1rem' }}>No Organization Applications Found</h3>
              <p style={{ margin: 0, fontSize: '0.85rem' }}>
                {searchQuery || statusFilter !== 'all'
                  ? 'No records match the active filter criteria.'
                  : 'No organization applications are registered on the platform.'}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#0a101f', borderBottom: '1px solid #1e293b', color: '#94a3b8' }}>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>Organization</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>Slug / Ref</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>Address</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>Manager</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>Registered</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrgs.map(org => {
                    const isPending = org.status === 'pending';
                    const isApproved = org.status === 'approved';
                    const isRejected = org.status === 'rejected';

                    const statusBg = isPending
                      ? 'rgba(245, 158, 11, 0.15)'
                      : isApproved
                        ? 'rgba(16, 185, 129, 0.15)'
                        : isRejected
                          ? 'rgba(239, 68, 68, 0.15)'
                          : 'rgba(100, 116, 139, 0.15)';

                    const statusColor = isPending
                      ? '#f59e0b'
                      : isApproved
                        ? '#10b981'
                        : isRejected
                          ? '#ef4444'
                          : '#94a3b8';

                    const dateStr = org.registrationTimestamp
                      ? new Date(org.registrationTimestamp).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                      : '—';

                    return (
                      <tr
                        key={org.id}
                        style={{
                          borderBottom: '1px solid #1e293b',
                          transition: 'background 0.15s ease',
                        }}
                      >
                        {/* Company Name */}
                        <td style={{ padding: '0.9rem 1rem', fontWeight: 600, color: '#f8fafc' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Building2 size={16} color="#60a5fa" style={{ flexShrink: 0 }} />
                            <span>{org.name}</span>
                          </div>
                        </td>

                        {/* Slug */}
                        <td style={{ padding: '0.9rem 1rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                          {org.slug || '—'}
                        </td>

                        {/* Address */}
                        <td
                          style={{
                            padding: '0.9rem 1rem',
                            color: '#cbd5e1',
                            maxWidth: '220px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                          title={org.formattedAddress || ''}
                        >
                          {org.formattedAddress || '—'}
                        </td>

                        {/* Manager */}
                        <td style={{ padding: '0.9rem 1rem' }}>
                          <div style={{ color: '#f1f5f9', fontWeight: 500 }}>
                            {org.manager?.name || 'Pending Manager'}
                          </div>
                          <div style={{ color: '#64748b', fontSize: '0.75rem' }}>
                            {org.manager?.email || '—'}
                          </div>
                        </td>

                        {/* Registered Date */}
                        <td style={{ padding: '0.9rem 1rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                          {dateStr}
                        </td>

                        {/* Status Badge */}
                        <td style={{ padding: '0.9rem 1rem' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.2rem 0.6rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              background: statusBg,
                              color: statusColor,
                            }}
                          >
                            {org.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '0.9rem 1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                            {/* View Details button (always available) */}
                            <button
                              type="button"
                              onClick={() => handleOpenDetails(org)}
                              style={{
                                background: '#1e293b',
                                border: '1px solid #334155',
                                color: '#94a3b8',
                                padding: '0.35rem 0.65rem',
                                borderRadius: '5px',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                              }}
                            >
                              <Eye size={13} />
                              View Details
                            </button>

                            {/* Approve & Reject buttons (ONLY for pending applications) */}
                            {isPending && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setOrgToApprove(org)}
                                  style={{
                                    background: '#065f46',
                                    border: '1px solid #059669',
                                    color: '#d1fae5',
                                    padding: '0.35rem 0.65rem',
                                    borderRadius: '5px',
                                    cursor: 'pointer',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                  }}
                                >
                                  <Check size={13} />
                                  Approve
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleOpenReject(org)}
                                  style={{
                                    background: '#7f1d1d',
                                    border: '1px solid #dc2626',
                                    color: '#fee2e2',
                                    padding: '0.35rem 0.65rem',
                                    borderRadius: '5px',
                                    cursor: 'pointer',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                  }}
                                >
                                  <X size={13} />
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* =========================================================================
          MODALS
         ========================================================================= */}

      {/* 1. View Details Modal */}
      {detailsOrg && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#0d1527',
              border: '1px solid #1e293b',
              borderRadius: '10px',
              maxWidth: '560px',
              width: '100%',
              height: '580px',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid #1e293b',
                flexShrink: 0,
              }}
            >
              <div>
                <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.2rem', color: '#f8fafc' }}>{detailsOrg.name}</h3>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                  ID: {detailsOrg.id}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDetailsOrg(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {detailsLoading ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                <Loader2 size={24} className="spin" style={{ margin: '0 auto 0.5rem auto' }} />
                <p>Loading details...</p>
              </div>
            ) : (
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '1.25rem 1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                  fontSize: '0.85rem',
                }}
              >
                <div style={{ background: '#080d1a', padding: '0.85rem', borderRadius: '6px', border: '1px solid #1e293b' }}>
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.25rem' }}>ORGANIZATION REFERENCE</div>
                  <div style={{ color: '#e2e8f0' }}>Slug: <strong>{detailsOrg.slug || '—'}</strong></div>
                  <div style={{ color: '#e2e8f0', marginTop: '0.2rem' }}>Status: <strong>{detailsOrg.status}</strong></div>
                </div>

                <div style={{ background: '#080d1a', padding: '0.85rem', borderRadius: '6px', border: '1px solid #1e293b' }}>
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.25rem' }}>LOCATION & ADDRESS</div>
                  <div style={{ color: '#e2e8f0', display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                    <MapPin size={15} color="#3b82f6" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <span>{detailsOrg.formattedAddress || 'No address provided'}</span>
                  </div>
                  {detailsOrg.latitude != null && detailsOrg.longitude != null && (
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.3rem', marginLeft: '1.35rem' }}>
                      Coordinates: {detailsOrg.latitude}, {detailsOrg.longitude}
                    </div>
                  )}
                </div>

                {/* Manager Details Card */}
                {(() => {
                  const manager =
                    detailsOrg.manager ||
                    (detailsOrg.members?.find((m: any) => m.role === 'ROLE_MANAGER')
                      ? {
                        name: detailsOrg.members.find((m: any) => m.role === 'ROLE_MANAGER')?.name,
                        email: detailsOrg.members.find((m: any) => m.role === 'ROLE_MANAGER')?.email,
                        phoneNo: (detailsOrg.members.find((m: any) => m.role === 'ROLE_MANAGER') as any)?.phoneNo,
                        role: 'ROLE_MANAGER',
                        status: detailsOrg.members.find((m: any) => m.role === 'ROLE_MANAGER')?.status,
                        membershipStatus: detailsOrg.members.find((m: any) => m.role === 'ROLE_MANAGER')?.status,
                      }
                      : null);

                  const hasManager = Boolean(manager && (manager.name || manager.email));

                  return (
                    <div style={{ background: '#080d1a', padding: '0.85rem', borderRadius: '6px', border: '1px solid #1e293b' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600 }}>PRIMARY FLEET MANAGER ACCOUNT</span>
                        {hasManager && (
                          <span
                            style={{
                              fontSize: '0.7rem',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '4px',
                              background:
                                manager?.membershipStatus === 'active' || manager?.status === 'ACTIVE'
                                  ? 'rgba(16, 185, 129, 0.15)'
                                  : 'rgba(245, 158, 11, 0.15)',
                              color:
                                manager?.membershipStatus === 'active' || manager?.status === 'ACTIVE'
                                  ? '#10b981'
                                  : '#f59e0b',
                              fontWeight: 600,
                            }}
                          >
                            {manager?.membershipStatus === 'active' || manager?.status === 'ACTIVE'
                              ? 'Active Membership'
                              : 'Pending Approval'}
                          </span>
                        )}
                      </div>

                      {hasManager ? (
                        <>
                          <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '0.95rem' }}>
                            {manager?.name || 'Unnamed Manager'}
                          </div>
                          <div style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.25rem' }}>
                            <Mail size={13} color="#94a3b8" />
                            <span>{manager?.email || '—'}</span>
                          </div>
                          {manager?.phoneNo && (
                            <div style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.25rem' }}>
                              <Phone size={13} color="#94a3b8" />
                              <span>{manager.phoneNo}</span>
                            </div>
                          )}
                          <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.35rem' }}>
                            Designated Role: <strong style={{ color: '#cbd5e1' }}>Fleet Manager ({manager?.role || 'ROLE_MANAGER'})</strong>
                          </div>
                        </>
                      ) : (
                        <div style={{ color: '#94a3b8', fontSize: '0.8rem', fontStyle: 'italic', padding: '0.25rem 0' }}>
                          No manager account associated with this organization application.
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Team Members Roster */}
                {detailsOrg.members && detailsOrg.members.length > 0 && (
                  <div style={{ background: '#080d1a', padding: '0.85rem', borderRadius: '6px', border: '1px solid #1e293b' }}>
                    <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.4rem', fontWeight: 600 }}>
                      ORGANIZATION ROSTER ({detailsOrg.members.length} member{detailsOrg.members.length > 1 ? 's' : ''})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {detailsOrg.members.map(member => (
                        <div
                          key={member.membershipId || member.userId}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: '#0d1527',
                            padding: '0.35rem 0.6rem',
                            borderRadius: '4px',
                            fontSize: '0.8rem',
                          }}
                        >
                          <div>
                            <span style={{ color: '#f8fafc', fontWeight: 500 }}>{member.name}</span>
                            <span style={{ color: '#64748b', marginLeft: '0.5rem', fontSize: '0.75rem' }}>{member.email}</span>
                          </div>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '3px',
                              background: '#1e293b',
                              color: member.role === 'ROLE_MANAGER' ? '#60a5fa' : '#94a3b8',
                              fontWeight: 600,
                            }}
                          >
                            {member.role === 'ROLE_MANAGER' ? 'Manager' : member.role}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {detailsOrg.reviewReason && (
                  <div style={{ background: '#080d1a', padding: '0.85rem', borderRadius: '6px', border: '1px solid #1e293b' }}>
                    <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.25rem' }}>REVIEW NOTES</div>
                    <div style={{ color: '#fca5a5' }}>{detailsOrg.reviewReason}</div>
                    {detailsOrg.reviewedAt && (
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                        Reviewed: {new Date(detailsOrg.reviewedAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div
              style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid #1e293b',
                background: '#0d1527',
                textAlign: 'right',
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                onClick={() => setDetailsOrg(null)}
                style={{
                  background: '#1e293b',
                  border: '1px solid #334155',
                  color: '#e2e8f0',
                  padding: '0.5rem 1.25rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Approve Confirmation Modal */}
      {orgToApprove && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#0d1527',
              border: '1px solid #1e293b',
              borderRadius: '10px',
              maxWidth: '460px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#10b981',
                }}
              >
                <CheckCircle2 size={22} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#f8fafc' }}>Approve Organization?</h3>
            </div>

            <p style={{ color: '#cbd5e1', fontSize: '0.875rem', lineHeight: 1.5, margin: '0 0 1.25rem 0' }}>
              Are you sure you want to approve <strong>{orgToApprove.name}</strong>?
              This will activate the company account and authorize its primary manager to access LogiSphere AI.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setOrgToApprove(null)}
                disabled={actionProcessing}
                style={{
                  background: '#1e293b',
                  border: '1px solid #334155',
                  color: '#cbd5e1',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmApprove}
                disabled={actionProcessing}
                style={{
                  background: '#059669',
                  border: 'none',
                  color: '#ffffff',
                  padding: '0.5rem 1.25rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                {actionProcessing ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
                Confirm Approval
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Reject Application Modal (Requires Non-Empty Reason) */}
      {orgToReject && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#0d1527',
              border: '1px solid #1e293b',
              borderRadius: '10px',
              maxWidth: '480px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ef4444',
                }}
              >
                <XCircle size={22} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#f8fafc' }}>Reject Organization Application</h3>
            </div>

            <p style={{ color: '#cbd5e1', fontSize: '0.875rem', margin: '0 0 1rem 0' }}>
              You are rejecting the registration application for <strong>{orgToReject.name}</strong>.
              A rejection reason is required:
            </p>

            {rejectError && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid #ef4444',
                  color: '#fca5a5',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  marginBottom: '1rem',
                  fontSize: '0.8rem',
                }}
              >
                {rejectError}
              </div>
            )}

            <div style={{ marginBottom: '1.25rem' }}>
              <label
                htmlFor="reject-reason"
                style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem' }}
              >
                Rejection Reason (Required)
              </label>
              <textarea
                id="reject-reason"
                rows={3}
                placeholder="e.g., Incomplete operational license documentation or invalid company address"
                value={rejectionReason}
                onChange={e => {
                  setRejectionReason(e.target.value);
                  if (rejectError) setRejectError(null);
                }}
                disabled={actionProcessing}
                style={{
                  width: '100%',
                  background: '#080d1a',
                  border: '1px solid #334155',
                  color: '#f8fafc',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  outline: 'none',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setOrgToReject(null)}
                disabled={actionProcessing}
                style={{
                  background: '#1e293b',
                  border: '1px solid #334155',
                  color: '#cbd5e1',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={actionProcessing}
                style={{
                  background: '#dc2626',
                  border: 'none',
                  color: '#ffffff',
                  padding: '0.5rem 1.25rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                {actionProcessing ? <Loader2 size={16} className="spin" /> : <X size={16} />}
                Reject Application
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
