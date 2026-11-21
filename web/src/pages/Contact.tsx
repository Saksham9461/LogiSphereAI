import React, { useState } from 'react';
import {
  Mail,
  User,
  Building2,
  Truck,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Send,
  Loader2,
} from 'lucide-react';

interface ContactProps {
  onNavigate: (route: string) => void;
}

export const Contact: React.FC<ContactProps> = ({ onNavigate }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [fleetSize, setFleetSize] = useState('11-50');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim() || !company.trim()) {
      setError('Please fill in your name, business email, and company name.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid work email address.');
      return;
    }

    setIsSubmitting(true);
    // Simulate inquiry submission
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 700);
  };

  return (
    <div className="saas-main-content">
      <section className="saas-section" style={{ paddingBottom: '3rem' }}>
        <div className="saas-container">
          <div className="saas-section-header">
            <span className="saas-badge">
              <Mail size={13} />
              Enterprise Consultation
            </span>
            <h1 className="saas-section-title" style={{ fontSize: '3rem' }}>
              Speak with Our Fleet Architecture Specialists
            </h1>
            <p className="saas-section-subtitle">
              Learn how LogiSphere AI can streamline dispatch, attendance geofencing, and telematics for your fleet.
            </p>
          </div>
        </div>
      </section>

      <section className="saas-container" style={{ marginBottom: '5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '3rem', maxWidth: 1060, margin: '0 auto' }}>
          {/* Form Card */}
          <div className="saas-form-card">
            {submitted ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#D1FAE5', color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '1px solid #A7F3D0' }}>
                  <CheckCircle2 size={36} />
                </div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', marginBottom: '0.75rem' }}>
                  Inquiry Received
                </h3>
                <p style={{ color: '#4B5563', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '2rem' }}>
                  Thank you for reaching out, <strong>{name}</strong>. Our enterprise solutions team has received your details and will contact you at <strong>{email}</strong> within one business day.
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                  <button
                    type="button"
                    className="saas-btn saas-btn-primary"
                    onClick={() => {
                      setSubmitted(false);
                      setName('');
                      setEmail('');
                      setCompany('');
                      setMessage('');
                    }}
                  >
                    Submit Another Inquiry
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
                <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#111827', marginBottom: '1.5rem' }}>
                  Request an Enterprise Consultation
                </h3>

                {error && (
                  <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', padding: '0.85rem 1rem', borderRadius: 8, color: '#B91C1C', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
                    {error}
                  </div>
                )}

                <div className="saas-input-group">
                  <label className="saas-label">Your Name</label>
                  <div className="saas-input-wrap">
                    <User className="saas-input-icon" size={18} />
                    <input
                      type="text"
                      className="saas-input"
                      placeholder="e.g. Alex Morgan"
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
                      placeholder="alex.morgan@transport-corp.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="saas-input-group">
                  <label className="saas-label">Company / Organization</label>
                  <div className="saas-input-wrap">
                    <Building2 className="saas-input-icon" size={18} />
                    <input
                      type="text"
                      className="saas-input"
                      placeholder="e.g. Apex National Freight"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="saas-input-group">
                  <label className="saas-label">Active Commercial Fleet Size</label>
                  <div className="saas-input-wrap">
                    <Truck className="saas-input-icon" size={18} />
                    <select
                      className="saas-input"
                      value={fleetSize}
                      onChange={(e) => setFleetSize(e.target.value)}
                      style={{ appearance: 'auto', backgroundColor: '#FFFFFF', color: '#111827' }}
                    >
                      <option value="1-10">1 – 10 Vehicles (Growing Fleet)</option>
                      <option value="11-50">11 – 50 Vehicles (Mid-Sized Carrier)</option>
                      <option value="51-200">51 – 200 Vehicles (Regional Enterprise)</option>
                      <option value="200+">200+ Vehicles (National Logistics)</option>
                    </select>
                  </div>
                </div>

                <div className="saas-input-group">
                  <label className="saas-label">How can we assist your logistics operations?</label>
                  <div className="saas-input-wrap">
                    <textarea
                      className="saas-input saas-input-plain"
                      rows={3}
                      placeholder="Describe your current routes, challenges, or integration requirements..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      style={{ resize: 'vertical' }}
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
                      Submitting Request...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Send Enterprise Inquiry
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Quick Context & FAQ Side */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', justifyContent: 'center' }}>
            <div className="saas-card">
              <div className="saas-card-icon teal">
                <Building2 size={22} />
              </div>
              <h4 style={{ color: '#111827', fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Looking to Onboard Right Away?
              </h4>
              <p style={{ color: '#4B5563', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                You can directly register your organization, configure your operational geofence, and designate your initial manager without waiting for a sales consultation.
              </p>
              <button
                type="button"
                className="saas-btn saas-btn-outline saas-btn-sm"
                onClick={() => onNavigate('signup')}
              >
                Go to Company Registration
                <ArrowRight size={14} />
              </button>
            </div>

            <div className="saas-card">
              <div className="saas-card-icon emerald">
                <ShieldCheck size={22} />
              </div>
              <h4 style={{ color: '#111827', fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Already Applied?
              </h4>
              <p style={{ color: '#4B5563', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                Check your company’s application and platform review status instantly using your registered manager email address.
              </p>
              <button
                type="button"
                className="saas-btn saas-btn-outline saas-btn-sm"
                onClick={() => onNavigate('check-status')}
              >
                Check Application Status
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
