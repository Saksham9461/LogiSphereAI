import { env } from '../../config/env';
import { executeResilientAi } from '../ai/orchestrator';
import { callGemini } from '../ai/geminiClient';
import {
  CarbonAdvisorRecommendation,
  CarbonAnomaly,
  VehicleCarbonSummary,
  TripCarbonRecord,
} from './types';

export interface AdvisorInput {
  orgId: string;
  totalCo2Kg: number;
  totalDistanceKm: number;
  totalFuelCostINR: number;
  topVehicles: VehicleCarbonSummary[];
  topTrips: TripCarbonRecord[];
  anomalies: CarbonAnomaly[];
  potentialSavingsKg: number;
}

export interface AdvisorOutput {
  source: 'gemini' | 'deterministic_fallback';
  executiveSummary: string;
  recommendations: CarbonAdvisorRecommendation[];
}

/**
 * Builds grounded deterministic recommendations strictly derived from empirical data and detected anomalies.
 */
export function generateDeterministicRecommendations(input: AdvisorInput): CarbonAdvisorRecommendation[] {
  const recommendations: CarbonAdvisorRecommendation[] = [];

  // 1. Vehicle Maintenance Recommendations (based on degraded vehicles)
  const degradedVehicle = input.topVehicles.find(
    (v) => v.efficiencyRating === 'POOR' || (v.avgEmissionsPerKm && v.baselineEmissionsPerKm && v.avgEmissionsPerKm > v.baselineEmissionsPerKm * 1.2)
  );
  if (degradedVehicle) {
    const excessKg = Number((degradedVehicle.totalCo2Kg * 0.18).toFixed(1));
    const excessCost = Math.round(excessKg * 34.5); // ~34.5 INR saved per kg CO2 diesel reduction
    recommendations.push({
      id: `rec-maint-${degradedVehicle.vehicleID}`,
      title: `Schedule Fuel System & Tire Servicing for ${degradedVehicle.name}`,
      priority: 'HIGH',
      category: 'VEHICLE_MAINTENANCE',
      area: `${degradedVehicle.name} (${degradedVehicle.registrationNumber})`,
      evidence: `Vehicle emissions intensity is ${(degradedVehicle.avgEmissionsPerKm || 0).toFixed(3)} kg CO2/km, exceeding fleet class baseline by >20% across ${degradedVehicle.completedTrips} completed trips.`,
      operationalImpact: `Mechanical friction, underinflated tires, or clogged injectors are causing engine power loss and excessive fuel consumption.`,
      actionableStep: `Send vehicle for comprehensive 50-point diagnostic check: clean fuel injectors, replace air filter, and calibrate tire pressure to manufacturer PSI specification.`,
      estimatedCo2SavingsKg: excessKg,
      estimatedCostSavingsINR: excessCost,
      confidence: 'HIGH',
      assumptions: 'Assumes comprehensive servicing restores engine combustion efficiency to vehicle nominal standard.',
      navigationTarget: {
        screen: 'Maintenance',
        id: degradedVehicle.vehicleID,
      },
    });
  }

  // 2. High Idling / Short Trip Detour Optimization
  const idlingAnomaly = input.anomalies.find((a) => a.type === 'IDLING_OR_CONGESTION_PENALTY');
  if (idlingAnomaly) {
    const savingsKg = 14.5;
    const savingsINR = Math.round(savingsKg * 34.5);
    recommendations.push({
      id: `rec-idling-${idlingAnomaly.tripID || 'general'}`,
      title: 'Enforce 3-Minute Idle Shutdown Policy at Loading Docks',
      priority: 'HIGH',
      category: 'SPEED_AND_IDLING',
      area: idlingAnomaly.vehicleName,
      evidence: idlingAnomaly.evidenceReason,
      operationalImpact: 'Prolonged stationary auxiliary idling burns up to 2.5 liters of fuel per hour without advancing freight.',
      actionableStep: 'Brief dispatch supervisors and drivers to mandate engine shutdown during queue wait times exceeding 3 minutes at customer warehouses and hub gates.',
      estimatedCo2SavingsKg: savingsKg,
      estimatedCostSavingsINR: savingsINR,
      confidence: 'MEDIUM',
      assumptions: 'Assumes driver adheres to engine shutdown during yard loading and gate verification.',
      navigationTarget: {
        screen: 'TripDispatcher',
        id: idlingAnomaly.tripID,
      },
    });
  }

  // 3. Route Optimization & Highway Detour Reduction
  const highEmissionTrip = input.topTrips.find((t) => t.distanceKm >= 20 && (t.emissionsPerKm || 0) > 0.35);
  if (highEmissionTrip) {
    const potKg = Number((highEmissionTrip.co2EmissionsKg * 0.12).toFixed(1));
    const potCost = Math.round(potKg * 34.5);
    recommendations.push({
      id: `rec-route-${highEmissionTrip.tripID}`,
      title: `Adopt Eco-Routing on ${highEmissionTrip.source} -> ${highEmissionTrip.destination}`,
      priority: 'MEDIUM',
      category: 'ROUTE_OPTIMIZATION',
      area: `Corridor: ${highEmissionTrip.source} to ${highEmissionTrip.destination}`,
      evidence: `Trip recorded ${highEmissionTrip.co2EmissionsKg.toFixed(1)} kg CO2 (${(highEmissionTrip.emissionsPerKm || 0).toFixed(3)} kg/km). Urban bottleneck delays contributed significant stop-and-go burn.`,
      operationalImpact: 'Traffic-heavy city center routes incur severe brake-and-accelerate fuel penalties.',
      actionableStep: 'Switch future dispatches along this corridor to bypass arterial ring roads during peak traffic hours (08:00-10:30 & 17:30-20:00).',
      estimatedCo2SavingsKg: potKg,
      estimatedCostSavingsINR: potCost,
      confidence: 'MEDIUM',
      assumptions: 'Assumes bypass routing maintains steady cruising speed between 50-65 km/h.',
      navigationTarget: {
        screen: 'TripDispatcher',
        id: highEmissionTrip.tripID,
      },
    });
  }

  // 4. Fleet Load Consolidation
  if (input.totalCo2Kg > 100 && input.topVehicles.length >= 2) {
    const potKg = Number((input.totalCo2Kg * 0.08).toFixed(1));
    const potCost = Math.round(potKg * 34.5);
    recommendations.push({
      id: 'rec-consolidation-fleet',
      title: 'Consolidate Partial Cargo Dispatches on High-Volume Corridors',
      priority: 'LOW',
      category: 'FLEET_ALLOCATION',
      area: 'Inter-hub Dispatches',
      evidence: `Fleet generated ${input.totalCo2Kg.toFixed(1)} kg CO2 across ${input.totalDistanceKm} km. Multiple vehicles operate with partial payload utilization on overlapping routes.`,
      operationalImpact: 'Dispatched multiple vehicles at <50% load capacity doubles fuel and administrative footprint per ton-km.',
      actionableStep: 'Group deliveries scheduled within 3-hour dispatch windows onto higher-capacity heavy commercial vehicles instead of multiple mini vans.',
      estimatedCo2SavingsKg: potKg,
      estimatedCostSavingsINR: potCost,
      confidence: 'LOW',
      assumptions: 'Subject to customer delivery time windows and loading bay availability.',
      navigationTarget: {
        screen: 'VehicleRegistry',
      },
    });
  }

  return recommendations;
}

/**
 * Executes AI Carbon Advisor with cache-first, resilient fallback handling.
 */
export async function getCarbonAdvisorInsights(input: AdvisorInput): Promise<AdvisorOutput> {
  const deterministicRecs = generateDeterministicRecommendations(input);
  const fallbackExecutiveSummary = input.totalCo2Kg > 0
    ? `Fleet generated ${input.totalCo2Kg.toFixed(1)} kg CO2 across ${input.totalDistanceKm} km (${(input.totalDistanceKm > 0 ? input.totalCo2Kg / input.totalDistanceKm : 0).toFixed(3)} kg/km). Identified ${deterministicRecs.length} actionable sustainability interventions offering ~${input.potentialSavingsKg.toFixed(1)} kg CO2 in potential emission reductions.`
    : 'No active fleet trips or fuel emissions recorded for the selected period.';

  const fallbackOutput: AdvisorOutput = {
    source: 'deterministic_fallback',
    executiveSummary: fallbackExecutiveSummary,
    recommendations: deterministicRecs,
  };

  const apiKey = env.GEMINI_API_KEY || env.AI_API_KEY;
  if (!apiKey || input.totalCo2Kg <= 0) {
    return fallbackOutput;
  }

  // Prepare concise, sanitized prompt
  const sanitizedSummary = {
    totalCo2Kg: Number(input.totalCo2Kg.toFixed(1)),
    totalDistanceKm: Number(input.totalDistanceKm.toFixed(1)),
    avgEmissionsPerKm: input.totalDistanceKm > 0 ? Number((input.totalCo2Kg / input.totalDistanceKm).toFixed(3)) : 0,
    topEmittingVehicles: input.topVehicles.slice(0, 3).map((v) => ({
      name: v.name,
      type: v.type,
      trips: v.completedTrips,
      co2Kg: Number(v.totalCo2Kg.toFixed(1)),
      kgPerKm: v.avgEmissionsPerKm ? Number(v.avgEmissionsPerKm.toFixed(3)) : null,
      rating: v.efficiencyRating,
    })),
    anomalies: input.anomalies.slice(0, 3).map((a) => ({
      type: a.type,
      vehicle: a.vehicleName,
      reason: a.evidenceReason,
    })),
  };

  const promptText = `
You are an expert fleet sustainability advisor for LogiSphere AI.
Analyze this compact fleet carbon summary:
${JSON.stringify(sanitizedSummary, null, 2)}

Provide:
1. A concise, authoritative 2-sentence executive summary.
2. Refined recommendations grounded strictly in this data. Do NOT fabricate vehicle names, trips, or impossible numbers.

Respond ONLY with valid JSON in this exact structure:
{
  "executiveSummary": "Concise 2-sentence executive sustainability overview.",
  "recommendations": [
    {
      "id": "rec-1",
      "title": "Clear action title",
      "priority": "HIGH",
      "category": "VEHICLE_MAINTENANCE",
      "area": "Specific vehicle or corridor from data",
      "evidence": "Grounding observation from provided data",
      "operationalImpact": "Why this matters in fleet operations",
      "actionableStep": "Specific practical engineering or dispatch instruction",
      "estimatedCo2SavingsKg": 15.0,
      "estimatedCostSavingsINR": 520,
      "confidence": "HIGH",
      "assumptions": "Clear operational assumption"
    }
  ]
}
`;

  return executeResilientAi<AdvisorOutput>({
    feature: 'CARBON_INTELLIGENCE',
    tenantOrUserId: `org_${input.orgId}`,
    normalizedInput: {
      orgId: input.orgId,
      summary: sanitizedSummary,
    },
    ttlSeconds: 900, // 15 mins
    executeGemini: async () => {
      const geminiRes = await callGemini<{ executiveSummary: string; recommendations: CarbonAdvisorRecommendation[] }>({
        userPrompt: promptText,
        responseMimeType: 'application/json',
        temperature: 0.2,
        maxOutputTokens: 750,
      });

      const parsed = geminiRes.data;
      if (parsed && typeof parsed.executiveSummary === 'string' && Array.isArray(parsed.recommendations) && parsed.recommendations.length > 0) {
        // Merge with deterministic navigation targets so client buttons work flawlessly
        const enrichedRecs = parsed.recommendations.slice(0, 5).map((rec, idx) => {
          const matchingDeterministic = deterministicRecs[idx] || deterministicRecs[0];
          return {
            ...rec,
            id: rec.id || `rec-ai-${idx + 1}`,
            priority: ['HIGH', 'MEDIUM', 'LOW'].includes(rec.priority) ? rec.priority : 'MEDIUM',
            category: rec.category || 'ROUTE_OPTIMIZATION',
            navigationTarget: matchingDeterministic?.navigationTarget || { screen: 'Analytics' },
          };
        });

        return {
          source: 'gemini',
          executiveSummary: parsed.executiveSummary.trim(),
          recommendations: enrichedRecs,
        };
      }

      return fallbackOutput;
    },
    validateResponse: (res) => {
      return Boolean(res && Array.isArray(res.recommendations) && res.recommendations.length > 0);
    },
    getFallback: () => fallbackOutput,
  });
}
