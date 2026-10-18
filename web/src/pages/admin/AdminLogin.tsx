// ==============================================================================
// LogiSphere AI — Secure Platform Admin Login Page
// ==============================================================================

import { useState } from 'react';
import { ShieldAlert, Lock, Mail, Eye, EyeOff, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { adminService } from '../../services/adminService';
import type { AdminUser } from '../../types';

interface AdminLoginProps {
  onSuccess: (admin: AdminUser) => void;
  onExit: () => void;
}

export function AdminLogin({ onSuccess, onExit }: AdminLoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setErrorMessage('Please enter your administrator username or email');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your administrator password');
      return;
    }

    setLoading(true);
    try {
      // Authenticates with backend /api/admin/login and verifies platform administrator session
      const adminUser = await adminService.loginAdmin(trimmedUsername, password);
      onSuccess(adminUser);
    } catch (err: any) {
      const msg = err?.message || 'Failed to authenticate platform administrator';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-wrapper">
      <div className="admin-login-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="admin-restricted-badge">
            <ShieldAlert size={14} />
            Restricted Access
          </span>
          <button
            type="button"
            className="admin-action-btn outline"
            onClick={onExit}
            style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
          >
            <ArrowLeft size={13} />
            Public Registration
          </button>
        </div>

        <div className="admin-login-header">
          <h1>Platform Administration</h1>
          <p>LogiSphere AI Organization Approval & Governance</p>
        </div>

        {errorMessage && (
          <div className="admin-login-alert danger" role="alert">
            <Lock size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>{errorMessage}</div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" htmlFor="admin-username">
              Administrator Username or Email
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="admin-username"
                type="text"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="admin"
                value={username}
                onChange={e => setUsername(e.target.value)}
                disabled={loading}
                autoComplete="username"
                required
              />
              <Mail
                size={18}
                style={{
                  position: 'absolute',
                  left: '0.85rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#64748b',
                  pointerEvents: 'none',
                }}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label" htmlFor="admin-password">
              Administrator Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                placeholder="••••••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="current-password"
                required
              />
              <Lock
                size={18}
                style={{
                  position: 'absolute',
                  left: '0.85rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#64748b',
                  pointerEvents: 'none',
                }}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(prev => !prev)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="submit-btn"
            disabled={loading}
            style={{ width: '100%', marginTop: '0.5rem' }}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="spin" />
                Verifying Credentials & Permissions...
              </>
            ) : (
              <>
                <CheckCircle2 size={18} />
                Sign In to Platform Admin Portal
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
