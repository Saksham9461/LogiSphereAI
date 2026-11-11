// ==============================================================================
// LogiSphere AI — Authenticated SaaS Sign In Experience
// Connects strictly to POST /api/auth/login with tenancy validation & role resolution
// ==============================================================================

import React, { useState } from 'react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Shield,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../stores/authStore';
import { Loader, ActivityIndicator } from '../components/Loader';

interface SignInProps {
  onNavigate: (route: string) => void;
  onLoginSuccess?: (email: string) => void;
}

export const SignIn: React.FC<SignInProps> = ({ onNavigate, onLoginSuccess }) => {
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [authError, setAuthError] = useState<string | null>(null);

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

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await login(
        email.trim(),
        password,
        role.trim() || undefined,
        rememberMe
      );

      if (res.success && res.data) {
        if (onLoginSuccess) {
          onLoginSuccess(res.data.email);
        }
        onNavigate('dashboard');
      } else {
        setAuthError(res.message || 'Authentication failed');
      }
    } catch (err: any) {
      console.error('Sign in failed:', err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Authentication failed. Please verify your email, password, and organization approval status.';
      setAuthError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="saas-main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3.5rem 1rem' }}>
      <div style={{ width: '100%', maxWidth: 460 }}>
        <div className="saas-form-card">
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <span className="saas-badge" style={{ marginBottom: '0.75rem' }}>
              Fleet Portal Access
            </span>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
              Sign In to LogiSphere AI
            </h1>
            <p style={{ color: '#4B5563', fontSize: '0.9rem' }}>
              Enter your enterprise organization credentials to access the fleet console.
            </p>
          </div>

          {authError && (
            <div
              style={{
                background: '#FEE2E2',
                border: '1px solid #FECACA',
                borderRadius: 8,
                padding: '0.75rem 1rem',
                color: '#991B1B',
                fontSize: '0.85rem',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>{authError}</div>
            </div>
          )}

          <form onSubmit={handleSignIn} noValidate>
            {/* Email Field */}
            <div className="saas-input-group">
              <label className="saas-label" htmlFor="signin-email">
                Account Work Email *
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
                    if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
                  }}
                  autoComplete="email"
                  required
                />
              </div>
              {fieldErrors.email && <div className="saas-field-error">{fieldErrors.email}</div>}
            </div>

            {/* Password Field */}
            <div className="saas-input-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label className="saas-label" htmlFor="signin-password" style={{ marginBottom: 0 }}>
                  Password *
                </label>
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
                    if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }));
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
              {fieldErrors.password && <div className="saas-field-error">{fieldErrors.password}</div>}
            </div>

            {/* Optional Role Specification */}
            <div className="saas-input-group">
              <label className="saas-label" htmlFor="signin-role">
                Assigned Role (Optional / Auto-Detected)
              </label>
              <div className="saas-input-wrap">
                <Shield className="saas-input-icon" size={18} />
                <select
                  id="signin-role"
                  className="saas-input"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  style={{ background: '#FFFFFF' }}
                >
                  <option value="">Auto-Detect from Account</option>
                  <option value="ROLE_MANAGER">Fleet Operations Manager</option>
                  <option value="ROLE_DISPATCHER">Dispatcher</option>
                  <option value="ROLE_SAFETY_OFFICER">Safety Officer</option>
                  <option value="ROLE_FINANCE">Financial Analyst</option>
                  <option value="ROLE_DRIVER">Fleet Driver</option>
                </select>
              </div>
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
                Remember session on this device
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="saas-btn saas-btn-primary"
              style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem' }}
            >
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <ActivityIndicator size="small" color="#1A1200" />
                  <span>Authenticating...</span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <span>Sign In to Fleet Console</span>
                  <ArrowRight size={16} />
                </div>
              )}
            </button>
          </form>

          {/* Symmetrical Modal Loader matching App/src/components/Loader.tsx */}
          <Loader
            show={loading}
            text="Authenticating..."
            subtext="Connecting to LogiSphere AI enterprise identity provider"
          />

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
            <span style={{ margin: '0 0.5rem' }}>&bull;</span>
            <button
              type="button"
              onClick={() => onNavigate('check-status')}
              style={{ color: '#4B5563', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Check Status
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
