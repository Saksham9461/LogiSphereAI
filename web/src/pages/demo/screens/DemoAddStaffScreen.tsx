// ==============================================================================
// LogiSphere AI — Demo Register Staff Screen (DemoAddStaffScreen.tsx)
// 100% Symmetrical with App/src/screens/SignupScreen.tsx and AddStaffView.tsx
// Features: Full Name, Phone Number (with 10-digit validation), Email, Password,
// Role Selector (Dispatcher, Safety Officer, Financial Analyst, Manager)
// ==============================================================================

import React, { useState } from 'react';
import {
  UserPlus,
  Users,
  Navigation,
  Shield,
  TrendingUp,
  Eye,
  EyeOff,
  CheckCircle,
  Copy,
  Check,
  AlertCircle,
  Phone,
  Mail,
  User,
  Lock,
  Sparkles,
} from 'lucide-react';
import { isValidPhoneNumber, isValidEmail } from '../../../utils/validation';

export interface StaffRoleOption {
  name: string;
  value: string;
  code: string;
  color: string;
  desc: string;
  icon: React.ElementType;
}

export const STAFF_ROLES: StaffRoleOption[] = [
  {
    name: 'Dispatcher',
    value: 'ROLE_DISPATCHER',
    code: 'DP-02',
    color: '#0D9488',
    desc: 'Route creation, vehicle allocation, driver assignment & live telematics dispatch.',
    icon: Navigation,
  },
  {
    name: 'Safety Officer',
    value: 'ROLE_SAFETY_OFFICER',
    code: 'SO-03',
    color: '#E11D48',
    desc: 'Incident response, driver safety telemetry, distress SOS auditing & vehicle compliance.',
    icon: Shield,
  },
  {
    name: 'Financial Analyst',
    value: 'ROLE_FINANCE',
    code: 'FA-04',
    color: '#7C3AED',
    desc: 'Fleet fuel expense tracking, logistics cost reconciliation & profitability reporting.',
    icon: TrendingUp,
  },
  {
    name: 'Fleet Manager',
    value: 'ROLE_MANAGER',
    code: 'FM-01',
    color: '#D97706',
    desc: 'Full operations oversight, staff onboarding, geofence rules & executive authorization.',
    icon: Users,
  },
];

interface DemoAddStaffScreenProps {
  onNavigate?: (route: string) => void;
}

export const DemoAddStaffScreen: React.FC<DemoAddStaffScreenProps> = ({ onNavigate }) => {
  const [selectedRole, setSelectedRole] = useState<string>('ROLE_DISPATCHER');
  const [name, setName] = useState('');
  const [phoneNo, setPhoneNo] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [registeredStaff, setRegisteredStaff] = useState<{
    name: string;
    email: string;
    phoneNo: string;
    role: string;
    roleName: string;
    tempPassword?: string;
  } | null>(null);

  const activeRoleConfig = STAFF_ROLES.find((r) => r.value === selectedRole) || STAFF_ROLES[0];

  const handleGeneratePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let generated = 'Demo-';
    for (let i = 0; i < 8; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(generated);
    setShowPassword(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phoneNo.trim();
    const trimmedPassword = password.trim();

    if (!trimmedName || trimmedName.length < 2) {
      setError('Please enter a valid full name (at least 2 characters).');
      return;
    }

    if (!trimmedPhone) {
      setError('Phone number is required.');
      return;
    }
    if (!isValidPhoneNumber(trimmedPhone)) {
      setError('Please enter a valid 10-digit phone number (e.g. 9876543210 or +91 98765 43210).');
      return;
    }

    if (!trimmedEmail) {
      setError('Email address is required.');
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!trimmedPassword || trimmedPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setRegisteredStaff({
        name: trimmedName,
        email: trimmedEmail,
        phoneNo: trimmedPhone,
        role: selectedRole,
        roleName: activeRoleConfig.name,
        tempPassword: trimmedPassword,
      });

      setName('');
      setPhoneNo('');
      setEmail('');
      setPassword('');
      setSelectedRole('ROLE_DISPATCHER');
      setLoading(false);
    }, 400);
  };

  const handleCopyCredentials = () => {
    if (!registeredStaff) return;
    const creds = `LogiSphere AI Staff Credentials\nName: ${registeredStaff.name}\nRole: ${registeredStaff.roleName}\nEmail: ${registeredStaff.email}\nPhone: ${registeredStaff.phoneNo}\nPassword: ${registeredStaff.tempPassword || '***'}`;
    navigator.clipboard.writeText(creds);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: '#FEF3C7',
                color: '#B45309',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UserPlus size={20} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                Register Staff Member
              </h1>
              <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: '0.15rem 0 0 0' }}>
                Add a new dispatcher, safety officer, or manager to LogiSphere AI.
              </p>
            </div>
          </div>
        </div>

        {onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate('drivers')}
            className="btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.82rem' }}
          >
            <Users size={15} />
            <span>View Driver Operations</span>
          </button>
        )}
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left Card: Registration Form */}
        <div className="app-card" style={{ padding: '1.5rem', margin: 0 }}>
          <div style={{ marginBottom: '1.25rem', borderBottom: '1px solid #E5E7EB', paddingBottom: '0.75rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', margin: 0 }}>
              Staff Member Details
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#6B7280', margin: '0.2rem 0 0 0' }}>
              Fill in personal information, authentication credentials, and operational role.
            </p>
          </div>

          {error && (
            <div
              style={{
                background: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: 8,
                padding: '0.75rem 1rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                color: '#B91C1C',
                fontSize: '0.85rem',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            {/* Full Name */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Full Name <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <User size={16} color="#9CA3AF" style={{ position: 'absolute', left: 12, pointerEvents: 'none' }} />
                <input
                  type="text"
                  placeholder="e.g. Marcus Vance"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError(null);
                  }}
                  disabled={loading}
                  style={{
                    width: '100%',
                    height: 42,
                    padding: '0 0.85rem 0 2.35rem',
                    borderRadius: 8,
                    border: '1px solid #D1D5DB',
                    fontSize: '0.875rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: '#FFFFFF',
                  }}
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151' }}>
                  Phone Number <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <span style={{ fontSize: '0.72rem', color: '#6B7280' }}>10-digit mobile number</span>
              </div>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Phone size={16} color="#9CA3AF" style={{ position: 'absolute', left: 12, pointerEvents: 'none' }} />
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={phoneNo}
                  onChange={(e) => {
                    setPhoneNo(e.target.value);
                    if (error) setError(null);
                  }}
                  disabled={loading}
                  style={{
                    width: '100%',
                    height: 42,
                    padding: '0 0.85rem 0 2.35rem',
                    borderRadius: 8,
                    border: '1px solid #D1D5DB',
                    fontSize: '0.875rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: '#FFFFFF',
                  }}
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Email Address <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Mail size={16} color="#9CA3AF" style={{ position: 'absolute', left: 12, pointerEvents: 'none' }} />
                <input
                  type="email"
                  placeholder="e.g. marcus.vance@logisphere.ai"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  disabled={loading}
                  style={{
                    width: '100%',
                    height: 42,
                    padding: '0 0.85rem 0 2.35rem',
                    borderRadius: 8,
                    border: '1px solid #D1D5DB',
                    fontSize: '0.875rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: '#FFFFFF',
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151' }}>
                  Temporary Password <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#D97706',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    padding: 0,
                  }}
                >
                  <Sparkles size={12} />
                  <span>Generate</span>
                </button>
              </div>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Lock size={16} color="#9CA3AF" style={{ position: 'absolute', left: 12, pointerEvents: 'none' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  disabled={loading}
                  style={{
                    width: '100%',
                    height: 42,
                    padding: '0 2.5rem 0 2.35rem',
                    borderRadius: 8,
                    border: '1px solid #D1D5DB',
                    fontSize: '0.875rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: '#FFFFFF',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 10,
                    background: 'none',
                    border: 'none',
                    color: '#9CA3AF',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 4,
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{
                height: 44,
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                fontSize: '0.9rem',
                fontWeight: 700,
                marginTop: '0.5rem',
              }}
            >
              <UserPlus size={16} />
              <span>{loading ? 'Registering Staff Member...' : 'Register Staff Member'}</span>
            </button>
          </form>
        </div>

        {/* Right Card: Role Selection & Scope */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="app-card" style={{ padding: '1.5rem', margin: 0 }}>
            <div style={{ marginBottom: '1rem', borderBottom: '1px solid #E5E7EB', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: 0 }}>
                Select Operational Role
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#6B7280', margin: '0.2rem 0 0 0' }}>
                Select the organizational role and permission scope to grant this staff member.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {STAFF_ROLES.map((role) => {
                const isSelected = selectedRole === role.value;
                const IconComponent = role.icon;
                return (
                  <div
                    key={role.value}
                    onClick={() => {
                      setSelectedRole(role.value);
                      if (error) setError(null);
                    }}
                    style={{
                      border: `1.5px solid ${isSelected ? role.color : '#E5E7EB'}`,
                      background: isSelected ? `${role.color}0D` : '#FFFFFF',
                      borderRadius: 10,
                      padding: '0.85rem 1rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.85rem',
                    }}
                  >
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 8,
                        background: `${role.color}1A`,
                        color: role.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      <IconComponent size={18} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827' }}>
                          {role.name}
                        </span>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            padding: '0.15rem 0.45rem',
                            borderRadius: 4,
                            background: `${role.color}15`,
                            color: role.color,
                            letterSpacing: '0.02em',
                          }}
                        >
                          {role.code}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.78rem', color: '#4B5563', margin: '0.25rem 0 0 0', lineHeight: 1.4 }}>
                        {role.desc}
                      </p>
                    </div>

                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        border: `2px solid ${isSelected ? role.color : '#D1D5DB'}`,
                        background: isSelected ? role.color : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: 4,
                      }}
                    >
                      {isSelected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Role Security Note */}
          <div
            style={{
              background: '#F9FAFB',
              border: '1px solid #E5E7EB',
              borderRadius: 10,
              padding: '1rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
            }}
          >
            <Shield size={18} color="#6B7280" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: '0.78rem', color: '#4B5563', lineHeight: 1.45 }}>
              <strong>Role Governance Policy:</strong> Drivers are onboarded with commercial driving licenses via{' '}
              <span style={{ color: '#D97706', fontWeight: 600 }}>Driver Operations</span>. Staff accounts have login credentials created with immediate role-based access control (RBAC).
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal / Credentials Dialog */}
      {registeredStaff && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div
            className="modal-container"
            style={{
              maxWidth: 460,
              width: '100%',
              borderRadius: 16,
              background: '#FFFFFF',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              padding: '1.75rem',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: '#D1FAE5',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 0.85rem auto',
                }}
              >
                <CheckCircle size={28} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                Staff Member Registered
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: '0.25rem 0 0 0' }}>
                Account created and authorized under your commercial fleet organization.
              </p>
            </div>

            {/* Credentials Card */}
            <div
              style={{
                background: '#F9FAFB',
                border: '1px solid #E5E7EB',
                borderRadius: 10,
                padding: '1rem',
                marginBottom: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                <span style={{ color: '#6B7280', fontWeight: 600 }}>Staff Name:</span>
                <span style={{ color: '#111827', fontWeight: 700 }}>{registeredStaff.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                <span style={{ color: '#6B7280', fontWeight: 600 }}>Assigned Role:</span>
                <span
                  style={{
                    background: `${activeRoleConfig.color}15`,
                    color: activeRoleConfig.color,
                    padding: '0.1rem 0.5rem',
                    borderRadius: 4,
                    fontWeight: 700,
                  }}
                >
                  {registeredStaff.roleName}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                <span style={{ color: '#6B7280', fontWeight: 600 }}>Login Email:</span>
                <span style={{ color: '#111827', fontWeight: 700 }}>{registeredStaff.email}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                <span style={{ color: '#6B7280', fontWeight: 600 }}>Mobile Number:</span>
                <span style={{ color: '#111827', fontWeight: 700 }}>{registeredStaff.phoneNo}</span>
              </div>
              {registeredStaff.tempPassword && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', borderTop: '1px solid #E5E7EB', paddingTop: '0.5rem' }}>
                  <span style={{ color: '#6B7280', fontWeight: 600 }}>Password:</span>
                  <span style={{ color: '#D97706', fontWeight: 800, fontFamily: 'monospace' }}>{registeredStaff.tempPassword}</span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <button
                type="button"
                onClick={handleCopyCredentials}
                className="btn-secondary"
                style={{ width: '100%', height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem' }}
              >
                {copied ? <Check size={15} color="#059669" /> : <Copy size={15} />}
                <span>{copied ? 'Credentials Copied!' : 'Copy Staff Credentials'}</span>
              </button>

              <button
                type="button"
                onClick={() => setRegisteredStaff(null)}
                className="btn-primary"
                style={{ width: '100%', height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                Register Another Staff Member
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DemoAddStaffScreen;
