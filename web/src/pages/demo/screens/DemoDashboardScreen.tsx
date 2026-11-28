// ==============================================================================
// LogiSphere AI Demo — Command Dashboard Screen
// 100% Symmetrical with DashboardView.tsx in UI, theme, structure, and widgets
// ==============================================================================

import React, { useState } from 'react';
import {
  Navigation,
  Clock,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Activity,
  RefreshCw,
  LogOut,
  CheckCircle2,
} from 'lucide-react';
import { MOCK_DASHBOARD } from '../data/dashboard.mock';
import { MOCK_VEHICLES } from '../data/vehicles.mock';
import { MOCK_DRIVERS } from '../data/drivers.mock';
import { MOCK_TRIPS } from '../data/trips.mock';
import { FullScreenLoader } from '../../../components/Loader';

interface DemoDashboardScreenProps {
  onNavigate: (route: string) => void;
}

export const DemoDashboardScreen: React.FC<DemoDashboardScreenProps> = ({ onNavigate }) => {
  const [vehicles] = useState(() => [...MOCK_VEHICLES]);
  const [drivers] = useState(() => [...MOCK_DRIVERS]);
  const [trips] = useState(() => [...MOCK_TRIPS]);

  // Attendance simulation state
  const [isClockedIn, setIsClockedIn] = useState(true);
  const [clockActionLoading, setClockActionLoading] = useState(false);
  const [clockActionType, setClockActionType] = useState<'in' | 'out' | null>(null);
  const [clockFeedback, setClockFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [clockInTime, setClockInTime] = useState('08:02 AM');

  const handleClockIn = () => {
    setClockActionLoading(true);
    setClockActionType('in');
    setClockFeedback(null);
    setTimeout(() => {
      setIsClockedIn(true);
      const now = new Date();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      setClockInTime(`${hours}:${minutes} ${ampm}`);
      setClockFeedback({ type: 'success', message: "Successfully clocked in for today's shift." });
      setClockActionLoading(false);
      setClockActionType(null);
      setTimeout(() => setClockFeedback(null), 5000);
    }, 1200);
  };

  const handleClockOut = () => {
    setClockActionLoading(true);
    setClockActionType('out');
    setClockFeedback(null);
    setTimeout(() => {
      setIsClockedIn(false);
      setClockFeedback({ type: 'success', message: 'Successfully clocked out. Shift recorded.' });
      setClockActionLoading(false);
      setClockActionType(null);
      setTimeout(() => setClockFeedback(null), 5000);
    }, 1200);
  };

  const getVehicleInfo = (trip: any) => {
    const normId = String(trip.vehicleID || trip.vehicleid || '').toLowerCase();
    const match = vehicles.find((v) => {
      const vid = String(v.id || v.vehicleID || '').toLowerCase();
      const vreg = String(v.registrationNumber || v.reg || '').toLowerCase();
      return (vid && vid === normId) || (vreg && vreg === normId);
    });

    if (match) {
      return {
        name: match.name || match.registrationNumber || 'Assigned Vehicle',
        plate: match.registrationNumber || match.reg,
      };
    }
    return { name: trip.vehicleName || 'Freightliner Cascadia (TRUCK-11)', plate: 'GJ01TR1111' };
  };

  const getDriverInfo = (trip: any) => {
    const normId = String(trip.driverID || trip.driverid || '').toLowerCase();
    const match = drivers.find((d) => String(d.id || d.driverID || d.userID || '').toLowerCase() === normId);
    if (match) {
      return { name: match.name, contact: match.phoneNo || match.email };
    }
    return { name: trip.driverName || 'Raj Patel', contact: '+91 98765 11001' };
  };

  const getStatusBadge = (st: string) => {
    switch (st?.toUpperCase()) {
      case 'DELIVERED':
      case 'COMPLETED':
        return <span className="badge badge-success" style={{ borderRadius: 4 }}>Delivered</span>;
      case 'IN_TRANSIT':
      case 'GOING_TO_PICKUP':
      case 'ARRIVED_AT_PICKUP':
      case 'PICKED_UP':
      case 'ARRIVED_AT_DROP':
        return <span className="badge badge-warning" style={{ borderRadius: 4 }}>In Transit</span>;
      case 'ACCEPTED':
      case 'DISPATCHED':
        return <span className="badge badge-info" style={{ borderRadius: 4 }}>Accepted</span>;
      case 'CANCELLED':
        return <span className="badge badge-danger" style={{ borderRadius: 4 }}>Cancelled</span>;
      default:
        return <span className="badge badge-neutral" style={{ borderRadius: 4 }}>{st?.replace(/_/g, ' ')}</span>;
    }
  };

  const stats = MOCK_DASHBOARD.stats;

  return (
    <div>
      {/* Full-Screen Loader matching App/ while clocking in / out */}
      <FullScreenLoader
        show={clockActionLoading}
        text={clockActionType === 'out' ? 'Recording Shift Clock-Out...' : 'Recording Shift Clock-In...'}
        subtext={
          clockActionType === 'out'
            ? 'Finalizing shift duration, GPS coordinates, and updating duty ledger...'
            : 'Verifying geofence coordinates and opening duty ledger...'
        }
      />

      {/* Header Bar matching DashboardView.tsx */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#111827', margin: 0 }}>
            Fleet Operations Command Console
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: '0.25rem 0 0 0' }}>
            Real-time telematics, status breakdown, and active dispatch pipeline.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Live Operational Duty & Clock-In / Clock-Out Widget */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              background: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: 8,
              padding: '0.35rem 0.75rem',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: isClockedIn ? '#10B981' : '#9CA3AF',
                }}
              />
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: isClockedIn ? '#065F46' : '#4B5563' }}>
                {isClockedIn ? 'On Shift' : 'Off Duty'}
              </span>
              {isClockedIn && (
                <span className="ops-mono" style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                  ({clockInTime})
                </span>
              )}
            </div>

            {isClockedIn ? (
              <button
                type="button"
                onClick={handleClockOut}
                disabled={clockActionLoading}
                className="btn-secondary"
                style={{
                  padding: '0.3rem 0.65rem',
                  fontSize: '0.78rem',
                  color: '#DC2626',
                  borderColor: '#FECACA',
                  background: '#FEF2F2',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  cursor: clockActionLoading ? 'not-allowed' : 'pointer',
                }}
                title="Clock out and complete your shift"
              >
                <LogOut size={13} />
                <span>{clockActionLoading ? 'Clocking Out...' : 'Clock Out'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleClockIn}
                disabled={clockActionLoading}
                className="btn-primary"
                style={{
                  padding: '0.3rem 0.75rem',
                  fontSize: '0.78rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  cursor: clockActionLoading ? 'not-allowed' : 'pointer',
                }}
                title="Clock in with GPS verification for today's shift"
              >
                <Clock size={13} />
                <span>{clockActionLoading ? 'Clocking In...' : 'Clock In'}</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn-secondary"
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Clock Feedback Toast */}
      {clockFeedback && (
        <div
          style={{
            background: clockFeedback.type === 'success' ? '#D1FAE5' : '#FEE2E2',
            border: `1px solid ${clockFeedback.type === 'success' ? '#A7F3D0' : '#FECACA'}`,
            padding: '0.75rem 1rem',
            borderRadius: 8,
            color: clockFeedback.type === 'success' ? '#065F46' : '#991B1B',
            marginBottom: '1.25rem',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {clockFeedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span style={{ fontWeight: 600 }}>{clockFeedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setClockFeedback(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}
          >
            &times;
          </button>
        </div>
      )}

      {/* Executive KPI Grid */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Active Fleet</span>
          <div className="kpi-value" style={{ color: '#111827' }}>
            {stats.activeVehicles}
          </div>
          <span className="kpi-meta">
            <span style={{ color: '#10B981', fontWeight: 700 }}>{stats.availableVehicles}</span> ready for dispatch
          </span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Active Dispatches</span>
          <div className="kpi-value" style={{ color: '#F59E0B' }}>
            {stats.activeTrips}
          </div>
          <span className="kpi-meta">Vehicles on route</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Drivers On Duty</span>
          <div className="kpi-value" style={{ color: '#3B82F6' }}>
            {stats.driversOnDuty}
          </div>
          <span className="kpi-meta">Geofenced clocked-in</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Fleet Utilization</span>
          <div className="kpi-value" style={{ color: '#10B981' }}>
            {stats.fleetUtilization}%
          </div>
          <span className="kpi-meta">Capacity deployed</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">In Maintenance Shop</span>
          <div className="kpi-value" style={{ color: '#EF4444' }}>
            {stats.vehiclesInMaintenance}
          </div>
          <span className="kpi-meta">Service inspection</span>
        </div>
      </div>

      {/* Fleet Status Breakdown & AI Spotlight */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="app-card">
          <div className="app-card-header">
            <div className="app-card-title">
              <Activity size={18} color="#F59E0B" />
              <span>Fleet Vehicle Status Breakdown</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {MOCK_DASHBOARD.vehicleStatus.map((item) => {
              const total = stats.activeVehicles + stats.availableVehicles + stats.vehiclesInMaintenance;
              const pct = Math.min(100, Math.round((item.value / total) * 100));

              return (
                <div key={item.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 600, color: '#374151' }}>{item.label}</span>
                    <span style={{ fontWeight: 700, color: '#111827' }}>
                      {item.value} ({pct}%)
                    </span>
                  </div>
                  <div style={{ height: 8, background: '#F3F4F6', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: item.color, borderRadius: 999 }} />
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

        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 100 }}>Trip ID</th>
                <th style={{ maxWidth: 240, minWidth: 160 }}>Route (Origin ➔ Destination)</th>
                <th>Vehicle</th>
                <th>Driver</th>
                <th>Status</th>
                <th>Progress</th>
              </tr>
            </thead>
            <tbody>
              {trips.slice(0, 5).map((trip) => {
                const isDelivered = trip.status === 'DELIVERED';
                const vInfo = getVehicleInfo(trip);
                const dInfo = getDriverInfo(trip);

                return (
                  <tr key={trip.id}>
                    <td className="ops-mono" style={{ fontWeight: 700, color: '#B45309', whiteSpace: 'nowrap' }}>
                      #{trip.id.slice(0, 8)}
                    </td>
                    <td style={{ maxWidth: 240, minWidth: 160 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={`${trip.source} ➔ ${trip.destination}`}
                      >
                        {trip.source.split(',')[0]} ➔ {trip.destination.split(',')[0]}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#6B7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {trip.cargoWeight ? `${trip.cargoWeight} kg cargo` : 'Standard freight'}
                      </div>
                    </td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' }}>
                          {vInfo.name}
                        </div>
                        {vInfo.plate && (
                          <div style={{ fontSize: '0.72rem', color: '#6B7280', whiteSpace: 'nowrap' }} className="ops-mono">
                            {vInfo.plate}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' }}>
                          {dInfo.name}
                        </div>
                        {dInfo.contact && (
                          <div style={{ fontSize: '0.72rem', color: '#6B7280', whiteSpace: 'nowrap' }}>
                            {dInfo.contact}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      {getStatusBadge(trip.status)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}>
                        <div style={{ width: 64, height: 6, background: '#F3F4F6', borderRadius: 999, overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${trip.progressPercent || 0}%`,
                              background: isDelivered ? '#10B981' : '#F59E0B',
                              borderRadius: 999,
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', flexShrink: 0 }}>
                          {trip.progressPercent || 0}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
