// ==============================================================================
// LogiSphere AI — User Profile & Security Credentials View
// Profile metadata, organization tenancy details, and password management
// Backed by POST /api/auth/change-password
// ==============================================================================

import React, { useState } from 'react';
import {
  Shield,
  Building2,
  Lock,
  Key,
  CheckCircle2,
  Phone,
} from 'lucide-react';
import { useAuth } from '../../stores/authStore';

export const ProfileView: React.FC = () => {
  const { user, changePassword } = useAuth();

  // Change Password state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      await changePassword({ oldPassword, newPassword });
      setSuccessMessage('Password updated successfully');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to update password');
    } finally {
      setSubmitting(false);
    }
  };

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'US';

  return (
    <div>
      {/* Top Action Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#111827', margin: 0 }}>
          Account Profile & Security
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: '0.25rem 0 0 0' }}>
          Personal identity, organization credentials, and authentication settings.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 420px) 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left Column: Profile Card */}
        <div className="app-card">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingBottom: '1.25rem', borderBottom: '1px solid #F3F4F6', marginBottom: '1.25rem' }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: '#FEF3C7',
                border: '2px solid #FDE68A',
                color: '#B45309',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '1.6rem',
                marginBottom: '0.75rem',
              }}
            >
              {initials}
            </div>

            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#111827', margin: 0 }}>
              {user?.name || 'Authorized User'}
            </h2>
            <div style={{ fontSize: '0.85rem', color: '#6B7280', marginTop: 2 }}>{user?.email}</div>

            <div
              style={{
                marginTop: '0.75rem',
                background: '#EFF6FF',
                color: '#1E40AF',
                border: '1px solid #BFDBFE',
                borderRadius: 999,
                padding: '0.25rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Shield size={13} />
              <span>{user?.role?.replace(/ROLE_/g, '').replace(/_/g, ' ')}</span>
            </div>
          </div>

          {/* Details List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Building2 size={16} color="#6B7280" />
              <div>
                <div style={{ fontSize: '0.72rem', color: '#6B7280', textTransform: 'uppercase', fontWeight: 700 }}>Organization</div>
                <div style={{ fontWeight: 600, color: '#111827' }}>{user?.organizationName || 'LogiSphere Fleet Operations'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Key size={16} color="#6B7280" />
              <div>
                <div style={{ fontSize: '0.72rem', color: '#6B7280', textTransform: 'uppercase', fontWeight: 700 }}>User ID</div>
                <div className="ops-mono" style={{ fontWeight: 600, color: '#111827' }}>{user?.id || user?.userId || 'N/A'}</div>
              </div>
            </div>

            {user?.phoneNo && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Phone size={16} color="#6B7280" />
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#6B7280', textTransform: 'uppercase', fontWeight: 700 }}>Phone</div>
                  <div style={{ fontWeight: 600, color: '#111827' }}>{user.phoneNo}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Password Management Form */}
        <div className="app-card">
          <div className="app-card-header">
            <div className="app-card-title">
              <Lock size={18} color="#F59E0B" />
              <span>Change Security Password</span>
            </div>
          </div>

          <p style={{ fontSize: '0.85rem', color: '#4B5563', lineHeight: 1.5, marginBottom: '1.25rem' }}>
            Keep your fleet console account secure by updating your access password periodically.
          </p>

          {error && (
            <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', padding: '0.65rem 0.85rem', borderRadius: 8, color: '#991B1B', marginBottom: '1rem', fontSize: '0.8rem' }}>
              {error}
            </div>
          )}

          {successMessage && (
            <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '0.65rem 0.85rem', borderRadius: 8, color: '#065F46', marginBottom: '1rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={16} />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                Current Password *
              </label>
              <input
                type="password"
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.875rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                New Password (minimum 6 characters) *
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.875rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                Confirm New Password *
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.875rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
