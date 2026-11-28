import React from 'react';
import {
  ShieldCheck,
  Database,
  Users,
  MapPin,
  Server,
  FileCheck,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  EyeOff,
} from 'lucide-react';

interface SecurityProps {
  onNavigate: (route: string) => void;
}

export const Security: React.FC<SecurityProps> = ({ onNavigate }) => {
  return (
    <div className="saas-main-content">
      {/* Header */}
      <section className="saas-section" style={{ paddingBottom: '2.5rem' }}>
        <div className="saas-container">
          <div className="saas-section-header">
            <span className="saas-badge">
              <ShieldCheck size={13} />
              Enterprise Security & Compliance
            </span>
            <h1 className="saas-section-title" style={{ fontSize: '3rem' }}>
              Built for Commercial Mission-Critical Reliability
            </h1>
            <p className="saas-section-subtitle">
              LogiSphere AI protects your fleet telemetry, trip dispatches, and corporate identity through
              cryptographic verification, multi-tenant database isolation, and role-based access control.
            </p>
          </div>
        </div>
      </section>

      {/* Verified Security Architecture Grid */}
      <section className="saas-section" style={{ paddingTop: '0', paddingBottom: '3rem' }}>
        <div className="saas-container">
          <div className="saas-grid-3">
            {/* 1. Multi-Tenant Isolation */}
            <div className="saas-card">
              <div className="saas-card-icon teal">
                <Database size={22} />
              </div>
              <h3 className="saas-card-title">Multi-Tenant Database Isolation</h3>
              <p className="saas-card-desc">
                Every relational table, query, and WebSocket stream enforces strict organization-level segregation.
                Vehicles, driver rosters, shift records, and financial entries are cryptographically and logically
                partitioned by tenancy identifier, preventing accidental data bleed across organizations.
              </p>
            </div>

            {/* 2. Cryptographic JWT Authentication */}
            <div className="saas-card">
              <div className="saas-card-icon">
                <KeyRound size={22} />
              </div>
              <h3 className="saas-card-title">Cryptographic Session Verification</h3>
              <p className="saas-card-desc">
                API requests are verified using cryptographically signed JSON Web Tokens (JWT). Sessions enforce
                strict timestamp expiration windows, automatic client invalidation upon timeout, and secure
                header-based bearer authentication without plain-text credential persistence.
              </p>
            </div>

            {/* 3. Granular RBAC */}
            <div className="saas-card">
              <div className="saas-card-icon emerald">
                <Users size={22} />
              </div>
              <h3 className="saas-card-title">Role-Based Access Control (RBAC)</h3>
              <p className="saas-card-desc">
                Access is bounded by least-privilege principles across 5 operational tiers: Fleet Manager,
                Dispatcher, Safety Officer, Financial Analyst, and Driver. Sensitive configuration endpoints
                are protected and inaccessible to lower-tier user roles.
              </p>
            </div>

            {/* 4. Geofence Telemetry Verification */}
            <div className="saas-card">
              <div className="saas-card-icon">
                <MapPin size={22} />
              </div>
              <h3 className="saas-card-title">Geofence Coordinate Verification</h3>
              <p className="saas-card-desc">
                Attendance shifts and terminal entries are mathematically verified using spherical Haversine
                geodesic calculations. Timestamp validation and boundary radius rules prevent fraudulent shift
                logging or coordinate spoofing.
              </p>
            </div>

            {/* 5. Hardened Transport Layer */}
            <div className="saas-card">
              <div className="saas-card-icon teal">
                <Server size={22} />
              </div>
              <h3 className="saas-card-title">Transport Security & Headers</h3>
              <p className="saas-card-desc">
                All production traffic flows over TLS encryption. Backend services implement Helmet security
                headers, strict Cross-Origin Resource Sharing (CORS) whitelists, request payload limits, and
                structured error sanitization to mitigate information disclosure.
              </p>
            </div>

            {/* 6. Obfuscated Status Lookup */}
            <div className="saas-card">
              <div className="saas-card-icon emerald">
                <EyeOff size={22} />
              </div>
              <h3 className="saas-card-title">Identity-Masked Status Inquiries</h3>
              <p className="saas-card-desc">
                Public registration status lookup endpoints return masked identity strings (e.g. s***e@domain.com)
                and strip internal database IDs, passwords, and authorization tokens from all responses.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Verified Implementation Matrix */}
      <section className="saas-section" style={{ background: '#F9FAFB', borderTop: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB' }}>
        <div className="saas-container">
          <div style={{ maxWidth: 840, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
              <span className="saas-badge" style={{ marginBottom: '0.75rem' }}>
                <FileCheck size={13} />
                Architecture Verification Matrix
              </span>
              <h2 className="saas-section-title" style={{ fontSize: '2.25rem' }}>
                Implemented Security Controls
              </h2>
              <p className="saas-section-subtitle">
                Accurate documentation of controls directly implemented in the LogiSphere AI application and codebase.
              </p>
            </div>

            <div className="saas-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="ops-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                      <th style={{ padding: '1rem 1.25rem', fontSize: '0.8rem', color: '#6B7280', textTransform: 'uppercase' }}>Security Layer</th>
                      <th style={{ padding: '1rem 1.25rem', fontSize: '0.8rem', color: '#6B7280', textTransform: 'uppercase' }}>Implemented Mechanism</th>
                      <th style={{ padding: '1rem 1.25rem', fontSize: '0.8rem', color: '#6B7280', textTransform: 'uppercase' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                      <td style={{ padding: '1rem 1.25rem', fontWeight: 600, color: '#111827' }}>Authentication</td>
                      <td style={{ padding: '1rem 1.25rem', color: '#4B5563', fontSize: '0.9rem' }}>JWT (JSON Web Token) with cryptographic signature validation & expiration check</td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span className="ops-status-badge active" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <CheckCircle2 size={12} /> Verified
                        </span>
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                      <td style={{ padding: '1rem 1.25rem', fontWeight: 600, color: '#111827' }}>Tenancy Segregation</td>
                      <td style={{ padding: '1rem 1.25rem', color: '#4B5563', fontSize: '0.9rem' }}>Mandatory tenant ID query filter on vehicles, trips, maintenance, and telematics</td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span className="ops-status-badge active" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <CheckCircle2 size={12} /> Verified
                        </span>
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                      <td style={{ padding: '1rem 1.25rem', fontWeight: 600, color: '#111827' }}>Authorization Matrix</td>
                      <td style={{ padding: '1rem 1.25rem', color: '#4B5563', fontSize: '0.9rem' }}>Strict role verification protecting modules (Manager, Dispatcher, Safety, Finance, Driver)</td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span className="ops-status-badge active" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <CheckCircle2 size={12} /> Verified
                        </span>
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                      <td style={{ padding: '1rem 1.25rem', fontWeight: 600, color: '#111827' }}>Admin Portal Boundary</td>
                      <td style={{ padding: '1rem 1.25rem', color: '#4B5563', fontSize: '0.9rem' }}>Isolated platform approval realm excluded from public navigation with separate authentication</td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span className="ops-status-badge active" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <CheckCircle2 size={12} /> Verified
                        </span>
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                      <td style={{ padding: '1rem 1.25rem', fontWeight: 600, color: '#111827' }}>API Hardening</td>
                      <td style={{ padding: '1rem 1.25rem', color: '#4B5563', fontSize: '0.9rem' }}>Helmet security middleware, CORS isolation, and JSON payload rate boundaries</td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span className="ops-status-badge active" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <CheckCircle2 size={12} /> Verified
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '1rem 1.25rem', fontWeight: 600, color: '#111827' }}>Audit Logging</td>
                      <td style={{ padding: '1rem 1.25rem', color: '#4B5563', fontSize: '0.9rem' }}>Administrative approval records, organization registration events, and dispatch logs</td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span className="ops-status-badge active" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <CheckCircle2 size={12} /> Verified
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Responsible Disclosure & Inquiries */}
      <section className="saas-section">
        <div className="saas-container">
          <div className="saas-card" style={{ maxWidth: 840, margin: '0 auto', textAlign: 'center', padding: '2.5rem' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', marginBottom: '0.75rem' }}>
              Responsible Security Disclosure & Auditing
            </h3>
            <p style={{ color: '#4B5563', fontSize: '0.95rem', lineHeight: 1.6, maxWidth: 620, margin: '0 auto 1.5rem' }}>
              Security researchers and enterprise compliance officers can report potential vulnerabilities or
              request formal architectural walkthroughs directly through our operations security desk.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="saas-btn saas-btn-primary"
                onClick={() => onNavigate('contact')}
              >
                Request Security Architecture Review
                <ArrowRight size={15} />
              </button>
              <button
                type="button"
                className="saas-btn saas-btn-outline"
                onClick={() => onNavigate('support')}
              >
                Contact Operations Desk
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
