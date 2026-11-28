// ==============================================================================
// LogiSphere AI Demo — Geofenced Shifts & Attendance Screen
// 100% Symmetrical with AttendanceView.tsx in UI, theme, and geofence card
// ==============================================================================

import React, { useState } from 'react';
import {
  Clock,
  Download,
  RefreshCw,
  MapPin,
  CheckCircle2,
} from 'lucide-react';
import { MOCK_ATTENDANCE, DEMO_GEOFENCE } from '../data/attendance.mock';
import type { AttendanceRecord } from '../../../types';

export const DemoAttendanceScreen: React.FC = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>(() => [...MOCK_ATTENDANCE]);
  const [isClockedIn, setIsClockedIn] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const activeRecord = records.find((r) => r.status === 'CLOCKED_IN') || records[0];

  const handleClockIn = () => {
    setActionLoading(true);
    setTimeout(() => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;

      const newRec: AttendanceRecord = {
        id: `att-demo-${Date.now()}`,
        date: new Date().toISOString().slice(0, 10),
        clockInTime: `${hours}:${minutes} ${ampm}`,
        clockOutTime: null,
        locationName: DEMO_GEOFENCE.organizationName,
        distanceFromOffice: 42,
        status: 'CLOCKED_IN',
        latitude: DEMO_GEOFENCE.latitude,
        longitude: DEMO_GEOFENCE.longitude,
      };

      setRecords((prev) => [newRec, ...prev]);
      setIsClockedIn(true);
      setActionLoading(false);
    }, 1000);
  };

  const handleClockOut = () => {
    setActionLoading(true);
    setTimeout(() => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;

      setRecords((prev) =>
        prev.map((r, i) =>
          i === 0 ? { ...r, clockOutTime: `${hours}:${minutes} ${ampm}`, status: 'CLOCKED_OUT' } : r
        )
      );
      setIsClockedIn(false);
      setActionLoading(false);
    }, 1000);
  };

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
            onClick={() => setRecords([...MOCK_ATTENDANCE])}
            className="btn-secondary"
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
          >
            <RefreshCw size={14} />
            <span>Reset Demo Data</span>
          </button>

          <button
            type="button"
            onClick={() => alert('Attendance report export initiated (demo simulation).')}
            className="btn-secondary"
          >
            <Download size={15} />
            <span>Export PDF Report</span>
          </button>
        </div>
      </div>

      {/* Clock-In Operational Card */}
      <div
        className="app-card"
        style={{
          background: isClockedIn ? '#F0FDF4' : '#FFFFFF',
          borderColor: isClockedIn ? '#BBF7D0' : '#E5E7EB',
        }}
      >
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
                    Clock In Time: <strong>{activeRecord?.clockInTime || '08:02 AM'}</strong> at{' '}
                    <strong>{DEMO_GEOFENCE.organizationName}</strong>
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
                {actionLoading ? 'Clocking Out...' : 'Clock Out Shift'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleClockIn}
                disabled={actionLoading}
                className="btn-primary"
                style={{ padding: '0.6rem 1.25rem' }}
              >
                {actionLoading ? 'Clocking In...' : 'Clock In Shift'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Geofence Perimeter Verification Card */}
      <div className="app-card" style={{ marginBottom: '1.5rem' }}>
        <div className="app-card-header">
          <div className="app-card-title">
            <MapPin size={18} color="#10B981" />
            <span>Operational Geofence Boundary</span>
          </div>
          <span className="badge badge-success">GPS Verified</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.85rem' }}>
          <div>
            <div style={{ color: '#6B7280', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>
              Authorized Facility
            </div>
            <div style={{ fontWeight: 700, color: '#111827', marginTop: 2 }}>{DEMO_GEOFENCE.organizationName}</div>
          </div>
          <div>
            <div style={{ color: '#6B7280', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>
              Geofence Radius
            </div>
            <div style={{ fontWeight: 700, color: '#111827', marginTop: 2 }}>{DEMO_GEOFENCE.geofenceRadius} meters</div>
          </div>
          <div>
            <div style={{ color: '#6B7280', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>
              Proximity Status
            </div>
            <div style={{ fontWeight: 700, color: '#065F46', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckCircle2 size={14} color="#10B981" />
              <span>Within Perimeter (~48m from hub)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Shift Duty Ledger Table */}
      <div className="app-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="app-card-header" style={{ padding: '1rem 1.25rem 0.75rem' }}>
          <div className="app-card-title">
            <Clock size={18} color="#F59E0B" />
            <span>Shift Attendance Ledger</span>
          </div>
        </div>

        <div className="data-table-container" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Clock In Time</th>
                <th>Clock Out Time</th>
                <th>Shift Duration</th>
                <th>Authorized Facility</th>
                <th>Proximity</th>
                <th>Duty Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => {
                const isClocked = r.status === 'CLOCKED_IN';
                return (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 700, color: '#111827' }}>{r.date}</td>
                    <td className="ops-mono">{r.clockInTime?.slice(0, 8) || '08:02 AM'}</td>
                    <td className="ops-mono">{r.clockOutTime?.slice(0, 8) || (isClocked ? '— Active' : '05:15 PM')}</td>
                    <td>{isClocked ? 'In Progress' : '8h 45m'}</td>
                    <td>{r.locationName || DEMO_GEOFENCE.organizationName}</td>
                    <td>
                      <span style={{ color: '#065F46', fontWeight: 600 }}>{r.distanceFromOffice || 48}m</span>
                    </td>
                    <td>
                      <span className={`badge ${isClocked ? 'badge-success' : 'badge-neutral'}`}>
                        {isClocked ? 'Clocked In' : 'Completed'}
                      </span>
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
