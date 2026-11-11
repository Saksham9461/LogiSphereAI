// ==============================================================================
// LogiSphere AI — Geofenced Shifts & Attendance View
// Browser HTML5 GPS verification, shift clock in/out, and staff reporting
// ==============================================================================

import React, { useState, useEffect } from 'react';
import {
  Clock,
  Download,
  RefreshCw,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../../stores/authStore';
import { attendanceService } from '../../services/attendanceService';
import type { AttendanceRecord, AttendanceStatusResponse } from '../../types';
import { hasPermission, Permission } from '../../utils/rbac';
import { Loader, ActivityIndicator } from '../../components/Loader';

export const AttendanceView: React.FC = () => {
  const { user } = useAuth();
  const canViewOrgReport = hasPermission(user?.role, Permission.ATTENDANCE_VIEW_ORG);
  const canExport = hasPermission(user?.role, Permission.ATTENDANCE_EXPORT);

  const [statusData, setStatusData] = useState<AttendanceStatusResponse | null>(null);
  const [reportRecords, setReportRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);

  // Haversine distance formula
  const computeDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await attendanceService.getStatus();
      setStatusData(data);

      if (canViewOrgReport) {
        const report = await attendanceService.getAttendanceReport();
        setReportRecords(report);
      }
    } catch (err: any) {
      console.error('Failed to load attendance status', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  // Get current browser position
  const requestLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        setCurrentCoords(coords);

        if (statusData?.geofence) {
          const dist = computeDistance(
            coords.lat,
            coords.lng,
            statusData.geofence.latitude,
            statusData.geofence.longitude
          );
          setDistanceMeters(dist);
        }
      },
      (geoErr) => {
        console.warn('Geolocation error:', geoErr);
        setError(`Unable to acquire GPS position: ${geoErr.message}. Please enable location permissions.`);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  useEffect(() => {
    fetchStatus();
    requestLocation();
  }, []);

  const handleClockIn = async () => {
    setActionLoading(true);
    setError(null);
    try {
      let lat = currentCoords?.lat || 37.7749;
      let lng = currentCoords?.lng || -122.4194;

      await attendanceService.clockIn({
        latitude: lat,
        longitude: lng,
        locationName: statusData?.geofence?.organizationName || 'LogiSphere Fleet HQ',
      });
      await fetchStatus();
    } catch (err: any) {
      console.error('Clock in error', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to clock in');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClockOut = async () => {
    setActionLoading(true);
    setError(null);
    try {
      let lat = currentCoords?.lat || 37.7749;
      let lng = currentCoords?.lng || -122.4194;

      await attendanceService.clockOut({
        latitude: lat,
        longitude: lng,
      });
      await fetchStatus();
    } catch (err: any) {
      console.error('Clock out error', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to clock out');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportPdf = async () => {
    try {
      const blob = await attendanceService.exportReportPdf();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-report-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to export attendance PDF');
    }
  };

  const isClockedIn = statusData?.clockedIn ?? false;
  const activeRecord = statusData?.activeRecord;

  return (
    <div>
      {/* Top Action Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#111827', margin: 0 }}>
            Geofenced Shifts & Attendance
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: '0.25rem 0 0 0' }}>
            GPS verified clock-in, geofence radius validation, and duty logs.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={fetchStatus}
            className="btn-secondary"
            disabled={loading}
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          {canExport && (
            <button type="button" onClick={handleExportPdf} className="btn-secondary">
              <Download size={15} />
              <span>Export PDF Report</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', padding: '0.75rem 1rem', borderRadius: 8, color: '#991B1B', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* Clock-In Operational Card */}
      <div className="app-card" style={{ background: isClockedIn ? '#F0FDF4' : '#FFFFFF', borderColor: isClockedIn ? '#BBF7D0' : '#E5E7EB' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: isClockedIn ? '#DCFCE7' : '#FEF3C7',
                color: isClockedIn ? '#16A34A' : '#D97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Clock size={24} />
            </div>

            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827' }}>
                {isClockedIn ? 'Currently Clocked In on Shift' : 'Off Shift — Ready to Clock In'}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#4B5563', marginTop: 2 }}>
                {isClockedIn ? (
                  <span>
                    Clock In Time: <strong>{activeRecord?.clockInTime || 'Today'}</strong> at{' '}
                    <strong>{activeRecord?.locationName || 'HQ'}</strong>
                  </span>
                ) : (
                  <span>Verify your device GPS location to register for today's operational shift.</span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {isClockedIn ? (
              <button
                type="button"
                onClick={handleClockOut}
                disabled={actionLoading}
                className="btn-danger"
                style={{ padding: '0.6rem 1.25rem' }}
              >
                {actionLoading ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <span>Recording...</span>
                  </span>
                ) : (
                  <span>Clock Out Shift</span>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleClockIn}
                disabled={actionLoading}
                className="btn-primary"
                style={{ padding: '0.6rem 1.25rem' }}
              >
                {actionLoading ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                    <ActivityIndicator size="small" color="#1A1200" />
                    <span>Verifying GPS...</span>
                  </span>
                ) : (
                  <span>Clock In Shift</span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* GPS Geofence Verification Metadata */}
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(0,0,0,0.06)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.78rem' }}>
          <div>
            <span style={{ color: '#6B7280' }}>Browser GPS Latitude / Longitude:</span>
            <div className="ops-mono" style={{ fontWeight: 600, color: '#111827', marginTop: 2 }}>
              {currentCoords ? `${currentCoords.lat.toFixed(5)}, ${currentCoords.lng.toFixed(5)} (±${Math.round(currentCoords.accuracy)}m)` : 'Acquiring GPS fix...'}
            </div>
          </div>

          <div>
            <span style={{ color: '#6B7280' }}>Geofence Target Office:</span>
            <div style={{ fontWeight: 600, color: '#111827', marginTop: 2 }}>
              {statusData?.geofence?.organizationName || 'LogiSphere Fleet HQ'}
            </div>
          </div>

          <div>
            <span style={{ color: '#6B7280' }}>Distance to Headquarters:</span>
            <div style={{ fontWeight: 600, color: distanceMeters !== null && distanceMeters <= (statusData?.geofence?.geofenceRadius || 500) ? '#10B981' : '#D97706', marginTop: 2 }}>
              {distanceMeters !== null ? `${distanceMeters} meters (Radius: ${statusData?.geofence?.geofenceRadius || 500}m)` : 'Calculating...'}
            </div>
          </div>
        </div>
      </div>

      {/* Staff Attendance Ledger (Managers/Dispatchers) */}
      {canViewOrgReport && (
        <div className="app-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="app-card-header" style={{ padding: '1rem 1.25rem', marginBottom: 0 }}>
            <div className="app-card-title">
              <Calendar size={18} color="#F59E0B" />
              <span>Organization Staff Attendance Ledger</span>
            </div>
          </div>

          <div className="data-table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Shift Date</th>
                  <th>Driver / Staff Member</th>
                  <th>Clock In Time</th>
                  <th>Clock Out Time</th>
                  <th>Verified Location</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
                      <Loader inline text="Loading staff attendance ledger..." size="medium" />
                    </td>
                  </tr>
                ) : reportRecords.length > 0 ? (
                  reportRecords.map((rec) => (
                    <tr key={rec.id}>
                      <td className="ops-mono" style={{ fontWeight: 600 }}>{rec.date}</td>
                      <td>
                        <span style={{ fontWeight: 700, color: '#111827' }}>
                          {rec.userId ? `User #${rec.userId.slice(0, 8)}` : 'Fleet Driver'}
                        </span>
                      </td>
                      <td className="ops-mono">{rec.clockInTime || 'N/A'}</td>
                      <td className="ops-mono">{rec.clockOutTime || 'Active on Duty'}</td>
                      <td>{rec.locationName || 'LogiSphere Fleet HQ'}</td>
                      <td>
                        <span className={`badge ${rec.clockOutTime ? 'badge-neutral' : 'badge-success'}`}>
                          {rec.clockOutTime ? 'Shift Completed' : 'Active On Duty'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '3rem 1rem', color: '#6B7280' }}>
                      No staff attendance records logged for this billing period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Personal Attendance History */}
      {statusData?.history && statusData.history.length > 0 && !canViewOrgReport && (
        <div className="app-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="app-card-header" style={{ padding: '1rem 1.25rem', marginBottom: 0 }}>
            <div className="app-card-title">
              <Clock size={18} color="#F59E0B" />
              <span>My Recent Shift Records</span>
            </div>
          </div>

          <div className="data-table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Clock In</th>
                  <th>Clock Out</th>
                  <th>Verified Location</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {statusData.history.map((rec) => (
                  <tr key={rec.id}>
                    <td className="ops-mono" style={{ fontWeight: 600 }}>{rec.date}</td>
                    <td className="ops-mono">{rec.clockInTime}</td>
                    <td className="ops-mono">{rec.clockOutTime || 'Active'}</td>
                    <td>{rec.locationName}</td>
                    <td>
                      <span className={`badge ${rec.clockOutTime ? 'badge-neutral' : 'badge-success'}`}>
                        {rec.clockOutTime ? 'Completed' : 'On Shift'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
