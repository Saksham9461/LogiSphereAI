// ==============================================================================
// LogiSphere AI Demo — Attendance Mock Fixtures
// Immutable seed data — never mutate directly; clone into screen state
// ==============================================================================

import type { AttendanceRecord } from '../../../types';

const today = new Date().toISOString().slice(0, 10);
const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);

export const MOCK_ATTENDANCE: AttendanceRecord[] = [
  {
    id: 'att-001',
    date: today,
    clockInTime: `${today}T08:02:11.000Z`,
    clockOutTime: null,
    locationName: 'LogiSphere Fleet HQ, Ahmedabad',
    distanceFromOffice: 48,
    status: 'CLOCKED_IN',
    latitude: 23.0225,
    longitude: 72.5714,
    autoClockOut: false,
  },
  {
    id: 'att-002',
    date: yesterday,
    clockInTime: `${yesterday}T07:58:34.000Z`,
    clockOutTime: `${yesterday}T17:12:50.000Z`,
    locationName: 'LogiSphere Fleet HQ, Ahmedabad',
    distanceFromOffice: 50,
    status: 'CLOCKED_OUT',
    latitude: 23.0225,
    longitude: 72.5714,
    autoClockOut: false,
  },
  {
    id: 'att-003',
    date: twoDaysAgo,
    clockInTime: `${twoDaysAgo}T08:30:00.000Z`,
    clockOutTime: `${twoDaysAgo}T18:00:22.000Z`,
    locationName: 'LogiSphere Fleet HQ, Ahmedabad',
    distanceFromOffice: 42,
    status: 'CLOCKED_OUT',
    latitude: 23.0225,
    longitude: 72.5714,
    autoClockOut: false,
  },
];

// Demo geofence settings for the demo org
export const DEMO_GEOFENCE = {
  latitude: 23.0225,
  longitude: 72.5714,
  geofenceRadius: 500,
  organizationName: 'LogiSphere Fleet HQ',
};
