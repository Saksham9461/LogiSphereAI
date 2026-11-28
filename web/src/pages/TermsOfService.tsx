import React from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Scale,
} from 'lucide-react';

interface TermsOfServiceProps {
  onNavigate: (route: string) => void;
}

export const TermsOfService: React.FC<TermsOfServiceProps> = ({ onNavigate }) => {
  return (
    <div className="saas-main-content">
      {/* Header */}
      <section className="saas-section" style={{ paddingBottom: '2rem' }}>
        <div className="saas-container">
          <div className="saas-section-header">
            <span className="saas-badge">
              <Scale size={13} />
              Enterprise Agreements
            </span>
            <h1 className="saas-section-title" style={{ fontSize: '3rem' }}>
              LogiSphere AI Terms of Service
            </h1>
            <p className="saas-section-subtitle">
              Standard Commercial Service Terms &bull; Effective Date: January 1, 2026
            </p>
          </div>
        </div>
      </section>

      {/* Main Terms Content */}
      <section className="saas-container" style={{ marginBottom: '5rem' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          {/* Commercial Scope Notice */}
          <div
            style={{
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: 12,
              padding: '1.25rem 1.5rem',
              marginBottom: '2.5rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '1rem',
            }}
          >
            <ShieldCheck size={22} color="#2563EB" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: '0.9rem', color: '#1E40AF', lineHeight: 1.6 }}>
              <strong>Commercial Service Agreement:</strong> These terms govern commercial access to the LogiSphere AI
              fleet intelligence platform. Custom enterprise contracts, negotiated Service Level Agreements (SLAs), and
              master purchase agreements supersede conflicting provisions in standard terms.
            </div>
          </div>

          <div className="saas-card" style={{ padding: '3rem 2.5rem', lineHeight: 1.7, color: '#374151' }}>
            {/* Section 1 */}
            <div style={{ marginBottom: '2.5rem' }}>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#111827', marginBottom: '0.75rem' }}>
                1. Account Registration & Organization Approval
              </h2>
              <p style={{ marginBottom: '1rem' }}>
                Access to LogiSphere AI requires formal organization registration and administrative verification.
                The individual submitting registration represents and warrants that they possess legal authority to bind
                the commercial organization to these terms.
              </p>
              <p>
                Organizations are responsible for maintaining the confidentiality of primary manager credentials and
                ensuring that driver invitations and credential assignments comply with applicable commercial transport
                laws and regulations.
              </p>
            </div>

            {/* Section 2 */}
            <div style={{ marginBottom: '2.5rem' }}>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#111827', marginBottom: '0.75rem' }}>
                2. Acceptable Use of Fleet Telematics
              </h2>
              <p style={{ marginBottom: '1rem' }}>
                Users agree to utilize LogiSphere AI exclusively for lawful commercial transportation, logistics, and
                fleet management activities. Prohibited activities include:
              </p>
              <ul style={{ paddingLeft: '1.25rem', marginBottom: '1rem' }}>
                <li style={{ marginBottom: '0.5rem' }}>
                  Injecting fraudulent telemetry, simulated coordinate streams, or manipulating geofence attendance logs;
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  Attempting to breach multi-tenant database partitions or access unassigned organization records;
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  Reverse engineering, decompiling, or probing backend API endpoints without prior authorization;
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  Distributing malware or disrupting real-time WebSocket telematics streams.
                </li>
              </ul>
            </div>

            {/* Section 3 */}
            <div style={{ marginBottom: '2.5rem' }}>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#111827', marginBottom: '0.75rem' }}>
                3. Telemetry Transmission & External Dependencies
              </h2>
              <p style={{ marginBottom: '1rem' }}>
                LogiSphere AI aggregates real-time vehicle metrics via cellular data networks, GPS constellations,
                and OBD-II hardware interfaces. Customers acknowledge that:
              </p>
              <p style={{ marginBottom: '1rem' }}>
                Transmission latency, temporary blind spots in mountainous or rural corridors, and carrier maintenance
                windows may intermittently affect real-time coordinate streaming. The platform provides automatic
                client-side telemetry caching to preserve trip data during intermittent network disruptions.
              </p>
            </div>

            {/* Section 4 */}
            <div style={{ marginBottom: '2.5rem' }}>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#111827', marginBottom: '0.75rem' }}>
                4. Advisory Nature of AI Route & Weather Recommendations
              </h2>
              <p style={{ marginBottom: '1rem' }}>
                LogiSphere AI route optimization, delay risk scoring, and weather hazard predictions are algorithmic
                advisories designed to assist dispatchers and drivers.
              </p>
              <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '1rem 1.25rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#111827', fontWeight: 600 }}>
                  <AlertTriangle size={16} color="#D97706" />
                  Operational Safety Prerogative
                </div>
                <div style={{ fontSize: '0.875rem', color: '#4B5563' }}>
                  Drivers and dispatchers retain sole responsibility for actual vehicle operation, road safety compliance,
                  hazardous cargo restrictions, and adherence to legal duty hour regulations.
                </div>
              </div>
            </div>

            {/* Section 5 */}
            <div style={{ marginBottom: '2.5rem' }}>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#111827', marginBottom: '0.75rem' }}>
                5. Intellectual Property & License Grant
              </h2>
              <p style={{ marginBottom: '1rem' }}>
                LogiSphere AI and its underlying algorithms, user interfaces, branding, and documentation remain the
                exclusive intellectual property of LogiSphere AI. Customers retain full ownership of their operational
                telemetry, trip logs, and company records.
              </p>
            </div>

            {/* Section 6 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#111827', marginBottom: '0.75rem' }}>
                6. Contact & Legal Notices
              </h2>
              <p style={{ marginBottom: '1.25rem' }}>
                Formal legal notices, enterprise contract inquiries, and commercial agreement amendments should be
                addressed to our enterprise legal desk:
              </p>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="saas-btn saas-btn-primary saas-btn-sm"
                  onClick={() => onNavigate('contact')}
                >
                  Contact Enterprise Legal
                </button>
                <button
                  type="button"
                  className="saas-btn saas-btn-outline saas-btn-sm"
                  onClick={() => onNavigate('privacy')}
                >
                  View Privacy Policy
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
