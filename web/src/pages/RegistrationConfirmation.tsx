import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  Building,
  Mail,
  Hash,
  ShieldCheck,
  PlusCircle,
  Info,
  CheckCircle,
  XCircle,
  RotateCw,
} from 'lucide-react';
import { getOrganizationStatus } from '../services/organizationService';
import type { OrgRegistrationResponseData, OrgApprovalStatus } from '../types';

interface RegistrationConfirmationProps {
  data: OrgRegistrationResponseData;
  onRegisterAnother: () => void;
}

export const RegistrationConfirmation: React.FC<RegistrationConfirmationProps> = ({
  data,
  onRegisterAnother,
}) => {
  const orgName = data.organization?.name || data.name || 'Your Organization';
  const orgSlug = data.organization?.slug || data.slug || data.organizationId || '';
  const orgId = data.organization?.id || data.organizationId || '';
  const managerEmail = data.managerEmail || '';
  const timestamp = data.organization?.registrationTimestamp || data.registrationTimestamp;

  const [currentStatus, setCurrentStatus] = useState<OrgApprovalStatus>(() => {
    return data.organization?.status || data.status || 'pending';
  });
  const [reviewReason, setReviewReason] = useState<string | undefined>(undefined);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const checkLiveStatus = useCallback(async () => {
    const identifier = orgSlug || orgId;
    if (!identifier) return;

    try {
      setIsRefreshing(true);
      const res = await getOrganizationStatus(identifier);
      if (res && res.data && res.data.status) {
        setCurrentStatus(res.data.status);
        if (res.data.reviewReason) {
          setReviewReason(res.data.reviewReason);
        }
        // Update stored session data if changed
        try {
          const stored = sessionStorage.getItem('last_registered_org');
          if (stored) {
            const parsed = JSON.parse(stored);
            parsed.status = res.data.status;
            if (parsed.organization) parsed.organization.status = res.data.status;
            sessionStorage.setItem('last_registered_org', JSON.stringify(parsed));
          }
        } catch {
          // ignore session write error
        }
      }
    } catch {
      // Backend may be offline or identifier not yet synced; keep current state
    } finally {
      setIsRefreshing(false);
    }
  }, [orgSlug, orgId]);

  // Check live status on mount
  useEffect(() => {
    checkLiveStatus();
  }, [checkLiveStatus]);

  const formattedDate = timestamp
    ? new Date(timestamp).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Recently submitted';

  const isApproved = currentStatus === 'approved';
  const isRejected = currentStatus === 'rejected';

  return (
    <div className="confirm-container">
      <div className="confirm-card">
        {/* Status Badge Icon */}
        <div
          className="confirm-icon-wrapper"
          style={{
            background: isApproved ? 'rgba(16, 185, 129, 0.12)' : isRejected ? 'rgba(239, 68, 68, 0.12)' : undefined,
            color: isApproved ? '#10b981' : isRejected ? '#ef4444' : undefined,
          }}
        >
          {isApproved ? <CheckCircle size={36} /> : isRejected ? <XCircle size={36} /> : <Clock size={36} />}
        </div>

        <h1 className="confirm-title">
          {isApproved
            ? 'Organization Approved!'
            : isRejected
            ? 'Registration Not Approved'
            : 'Registration Submitted Successfully'}
        </h1>

        <p className="confirm-lead">
          {isApproved ? (
            <>
              Great news! Your organization <strong>{orgName}</strong> has been approved by a platform administrator.
              Your manager credentials are now active.
            </>
          ) : isRejected ? (
            <>
              Your registration application for <strong>{orgName}</strong> was reviewed and could not be approved at this time.
            </>
          ) : (
            <>
              Thank you for registering <strong>{orgName}</strong>.
              Your application has been received and is currently in <strong>pending admin approval status</strong>.
              Operational access to the mobile application and fleet management platform will be available after an administrator verifies and approves your organization.
            </>
          )}
        </p>

        {/* Application Reference & Details */}
        <div className="confirm-details-box">
          <div className="confirm-detail-row">
            <span className="confirm-detail-label">
              <Building size={14} style={{ display: 'inline', marginRight: 6 }} />
              Organization Name
            </span>
            <span className="confirm-detail-val">{orgName}</span>
          </div>

          {orgSlug && (
            <div className="confirm-detail-row">
              <span className="confirm-detail-label">
                <Hash size={14} style={{ display: 'inline', marginRight: 6 }} />
                Application Reference / Slug
              </span>
              <span className="confirm-detail-val" style={{ fontFamily: 'monospace' }}>
                {orgSlug}
              </span>
            </div>
          )}

          {managerEmail && (
            <div className="confirm-detail-row">
              <span className="confirm-detail-label">
                <Mail size={14} style={{ display: 'inline', marginRight: 6 }} />
                Manager Account
              </span>
              <span className="confirm-detail-val">{managerEmail}</span>
            </div>
          )}

          <div className="confirm-detail-row">
            <span className="confirm-detail-label">
              <Clock size={14} style={{ display: 'inline', marginRight: 6 }} />
              Submission Date
            </span>
            <span className="confirm-detail-val">{formattedDate}</span>
          </div>

          <div className="confirm-detail-row">
            <span className="confirm-detail-label">
              <ShieldCheck size={14} style={{ display: 'inline', marginRight: 6 }} />
              Status
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className={`confirm-status-pill ${currentStatus}`}>
                <span
                  className="status-dot"
                  style={{
                    background: isApproved ? '#10b981' : isRejected ? '#ef4444' : '#B45309',
                  }}
                />
                {isApproved
                  ? 'Approved'
                  : isRejected
                  ? 'Rejected'
                  : 'Pending Admin Approval'}
              </span>
              <button
                type="button"
                onClick={checkLiveStatus}
                disabled={isRefreshing}
                title="Check latest status from server"
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: isRefreshing ? 'wait' : 'pointer',
                  padding: '2px 4px',
                  color: '#64748b',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                <RotateCw
                  size={14}
                  style={{
                    animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
                  }}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Status Explanation Notice */}
        {isApproved ? (
          <div
            className="reg-notice-box"
            style={{
              textAlign: 'left',
              marginBottom: '1.75rem',
              borderColor: 'rgba(16, 185, 129, 0.4)',
              background: 'rgba(16, 185, 129, 0.08)',
            }}
          >
            <CheckCircle size={18} style={{ color: '#10b981', flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong style={{ color: '#047857' }}>Ready for Operations:</strong> Your manager credentials (
              {managerEmail}) are now active. You can log into the LogiSphere AI mobile application to configure
              your fleet, invite drivers, and start monitoring trips.
            </div>
          </div>
        ) : isRejected ? (
          <div
            className="reg-notice-box"
            style={{
              textAlign: 'left',
              marginBottom: '1.75rem',
              borderColor: 'rgba(239, 68, 68, 0.4)',
              background: 'rgba(239, 68, 68, 0.08)',
            }}
          >
            <XCircle size={18} style={{ color: '#ef4444', flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong style={{ color: '#b91c1c' }}>Application Rejected:</strong>{' '}
              {reviewReason || 'The application was not approved by the administrator.'} Please contact platform
              support if you believe this was an error.
            </div>
          </div>
        ) : (
          <div className="reg-notice-box" style={{ textAlign: 'left', marginBottom: '1.75rem' }}>
            <Info size={18} style={{ color: 'var(--color-amber)', flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong>Next Steps:</strong> An authorized platform administrator will review your organization's
              operational information. Once approved, your manager credentials will be activated immediately,
              enabling fleet operations and driver invitations.
            </div>
          </div>
        )}

        {/* Action Button */}
        <div style={{ textAlign: 'center' }}>
          <button
            type="button"
            className="reg-submit-btn"
            onClick={onRegisterAnother}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              margin: '0 auto',
            }}
          >
            <PlusCircle size={18} />
            Register Another Organization
          </button>
        </div>
      </div>
    </div>
  );
};
