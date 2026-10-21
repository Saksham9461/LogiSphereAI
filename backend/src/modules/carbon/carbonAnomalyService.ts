import { CarbonAnomaly, TripCarbonRecord, VehicleCarbonSummary, AnomalySeverity } from './types';

/**
 * ==============================================================================
 * LogiSphere AI — Carbon Anomaly Detection Engine
 * 
 * Rules:
 * 1. Deterministic statistical detection first — no hallucinated anomalies.
 * 2. Minimum sample size thresholds (>= 3 trips) before declaring vehicle degradation.
 * 3. Accounts for vehicle category and historical baselines.
 * 4. Categorizes into HIGH, MEDIUM, and LOW severity.
 * ==============================================================================
 */

export function detectTripCarbonAnomalies(
  trips: TripCarbonRecord[],
  vehicleBaselines: Map<string, number>
): CarbonAnomaly[] {
  const anomalies: CarbonAnomaly[] = [];

  for (const trip of trips) {
    if (trip.status === 'CANCELLED' || trip.distanceKm <= 2 || !trip.emissionsPerKm) {
      continue;
    }

    const vehicleBaseline = vehicleBaselines.get(trip.vehicleID) || 0.28; // default ~0.28 kg CO2/km (~10.5 L/100km diesel)

    // Check 1: Excessive Emissions per KM (>40% above baseline)
    if (trip.emissionsPerKm > vehicleBaseline * 1.4) {
      const devPercent = Math.round(((trip.emissionsPerKm - vehicleBaseline) / vehicleBaseline) * 100);
      const isSevere = devPercent >= 70;

      anomalies.push({
        id: `anom-trip-${trip.tripID}-${Date.now().toString().slice(-4)}`,
        type: 'EXCESSIVE_EMISSIONS_PER_KM',
        severity: isSevere ? 'HIGH' : 'MEDIUM',
        vehicleID: trip.vehicleID,
        vehicleName: trip.vehicleName,
        tripID: trip.tripID,
        metricObserved: `${trip.emissionsPerKm.toFixed(3)} kg CO2/km`,
        baselineExpected: `${vehicleBaseline.toFixed(3)} kg CO2/km`,
        deviationPercent: devPercent,
        evidenceReason: `Trip "${trip.tripID}" generated ${trip.emissionsPerKm.toFixed(3)} kg CO2/km, which is ${devPercent}% higher than the expected baseline (${vehicleBaseline.toFixed(3)} kg CO2/km).`,
        operationalImpact: `Excessive fuel combustion on this single trip contributed ${((trip.co2EmissionsKg * devPercent) / (100 + devPercent)).toFixed(1)} kg of preventable CO2 emissions. Likely causes include heavy city congestion, excessive idling, or aggressive acceleration.`,
        date: trip.date,
        navigationTarget: {
          screen: 'TripDispatcher',
          id: trip.tripID,
        },
      });
    }

    // Check 2: Low-Distance High-Fuel Anomaly (Idling / Auxiliary Burn)
    if (trip.distanceKm > 0 && trip.distanceKm < 15 && trip.fuelConsumedLiters && trip.fuelConsumedLiters >= 6) {
      const impliedL100 = (trip.fuelConsumedLiters / trip.distanceKm) * 100;
      anomalies.push({
        id: `anom-idle-${trip.tripID}-${Date.now().toString().slice(-4)}`,
        type: 'IDLING_OR_CONGESTION_PENALTY',
        severity: 'HIGH',
        vehicleID: trip.vehicleID,
        vehicleName: trip.vehicleName,
        tripID: trip.tripID,
        metricObserved: `${trip.fuelConsumedLiters.toFixed(1)} L consumed across only ${trip.distanceKm} km (~${impliedL100.toFixed(0)} L/100km)`,
        baselineExpected: `< 3.0 L for short distance`,
        deviationPercent: Math.round(((trip.fuelConsumedLiters - 2.5) / 2.5) * 100),
        evidenceReason: `Disproportionate fuel burn recorded on short trip "${trip.tripID}" (${trip.distanceKm} km).`,
        operationalImpact: `Vehicle burned ${trip.fuelConsumedLiters.toFixed(1)} liters while stationary or navigating prolonged stop-and-go delays, generating ${trip.co2EmissionsKg.toFixed(1)} kg CO2 with near-zero logistics progress.`,
        date: trip.date,
        navigationTarget: {
          screen: 'TripDispatcher',
          id: trip.tripID,
        },
      });
    }
  }

  return anomalies;
}

export function detectVehicleEfficiencyDegradation(
  vehicles: VehicleCarbonSummary[]
): CarbonAnomaly[] {
  const anomalies: CarbonAnomaly[] = [];

  for (const v of vehicles) {
    if (v.completedTrips < 3 || !v.avgEmissionsPerKm || !v.baselineEmissionsPerKm) {
      continue;
    }

    // Check: Vehicle recent emissions per km > 25% above its historical baseline
    if (v.avgEmissionsPerKm > v.baselineEmissionsPerKm * 1.25) {
      const devPercent = Math.round(((v.avgEmissionsPerKm - v.baselineEmissionsPerKm) / v.baselineEmissionsPerKm) * 100);
      const isCritical = devPercent >= 45;

      anomalies.push({
        id: `anom-veh-${v.vehicleID}-${Date.now().toString().slice(-4)}`,
        type: 'EFFICIENCY_DEGRADATION',
        severity: isCritical ? 'HIGH' : 'MEDIUM',
        vehicleID: v.vehicleID,
        vehicleName: v.name,
        metricObserved: `${v.avgEmissionsPerKm.toFixed(3)} kg CO2/km (avg over ${v.completedTrips} trips)`,
        baselineExpected: `${v.baselineEmissionsPerKm.toFixed(3)} kg CO2/km (historical standard)`,
        deviationPercent: devPercent,
        evidenceReason: `Vehicle "${v.name}" (${v.registrationNumber}) emissions increased by ${devPercent}% above historical standard.`,
        operationalImpact: `Persistent efficiency drop indicates mechanical resistance, clogged air/fuel filters, improper tire pressure, or engine degradation. Over ${v.totalDistanceKm} km, this degradation generated ~${((v.totalCo2Kg * devPercent) / (100 + devPercent)).toFixed(1)} kg excess CO2.`,
        date: new Date().toISOString().split('T')[0],
        navigationTarget: {
          screen: 'Maintenance',
          id: v.vehicleID,
        },
      });
    }
  }

  return anomalies;
}

export function detectFleetWideAnomalies(
  currentPeriod: { co2Kg: number; distanceKm: number },
  previousPeriod: { co2Kg: number; distanceKm: number }
): CarbonAnomaly[] {
  const anomalies: CarbonAnomaly[] = [];

  if (previousPeriod.distanceKm >= 50 && currentPeriod.distanceKm >= 50) {
    const currentRate = currentPeriod.co2Kg / currentPeriod.distanceKm;
    const prevRate = previousPeriod.co2Kg / previousPeriod.distanceKm;

    if (currentRate > prevRate * 1.20) {
      const devPercent = Math.round(((currentRate - prevRate) / prevRate) * 100);
      anomalies.push({
        id: `anom-fleet-spike-${Date.now().toString().slice(-4)}`,
        type: 'FLEET_EMISSION_SPIKE',
        severity: 'HIGH',
        vehicleID: 'FLEET_WIDE',
        vehicleName: 'Entire Active Fleet',
        metricObserved: `${currentRate.toFixed(3)} kg CO2/km`,
        baselineExpected: `${prevRate.toFixed(3)} kg CO2/km (previous period)`,
        deviationPercent: devPercent,
        evidenceReason: `Fleet emission intensity increased by ${devPercent}% period-over-period (${currentRate.toFixed(3)} vs ${prevRate.toFixed(3)} kg CO2/km).`,
        operationalImpact: `Fleet-wide emissions expanded despite steady or decreasing mileage, highlighting systemic route inefficiencies, increased cargo overloads, or seasonal route detours.`,
        date: new Date().toISOString().split('T')[0],
        navigationTarget: {
          screen: 'Analytics',
          id: 'fleet',
        },
      });
    }
  }

  return anomalies;
}
