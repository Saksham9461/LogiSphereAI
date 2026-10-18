import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../../config/database';
import { env } from '../../config/env';
import { optionalAuth } from '../../middleware/auth';
import { ok, fail } from '../../utils/http';
import {
  broadcastEmergencyAlertCreated,
  broadcastEmergencyAlertUpdated,
} from '../chat/websocket';
import { BUSINESS_TIMEZONE, getBusinessDateString } from '../attendance/autoClockOut';

export const alertRouter = Router();

function isManagerRole(role: string = ''): boolean {
  const norm = String(role || '').toUpperCase();
  return [
    'ROLE_MANAGER',
    'FLEET_MANAGER',
    'ROLE_ADMIN',
    'ADMIN',
    'ROLE_DISPATCHER',
    'DISPATCHER',
    'MANAGER',
  ].includes(norm);
}

interface ResolvedUser {
  userId: string;
  email: string;
  role: string;
  businessId?: string;
  business_id?: string;
  organizationId?: string;
  organization_id?: string;
}

function resolveUser(req: Request): ResolvedUser | null {
  if (req.user?.userId) return req.user;
  const header = req.headers.authorization;
  let token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token && req.query?.token && typeof req.query.token === 'string') {
    token = req.query.token;
  }
  if (token) {
    try {
      const decoded: any = jwt.verify(token, env.JWT_SECRET);
      const userId = decoded.userId || decoded.id;
      const orgId = decoded.organizationId || decoded.organization_id || decoded.businessId || decoded.business_id;
      return {
        userId,
        email: decoded.email || '',
        role: decoded.role || 'ROLE_DRIVER',
        organizationId: orgId,
        organization_id: orgId,
        businessId: orgId,
        business_id: orgId,
      };
    } catch {}
  }
  if (req.headers['x-user-id']) {
    return {
      userId: req.headers['x-user-id'] as string,
      email: '',
      role: (req.headers['x-user-role'] as string) || 'ROLE_DRIVER',
    };
  }
  return null;
}

export function normalizeAlertRecord(row: any) {
  if (!row) return null;
  const lat = row.latitude !== null && row.latitude !== undefined && !isNaN(Number(row.latitude))
    ? Number(row.latitude)
    : null;
  const lon = row.longitude !== null && row.longitude !== undefined && !isNaN(Number(row.longitude))
    ? Number(row.longitude)
    : null;

  return {
    id: row.id,
    driverId: row.driver_id || row.driverId,
    driverName: row.driver_name || row.driverName || 'Driver',
    businessId: row.business_id || row.businessId || 'default_org',
    tripId: row.trip_id || row.tripId || null,
    vehicleId: row.vehicle_id || row.vehicleId || null,
    latitude: lat,
    longitude: lon,
    locationAccuracy: row.location_accuracy_meters !== null && row.location_accuracy_meters !== undefined
      ? Number(row.location_accuracy_meters)
      : row.locationAccuracy !== null && row.locationAccuracy !== undefined
      ? Number(row.locationAccuracy)
      : null,
    locationCapturedAt: row.location_captured_at || row.locationCapturedAt || row.createdAt || row.created_at,
    locationStatus: row.location_status || row.locationStatus || (lat !== null ? 'PRECISE' : 'UNAVAILABLE'),
    message: row.message || 'EMERGENCY SOS: Driver triggered emergency alert',
    status: row.status || 'ACTIVE',
    acknowledgedBy: row.acknowledged_by_name || row.acknowledgedByName || row.acknowledged_by || row.acknowledgedBy || null,
    acknowledgedByName: row.acknowledged_by_name || row.acknowledgedByName || null,
    acknowledgedAt: row.acknowledged_at || row.acknowledgedAt || null,
    resolvedBy: row.resolved_by_name || row.resolvedByName || row.resolved_by || row.resolvedBy || null,
    resolvedByName: row.resolved_by_name || row.resolvedByName || null,
    resolvedAt: row.resolved_at || row.resolvedAt || null,
    resolutionNote: row.resolution_note || row.resolutionNote || null,
    clientRequestId: row.client_request_id || row.clientRequestId || null,
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
  };
}

/**
 * POST /api/alerts/sos and POST /api/sos/trigger
 * Driver triggers an emergency SOS alert.
 */
async function handleCreateSOS(req: Request, res: Response) {
  try {
    const user = resolveUser(req);
    if (!user || !user.userId) {
      return fail(res, 401, 'Authentication required to trigger emergency SOS');
    }

    // Role check: Only authenticated drivers are authorized to trigger emergency SOS alerts
    const role = String(user.role || '').toUpperCase();
    const isDriver = role === 'ROLE_DRIVER' || role === 'DRIVER';
    if (!isDriver) {
      return fail(res, 403, 'Forbidden: Only authenticated drivers are authorized to trigger emergency SOS alerts');
    }

    // Always derive authenticated driver's identity strictly from JWT / session
    const driverId = user.userId;

    const rawClientId = req.body?.clientRequestId || req.body?.client_request_id;
    const clientRequestId = rawClientId && typeof rawClientId === 'string' ? rawClientId.trim() : null;

    // 1. Idempotency Check: If clientRequestId is provided, check if alert has already been persisted
    if (clientRequestId) {
      const existingRaw =
        (await db.find('emergency_alerts', { client_request_id: clientRequestId })) ||
        (await db.find('emergency_alerts', { clientRequestId }));

      if (existingRaw) {
        const existingAlert = normalizeAlertRecord(existingRaw);
        if (existingAlert) {
          // Security check: Verify that this alert belongs to the authenticated driver
          if (String(existingAlert.driverId).toLowerCase() !== driverId.toLowerCase()) {
            return fail(res, 403, 'Forbidden: clientRequestId belongs to another driver');
          }
          console.log(
            `[SOS Idempotency] Request with clientRequestId "${clientRequestId}" already persisted (${existingAlert.id}). Returning existing alert without duplicating.`
          );
          return res.status(200).json({
            success: true,
            message: 'Emergency SOS alert already recorded (idempotent)',
            alert: existingAlert,
            isDuplicate: true,
          });
        }
      }
    }

    // Fetch user details to get real driver name and business identity
    const dbUser = await db.find('users', { id: driverId });
    const driverName = dbUser?.name || dbUser?.email || user.email || 'Driver';
    const businessId = dbUser?.businessId || dbUser?.business_id || 'default_org';

    // Validate coordinates
    const reqLat = req.body?.latitude;
    const reqLon = req.body?.longitude;
    const isValidLat = reqLat !== undefined && reqLat !== null && !isNaN(Number(reqLat)) && Number(reqLat) >= -90 && Number(reqLat) <= 90;
    const isValidLon = reqLon !== undefined && reqLon !== null && !isNaN(Number(reqLon)) && Number(reqLon) >= -180 && Number(reqLon) <= 180;

    let latitude: number | null = null;
    let longitude: number | null = null;
    let locationStatus = req.body?.locationStatus || 'PRECISE';

    if (isValidLat && isValidLon) {
      latitude = Number(reqLat);
      longitude = Number(reqLon);
    } else {
      latitude = null;
      longitude = null;
      locationStatus = 'UNAVAILABLE';
    }

    // Associate trip and vehicle if active or provided
    let tripId: string | null = null;
    let vehicleId: string | null = null;

    if (req.body?.tripId) {
      const specifiedTrip = await db.find('trips', { tripID: req.body.tripId }) || await db.find('trips', { id: req.body.tripId });
      if (specifiedTrip && String(specifiedTrip.driverID || specifiedTrip.driverid).toLowerCase() === driverId.toLowerCase()) {
        tripId = specifiedTrip.tripID || specifiedTrip.tripid || specifiedTrip.id;
        vehicleId = specifiedTrip.vehicleID || specifiedTrip.vehicleid || req.body?.vehicleId || null;
      }
    }

    // If no trip provided, search for active trip currently assigned to this driver
    if (!tripId) {
      const allTrips = await db.list('trips');
      const activeTrip = (allTrips || []).find((t: any) => {
        const isDriver = String(t.driverID || t.driverid || '').toLowerCase() === driverId.toLowerCase();
        const rawStatus = String(t.status || '').toUpperCase();
        const isActive = ['ON_TRIP', 'ON TRIP', 'ACCEPTED', 'DISPATCHED', 'IN_TRANSIT', 'GOING_TO_PICKUP', 'ARRIVED_AT_PICKUP'].includes(rawStatus);
        return isDriver && isActive;
      });

      if (activeTrip) {
        tripId = activeTrip.tripID || activeTrip.tripid || activeTrip.id;
        vehicleId = activeTrip.vehicleID || activeTrip.vehicleid || null;
      } else if (req.body?.vehicleId) {
        vehicleId = req.body.vehicleId;
      }
    }

    const nowIso = new Date().toISOString();
    const eventTime = req.body?.createdAt || nowIso;
    const alertData = {
      id: db.makeId('alt-'),
      clientRequestId,
      client_request_id: clientRequestId,
      driverId,
      driverName,
      businessId,
      tripId,
      vehicleId,
      latitude,
      longitude,
      locationAccuracy: req.body?.accuracy !== undefined && req.body?.accuracy !== null ? Number(req.body.accuracy) : null,
      locationCapturedAt: req.body?.capturedAt || (latitude !== null ? eventTime : null),
      locationStatus,
      message: req.body?.message || 'EMERGENCY SOS: Driver triggered emergency alert',
      status: 'ACTIVE',
      acknowledgedBy: null,
      acknowledgedAt: null,
      resolvedBy: null,
      resolvedAt: null,
      resolutionNote: null,
      createdAt: eventTime,
      updatedAt: nowIso,
    };

    console.log(`[SOS Alert Created] Persisting alert for driver "${driverName}" (${driverId}) with location:`, {
      latitude,
      longitude,
      locationStatus,
      clientRequestId,
    });

    let savedRaw: any;
    try {
      savedRaw = await db.insert('emergency_alerts', alertData);
    } catch (insertErr: any) {
      // If concurrent request inserted the same clientRequestId simultaneously
      if (
        clientRequestId &&
        (insertErr?.code === '23505' ||
          String(insertErr?.message).includes('client_request_id') ||
          String(insertErr?.message).includes('duplicate key') ||
          String(insertErr?.message).includes('already exists'))
      ) {
        const raceExisting =
          (await db.find('emergency_alerts', { client_request_id: clientRequestId })) ||
          (await db.find('emergency_alerts', { clientRequestId }));
        if (raceExisting) {
          const normalizedRace = normalizeAlertRecord(raceExisting);
          if (normalizedRace) {
            console.log(
              `[SOS Race Condition Resolved] Concurrent clientRequestId "${clientRequestId}" detected. Returning existing alert ${normalizedRace.id}.`
            );
            return res.status(200).json({
              success: true,
              message: 'Emergency SOS alert already recorded (idempotent)',
              alert: normalizedRace,
              isDuplicate: true,
            });
          }
        }
      }
      throw insertErr;
    }

    const persistedAlert = normalizeAlertRecord(savedRaw) || alertData;

    // Create system notification entry for managers
    try {
      await db.insert('notifications', {
        id: db.makeId('notif-'),
        userId: null,
        type: 'SOS',
        category: 'EMERGENCY',
        title: '🚨 EMERGENCY SOS ALERT',
        body: `Driver ${driverName} triggered an emergency SOS alert at ${getBusinessDateString()}!`,
        read: false,
        createdAt: nowIso,
      });
    } catch (_) {}

    // Immediately broadcast via WebSocket to authorized managers & driver
    broadcastEmergencyAlertCreated(persistedAlert);

    return res.status(201).json({
      success: true,
      message: 'Emergency SOS alert recorded and dispatched to control center',
      alert: persistedAlert,
    });
  } catch (error: any) {
    console.error('[SOS Alert Error] handleCreateSOS failed:', error);
    return fail(res, 500, error.message || 'Failed to dispatch SOS alert');
  }
}

alertRouter.post('/sos', optionalAuth, handleCreateSOS);
alertRouter.post('/trigger', optionalAuth, handleCreateSOS);

/**
 * GET /api/alerts
 * List emergency alerts with role-based access control:
 * - Managers: see all alerts within their business/organization.
 * - Drivers: see strictly only their own alerts.
 */
alertRouter.get('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const user = resolveUser(req);
    if (!user || !user.userId) {
      return fail(res, 401, 'Authentication required to view emergency alerts');
    }

    const isManager = isManagerRole(user.role);
    const dbUser = await db.find('users', { id: user.userId });
    const userOrg = dbUser?.businessId || dbUser?.business_id || user.businessId || 'default_org';

    const allAlertsRaw = await db.list('emergency_alerts');
    const normalized = (allAlertsRaw || []).map(normalizeAlertRecord).filter(Boolean);

    // Resolve user IDs to real human-readable names
    try {
      const allUsers = await db.list('users');
      const userMap = new Map<string, string>();
      for (const u of (allUsers || [])) {
        if (u.id) {
          userMap.set(String(u.id).toLowerCase(), u.name || u.email || 'Fleet Manager');
        }
      }

      for (const a of normalized) {
        if (a) {
          const ackId = a.acknowledgedBy ? String(a.acknowledgedBy).toLowerCase() : '';
          if (ackId && userMap.has(ackId)) {
            const name = userMap.get(ackId)!;
            a.acknowledgedByName = name;
            a.acknowledgedBy = name;
          } else if (a.acknowledgedByName) {
            a.acknowledgedBy = a.acknowledgedByName;
          } else if (a.acknowledgedBy && (String(a.acknowledgedBy).startsWith('usr-') || /^[0-9a-f]{8}-/i.test(String(a.acknowledgedBy)))) {
            a.acknowledgedBy = 'Fleet Manager';
          }

          const resId = a.resolvedBy ? String(a.resolvedBy).toLowerCase() : '';
          if (resId && userMap.has(resId)) {
            const name = userMap.get(resId)!;
            a.resolvedByName = name;
            a.resolvedBy = name;
          } else if (a.resolvedByName) {
            a.resolvedBy = a.resolvedByName;
          } else if (a.resolvedBy && (String(a.resolvedBy).startsWith('usr-') || /^[0-9a-f]{8}-/i.test(String(a.resolvedBy)))) {
            a.resolvedBy = 'Fleet Manager';
          }
        }
      }
    } catch (_) {}

    // Strict access control:
    // - Non-managers (drivers): see strictly only their own alerts.
    // - Managers: see alerts belonging to their authorized organization.
    let filtered = normalized;
    if (!isManager) {
      filtered = filtered.filter(
        (a: any) => String(a.driverId).toLowerCase() === String(user.userId).toLowerCase()
      );
    } else {
      filtered = filtered.filter((a: any) => {
        const alertOrg = a.businessId || 'default_org';
        return alertOrg === userOrg;
      });
    }

    // Status filter
    const statusQuery = String(req.query.status || 'ALL').toUpperCase();
    if (statusQuery !== 'ALL') {
      filtered = filtered.filter((a: any) => String(a.status).toUpperCase() === statusQuery);
    }

    // Date filter (YYYY-MM-DD)
    const dateQuery = req.query.date as string;
    if (dateQuery && /^\d{4}-\d{2}-\d{2}$/.test(dateQuery)) {
      filtered = filtered.filter((a: any) => {
        try {
          const recDate = getBusinessDateString(new Date(a.createdAt), BUSINESS_TIMEZONE);
          return recDate === dateQuery;
        } catch {
          return false;
        }
      });
    }

    // Search query filter (driver name, vehicle, trip, id)
    const searchQuery = String(req.query.search || '').trim().toLowerCase();
    if (searchQuery) {
      filtered = filtered.filter((a: any) => {
        return (
          String(a.driverName || '').toLowerCase().includes(searchQuery) ||
          String(a.id || '').toLowerCase().includes(searchQuery) ||
          String(a.vehicleId || '').toLowerCase().includes(searchQuery) ||
          String(a.tripId || '').toLowerCase().includes(searchQuery) ||
          String(a.message || '').toLowerCase().includes(searchQuery)
        );
      });
    }

    // Sort newest first
    filtered.sort((a: any, b: any) => {
      const tA = new Date(a.createdAt).getTime();
      const tB = new Date(b.createdAt).getTime();
      return tB - tA;
    });

    const activeCount = filtered.filter((a: any) => a.status === 'ACTIVE').length;

    // Pagination
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const limit = Math.max(1, Math.min(100, parseInt(String(req.query.limit || '50'), 10)));
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const paginated = filtered.slice((page - 1) * limit, page * limit);

    return res.json({
      success: true,
      alerts: paginated,
      total,
      page,
      limit,
      totalPages,
      activeCount,
      isManager,
    });
  } catch (error: any) {
    console.error('[Alerts API Error] GET /api/alerts failed:', error);
    return fail(res, 500, error.message || 'Failed to fetch emergency alerts');
  }
});

/**
 * GET /api/alerts/count
 * Quick status and badge counter.
 */
alertRouter.get('/count', optionalAuth, async (req: Request, res: Response) => {
  try {
    const user = resolveUser(req);
    if (!user || !user.userId) {
      return res.json({ success: true, activeCount: 0, totalCount: 0 });
    }

    const isManager = isManagerRole(user.role);
    const dbUser = await db.find('users', { id: user.userId });
    const userOrg = dbUser?.businessId || dbUser?.business_id || user.businessId || 'default_org';

    const allAlertsRaw = await db.list('emergency_alerts');
    const normalized = (allAlertsRaw || []).map(normalizeAlertRecord).filter(Boolean);

    let scoped = normalized;
    if (!isManager) {
      scoped = scoped.filter(
        (a: any) => String(a.driverId).toLowerCase() === String(user.userId).toLowerCase()
      );
    } else {
      scoped = scoped.filter((a: any) => {
        const alertOrg = a.businessId || 'default_org';
        return alertOrg === userOrg;
      });
    }

    const activeCount = scoped.filter((a: any) => a.status === 'ACTIVE').length;
    return res.json({
      success: true,
      activeCount,
      totalCount: scoped.length,
      isManager,
    });
  } catch (error: any) {
    return fail(res, 500, error.message || 'Failed to count alerts');
  }
});

/**
 * GET /api/alerts/:id
 * Fetch single alert details.
 */
alertRouter.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const user = resolveUser(req);
    if (!user || !user.userId) {
      return fail(res, 401, 'Authentication required');
    }

    const alertRaw = await db.find('emergency_alerts', { id: req.params.id });
    if (!alertRaw) {
      return fail(res, 404, 'Emergency alert not found');
    }

    const alert = normalizeAlertRecord(alertRaw);
    if (!alert) {
      return fail(res, 404, 'Emergency alert not found');
    }
    const isManager = isManagerRole(user.role);

    // Drivers can only access their own alert
    if (!isManager && String(alert.driverId).toLowerCase() !== String(user.userId).toLowerCase()) {
      return fail(res, 403, 'Forbidden: You cannot access alerts created by other drivers');
    }

    // Managers can only access alerts from their own organization
    if (isManager) {
      const dbUser = await db.find('users', { id: user.userId });
      const userOrg = dbUser?.businessId || dbUser?.business_id || user.businessId || 'default_org';
      const alertOrg = alert.businessId || 'default_org';
      if (userOrg !== alertOrg) {
        return fail(res, 403, 'Forbidden: You cannot access alerts belonging to another organization');
      }
    }

    // Resolve user IDs to human-readable names
    try {
      if (alert.acknowledgedBy) {
        const u = await db.find('users', { id: alert.acknowledgedBy });
        if (u) {
          alert.acknowledgedByName = u.name || u.email || 'Fleet Manager';
          alert.acknowledgedBy = alert.acknowledgedByName;
        } else if (alert.acknowledgedByName) {
          alert.acknowledgedBy = alert.acknowledgedByName;
        } else if (String(alert.acknowledgedBy).startsWith('usr-') || /^[0-9a-f]{8}-/i.test(String(alert.acknowledgedBy))) {
          alert.acknowledgedBy = 'Fleet Manager';
        }
      }
      if (alert.resolvedBy) {
        const u = await db.find('users', { id: alert.resolvedBy });
        if (u) {
          alert.resolvedByName = u.name || u.email || 'Fleet Manager';
          alert.resolvedBy = alert.resolvedByName;
        } else if (alert.resolvedByName) {
          alert.resolvedBy = alert.resolvedByName;
        } else if (String(alert.resolvedBy).startsWith('usr-') || /^[0-9a-f]{8}-/i.test(String(alert.resolvedBy))) {
          alert.resolvedBy = 'Fleet Manager';
        }
      }
    } catch (_) {}

    return ok(res, alert);
  } catch (error: any) {
    return fail(res, 500, error.message || 'Failed to fetch alert details');
  }
});

/**
 * PATCH & POST /api/alerts/:id/acknowledge
 * Acknowledge an active emergency alert (Managers only).
 */
async function handleAcknowledgeAlert(req: Request, res: Response) {
  try {
    const user = resolveUser(req);
    if (!user || !user.userId) {
      return fail(res, 401, 'Authentication required');
    }

    if (!isManagerRole(user.role)) {
      return fail(res, 403, 'Forbidden: Only authorized managers can acknowledge emergency alerts');
    }

    const alertId = req.params.id;
    const existingRaw = await db.find('emergency_alerts', { id: alertId });
    if (!existingRaw) {
      return fail(res, 404, 'Emergency alert not found');
    }

    const existingAlert = normalizeAlertRecord(existingRaw);
    const dbUser = await db.find('users', { id: user.userId });
    const userOrg = dbUser?.businessId || dbUser?.business_id || user.businessId || 'default_org';
    const alertOrg = existingAlert?.businessId || 'default_org';
    if (userOrg !== alertOrg) {
      return fail(res, 403, 'Forbidden: You cannot acknowledge alerts belonging to another organization');
    }

    const managerName = dbUser?.name || dbUser?.email || (user as any).name || user.email || 'Fleet Manager';
    const nowIso = new Date().toISOString();
    const patch = {
      status: 'ACKNOWLEDGED',
      acknowledgedBy: user.userId,
      acknowledged_by: user.userId,
      acknowledgedByName: managerName,
      acknowledged_by_name: managerName,
      acknowledgedAt: nowIso,
      acknowledged_at: nowIso,
      updatedAt: nowIso,
      updated_at: nowIso,
    };

    const updatedRaw = await db.update('emergency_alerts', { id: alertId }, patch);
    const updatedAlert = normalizeAlertRecord(updatedRaw) || {
      ...normalizeAlertRecord(existingRaw),
      ...patch,
    };
    updatedAlert.acknowledgedBy = user.userId;
    updatedAlert.acknowledgedByName = managerName;

    broadcastEmergencyAlertUpdated(updatedAlert);

    return ok(res, updatedAlert, 'Alert successfully acknowledged');
  } catch (error: any) {
    console.error('[Alerts API Error] Acknowledge failed:', error);
    return fail(res, 500, error.message || 'Failed to acknowledge alert');
  }
}

alertRouter.patch('/:id/acknowledge', optionalAuth, handleAcknowledgeAlert);
alertRouter.post('/:id/acknowledge', optionalAuth, handleAcknowledgeAlert);

/**
 * PATCH & POST /api/alerts/:id/resolve
 * Resolve an emergency alert with an optional resolution note (Managers only).
 */
async function handleResolveAlert(req: Request, res: Response) {
  try {
    const user = resolveUser(req);
    if (!user || !user.userId) {
      return fail(res, 401, 'Authentication required');
    }

    if (!isManagerRole(user.role)) {
      return fail(res, 403, 'Forbidden: Only authorized managers can resolve emergency alerts');
    }

    const alertId = req.params.id;
    const existingRaw = await db.find('emergency_alerts', { id: alertId });
    if (!existingRaw) {
      return fail(res, 404, 'Emergency alert not found');
    }

    const existingAlert = normalizeAlertRecord(existingRaw);
    const dbUser = await db.find('users', { id: user.userId });
    const userOrg = dbUser?.businessId || dbUser?.business_id || user.businessId || 'default_org';
    const alertOrg = existingAlert?.businessId || 'default_org';
    if (userOrg !== alertOrg) {
      return fail(res, 403, 'Forbidden: You cannot resolve alerts belonging to another organization');
    }

    const managerName = dbUser?.name || dbUser?.email || (user as any).name || user.email || 'Fleet Manager';
    const nowIso = new Date().toISOString();
    const resolutionNote = req.body?.resolutionNote || req.body?.note || 'Resolved by fleet manager';

    const patch = {
      status: 'RESOLVED',
      resolvedBy: user.userId,
      resolved_by: user.userId,
      resolvedByName: managerName,
      resolved_by_name: managerName,
      resolvedAt: nowIso,
      resolved_at: nowIso,
      resolutionNote,
      resolution_note: resolutionNote,
      updatedAt: nowIso,
      updated_at: nowIso,
    };

    const updatedRaw = await db.update('emergency_alerts', { id: alertId }, patch);
    const updatedAlert = normalizeAlertRecord(updatedRaw) || {
      ...normalizeAlertRecord(existingRaw),
      ...patch,
    };
    updatedAlert.resolvedBy = user.userId;
    updatedAlert.resolvedByName = managerName;

    broadcastEmergencyAlertUpdated(updatedAlert);

    return ok(res, updatedAlert, 'Alert successfully resolved');
  } catch (error: any) {
    console.error('[Alerts API Error] Resolve failed:', error);
    return fail(res, 500, error.message || 'Failed to resolve alert');
  }
}

alertRouter.patch('/:id/resolve', optionalAuth, handleResolveAlert);
alertRouter.post('/:id/resolve', optionalAuth, handleResolveAlert);
