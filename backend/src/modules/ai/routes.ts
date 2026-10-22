import { Router, Request, Response } from 'express';
import { db } from '../../config/database';
import { env } from '../../config/env';
import { authenticate, getTrustedOrgId } from '../../middleware/auth';
import { ok, fail } from '../../utils/http';
import { executeResilientAi } from './orchestrator';
import { callGemini } from './geminiClient';
import { aiMetrics } from './metrics';
import { aiCache } from './cache';
import { aiCircuitBreaker } from './circuitBreaker';
import { singleFlight } from './singleFlight';

export const aiRouter = Router();

// --- FLEET INTELLIGENCE ASSISTANT CONTRACT ---
export interface FleetAiResponse {
  success: boolean;
  intent: string;
  type: 'metric' | 'summary' | 'vehicle_card' | 'trip_card' | 'list' | 'tracking' | 'clarification' | 'error';
  message: string;
  metrics?: Record<string, number | string>;
  items?: Array<{
    id: string;
    title: string;
    subtitle?: string;
    badge?: string;
    badgeColor?: string;
    metadata?: Record<string, string | number>;
    actionPayload?: any;
  }>;
  actions?: Array<{
    label: string;
    actionType: 'navigate' | 'query' | 'track_vehicle';
    payload?: any;
  }>;
  hasMore?: boolean;
  context?: {
    lastSubjectType?: 'vehicle' | 'trip' | 'driver';
    lastSubjectId?: string;
    lastSubjectName?: string;
  };
  suggestions?: string[];
}

function isTodayDate(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const y = now.getFullYear();
  const todayLocale = `${m}/${d}/${y}`;
  const todayLocaleAlt = `${d}/${m}/${y}`;

  const clean = String(dateStr).trim();
  if (clean.startsWith(todayIso)) return true;
  if (clean.includes(todayLocale) || clean.includes(todayLocaleAlt)) return true;

  try {
    const parsed = new Date(clean);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10) === todayIso;
    }
  } catch { }
  return false;
}

function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return 'No timestamp';
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    if (diffMs < 0) return 'Just now';
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return 'Recently';
  }
}

// Manager & Driver suggestions constants
const MANAGER_SUGGESTIONS = [
  '🚚 Show active vehicles',
  "🛣️ Today's trip summary",
  '📍 Track a vehicle',
  '⏱️ Driver attendance',
  '🔧 Upcoming maintenance',
  '⛽ Fuel & expenses',
  '📊 Driver performance',
  '🚨 Fleet alerts',
  '🛣️ Route intelligence',
  '📋 Ask about a trip',
];

const DRIVER_SUGGESTIONS = [
  '🚚 My current trip',
  '📋 My assigned trips',
  '⏱️ My attendance',
  '🚛 My vehicle details',
  '📜 My trip history',
  '⚠️ Report an issue',
];

// --- UPGRADED ROLE-AWARE FLEET INTELLIGENCE QUERY ENDPOINT ---
aiRouter.post('/query', authenticate, async (req: Request, res: Response) => {
  try {
    const rawQuery = String(req.body?.query ?? '').trim();
    const query = rawQuery.toLowerCase();
    const reqContext = req.body?.context || {};
    const userRole = String(req.user?.role ?? 'ROLE_DRIVER').toUpperCase();
    const userId = req.user?.userId;
    const orgId = getTrustedOrgId(req);
    const orgFilter = orgId ? { organization_id: orgId } : undefined;

    const isDriver = userRole === 'ROLE_DRIVER' || userRole === 'DRIVER';
    const isManager = ['ROLE_MANAGER', 'FLEET_MANAGER', 'ROLE_DISPATCHER', 'DISPATCHER', 'ADMIN'].includes(userRole);

    // Fetch minimal fleet state concurrently, strictly isolated by caller's organization
    const [vehicles, trips, drivers, fuel, maintenance, attendance, tracking, notifications] = await Promise.all([
      db.list('vehicles', orgFilter),
      db.list('trips', orgFilter),
      db.list('users', { role: 'ROLE_DRIVER', ...(orgFilter || {}) }),
      db.list('fuel_logs', orgFilter),
      db.list('maintenance_records', orgFilter),
      db.list('attendance_records', orgFilter),
      db.list('tracking_locations', orgFilter),
      db.list('notifications', orgFilter),
    ]);

    // Active trip status set
    const activeTripStatuses = [
      'ACCEPTED',
      'ASSIGNED',
      'GOING_TO_PICKUP',
      'ARRIVED_AT_PICKUP',
      'PICKED_UP',
      'IN_TRANSIT',
      'ARRIVED_AT_DROP',
      'DISPATCHED',
    ];

    // --- 1. DRIVER AUTHORIZATION CHECKS & QUERIES ---
    if (isDriver) {
      // Driver asks for fleet-wide manager analytics -> block politely
      const restrictedKeywords = [
        'all vehicles',
        'active vehicles',
        'fleet summary',
        'fleet fuel',
        'all drivers',
        'driver performance',
        'fleet expenses',
        'upcoming maintenance',
      ];
      const isRestrictedQuery = restrictedKeywords.some((kw) => query.includes(kw));

      if (isRestrictedQuery) {
        const response: FleetAiResponse = {
          success: true,
          intent: 'RESTRICTED_ACCESS',
          type: 'clarification',
          message: 'Access to fleet-wide management analytics is restricted to Managers and Dispatchers. You can ask about your assigned trips, vehicle, or attendance.',
          suggestions: DRIVER_SUGGESTIONS,
        };
        return res.json(response);
      }

      // 1.1 My current trip
      if (query.includes('current trip') || query.includes('my trip') || (query.includes('trip') && !query.includes('history') && !query.includes('assigned'))) {
        const myActiveTrip = trips.find(
          (t: any) =>
            String(t.driverID || t.driverid || '').trim().toLowerCase() === String(userId).trim().toLowerCase() &&
            activeTripStatuses.includes(String(t.status || '').toUpperCase())
        );

        if (myActiveTrip) {
          const tripId = String(myActiveTrip.tripID || myActiveTrip.tripid || myActiveTrip.id);
          const response: FleetAiResponse = {
            success: true,
            intent: 'DRIVER_CURRENT_TRIP',
            type: 'trip_card',
            message: `Your active trip is #${tripId} (${String(myActiveTrip.status || '').replace(/_/g, ' ')}).`,
            metrics: {
              'Trip ID': `#${tripId}`,
              'Cargo': `${myActiveTrip.cargoWeight || myActiveTrip.cargoweight || 0} kg`,
              'Status': String(myActiveTrip.status || '').replace(/_/g, ' '),
            },
            items: [
              {
                id: tripId,
                title: `#${tripId}`,
                subtitle: `${String(myActiveTrip.source || '').split(',')[0]} ➔ ${String(myActiveTrip.destination || '').split(',')[0]}`,
                badge: String(myActiveTrip.status || 'ACTIVE'),
                badgeColor: '#3B82F6',
              },
            ],
            actions: [
              {
                label: 'View Trip Details',
                actionType: 'navigate',
                payload: { screen: 'TripDispatcher', tripId },
              },
            ],
            context: {
              lastSubjectType: 'trip',
              lastSubjectId: tripId,
              lastSubjectName: `#${tripId}`,
            },
            suggestions: DRIVER_SUGGESTIONS,
          };
          return res.json(response);
        } else {
          return res.json({
            success: true,
            intent: 'DRIVER_CURRENT_TRIP',
            type: 'trip_card',
            message: 'You have no active trips currently in transit.',
            suggestions: DRIVER_SUGGESTIONS,
          });
        }
      }

      // 1.2 My assigned trips
      if (query.includes('assigned trips') || query.includes('assigned') || (query.includes('my') && query.includes('trips'))) {
        const myTrips = trips.filter(
          (t: any) => String(t.driverID || t.driverid || '').trim().toLowerCase() === String(userId).trim().toLowerCase()
        );
        const activeCount = myTrips.filter((t: any) => activeTripStatuses.includes(String(t.status || '').toUpperCase())).length;

        const response: FleetAiResponse = {
          success: true,
          intent: 'DRIVER_ASSIGNED_TRIPS',
          type: 'list',
          message: myTrips.length > 0 ? `You have ${myTrips.length} assigned trip${myTrips.length === 1 ? '' : 's'} (${activeCount} active).` : 'You have no trips assigned.',
          metrics: {
            'Total Assigned': myTrips.length,
            'Active Now': activeCount,
          },
          items: myTrips.slice(0, 3).map((t: any) => ({
            id: String(t.tripID || t.tripid || t.id),
            title: `#${t.tripID || t.tripid || t.id}`,
            subtitle: `${String(t.source || '').split(',')[0]} ➔ ${String(t.destination || '').split(',')[0]}`,
            badge: String(t.status || 'ASSIGNED'),
            badgeColor: '#10B981',
          })),
          hasMore: myTrips.length > 3,
          actions: [
            {
              label: 'View Trips',
              actionType: 'navigate',
              payload: { screen: 'TripDispatcher' },
            },
          ],
          suggestions: DRIVER_SUGGESTIONS,
        };
        return res.json(response);
      }

      // 1.3 My attendance
      if (query.includes('attendance') || query.includes('clock in') || query.includes('clock-in') || query.includes('hours')) {
        const myAttendance = attendance.filter(
          (a: any) => String(a.userId || a.userid || '').trim().toLowerCase() === String(userId).trim().toLowerCase()
        );
        const todayRecord = myAttendance.find((a: any) => isTodayDate(a.date || a.createdAt || a.createdat));

        if (todayRecord) {
          const response: FleetAiResponse = {
            success: true,
            intent: 'DRIVER_ATTENDANCE',
            type: 'metric',
            message: `You clocked in at ${todayRecord.clockInTime || todayRecord.clockintime || 'today'} at ${todayRecord.locationName || todayRecord.locationname || 'LogiSphere AI HQ'}.`,
            metrics: {
              'Clock In': todayRecord.clockInTime || todayRecord.clockintime || 'Logged',
              'Status': todayRecord.status || 'Verified',
              'Location': todayRecord.locationName || todayRecord.locationname || 'HQ',
            },
            actions: [
              {
                label: 'View Attendance Report',
                actionType: 'navigate',
                payload: { screen: 'AttendanceReport' },
              },
            ],
            suggestions: DRIVER_SUGGESTIONS,
          };
          return res.json(response);
        } else {
          return res.json({
            success: true,
            intent: 'DRIVER_ATTENDANCE',
            type: 'metric',
            message: 'You have not clocked in yet today.',
            actions: [
              {
                label: 'Attendance Screen',
                actionType: 'navigate',
                payload: { screen: 'AttendanceReport' },
              },
            ],
            suggestions: DRIVER_SUGGESTIONS,
          });
        }
      }

      // 1.4 My vehicle details
      if (query.includes('vehicle') || query.includes('my vehicle') || query.includes('truck') || query.includes('van')) {
        const myActiveTrip = trips.find(
          (t: any) =>
            String(t.driverID || t.driverid || '').trim().toLowerCase() === String(userId).trim().toLowerCase() &&
            activeTripStatuses.includes(String(t.status || '').toUpperCase())
        );
        const assignedVehId = myActiveTrip ? String(myActiveTrip.vehicleID || myActiveTrip.vehicleid || '') : '';
        const myVehicle = vehicles.find(
          (v: any) => String(v.vehicleID || v.vehicleid || v.id || '').toLowerCase() === assignedVehId.toLowerCase()
        );

        if (myVehicle) {
          const vehName = myVehicle.name || myVehicle.registrationNumber || myVehicle.registrationnumber || 'Assigned Vehicle';
          const response: FleetAiResponse = {
            success: true,
            intent: 'DRIVER_VEHICLE',
            type: 'vehicle_card',
            message: `You are assigned to ${vehName} (${myVehicle.type || 'Vehicle'}).`,
            metrics: {
              'Vehicle': vehName,
              'Odometer': `${myVehicle.odometer || 0} km`,
              'Capacity': `${myVehicle.maxLoadCapacity || myVehicle.maxloadcapacity || 1000} kg`,
            },
            items: [
              {
                id: String(myVehicle.vehicleID || myVehicle.vehicleid || myVehicle.id),
                title: vehName,
                subtitle: `Reg: ${myVehicle.registrationNumber || myVehicle.registrationnumber || 'N/A'} • Status: ${myVehicle.status || 'AVAILABLE'}`,
                badge: String(myVehicle.status || 'ACTIVE'),
                badgeColor: '#10B981',
              },
            ],
            suggestions: DRIVER_SUGGESTIONS,
          };
          return res.json(response);
        } else {
          return res.json({
            success: true,
            intent: 'DRIVER_VEHICLE',
            type: 'metric',
            message: 'No vehicle is currently assigned to you.',
            suggestions: DRIVER_SUGGESTIONS,
          });
        }
      }

      // 1.5 My trip history
      if (query.includes('history') || query.includes('past trip') || query.includes('completed')) {
        const completedTrips = trips.filter(
          (t: any) =>
            String(t.driverID || t.driverid || '').trim().toLowerCase() === String(userId).trim().toLowerCase() &&
            String(t.status || '').toUpperCase() === 'COMPLETED'
        );
        const response: FleetAiResponse = {
          success: true,
          intent: 'DRIVER_TRIP_HISTORY',
          type: 'list',
          message: completedTrips.length > 0 ? `You have completed ${completedTrips.length} trip${completedTrips.length === 1 ? '' : 's'}.` : 'No completed trips on record.',
          metrics: {
            'Completed Trips': completedTrips.length,
          },
          items: completedTrips.slice(0, 3).map((t: any) => ({
            id: String(t.tripID || t.tripid || t.id),
            title: `#${t.tripID || t.tripid || t.id}`,
            subtitle: `${String(t.source || '').split(',')[0]} ➔ ${String(t.destination || '').split(',')[0]}`,
            badge: 'COMPLETED',
            badgeColor: '#10B981',
          })),
          hasMore: completedTrips.length > 3,
          suggestions: DRIVER_SUGGESTIONS,
        };
        return res.json(response);
      }

      // 1.6 Report issue / request assistance
      if (query.includes('issue') || query.includes('report') || query.includes('help') || query.includes('assist')) {
        return res.json({
          success: true,
          intent: 'DRIVER_ASSISTANCE',
          type: 'clarification',
          message: 'To report an urgent issue or emergency, tap the SOS button. For dispatch communication, use Chat.',
          actions: [
            {
              label: 'Open Fleet Chat',
              actionType: 'navigate',
              payload: { screen: 'Chat' },
            },
          ],
          suggestions: DRIVER_SUGGESTIONS,
        });
      }
    }

    // --- 2. MANAGER / DISPATCHER INTENT RESOLUTION ---

    // 2.1 Track a vehicle / Live GPS location / "Where is it?"
    const isTrackingQuery =
      query.includes('track') ||
      query.includes('where is') ||
      query.includes('where are') ||
      query.includes('location') ||
      query.includes('gps');

    if (isTrackingQuery) {
      // Find candidate vehicle from query, context, or active trips
      let targetVehicle: any = null;
      let targetTrip: any = null;

      // 1. Check if specific vehicle name or ID is mentioned in the query
      for (const v of vehicles) {
        const vId = String(v.vehicleID || v.vehicleid || v.id || '').toLowerCase();
        const vName = String(v.name || '').toLowerCase();
        const vReg = String(v.registrationNumber || v.registrationnumber || '').toLowerCase();
        if ((vName && query.includes(vName)) || (vReg && query.includes(vReg)) || (vId && query.includes(vId))) {
          targetVehicle = v;
          break;
        }
      }

      // 2. Check if a trip ID is mentioned
      if (!targetVehicle) {
        for (const t of trips) {
          const tId = String(t.tripID || t.tripid || t.id || '').toLowerCase();
          if (tId && query.includes(tId)) {
            targetTrip = t;
            const tripVehId = String(t.vehicleID || t.vehicleid || '').toLowerCase();
            targetVehicle = vehicles.find((v: any) => String(v.vehicleID || v.vehicleid || v.id || '').toLowerCase() === tripVehId);
            break;
          }
        }
      }

      // 3. Pronoun resolution: "Where is it?", "Track it"
      if (!targetVehicle && (query.includes(' it') || query.includes('it?') || query.includes('that vehicle') || query.includes('the vehicle'))) {
        if (reqContext?.lastSubjectId) {
          const ctxId = String(reqContext.lastSubjectId).toLowerCase();
          targetVehicle = vehicles.find(
            (v: any) =>
              String(v.vehicleID || v.vehicleid || v.id || '').toLowerCase() === ctxId ||
              String(v.name || '').toLowerCase() === ctxId
          );
          if (!targetVehicle) {
            targetTrip = trips.find((t: any) => String(t.tripID || t.tripid || t.id || '').toLowerCase() === ctxId);
            if (targetTrip) {
              const tripVehId = String(targetTrip.vehicleID || targetTrip.vehicleid || '').toLowerCase();
              targetVehicle = vehicles.find((v: any) => String(v.vehicleID || v.vehicleid || v.id || '').toLowerCase() === tripVehId);
            }
          }
        }
      }

      // 4. Default to single active vehicle if exactly one is active
      if (!targetVehicle) {
        const activeTripsList = trips.filter((t: any) => activeTripStatuses.includes(String(t.status || '').toUpperCase()));
        if (activeTripsList.length === 1) {
          targetTrip = activeTripsList[0];
          const tripVehId = String(targetTrip.vehicleID || targetTrip.vehicleid || '').toLowerCase();
          targetVehicle = vehicles.find((v: any) => String(v.vehicleID || v.vehicleid || v.id || '').toLowerCase() === tripVehId);
        }
      }

      if (targetVehicle) {
        const vId = String(targetVehicle.vehicleID || targetVehicle.vehicleid || targetVehicle.id);
        const vName = targetVehicle.name || targetVehicle.registrationNumber || targetVehicle.registrationnumber || vId;

        // Associate active trip if not already resolved
        if (!targetTrip) {
          targetTrip = trips.find(
            (t: any) =>
              String(t.vehicleID || t.vehicleid || '').toLowerCase() === vId.toLowerCase() &&
              activeTripStatuses.includes(String(t.status || '').toUpperCase())
          );
        }

        // Query tracking locations for this vehicle/trip
        const matchingLocations = tracking.filter(
          (loc: any) =>
            String(loc.vehicleID || loc.vehicleid || '').toLowerCase() === vId.toLowerCase() ||
            (targetTrip && String(loc.tripID || loc.tripid || '').toLowerCase() === String(targetTrip.tripID || targetTrip.tripid || '').toLowerCase())
        );

        // Sort to get latest
        matchingLocations.sort((a: any, b: any) => {
          const tA = new Date(a.timestamp || a.updatedAt || a.updatedat || 0).getTime();
          const tB = new Date(b.timestamp || b.updatedAt || b.updatedat || 0).getTime();
          return tB - tA;
        });

        const latestLoc = matchingLocations[0];
        const hasCoords = latestLoc && latestLoc.latitude !== undefined && latestLoc.longitude !== undefined;
        const locTimestamp = latestLoc ? (latestLoc.timestamp || latestLoc.updatedAt || latestLoc.updatedat) : null;
        const isFresh = locTimestamp && (Date.now() - new Date(locTimestamp).getTime() < 10 * 60 * 1000); // 10 min window

        let trackingMsg = '';
        let badge = 'LIVE GPS';
        let badgeColor = '#10B981';

        if (hasCoords && isFresh) {
          trackingMsg = `Vehicle ${vName} is currently on route (${latestLoc.speed || 0} km/h).`;
          badge = 'LIVE GPS';
          badgeColor = '#10B981';
        } else if (hasCoords && !isFresh) {
          trackingMsg = `Vehicle ${vName} GPS was last updated ${formatRelativeTime(locTimestamp)} (${latestLoc.speed || 0} km/h).`;
          badge = 'STALE GPS';
          badgeColor = '#F59E0B';
        } else if (targetTrip) {
          trackingMsg = `Vehicle ${vName} is on trip #${targetTrip.tripID || targetTrip.tripid}, but has not transmitted a live GPS signal yet.`;
          badge = 'NO GPS SIGNAL';
          badgeColor = '#EF4444';
        } else {
          trackingMsg = `Vehicle ${vName} is currently ${targetVehicle.status || 'AVAILABLE'} with no active GPS signal.`;
          badge = 'INACTIVE';
          badgeColor = '#6B7280';
        }

        const response: FleetAiResponse = {
          success: true,
          intent: 'TRACK_VEHICLE',
          type: 'tracking',
          message: trackingMsg,
          metrics: {
            'Vehicle': vName,
            'Status': targetTrip ? String(targetTrip.status || '').replace(/_/g, ' ') : String(targetVehicle.status || 'AVAILABLE'),
            'Speed': `${latestLoc?.speed || 0} km/h`,
            'Last Signal': locTimestamp ? formatRelativeTime(locTimestamp) : 'Never',
          },
          items: [
            {
              id: vId,
              title: vName,
              subtitle: targetTrip ? `Trip #${targetTrip.tripID || targetTrip.tripid} • ${targetTrip.source?.split(',')[0]} ➔ ${targetTrip.destination?.split(',')[0]}` : `Status: ${targetVehicle.status || 'AVAILABLE'}`,
              badge,
              badgeColor,
              actionPayload: { vehicleID: vId, tripID: targetTrip ? String(targetTrip.tripID || targetTrip.tripid) : undefined },
            },
          ],
          actions: hasCoords
            ? [
              {
                label: 'Track on Map',
                actionType: 'track_vehicle',
                payload: {
                  vehicleID: vId,
                  tripID: targetTrip ? String(targetTrip.tripID || targetTrip.tripid) : undefined,
                  vehicleName: vName,
                },
              },
            ]
            : [],
          context: {
            lastSubjectType: 'vehicle',
            lastSubjectId: vId,
            lastSubjectName: vName,
          },
          suggestions: MANAGER_SUGGESTIONS,
        };
        return res.json(response);
      } else {
        return res.json({
          success: true,
          intent: 'TRACK_VEHICLE',
          type: 'clarification',
          message: 'Please specify the vehicle name or ID you would like to track.',
          suggestions: vehicles.slice(0, 3).map((v: any) => `📍 Track ${v.name || v.registrationNumber || v.vehicleid}`),
        });
      }
    }

    // 2.2 Show active vehicles
    if (query.includes('active vehicle') || query.includes('on route') || (query.includes('active') && query.includes('vehicle'))) {
      const activeTrips = trips.filter((t: any) => activeTripStatuses.includes(String(t.status || '').toUpperCase()));
      const activeVehicleIds = new Set(activeTrips.map((t: any) => String(t.vehicleID || t.vehicleid || '').toLowerCase()));

      const activeVehicles = vehicles.filter(
        (v: any) =>
          activeVehicleIds.has(String(v.vehicleID || v.vehicleid || v.id || '').toLowerCase()) ||
          String(v.status || '').toUpperCase() === 'ON_TRIP'
      );

      const availableVehicles = vehicles.filter((v: any) => String(v.status || '').toUpperCase() === 'AVAILABLE');
      const count = activeVehicles.length;

      let msg = '';
      if (count === 1) {
        msg = '1 vehicle is currently on route.';
      } else if (count === 0) {
        msg = 'No vehicles are currently on route.';
      } else {
        msg = `${count} vehicles are currently on route.`;
      }

      const firstActive = activeVehicles[0];
      const firstActiveTrip = firstActive
        ? activeTrips.find((t: any) => String(t.vehicleID || t.vehicleid || '').toLowerCase() === String(firstActive.vehicleID || firstActive.vehicleid || firstActive.id || '').toLowerCase())
        : null;

      const response: FleetAiResponse = {
        success: true,
        intent: 'ACTIVE_VEHICLES',
        type: count === 1 ? 'vehicle_card' : 'summary',
        message: msg,
        metrics: {
          'On Route': count,
          'Available': availableVehicles.length,
          'Total Fleet': vehicles.length,
        },
        items: activeVehicles.slice(0, 3).map((v: any) => {
          const vTrip = activeTrips.find((t: any) => String(t.vehicleID || t.vehicleid || '').toLowerCase() === String(v.vehicleID || v.vehicleid || v.id || '').toLowerCase());
          return {
            id: String(v.vehicleID || v.vehicleid || v.id),
            title: v.name || v.registrationNumber || v.registrationnumber || 'Vehicle',
            subtitle: vTrip ? `Trip #${vTrip.tripID || vTrip.tripid} (${String(vTrip.status || '').replace(/_/g, ' ')})` : `Status: ${v.status || 'Active'}`,
            badge: 'ON ROUTE',
            badgeColor: '#10B981',
            actionPayload: { vehicleID: String(v.vehicleID || v.vehicleid || v.id), tripID: vTrip ? String(vTrip.tripID || vTrip.tripid) : undefined },
          };
        }),
        hasMore: activeVehicles.length > 3,
        actions: firstActive
          ? [
            {
              label: 'Track on Map',
              actionType: 'track_vehicle',
              payload: {
                vehicleID: String(firstActive.vehicleID || firstActive.vehicleid || firstActive.id),
                tripID: firstActiveTrip ? String(firstActiveTrip.tripID || firstActiveTrip.tripid) : undefined,
                vehicleName: firstActive.name || firstActive.registrationNumber,
              },
            },
          ]
          : [],
        context: firstActive
          ? {
            lastSubjectType: 'vehicle',
            lastSubjectId: String(firstActive.vehicleID || firstActive.vehicleid || firstActive.id),
            lastSubjectName: firstActive.name || firstActive.registrationNumber,
          }
          : undefined,
        suggestions: MANAGER_SUGGESTIONS,
      };
      return res.json(response);
    }

    // 2.3 Today's trip summary / Completed trips
    if (query.includes('trip summary') || query.includes('completed today') || (query.includes('today') && query.includes('trip'))) {
      const todayTrips = trips.filter((t: any) => isTodayDate(t.createdAt || t.createdat || t.updatedAt || t.updatedat));
      const pool = todayTrips.length > 0 ? todayTrips : trips;
      const completedToday = pool.filter((t: any) => String(t.status || '').toUpperCase() === 'COMPLETED').length;
      const activeToday = pool.filter((t: any) => activeTripStatuses.includes(String(t.status || '').toUpperCase())).length;
      const delayedToday = pool.filter((t: any) => String(t.status || '').toUpperCase() === 'DELAYED').length;

      // Question: "How many trips were completed today?"
      if (query.includes('completed')) {
        return res.json({
          success: true,
          intent: 'COMPLETED_TRIPS_COUNT',
          type: 'metric',
          message: `${completedToday} trip${completedToday === 1 ? '' : 's'} completed today.`,
          metrics: {
            'Completed': completedToday,
            'In Transit': activeToday,
          },
          suggestions: MANAGER_SUGGESTIONS,
        });
      }

      const response: FleetAiResponse = {
        success: true,
        intent: 'TRIP_SUMMARY',
        type: 'summary',
        message: `${pool.length} trip${pool.length === 1 ? '' : 's'} recorded today (${completedToday} completed, ${activeToday} in transit).`,
        metrics: {
          'Total Trips': pool.length,
          'Completed': completedToday,
          'In Transit': activeToday,
          'Delayed': delayedToday,
        },
        items: pool.slice(0, 3).map((t: any) => ({
          id: String(t.tripID || t.tripid || t.id),
          title: `#${t.tripID || t.tripid || t.id}`,
          subtitle: `${String(t.source || '').split(',')[0]} ➔ ${String(t.destination || '').split(',')[0]}`,
          badge: String(t.status || 'ACTIVE'),
          badgeColor: String(t.status || '').toUpperCase() === 'COMPLETED' ? '#10B981' : '#3B82F6',
        })),
        hasMore: pool.length > 3,
        actions: [
          {
            label: 'View Trips Board',
            actionType: 'navigate',
            payload: { screen: 'TripDispatcher' },
          },
        ],
        suggestions: MANAGER_SUGGESTIONS,
      };
      return res.json(response);
    }

    // 2.4 Upcoming maintenance / "Any upcoming maintenance?"
    if (query.includes('maintenance') || query.includes('service')) {
      const activeMaintenance = maintenance.filter((m: any) => {
        const st = String(m.status || '').toUpperCase();
        return st === 'SCHEDULED' || st === 'IN_PROGRESS' || st === 'PENDING' || st === 'ACTIVE' || st === 'IN SHOP';
      });

      const count = activeMaintenance.length;
      let msg = '';
      if (count === 1) {
        msg = '1 vehicle needs maintenance soon.';
      } else if (count > 1) {
        msg = `${count} vehicles need maintenance soon.`;
      } else {
        msg = 'No vehicles need maintenance soon.';
      }

      const response: FleetAiResponse = {
        success: true,
        intent: 'MAINTENANCE_ALERTS',
        type: count > 0 ? 'list' : 'metric',
        message: msg,
        metrics: {
          'Needs Service': count,
          'Total Logs': maintenance.length,
        },
        items: activeMaintenance.slice(0, 3).map((m: any) => {
          const v = vehicles.find((veh: any) => String(veh.vehicleID || veh.vehicleid || veh.id).toLowerCase() === String(m.vehicleID || m.vehicleid || '').toLowerCase());
          return {
            id: String(m.id || m.vehicleID || m.vehicleid),
            title: v ? (v.name || v.registrationNumber || 'Vehicle') : `Vehicle ${m.vehicleID || m.vehicleid}`,
            subtitle: `Service: ${m.serviceType || m.servicetype || 'Routine'} • Date: ${m.date || 'Soon'}`,
            badge: String(m.status || 'SCHEDULED'),
            badgeColor: '#F43F5E',
          };
        }),
        hasMore: count > 3,
        actions: [
          {
            label: 'View Maintenance',
            actionType: 'navigate',
            payload: { screen: 'Maintenance' },
          },
        ],
        suggestions: MANAGER_SUGGESTIONS,
      };
      return res.json(response);
    }

    // 2.5 Driver attendance
    if (query.includes('attendance') || query.includes('clock')) {
      const todayAttendance = attendance.filter((a: any) => isTodayDate(a.date || a.createdAt || a.createdat));
      const pool = todayAttendance.length > 0 ? todayAttendance : attendance;
      const clockedInCount = pool.filter((a: any) => !a.clockOutTime && !a.clockouttime).length;
      const totalToday = pool.length;

      const response: FleetAiResponse = {
        success: true,
        intent: 'DRIVER_ATTENDANCE',
        type: 'summary',
        message: `${totalToday} driver${totalToday === 1 ? '' : 's'} clocked in today.`,
        metrics: {
          'Clocked In': totalToday,
          'Active On Duty': clockedInCount,
          'Registered Drivers': drivers.length,
        },
        items: pool.slice(0, 3).map((a: any) => {
          const u = drivers.find((d: any) => String(d.id || '').toLowerCase() === String(a.userId || a.userid || '').toLowerCase());
          return {
            id: String(a.id),
            title: u ? u.name : `Driver #${String(a.userId || a.userid).slice(0, 8)}`,
            subtitle: `In: ${a.clockInTime || a.clockintime || 'N/A'} • ${a.locationName || a.locationname || 'HQ'}`,
            badge: a.clockOutTime || a.clockouttime ? 'COMPLETED' : 'ACTIVE',
            badgeColor: '#10B981',
          };
        }),
        hasMore: pool.length > 3,
        actions: [
          {
            label: 'View Attendance Report',
            actionType: 'navigate',
            payload: { screen: 'AttendanceReport' },
          },
        ],
        suggestions: MANAGER_SUGGESTIONS,
      };
      return res.json(response);
    }

    // 2.6 Fuel & expenses
    if (query.includes('fuel') || query.includes('expense')) {
      const totalLiters = fuel.reduce((s: number, f: any) => s + Number(f.liters || 0), 0);
      const totalFuelCost = fuel.reduce((s: number, f: any) => s + Number(f.cost || 0), 0);
      const totalExpenses = (expenseRecords() || []).reduce((s: number, e: any) => s + Number(e.amount || 0), 0);

      function expenseRecords() {
        return db.list('expense_records') as any;
      }

      const response: FleetAiResponse = {
        success: true,
        intent: 'FUEL_EXPENSES',
        type: 'summary',
        message: totalLiters > 0 ? `${totalLiters} L fuel logged (₹${totalFuelCost}).` : 'No fuel logs recorded today.',
        metrics: {
          'Fuel Liters': `${totalLiters} L`,
          'Fuel Cost': `₹${totalFuelCost}`,
          'Other Expenses': `₹${totalExpenses}`,
        },
        actions: [
          {
            label: 'View Fuel Logs',
            actionType: 'navigate',
            payload: { screen: 'FuelExpense' },
          },
        ],
        suggestions: MANAGER_SUGGESTIONS,
      };
      return res.json(response);
    }

    // 2.7 Driver performance
    if (query.includes('driver performance') || query.includes('driver score') || query.includes('drivers')) {
      const activeTrips = trips.filter((t: any) => activeTripStatuses.includes(String(t.status || '').toUpperCase()));
      const activeDriverIds = new Set(activeTrips.map((t: any) => String(t.driverID || t.driverid || '').toLowerCase()));
      const activeDriversCount = activeDriverIds.size;
      const completedTripsCount = trips.filter((t: any) => String(t.status || '').toUpperCase() === 'COMPLETED').length;

      const response: FleetAiResponse = {
        success: true,
        intent: 'DRIVER_PERFORMANCE',
        type: 'summary',
        message: `${drivers.length} drivers registered with ${activeDriversCount} currently on duty.`,
        metrics: {
          'Registered': drivers.length,
          'On Duty': activeDriversCount,
          'Completed Trips': completedTripsCount,
        },
        items: drivers.slice(0, 3).map((d: any) => ({
          id: String(d.id),
          title: d.name || 'Driver',
          subtitle: `Phone: ${d.phone || 'N/A'} • Status: ${d.status || 'AVAILABLE'}`,
          badge: activeDriverIds.has(String(d.id).toLowerCase()) ? 'ON DUTY' : 'AVAILABLE',
          badgeColor: '#10B981',
        })),
        hasMore: drivers.length > 3,
        actions: [
          {
            label: 'View Drivers',
            actionType: 'navigate',
            payload: { screen: 'Drivers' },
          },
        ],
        suggestions: MANAGER_SUGGESTIONS,
      };
      return res.json(response);
    }

    // 2.8 Fleet alerts / SOS
    if (query.includes('alert') || query.includes('sos') || query.includes('emergency')) {
      const sosNotifs = notifications.filter((n: any) => {
        const title = String(n.title || '').toUpperCase();
        const body = String(n.body || '').toUpperCase();
        return title.includes('SOS') || title.includes('EMERGENCY') || body.includes('SOS');
      });

      const delayedTrips = trips.filter((t: any) => String(t.status || '').toUpperCase() === 'DELAYED');
      const totalAlerts = sosNotifs.length + delayedTrips.length;

      const response: FleetAiResponse = {
        success: true,
        intent: 'FLEET_ALERTS',
        type: totalAlerts > 0 ? 'list' : 'metric',
        message: totalAlerts > 0 ? `${totalAlerts} active fleet alert${totalAlerts === 1 ? '' : 's'} requiring attention.` : 'No critical fleet alerts at this time.',
        metrics: {
          'Active Alerts': totalAlerts,
          'SOS Alerts': sosNotifs.length,
          'Delayed Trips': delayedTrips.length,
        },
        items: [
          ...sosNotifs.slice(0, 2).map((n: any) => ({
            id: String(n.id),
            title: `🚨 ${n.title || 'SOS Alert'}`,
            subtitle: n.body || 'Emergency notification',
            badge: 'CRITICAL',
            badgeColor: '#EF4444',
          })),
          ...delayedTrips.slice(0, 1).map((t: any) => ({
            id: String(t.tripID || t.tripid || t.id),
            title: `⏱️ Delayed: Trip #${t.tripID || t.tripid || t.id}`,
            subtitle: `${t.source?.split(',')[0]} ➔ ${t.destination?.split(',')[0]}`,
            badge: 'DELAYED',
            badgeColor: '#F59E0B',
          })),
        ],
        actions: [
          {
            label: 'Live Fleet Tracking',
            actionType: 'navigate',
            payload: { screen: 'LiveTracking' },
          },
        ],
        suggestions: MANAGER_SUGGESTIONS,
      };
      return res.json(response);
    }

    // 2.9 Route intelligence
    if (query.includes('route intelligence') || query.includes('route delay') || query.includes('route recommend') || query.includes('best route')) {
      const activeTrip = trips.find((t: any) => activeTripStatuses.includes(String(t.status || '').toUpperCase()));

      if (activeTrip) {
        const tripId = String(activeTrip.tripID || activeTrip.tripid || activeTrip.id);
        const response: FleetAiResponse = {
          success: true,
          intent: 'ROUTE_INTELLIGENCE',
          type: 'trip_card',
          message: `Trip #${tripId} has route intelligence active (${activeTrip.plannedDistance || activeTrip.planneddistance || 38} km).`,
          metrics: {
            'Trip ID': `#${tripId}`,
            'Distance': `${activeTrip.plannedDistance || activeTrip.planneddistance || 38} km`,
            'Cargo': `${activeTrip.cargoWeight || activeTrip.cargoweight || 500} kg`,
          },
          items: [
            {
              id: tripId,
              title: `#${tripId}`,
              subtitle: `${String(activeTrip.source || '').split(',')[0]} ➔ ${String(activeTrip.destination || '').split(',')[0]}`,
              badge: String(activeTrip.status || 'IN_TRANSIT'),
              badgeColor: '#10B981',
            },
          ],
          actions: [
            {
              label: 'AI Route Analysis',
              actionType: 'navigate',
              payload: { screen: 'TripDispatcher', tripId },
            },
          ],
          context: {
            lastSubjectType: 'trip',
            lastSubjectId: tripId,
            lastSubjectName: `#${tripId}`,
          },
          suggestions: MANAGER_SUGGESTIONS,
        };
        return res.json(response);
      } else {
        return res.json({
          success: true,
          intent: 'ROUTE_INTELLIGENCE',
          type: 'clarification',
          message: 'No active trips currently in transit for route intelligence.',
          suggestions: MANAGER_SUGGESTIONS,
        });
      }
    }

    // 2.10 Ask about a trip / Specific Trip lookup
    if (query.includes('ask about a trip') || query.includes('trip #') || query.includes('trp-') || (query.includes('trip') && !query.includes('summary'))) {
      let foundTrip: any = null;
      for (const t of trips) {
        const tId = String(t.tripID || t.tripid || t.id || '').toLowerCase();
        if (tId && query.includes(tId)) {
          foundTrip = t;
          break;
        }
      }

      if (!foundTrip) {
        foundTrip = trips.find((t: any) => activeTripStatuses.includes(String(t.status || '').toUpperCase())) || trips[0];
      }

      if (foundTrip) {
        const tripId = String(foundTrip.tripID || foundTrip.tripid || foundTrip.id);
        const veh = vehicles.find((v: any) => String(v.vehicleID || v.vehicleid || v.id).toLowerCase() === String(foundTrip.vehicleID || foundTrip.vehicleid || '').toLowerCase());
        const response: FleetAiResponse = {
          success: true,
          intent: 'TRIP_STATUS',
          type: 'trip_card',
          message: `Trip #${tripId} is ${String(foundTrip.status || '').replace(/_/g, ' ')} (${String(foundTrip.source || '').split(',')[0]} ➔ ${String(foundTrip.destination || '').split(',')[0]}).`,
          metrics: {
            'Trip ID': `#${tripId}`,
            'Vehicle': veh ? (veh.name || veh.registrationNumber) : 'Assigned',
            'Status': String(foundTrip.status || '').replace(/_/g, ' '),
          },
          items: [
            {
              id: tripId,
              title: `#${tripId}`,
              subtitle: `${foundTrip.source} ➔ ${foundTrip.destination}`,
              badge: String(foundTrip.status || 'ACTIVE'),
              badgeColor: '#3B82F6',
            },
          ],
          actions: [
            {
              label: 'Track on Map',
              actionType: 'track_vehicle',
              payload: { vehicleID: foundTrip.vehicleID || foundTrip.vehicleid, tripID: tripId },
            },
          ],
          context: {
            lastSubjectType: 'trip',
            lastSubjectId: tripId,
            lastSubjectName: `#${tripId}`,
          },
          suggestions: MANAGER_SUGGESTIONS,
        };
        return res.json(response);
      }
    }

    // --- 3. GEMINI AI SUMMARIZATION OR SMART CONCISE FALLBACK ---
    const activeTripsCount = trips.filter((t: any) => activeTripStatuses.includes(String(t.status || '').toUpperCase())).length;
    const defaultFallback = {
      success: true,
      intent: 'FLEET_STATUS',
      type: 'summary' as const,
      message: `${vehicles.filter((v: any) => v.status !== 'RETIRED').length} active vehicles in fleet (${activeTripsCount} on route).`,
      metrics: {
        'Fleet Size': vehicles.length,
        'On Route': activeTripsCount,
        'Drivers': drivers.length,
      },
      suggestions: isDriver ? DRIVER_SUGGESTIONS : MANAGER_SUGGESTIONS,
    };

    const geminiApiKey = env.GEMINI_API_KEY || env.AI_API_KEY;
    if (geminiApiKey && rawQuery.length > 5) {
      const availableVehiclesCount = vehicles.filter((v: any) => String(v.status || '').toUpperCase() === 'AVAILABLE').length;
      const systemPrompt = `
You are LogiSphere AI, a smart Fleet Intelligence Assistant.
User Role: ${userRole}.
Fleet facts:
- Total vehicles: ${vehicles.length} (${availableVehiclesCount} available, ${activeTripsCount} on route)
- Active vehicles list: ${vehicles.filter((v: any) => v.status === 'ON_TRIP').map((v: any) => v.name || v.registrationNumber).join(', ') || 'Van-01'}
- Total trips: ${trips.length} (${activeTripsCount} currently active)
- Registered drivers: ${drivers.length}
- Maintenance records: ${maintenance.length}

Strict Rules:
1. Answer the user question in EXACTLY ONE SHORT SENTENCE.
2. Never hallucinate or invent non-existent fleet facts.
3. Respond ONLY with valid JSON matching:
{
  "message": "one short sentence answer",
  "type": "summary",
  "metrics": { "Key": "value" }
}
`;

      const aiResponse = await executeResilientAi({
        feature: 'AI_ASSISTANT_QUERY',
        tenantOrUserId: isDriver ? `driver_${orgId}_${userId}` : `org_${orgId}`,
        normalizedInput: {
          query: query.trim(),
          userRole,
          isDriver,
          orgId,
        },
        executeGemini: async () => {
          const geminiRes = await callGemini<any>({
            systemPrompt,
            userPrompt: `User query: "${rawQuery}"`,
            responseMimeType: 'application/json',
            temperature: 0.1,
            maxOutputTokens: 150,
          });

          const parsed = geminiRes.data;
          if (parsed && typeof parsed.message === 'string' && parsed.message.trim().length > 0) {
            return {
              success: true,
              intent: 'NATURAL_LANGUAGE',
              type: (parsed.type || 'summary') as any,
              message: String(parsed.message).trim(),
              metrics: parsed.metrics || undefined,
              suggestions: isDriver ? DRIVER_SUGGESTIONS : MANAGER_SUGGESTIONS,
            };
          }
          throw new Error('Malformed AI assistant response');
        },
        validateResponse: (res) => Boolean(res && res.message && typeof res.message === 'string'),
        getFallback: () => defaultFallback,
      });

      return res.json(aiResponse);
    }

    return res.json(defaultFallback);
  } catch (error: any) {
    console.error('[AIAssistant] Query error:', error?.message || error);
    return fail(res, 500, 'Unable to process fleet query. Please try again.');
  }
});


// --- NEW FEATURE: AI ROUTE INTELLIGENCE ENDPOINT ---
interface NormalizedRoute {
  id: string;
  distanceMeters: number;
  durationSeconds: number;
  trafficDelaySeconds: number;
  label: string;
  encodedPolyline: string;
}

function parseDurationSeconds(durationStr?: string): number {
  if (!durationStr) return 0;
  const match = String(durationStr).match(/^(\d+(\.\d+)?)s$/);
  if (match) return Math.round(parseFloat(match[1]));
  const num = parseInt(String(durationStr), 10);
  return isNaN(num) ? 0 : num;
}

/**
 * Generate synthetic realistic polyline points if external Google Routes API key is not present or offline
 */
function generateFallbackPolyline(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  variation: number
): string {
  // Generate simple encoded polyline approximation
  const points: [number, number][] = [];
  const steps = 10;
  for (let i = 0; i <= steps; i++) {
    const ratio = i / steps;
    const midLat = startLat + (endLat - startLat) * ratio + Math.sin(ratio * Math.PI) * variation;
    const midLng = startLng + (endLng - startLng) * ratio + Math.cos(ratio * Math.PI) * (variation * 0.5);
    points.push([midLat, midLng]);
  }
  return encodePolylinePoints(points);
}

function encodePolylinePoints(points: [number, number][]): string {
  let result = '';
  let prevLat = 0;
  let prevLng = 0;

  for (const [lat, lng] of points) {
    const late5 = Math.round(lat * 1e5);
    const lnge5 = Math.round(lng * 1e5);

    result += encodeSignedNumber(late5 - prevLat);
    result += encodeSignedNumber(lnge5 - prevLng);

    prevLat = late5;
    prevLng = lnge5;
  }
  return result;
}

function encodeSignedNumber(num: number): string {
  let sgnNum = num << 1;
  if (num < 0) {
    sgnNum = ~sgnNum;
  }
  return encodeNumber(sgnNum);
}

function encodeNumber(num: number): string {
  let encodeString = '';
  while (num >= 0x20) {
    encodeString += String.fromCharCode((0x20 | (num & 0x1f)) + 63);
    num >>= 5;
  }
  encodeString += String.fromCharCode(num + 63);
  return encodeString;
}

aiRouter.post('/route-recommendation', authenticate, async (req: Request, res: Response) => {
  try {
    const { tripID, currentLatitude, currentLongitude } = req.body || {};
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!tripID) {
      return fail(res, 400, 'tripID is required');
    }

    const orgId = getTrustedOrgId(req);

    // Fetch trip
    const trips = await db.list('trips', orgId ? { organization_id: orgId } : undefined);
    const targetId = String(tripID).trim().toLowerCase();
    const trip = trips.find(
      (t: any) =>
        String(t.tripID || t.tripid || t.id || '')
          .trim()
          .toLowerCase() === targetId
    );
    if (!trip || (trip.organization_id && trip.organization_id !== orgId)) {
      return fail(res, 404, 'Trip not found');
    }

    // Role check: If DRIVER, ensure trip is assigned to them
    if (userRole === 'ROLE_DRIVER' && userId) {
      const assignedId = String(trip.driverID ?? trip.driverid ?? '');
      if (assignedId && assignedId !== String(userId)) {
        return fail(res, 403, 'Forbidden: You can only request route intelligence for your own assigned trips');
      }
    }

    // Check active trip status
    const status = String(trip.status || '').toUpperCase();
    const activeStatuses = [
      'ACCEPTED',
      'ASSIGNED',
      'GOING_TO_PICKUP',
      'ARRIVED_AT_PICKUP',
      'PICKED_UP',
      'IN_TRANSIT',
      'ARRIVED_AT_DROP',
      'DISPATCHED',
      'PENDING_APPROVAL',
    ];
    if (!activeStatuses.includes(status)) {
      return fail(res, 400, `Route intelligence is not available for trips with status "${status}"`);
    }

    // Determine Origin coordinates
    const originLat =
      currentLatitude !== undefined && !isNaN(Number(currentLatitude))
        ? Number(currentLatitude)
        : Number(trip.sourceLatitude ?? trip.sourcelatitude ?? 23.2156);

    const originLng =
      currentLongitude !== undefined && !isNaN(Number(currentLongitude))
        ? Number(currentLongitude)
        : Number(trip.sourceLongitude ?? trip.sourcelongitude ?? 72.6369);

    // Determine Destination coordinates
    const destLat = Number(trip.destinationLatitude ?? trip.destinationlatitude ?? 23.0225);
    const destLng = Number(trip.destinationLongitude ?? trip.destinationlongitude ?? 72.5714);

    let routes: NormalizedRoute[] = [];
    const routesApiKey = env.GOOGLE_ROUTES_API_KEY || env.GOOGLE_MAPS_API_KEY;

    // 1. CALL GOOGLE ROUTES API (NEW)
    if (routesApiKey) {
      try {
        const computeRoutesUrl = 'https://routes.googleapis.com/directions/v2:computeRoutes';
        const requestBody = {
          origin: { location: { latLng: { latitude: originLat, longitude: originLng } } },
          destination: { location: { latLng: { latitude: destLat, longitude: destLng } } },
          travelMode: 'DRIVE',
          routingPreference: 'TRAFFIC_AWARE',
          computeAlternativeRoutes: true,
          units: 'METRIC',
          languageCode: 'en-IN',
        };

        const googleRes = await fetch(computeRoutesUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': routesApiKey,
            'X-Goog-FieldMask':
              'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.routeLabels',
          },
          body: JSON.stringify(requestBody),
        });

        if (googleRes.ok) {
          const gData = await googleRes.json();
          if (Array.isArray(gData.routes) && gData.routes.length > 0) {
            routes = gData.routes.slice(0, 3).map((r: any, idx: number) => {
              const distanceMeters = Number(r.distanceMeters ?? 0);
              const durationSeconds = parseDurationSeconds(r.duration);
              const label =
                idx === 0
                  ? 'Route 1 (Primary)'
                  : idx === 1
                    ? 'Route 2 (Alternative A)'
                    : 'Route 3 (Alternative B)';

              return {
                id: `route_${idx + 1}`,
                distanceMeters,
                durationSeconds,
                trafficDelaySeconds: 0,
                label,
                encodedPolyline: r.polyline?.encodedPolyline || '',
              };
            });
          }
        } else {
          console.warn('[routeIntelligence] Google Routes API returned status:', googleRes.status);
        }
      } catch (err: any) {
        console.error('[routeIntelligence] Google Routes API fetch error:', err?.message || err);
      }
    }

    // Fallback routes generation if no Google Routes API key or call failed
    if (routes.length === 0) {
      // Calculate straight line distance (approximate in meters)
      const latDiff = Math.abs(destLat - originLat);
      const lngDiff = Math.abs(destLng - originLng);
      const approxDistKm = Math.max(10, Math.round(Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111));
      const baseMeters = approxDistKm * 1000 * 1.2;
      const baseSeconds = Math.round((baseMeters / 1000) * 80); // ~45 km/h average speed

      routes = [
        {
          id: 'route_1',
          distanceMeters: Math.round(baseMeters),
          durationSeconds: baseSeconds,
          trafficDelaySeconds: 300,
          label: 'Route 1 (Express Highway)',
          encodedPolyline: generateFallbackPolyline(originLat, originLng, destLat, destLng, 0.01),
        },
        {
          id: 'route_2',
          distanceMeters: Math.round(baseMeters * 1.06),
          durationSeconds: Math.round(baseSeconds * 0.94),
          trafficDelaySeconds: 60,
          label: 'Route 2 (Bypass Road)',
          encodedPolyline: generateFallbackPolyline(originLat, originLng, destLat, destLng, -0.015),
        },
        {
          id: 'route_3',
          distanceMeters: Math.round(baseMeters * 1.12),
          durationSeconds: Math.round(baseSeconds * 1.05),
          trafficDelaySeconds: 120,
          label: 'Route 3 (Ring Road)',
          encodedPolyline: generateFallbackPolyline(originLat, originLng, destLat, destLng, 0.025),
        },
      ];
    }

    // 2. GEMINI AI RECOMMENDATION
    let recommendation = {
      routeId: routes[0].id,
      reason: 'Fastest route based on current travel time and traffic estimates.',
      confidence: 'high',
      source: 'fallback',
    };

    // Deterministic selection helper
    const sortedRoutes = [...routes].sort((a, b) => {
      if (a.durationSeconds !== b.durationSeconds) return a.durationSeconds - b.durationSeconds;
      return a.distanceMeters - b.distanceMeters;
    });
    const bestDeterministicId = sortedRoutes[0].id;
    const deterministicFallback = {
      routeId: bestDeterministicId,
      reason: 'Lowest estimated travel time with optimal traffic conditions.',
      confidence: 'high',
      source: 'fallback' as const,
    };

    const geminiApiKey = env.GEMINI_API_KEY || env.AI_API_KEY;
    if (geminiApiKey) {
      const promptText = `
You are an expert logistics fleet routing assistant for LogiSphere AI.
Compare the following candidate routes for trip "${tripID}" (Cargo Weight: ${trip.cargoWeight || 500} kg):

${JSON.stringify(
        routes.map(r => ({
          routeId: r.id,
          label: r.label,
          distanceKm: (r.distanceMeters / 1000).toFixed(1),
          durationMin: Math.round(r.durationSeconds / 60),
          trafficDelayMin: Math.round(r.trafficDelaySeconds / 60),
        })),
        null,
        2
      )}

Select the single best route ID prioritizing:
1. Lowest total estimated duration
2. Minimal traffic delay
3. Reasonable total distance

Respond ONLY with strict JSON in the exact structure:
{
  "recommendedRouteId": "route_1",
  "reason": "Clear concise 1-sentence reason explaining why this route is best.",
  "confidence": "high"
}
Do not invent any route IDs outside of the supplied list.
`;

      recommendation = await executeResilientAi<{
        routeId: string;
        reason: string;
        confidence: string;
        source: 'gemini' | 'fallback';
      }>({
        feature: 'ROUTE_RECOMMENDATION',
        tenantOrUserId: `org_${orgId}`,
        normalizedInput: {
          tripID: String(tripID),
          cargoWeight: trip.cargoWeight || 500,
          routes: routes.map(r => ({ id: r.id, dist: r.distanceMeters, dur: r.durationSeconds })),
          orgId,
        },
        executeGemini: async () => {
          const geminiRes = await callGemini<any>({
            userPrompt: promptText,
            responseMimeType: 'application/json',
            temperature: 0.2,
          });

          const parsed = geminiRes.data;
          if (parsed && parsed.recommendedRouteId && routes.some(r => r.id === parsed.recommendedRouteId)) {
            return {
              routeId: parsed.recommendedRouteId,
              reason: String(parsed.reason || 'Optimal travel time and traffic flow.').trim(),
              confidence: String(parsed.confidence || 'high').toLowerCase(),
              source: 'gemini' as const,
            };
          }
          throw new Error('Malformed or unmatched recommendedRouteId from Gemini');
        },
        validateResponse: (res) =>
          Boolean(res && res.routeId && routes.some(r => r.id === res.routeId)),
        getFallback: () => deterministicFallback,
      });
    } else {
      recommendation = deterministicFallback;
    }

    // Return normalized response
    return ok(res, {
      tripID: String(tripID),
      origin: {
        latitude: originLat,
        longitude: originLng,
      },
      destination: {
        latitude: destLat,
        longitude: destLng,
      },
      routes,
      recommendation,
    });
  } catch (error: any) {
    console.error('[routeIntelligence] Handler error:', error?.message || error);
    return fail(res, 500, 'Route intelligence is temporarily unavailable');
  }
});

// --- AI RESILIENCE & QUOTA METRICS ENDPOINTS ---
aiRouter.get('/metrics', authenticate, async (req: Request, res: Response) => {
  const userRole = String(req.user?.role ?? '').toUpperCase();
  const isManager = ['ROLE_MANAGER', 'FLEET_MANAGER', 'ROLE_DISPATCHER', 'DISPATCHER', 'ADMIN'].includes(userRole);
  if (!isManager) {
    return fail(res, 403, 'Unauthorized: AI metrics accessible to managers only');
  }

  return ok(res, {
    metrics: aiMetrics.getSnapshot(),
    cache: aiCache.getStats(),
    circuitBreaker: aiCircuitBreaker.getStats(),
    singleFlight: singleFlight.getStats(),
  });
});

aiRouter.get('/stats', authenticate, async (req: Request, res: Response) => {
  const userRole = String(req.user?.role ?? '').toUpperCase();
  const isManager = ['ROLE_MANAGER', 'FLEET_MANAGER', 'ROLE_DISPATCHER', 'DISPATCHER', 'ADMIN'].includes(userRole);
  if (!isManager) {
    return fail(res, 403, 'Unauthorized: AI stats accessible to managers only');
  }

  return ok(res, {
    metrics: aiMetrics.getSnapshot(),
    cache: aiCache.getStats(),
    circuitBreaker: aiCircuitBreaker.getStats(),
    singleFlight: singleFlight.getStats(),
  });
});

aiRouter.post('/cache/clear', authenticate, async (req: Request, res: Response) => {
  const userRole = String(req.user?.role ?? '').toUpperCase();
  const isManager = ['ROLE_MANAGER', 'FLEET_MANAGER', 'ADMIN'].includes(userRole);
  if (!isManager) {
    return fail(res, 403, 'Unauthorized: Cache clearance requires administrative privileges');
  }

  aiCache.clear();
  return ok(res, { message: 'AI in-memory cache cleared successfully' });
});

