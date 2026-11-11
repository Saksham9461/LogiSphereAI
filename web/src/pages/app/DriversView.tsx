// ==============================================================================
// LogiSphere AI — Driver Operations Management View
// Driver enrollment, credential generation, and license monitoring backed by /api/user
// ==============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  UserPlus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  X,
  Phone,
  Mail,
  Award,
  ShieldCheck,
  Copy,
  Check,
} from 'lucide-react';
import { useAuth } from '../../stores/authStore';
import { fleetService } from '../../services/fleetService';
import type { Driver } from '../../types';
import { hasPermission, Permission } from '../../utils/rbac';
import { Loader } from '../../components/Loader';

export const DriversView: React.FC = () => {
  const { user } = useAuth();
  const canCreate = hasPermission(user?.role, Permission.DRIVERS_CREATE);
  const canUpdate = hasPermission(user?.role, Permission.DRIVERS_UPDATE);
  const canDelete = hasPermission(user?.role, Permission.DRIVERS_DEACTIVATE);

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Modal State
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [activeDriver, setActiveDriver] = useState<Driver | null>(null);
  const [submitting, setSubmitting] = useState(false);
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

  const fetchDrivers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fleetService.getDrivers();
      setDrivers(data);
    } catch (err: any) {
      console.error('Failed to load drivers', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to load drivers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
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

    setSubmitting(true);
    try {
      if (modalMode === 'create') {
        const res = await fleetService.registerDriver({
          name: name.trim(),
          email: email.trim(),
          phoneNo: phoneNo.trim() || undefined,
          licenseNumber: licenseNumber.trim() || undefined,
          driverScore: Number(driverScore) || 95,
          status,
        });

        // Display created credentials banner if returned
        const tempPass = res.credentials?.temporaryPassword || res.temporaryPassword;
        if (tempPass) {
          setNewDriverCredentials({
            email: email.trim(),
            temporaryPassword: tempPass,
          });
        } else {
          closeModal();
        }
      } else if (modalMode === 'edit' && activeDriver) {
        const id = activeDriver.driverID || activeDriver.userID || activeDriver.id;
        await fleetService.updateDriver(id, {
          name: name.trim(),
          phoneNo: phoneNo.trim() || undefined,
          licenseNumber: licenseNumber.trim() || undefined,
          driverScore: Number(driverScore) || 95,
          status,
        });
        closeModal();
      }
      await fetchDrivers();
    } catch (err: any) {
      console.error('Failed to save driver', err);
      setFormError(err?.response?.data?.message || err?.message || 'Failed to save driver');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (drv: Driver) => {
    const id = drv.driverID || drv.userID || drv.id;
    if (!window.confirm(`Are you sure you want to deactivate driver "${drv.name || id}"?`)) {
      return;
    }

    try {
      await fleetService.deleteDriver(id);
      await fetchDrivers();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to deactivate driver');
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
            onClick={fetchDrivers}
            className="btn-secondary"
            disabled={loading}
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          {canCreate && (
            <button type="button" onClick={openCreateModal} className="btn-primary">
              <UserPlus size={16} />
              <span>Enroll Driver</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', padding: '0.75rem 1rem', borderRadius: 8, color: '#991B1B', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

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
                {(canUpdate || canDelete) && <th style={{ textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredDrivers.length > 0 ? (
                filteredDrivers.map((drv) => (
                  <tr key={drv.id || drv.driverID}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            background: '#FEF3C7',
                            color: '#B45309',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                          }}
                        >
                          {drv.name ? drv.name.slice(0, 2).toUpperCase() : 'DR'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#111827' }}>{drv.name}</div>
                          <div className="ops-mono" style={{ fontSize: '0.72rem', color: '#6B7280' }}>
                            ID: {drv.driverID || drv.userID || drv.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', color: '#374151' }}>
                          <Mail size={12} color="#9CA3AF" />
                          <span>{drv.email}</span>
                        </div>
                        {drv.phoneNo && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: '#6B7280' }}>
                            <Phone size={11} color="#9CA3AF" />
                            <span>{drv.phoneNo}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="ops-mono" style={{ fontWeight: 600, color: '#1F2937' }}>
                      {drv.licenseNumber || 'Verified on File'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Award size={14} color="#10B981" />
                        <span style={{ fontWeight: 700, color: '#065F46' }}>
                          {drv.driverScore ?? 95}%
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-success">
                        {drv.status || 'AVAILABLE'}
                      </span>
                    </td>
                    {(canUpdate || canDelete) && (
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                          {canUpdate && (
                            <button
                              type="button"
                              onClick={() => openEditModal(drv)}
                              className="btn-secondary"
                              style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
                              title="Edit Driver"
                            >
                              <Edit2 size={13} />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDelete(drv)}
                              className="btn-secondary"
                              style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', color: '#EF4444' }}
                              title="Deactivate Driver"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '3.5rem 1rem', textAlign: 'center' }}>
                    <Loader inline text="Loading driver roster..." size="medium" />
                  </td>
                </tr>
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

      {/* Enroll / Edit Modal */}
      {modalMode && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                {modalMode === 'create' ? 'Enroll Commercial Driver' : 'Edit Driver Profile'}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Temporary Credentials Notification */}
            {newDriverCredentials && (
              <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '1rem', borderRadius: 8, marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#065F46', fontWeight: 700, marginBottom: '0.25rem' }}>
                  <ShieldCheck size={18} />
                  <span>Driver Account Created Successfully</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#047857', margin: '0 0 0.5rem 0' }}>
                  Provide these credentials to the driver for logging into the mobile application:
                </p>
                <div style={{ background: '#FFFFFF', padding: '0.5rem 0.75rem', borderRadius: 6, border: '1px solid #D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>Email: <strong>{newDriverCredentials.email}</strong></div>
                    <div className="ops-mono" style={{ fontSize: '0.85rem', color: '#111827', fontWeight: 700 }}>
                      Temp Password: {newDriverCredentials.temporaryPassword || 'LogiSphere@2026'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={copyPassword}
                    className="btn-secondary"
                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                  >
                    {copied ? <Check size={13} color="#10B981" /> : <Copy size={13} />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn-primary"
                  style={{ width: '100%', marginTop: '0.75rem', justifyContent: 'center' }}
                >
                  Done
                </button>
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
                    placeholder="e.g. John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.875rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required={modalMode === 'create'}
                    disabled={modalMode === 'edit'}
                    placeholder="driver@logisphere.ai"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.875rem', background: modalMode === 'edit' ? '#F9FAFB' : '#FFFFFF' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                      Phone Number
                    </label>
                    <input
                      type="text"
                      placeholder="+1 (555) 019-2834"
                      value={phoneNo}
                      onChange={(e) => setPhoneNo(e.target.value)}
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.875rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                      CDL / License Number
                    </label>
                    <input
                      type="text"
                      placeholder="DL-8829102-X"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.875rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                      Safety Score (0-100)
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
                  <button type="button" onClick={closeModal} className="btn-secondary" disabled={submitting}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={submitting}>
                    {submitting ? 'Saving...' : modalMode === 'create' ? 'Enroll Driver' : 'Save Changes'}
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
