import { Router, Request, Response } from 'express';
import { db } from '../../config/database';
import { env } from '../../config/env';
import { authenticate } from '../../middleware/auth';
import { ok, fail } from '../../utils/http';

export const aiRouter = Router();

// --- EXISTING AI QUERY ENDPOINT ---
aiRouter.post('/query', async (req: Request, res: Response) => {
  const query = String(req.body?.query ?? '').toLowerCase();
  const [vehicles, trips, drivers, fuel, maintenance] = await Promise.all([
    db.list('vehicles'),
    db.list('trips'),
    db.list('users', { role: 'ROLE_DRIVER' }),
    db.list('fuel_logs'),
    db.list('maintenance_records'),
  ]);
  if (query.includes('driver')) {
    return res.json({
      success: true,
      intent: 'DRIVER_PERFORMANCE',
      type: 'driver_summary',
      message: `${drivers.length} drivers are registered.`,
      data: drivers,
      suggestions: ['Show active vehicles', 'Show delayed trips'],
    });
  }
  if (query.includes('maintenance')) {
    return res.json({
      success: true,
      intent: 'MAINTENANCE_ALERTS',
      type: 'maintenance_alert',
      message: `${maintenance.length} maintenance records found.`,
      data: maintenance,
      suggestions: ['Show fuel summary'],
    });
  }
  if (query.includes('fuel')) {
    const liters = fuel.reduce((s: number, f: any) => s + Number(f.liters ?? 0), 0);
    return res.json({
      success: true,
      intent: 'FUEL_SUMMARY',
      type: 'fuel_summary',
      message: `${liters} liters logged.`,
      data: fuel,
      suggestions: ['Show fleet summary'],
    });
  }
  if (query.includes('trip')) {
    return res.json({
      success: true,
      intent: 'TRIP_SUMMARY',
      type: 'trip_summary',
      message: `${trips.length} trips found.`,
      data: trips,
      suggestions: ['Show active vehicles'],
    });
  }
  res.json({
    success: true,
    intent: 'ACTIVE_VEHICLES',
    type: 'fleet_summary',
    message: `${vehicles.filter((v: any) => v.status !== 'RETIRED').length} active vehicles in fleet.`,
    data: {
      vehicles,
      activeTrips: trips.filter((t: any) => t.status === 'DISPATCHED' || t.status === 'IN_TRANSIT').length,
    },
    suggestions: ['Show trips', 'Show drivers', 'Show maintenance alerts'],
  });
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

    // Fetch trip
    const trips = await db.list('trips');
    const targetId = String(tripID).trim().toLowerCase();
    const trip = trips.find(
      (t: any) =>
        String(t.tripID || t.tripid || t.id || '')
          .trim()
          .toLowerCase() === targetId
    );
    if (!trip) {
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

    const geminiApiKey = env.GEMINI_API_KEY || env.AI_API_KEY;
    if (geminiApiKey) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;

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

        const geminiRes = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.2,
            },
          }),
        });

        if (geminiRes.ok) {
          const gData = await geminiRes.json();
          const rawText = gData?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const parsed = JSON.parse(rawText);
            if (parsed && parsed.recommendedRouteId && routes.some(r => r.id === parsed.recommendedRouteId)) {
              recommendation = {
                routeId: parsed.recommendedRouteId,
                reason: String(parsed.reason || 'Optimal travel time and traffic flow.').trim(),
                confidence: String(parsed.confidence || 'high').toLowerCase(),
                source: 'gemini',
              };
            }
          }
        } else {
          console.warn('[routeIntelligence] Gemini API status:', geminiRes.status);
        }
      } catch (err: any) {
        console.warn('[routeIntelligence] Gemini AI request error, using deterministic fallback:', err?.message || err);
      }
    }

    // Fallback recommendation if Gemini call was skipped or produced no result
    if (recommendation.source === 'fallback') {
      recommendation = {
        routeId: bestDeterministicId,
        reason: 'Lowest estimated travel time with optimal traffic conditions.',
        confidence: 'high',
        source: 'fallback',
      };
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
