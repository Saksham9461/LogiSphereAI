import React, { useState } from 'react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  Info,
} from 'lucide-react';

interface SignInProps {
  onNavigate: (route: string) => void;
  onLoginSuccess: (email: string) => void;
}

export const SignIn: React.FC<SignInProps> = ({ onNavigate, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [forgotSent, setForgotSent] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      errs.email = 'Email address is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        errs.email = 'Please enter a valid email address';
      }
    }

    if (!password) {
      errs.password = 'Password is required';
    } else if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters';
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // Temporary static sign-in flow: routes immediately to the static demo dashboard
    onLoginSuccess(email.trim());
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotEmail.trim()) {
      setForgotSent(true);
    }
  };

  return (
    <div className="saas-main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3.5rem 1rem' }}>
      <div style={{ width: '100%', maxWidth: 460 }}>
        {/* Notice Banner explaining static preview mode */}
        <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: 10, padding: '0.85rem 1rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1.5rem', color: '#93C5FD', fontSize: '0.825rem', lineHeight: 1.5 }}>
          <Info size={18} style={{ flexShrink: 0, marginTop: 2, color: '#60A5FA' }} />
          <div>
            <strong>Static Demonstration Mode:</strong> Submitting credentials navigates to the simulated LogiSphere Executive Dashboard preview using sample operational data.
          </div>
        </div>

        <div className="saas-form-card">
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <span className="saas-badge" style={{ marginBottom: '0.75rem' }}>
              Portal Access
            </span>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
              Sign In to LogiSphere AI
            </h1>
            <p style={{ color: '#4B5563', fontSize: '0.9rem' }}>
              Enter your manager credentials to access the fleet console.
            </p>
          </div>

          <form onSubmit={handleSignIn} noValidate>
            {/* Email Field */}
            <div className="saas-input-group">
              <label className="saas-label" htmlFor="signin-email">
                Manager Work Email
              </label>
              <div className="saas-input-wrap">
                <Mail className="saas-input-icon" size={18} />
                <input
                  id="signin-email"
                  type="email"
                  className={`saas-input ${fieldErrors.email ? 'saas-input-error' : ''}`}
                  placeholder="manager@logisphere.ai"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: '' }));
                  }}
                  autoComplete="email"
                  required
                />
              </div>
              {fieldErrors.email && (
                <div className="saas-field-error">{fieldErrors.email}</div>
              )}
            </div>

            {/* Password Field */}
            <div className="saas-input-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label className="saas-label" htmlFor="signin-password" style={{ marginBottom: 0 }}>
                  Password
                </label>
                <button
                  type="button"
                  style={{ fontSize: '0.8rem', color: '#B45309', cursor: 'pointer', background: 'none', border: 'none', fontWeight: 600 }}
                  onClick={() => setShowForgotModal(true)}
                >
                  Forgot Password?
                </button>
              </div>
              <div className="saas-input-wrap">
                <Lock className="saas-input-icon" size={18} />
                <input
                  id="signin-password"
                  type={showPassword ? 'text' : 'password'}
                  className={`saas-input ${fieldErrors.password ? 'saas-input-error' : ''}`}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: '' }));
                  }}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '1rem', color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer' }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {fieldErrors.password && (
                <div className="saas-field-error">{fieldErrors.password}</div>
              )}
            </div>

            {/* Remember Me Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.75rem' }}>
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ accentColor: '#F59E0B', cursor: 'pointer', width: 16, height: 16 }}
              />
              <label htmlFor="remember-me" style={{ fontSize: '0.85rem', color: '#4B5563', cursor: 'pointer' }}>
                Remember this device for 30 days
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="saas-btn saas-btn-primary"
              style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem' }}
            >
              Sign In to Command Center
              <ArrowRight size={16} />
            </button>
          </form>

          {/* Links */}
          <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid #E5E7EB', textAlign: 'center', fontSize: '0.85rem', color: '#6B7280' }}>
            New fleet company?{' '}
            <button
              type="button"
              onClick={() => onNavigate('signup')}
              style={{ color: '#B45309', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Register Organization
            </button>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(17, 24, 39, 0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '1rem' }}>
          <div className="saas-form-card" style={{ maxWidth: 420, width: '100%', background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#111827', marginBottom: '0.5rem' }}>
              Reset Password
            </h3>
            <p style={{ color: '#4B5563', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Enter your registered manager email address. In production, a secure password reset link will be dispatched to your inbox.
            </p>

            {forgotSent ? (
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '1rem', borderRadius: 8, color: '#34D399', fontSize: '0.875rem', textAlign: 'center' }}>
                <CheckCircle2 size={24} style={{ margin: '0 auto 0.5rem' }} />
                Reset instructions simulated for <strong>{forgotEmail}</strong>.
                <button
                  type="button"
                  className="saas-btn saas-btn-outline saas-btn-sm"
                  style={{ marginTop: '1rem', width: '100%' }}
                  onClick={() => {
                    setShowForgotModal(false);
                    setForgotSent(false);
                    setForgotEmail('');
                  }}
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit}>
                <div className="saas-input-group">
                  <label className="saas-label">Registered Manager Email</label>
                  <div className="saas-input-wrap">
                    <Mail className="saas-input-icon" size={18} />
                    <input
                      type="email"
                      className="saas-input"
                      placeholder="manager@logisphere.ai"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                  <button
                    type="submit"
                    className="saas-btn saas-btn-primary"
                    style={{ flex: 1 }}
                  >
                    Send Reset Link
                  </button>
                  <button
                    type="button"
                    className="saas-btn saas-btn-secondary"
                    onClick={() => setShowForgotModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
