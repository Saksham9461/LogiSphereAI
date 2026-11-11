// ==============================================================================
// LogiSphere AI — Maintenance & Vehicle Health View
// Work order scheduling, completion, and predictive forecasts backed by /api/maintenance
// ==============================================================================

import React, { useState, useEffect } from 'react';
import {
  Plus,
  RefreshCw,
  X,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../stores/authStore';
import { maintenanceService } from '../../services/maintenanceService';
import type { MaintenanceForecastItem } from '../../services/maintenanceService';
import { fleetService } from '../../services/fleetService';
import type { MaintenanceRecord, Vehicle } from '../../types';
import { hasPermission, Permission } from '../../utils/rbac';
import { Loader } from '../../components/Loader';

export const MaintenanceView: React.FC = () => {
  const { user } = useAuth();
  const canCreate = hasPermission(user?.role, Permission.MAINTENANCE_CREATE);
  const canUpdate = hasPermission(user?.role, Permission.MAINTENANCE_UPDATE);

  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [forecasts, setForecasts] = useState<MaintenanceForecastItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [serviceType, setServiceType] = useState('Routine 10,000km Inspection');
  const [cost, setCost] = useState('450');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [maintList, vList] = await Promise.all([
        maintenanceService.getMaintenance(),
        fleetService.getVehicles(),
      ]);
      setRecords(maintList);
      setVehicles(vList);
      if (vList.length > 0 && !selectedVehicleId) {
        setSelectedVehicleId(vList[0].vehicleID || vList[0].id);
      }

      // Attempt to load AI maintenance forecasts
      try {
        const fc = await maintenanceService.getMaintenanceForecast();
        setForecasts(fc);
      } catch {
        // Fallback gracefully
      }
    } catch (err: any) {
      console.error('Failed to load maintenance records', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to load maintenance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedVehicleId) {
      setFormError('Please select a vehicle');
      return;
    }
    if (!serviceType.trim()) {
      setFormError('Service description is required');
      return;
    }

    setSubmitting(true);
    try {
      await maintenanceService.scheduleService({
        vehicleID: selectedVehicleId,
        serviceType: serviceType.trim(),
        cost: Number(cost) || 0,
        date,
      });
      setShowModal(false);
      await fetchData();
    } catch (err: any) {
      console.error('Failed to schedule maintenance', err);
      setFormError(err?.response?.data?.message || err?.message || 'Failed to schedule maintenance');
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await maintenanceService.completeService(id);
      await fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to complete service');
    }
  };

  return (
    <div>
      {/* Top Action Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#111827', margin: 0 }}>
            Maintenance & Vehicle Health
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: '0.25rem 0 0 0' }}>
            Work order lifecycle, shop repairs, and predictive AI maintenance forecasts.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={fetchData}
            className="btn-secondary"
            disabled={loading}
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          {canCreate && (
            <button type="button" onClick={() => setShowModal(true)} className="btn-primary">
              <Plus size={16} />
              <span>Schedule Service</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', padding: '0.75rem 1rem', borderRadius: 8, color: '#991B1B', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* AI Predictive Forecast Banner */}
      {forecasts.length > 0 && (
        <div className="app-card" style={{ background: '#FFFBEB', borderColor: '#FDE68A', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Sparkles size={18} color="#B45309" />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#92400E', margin: 0 }}>
              AI Predictive Maintenance Alerts ({forecasts.length} Vehicles Flagged)
            </h3>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#78350F', margin: '0 0 0.75rem 0' }}>
            Telemetry odometers and component duty cycles indicate the following vehicles need proactive inspection:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
            {forecasts.slice(0, 3).map((f) => (
              <div key={f.vehicleID} style={{ background: '#FFFFFF', padding: '0.65rem 0.85rem', borderRadius: 8, border: '1px solid #FEF3C7' }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#111827' }}>
                  {f.name || `Vehicle ${f.vehicleID}`}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#B45309', marginTop: 2 }}>
                  Risk: <strong>{f.riskLevel || 'Elevated'}</strong> • Projected Cost: ${f.projectedCost || 350}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: 2 }}>
                  {f.recommendedAction || 'Schedule fluid and brake inspection'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Maintenance Work Orders Ledger */}
      <div className="app-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="data-table-container" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Service Order</th>
                <th>Target Vehicle</th>
                <th>Service Type / Task</th>
                <th>Scheduled Date</th>
                <th>Service Cost</th>
                <th>Status</th>
                {canUpdate && <th style={{ textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {records.length > 0 ? (
                records.map((rec) => {
                  const mId = rec.maintenanceID || rec.id;
                  const isCompleted = rec.status === 'Completed' || rec.rawStatus === 'COMPLETED';
                  const v = vehicles.find((veh) => (veh.vehicleID || veh.id) === rec.vehicleID);

                  return (
                    <tr key={mId}>
                      <td className="ops-mono" style={{ fontWeight: 700, color: '#B45309' }}>
                        #{mId.slice(0, 8)}
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#111827' }}>
                          {v ? v.name : `Vehicle #${rec.vehicleID}`}
                        </div>
                        <div className="ops-mono" style={{ fontSize: '0.72rem', color: '#6B7280' }}>
                          ID: {rec.vehicleID}
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{rec.serviceType || rec.service}</td>
                      <td className="ops-mono">{rec.date}</td>
                      <td style={{ fontWeight: 700 }}>${rec.cost.toLocaleString()}</td>
                      <td>
                        <span className={`badge ${isCompleted ? 'badge-success' : 'badge-danger'}`}>
                          {isCompleted ? 'Completed' : 'Active In Shop'}
                        </span>
                      </td>
                      {canUpdate && (
                        <td style={{ textAlign: 'right' }}>
                          {!isCompleted && (
                            <button
                              type="button"
                              onClick={() => handleComplete(mId)}
                              className="btn-secondary"
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', color: '#10B981' }}
                            >
                              <CheckCircle2 size={13} />
                              <span>Mark Complete</span>
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3.5rem 1rem', textAlign: 'center' }}>
                    <Loader inline text="Loading maintenance work orders..." size="medium" />
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem 1rem', color: '#6B7280' }}>
                    No maintenance records logged.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Schedule Service Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                Schedule Vehicle Maintenance
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
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

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                  Commercial Vehicle *
                </label>
                <select
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.875rem', background: '#FFFFFF' }}
                >
                  {vehicles.map((v) => (
                    <option key={v.vehicleID || v.id} value={v.vehicleID || v.id}>
                      {v.name} ({v.registrationNumber || v.reg || 'Reg'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                  Service Description / Task *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Brake Caliper Replacement & Fluid Flush"
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                    Estimated Cost ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.875rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                    Scheduled Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.875rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid #F3F4F6', paddingTop: '1rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary" disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Scheduling...' : 'Create Work Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
