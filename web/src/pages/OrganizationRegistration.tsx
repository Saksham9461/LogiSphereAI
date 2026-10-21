import React, { useState } from 'react';
import {
  Building2,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Phone,
  Shield,
  Loader2,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { PlaceAutocompleteInput } from '../components/PlaceAutocompleteInput';
import { registerOrganization } from '../services/organizationService';
import type { OrgRegistrationPayload, OrgRegistrationResponseData } from '../types';

interface OrganizationRegistrationProps {
  onSuccess: (data: OrgRegistrationResponseData) => void;
  onNavigateStatus?: (prefillSlug?: string) => void;
  onNavigateDashboard?: () => void;
}

export const OrganizationRegistration: React.FC<OrganizationRegistrationProps> = ({
  onSuccess,
}) => {
  // Company Information State
  const [organizationName, setOrganizationName] = useState('');
  const [slug, setSlug] = useState('');
  const [formattedAddress, setFormattedAddress] = useState('');
  const [placeId, setPlaceId] = useState('');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  // Initial Manager Account State
  const [managerName, setManagerName] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [managerPhone, setManagerPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Form Validation & Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isDuplicateEmail, setIsDuplicateEmail] = useState(false);

  // Helper to slugify company name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setOrganizationName(val);

    // Auto-update slug if user hasn't explicitly customized it
    const generatedSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setSlug(generatedSlug);

    if (fieldErrors.organizationName) {
      setFieldErrors(prev => ({ ...prev, organizationName: '' }));
    }
  };

  // Address place selection handler
  const handlePlaceSelect = (details: {
    placeId: string;
    address: string;
    latitude: number;
    longitude: number;
  }) => {
    setFormattedAddress(details.address);
    setPlaceId(details.placeId);
    setCoords({
      latitude: details.latitude,
      longitude: details.longitude,
    });

    if (fieldErrors.formattedAddress) {
      setFieldErrors(prev => ({ ...prev, formattedAddress: '' }));
    }
  };

  // Clear previous place ID and coordinates when address input changes
  const handleClearPlace = () => {
    setPlaceId('');
    setCoords(null);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!organizationName.trim()) {
      errors.organizationName = 'Company name is required';
    } else if (organizationName.trim().length < 2) {
      errors.organizationName = 'Company name must be at least 2 characters';
    }

    if (!formattedAddress.trim()) {
      errors.formattedAddress = 'Official company address is required';
    } else if (
      !coords ||
      typeof coords.latitude !== 'number' ||
      typeof coords.longitude !== 'number' ||
      !isFinite(coords.latitude) ||
      !isFinite(coords.longitude) ||
      (coords.latitude === 0 && coords.longitude === 0) ||
      coords.latitude < -90 ||
      coords.latitude > 90 ||
      coords.longitude < -180 ||
      coords.longitude > 180
    ) {
      errors.formattedAddress =
        'Please select a verified address from the suggestions dropdown to resolve facility coordinates. Coordinates cannot be (0, 0) or unresolved.';
    }

    if (!managerName.trim()) {
      errors.managerName = 'Manager full name is required';
    } else if (managerName.trim().length < 2) {
      errors.managerName = 'Manager name must be at least 2 characters';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!managerEmail.trim()) {
      errors.managerEmail = 'Work email is required';
    } else if (!emailRegex.test(managerEmail.trim())) {
      errors.managerEmail = 'Please enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters long';
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setServerError(null);
    setIsDuplicateEmail(false);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    const payload: OrgRegistrationPayload = {
      organizationName: organizationName.trim(),
      name: organizationName.trim(),
      slug: slug.trim() || undefined,
      formattedAddress: formattedAddress.trim(),
      address: formattedAddress.trim(),
      googlePlacesId: placeId || undefined,
      placeId: placeId || undefined,
      latitude: coords?.latitude !== undefined ? coords.latitude : undefined,
      longitude: coords?.longitude !== undefined ? coords.longitude : undefined,
      managerName: managerName.trim(),
      managerEmail: managerEmail.trim().toLowerCase(),
      password,
      managerPassword: password,
      managerPhone: managerPhone.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      contactEmail: contactEmail.trim().toLowerCase() || undefined,
    };

    try {
      const response = await registerOrganization(payload);
      if (response && response.success && response.data) {
        onSuccess(response.data);
      } else {
        setServerError(response?.message || 'Failed to submit registration. Please try again.');
      }
    } catch (err: any) {
      console.error('[Registration] Submission error:', err);
      const is409 = err.status === 409 || err.message?.includes('already registered');
      if (is409) {
        setIsDuplicateEmail(true);
        setServerError(
          'An account with this email is already registered as an organization manager. Please check your existing application status or log in.'
        );
      } else {
        setServerError(err.message || 'Registration failed. Please check your connection and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="registration-container">
      {/* Page Header */}
      <div className="reg-header">
        <div className="reg-badge-row">
          <span className="reg-badge">
            <Building2 size={12} />
            Multi-Tenant Onboarding
          </span>
          <span className="reg-badge" style={{ background: 'var(--color-teal-light)', color: '#0F766E', borderColor: 'rgba(20, 184, 166, 0.3)' }}>
            Step 1 of 2
          </span>
        </div>

        <h1 className="reg-title">Register Your Organization</h1>
        <p className="reg-subtitle">
          Onboard your fleet company to LogiSphere AI. Once registered, your application will be securely
          reviewed by platform administration before business fleet operations are activated.
        </p>
      </div>

      {/* Global Server Error / Conflict Banner */}
      {serverError && (
        <div className="reg-alert error">
          <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong>Registration Alert:</strong> {serverError}
            {isDuplicateEmail && (
              <div style={{ marginTop: 8, fontSize: '0.85rem', color: '#991B1B' }}>
                Please sign in with your credentials once approved, or contact support if your application is pending review.
              </div>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* SECTION 1: Company / Organization Details */}
        <div className="reg-card">
          <div className="reg-card-header">
            <div className="reg-card-icon">
              <Building2 size={22} />
            </div>
            <div>
              <h2 className="reg-card-title">1. Organization Details</h2>
              <p className="reg-card-desc">Official company identity and operating headquarters</p>
            </div>
          </div>

          <div className="reg-grid-2">
            {/* Organization Name */}
            <div className="reg-form-group">
              <label className="reg-label" htmlFor="org-name-input">
                <span>
                  Company / Organization Name <span className="reg-label-required">*</span>
                </span>
              </label>
              <div className="reg-input-wrapper">
                <span className="reg-input-icon">
                  <Building2 size={18} />
                </span>
                <input
                  id="org-name-input"
                  type="text"
                  className={`reg-input with-left-icon ${fieldErrors.organizationName ? 'error' : ''}`}
                  placeholder="e.g. Apex Logistics Freight Ltd"
                  value={organizationName}
                  onChange={handleNameChange}
                  disabled={isSubmitting}
                  autoComplete="organization"
                  required
                />
              </div>
              {fieldErrors.organizationName && (
                <span className="reg-error-text">{fieldErrors.organizationName}</span>
              )}
            </div>

            {/* Organization Slug Preview */}
            <div className="reg-form-group">
              <label className="reg-label" htmlFor="org-slug-input">
                <span>URL Slug Identifier</span>
                <span className="reg-label-hint">For status lookup</span>
              </label>
              <div className="reg-input-wrapper">
                <input
                  id="org-slug-input"
                  type="text"
                  className="reg-input"
                  placeholder="e.g. apex-logistics"
                  value={slug}
                  onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^\w-]/g, ''))}
                  disabled={isSubmitting}
                  style={{ fontFamily: 'monospace' }}
                />
              </div>
              <span className="reg-helper-text">
                Used to look up review status: <code>/api/org/status/{slug || 'your-slug'}</code>
              </span>
            </div>
          </div>

          {/* Official Address with Google Places Autocomplete */}
          <PlaceAutocompleteInput
            value={formattedAddress}
            onChange={setFormattedAddress}
            onPlaceSelect={handlePlaceSelect}
            onClearPlace={handleClearPlace}
            selectedPlaceId={placeId}
            selectedCoords={coords}
            error={fieldErrors.formattedAddress}
            disabled={isSubmitting}
          />

          <div className="reg-grid-2" style={{ marginTop: 16 }}>
            {/* Contact Email */}
            <div className="reg-form-group">
              <label className="reg-label" htmlFor="contact-email-input">
                <span>Company Contact Email</span>
                <span className="reg-label-hint">Optional</span>
              </label>
              <div className="reg-input-wrapper">
                <span className="reg-input-icon">
                  <Mail size={18} />
                </span>
                <input
                  id="contact-email-input"
                  type="email"
                  className="reg-input with-left-icon"
                  placeholder="contact@company.com"
                  value={contactEmail}
                  onChange={e => setContactEmail(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Contact Phone */}
            <div className="reg-form-group">
              <label className="reg-label" htmlFor="contact-phone-input">
                <span>Company Contact Phone</span>
                <span className="reg-label-hint">Optional</span>
              </label>
              <div className="reg-input-wrapper">
                <span className="reg-input-icon">
                  <Phone size={18} />
                </span>
                <input
                  id="contact-phone-input"
                  type="tel"
                  className="reg-input with-left-icon"
                  placeholder="+91 98765 43210"
                  value={contactPhone}
                  onChange={e => setContactPhone(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: Initial Manager Account Details */}
        <div className="reg-card">
          <div className="reg-card-header">
            <div className="reg-card-icon" style={{ background: 'var(--color-violet-light)', color: 'var(--color-violet)' }}>
              <User size={22} />
            </div>
            <div>
              <h2 className="reg-card-title">2. Initial Fleet Manager Details</h2>
              <p className="reg-card-desc">The designated primary administrator for your organization</p>
            </div>
          </div>

          <div className="reg-grid-2">
            {/* Manager Name */}
            <div className="reg-form-group">
              <label className="reg-label" htmlFor="manager-name-input">
                <span>
                  Manager Full Name <span className="reg-label-required">*</span>
                </span>
              </label>
              <div className="reg-input-wrapper">
                <span className="reg-input-icon">
                  <User size={18} />
                </span>
                <input
                  id="manager-name-input"
                  type="text"
                  className={`reg-input with-left-icon ${fieldErrors.managerName ? 'error' : ''}`}
                  placeholder="e.g. Zack Evans"
                  value={managerName}
                  onChange={e => {
                    setManagerName(e.target.value);
                    if (fieldErrors.managerName) setFieldErrors(prev => ({ ...prev, managerName: '' }));
                  }}
                  disabled={isSubmitting}
                  autoComplete="name"
                  required
                />
              </div>
              {fieldErrors.managerName && (
                <span className="reg-error-text">{fieldErrors.managerName}</span>
              )}
            </div>

            {/* Manager Work Email */}
            <div className="reg-form-group">
              <label className="reg-label" htmlFor="manager-email-input">
                <span>
                  Work Email <span className="reg-label-required">*</span>
                </span>
                <span className="reg-label-hint">Used for sign-in</span>
              </label>
              <div className="reg-input-wrapper">
                <span className="reg-input-icon">
                  <Mail size={18} />
                </span>
                <input
                  id="manager-email-input"
                  type="email"
                  className={`reg-input with-left-icon ${fieldErrors.managerEmail ? 'error' : ''}`}
                  placeholder="manager@company.com"
                  value={managerEmail}
                  onChange={e => {
                    setManagerEmail(e.target.value);
                    if (fieldErrors.managerEmail) setFieldErrors(prev => ({ ...prev, managerEmail: '' }));
                  }}
                  disabled={isSubmitting}
                  autoComplete="email"
                  required
                />
              </div>
              {fieldErrors.managerEmail && (
                <span className="reg-error-text">{fieldErrors.managerEmail}</span>
              )}
            </div>
          </div>

          <div className="reg-grid-2">
            {/* Manager Phone */}
            <div className="reg-form-group">
              <label className="reg-label" htmlFor="manager-phone-input">
                <span>Manager Mobile Phone</span>
                <span className="reg-label-hint">Optional</span>
              </label>
              <div className="reg-input-wrapper">
                <span className="reg-input-icon">
                  <Phone size={18} />
                </span>
                <input
                  id="manager-phone-input"
                  type="tel"
                  className="reg-input with-left-icon"
                  placeholder="+91 98765 00000"
                  value={managerPhone}
                  onChange={e => setManagerPhone(e.target.value)}
                  disabled={isSubmitting}
                  autoComplete="tel"
                />
              </div>
            </div>

            {/* Password */}
            <div className="reg-form-group">
              <label className="reg-label" htmlFor="manager-password-input">
                <span>
                  Account Password <span className="reg-label-required">*</span>
                </span>
                <span className="reg-label-hint">Min 8 characters</span>
              </label>
              <div className="reg-input-wrapper">
                <span className="reg-input-icon">
                  <Lock size={18} />
                </span>
                <input
                  id="manager-password-input"
                  type={showPassword ? 'text' : 'password'}
                  className={`reg-input with-left-icon with-right-icon ${fieldErrors.password ? 'error' : ''}`}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: '' }));
                  }}
                  disabled={isSubmitting}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="reg-password-toggle"
                  onClick={() => setShowPassword(prev => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {fieldErrors.password && (
                <span className="reg-error-text">{fieldErrors.password}</span>
              )}
            </div>
          </div>

          {/* Confirm Password */}
          <div className="reg-form-group" style={{ maxWidth: 400 }}>
            <label className="reg-label" htmlFor="confirm-password-input">
              <span>
                Confirm Password <span className="reg-label-required">*</span>
              </span>
            </label>
            <div className="reg-input-wrapper">
              <span className="reg-input-icon">
                <Lock size={18} />
              </span>
              <input
                id="confirm-password-input"
                type={showPassword ? 'text' : 'password'}
                className={`reg-input with-left-icon ${fieldErrors.confirmPassword ? 'error' : ''}`}
                placeholder="••••••••••••"
                value={confirmPassword}
                onChange={e => {
                  setConfirmPassword(e.target.value);
                  if (fieldErrors.confirmPassword) setFieldErrors(prev => ({ ...prev, confirmPassword: '' }));
                }}
                disabled={isSubmitting}
                autoComplete="new-password"
                required
              />
            </div>
            {fieldErrors.confirmPassword && (
              <span className="reg-error-text">{fieldErrors.confirmPassword}</span>
            )}
          </div>
        </div>

        {/* Security & Governance Notice Box */}
        <div className="reg-notice-box">
          <Shield size={20} style={{ color: 'var(--color-amber)', flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong>Zero-Trust Approval Workflow:</strong> Submitting this registration creates an organization and
            initial manager membership in strictly <strong>pending status</strong>. Business data, vehicle registration,
            and dispatching remain locked until approved by a platform administrator.
          </div>
        </div>

        {/* Submit Actions */}
        <div className="reg-actions">
          <button
            type="submit"
            className="reg-submit-btn"
            disabled={isSubmitting}
            id="register-submit-btn"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="spin" />
                Submitting Application…
              </>
            ) : (
              <>
                <CheckCircle size={18} />
                Submit Organization Registration
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
