// ==============================================================================
// LogiSphere AI — Command Dashboard View
// Role-aware operational metrics from GET /api/dashboard/summary & GET /api/analytics
// ==============================================================================

import React, { useState, useEffect } from 'react';
import {
  Navigation,
  Clock,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Activity,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../stores/authStore';
import { dashboardService } from '../../services/dashboardService';
import type { DashboardSummary } from '../../services/dashboardService';
import { CanonicalRole, normalizeRole } from '../../utils/rbac';
import { Loader } from '../../components/Loader';

interface DashboardViewProps {
  onNavigate: (route: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const canonicalRole = normalizeRole(user?.role);
  const isDriver = canonicalRole === CanonicalRole.DRIVER;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const summary = await dashboardService.getSummary();
      setData(summary);
    } catch (err: any) {
      console.error('Failed to load dashboard summary', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to load telemetry summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  return (
    <div>
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#111827', margin: 0 }}>
            {isDriver ? 'Driver Operations Portal' : 'Fleet Operations Command Console'}
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: '0.25rem 0 0 0' }}>
            Real-time telematics, status breakdown, and active dispatch pipeline.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchSummary}
          className="btn-secondary"
          disabled={loading}
          style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', padding: '0.75rem 1rem', borderRadius: 8, color: '#991B1B', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* Senior Developer Custom Loader matching App */}
      {loading && !data && (
        <div className="app-card" style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
          <Loader
            inline
            size="large"
            text="Syncing Fleet Operations Telemetry..."
            subtext="Connecting to LogiSphere AI telematics stream & command metrics"
          />
        </div>
      )}

      {/* Driver-Specific Dashboard */}
      {isDriver && data && 'isDriver' in data && data.isDriver && (
        <div>
          <div className="kpi-grid">
            <div className="kpi-card">
              <span className="kpi-label">Active Assigned Trips</span>
              <div className="kpi-value" style={{ color: '#F59E0B' }}>
                {data.activeTrips}
              </div>
              <span className="kpi-meta">Currently in progress</span>
            </div>

            <div className="kpi-card">
              <span className="kpi-label">Completed Deliveries</span>
              <div className="kpi-value" style={{ color: '#10B981' }}>
                {data.tripsCompleted}
              </div>
              <span className="kpi-meta">Lifetime trips logged</span>
            </div>

            <div className="kpi-card">
              <span className="kpi-label">Driver Safety Score</span>
              <div className="kpi-value" style={{ color: '#3B82F6' }}>
                {data.safetyScore}%
              </div>
              <span className="kpi-meta">AI telematics rating</span>
            </div>

            <div className="kpi-card">
              <span className="kpi-label">Duty Status</span>
              <div className="kpi-value" style={{ fontSize: '1.3rem', color: '#111827' }}>
                {data.status}
              </div>
              <span className="kpi-meta">Updated by shift manager</span>
            </div>
          </div>

          {/* Quick Action Navigation */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="app-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('trips')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <div style={{ background: '#FEF3C7', padding: '0.5rem', borderRadius: 8 }}>
                  <Navigation size={20} color="#B45309" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>My Trips & Dispatches</div>
                  <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>Accept or update trip progress</div>
                </div>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#F59E0B', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.5rem' }}>
                <span>Open Trip Dispatcher</span>
                <ArrowRight size={14} />
              </div>
            </div>

            <div className="app-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('attendance')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <div style={{ background: '#DBEAFE', padding: '0.5rem', borderRadius: 8 }}>
                  <Clock size={20} color="#1E40AF" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Geofenced Clock-In</div>
                  <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>Record today's shift clock in/out</div>
                </div>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#3B82F6', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.5rem' }}>
                <span>Open Attendance Shift</span>
                <ArrowRight size={14} />
              </div>
            </div>

            <div className="app-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('alerts')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <div style={{ background: '#FEE2E2', padding: '0.5rem', borderRadius: 8 }}>
                  <AlertTriangle size={20} color="#991B1B" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Emergency SOS</div>
                  <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>Broadcast emergency alert to dispatch</div>
                </div>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#EF4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.5rem' }}>
                <span>Emergency Broadcast</span>
                <ArrowRight size={14} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fleet Manager / Dispatcher / Safety / Finance Dashboard */}
      {!isDriver && data && (
        <div>
          {/* Executive KPI Grid */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <span className="kpi-label">Active Fleet</span>
              <div className="kpi-value" style={{ color: '#111827' }}>
                {(data as any).activeVehicles ?? 0}
              </div>
              <span className="kpi-meta">
                <span style={{ color: '#10B981', fontWeight: 700 }}>{(data as any).availableVehicles ?? 0}</span> ready for dispatch
              </span>
            </div>

            <div className="kpi-card">
              <span className="kpi-label">Active Dispatches</span>
              <div className="kpi-value" style={{ color: '#F59E0B' }}>
                {(data as any).activeTrips ?? 0}
              </div>
              <span className="kpi-meta">Vehicles on route</span>
            </div>

            <div className="kpi-card">
              <span className="kpi-label">Drivers On Duty</span>
              <div className="kpi-value" style={{ color: '#3B82F6' }}>
                {(data as any).driversOnDuty ?? 0}
              </div>
              <span className="kpi-meta">Geofenced clocked-in</span>
            </div>

            <div className="kpi-card">
              <span className="kpi-label">Fleet Utilization</span>
              <div className="kpi-value" style={{ color: '#10B981' }}>
                {(data as any).fleetUtilization ?? 0}%
              </div>
              <span className="kpi-meta">Capacity deployed</span>
            </div>

            <div className="kpi-card">
              <span className="kpi-label">In Maintenance Shop</span>
              <div className="kpi-value" style={{ color: '#EF4444' }}>
                {(data as any).vehiclesInMaintenance ?? 0}
              </div>
              <span className="kpi-meta">Service inspection</span>
            </div>
          </div>

          {/* Fleet Status Breakdown & Quick Action Strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="app-card">
              <div className="app-card-header">
                <div className="app-card-title">
                  <Activity size={18} color="#F59E0B" />
                  <span>Fleet Vehicle Status Breakdown</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {((data as any).statusBreakdown || []).map((item: any, idx: number) => {
                  const total = (data as any).activeVehicles || 1;
                  const pct = Math.min(100, Math.round((item.value / total) * 100));
                  const colors = ['#10B981', '#F59E0B', '#EF4444', '#6B7280'];
                  const barColor = colors[idx % colors.length];

                  return (
                    <div key={item.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 600, color: '#374151' }}>{item.label}</span>
                        <span style={{ fontWeight: 700, color: '#111827' }}>
                          {item.value} ({pct}%)
                        </span>
                      </div>
                      <div style={{ height: 8, background: '#F3F4F6', borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 999 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AI Fleet Operations Assistant Spotlight */}
            <div className="app-card" style={{ background: 'linear-gradient(135deg, #FFFBEB 0%, #FFFFFF 100%)', borderColor: '#FDE68A' }}>
              <div className="app-card-header" style={{ borderBottomColor: '#FEF3C7' }}>
                <div className="app-card-title" style={{ color: '#B45309' }}>
                  <TrendingUp size={18} color="#F59E0B" />
                  <span>AI Operations Insights</span>
                </div>
                <span className="badge badge-warning">Gemini AI</span>
              </div>

              <p style={{ fontSize: '0.85rem', color: '#78350F', lineHeight: 1.5, marginBottom: '1rem' }}>
                Ask natural questions about vehicles, trips, maintenance forecasts, and driver shifts with real-time operational context.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                <button
                  type="button"
                  onClick={() => onNavigate('ai')}
                  className="btn-secondary"
                  style={{ justifyContent: 'space-between', background: '#FFFFFF', fontSize: '0.8rem', padding: '0.5rem 0.75rem' }}
                >
                  <span>"Show active vehicles and current routes"</span>
                  <ArrowRight size={14} color="#9CA3AF" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('ai')}
                  className="btn-secondary"
                  style={{ justifyContent: 'space-between', background: '#FFFFFF', fontSize: '0.8rem', padding: '0.5rem 0.75rem' }}
                >
                  <span>"Which vehicles need maintenance this week?"</span>
                  <ArrowRight size={14} color="#9CA3AF" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => onNavigate('ai')}
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Launch AI Fleet Assistant
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recent Trips Ledger */}
      <div className="app-card">
        <div className="app-card-header">
          <div className="app-card-title">
            <Navigation size={18} color="#F59E0B" />
            <span>Recent Trip Dispatches</span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('trips')}
            className="btn-secondary"
            style={{ fontSize: '0.78rem', padding: '0.35rem 0.7rem' }}
          >
            <span>View All Trips</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {data?.recentTrips && data.recentTrips.length > 0 ? (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Trip ID</th>
                  <th>Route (Origin ➔ Destination)</th>
                  <th>Vehicle</th>
                  <th>Driver</th>
                  <th>Status</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                {data.recentTrips.slice(0, 5).map((trip) => {
                  const isDelivered = trip.status === 'DELIVERED' || trip.status === 'COMPLETED';
                  const isTransit = trip.status === 'IN_TRANSIT' || trip.status === 'DISPATCHED';

                  return (
                    <tr key={trip.id || trip.tripID}>
                      <td className="ops-mono" style={{ fontWeight: 700, color: '#B45309' }}>
                        #{trip.tripID || trip.tripid || trip.id?.slice(0, 8)}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>
                          {trip.source?.split(',')[0]} ➔ {trip.destination?.split(',')[0]}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>
                          {trip.cargoWeight ? `${trip.cargoWeight} kg cargo` : 'Standard freight'}
                        </div>
                      </td>
                      <td className="ops-mono">{trip.vehicleID || trip.vehicleName || 'Assigned'}</td>
                      <td>{trip.driverName || trip.driverID || 'Assigned'}</td>
                      <td>
                        <span
                          className={`badge ${
                            isDelivered
                              ? 'badge-success'
                              : isTransit
                              ? 'badge-warning'
                              : 'badge-neutral'
                          }`}
                        >
                          {trip.status?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4B5563' }}>
                          {trip.progressPercent ? `${trip.progressPercent}%` : isDelivered ? '100%' : 'In Transit'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6B7280', fontSize: '0.875rem' }}>
            No recent trip dispatches recorded yet for this organization.
          </div>
        )}
      </div>
    </div>
  );
};
