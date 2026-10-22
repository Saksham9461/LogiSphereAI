import { db } from '../../config/database';
import { env } from '../../config/env';
import { executeResilientAi } from '../ai/orchestrator';
import { callGemini } from '../ai/geminiClient';

export interface DelayInsightResult {
  tripID: string;
  vehicleID: string;
  vehicleName: string;
  driverID: string;
  driverName: string;
  source: string;
  destination: string;
  tripStatus: string;
  isActive: boolean;
  isTerminal: boolean;

  // Timestamps & ETAs
  plannedETA: string; // ISO String
  estimatedArrivalAt: string; // ISO String
  predictedDelayMinutes: number;
  delayRisk: 'ON_TIME' | 'LOW_RISK' | 'MODERATE_RISK' | 'HIGH_RISK' | 'UNKNOWN';

  // Telemetry & Evidence
  telemetry: {
    latitude: number | null;
    longitude: number | null;
    currentSpeedKmH: number;
    lastLocationUpdate: string | null;
    freshness: 'LIVE' | 'UPDATING' | 'STALE' | 'NO_SIGNAL';
    distanceRemainingKm: number;
    totalPlannedDistanceKm: number;
    percentCompleted: number;
  };

  // Supported Reason Codes
  reasonCodes: (
    | 'ON_SCHEDULE'
    | 'ROUTE_DEVIATION'
    | 'SLOWER_THAN_EXPECTED_PROGRESS'
    | 'PROLONGED_STOP'
    | 'TRAFFIC_DELAY'
    | 'WEATHER_IMPACT'
    | 'STALE_LOCATION'
    | 'INSUFFICIENT_DATA'
    | 'TRIP_COMPLETED'
    | 'TRIP_CANCELLED'
  )[];

  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  dataQualityIndicator: string;

  // AI Explanation & Recommendations
  aiExplanation: {
    source: 'gemini' | 'deterministic_fallback';
    explanation: string;
    actionableRecommendations: string[];
    operationalImpact: string;
  };
}

const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  gandhinagar: { lat: 23.2156, lng: 72.6369 },
  ahmedabad: { lat: 23.0225, lng: 72.5714 },
  surat: { lat: 21.1702, lng: 72.8311 },
  mumbai: { lat: 19.033, lng: 73.0297 },
  pune: { lat: 18.5204, lng: 73.8567 },
  jaipur: { lat: 26.9124, lng: 75.7873 },
  jodhpur: { lat: 26.2389, lng: 73.0243 },
  delhi: { lat: 28.6139, lng: 77.209 },
  vadodara: { lat: 22.3072, lng: 73.1812 },
  rajkot: { lat: 22.3039, lng: 70.8022 },
};

export function resolveCityCoords(cityName?: string): { lat: number; lng: number } | null {
  if (!cityName) return null;
  const lower = cityName.toLowerCase();
  for (const [key, coords] of Object.entries(CITY_COORDINATES)) {
    if (lower.includes(key)) return coords;
  }
  return null;
}

/**
 * Great-circle distance between two coordinates in kilometers.
 */
function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculates perpendicular cross-track deviation of a point from the straight origin-destination corridor.
 */
function crossTrackDeviationKm(
  pointLat: number,
  pointLng: number,
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): number {
  const dStartPoint = haversineDistanceKm(startLat, startLng, pointLat, pointLng);
  const dStartEnd = haversineDistanceKm(startLat, startLng, endLat, endLng);
  if (dStartEnd < 1) return 0;

  // Approximate cross-track distance using triangle projection
  const dPointEnd = haversineDistanceKm(pointLat, pointLng, endLat, endLng);
  const s = (dStartPoint + dStartEnd + dPointEnd) / 2;
  const area = Math.sqrt(Math.max(0, s * (s - dStartPoint) * (s - dStartEnd) * (s - dPointEnd)));
  return (2 * area) / dStartEnd;
}

const TERMINAL_STATUSES = ['DELIVERED', 'COMPLETED', 'REJECTED', 'CANCELLED'];
const ACTIVE_STATUSES = [
  'ACCEPTED',
  'ASSIGNED',
  'DISPATCHED',
  'GOING_TO_PICKUP',
  'ARRIVED_AT_PICKUP',
  'PICKED_UP',
  'IN_TRANSIT',
  'ARRIVED_AT_DROP',
];

/**
 * Authoritative deterministic calculation of smart delay prediction and explanation.
 */
export async function calculateTripDelayInsights(tripIdInput: string): Promise<DelayInsightResult> {
  const cleanId = String(tripIdInput || '').trim();

  const [allTrips, allVehicles, allDrivers, allLocations] = await Promise.all([
    db.list('trips'),
    db.list('vehicles'),
    db.list('users'),
    db.list('tracking_locations'),
  ]);

  const strippedId = cleanId.replace(/^#/, '');

  let trip = (allTrips || []).find((t: any) => {
    const tId = String(t.tripID || t.tripid || t.id || '').trim();
    const strippedTId = tId.replace(/^#/, '');
    return (
      tId.toLowerCase() === cleanId.toLowerCase() ||
      strippedTId.toLowerCase() === strippedId.toLowerCase()
    );
  });

  if (!trip) {
    trip = await db.findById('trips', cleanId);
  }
  if (!trip && strippedId !== cleanId) {
    trip = await db.findById('trips', strippedId);
  }

  if (!trip) {
    throw new Error(`Trip with ID '${cleanId}' not found`);
  }

  const resolvedTripID = trip.tripID || trip.tripid || cleanId;
  const vehicleId = String(trip.vehicleID || trip.vehicleid || '');
  const driverId = String(trip.driverID || trip.driverid || '');

  const vehicle = (allVehicles || []).find((v: any) =>
    String(v.vehicleID || v.vehicleid || v.id).toLowerCase() === vehicleId.toLowerCase()
  );
  const driver = (allDrivers || []).find((u: any) =>
    String(u.id || u.userId).toLowerCase() === driverId.toLowerCase()
  );

  const vehicleName = vehicle?.name || vehicle?.registrationNumber || vehicleId || 'Fleet Vehicle';
  const driverName = driver?.name || driverId || 'Assigned Driver';

  const rawStatus = String(trip.status || 'DRAFT').toUpperCase().replace(/[\s-]+/g, '_');
  const isTerminal = TERMINAL_STATUSES.includes(rawStatus);
  const isActive = ACTIVE_STATUSES.includes(rawStatus);

  const now = new Date();
  const tripCreatedAt = new Date(trip.createdAt || trip.createdat || now.toISOString());

  // 1. Resolve Origin and Destination Coordinates
  let originLat = Number(trip.sourceLatitude ?? trip.sourcelatitude);
  let originLng = Number(trip.sourceLongitude ?? trip.sourcelongitude);
  if (isNaN(originLat) || isNaN(originLng)) {
    const c = resolveCityCoords(trip.source);
    if (c) {
      originLat = c.lat;
      originLng = c.lng;
    }
  }

  let destLat = Number(trip.destinationLatitude ?? trip.destinationlatitude);
  let destLng = Number(trip.destinationLongitude ?? trip.destinationlongitude);
  if (isNaN(destLat) || isNaN(destLng)) {
    const c = resolveCityCoords(trip.destination);
    if (c) {
      destLat = c.lat;
      destLng = c.lng;
    }
  }

  // 2. Total Planned Distance & Duration Baseline
  let totalPlannedDistanceKm = Number(trip.plannedDistance ?? trip.planneddistance ?? 0);
  if (totalPlannedDistanceKm <= 0 && !isNaN(originLat) && !isNaN(destLat)) {
    totalPlannedDistanceKm = Math.round(haversineDistanceKm(originLat, originLng, destLat, destLng) * 1.25);
  }
  if (totalPlannedDistanceKm <= 0) totalPlannedDistanceKm = 40; // reasonable minimum default

  // Planned Duration: ~42 km/h commercial transit speed + 30m loading/pickup buffer
  const plannedTransitDurationMinutes = Math.round((totalPlannedDistanceKm / 42) * 60) + 30;

  // Planned ETA: use explicit trip.plannedETA if provided, otherwise compute from trip start time
  let plannedETADate: Date;
  if (trip.plannedETA || trip.plannedeta) {
    plannedETADate = new Date(trip.plannedETA || trip.plannedeta);
  } else {
    plannedETADate = new Date(tripCreatedAt.getTime() + plannedTransitDurationMinutes * 60 * 1000);
  }

  // 3. Telemetry and Current Coordinates
  const loc = (allLocations || []).find((l: any) => {
    const lTripId = String(l.tripID || l.tripid || '');
    return lTripId && lTripId.toLowerCase() === resolvedTripID.toLowerCase();
  });

  let currentLat: number | null = null;
  let currentLng: number | null = null;
  let currentSpeedKmH = 0;
  let lastLocationUpdate: string | null = null;
  let freshness: 'LIVE' | 'UPDATING' | 'STALE' | 'NO_SIGNAL' = 'NO_SIGNAL';

  if (loc && loc.latitude !== undefined && loc.longitude !== undefined) {
    const pLat = Number(loc.latitude);
    const pLng = Number(loc.longitude);
    if (!isNaN(pLat) && !isNaN(pLng)) {
      currentLat = pLat;
      currentLng = pLng;
      currentSpeedKmH = Number(loc.speed ?? 0);
      lastLocationUpdate = loc.updatedAt || loc.updatedat || loc.createdAt || loc.createdat || null;

      if (lastLocationUpdate) {
        const ageSec = Math.max(0, (now.getTime() - new Date(lastLocationUpdate).getTime()) / 1000);
        if (ageSec <= 180) freshness = 'LIVE';
        else if (ageSec <= 600) freshness = 'UPDATING';
        else freshness = 'STALE';
      } else {
        freshness = 'UPDATING';
      }
    }
  }

  // Handle Terminal Trips
  if (isTerminal) {
    const reasonCodes: DelayInsightResult['reasonCodes'] =
      rawStatus === 'DELIVERED' || rawStatus === 'COMPLETED' ? ['TRIP_COMPLETED'] : ['TRIP_CANCELLED'];

    return {
      tripID: resolvedTripID,
      vehicleID: vehicleId,
      vehicleName,
      driverID: driverId,
      driverName,
      source: trip.source || 'Origin',
      destination: trip.destination || 'Destination',
      tripStatus: rawStatus,
      isActive: false,
      isTerminal: true,
      plannedETA: plannedETADate.toISOString(),
      estimatedArrivalAt: now.toISOString(),
      predictedDelayMinutes: 0,
      delayRisk: 'ON_TIME',
      telemetry: {
        latitude: currentLat,
        longitude: currentLng,
        currentSpeedKmH: 0,
        lastLocationUpdate,
        freshness: 'NO_SIGNAL',
        distanceRemainingKm: 0,
        totalPlannedDistanceKm,
        percentCompleted: 100,
      },
      reasonCodes,
      confidence: 'HIGH',
      dataQualityIndicator: 'Trip concluded at destination; no active transit tracking required.',
      aiExplanation: {
        source: 'deterministic_fallback',
        explanation: `Trip ${resolvedTripID} is ${rawStatus.toLowerCase()}. Final delivery lifecycle is completed.`,
        actionableRecommendations: ['Archive trip delivery receipt and review vehicle availability.'],
        operationalImpact: 'No operational action required.',
      },
    };
  }

  // 4. Remaining Distance Calculation
  let distanceRemainingKm = totalPlannedDistanceKm;
  let percentCompleted = 0;
  const reasonCodes: DelayInsightResult['reasonCodes'] = [];

  if (currentLat !== null && currentLng !== null && !isNaN(destLat) && !isNaN(destLng)) {
    const airDistRemaining = haversineDistanceKm(currentLat, currentLng, destLat, destLng);
    distanceRemainingKm = Math.round(airDistRemaining * 1.25); // 1.25 winding factor
    percentCompleted = Math.min(100, Math.max(0, Math.round(((totalPlannedDistanceKm - distanceRemainingKm) / totalPlannedDistanceKm) * 100)));

    // Check Route Deviation
    if (!isNaN(originLat) && !isNaN(destLat)) {
      const deviationKm = crossTrackDeviationKm(currentLat, currentLng, originLat, originLng, destLat, destLng);
      if (deviationKm > 12) {
        reasonCodes.push('ROUTE_DEVIATION');
      }
    }
  } else {
    reasonCodes.push('INSUFFICIENT_DATA');
  }

  // Check Stale Location
  if (freshness === 'STALE' || freshness === 'NO_SIGNAL') {
    reasonCodes.push('STALE_LOCATION');
  }

  // Check Prolonged Stop in Transit
  if (isActive && rawStatus === 'IN_TRANSIT' && currentSpeedKmH < 3) {
    reasonCodes.push('PROLONGED_STOP');
  }

  // 5. Estimated Arrival Time and Delay Calculation
  // Effective speed: if currently moving briskly, blend current speed with highway standard; otherwise assume commercial 38 km/h
  let effectiveSpeed = 38;
  if (currentSpeedKmH >= 20) {
    effectiveSpeed = Math.min(75, Math.round(0.4 * currentSpeedKmH + 0.6 * 45));
  } else if (reasonCodes.includes('PROLONGED_STOP')) {
    effectiveSpeed = 25; // penalized speed due to stoppage
  }

  const remainingHours = distanceRemainingKm / Math.max(15, effectiveSpeed);
  const remainingMinutes = Math.round(remainingHours * 60);

  const estimatedArrivalDate = new Date(now.getTime() + remainingMinutes * 60 * 1000);
  const delayMs = estimatedArrivalDate.getTime() - plannedETADate.getTime();
  const predictedDelayMinutes = Math.max(0, Math.round(delayMs / 60000));

  // Risk Classification
  let delayRisk: DelayInsightResult['delayRisk'] = 'ON_TIME';
  if (predictedDelayMinutes > 30) {
    delayRisk = 'HIGH_RISK';
    reasonCodes.push('SLOWER_THAN_EXPECTED_PROGRESS');
  } else if (predictedDelayMinutes > 15) {
    delayRisk = 'MODERATE_RISK';
    reasonCodes.push('SLOWER_THAN_EXPECTED_PROGRESS');
  } else if (predictedDelayMinutes > 5) {
    delayRisk = 'LOW_RISK';
  } else {
    delayRisk = 'ON_TIME';
    if (reasonCodes.length === 0) {
      reasonCodes.push('ON_SCHEDULE');
    }
  }

  // Confidence & Quality Indicator
  let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
  let dataQualityIndicator = 'Live GPS telemetry stream with planned corridor reference.';
  if (freshness === 'LIVE' && currentLat !== null) {
    confidence = 'HIGH';
    dataQualityIndicator = 'Real-time telemetry updated within 3 minutes; high-confidence route projection.';
  } else if (freshness === 'STALE' || currentLat === null) {
    confidence = 'LOW';
    dataQualityIndicator = 'Telemetry is intermittent or stale; ETA derived from route schedule baseline.';
  }

  // 6. Gemini AI Explanation with Server-Side Validation and Deterministic Fallback
  const aiExplanation = await generateAiDelayExplanation({
    tripID: resolvedTripID,
    vehicleName,
    driverName,
    source: trip.source,
    destination: trip.destination,
    plannedETA: plannedETADate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    estimatedETA: estimatedArrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    delayMinutes: predictedDelayMinutes,
    delayRisk,
    currentSpeedKmH,
    distanceRemainingKm,
    reasonCodes,
    confidence,
  });

  return {
    tripID: resolvedTripID,
    vehicleID: vehicleId,
    vehicleName,
    driverID: driverId,
    driverName,
    source: trip.source || 'Origin',
    destination: trip.destination || 'Destination',
    tripStatus: rawStatus,
    isActive,
    isTerminal: false,
    plannedETA: plannedETADate.toISOString(),
    estimatedArrivalAt: estimatedArrivalDate.toISOString(),
    predictedDelayMinutes,
    delayRisk,
    telemetry: {
      latitude: currentLat,
      longitude: currentLng,
      currentSpeedKmH,
      lastLocationUpdate,
      freshness,
      distanceRemainingKm,
      totalPlannedDistanceKm,
      percentCompleted,
    },
    reasonCodes: Array.from(new Set(reasonCodes)),
    confidence,
    dataQualityIndicator,
    aiExplanation,
  };
}

/**
 * Generates an operational explanation and manager recommendations using Gemini with strict fallback.
 */
async function generateAiDelayExplanation(data: {
  tripID: string;
  vehicleName: string;
  driverName: string;
  source: string;
  destination: string;
  plannedETA: string;
  estimatedETA: string;
  delayMinutes: number;
  delayRisk: string;
  currentSpeedKmH: number;
  distanceRemainingKm: number;
  reasonCodes: string[];
  confidence: string;
}): Promise<{
  source: 'gemini' | 'deterministic_fallback';
  explanation: string;
  actionableRecommendations: string[];
  operationalImpact: string;
}> {
  const geminiApiKey = env.GEMINI_API_KEY || env.AI_API_KEY;

  const fallback = {
    source: 'deterministic_fallback' as const,
    explanation: data.delayMinutes > 5
      ? `Trip ${data.tripID} is running approximately ${data.delayMinutes} minutes behind schedule. Estimated arrival is revised to ${data.estimatedETA} (planned: ${data.plannedETA}) due to ${data.reasonCodes.join(', ').toLowerCase().replace(/_/g, ' ')}.`
      : `Trip ${data.tripID} is progressing on schedule with estimated arrival at ${data.estimatedETA} (planned: ${data.plannedETA}).`,
    actionableRecommendations: data.delayMinutes > 20
      ? [
          `Notify receiver at ${data.destination} of revised ETA (${data.estimatedETA}).`,
          `Check in with driver ${data.driverName} regarding current route conditions.`,
          'Monitor next GPS telemetry ping to verify sustained transit speed.',
        ]
      : [
          `Maintain regular tracking monitoring; next waypoint checkpoint in ~${Math.round(data.distanceRemainingKm / 2)} km.`,
          'No escalation required at this time.',
        ],
    operationalImpact: data.delayMinutes > 20
      ? `Moderate downstream dock delay expected; reschedule delivery window by +${data.delayMinutes} min.`
      : 'Minimal operational impact on delivery window.',
  };

  const apiKey = env.GEMINI_API_KEY || env.AI_API_KEY;
  if (!apiKey) {
    return fallback;
  }

  const systemPrompt = `
You are LogiSphere AI's Senior Fleet Dispatch Assistant.
Analyze the provided trip delay prediction data.
Rules:
1. Use ONLY the supplied data; NEVER invent traffic accidents, road closures, weather, or locations not provided.
2. The numeric ETA and predicted delay (${data.delayMinutes} min) are authoritative; do not alter numbers.
3. Output STRICT JSON conforming to the following structure:
{
  "explanation": "2 concise sentences explaining current progress and delay status.",
  "actionableRecommendations": ["Action 1 for manager", "Action 2 for manager"],
  "operationalImpact": "1 sentence summarizing delivery dock/customer impact."
}
`;

  return executeResilientAi<{
    source: 'gemini' | 'deterministic_fallback';
    explanation: string;
    actionableRecommendations: string[];
    operationalImpact: string;
  }>({
    feature: 'TRIP_DELAY_INSIGHTS',
    normalizedInput: {
      tripID: data.tripID,
      estimatedETA: data.estimatedETA,
      delayMinutes: data.delayMinutes,
      delayRisk: data.delayRisk,
      reasonCodes: data.reasonCodes,
    },
    executeGemini: async () => {
      const response = await callGemini<any>({
        systemPrompt,
        userPrompt: `Trip Data: ${JSON.stringify(data)}`,
        responseMimeType: 'application/json',
        temperature: 0.15,
        maxOutputTokens: 250,
      });

      const parsed = response.data;
      if (
        parsed &&
        typeof parsed.explanation === 'string' &&
        Array.isArray(parsed.actionableRecommendations)
      ) {
        return {
          source: 'gemini' as const,
          explanation: parsed.explanation.trim(),
          actionableRecommendations: parsed.actionableRecommendations
            .map((r: any) => String(r).trim())
            .slice(0, 3),
          operationalImpact: String(parsed.operationalImpact || fallback.operationalImpact).trim(),
        };
      }
      throw new Error('Malformed Gemini delay explanation response');
    },
    validateResponse: (res) =>
      Boolean(res && res.explanation && Array.isArray(res.actionableRecommendations)),
    getFallback: () => fallback,
  });
}
