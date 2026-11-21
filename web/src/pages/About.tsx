import React from 'react';
import {
  ShieldCheck,
  Building2,
  Cpu,
  Server,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface AboutProps {
  onNavigate: (route: string) => void;
}

export const About: React.FC<AboutProps> = ({ onNavigate }) => {
  return (
    <div className="saas-main-content">
      {/* Hero Header */}
      <section className="saas-section" style={{ paddingBottom: '2.5rem' }}>
        <div className="saas-container">
          <div className="saas-section-header">
            <span className="saas-badge">
              <Sparkles size={13} />
              About LogiSphere AI
            </span>
            <h1 className="saas-section-title" style={{ fontSize: '3rem' }}>
              Building the Future of Autonomous Logistics Intelligence
            </h1>
            <p className="saas-section-subtitle">
              LogiSphere AI was built on a single core belief: fleet operations should be transparent,
              data-driven, and relentlessly reliable. We engineer technology that bridges the gap between road telemetry
              and executive decision-making.
            </p>
          </div>
        </div>
      </section>

      {/* Core Principles */}
      <section className="saas-section" style={{ paddingTop: '0' }}>
        <div className="saas-container">
          <div className="saas-grid-3">
            <div className="saas-card">
              <div className="saas-card-icon">
                <ShieldCheck size={22} />
              </div>
              <h3 className="saas-card-title">Resilient Architecture</h3>
              <p className="saas-card-desc">
                Logistics does not stop when cellular towers drop out. We build offline-first mobile mechanisms
                and fault-tolerant streaming pipelines so road incidents and telemetry are never lost.
              </p>
            </div>

            <div className="saas-card">
              <div className="saas-card-icon teal">
                <Building2 size={22} />
              </div>
              <h3 className="saas-card-title">Multi-Tenant Governance</h3>
              <p className="saas-card-desc">
                Every organization operating on LogiSphere enjoys strict tenant boundary isolation. Data is segregated
                at the database layer, governed by role-based access, and audited for regulatory compliance.
              </p>
            </div>

            <div className="saas-card">
              <div className="saas-card-icon emerald">
                <Cpu size={22} />
              </div>
              <h3 className="saas-card-title">Intelligent Automation</h3>
              <p className="saas-card-desc">
                Rather than flooding dispatchers with raw sensor noise, our AI models synthesize route recommendations,
                weather impact forecasts, and preventative maintenance schedules into clear, actionable directives.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Technical Architecture Overview */}
      <section className="saas-section" style={{ background: '#F9FAFB' }}>
        <div className="saas-container">
          <div className="saas-grid-2" style={{ alignItems: 'center' }}>
            <div>
              <span className="saas-badge">
                <Server size={13} />
                Under the Hood
              </span>
              <h2 className="saas-section-title" style={{ textAlign: 'left', marginTop: '1rem' }}>
                Enterprise Cloud-Native Stack
              </h2>
              <p className="saas-card-desc" style={{ fontSize: '1rem', marginBottom: '1.5rem' }}>
                LogiSphere AI is powered by a high-throughput Node.js + Express backend written entirely in TypeScript,
                paired with Supabase PostgreSQL for relational integrity and real-time state broadcasts.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <CheckCircle2 size={18} color="#10B981" />
                  <span style={{ color: '#111827', fontSize: '0.95rem' }}>
                    <strong>TypeScript Everywhere:</strong> Type-safety spanning backend API services and frontend web portal.
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <CheckCircle2 size={18} color="#10B981" />
                  <span style={{ color: '#111827', fontSize: '0.95rem' }}>
                    <strong>PostgreSQL & Supabase:</strong> ACID-compliant relational schemas with row-level tenant security.
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <CheckCircle2 size={18} color="#10B981" />
                  <span style={{ color: '#047857', fontSize: '0.95rem' }}>
                    <strong>Low-Latency WebSockets:</strong> Sub-second streaming for GPS coordinates, emergency SOS, and chat.
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <CheckCircle2 size={18} color="#10B981" />
                  <span style={{ color: '#111827', fontSize: '0.95rem' }}>
                    <strong>Granular RBAC Guards:</strong> Every endpoint validated against user roles and tenant organization ID.
                  </span>
                </div>
              </div>
            </div>

            <div style={{ background: '#FFFFFF', padding: '2rem', borderRadius: 14, border: '1px solid #E5E7EB', boxShadow: 'var(--saas-shadow-card)' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#B45309', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
                System Architecture Breakdown
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ padding: '1rem', background: '#F9FAFB', borderRadius: 8, border: '1px solid #E5E7EB' }}>
                  <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.95rem' }}>Web Application Portal</div>
                  <div style={{ color: '#4B5563', fontSize: '0.825rem', marginTop: 4 }}>React 19 + TypeScript + Vite. Organization onboarding, status tracking, and platform administration.</div>
                </div>

                <div style={{ padding: '1rem', background: '#F9FAFB', borderRadius: 8, border: '1px solid #E5E7EB' }}>
                  <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.95rem' }}>Core Telemetry & Dispatch API</div>
                  <div style={{ color: '#4B5563', fontSize: '0.825rem', marginTop: 4 }}>Express + TypeScript API. Trips, drivers, vehicles, geofenced attendance, maintenance, and expenses.</div>
                </div>

                <div style={{ padding: '1rem', background: '#F9FAFB', borderRadius: 8, border: '1px solid #E5E7EB' }}>
                  <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.95rem' }}>Mobile Driver Application</div>
                  <div style={{ color: '#4B5563', fontSize: '0.825rem', marginTop: 4 }}>React Native. GPS tracking streaming, geofenced shift clock-in, team chat, and offline SOS queue.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="saas-container" style={{ margin: '4rem auto' }}>
        <div className="saas-cta-banner">
          <h2 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#111827', marginBottom: '1rem' }}>
            Partner with LogiSphere AI
          </h2>
          <p style={{ color: '#4B5563', maxWidth: 580, margin: '0 auto 2rem', fontSize: '1rem' }}>
            Elevate fleet transparency and efficiency across your enterprise. Register your organization to begin onboarding.
          </p>
          <button
            type="button"
            className="saas-btn saas-btn-primary saas-btn-lg"
            onClick={() => onNavigate('signup')}
          >
            Register Organization
            <ArrowRight size={16} />
          </button>
        </div>
      </section>
    </div>
  );
};
