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
  LogOut,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../stores/authStore';
import { dashboardService } from '../../services/dashboardService';
import type { DashboardSummary } from '../../services/dashboardService';
import { fleetService } from '../../services/fleetService';
import { attendanceService } from '../../services/attendanceService';
import type { Vehicle, Driver, AttendanceStatusResponse } from '../../types';
import { CanonicalRole, normalizeRole } from '../../utils/rbac';
import { Loader, FullScreenLoader } from '../../components/Loader';

interface DashboardViewProps {
  onNavigate: (route: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const canonicalRole = normalizeRole(user?.role);
  const isDriver = canonicalRole === CanonicalRole.DRIVER;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [attendanceData, setAttendanceData] = useState<AttendanceStatusResponse | null>(null);
  const [clockActionLoading, setClockActionLoading] = useState(false);
  const [clockActionType, setClockActionType] = useState<'in' | 'out' | null>(null);
  const [clockFeedback, setClockFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Request HTML5 GPS coordinates for geofenced shift clock in/out
  useEffect(() => {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCurrentCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        (err) => {
          console.warn('Geolocation acquisition skipped or declined:', err);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      );
    }
  }, []);

  const fetchAttendanceStatus = async () => {
    try {
      const res = await attendanceService.getStatus();
      setAttendanceData(res);
    } catch (err) {
      console.warn('Could not refresh attendance status', err);
    }
  };

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, vListRes, dListRes, attRes] = await Promise.allSettled([
        dashboardService.getSummary(),
        fleetService.getVehicles(),
        fleetService.getDrivers(),
        attendanceService.getStatus(),
      ]);

      if (summaryRes.status === 'fulfilled') {
        setData(summaryRes.value);
      } else {
        console.error('dashboard summary failed', summaryRes.reason);
        setError(summaryRes.reason?.response?.data?.message || summaryRes.reason?.message || 'Failed to load telemetry summary');
      }

      if (vListRes.status === 'fulfilled') {
        setVehicles(vListRes.value || []);
      }
      if (dListRes.status === 'fulfilled') {
        setDrivers(dListRes.value || []);
      }
      if (attRes.status === 'fulfilled') {
        setAttendanceData(attRes.value);
      }
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

  const handleClockIn = async () => {
    setClockActionLoading(true);
    setClockActionType('in');
    setClockFeedback(null);
    try {
      const lat = currentCoords?.lat || attendanceData?.geofence?.latitude || 23.0225;
      const lng = currentCoords?.lng || attendanceData?.geofence?.longitude || 72.5714;
      const locationName = attendanceData?.geofence?.organizationName || 'LogiSphere Fleet HQ';

      await attendanceService.clockIn({
        latitude: lat,
        longitude: lng,
        locationName,
      });
      await fetchAttendanceStatus();
      await fetchSummary();
      setClockFeedback({ type: 'success', message: "Successfully clocked in for today's shift." });
      setTimeout(() => setClockFeedback(null), 5000);
    } catch (err: any) {
      console.error('Clock in error', err);
      setClockFeedback({
        type: 'error',
        message: err?.response?.data?.message || err?.message || 'Failed to clock in.',
      });
    } finally {
      setClockActionLoading(false);
      setClockActionType(null);
    }
  };

  const handleClockOut = async () => {
    setClockActionLoading(true);
    setClockActionType('out');
    setClockFeedback(null);
    try {
      const lat = currentCoords?.lat || attendanceData?.geofence?.latitude || 23.0225;
      const lng = currentCoords?.lng || attendanceData?.geofence?.longitude || 72.5714;

      await attendanceService.clockOut({
        latitude: lat,
        longitude: lng,
      });
      await fetchAttendanceStatus();
      await fetchSummary();
      setClockFeedback({ type: 'success', message: 'Successfully clocked out. Shift recorded.' });
      setTimeout(() => setClockFeedback(null), 5000);
    } catch (err: any) {
      console.error('Clock out error', err);
      setClockFeedback({
        type: 'error',
        message: err?.response?.data?.message || err?.message || 'Failed to clock out.',
      });
    } finally {
      setClockActionLoading(false);
      setClockActionType(null);
    }
  };

  const isClockedIn = Boolean(attendanceData?.clockedIn);
  const activeShift = attendanceData?.activeRecord;

  const getVehicleInfo = (trip: any) => {
    const rawId = String(trip.vehicleID || trip.vehicleid || '').trim();
    const explicitName = trip.vehicleName && trip.vehicleName !== rawId ? trip.vehicleName : null;
    const explicitPlate = trip.registrationNumber || trip.vehiclePlate || trip.reg || null;

    if (explicitName && explicitPlate) {
      return { name: explicitName, plate: explicitPlate };
    }

    const normId = rawId.toLowerCase();
    const match = vehicles.find((v) => {
      const vid = String(v.id || v.vehicleID || '').toLowerCase();
      const vreg = String(v.registrationNumber || v.reg || '').toLowerCase();
      return (vid && vid === normId) || (vreg && vreg === normId);
    });

    if (match) {
      return {
        name: match.name || explicitName || match.registrationNumber || rawId || 'Assigned Vehicle',
        plate: match.registrationNumber || match.reg || explicitPlate || rawId,
      };
    }

    return {
      name: explicitName || rawId || 'Assigned Vehicle',
      plate: explicitPlate || (rawId ? rawId : undefined),
    };
  };

  const getDriverInfo = (trip: any) => {
    const rawId = String(trip.driverID || trip.driverid || '').trim();
    const explicitName = trip.driverName && trip.driverName !== rawId ? trip.driverName : null;

    if (explicitName) {
      return { name: explicitName };
    }

    const normId = rawId.toLowerCase();
    const match = drivers.find((d) => {
      const did = String(d.id || d.driverID || d.userID || '').toLowerCase();
      return did && did === normId;
    });

    if (match) {
      return {
        name: match.name || match.email?.split('@')[0] || rawId || 'Assigned Driver',
        contact: match.phoneNo || match.email,
      };
    }

    if (isDriver && user?.name) {
      return { name: user.name, contact: user.email };
    }

    return {
      name: explicitName || rawId || 'Assigned Driver',
    };
  };

  return (
    <div>
      {/* Full-Screen Loader matching App/ while data is loading */}
      <FullScreenLoader
        show={loading}
        text="Loading Fleet Operations Telemetry..."
        subtext="Syncing telemetry, vehicles, and live dispatches..."
      />

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

      {/* Header Bar */}
      <div className="dashboard-header-bar">
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#111827', margin: 0 }}>
            {isDriver ? 'Driver Operations Portal' : 'Fleet Operations Command Console'}
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: '0.25rem 0 0 0' }}>
            Real-time telematics, status breakdown, and active dispatch pipeline.
          </p>
        </div>

        <div className="dashboard-header-actions">
          {/* Live Operational Duty & Clock-In / Clock-Out Widget */}
          <div className="dashboard-shift-widget">
            <div className="dashboard-shift-status">
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
              {isClockedIn && activeShift?.clockInTime && (
                <span className="ops-mono" style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                  ({activeShift.clockInTime})
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
            onClick={fetchSummary}
            className="btn-secondary dashboard-refresh-btn"
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Clock In / Out Feedback Toast */}
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
                {isClockedIn ? 'ON DUTY' : (data.status || 'OFF DUTY')}
              </div>
              <span className="kpi-meta">
                {isClockedIn ? `Clocked in ${activeShift?.clockInTime || ''}` : 'Shift status'}
              </span>
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

            <div className="app-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ background: isClockedIn ? '#D1FAE5' : '#DBEAFE', padding: '0.5rem', borderRadius: 8 }}>
                      <Clock size={20} color={isClockedIn ? '#065F46' : '#1E40AF'} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Geofenced Shift Duty</div>
                      <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                        {isClockedIn ? `Clocked in at ${activeShift?.clockInTime || 'Today'}` : "Not clocked in for today's shift"}
                      </div>
                    </div>
                  </div>
                  <span className={`badge ${isClockedIn ? 'badge-success' : 'badge-neutral'}`} style={{ borderRadius: 4 }}>
                    {isClockedIn ? 'On Duty' : 'Off Shift'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem' }}>
                  {isClockedIn ? (
                    <button
                      type="button"
                      onClick={handleClockOut}
                      disabled={clockActionLoading}
                      className="btn-secondary"
                      style={{
                        flex: 1,
                        justifyContent: 'center',
                        color: '#DC2626',
                        borderColor: '#FECACA',
                        background: '#FEF2F2',
                        fontSize: '0.8rem',
                        padding: '0.45rem',
                        cursor: clockActionLoading ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <LogOut size={14} />
                      <span>{clockActionLoading ? 'Clocking Out...' : 'Clock Out Shift'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleClockIn}
                      disabled={clockActionLoading}
                      className="btn-primary"
                      style={{
                        flex: 1,
                        justifyContent: 'center',
                        fontSize: '0.8rem',
                        padding: '0.45rem',
                        cursor: clockActionLoading ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <Clock size={14} />
                      <span>{clockActionLoading ? 'Clocking In...' : 'Clock In Shift'}</span>
                    </button>
                  )}
                </div>
              </div>

              <div
                onClick={() => onNavigate('attendance')}
                style={{
                  fontSize: '0.8rem',
                  color: '#3B82F6',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  marginTop: '0.75rem',
                  cursor: 'pointer',
                  paddingTop: '0.5rem',
                  borderTop: '1px solid #F3F4F6',
                }}
              >
                <span>Full Attendance & Geofence Logs</span>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
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
                <span className="badge badge-warning">AI</span>
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
                  <th style={{ width: 100 }}>Trip ID</th>
                  <th style={{ maxWidth: 240, minWidth: 160 }}>Route (Origin ➔ Destination)</th>
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
                      <td className="ops-mono" style={{ fontWeight: 700, color: '#B45309', whiteSpace: 'nowrap' }}>
                        #{trip.tripID || trip.tripid || trip.id?.slice(0, 8)}
                      </td>
                      <td style={{ maxWidth: 240, minWidth: 160 }}>
                        <div
                          style={{
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                          title={`${trip.source || ''} ➔ ${trip.destination || ''}`}
                        >
                          {trip.source?.split(',')[0]} ➔ {trip.destination?.split(',')[0]}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#6B7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {trip.cargoWeight ? `${trip.cargoWeight} kg cargo` : 'Standard freight'}
                        </div>
                      </td>
                      <td>
                        {(() => {
                          const vInfo = getVehicleInfo(trip);
                          return (
                            <div>
                              <div style={{ fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' }}>
                                {vInfo.name}
                              </div>
                              {vInfo.plate && vInfo.plate !== vInfo.name && (
                                <div style={{ fontSize: '0.72rem', color: '#6B7280', whiteSpace: 'nowrap' }} className="ops-mono">
                                  {vInfo.plate}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td>
                        {(() => {
                          const dInfo = getDriverInfo(trip);
                          return (
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
                          );
                        })()}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            isDelivered
                              ? 'badge-success'
                              : isTransit
                              ? 'badge-warning'
                              : 'badge-neutral'
                          }`}
                          style={{
                            borderRadius: 4,
                            whiteSpace: 'nowrap',
                            display: 'inline-block',
                            textAlign: 'center',
                          }}
                        >
                          {trip.status?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4B5563', whiteSpace: 'nowrap' }}>
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
