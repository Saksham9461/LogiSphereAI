// ==============================================================================
// LogiSphere AI Demo — Driver Operations Management Screen
// 100% Symmetrical with DriversView.tsx in UI, theme, modal, and data tables
// ==============================================================================

import React, { useState, useMemo } from 'react';
import {
  UserPlus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  X,
  Phone,
  Mail,
  ShieldCheck,
  Copy,
  Check,
} from 'lucide-react';
import { MOCK_DRIVERS } from '../data/drivers.mock';
import type { Driver } from '../../../types';
import { isValidPhoneNumber } from '../../../utils/validation';

interface DemoDriversScreenProps {
  onNavigate?: (route: string) => void;
}

export const DemoDriversScreen: React.FC<DemoDriversScreenProps> = ({ onNavigate }) => {
  const [drivers, setDrivers] = useState<Driver[]>(() => [...MOCK_DRIVERS]);
  const [search, setSearch] = useState('');

  // Modal State
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [activeDriver, setActiveDriver] = useState<Driver | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [newDriverCredentials, setNewDriverCredentials] = useState<{ email: string; temporaryPassword?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNo, setPhoneNo] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [driverScore, setDriverScore] = useState('95');
  const [status, setStatus] = useState('AVAILABLE');

  const openCreateModal = () => {
    setActiveDriver(null);
    setName('');
    setEmail('');
    setPhoneNo('');
    setLicenseNumber('');
    setDriverScore('95');
    setStatus('AVAILABLE');
    setFormError(null);
    setNewDriverCredentials(null);
    setCopied(false);
    setModalMode('create');
  };

  const openEditModal = (drv: Driver) => {
    setActiveDriver(drv);
    setName(drv.name || '');
    setEmail(drv.email || '');
    setPhoneNo(drv.phoneNo || '');
    setLicenseNumber(drv.licenseNumber || '');
    setDriverScore(String(drv.driverScore || 95));
    setStatus(drv.status || 'AVAILABLE');
    setFormError(null);
    setNewDriverCredentials(null);
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setActiveDriver(null);
    setFormError(null);
    setNewDriverCredentials(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Driver name is required');
      return;
    }
    if (!email.trim() && modalMode === 'create') {
      setFormError('Email address is required for driver login');
      return;
    }
    if (phoneNo.trim() && !isValidPhoneNumber(phoneNo)) {
      setFormError('Please enter a valid 10-digit phone number (e.g. 9876543210 or +91 98765 43210)');
      return;
    }

    if (modalMode === 'create') {
      const tempPass = `Demo@${Math.floor(1000 + Math.random() * 9000)}`;
      const newD: Driver = {
        id: `drv-demo-${Date.now()}`,
        driverID: `drv-demo-${Date.now()}`,
        userID: `drv-demo-${Date.now()}`,
        name: name.trim(),
        email: email.trim(),
        phoneNo: phoneNo.trim() || undefined,
        licenseNumber: licenseNumber.trim() || undefined,
        driverScore: Number(driverScore) || 95,
        status,
        role: 'ROLE_DRIVER',
      };
      setDrivers((prev) => [newD, ...prev]);
      setNewDriverCredentials({
        email: email.trim(),
        temporaryPassword: tempPass,
      });
    } else if (modalMode === 'edit' && activeDriver) {
      setDrivers((prev) =>
        prev.map((d) =>
          d.id === activeDriver.id
            ? {
                ...d,
                name: name.trim(),
                phoneNo: phoneNo.trim() || undefined,
                licenseNumber: licenseNumber.trim() || undefined,
                driverScore: Number(driverScore) || 95,
                status,
              }
            : d
        )
      );
      closeModal();
    }
  };

  const handleDelete = (drv: Driver) => {
    const id = drv.driverID || drv.userID || drv.id;
    if (window.confirm(`Are you sure you want to deactivate driver "${drv.name || id}"?`)) {
      setDrivers((prev) => prev.filter((d) => (d.driverID || d.userID || d.id) !== id));
    }
  };

  const copyPassword = () => {
    if (newDriverCredentials?.temporaryPassword) {
      navigator.clipboard.writeText(newDriverCredentials.temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const filteredDrivers = useMemo(() => {
    return drivers.filter((d) => {
      return (
        (d.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (d.email || '').toLowerCase().includes(search.toLowerCase()) ||
        (d.phoneNo || '').toLowerCase().includes(search.toLowerCase()) ||
        (d.licenseNumber || '').toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [drivers, search]);

  return (
    <div>
      {/* Top Action Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#111827', margin: 0 }}>
            Driver Operations Roster
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: '0.25rem 0 0 0' }}>
            Registered commercial drivers, credentials, safety scores, and duty status.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={() => setDrivers([...MOCK_DRIVERS])}
            className="btn-secondary"
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
          >
            <RefreshCw size={14} />
            <span>Reset Demo Data</span>
          </button>

          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('add-staff')}
              className="btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
            >
              <UserPlus size={16} />
              <span>Add Staff</span>
            </button>
          )}

          <button type="button" onClick={openCreateModal} className="btn-primary">
            <UserPlus size={16} />
            <span>Enroll Driver</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="app-card" style={{ padding: '0.85rem 1rem', marginBottom: '1.25rem' }}>
        <div style={{ position: 'relative', width: '100%' }}>
          <Search size={16} color="#9CA3AF" style={{ position: 'absolute', left: 12, top: 11 }} />
          <input
            type="text"
            placeholder="Search by driver name, email, phone number, or commercial license..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem 0.5rem 2.25rem',
              borderRadius: 8,
              border: '1px solid #D1D5DB',
              fontSize: '0.875rem',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Drivers Table */}
      <div className="app-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="data-table-container" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Driver Name</th>
                <th>Contact Details</th>
                <th>Commercial CDL / License</th>
                <th>Safety Score</th>
                <th>Duty Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDrivers.length > 0 ? (
                filteredDrivers.map((drv) => (
                  <tr key={drv.id || drv.driverID}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: '#DBEAFE',
                            color: '#1E40AF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            flexShrink: 0,
                          }}
                        >
                          {drv.name ? drv.name.slice(0, 2).toUpperCase() : 'DR'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span>{drv.name}</span>
                            <ShieldCheck size={14} color="#10B981" />
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                            {drv.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: '0.8rem' }}>
                        {drv.phoneNo ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#374151' }}>
                            <Phone size={12} color="#6B7280" />
                            <span>{drv.phoneNo}</span>
                          </div>
                        ) : (
                          <span style={{ color: '#9CA3AF' }}>No phone listed</span>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#6B7280' }}>
                          <Mail size={12} color="#6B7280" />
                          <span>{drv.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="ops-mono" style={{ fontWeight: 700, color: '#1F2937' }}>
                      {drv.licenseNumber || 'CDL-PENDING'}
                    </td>
                    <td>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '0.2rem 0.55rem',
                            borderRadius: 6,
                            fontSize: '0.8rem',
                            fontWeight: 800,
                            background: (drv.driverScore || 95) >= 90 ? '#D1FAE5' : (drv.driverScore || 95) >= 75 ? '#FEF3C7' : '#FEE2E2',
                            color: (drv.driverScore || 95) >= 90 ? '#065F46' : (drv.driverScore || 95) >= 75 ? '#B45309' : '#991B1B',
                          }}
                        >
                          {drv.driverScore || 95}%
                        </span>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          drv.status === 'AVAILABLE'
                            ? 'badge-success'
                            : drv.status === 'ON_TRIP'
                            ? 'badge-info'
                            : 'badge-neutral'
                        }`}
                      >
                        {drv.status === 'AVAILABLE' ? 'Available' : drv.status === 'ON_TRIP' ? 'On Trip' : 'Off Duty'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                        <button
                          type="button"
                          onClick={() => openEditModal(drv)}
                          className="btn-secondary"
                          style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
                          title="Edit Driver"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(drv)}
                          className="btn-secondary"
                          style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', color: '#EF4444' }}
                          title="Deactivate Driver"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem 1rem', color: '#6B7280' }}>
                    No commercial drivers found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enroll / Edit Driver Modal */}
      {modalMode && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: 520 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                {modalMode === 'create' ? 'Enroll New Fleet Driver' : 'Edit Driver Profile'}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Generated Credentials Alert Banner */}
            {newDriverCredentials && (
              <div
                style={{
                  background: '#FEF3C7',
                  border: '1.5px solid #FDE68A',
                  padding: '1rem',
                  borderRadius: 8,
                  marginBottom: '1.25rem',
                }}
              >
                <div style={{ fontWeight: 800, color: '#92400E', fontSize: '0.9rem', marginBottom: 4 }}>
                  Driver Enrolled Successfully
                </div>
                <p style={{ fontSize: '0.8rem', color: '#B45309', margin: '0 0 0.75rem 0', lineHeight: 1.4 }}>
                  A one-time temporary password was generated. Copy and provide these credentials to the driver:
                </p>

                <div style={{ background: '#FFFFFF', padding: '0.65rem 0.85rem', borderRadius: 6, border: '1px solid #FCD34D', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <div>
                    <div>Email: <strong>{newDriverCredentials.email}</strong></div>
                    <div style={{ marginTop: 2 }}>Temporary Password: <strong className="ops-mono">{newDriverCredentials.temporaryPassword}</strong></div>
                  </div>
                  <button
                    type="button"
                    onClick={copyPassword}
                    className="btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
                  >
                    {copied ? <Check size={13} color="#10B981" /> : <Copy size={13} />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <div style={{ marginTop: '0.75rem', textAlign: 'right' }}>
                  <button type="button" onClick={closeModal} className="btn-primary" style={{ fontSize: '0.8rem' }}>
                    Done
                  </button>
                </div>
              </div>
            )}

            {!newDriverCredentials && (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {formError && (
                  <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', padding: '0.65rem 0.85rem', borderRadius: 8, color: '#991B1B', fontSize: '0.8rem' }}>
                    {formError}
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                    Full Legal Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Raj Patel"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.875rem' }}
                  />
                </div>

                {modalMode === 'create' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                      Work Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="driver@logisphere.demo"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.875rem' }}
                    />
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      placeholder="+91 98765 00000"
                      value={phoneNo}
                      onChange={(e) => setPhoneNo(e.target.value)}
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.875rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                      Commercial License (CDL)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. GJ0120180012345"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.875rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                      Telematics Safety Score (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={driverScore}
                      onChange={(e) => setDriverScore(e.target.value)}
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.875rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                      Duty Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.875rem', background: '#FFFFFF' }}
                    >
                      <option value="AVAILABLE">Available</option>
                      <option value="ON_TRIP">On Trip</option>
                      <option value="OFF_DUTY">Off Duty</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid #F3F4F6', paddingTop: '1rem' }}>
                  <button type="button" onClick={closeModal} className="btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    {modalMode === 'create' ? 'Enroll Driver' : 'Save Changes'}
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
