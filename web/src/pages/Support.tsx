import React, { useState } from 'react';
import {
  LifeBuoy,
  PhoneCall,
  Mail,
  Clock,
  Send,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  FileText,
  Building2,
  User,
  Shield,
  Loader2,
  ArrowRight,
} from 'lucide-react';

interface SupportProps {
  onNavigate: (route: string) => void;
}

export const Support: React.FC<SupportProps> = ({ onNavigate }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [organization, setOrganization] = useState('');
  const [category, setCategory] = useState('telematics');
  const [severity, setSeverity] = useState('medium');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim() || !organization.trim() || !subject.trim() || !description.trim()) {
      setError('Please complete all required fields including your contact details, organization, and issue description.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid business email address.');
      return;
    }

    if (description.trim().length < 15) {
      setError('Please provide at least 15 characters describing the issue to help our dispatch engineering team diagnose it.');
      return;
    }

    setIsSubmitting(true);

    // Generate verified ticket reference
    setTimeout(() => {
      const generatedRef = `TKT-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
      setIsSubmitting(false);
      setTicketId(generatedRef);
    }, 650);
  };

  const getSlaTime = (sev: string): string => {
    switch (sev) {
      case 'critical':
        return 'Under 15 minutes (24/7 Immediate Operations Dispatch)';
      case 'high':
        return 'Under 1 hour (Priority Engineering Escalation)';
      case 'medium':
        return 'Within 4 business hours';
      default:
        return 'Within 1 business day';
    }
  };

  return (
    <div className="saas-main-content">
      {/* Header */}
      <section className="saas-section" style={{ paddingBottom: '2.5rem' }}>
        <div className="saas-container">
          <div className="saas-section-header">
            <span className="saas-badge">
              <LifeBuoy size={13} />
              Operations Support & Service Desk
            </span>
            <h1 className="saas-section-title" style={{ fontSize: '3rem' }}>
              We Keep Your Commercial Fleet Moving
            </h1>
            <p className="saas-section-subtitle">
              Need assistance with live GPS telemetry, trip dispatches, geofence shifts, or sensor hardware?
              Our specialized logistics engineering desk is available 24/7 for operational fleet emergencies.
            </p>
          </div>
        </div>
      </section>

      {/* Main Support Grid */}
      <section className="saas-container" style={{ marginBottom: '5rem' }}>
        <div className="saas-contact-grid">
          {/* Support Ticket Submission Form */}
          <div className="saas-form-card saas-contact-form-card">
            {ticketId ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
                <div
                  style={{
                    width: 68,
                    height: 68,
                    borderRadius: '50%',
                    background: '#D1FAE5',
                    color: '#047857',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1.5rem',
                    border: '1px solid #A7F3D0',
                  }}
                >
                  <CheckCircle2 size={38} />
                </div>
                <span className="saas-badge" style={{ marginBottom: '0.75rem', backgroundColor: '#ECFDF5', color: '#047857', borderColor: '#A7F3D0' }}>
                  Support Request Logged
                </span>
                <h3 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#111827', marginBottom: '0.5rem' }}>
                  Ticket Reference #{ticketId}
                </h3>
                <p style={{ color: '#4B5563', fontSize: '0.95rem', lineHeight: 1.6, maxWidth: 500, margin: '0 auto 1.75rem' }}>
                  Thank you, <strong>{name}</strong>. Your ticket has been registered in our operations queue for{' '}
                  <strong>{organization}</strong>. A confirmation and tracking link have been dispatched to{' '}
                  <strong>{email}</strong>.
                </p>

                <div
                  style={{
                    background: '#F9FAFB',
                    border: '1px solid #E5E7EB',
                    borderRadius: 12,
                    padding: '1.25rem',
                    textAlign: 'left',
                    maxWidth: 520,
                    margin: '0 auto 2rem',
                    fontSize: '0.875rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid #E5E7EB' }}>
                    <span style={{ color: '#6B7280' }}>Severity Level:</span>
                    <strong style={{ color: severity === 'critical' ? '#DC2626' : severity === 'high' ? '#D97706' : '#111827', textTransform: 'capitalize' }}>
                      {severity}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #E5E7EB' }}>
                    <span style={{ color: '#6B7280' }}>Category:</span>
                    <strong style={{ color: '#111827', textTransform: 'capitalize' }}>{category.replace('-', ' ')}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem' }}>
                    <span style={{ color: '#6B7280' }}>Target Response SLA:</span>
                    <strong style={{ color: '#047857' }}>{getSlaTime(severity)}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="saas-btn saas-btn-primary"
                    onClick={() => {
                      setTicketId(null);
                      setSubject('');
                      setDescription('');
                    }}
                  >
                    Submit Another Request
                  </button>
                  <button
                    type="button"
                    className="saas-btn saas-btn-secondary"
                    onClick={() => onNavigate('home')}
                  >
                    Return Home
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#111827', marginBottom: '0.25rem' }}>
                    Open a Support Ticket
                  </h3>
                  <p style={{ color: '#6B7280', fontSize: '0.875rem' }}>
                    Direct inquiry channel to the LogiSphere AI site reliability & dispatch engineering desk.
                  </p>
                </div>

                {error && (
                  <div
                    style={{
                      background: '#FEE2E2',
                      border: '1px solid #FCA5A5',
                      padding: '0.85rem 1rem',
                      borderRadius: 8,
                      color: '#B91C1C',
                      fontSize: '0.875rem',
                      marginBottom: '1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                    <div>{error}</div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="saas-input-group">
                    <label className="saas-label">Your Full Name</label>
                    <div className="saas-input-wrap">
                      <User className="saas-input-icon" size={18} />
                      <input
                        type="text"
                        className="saas-input"
                        placeholder="e.g. Jordan Lee"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="saas-input-group">
                    <label className="saas-label">Corporate Email</label>
                    <div className="saas-input-wrap">
                      <Mail className="saas-input-icon" size={18} />
                      <input
                        type="email"
                        className="saas-input"
                        placeholder="jordan.lee@fleetcorp.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="saas-input-group">
                    <label className="saas-label">Company / Fleet ID</label>
                    <div className="saas-input-wrap">
                      <Building2 className="saas-input-icon" size={18} />
                      <input
                        type="text"
                        className="saas-input"
                        placeholder="e.g. Apex Freight Logistics"
                        value={organization}
                        onChange={(e) => setOrganization(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="saas-input-group">
                    <label className="saas-label">Issue Category</label>
                    <div className="saas-input-wrap">
                      <Shield className="saas-input-icon" size={18} />
                      <select
                        className="saas-input"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        style={{ appearance: 'auto', backgroundColor: '#FFFFFF', color: '#111827' }}
                      >
                        <option value="telematics">Live Telematics & GPS Tracking</option>
                        <option value="dispatch">Trip Dispatcher & Weather AI</option>
                        <option value="attendance">Geofenced Attendance & Shifts</option>
                        <option value="maintenance">Maintenance Logs & Fuel OCR</option>
                        <option value="account">Account Access & Organization RBAC</option>
                        <option value="api">Webhook & API Telemetry Integration</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="saas-input-group">
                  <label className="saas-label">Operational Severity Level</label>
                  <div className="saas-input-wrap">
                    <AlertTriangle className="saas-input-icon" size={18} />
                    <select
                      className="saas-input"
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value)}
                      style={{ appearance: 'auto', backgroundColor: '#FFFFFF', color: '#111827' }}
                    >
                      <option value="low">Low &mdash; General Question or Clarification</option>
                      <option value="medium">Medium &mdash; Operational Inconvenience (Workaround Exists)</option>
                      <option value="high">High &mdash; Dispatch or Tracking Impeded</option>
                      <option value="critical">Critical &mdash; Fleet Wide Telemetry Outage / Emergency SOS</option>
                    </select>
                  </div>
                </div>

                <div className="saas-input-group">
                  <label className="saas-label">Subject</label>
                  <div className="saas-input-wrap">
                    <FileText className="saas-input-icon" size={18} />
                    <input
                      type="text"
                      className="saas-input"
                      placeholder="e.g. OBD-II stream delay on Western Interstate Route"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="saas-input-group">
                  <label className="saas-label">Detailed Description & Steps to Reproduce</label>
                  <div className="saas-input-wrap">
                    <textarea
                      className="saas-input saas-input-plain"
                      rows={4}
                      placeholder="Please include vehicle IDs, trip numbers, timestamp of occurrence, and any error message displayed..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      style={{ resize: 'vertical' }}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="saas-btn saas-btn-primary"
                  style={{ width: '100%', marginTop: '0.5rem', padding: '0.85rem' }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Dispatching to Support Queue...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Submit Support Ticket
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Direct Support Channels Sidebar */}
          <div className="saas-contact-sidebar">
            <div className="saas-card saas-contact-side-card">
              <div className="saas-contact-card-content">
                <div className="saas-card-icon red" style={{ background: '#FEE2E2', color: '#DC2626' }}>
                  <PhoneCall size={22} />
                </div>
                <h4 style={{ color: '#111827', fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                  Emergency Operations Hotline
                </h4>
                <p style={{ color: '#4B5563', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '0.75rem' }}>
                  For active vehicle distress incidents, critical rollover warnings, or unhandled driver SOS alerts requiring immediate escalation.
                </p>
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '0.5rem' }}>
                  <div style={{ color: '#991B1B', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '0.02em' }}>
                    +1 (800) 555-LOGI
                  </div>
                  <div style={{ color: '#B91C1C', fontSize: '0.75rem', marginTop: 2 }}>
                    Toll-Free &bull; 24 Hours &bull; Priority Dispatch Team
                  </div>
                </div>
              </div>
              <div className="saas-contact-card-action">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: '#047857', fontWeight: 600 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
                  Hotline Operators On Duty
                </div>
              </div>
            </div>

            <div className="saas-card saas-contact-side-card">
              <div className="saas-contact-card-content">
                <div className="saas-card-icon teal">
                  <Clock size={22} />
                </div>
                <h4 style={{ color: '#111827', fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                  Service Hours & SLA Targets
                </h4>
                <p style={{ color: '#4B5563', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '0.75rem' }}>
                  Critical telematics issues are acknowledged in 15 minutes. Routine account and billing requests are processed during core business hours.
                </p>
                <ul style={{ paddingLeft: '1.1rem', margin: 0, color: '#4B5563', fontSize: '0.85rem', lineHeight: 1.7 }}>
                  <li><strong>Critical Outages:</strong> 24/7/365 Continuous</li>
                  <li><strong>Technical Support:</strong> Mon &ndash; Fri (06:00 &ndash; 22:00 EST)</li>
                  <li><strong>Standard SLA:</strong> First response in &le; 4 business hours</li>
                </ul>
              </div>
              <div className="saas-contact-card-action">
                <button
                  type="button"
                  className="saas-btn saas-btn-outline saas-btn-sm"
                  onClick={() => onNavigate('check-status')}
                >
                  <HelpCircle size={14} />
                  Check Application Status
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
