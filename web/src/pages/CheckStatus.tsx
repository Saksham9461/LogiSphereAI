import React, { useState } from 'react';
import {
  Search,
  Mail,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building2,
  ArrowRight,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { checkRegistrationStatusByEmail } from '../services/organizationService';
import type { OrgStatusByEmailResult } from '../types';

interface CheckStatusProps {
  onNavigate: (route: string) => void;
}

export const CheckStatus: React.FC<CheckStatusProps> = ({ onNavigate }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchResult, setSearchResult] = useState<OrgStatusByEmailResult | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError('Please enter your manager email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    setError(null);
    setIsLoading(true);
    setHasSearched(false);
    setSearchResult(null);

    try {
      const response = await checkRegistrationStatusByEmail(cleanEmail);
      setHasSearched(true);
      if (response && response.found && response.data) {
        setSearchResult(response.data);
      } else {
        setSearchResult(null);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to check organization status. Please try again.');
      setHasSearched(true);
      setSearchResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStatusDetails = (result: OrgStatusByEmailResult) => {
    const isApproved = result.status === 'approved';
    const isPending = result.status === 'pending';
    const isRejected = result.status === 'rejected';
    const isSuspended = result.status === 'suspended';

    const formattedDate = result.registrationTimestamp
      ? new Date(result.registrationTimestamp).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'Date on file';

    return (
      <div
        className="saas-card"
        style={{
          marginTop: '2rem',
          padding: '2.25rem',
          border: isApproved
            ? '1px solid rgba(16, 185, 129, 0.4)'
            : isRejected
            ? '1px solid rgba(239, 68, 68, 0.4)'
            : '1px solid rgba(59, 130, 246, 0.3)',
          boxShadow: 'var(--saas-shadow-card)',
        }}
      >
        {/* Status Header Badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Building2 size={22} color="#D97706" />
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#111827', margin: 0 }}>
              {result.organizationName}
            </h3>
          </div>

          <div>
            {isApproved && (
              <span className="saas-badge saas-badge-success" style={{ fontSize: '0.825rem', padding: '0.4rem 0.9rem' }}>
                <CheckCircle2 size={14} />
                Approved & Activated
              </span>
            )}
            {isPending && (
              <span className="saas-badge saas-badge-warning" style={{ fontSize: '0.825rem', padding: '0.4rem 0.9rem' }}>
                <Clock size={14} />
                Pending Administrator Review
              </span>
            )}
            {isRejected && (
              <span className="saas-badge saas-badge-danger" style={{ fontSize: '0.825rem', padding: '0.4rem 0.9rem' }}>
                <XCircle size={14} />
                Application Rejected
              </span>
            )}
            {isSuspended && (
              <span className="saas-badge saas-badge-danger" style={{ fontSize: '0.825rem', padding: '0.4rem 0.9rem' }}>
                <AlertTriangle size={14} />
                Account Suspended
              </span>
            )}
          </div>
        </div>

        {/* Data Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem', padding: '1.25rem', background: '#F9FAFB', borderRadius: 10, border: '1px solid #E5E7EB' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>Manager Account</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#111827', marginTop: 4 }}>{result.maskedEmail}</div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>Submitted Timestamp</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#111827', marginTop: 4 }}>{formattedDate}</div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>Current Verification</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: isApproved ? '#047857' : isPending ? '#B45309' : '#BE123C', marginTop: 4 }}>
              {isApproved ? 'Full Operational Access' : isPending ? 'Stage 2/2: Platform Audit' : isRejected ? 'Declined' : 'Suspended'}
            </div>
          </div>
        </div>

        {/* Rejection reason if applicable */}
        {isRejected && result.reviewReason && (
          <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#B91C1C', marginBottom: 4 }}>Platform Administrator Review Note:</div>
            <div style={{ fontSize: '0.9rem', color: '#7F1D1D' }}>{result.reviewReason}</div>
          </div>
        )}

        {/* Next Steps Guidance */}
        <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1.5rem' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827', marginBottom: '0.5rem' }}>
            Recommended Next Steps:
          </h4>

          {isPending && (
            <p style={{ color: '#4B5563', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
              Your application is safely queued for platform administrator verification. This review ensures compliance, geofence validity, and multi-tenant isolation. You do not need to resubmit. Once approved, you can immediately log into the LogiSphere mobile application with your manager credentials.
            </p>
          )}

          {isApproved && (
            <div>
              <p style={{ color: '#4B5563', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1rem' }}>
                Your organization is fully approved! You may now sign in using the mobile application with your registered manager credentials, or explore the static command center preview below.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="saas-btn saas-btn-primary saas-btn-sm"
                  onClick={() => onNavigate('signin')}
                >
                  Go to Sign In
                  <ArrowRight size={14} />
                </button>
                <button
                  type="button"
                  className="saas-btn saas-btn-outline saas-btn-sm"
                  onClick={() => onNavigate('demo-dashboard')}
                >
                  Explore Console Demo
                </button>
              </div>
            </div>
          )}

          {isRejected && (
            <div>
              <p style={{ color: '#4B5563', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1rem' }}>
                Your application could not be approved based on the review criteria above. You may register again with updated credentials or contact our support team.
              </p>
              <button
                type="button"
                className="saas-btn saas-btn-secondary saas-btn-sm"
                onClick={() => onNavigate('signup')}
              >
                Submit New Application
              </button>
            </div>
          )}

          {isSuspended && (
            <p style={{ color: '#4B5563', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
              This organization account has been temporarily suspended by platform administration. Please contact your account representative or support@logisphere.ai to resolve compliance holds.
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="saas-main-content">
      <section className="saas-section" style={{ paddingBottom: '2.5rem' }}>
        <div className="saas-container">
          <div className="saas-section-header">
            <span className="saas-badge">
              <ShieldCheck size={13} />
              Application Lookup
            </span>
            <h1 className="saas-section-title" style={{ fontSize: '3rem' }}>
              Check Organization Status
            </h1>
            <p className="saas-section-subtitle">
              Verify your company's onboarding review and approval status using the manager email address provided during registration.
            </p>
          </div>
        </div>
      </section>

      <section className="saas-container-narrow" style={{ marginBottom: '5rem' }}>
        {/* Search Card */}
        <div className="saas-form-card">
          <form onSubmit={handleSearch} noValidate>
            <div className="saas-input-group">
              <label className="saas-label" htmlFor="status-email">
                Registered Manager Email Address
              </label>
              <div className="saas-input-wrap">
                <Mail className="saas-input-icon" size={18} />
                <input
                  id="status-email"
                  type="email"
                  className={`saas-input ${error ? 'saas-input-error' : ''}`}
                  placeholder="manager@yourcompany.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  autoComplete="email"
                  disabled={isLoading}
                  required
                />
              </div>
              {error && <div className="saas-field-error">{error}</div>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button
                type="submit"
                className="saas-btn saas-btn-primary"
                disabled={isLoading}
                style={{ minWidth: 160 }}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search size={16} />
                    Check Status
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Loading Indicator */}
        {isLoading && (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: '#6B7280' }}>
            <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 1rem', color: '#F59E0B' }} />
            <div>Querying authoritative organization records...</div>
          </div>
        )}

        {/* Found Result Card */}
        {!isLoading && hasSearched && searchResult && renderStatusDetails(searchResult)}

        {/* No Result State */}
        {!isLoading && hasSearched && !searchResult && !error && (
          <div className="saas-card" style={{ marginTop: '2rem', textAlign: 'center', padding: '3rem 2rem' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#FEF3C7', color: '#B45309', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
              <Building2 size={28} />
            </div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#111827', marginBottom: '0.5rem' }}>
              No Application Found
            </h3>
            <p style={{ color: '#4B5563', fontSize: '0.925rem', maxWidth: 480, margin: '0 auto 1.5rem', lineHeight: 1.6 }}>
              No registered organization was found matching <strong>{email}</strong>. Please ensure you entered the exact manager email submitted during registration, or register your fleet below.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="saas-btn saas-btn-primary saas-btn-sm"
                onClick={() => onNavigate('signup')}
              >
                Register Your Organization
                <ArrowRight size={14} />
              </button>
              <button
                type="button"
                className="saas-btn saas-btn-secondary saas-btn-sm"
                onClick={() => {
                  setEmail('');
                  setHasSearched(false);
                }}
              >
                Try Another Email
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
