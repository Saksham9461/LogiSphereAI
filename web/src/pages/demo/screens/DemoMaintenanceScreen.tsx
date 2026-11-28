// ==============================================================================
// LogiSphere AI Demo — Maintenance & Vehicle Health Screen
// 100% Symmetrical with MaintenanceView.tsx in UI, AI forecasts, and work orders
// ==============================================================================

import React, { useState } from 'react';
import {
  Plus,
  RefreshCw,
  X,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { MOCK_MAINTENANCE } from '../data/maintenance.mock';
import { MOCK_VEHICLES } from '../data/vehicles.mock';
import type { MaintenanceRecord } from '../../../types';

export const DemoMaintenanceScreen: React.FC = () => {
  const [records, setRecords] = useState<MaintenanceRecord[]>(() => [...MOCK_MAINTENANCE]);
  const [vehicles] = useState(() => [...MOCK_VEHICLES]);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [selectedVehicleId, setSelectedVehicleId] = useState(vehicles[0]?.vehicleID || vehicles[0]?.id || '');
  const [serviceType, setServiceType] = useState('Routine 10,000km Inspection');
  const [cost, setCost] = useState('4500');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const forecasts = [
    {
      vehicleID: 'veh-truck-11',
      vehicleName: 'Freightliner Cascadia (TRUCK-11)',
      recommendedService: 'Brake Rotor Resurfacing & Hydraulic Flush',
      urgency: 'HIGH',
      dueInKm: 1250,
      estimatedCost: 8500,
      predictedFailureRisk: '78% risk of brake wear threshold excursion within 1,500 km',
    },
    {
      vehicleID: 'veh-semi-40',
      vehicleName: 'Volvo FH16 Heavy Semi (TRUCK-40)',
      recommendedService: 'Transmission Fluid & Differential Gear Inspection',
      urgency: 'MEDIUM',
      dueInKm: 3400,
      estimatedCost: 12000,
      predictedFailureRisk: 'Torque telemetry indicates progressive fluid viscosity degradation',
    },
    {
      vehicleID: 'veh-cargo-08',
      vehicleName: 'Mahindra Supro Cargo (CARGO-08)',
      recommendedService: 'Alternator & Battery Cell Diagnostic',
      urgency: 'LOW',
      dueInKm: 6800,
      estimatedCost: 2400,
      predictedFailureRisk: 'Minor voltage fluctuation noted during high-draw refrigeration start',
    },
  ];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceType.trim()) {
      setFormError('Service description is required');
      return;
    }
    const v = vehicles.find((item) => (item.vehicleID || item.id) === selectedVehicleId);
    const newRecord: MaintenanceRecord = {
      id: `maint-demo-${Date.now()}`,
      maintenanceID: `maint-demo-${Date.now()}`,
      vehicleID: selectedVehicleId,
      vehicle: v?.name || selectedVehicleId,
      serviceType: serviceType.trim(),
      cost: Number(cost) || 0,
      date,
      status: 'Active',
      rawStatus: 'ACTIVE',
    };
    setRecords((prev) => [newRecord, ...prev]);
    setShowModal(false);
  };

  const handleComplete = (id: string) => {
    setRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'Completed', rawStatus: 'COMPLETED' } : r))
    );
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
            onClick={() => setRecords([...MOCK_MAINTENANCE])}
            className="btn-secondary"
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
          >
            <RefreshCw size={14} />
            <span>Reset Demo Data</span>
          </button>

          <button type="button" onClick={() => setShowModal(true)} className="btn-primary">
            <Plus size={16} />
            <span>Schedule Service</span>
          </button>
        </div>
      </div>

      {/* Predictive Maintenance AI Section */}
      <div className="app-card" style={{ background: 'linear-gradient(135deg, #FFFBEB 0%, #FFFFFF 100%)', borderColor: '#FDE68A', marginBottom: '1.5rem' }}>
        <div className="app-card-header" style={{ borderBottomColor: '#FEF3C7' }}>
          <div className="app-card-title" style={{ color: '#B45309' }}>
            <Sparkles size={18} color="#F59E0B" />
            <span>Predictive Telematics AI Maintenance Forecasts</span>
          </div>
          <span className="badge badge-warning">Gemini Predictive AI</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          {forecasts.map((fc) => (
            <div
              key={fc.vehicleID}
              style={{
                background: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: 8,
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#111827' }}>
                    {fc.vehicleName}
                  </div>
                  <span
                    className={`badge ${
                      fc.urgency === 'HIGH'
                        ? 'badge-danger'
                        : fc.urgency === 'MEDIUM'
                        ? 'badge-warning'
                        : 'badge-info'
                    }`}
                  >
                    {fc.urgency} RISK
                  </span>
                </div>

                <div style={{ fontWeight: 600, fontSize: '0.825rem', color: '#374151', marginBottom: 6 }}>
                  {fc.recommendedService}
                </div>

                <p style={{ margin: 0, fontSize: '0.75rem', color: '#6B7280', lineHeight: 1.4 }}>
                  {fc.predictedFailureRisk}
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '0.5rem', borderTop: '1px solid #F3F4F6', fontSize: '0.78rem' }}>
                <span style={{ color: '#6B7280' }}>Due in ~{fc.dueInKm} km</span>
                <span style={{ fontWeight: 700, color: '#111827' }}>Est: ₹{fc.estimatedCost.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Maintenance Work Orders Ledger */}
      <div className="app-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="data-table-container" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Service Description</th>
                <th>Cost</th>
                <th>Scheduled Date</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => {
                const isActive = r.status === 'Active';
                return (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: '#111827' }}>
                        {r.vehicle || r.vehicleID}
                      </div>
                    </td>
                    <td>{r.serviceType || r.service}</td>
                    <td style={{ fontWeight: 700, color: '#111827' }}>₹{r.cost.toLocaleString()}</td>
                    <td>{r.date}</td>
                    <td>
                      <span className={`badge ${isActive ? 'badge-warning' : 'badge-success'}`}>
                        {isActive ? 'In Shop' : 'Completed'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {isActive && (
                        <button
                          type="button"
                          onClick={() => handleComplete(r.id)}
                          className="btn-secondary"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', color: '#059669', borderColor: '#A7F3D0', background: '#ECFDF5' }}
                        >
                          <CheckCircle2 size={13} color="#059669" />
                          <span>Mark Done</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
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
                Schedule Maintenance Service
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
                  Vehicle *
                </label>
                <select
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.875rem', background: '#FFFFFF' }}
                >
                  {vehicles.map((v) => (
                    <option key={v.vehicleID || v.id} value={v.vehicleID || v.id}>
                      {v.name} ({v.registrationNumber || v.reg})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                  Service Description *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Brake Pad Replacement & Rotors Check"
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                    Estimated Cost (₹)
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
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Schedule Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
