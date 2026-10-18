import request from 'supertest';
import { describe, expect, it, beforeAll } from 'vitest';
import { app } from '../src/app';
import { db } from '../src/config/database';
import { signToken } from '../src/middleware/auth';
import {
  runAutoClockOutReconciliation,
  extractRecordDateKey,
  getBusinessDateString,
  getBusinessEndOfDayISO,
} from '../src/modules/attendance/autoClockOut';
import { generateAttendancePdf } from '../src/modules/attendance/pdfGenerator';
import { parseTimeToMinutes, formatMinutesToDuration, calculateSessionMinutes } from '../src/modules/attendance/routes';

describe('LogiSphere AI — Attendance Auto Clock-Out & Staff Report System', { timeout: 20000 }, () => {
  const managerUser = {
    id: `usr-mgr-${Date.now()}`,
    email: `manager_${Date.now()}@logisphere.ai`,
    name: 'Fleet Director Peyton',
    role: 'FLEET_MANAGER',
  };

  const driverUser1 = {
    id: `usr-drv1-${Date.now()}`,
    email: `driver1_${Date.now()}@logisphere.ai`,
    name: 'Alice Johnson',
    role: 'ROLE_DRIVER',
  };

  const driverUser2 = {
    id: `usr-drv2-${Date.now()}`,
    email: `driver2_${Date.now()}@logisphere.ai`,
    name: 'Bob Smith',
    role: 'ROLE_DRIVER',
  };

  let managerToken = '';
  let driver1Token = '';
  let driver2Token = '';
  let pastRecordId = '';

  beforeAll(async () => {
    // Insert mock users into database
    await db.insert('users', {
      id: managerUser.id,
      email: managerUser.email,
      name: managerUser.name,
      role: managerUser.role,
      password: 'hashedPassword123',
    });

    await db.insert('users', {
      id: driverUser1.id,
      email: driverUser1.email,
      name: driverUser1.name,
      role: driverUser1.role,
      password: 'hashedPassword123',
    });

    await db.insert('users', {
      id: driverUser2.id,
      email: driverUser2.email,
      name: driverUser2.name,
      role: driverUser2.role,
      password: 'hashedPassword123',
    });

    managerToken = signToken(managerUser);
    driver1Token = signToken(driverUser1);
    driver2Token = signToken(driverUser2);
  });

  // 1. Manual clock-in and manual clock-out
  it('1. Manual Clock-In and Manual Clock-Out within Geofence', async () => {
    // Geofenced coordinates for Head Office (default: 28.6139, 77.2090)
    const clockInRes = await request(app)
      .post('/api/attendance/clock-in')
      .set('Authorization', `Bearer ${driver1Token}`)
      .send({
        latitude: 28.6139,
        longitude: 77.2090,
        distanceFromOffice: 15,
        locationName: 'LogiSphere HQ Gate 1',
      });

    expect(clockInRes.status).toBe(201);
    expect(clockInRes.body.success).toBe(true);
    expect(clockInRes.body.status).toBe('CLOCKED_IN');
    expect(clockInRes.body.record.clockOutTime).toBeNull();
    expect(clockInRes.body.record.clockOutType).toBe('MANUAL');

    // Manual Clock-Out
    const clockOutRes = await request(app)
      .post('/api/attendance/clock-out')
      .set('Authorization', `Bearer ${driver1Token}`);

    expect(clockOutRes.status).toBe(200);
    expect(clockOutRes.body.success).toBe(true);
    expect(clockOutRes.body.status).toBe('NOT_CLOCKED_IN');
    expect(clockOutRes.body.record.clockOutTime).toBeDefined();
    expect(clockOutRes.body.record.clockOutType).toBe('MANUAL');
    expect(clockOutRes.body.record.autoClockOut).toBe(false);
  });

  // 2. Geofence boundary check regression
  it('2. Clock-In rejected if outside authorized geofence boundary', async () => {
    const res = await request(app)
      .post('/api/attendance/clock-in')
      .set('Authorization', `Bearer ${driver1Token}`)
      .send({
        latitude: 19.0760, // Mumbai coordinates (~1100 km away)
        longitude: 72.8777,
        distanceFromOffice: 1100000,
        locationName: 'Far Away Site',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('outside the authorized geofence boundary');
  });

  // 3. Automatic clock-out & Missed-execution reconciliation
  it('3. Automatic Clock-Out reconciliation closes past open sessions at 11:59:59 PM', async () => {
    // Create an unclosed session from yesterday
    const pastDateStr = '01/10/2026';
    pastRecordId = db.makeId('att-past-');
    await db.insert('attendance_records', {
      id: pastRecordId,
      userId: driverUser2.id,
      date: pastDateStr,
      clockInTime: '08:30 AM',
      clockOutTime: null,
      autoClockOut: false,
      clockOutType: 'MANUAL',
      latitude: 28.6139,
      longitude: 77.2090,
      locationName: 'LogiSphere Regional Hub',
      distanceFromOffice: 20,
      status: 'Verified Location',
      createdAt: '2026-10-01T03:00:00.000Z',
    });

    // Run reconciliation
    const result = await runAutoClockOutReconciliation();
    expect(result.reconciledCount).toBeGreaterThanOrEqual(1);

    // Verify record is now auto-closed at 11:59:59 PM
    const updated = await db.findById('attendance_records', pastRecordId);
    expect(updated).toBeDefined();
    expect(updated.clockouttime || updated.clockOutTime).toBe('11:59 PM');
    expect(updated.auto_clock_out ?? updated.autoClockOut).toBe(true);
    expect(updated.clock_out_type ?? updated.clockOutType).toBe('AUTOMATIC');
  });

  // 4. Idempotency & Concurrency safety
  it('4. Re-running reconciliation is idempotent and does not overwrite existing closed sessions', async () => {
    const secondRun = await runAutoClockOutReconciliation();
    // No new sessions should be closed
    expect(secondRun.reconciledIds).not.toContain(pastRecordId);
  });

  // 5. Next day attendance starts clean
  it('5. Yesterday auto-closed session does not block today clock-in', async () => {
    const clockInRes = await request(app)
      .post('/api/attendance/clock-in')
      .set('Authorization', `Bearer ${driver2Token}`)
      .send({
        latitude: 28.6139,
        longitude: 77.2090,
        distanceFromOffice: 10,
        locationName: 'LogiSphere HQ Gate 2',
      });

    expect(clockInRes.status).toBe(201);
    expect(clockInRes.body.success).toBe(true);
    expect(clockInRes.body.status).toBe('CLOCKED_IN');
  });

  // 6. Multi-session grouping & duration calculations
  it('6. Multiple sessions on the same date are grouped into a single parent entry with accurate totals', async () => {
    const testDate = '15/10/2026';
    const testUserId = `usr-multisess-${Date.now()}`;
    await db.insert('users', {
      id: testUserId,
      email: `multi_test_${Date.now()}@logisphere.ai`,
      name: 'Peyton Baker',
      role: 'ROLE_DRIVER',
      password: 'password',
    });

    // Session 1: 08:00 AM -> 02:00 PM (6 hours = 360 mins)
    await db.insert('attendance_records', {
      id: db.makeId('att-s1-'),
      userId: testUserId,
      date: testDate,
      clockInTime: '08:00 AM',
      clockOutTime: '02:00 PM',
      autoClockOut: false,
      clockOutType: 'MANUAL',
      latitude: 28.6139,
      longitude: 77.2090,
      locationName: 'LogiSphere Terminal A',
      distanceFromOffice: 10,
      status: 'Verified Location',
      createdAt: '2026-10-15T02:30:00.000Z',
    });

    // Session 2: 03:00 PM -> 05:30 PM (2.5 hours = 150 mins)
    await db.insert('attendance_records', {
      id: db.makeId('att-s2-'),
      userId: testUserId,
      date: testDate,
      clockInTime: '03:00 PM',
      clockOutTime: '05:30 PM',
      autoClockOut: false,
      clockOutType: 'MANUAL',
      latitude: 28.6139,
      longitude: 77.2090,
      locationName: 'LogiSphere Terminal B',
      distanceFromOffice: 12,
      status: 'Verified Location',
      createdAt: '2026-10-15T09:30:00.000Z',
    });

    // Request report as manager
    const reportRes = await request(app)
      .get(`/api/attendance/report?search=Peyton`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(reportRes.status).toBe(200);
    expect(reportRes.body.success).toBe(true);

    const peytonItems = reportRes.body.data.items.filter((i: any) => i.userId === testUserId);
    // Exactly 1 parent entry for Peyton on that date!
    expect(peytonItems.length).toBe(1);

    const parent = peytonItems[0];
    expect(parent.staffName).toBe('Peyton Baker');
    expect(parent.sessionsCount).toBe(2);
    expect(parent.totalWorkedMinutes).toBe(510); // 360 + 150 = 510 minutes = 8 hours 30 mins
    expect(parent.totalWorkedDuration).toBe('8h 30m');
    expect(parent.sessions.length).toBe(2);
    expect(parent.sessions[0].clockInTime).toBe('08:00 AM');
    expect(parent.sessions[0].clockOutTime).toBe('02:00 PM');
    expect(parent.sessions[1].clockInTime).toBe('03:00 PM');
    expect(parent.sessions[1].clockOutTime).toBe('05:30 PM');
  });

  // 7. Role-based visibility enforcement
  it('7. Manager can view all staff attendance records', async () => {
    const res = await request(app)
      .get('/api/attendance/report')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isManager).toBe(true);
    expect(res.body.data.items.length).toBeGreaterThanOrEqual(2);
  });

  it('8. Non-manager role can only view their own attendance records', async () => {
    const res = await request(app)
      .get('/api/attendance/report')
      .set('Authorization', `Bearer ${driver1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isManager).toBe(false);

    // All items must belong strictly to driverUser1
    const foreignRecords = res.body.data.items.filter((i: any) => i.userId !== driverUser1.id);
    expect(foreignRecords.length).toBe(0);
  });

  it('9. Non-manager cannot access other users records by injecting query params', async () => {
    const res = await request(app)
      .get(`/api/attendance/report?userId=${driverUser2.id}&search=${driverUser2.name}`)
      .set('Authorization', `Bearer ${driver1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Returned dataset must still be filtered strictly to authenticated driver1!
    const items = res.body.data.items;
    const hasDriver2 = items.some((i: any) => i.userId === driverUser2.id);
    expect(hasDriver2).toBe(false);
  });

  // 10. Search and filters
  it('10. Search filter matches staff name case-insensitively', async () => {
    const res = await request(app)
      .get('/api/attendance/report?search=alice')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.items.every((i: any) => i.staffName.toLowerCase().includes('alice'))).toBe(true);
  });

  // 11. PDF Export generation
  it('11. GET /api/attendance/report/export-pdf generates valid binary PDF', async () => {
    const res = await request(app)
      .get('/api/attendance/report/export-pdf')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.headers['content-disposition']).toContain('attachment');
    // PDF Magic bytes check (%PDF-)
    const isPdfHeader = res.body.slice(0, 4).toString('utf-8') === '%PDF';
    expect(isPdfHeader).toBe(true);
  });

  it('12. GET /api/attendance/report/export-pdf supports token in query param', async () => {
    const res = await request(app)
      .get(`/api/attendance/report/export-pdf?token=${managerToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    const isPdfHeader = res.body.slice(0, 4).toString('utf-8') === '%PDF';
    expect(isPdfHeader).toBe(true);
  });

  // 13. Unit test for calculation helpers
  it('13. Duration & Time calculation unit tests', () => {
    expect(parseTimeToMinutes('08:00 AM')).toBe(480);
    expect(parseTimeToMinutes('02:30 PM')).toBe(870);
    expect(parseTimeToMinutes('11:59:59 PM')).toBe(1439);
    expect(formatMinutesToDuration(90)).toBe('1h 30m');
    expect(formatMinutesToDuration(45)).toBe('45m');
    expect(formatMinutesToDuration(0)).toBe('0m');
    expect(calculateSessionMinutes('09:00 AM', '05:00 PM')).toBe(480);
  });
});
