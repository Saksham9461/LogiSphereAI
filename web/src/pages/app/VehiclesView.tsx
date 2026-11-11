// ==============================================================================
// LogiSphere AI — Fleet Vehicle Registry View
// Full CRUD operations backed by /api/vehicle endpoints with strict RBAC
// ==============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  Truck,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Edit2,
  Trash2,
  X,
} from 'lucide-react';
import { useAuth } from '../../stores/authStore';
import { fleetService } from '../../services/fleetService';
import type { Vehicle } from '../../types';
import { hasPermission, Permission } from '../../utils/rbac';
import { Loader } from '../../components/Loader';

export const VehiclesView: React.FC = () => {
  const { user } = useAuth();
  const canCreate = hasPermission(user?.role, Permission.VEHICLES_CREATE);
  const canUpdate = hasPermission(user?.role, Permission.VEHICLES_UPDATE);
  const canDelete = hasPermission(user?.role, Permission.VEHICLES_DEACTIVATE);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal State
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [activeVehicle, setActiveVehicle] = useState<Vehicle | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [type, setType] = useState('TRUCK');
  const [maxLoadCapacity, setMaxLoadCapacity] = useState('5000');
  const [odometer, setOdometer] = useState('0');
  const [acquisitionCost, setAcquisitionCost] = useState('45000');
  const [status, setStatus] = useState('AVAILABLE');

  const fetchVehicles = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fleetService.getVehicles();
      setVehicles(data);
    } catch (err: any) {
      console.error('Failed to load vehicles', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to load fleet vehicles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const openCreateModal = () => {
    setActiveVehicle(null);
    setName('');
    setRegistrationNumber('');
    setType('TRUCK');
    setMaxLoadCapacity('5000');
    setOdometer('0');
    setAcquisitionCost('45000');
    setStatus('AVAILABLE');
    setFormError(null);
    setModalMode('create');
  };

  const openEditModal = (veh: Vehicle) => {
    setActiveVehicle(veh);
    setName(veh.name || '');
    setRegistrationNumber(veh.registrationNumber || veh.reg || '');
    setType(veh.type || 'TRUCK');
    setMaxLoadCapacity(String(veh.maxLoadCapacity || veh.capacity || 0));
    setOdometer(String(veh.odometer || 0));
    setAcquisitionCost(String(veh.acquisitionCost || veh.cost || 0));
    setStatus(veh.status || 'AVAILABLE');
    setFormError(null);
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setActiveVehicle(null);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Vehicle name or model is required');
      return;
    }
    if (!registrationNumber.trim()) {
      setFormError('Registration / license plate number is required');
      return;
    }

    setSubmitting(true);
    try {
      if (modalMode === 'create') {
        await fleetService.registerVehicle({
          name: name.trim(),
          registrationNumber: registrationNumber.trim(),
          type,
          maxLoadCapacity: Number(maxLoadCapacity) || 0,
          odometer: Number(odometer) || 0,
          acquisitionCost: Number(acquisitionCost) || 0,
          status,
        });
      } else if (modalMode === 'edit' && activeVehicle) {
        const id = activeVehicle.vehicleID || activeVehicle.id;
        await fleetService.updateVehicle(id, {
          name: name.trim(),
          registrationNumber: registrationNumber.trim(),
          type,
          maxLoadCapacity: Number(maxLoadCapacity) || 0,
          odometer: Number(odometer) || 0,
          acquisitionCost: Number(acquisitionCost) || 0,
          status,
        });
      }
      closeModal();
      await fetchVehicles();
    } catch (err: any) {
      console.error('Failed to save vehicle', err);
      setFormError(err?.response?.data?.message || err?.message || 'Failed to save vehicle');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (veh: Vehicle) => {
    const id = veh.vehicleID || veh.id;
    if (!window.confirm(`Are you sure you want to deactivate vehicle "${veh.name || id}"?`)) {
      return;
    }

    try {
      await fleetService.deleteVehicle(id);
      await fetchVehicles();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to delete vehicle');
    }
  };

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const matchSearch =
        (v.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (v.registrationNumber || v.reg || '').toLowerCase().includes(search.toLowerCase()) ||
        (v.type || '').toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || v.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [vehicles, search, statusFilter]);

  const getStatusBadge = (st: string) => {
    switch (st?.toUpperCase()) {
      case 'AVAILABLE':
        return <span className="badge badge-success">Available</span>;
      case 'ON_TRIP':
        return <span className="badge badge-info">On Trip</span>;
      case 'IN_SHOP':
      case 'MAINTENANCE':
        return <span className="badge badge-danger">In Shop</span>;
      default:
        return <span className="badge badge-neutral">{st}</span>;
    }
  };

  return (
    <div>
      {/* Top Action Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#111827', margin: 0 }}>
            Fleet Vehicle Registry
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: '0.25rem 0 0 0' }}>
            Registered commercial vehicles, live operational statuses, and load capacities.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={fetchVehicles}
            className="btn-secondary"
            disabled={loading}
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          {canCreate && (
            <button type="button" onClick={openCreateModal} className="btn-primary">
              <Plus size={16} />
              <span>Add Vehicle</span>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
            <Search size={16} color="#9CA3AF" style={{ position: 'absolute', left: 12, top: 11 }} />
            <input
              type="text"
              placeholder="Search by vehicle name, plate number, or type..."
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={15} color="#6B7280" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: 8,
                border: '1px solid #D1D5DB',
                fontSize: '0.875rem',
                background: '#FFFFFF',
                outline: 'none',
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="ON_TRIP">On Trip</option>
              <option value="IN_SHOP">In Shop</option>
              <option value="MAINTENANCE">Maintenance</option>
            </select>
          </div>
        </div>
      </div>

      {/* Vehicles Table */}
      <div className="app-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="data-table-container" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Vehicle / Model</th>
                <th>Plate / Reg</th>
                <th>Class / Type</th>
                <th>Payload Capacity</th>
                <th>Odometer</th>
                <th>Acquisition Cost</th>
                <th>Operational Status</th>
                {(canUpdate || canDelete) && <th style={{ textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredVehicles.length > 0 ? (
                filteredVehicles.map((v) => (
                  <tr key={v.id || v.vehicleID}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div style={{ background: '#FEF3C7', padding: '0.4rem', borderRadius: 6 }}>
                          <Truck size={16} color="#B45309" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#111827' }}>{v.name}</div>
                          <div className="ops-mono" style={{ fontSize: '0.72rem', color: '#6B7280' }}>
                            ID: {v.vehicleID || v.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="ops-mono" style={{ fontWeight: 700, color: '#1F2937' }}>
                      {v.registrationNumber || v.reg || 'N/A'}
                    </td>
                    <td>
                      <span className="badge badge-neutral">{v.type || 'TRUCK'}</span>
                    </td>
                    <td>{(v.maxLoadCapacity || v.capacity || 0).toLocaleString()} kg</td>
                    <td className="ops-mono">{(v.odometer || 0).toLocaleString()} km</td>
                    <td>${(v.acquisitionCost || v.cost || 0).toLocaleString()}</td>
                    <td>{getStatusBadge(v.status)}</td>
                    {(canUpdate || canDelete) && (
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                          {canUpdate && (
                            <button
                              type="button"
                              onClick={() => openEditModal(v)}
                              className="btn-secondary"
                              style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
                              title="Edit Vehicle"
                            >
                              <Edit2 size={13} />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDelete(v)}
                              className="btn-secondary"
                              style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', color: '#EF4444' }}
                              title="Deactivate Vehicle"
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
                  <td colSpan={8} style={{ padding: '3.5rem 1rem', textAlign: 'center' }}>
                    <Loader inline text="Loading fleet registry..." size="medium" />
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem 1rem', color: '#6B7280' }}>
                    No commercial vehicles found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {modalMode && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                {modalMode === 'create' ? 'Register New Commercial Vehicle' : 'Edit Vehicle Details'}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', padding: '0.65rem 0.85rem', borderRadius: 8, color: '#991B1B', marginBottom: '1rem', fontSize: '0.8rem' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                  Vehicle Name / Model *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Freightliner Cascadia 126"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.875rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                  Registration / License Plate Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GJ01TR1111"
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                    Vehicle Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.875rem', background: '#FFFFFF' }}
                  >
                    <option value="TRUCK">Heavy Truck</option>
                    <option value="VAN">Cargo Van</option>
                    <option value="TRAILER">Trailer</option>
                    <option value="CONTAINER">Container</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.875rem', background: '#FFFFFF' }}
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="ON_TRIP">On Trip</option>
                    <option value="IN_SHOP">In Shop</option>
                    <option value="MAINTENANCE">Maintenance</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                    Payload (kg)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={maxLoadCapacity}
                    onChange={(e) => setMaxLoadCapacity(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.875rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                    Odometer (km)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={odometer}
                    onChange={(e) => setOdometer(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.875rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                    Cost ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={acquisitionCost}
                    onChange={(e) => setAcquisitionCost(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.875rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid #F3F4F6', paddingTop: '1rem' }}>
                <button type="button" onClick={closeModal} className="btn-secondary" disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : modalMode === 'create' ? 'Register Vehicle' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
