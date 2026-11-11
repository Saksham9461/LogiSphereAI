// ==============================================================================
// LogiSphere AI — Trip Dispatcher View
// Real-time dispatch creation, status lifecycle, delay insights, and weather
// ==============================================================================

import React, { useState, useEffect, useMemo } from 'react';
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
import { useAuth } from '../../stores/authStore';
import { tripService } from '../../services/tripService';
import { fleetService } from '../../services/fleetService';
import type { Trip, Vehicle, Driver } from '../../types';
import { hasPermission, Permission, CanonicalRole, normalizeRole } from '../../utils/rbac';
import { Loader } from '../../components/Loader';

export const TripsView: React.FC = () => {
  const { user } = useAuth();
  const canonicalRole = normalizeRole(user?.role);
  const isDriver = canonicalRole === CanonicalRole.DRIVER;
  const canCreate = hasPermission(user?.role, Permission.TRIPS_CREATE);
  const canCancel = hasPermission(user?.role, Permission.TRIPS_CANCEL);

  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Dispatch Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [cargoWeight, setCargoWeight] = useState('1500');

  // AI Insights Modal
  const [insightTrip, setInsightTrip] = useState<Trip | null>(null);
  const [delayInsight, setDelayInsight] = useState<any | null>(null);
  const [weatherInsight, setWeatherInsight] = useState<any | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);

  const fetchTrips = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await tripService.getTrips();
      setTrips(data);
    } catch (err: any) {
      console.error('Failed to load trips', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to load dispatches');
    } finally {
      setLoading(false);
    }
  };

  const loadResources = async () => {
    try {
      const [vList, dList] = await Promise.all([
        fleetService.getVehicles(),
        fleetService.getDrivers(),
      ]);
      setVehicles(vList);
      setDrivers(dList);
      if (vList.length > 0 && !selectedVehicleId) {
        setSelectedVehicleId(vList[0].vehicleID || vList[0].id);
      }
      if (dList.length > 0 && !selectedDriverId) {
        setSelectedDriverId(dList[0].driverID || dList[0].userID || dList[0].id);
      }
    } catch {
      // Ignored if user has limited permission
    }
  };

  useEffect(() => {
    fetchTrips();
    if (canCreate) {
      loadResources();
    }
  }, []);

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!source.trim() || !destination.trim()) {
      setFormError('Both origin and destination locations are required');
      return;
    }
    if (!selectedVehicleId) {
      setFormError('Please select a commercial vehicle for dispatch');
      return;
    }
    if (!selectedDriverId) {
      setFormError('Please assign an enrolled driver');
      return;
    }

    setSubmitting(true);
    try {
      await tripService.createTrip({
        vehicleID: selectedVehicleId,
        driverID: selectedDriverId,
        source: source.trim(),
        destination: destination.trim(),
        cargoWeight: Number(cargoWeight) || 0,
      });
      setShowCreateModal(false);
      setSource('');
      setDestination('');
      await fetchTrips();
    } catch (err: any) {
      console.error('Failed to dispatch trip', err);
      setFormError(err?.response?.data?.message || err?.message || 'Failed to dispatch trip');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (tripId: string, newStatus: string) => {
    try {
      await tripService.updateTripStatus(tripId, newStatus);
      await fetchTrips();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to update trip status');
    }
  };

  const openAiInsights = async (trip: Trip) => {
    const tId = trip.tripID || trip.tripid || trip.id;
    setInsightTrip(trip);
    setLoadingInsight(true);
    setDelayInsight(null);
    setWeatherInsight(null);

    try {
      const [delayData, weatherData] = await Promise.allSettled([
        tripService.getDelayInsights(tId),
        tripService.getDestinationWeather(tId),
      ]);

      if (delayData.status === 'fulfilled') {
        setDelayInsight(delayData.value);
      }
      if (weatherData.status === 'fulfilled') {
        setWeatherInsight(weatherData.value);
      }
    } catch (err) {
      console.error('Failed to load insights', err);
    } finally {
      setLoadingInsight(false);
    }
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
            onClick={fetchTrips}
            className="btn-secondary"
            disabled={loading}
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          {canCreate && (
            <button type="button" onClick={() => setShowCreateModal(true)} className="btn-primary">
              <Plus size={16} />
              <span>New Dispatch</span>
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
              <option value="ACCEPTED">Accepted</option>
              <option value="IN_TRANSIT">In Transit</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Trips Table */}
      <div className="app-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="data-table-container" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Trip ID</th>
                <th>Corridor Route</th>
                <th>Assigned Vehicle</th>
                <th>Assigned Driver</th>
                <th>Cargo Weight</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrips.length > 0 ? (
                filteredTrips.map((trip) => {
                  const tId = trip.tripID || trip.tripid || trip.id;
                  const isDelivered = trip.status === 'DELIVERED' || trip.status === 'COMPLETED';
                  const isCancelled = trip.status === 'CANCELLED';
                  const isAccepted = trip.status === 'ACCEPTED';
                  const isInTransit = trip.status === 'IN_TRANSIT' || trip.status === 'GOING_TO_PICKUP' || trip.status === 'PICKED_UP';

                  return (
                    <tr key={tId}>
                      <td className="ops-mono" style={{ fontWeight: 700, color: '#B45309' }}>
                        #{tId.slice(0, 10)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                          <span>{trip.source?.split(',')[0]}</span>
                          <ChevronRight size={13} color="#9CA3AF" />
                          <span>{trip.destination?.split(',')[0]}</span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>
                          Full: {trip.source} ➔ {trip.destination}
                        </div>
                      </td>
                      <td className="ops-mono">{trip.vehicleName || trip.vehicleID}</td>
                      <td>{trip.driverName || trip.driverID}</td>
                      <td>{trip.cargoWeight ? `${trip.cargoWeight} kg` : 'N/A'}</td>
                      <td>{getStatusBadge(trip.status)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
                          {/* AI Delay & Weather button */}
                          <button
                            type="button"
                            onClick={() => openAiInsights(trip)}
                            className="btn-secondary"
                            style={{ padding: '0.3rem 0.55rem', fontSize: '0.75rem', color: '#B45309' }}
                            title="AI Delay & Weather Insights"
                          >
                            <Sparkles size={13} />
                            <span>AI Insights</span>
                          </button>

                          {/* Driver Progression Controls */}
                          {isDriver && isAccepted && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(tId, 'IN_TRANSIT')}
                              className="btn-primary"
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                            >
                              Start Transit
                            </button>
                          )}

                          {isDriver && isInTransit && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(tId, 'DELIVERED')}
                              className="btn-primary"
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: '#10B981' }}
                            >
                              Complete Delivery
                            </button>
                          )}

                          {/* Manager Cancellation */}
                          {canCancel && !isDelivered && !isCancelled && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Cancel dispatch #${tId}?`)) {
                                  handleStatusChange(tId, 'CANCELLED');
                                }
                              }}
                              className="btn-secondary"
                              style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', color: '#EF4444' }}
                              title="Cancel Dispatch"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3.5rem 1rem', textAlign: 'center' }}>
                    <Loader inline text="Loading trip dispatcher board..." size="medium" />
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem 1rem', color: '#6B7280' }}>
                    No trips found matching criteria.
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
                Create New Route Dispatch
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
                  Origin / Departure Location *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. San Francisco Distribution Hub, CA"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.875rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                  Destination / Delivery Point *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Los Angeles Fulfillment Center, CA"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                    Assign Commercial Vehicle *
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
                    Assign Enrolled Driver *
                  </label>
                  <select
                    value={selectedDriverId}
                    onChange={(e) => setSelectedDriverId(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.875rem', background: '#FFFFFF' }}
                  >
                    {drivers.map((d) => (
                      <option key={d.driverID || d.userID || d.id} value={d.driverID || d.userID || d.id}>
                        {d.name} ({d.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                  Manifest Cargo Weight (kg)
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
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary" disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Dispatching...' : 'Dispatch Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Delay & Weather Insights Modal */}
      {insightTrip && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: 640 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ background: '#FEF3C7', padding: '0.4rem', borderRadius: 8 }}>
                  <Sparkles size={18} color="#B45309" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                    AI Delay Risk & Weather Forecast
                  </h3>
                  <div className="ops-mono" style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                    Trip #{insightTrip.tripID || insightTrip.tripid || insightTrip.id}
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

            {loadingInsight ? (
              <div style={{ padding: '2.5rem 1rem' }}>
                <Loader
                  inline
                  size="medium"
                  text="Analyzing Delay Patterns..."
                  subtext="Querying historical telematics & live destination weather"
                />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Delay Risk Card */}
                <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>
                      Predictive Delay Model
                    </div>
                    <span
                      className={`badge ${
                        delayInsight?.riskLevel === 'HIGH'
                          ? 'badge-danger'
                          : delayInsight?.riskLevel === 'MEDIUM'
                          ? 'badge-warning'
                          : 'badge-success'
                      }`}
                    >
                      {delayInsight?.riskLevel || 'LOW'} RISK
                    </span>
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#111827', fontWeight: 600 }}>
                    {delayInsight?.explanation || 'Optimal corridor trajectory. No major congestion bottlenecks detected.'}
                  </div>
                  {delayInsight?.estimatedDelayMinutes !== undefined && (
                    <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.35rem' }}>
                      Estimated Corridor Delay: <strong>{delayInsight.estimatedDelayMinutes} mins</strong>
                    </div>
                  )}
                </div>

                {/* Weather Card */}
                <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', color: '#1E40AF', fontWeight: 700, fontSize: '0.85rem' }}>
                    <CloudSun size={18} />
                    <span>Destination Weather Conditions</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#1E3A8A' }}>
                    {weatherInsight?.condition || weatherInsight?.summary || 'Clear visibility and standard dry road conditions at destination.'}
                  </div>
                  {weatherInsight?.temperature && (
                    <div style={{ fontSize: '0.75rem', color: '#2563EB', marginTop: '0.35rem' }}>
                      Temperature: <strong>{weatherInsight.temperature}°C</strong> • Wind: <strong>{weatherInsight.windSpeed || 'Calm'}</strong>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setInsightTrip(null)}
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  Close Insights
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
