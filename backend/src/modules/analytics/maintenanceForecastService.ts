import { db } from '../../config/database';
import { env } from '../../config/env';
import { executeResilientAi } from '../ai/orchestrator';
import { callGemini } from '../ai/geminiClient';

export interface MonthlyExpenditure {
  month: string; // 'YYYY-MM'
  monthLabel: string; // 'Oct 2026'
  actualCost: number;
  serviceCount: number;
  isProjected?: boolean;
}

export interface VehicleMaintenanceRisk {
  vehicleID: string;
  name: string;
  vehicleName?: string;
  registrationNumber: string;
  type: string;
  totalHistoricalCost: number;
  recentCost90Days: number;
  recent90DaysCost?: number;
  serviceVisitCount: number;
  recentVisitCount90Days: number;
  recent90DaysVisits?: number;
  estimatedNextMonthCost: number;
  projectedNextMonthCost?: number;
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  primaryCostDrivers: string[];
  evidenceReasons: string[];
  suggestedAction?: string;
  odometer: number;
  acquisitionCost: number;
}

export interface MaintenanceForecastResult {
  nextMonth: string; // 'YYYY-MM'
  nextMonthLabel: string; // 'Nov 2026'
  forecastBudget: number;
  forecastRange: {
    min: number;
    max: number;
  };
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  confidenceScore: number; // 0 to 1
  methodology: string;
  currency: string;
  dataPeriod: {
    startDate: string;
    endDate: string;
    completedMonthsCount: number;
  };
  historicalMonthly: MonthlyExpenditure[];
  vehicleProjections: VehicleMaintenanceRisk[];
  highRiskVehicles: VehicleMaintenanceRisk[];
  fleetSummary: {
    totalVehicles: number;
    vehiclesWithMaintenanceHistory: number;
    averageMonthlyFleetSpend: number;
    totalHistoricalMaintenanceSpend: number;
  };
  aiExplanation: {
    source: 'gemini' | 'deterministic_fallback';
    executiveSummary: string;
    summary?: string;
    costDrivers: string[];
    budgetRecommendations: string[];
    actionableSuggestions?: string[];
    riskSummary: string;
  };
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatMonthLabel(ym: string): string {
  const [yearStr, monthStr] = ym.split('-');
  const mIdx = Number(monthStr) - 1;
  return `${MONTH_NAMES[mIdx] || monthStr} ${yearStr}`;
}

function getNextMonthString(ym: string): string {
  const [yearStr, monthStr] = ym.split('-');
  let year = Number(yearStr);
  let month = Number(monthStr) + 1;
  if (month > 12) {
    month = 1;
    year += 1;
  }
  return `${year}-${String(month).padStart(2, '0')}`;
}

function getMonthKeyFromDate(raw: any): string | null {
  if (!raw) return null;
  const str = String(raw).trim();
  if (/^\d{4}-\d{2}/.test(str)) {
    return str.slice(0, 7);
  }
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  return null;
}

/**
 * Calculates authoritative deterministic maintenance cost forecast and risk factors.
 */
export async function calculateMaintenanceForecast(): Promise<MaintenanceForecastResult> {
  const [rawVehicles, rawMaint, rawExpenses] = await Promise.all([
    db.list('vehicles'),
    db.list('maintenance_records'),
    db.list('expense_records'),
  ]);

  const vehicles = rawVehicles || [];
  const maintRecords = rawMaint || [];
  const expenses = rawExpenses || [];

  // Filter valid completed/active records with positive costs
  const validMaint = maintRecords.filter((r: any) => {
    const cost = Number(r.cost ?? 0);
    return !isNaN(cost) && cost >= 0;
  });

  // Collect distinct months and map vehicle records
  const monthlyCostMap: Record<string, { cost: number; count: number }> = {};
  const vehicleMaintMap: Record<string, any[]> = {};

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  let earliestDate: Date = now;
  let latestDate: Date = new Date(0);

  for (const r of validMaint) {
    const vId = String(r.vehicleID || r.vehicleid || '');
    if (vId) {
      if (!vehicleMaintMap[vId]) vehicleMaintMap[vId] = [];
      vehicleMaintMap[vId].push(r);
    }

    const dStr = r.date || r.createdAt || r.createdat;
    const mKey = getMonthKeyFromDate(dStr);
    if (!mKey) continue;

    const recordDate = new Date(dStr);
    if (!isNaN(recordDate.getTime())) {
      if (recordDate < earliestDate) earliestDate = recordDate;
      if (recordDate > latestDate) latestDate = recordDate;
    }

    if (!monthlyCostMap[mKey]) {
      monthlyCostMap[mKey] = { cost: 0, count: 0 };
    }
    const cost = Number(r.cost ?? 0);
    monthlyCostMap[mKey].cost += cost;
    monthlyCostMap[mKey].count += 1;
  }

  // Double-counting prevention: check expense_records with maint > 0 that do not mirror a maintenance record
  for (const exp of expenses) {
    const maintAmount = Number(exp.maint ?? 0);
    if (maintAmount > 0) {
      const vId = String(exp.vehicleID || exp.vehicleid || '');
      const expDateStr = exp.createdAt || exp.createdat;
      const mKey = getMonthKeyFromDate(expDateStr);
      if (!mKey) continue;

      const expVId = String(exp.vehicleID || exp.vehicleid || '').toLowerCase();
      // Check if duplicate already logged in maintenance_records for same vehicle and approximate amount
      const isAlreadyInMaint = validMaint.some((mr: any) => {
        const mrVId = String(mr.vehicleID || mr.vehicleid || '').toLowerCase();
        if (expVId && mrVId && expVId !== mrVId) return false;
        const mrCost = Number(mr.cost ?? 0);
        const mrDateStr = mr.date || mr.createdAt || mr.createdat;
        const mrKey = getMonthKeyFromDate(mrDateStr);
        return mrKey === mKey && Math.abs(mrCost - maintAmount) < 5;
      });

      if (!isAlreadyInMaint) {
        if (!monthlyCostMap[mKey]) {
          monthlyCostMap[mKey] = { cost: 0, count: 0 };
        }
        monthlyCostMap[mKey].cost += maintAmount;
        monthlyCostMap[mKey].count += 1;
      }
    }
  }

  // Sort completed historical months chronologically
  const sortedMonthKeys = Object.keys(monthlyCostMap).sort();
  const historicalMonthly: MonthlyExpenditure[] = sortedMonthKeys.map((mKey) => ({
    month: mKey,
    monthLabel: formatMonthLabel(mKey),
    actualCost: Math.round(monthlyCostMap[mKey].cost),
    serviceCount: monthlyCostMap[mKey].count,
    isProjected: false,
  }));

  const completedMonthsCount = sortedMonthKeys.length;
  const nextMonthKey = getNextMonthString(sortedMonthKeys[sortedMonthKeys.length - 1] || currentMonthKey);
  const nextMonthLabel = formatMonthLabel(nextMonthKey);

  // Deterministic Baseline: Exponentially Weighted Moving Average (EWMA) + SMA fallback
  let forecastBudget = 0;
  let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
  let confidenceScore = 0.4;
  let methodology = 'Insufficient historical data (using fleet baseline)';

  const costs = historicalMonthly.map((m) => m.actualCost);
  const totalSpend = costs.reduce((acc, c) => acc + c, 0);

  if (completedMonthsCount >= 4) {
    // 3-month moving average weighted towards most recent months
    const recent = costs.slice(-4);
    const alpha = 0.5;
    let ewma = recent[0];
    for (let i = 1; i < recent.length; i++) {
      ewma = alpha * recent[i] + (1 - alpha) * ewma;
    }
    const sma3 = (recent[1] + recent[2] + recent[3]) / 3;
    forecastBudget = Math.round(0.7 * ewma + 0.3 * sma3);
    confidence = 'HIGH';
    confidenceScore = 0.88;
    methodology = 'Exponentially Weighted Moving Average (EWMA, α=0.5) combined with 3-month rolling baseline';
  } else if (completedMonthsCount >= 2) {
    const sma = totalSpend / completedMonthsCount;
    const latest = costs[costs.length - 1];
    forecastBudget = Math.round(0.6 * latest + 0.4 * sma);
    confidence = 'MEDIUM';
    confidenceScore = 0.65;
    methodology = 'Weighted average of recent 2-3 completed operating months';
  } else if (completedMonthsCount === 1) {
    forecastBudget = Math.round(costs[0]);
    confidence = 'LOW';
    confidenceScore = 0.45;
    methodology = 'Single operating month projection (provisional)';
  } else {
    // Zero recorded history: Estimate conservatively from active vehicle registry
    const activeVehiclesCount = vehicles.filter((v: any) => v.status !== 'RETIRED').length;
    forecastBudget = activeVehiclesCount * 2500; // conservative nominal maintenance budget in INR
    confidence = 'LOW';
    confidenceScore = 0.25;
    methodology = 'Fleet vehicle registry baseline allowance (zero historical records)';
  }

  // Calculate variance range (±15% to ±25%)
  const marginPercent = confidence === 'HIGH' ? 0.15 : confidence === 'MEDIUM' ? 0.22 : 0.30;
  const forecastMin = Math.max(0, Math.round(forecastBudget * (1 - marginPercent)));
  const forecastMax = Math.round(forecastBudget * (1 + marginPercent));

  // --- Vehicle-level risk classification and projections ---
  const vehicleProjections: VehicleMaintenanceRisk[] = vehicles.map((v: any) => {
    const vId = String(v.vehicleID || v.vehicleid || v.id || '');
    const vReg = String(v.registrationNumber || v.reg || 'N/A');
    const vName = String(v.name || vReg || 'Vehicle');
    const vType = String(v.type || 'VAN').toUpperCase();
    const odo = Number(v.odometer ?? 0);
    const acqCost = Number(v.acquisitionCost ?? 0);

    const records = vehicleMaintMap[vId] || [];
    const totalCost = records.reduce((s: number, r: any) => s + Number(r.cost ?? 0), 0);
    const visitCount = records.length;

    // Recent 90-day activity
    const recentRecords = records.filter((r: any) => {
      const d = new Date(r.date || r.createdAt || r.createdat);
      return !isNaN(d.getTime()) && d >= ninetyDaysAgo;
    });
    const recentCost90Days = recentRecords.reduce((s: number, r: any) => s + Number(r.cost ?? 0), 0);
    const recentVisitCount90Days = recentRecords.length;

    // Distinct service categories
    const serviceTypeSet = new Set<string>();
    for (const r of records) {
      const st = r.serviceType || r.servicetype || r.service;
      if (st) serviceTypeSet.add(String(st).trim());
    }
    const primaryCostDrivers = Array.from(serviceTypeSet).slice(0, 3);

    // Evidence-based risk determination
    const evidenceReasons: string[] = [];
    let riskScore = 0;

    // Factor 1: High recent visit frequency
    if (recentVisitCount90Days >= 3) {
      riskScore += 40;
      evidenceReasons.push(`${recentVisitCount90Days} service visits recorded in the past 90 days`);
    } else if (recentVisitCount90Days >= 2) {
      riskScore += 20;
      evidenceReasons.push(`${recentVisitCount90Days} service visits in the past 90 days`);
    }

    // Factor 2: High repair costs relative to vehicle acquisition cost
    if (acqCost > 0) {
      const ratio = (totalCost / acqCost) * 100;
      if (ratio >= 35) {
        riskScore += 35;
        evidenceReasons.push(`Cumulative maintenance cost is ${Math.round(ratio)}% of vehicle acquisition cost`);
      } else if (ratio >= 20) {
        riskScore += 15;
        evidenceReasons.push(`Cumulative maintenance cost is ${Math.round(ratio)}% of acquisition cost`);
      }
    }

    // Factor 3: High recent spend concentration
    if (totalCost > 0 && recentCost90Days / totalCost > 0.6 && recentCost90Days > 8000) {
      riskScore += 25;
      evidenceReasons.push(`Over 60% of maintenance expenditure occurred recently (₹${recentCost90Days.toLocaleString('en-IN')})`);
    }

    // Factor 4: High mileage indicator
    if (odo > 120000) {
      riskScore += 15;
      evidenceReasons.push(`High odometer reading (${odo.toLocaleString('en-IN')} km) requires preventive inspection`);
    }

    if (evidenceReasons.length === 0) {
      if (visitCount === 0) {
        evidenceReasons.push('No maintenance issues logged to date; regular preventive check recommended');
      } else {
        evidenceReasons.push(`Stable maintenance pattern with ${visitCount} total service log(s)`);
      }
    }

    let riskLevel: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    if (riskScore >= 45) riskLevel = 'HIGH';
    else if (riskScore >= 20) riskLevel = 'MEDIUM';

    // Projected next month cost per vehicle
    let estimatedNextMonthCost = 0;
    if (visitCount > 0) {
      const avgCostPerMonth = totalCost / Math.max(1, completedMonthsCount);
      estimatedNextMonthCost = Math.round(riskLevel === 'HIGH' ? avgCostPerMonth * 1.3 : avgCostPerMonth);
    } else {
      estimatedNextMonthCost = Math.round(forecastBudget / Math.max(1, vehicles.length));
    }

    return {
      vehicleID: vId,
      name: vName,
      vehicleName: vName,
      registrationNumber: vReg,
      type: vType,
      totalHistoricalCost: Math.round(totalCost),
      recentCost90Days: Math.round(recentCost90Days),
      recent90DaysCost: Math.round(recentCost90Days),
      serviceVisitCount: visitCount,
      recentVisitCount90Days,
      recent90DaysVisits: recentVisitCount90Days,
      estimatedNextMonthCost,
      projectedNextMonthCost: estimatedNextMonthCost,
      riskLevel,
      primaryCostDrivers: primaryCostDrivers.length > 0 ? primaryCostDrivers : ['General Inspection'],
      evidenceReasons,
      suggestedAction: evidenceReasons[0] || 'Regular preventive maintenance inspection recommended',
      odometer: odo,
      acquisitionCost: acqCost,
    };
  });

  // Sort vehicle projections by risk and estimated cost
  vehicleProjections.sort((a, b) => {
    const riskRank = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    if (riskRank[b.riskLevel] !== riskRank[a.riskLevel]) {
      return riskRank[b.riskLevel] - riskRank[a.riskLevel];
    }
    return b.estimatedNextMonthCost - a.estimatedNextMonthCost;
  });

  const highRiskVehicles = vehicleProjections.filter((v) => v.riskLevel === 'HIGH' || v.riskLevel === 'MEDIUM');

  // --- Gemini AI Explanation with Server-Side Validation & Deterministic Fallback ---
  const rawAiExplanation = await generateAiMaintenanceSummary({
    nextMonthLabel,
    forecastBudget,
    forecastMin,
    forecastMax,
    confidence,
    historicalMonthly,
    highRiskVehicles,
    totalVehicles: vehicles.length,
  });

  const aiExplanation = {
    ...rawAiExplanation,
    summary: rawAiExplanation.executiveSummary,
    actionableSuggestions: rawAiExplanation.budgetRecommendations,
  };

  return {
    nextMonth: nextMonthKey,
    nextMonthLabel,
    forecastBudget,
    forecastRange: {
      min: forecastMin,
      max: forecastMax,
    },
    confidence,
    confidenceScore,
    methodology,
    currency: 'INR',
    dataPeriod: {
      startDate: earliestDate.getTime() > 0 ? earliestDate.toISOString().slice(0, 10) : 'N/A',
      endDate: latestDate.getTime() > 0 ? latestDate.toISOString().slice(0, 10) : 'N/A',
      completedMonthsCount,
    },
    historicalMonthly,
    vehicleProjections,
    highRiskVehicles,
    fleetSummary: {
      totalVehicles: vehicles.length,
      vehiclesWithMaintenanceHistory: Object.keys(vehicleMaintMap).length,
      averageMonthlyFleetSpend: completedMonthsCount > 0 ? Math.round(totalSpend / completedMonthsCount) : 0,
      totalHistoricalMaintenanceSpend: Math.round(totalSpend),
    },
    aiExplanation,
  };
}

/**
 * Generates an executive summary and actionable recommendations using Gemini with strict fallback.
 */
async function generateAiMaintenanceSummary(data: {
  nextMonthLabel: string;
  forecastBudget: number;
  forecastMin: number;
  forecastMax: number;
  confidence: string;
  historicalMonthly: MonthlyExpenditure[];
  highRiskVehicles: VehicleMaintenanceRisk[];
  totalVehicles: number;
}): Promise<{
  source: 'gemini' | 'deterministic_fallback';
  executiveSummary: string;
  costDrivers: string[];
  budgetRecommendations: string[];
  riskSummary: string;
}> {
  const geminiApiKey = env.GEMINI_API_KEY || env.AI_API_KEY;

  const fallback = {
    source: 'deterministic_fallback' as const,
    executiveSummary: `Projected maintenance budget for ${data.nextMonthLabel} is ₹${data.forecastBudget.toLocaleString('en-IN')} (range: ₹${data.forecastMin.toLocaleString('en-IN')} - ₹${data.forecastMax.toLocaleString('en-IN')}) with ${data.confidence} confidence based on ${data.historicalMonthly.length} completed operating periods.`,
    costDrivers: data.highRiskVehicles.length > 0
      ? [
          `Top expense focus: ${data.highRiskVehicles.slice(0, 2).map((v) => `${v.name} (${v.evidenceReasons[0] || 'High usage'})`).join(', ')}`,
          'Recurring maintenance items include engine servicing, brakes, and preventive multi-point inspections.',
        ]
      : ['Uniform wear-and-tear across fleet vehicles with no abnormal repair spikes.'],
    budgetRecommendations: [
      `Reserve ₹${data.forecastBudget.toLocaleString('en-IN')} in the monthly operating budget to cover preventive and scheduled services.`,
      data.highRiskVehicles.length > 0
        ? `Schedule diagnostic review for ${data.highRiskVehicles[0].name} before assignment to long-haul routes.`
        : 'Maintain standard preventive service intervals for all active vehicles.',
      'Track component-level repair logs to prevent duplicate emergency maintenance.',
    ],
    riskSummary: data.highRiskVehicles.length > 0
      ? `${data.highRiskVehicles.length} vehicle(s) flagged for maintenance review due to recent frequency or cost accumulation.`
      : 'Fleet maintenance risk is low with no vehicle currently exceeding standard thresholds.',
  };

  const apiKey = env.GEMINI_API_KEY || env.AI_API_KEY;
  if (!apiKey) {
    return fallback;
  }

  const promptPayload = {
    nextMonth: data.nextMonthLabel,
    forecastBudgetINR: data.forecastBudget,
    forecastRangeINR: [data.forecastMin, data.forecastMax],
    confidence: data.confidence,
    monthlyHistoricalINR: data.historicalMonthly.map((m) => ({ month: m.monthLabel, cost: m.actualCost, services: m.serviceCount })),
    highRiskVehicles: data.highRiskVehicles.slice(0, 3).map((v) => ({
      name: v.name,
      type: v.type,
      totalCostINR: v.totalHistoricalCost,
      recent90DaysCostINR: v.recentCost90Days,
      evidence: v.evidenceReasons,
    })),
    totalFleetVehicles: data.totalVehicles,
  };

  const systemPrompt = `
You are LogiSphere AI's Chief Fleet Maintenance Analyst.
Analyze the provided maintenance forecast data.
Rules:
1. Use ONLY the supplied data; NEVER invent or assume costs, vehicles, parts, or repairs not provided.
2. The numeric forecast (₹${data.forecastBudget}) is authoritative; do not alter numbers.
3. Distinguish actual historical observations from recommendations.
4. Output STRICT JSON conforming to the following structure:
{
  "executiveSummary": "2-3 concise sentences summarizing next month budget and trend.",
  "costDrivers": ["Short bullet 1", "Short bullet 2"],
  "budgetRecommendations": ["Actionable recommendation 1", "Actionable recommendation 2", "Actionable recommendation 3"],
  "riskSummary": "1-2 sentences explaining why vehicles are flagged or confirming low fleet risk."
}
`;

  return executeResilientAi<{
    source: 'gemini' | 'deterministic_fallback';
    executiveSummary: string;
    costDrivers: string[];
    budgetRecommendations: string[];
    riskSummary: string;
  }>({
    feature: 'MAINTENANCE_FORECAST',
    normalizedInput: {
      nextMonth: data.nextMonthLabel,
      forecastBudget: data.forecastBudget,
      forecastMin: data.forecastMin,
      forecastMax: data.forecastMax,
      confidence: data.confidence,
      highRiskCount: data.highRiskVehicles.length,
      totalVehicles: data.totalVehicles,
    },
    executeGemini: async () => {
      const response = await callGemini<any>({
        systemPrompt,
        userPrompt: `Data Payload: ${JSON.stringify(promptPayload)}`,
        responseMimeType: 'application/json',
        temperature: 0.15,
        maxOutputTokens: 350,
      });

      const parsed = response.data;
      if (
        parsed &&
        typeof parsed.executiveSummary === 'string' &&
        Array.isArray(parsed.costDrivers) &&
        Array.isArray(parsed.budgetRecommendations)
      ) {
        return {
          source: 'gemini' as const,
          executiveSummary: parsed.executiveSummary.trim(),
          costDrivers: parsed.costDrivers.map((d: any) => String(d).trim()).slice(0, 3),
          budgetRecommendations: parsed.budgetRecommendations.map((r: any) => String(r).trim()).slice(0, 3),
          riskSummary: String(parsed.riskSummary || fallback.riskSummary).trim(),
        };
      }
      throw new Error('Malformed Gemini maintenance forecast response');
    },
    validateResponse: (res) =>
      Boolean(res && res.executiveSummary && Array.isArray(res.costDrivers) && Array.isArray(res.budgetRecommendations)),
    getFallback: () => fallback,
  });
}

