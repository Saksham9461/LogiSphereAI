// ==============================================================================
// LogiSphere AI Demo — Trip Dispatcher Screen
// 100% Symmetrical with TripsView.tsx in UI, AI delay modal, and dispatch tables
// ==============================================================================

import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Filter,
  RefreshCw,
  X,
  CloudSun,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { MOCK_TRIPS } from '../data/trips.mock';
import { MOCK_VEHICLES } from '../data/vehicles.mock';
import { MOCK_DRIVERS } from '../data/drivers.mock';
import type { Trip } from '../../../types';

export const DemoTripsScreen: React.FC = () => {
  const [trips, setTrips] = useState<Trip[]>(() => [...MOCK_TRIPS]);
  const [vehicles] = useState(() => [...MOCK_VEHICLES]);
  const [drivers] = useState(() => [...MOCK_DRIVERS]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Dispatch Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState(vehicles[0]?.vehicleID || vehicles[0]?.id || '');
  const [selectedDriverId, setSelectedDriverId] = useState(drivers[0]?.driverID || drivers[0]?.id || '');
  const [cargoWeight, setCargoWeight] = useState('1500');

  // AI Insights Modal
  const [insightTrip, setInsightTrip] = useState<Trip | null>(null);
  const [delayInsight, setDelayInsight] = useState<any | null>(null);
  const [weatherInsight, setWeatherInsight] = useState<any | null>(null);

  const handleCreateTrip = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!source.trim() || !destination.trim()) {
      setFormError('Both origin and destination locations are required');
      return;
    }
    const v = vehicles.find((item) => (item.vehicleID || item.id) === selectedVehicleId);
    const d = drivers.find((item) => (item.driverID || item.id) === selectedDriverId);

    const newTrip: Trip = {
      id: `trip-demo-${Date.now()}`,
      tripID: `TRIP-${Math.floor(1000 + Math.random() * 9000)}`,
      vehicleID: selectedVehicleId,
      vehicleName: v?.name || selectedVehicleId,
      driverID: selectedDriverId,
      driverName: d?.name || selectedDriverId,
      source: source.trim(),
      destination: destination.trim(),
      cargoWeight: Number(cargoWeight) || 0,
      status: 'ACCEPTED',
      distanceKm: Math.floor(Math.random() * 450) + 50,
      progressPercent: 0,
      createdAt: new Date().toISOString(),
    };

    setTrips((prev) => [newTrip, ...prev]);
    setShowCreateModal(false);
    setSource('');
    setDestination('');
  };

  const handleStatusChange = (tripId: string, newStatus: string) => {
    setTrips((prev) =>
      prev.map((t) =>
        t.id === tripId
          ? {
              ...t,
              status: newStatus,
              progressPercent:
                newStatus === 'DELIVERED'
                  ? 100
                  : newStatus === 'IN_TRANSIT'
                  ? Math.max(t.progressPercent || 0, 45)
                  : t.progressPercent,
            }
          : t
      )
    );
  };

  const openAiInsights = (trip: Trip) => {
    setInsightTrip(trip);
    setDelayInsight({
      confidenceScore: 92,
      riskLevel: 'LOW',
      factors: [
        { title: 'Highway NH-48 Corridor Flow', status: 'Optimal', impact: 'Nominal traffic speeds (65-75 km/h)' },
        { title: 'Toll Plaza Clearance', status: 'Clear', impact: 'Fastag automated lane transit without queues' },
        { title: 'Vehicle Telematics Status', status: 'Nominal', impact: 'Engine and tyre sensors reporting 98% nominal health' },
      ],
      recommendation: 'Corridor trajectory is optimal. Maintain current highway cruise speed to achieve arrival on schedule.',
    });
    setWeatherInsight({
      temperature: 31,
      condition: 'Sunny / Clear Skies',
      visibilityKm: 10,
      windSpeedKmph: 12,
      precipitationProb: 0,
      impactStatement: 'Favorable road and atmospheric conditions. Zero visibility or hydroplaning hazards detected.',
    });
  };

  const filteredTrips = useMemo(() => {
    return trips.filter((t) => {
      const matchSearch =
        (t.tripID || t.tripid || t.id || '').toLowerCase().includes(search.toLowerCase()) ||
        (t.source || '').toLowerCase().includes(search.toLowerCase()) ||
        (t.destination || '').toLowerCase().includes(search.toLowerCase()) ||
        (t.vehicleName || t.vehicleID || '').toLowerCase().includes(search.toLowerCase()) ||
        (t.driverName || t.driverID || '').toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [trips, search, statusFilter]);

  const getStatusBadge = (st: string) => {
    switch (st?.toUpperCase()) {
      case 'DELIVERED':
      case 'COMPLETED':
        return <span className="badge badge-success">Delivered</span>;
      case 'IN_TRANSIT':
      case 'GOING_TO_PICKUP':
      case 'ARRIVED_AT_PICKUP':
      case 'PICKED_UP':
      case 'ARRIVED_AT_DROP':
        return <span className="badge badge-warning">In Transit</span>;
      case 'ACCEPTED':
      case 'DISPATCHED':
        return <span className="badge badge-info">Accepted</span>;
      case 'CANCELLED':
        return <span className="badge badge-danger">Cancelled</span>;
      default:
        return <span className="badge badge-neutral">{st?.replace(/_/g, ' ')}</span>;
    }
  };

  return (
    <div>
      {/* Top Action Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#111827', margin: 0 }}>
            Trip Dispatcher & Tracking
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: '0.25rem 0 0 0' }}>
            Active route dispatches, cargo manifests, and predictive delay intelligence.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={() => setTrips([...MOCK_TRIPS])}
            className="btn-secondary"
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
          >
            <RefreshCw size={14} />
            <span>Reset Demo Data</span>
          </button>

          <button type="button" onClick={() => setShowCreateModal(true)} className="btn-primary">
            <Plus size={16} />
            <span>New Dispatch</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="app-card" style={{ padding: '0.85rem 1rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
            <Search size={16} color="#9CA3AF" style={{ position: 'absolute', left: 12, top: 11 }} />
            <input
              type="text"
              placeholder="Search by trip ID, origin, destination, vehicle, or driver..."
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
              <option value="PENDING_APPROVAL">Pending Approval</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="GOING_TO_PICKUP">Going to Pickup</option>
              <option value="IN_TRANSIT">In Transit</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Dispatches Table */}
      <div className="app-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="data-table-container" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Trip ID</th>
                <th>Corridor Route</th>
                <th>Assigned Vehicle</th>
                <th>Assigned Driver</th>
                <th>Payload</th>
                <th>Status</th>
                <th>Progress</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrips.length > 0 ? (
                filteredTrips.map((t) => (
                  <tr key={t.id}>
                    <td className="ops-mono" style={{ fontWeight: 700, color: '#B45309' }}>
                      #{t.tripID || t.id.slice(0, 8)}
                    </td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>{t.source.split(',')[0]}</span>
                          <ChevronRight size={13} color="#9CA3AF" />
                          <span>{t.destination.split(',')[0]}</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                          Distance: {t.distanceKm || 240} km
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#111827' }}>
                        {t.vehicleName || 'Freightliner Cascadia'}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#111827' }}>
                        {t.driverName || 'Raj Patel'}
                      </div>
                    </td>
                    <td>{t.cargoWeight ? `${Number(t.cargoWeight).toLocaleString()} kg` : 'Standard'}</td>
                    <td>{getStatusBadge(t.status)}</td>
                    <td style={{ minWidth: 100 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ flex: 1, height: 6, background: '#F3F4F6', borderRadius: 999, overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${t.progressPercent || 0}%`,
                              background: t.status === 'DELIVERED' ? '#10B981' : '#F59E0B',
                              borderRadius: 999,
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280' }}>
                          {t.progressPercent || 0}%
                        </span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem', alignItems: 'center' }}>
                        {/* Status lifecycle selector */}
                        {t.status !== 'DELIVERED' && t.status !== 'CANCELLED' && (
                          <select
                            value={t.status}
                            onChange={(e) => handleStatusChange(t.id, e.target.value)}
                            style={{
                              fontSize: '0.72rem',
                              padding: '0.2rem 0.4rem',
                              borderRadius: 6,
                              border: '1px solid #D1D5DB',
                              background: '#FFFFFF',
                              color: '#374151',
                            }}
                          >
                            <option value="ACCEPTED">Accepted</option>
                            <option value="GOING_TO_PICKUP">To Pickup</option>
                            <option value="IN_TRANSIT">In Transit</option>
                            <option value="DELIVERED">Delivered</option>
                            <option value="CANCELLED">Cancel</option>
                          </select>
                        )}

                        {/* AI Delay Intelligence Pill Button */}
                        <button
                          type="button"
                          onClick={() => openAiInsights(t)}
                          className="btn-secondary"
                          style={{
                            padding: '0.3rem 0.55rem',
                            fontSize: '0.75rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            background: '#FFFBEB',
                            borderColor: '#FDE68A',
                            color: '#B45309',
                          }}
                          title="View AI Delay Predictions & Weather"
                        >
                          <Sparkles size={13} color="#F59E0B" />
                          <span>Delay AI</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem 1rem', color: '#6B7280' }}>
                    No dispatches found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Dispatch Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                Create Commercial Dispatch
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
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

            <form onSubmit={handleCreateTrip} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                  Origin / Departure Point *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ahmedabad Central Depot"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.875rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                  Destination Delivery Hub *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Surat Distribution Hub"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                    Select Commercial Vehicle
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
                    Assign Fleet Driver
                  </label>
                  <select
                    value={selectedDriverId}
                    onChange={(e) => setSelectedDriverId(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.875rem', background: '#FFFFFF' }}
                  >
                    {drivers.map((d) => (
                      <option key={d.driverID || d.id} value={d.driverID || d.id}>
                        {d.name} ({d.status})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                  Cargo Manifest Weight (kg)
                </label>
                <input
                  type="number"
                  min="0"
                  value={cargoWeight}
                  onChange={(e) => setCargoWeight(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid #F3F4F6', paddingTop: '1rem' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Dispatch Commercial Trip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Delay & Weather Intelligence Modal */}
      {insightTrip && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: 580 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ background: '#FEF3C7', padding: '0.4rem', borderRadius: 8 }}>
                  <Sparkles size={18} color="#B45309" />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                    AI Delay & Meteorological Insights
                  </h2>
                  <div style={{ fontSize: '0.78rem', color: '#6B7280' }}>
                    Corridor #{insightTrip.tripID || insightTrip.id.slice(0, 8)}: {insightTrip.source.split(',')[0]} ➔ {insightTrip.destination.split(',')[0]}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInsightTrip(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Delay Risk Score */}
              <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 8, padding: '0.85rem 1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#065F46', textTransform: 'uppercase' }}>
                    Predicted Corridor Transit Status
                  </span>
                  <span style={{ background: '#10B981', color: '#FFFFFF', padding: '0.15rem 0.5rem', borderRadius: 999, fontSize: '0.72rem', fontWeight: 800 }}>
                    92% Confidence
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.825rem', color: '#047857', lineHeight: 1.4 }}>
                  {delayInsight?.recommendation}
                </p>
              </div>

              {/* Weather Forecast */}
              {weatherInsight && (
                <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '0.85rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.5rem', color: '#1E40AF', fontWeight: 700, fontSize: '0.85rem' }}>
                    <CloudSun size={16} />
                    <span>Destination Weather Conditions ({insightTrip.destination.split(',')[0]})</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', fontSize: '0.78rem', color: '#1E3A8A' }}>
                    <div>Temp: <strong>{weatherInsight.temperature}°C</strong></div>
                    <div>Condition: <strong>{weatherInsight.condition}</strong></div>
                    <div>Visibility: <strong>{weatherInsight.visibilityKm} km</strong></div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#2563EB', marginTop: '0.4rem' }}>
                    {weatherInsight.impactStatement}
                  </div>
                </div>
              )}

              {/* Contributing Telematics Factors */}
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.5rem' }}>
                  Corridor Telematics Factors
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {delayInsight?.factors?.map((f: any) => (
                    <div
                      key={f.title}
                      style={{
                        background: '#F9FAFB',
                        border: '1px solid #E5E7EB',
                        borderRadius: 6,
                        padding: '0.5rem 0.75rem',
                        fontSize: '0.78rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: '#111827' }}>{f.title}</div>
                        <div style={{ color: '#6B7280', fontSize: '0.72rem' }}>{f.impact}</div>
                      </div>
                      <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                        {f.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ textAlign: 'right', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setInsightTrip(null)}
                  className="btn-primary"
                  style={{ fontSize: '0.8rem' }}
                >
                  Close Insights
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
