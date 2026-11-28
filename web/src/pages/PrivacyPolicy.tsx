import React from 'react';
import {
  FileText,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface PrivacyPolicyProps {
  onNavigate: (route: string) => void;
}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onNavigate }) => {
  return (
    <div className="saas-main-content">
      {/* Header */}
      <section className="saas-section" style={{ paddingBottom: '2rem' }}>
        <div className="saas-container">
          <div className="saas-section-header">
            <span className="saas-badge">
              <FileText size={13} />
              Legal & Transparency
            </span>
            <h1 className="saas-section-title" style={{ fontSize: '3rem' }}>
              LogiSphere AI Privacy Policy
            </h1>
            <p className="saas-section-subtitle">
              Last Updated: January 2026 &bull; Operational Version 2.4 &bull; Commercial Enterprise Edition
            </p>
          </div>
        </div>
      </section>

      {/* Main Policy Content */}
      <section className="saas-container" style={{ marginBottom: '5rem' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          {/* Important Notice Callout */}
          <div
            style={{
              background: '#FFFBEB',
              border: '1px solid #FDE68A',
              borderRadius: 12,
              padding: '1.25rem 1.5rem',
              marginBottom: '2.5rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '1rem',
            }}
          >
            <AlertCircle size={22} color="#D97706" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: '0.9rem', color: '#92400E', lineHeight: 1.6 }}>
              <strong>Notice Regarding Enterprise Data Processing:</strong> This policy outlines the verified,
              technical data-handling mechanisms implemented across the LogiSphere AI platform. Formal commercial
              customer relationships are additionally governed by the customer's signed Enterprise Master Services
              Agreement (MSA) and customized Data Processing Addendum (DPA).
            </div>
          </div>

          {/* Policy Document Body */}
          <div className="saas-card" style={{ padding: '3rem 2.5rem', lineHeight: 1.7, color: '#374151' }}>
            {/* Section 1 */}
            <div style={{ marginBottom: '2.5rem' }}>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#111827', marginBottom: '0.75rem' }}>
                1. Overview & Multi-Tenant Data Controllership
              </h2>
              <p style={{ marginBottom: '1rem' }}>
                LogiSphere AI provides autonomous commercial fleet orchestration, telematics aggregation,
                geofenced attendance, and carbon emissions intelligence for registered enterprise organizations.
              </p>
              <p>
                In the context of commercial fleet operations, our customer (the registered enterprise logistics organization)
                acts as the <strong>Data Controller</strong> for all operational telemetry, driver rosters, and trip data
                processed within their designated tenant domain. LogiSphere AI acts as the <strong>Data Processor</strong>,
                handling records strictly in accordance with documented instructions and authorized API sessions.
              </p>
            </div>

            {/* Section 2 */}
            <div style={{ marginBottom: '2.5rem' }}>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#111827', marginBottom: '0.75rem' }}>
                2. Categories of Operational Data Handled
              </h2>
              <p style={{ marginBottom: '1rem' }}>
                The platform processes only telemetry and operational attributes necessary to deliver real-time fleet
                management, dispatching, and safety monitoring:
              </p>
              <ul style={{ paddingLeft: '1.25rem', marginBottom: '1rem' }}>
                <li style={{ marginBottom: '0.5rem' }}>
                  <strong>Organization & Account Identity:</strong> Legal company name, tax/fleet registration identifier,
                  headquarters geographic coordinates, operational geofence radius, and designated primary Fleet Manager credentials.
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  <strong>Driver Operations Data:</strong> Driver full name, commercial phone number, assigned license credentials,
                  duty shift timestamps, and vehicle pairing records.
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  <strong>Telematics & GPS Coordinates:</strong> Real-time latitude, longitude, vehicle speed, heading, odometer readings,
                  fuel economy calculations, and sensor event alerts.
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  <strong>Attendance & Geofence Entry/Exit:</strong> Mathematically verified shift clock-in and clock-out timestamps
                  within authorized organization facility perimeters.
                </li>
              </ul>
            </div>

            {/* Section 3 */}
            <div style={{ marginBottom: '2.5rem' }}>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#111827', marginBottom: '0.75rem' }}>
                3. Technical Boundary Isolation & Tenant Segregation
              </h2>
              <p style={{ marginBottom: '1rem' }}>
                LogiSphere AI implements strict architectural isolation across all tenant boundaries:
              </p>
              <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '1rem 1.25rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#111827', fontWeight: 600 }}>
                  <CheckCircle2 size={16} color="#10B981" />
                  Verified Multi-Tenant Row-Level Separation
                </div>
                <div style={{ fontSize: '0.875rem', color: '#4B5563' }}>
                  Database transactions are scoped strictly to the authenticated organization's unique tenant ID. Cross-tenant
                  query execution is blocked at both the API controller and database layers.
                </div>
              </div>
            </div>

            {/* Section 4 */}
            <div style={{ marginBottom: '2.5rem' }}>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#111827', marginBottom: '0.75rem' }}>
                4. Data Protection, Encryption & Retention
              </h2>
              <p style={{ marginBottom: '1rem' }}>
                All external data transmissions occur exclusively over Transport Layer Security (TLS/HTTPS and WSS).
                Passwords and sensitive authentication credentials are never stored in plain text. Session tokens utilize
                secure cryptographic signatures with deterministic expiration timeouts.
              </p>
              <p>
                Telematics and trip logs are retained for operational audit and carbon calculation purposes as defined by the
                organization's enterprise subscription tier. Upon formal deactivation of an authorized organization, tenant data
                is scheduled for permanent purges according to the terms of the customer's agreement.
              </p>
            </div>

            {/* Section 5 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#111827', marginBottom: '0.75rem' }}>
                5. Privacy Inquiries & Data Rights
              </h2>
              <p style={{ marginBottom: '1.25rem' }}>
                Authorized Fleet Managers may review, update, or remove vehicles and driver roster records directly within the
                authenticated portal. For specific data protection inquiries, export requests, or formal DPA documentation,
                contact our operations legal desk:
              </p>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="saas-btn saas-btn-primary saas-btn-sm"
                  onClick={() => onNavigate('contact')}
                >
                  Contact Enterprise Privacy Desk
                </button>
                <button
                  type="button"
                  className="saas-btn saas-btn-outline saas-btn-sm"
                  onClick={() => onNavigate('security')}
                >
                  Review Security Architecture
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
