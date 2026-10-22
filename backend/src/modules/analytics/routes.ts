import { Router, Request, Response } from 'express';
import { db } from '../../config/database';
import {
  requireOrgMembership,
  optionalAuth,
  getTrustedOrgId,
  Permission,
  CanonicalRole,
  hasPermission,
  normalizeRole,
} from '../../middleware/auth';
import { fail } from '../../utils/http';
import { calculateMaintenanceForecast } from './maintenanceForecastService';
import { calculateFuelAnomalies } from './fuelAnomalyService';

export const analyticsRouter = Router();

const isAuthorizedForAnalytics = (role?: string) => {
  const canonical = normalizeRole(role);
  return [
    CanonicalRole.MANAGER,
    CanonicalRole.DISPATCHER,
    CanonicalRole.SAFETY_OFFICER,
    CanonicalRole.FINANCE,
  ].includes(canonical);
};

const isAuthorizedForForecast = (role?: string) => {
  const canonical = normalizeRole(role);
  return [CanonicalRole.MANAGER, CanonicalRole.DISPATCHER, CanonicalRole.FINANCE].includes(canonical);
};

/**
 * GET /api/analytics
 * Returns overall fleet KPIs and top costliest vehicles.
 */
analyticsRouter.get('/', optionalAuth, async (req, res) => {
  if (req.user) {
    const currentRole = normalizeRole(req.user?.role);
    if (currentRole === CanonicalRole.DRIVER) {
      return fail(res, 403, 'Forbidden: Drivers cannot access fleet analytics');
    }
  }

  const orgId = req.user ? getTrustedOrgId(req) : null;
  const orgFilter = orgId ? { organization_id: orgId } : undefined;
  const [vehicles, trips, fuel, maint, expenses] = await Promise.all([
    db.list('vehicles', orgFilter),
    db.list('trips', orgFilter),
    db.list('fuel_logs', orgFilter),
    db.list('maintenance_records', orgFilter),
    db.list('expense_records', orgFilter),
  ]);
  const fuelCost = fuel.reduce((sum: number, f: any) => sum + Number(f.cost ?? f.fuelCost ?? 0), 0);
  const maintCost = maint.reduce((sum: number, m: any) => sum + Number(m.cost ?? 0), 0);
  const otherCost = expenses.reduce((sum: number, e: any) => sum + Number(e.toll ?? 0) + Number(e.other ?? 0) + Number(e.maint ?? 0), 0);
  const liters = fuel.reduce((sum: number, f: any) => sum + Number(f.liters ?? 0), 0);
  const distance = trips.reduce((sum: number, t: any) => sum + Number(t.plannedDistance ?? 0), 0);
  const costByVehicle = vehicles.map((v: any) => {
    const vId = v.vehicleID || v.vehicleid;
    const totalCost = [...fuel, ...maint, ...expenses]
      .filter((r: any) => (r.vehicleID || r.vehicleid) === vId)
      .reduce((s: number, r: any) => s + Number(r.cost ?? r.fuelCost ?? r.toll ?? 0) + Number(r.other ?? 0) + Number(r.maint ?? 0), 0);
    return {
      vehicleID: vId,
      name: v.name || v.registrationNumber || vId,
      cost: totalCost,
    };
  }).sort((a: any, b: any) => b.cost - a.cost);
  res.json({
    kpis: {
      fuelEfficiency: liters ? Number((distance / liters).toFixed(1)) : 0,
      fleetUtilization: vehicles.length ? Math.round((trips.filter((t: any) => t.status === 'DISPATCHED').length / vehicles.length) * 100) : 0,
      operationalCost: fuelCost + maintCost + otherCost,
      vehicleROI: 14.2,
    },
    monthlyRevenue: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'].map((month, i) => ({ month, revenue: Number((12 + i * 1.1).toFixed(1)) })),
    costliestVehicles: costByVehicle.slice(0, 5),
  });
});

/**
 * GET /api/analytics/maintenance-forecast
 * Returns next month's deterministic maintenance forecast, historical trends,
 * vehicle risk classification, and Gemini AI budget explanation.
 */
analyticsRouter.get('/maintenance-forecast', requireOrgMembership(), async (req: Request, res: Response) => {
  try {
    if (!isAuthorizedForForecast(req.user?.role)) {
      return fail(res, 403, 'Forbidden: Insufficient permissions to view maintenance forecasts');
    }

    const forecast = await calculateMaintenanceForecast();
    return res.json({
      success: true,
      data: forecast,
    });
  } catch (err: any) {
    console.error('[Analytics] Maintenance forecast error:', err?.message || err);
    return fail(res, 500, err?.message || 'Failed to generate maintenance forecast');
  }
});

/**
 * GET /api/analytics/maintenance-forecast/:vehicleId
 * Returns maintenance forecast and risk assessment for a specific vehicle.
 */
analyticsRouter.get('/maintenance-forecast/:vehicleId', requireOrgMembership(), async (req: Request, res: Response) => {
  try {
    if (!isAuthorizedForForecast(req.user?.role)) {
      return fail(res, 403, 'Forbidden: Insufficient permissions to view vehicle maintenance forecasts');
    }

    const { vehicleId } = req.params;
    const forecast = await calculateMaintenanceForecast();

    const vehicleProjection = forecast.vehicleProjections.find(
      (v) => v.vehicleID.toLowerCase() === vehicleId.toLowerCase()
    );

    if (!vehicleProjection) {
      return fail(res, 404, `Vehicle ${vehicleId} not found in maintenance projections`);
    }

    const allRecords = await db.list('maintenance_records');
    const vehicleRecords = (allRecords || []).filter(
      (r: any) => String(r.vehicleID || r.vehicleid || '').toLowerCase() === vehicleId.toLowerCase()
    );

    return res.json({
      success: true,
      data: {
        vehicle: vehicleProjection,
        fleetNextMonthForecastBudget: forecast.forecastBudget,
        currency: forecast.currency,
        maintenanceHistory: vehicleRecords,
        aiExplanation: forecast.aiExplanation,
      },
    });
  } catch (err: any) {
    console.error('[Analytics] Single vehicle maintenance forecast error:', err?.message || err);
    return fail(res, 500, err?.message || 'Failed to generate vehicle maintenance forecast');
  }
});

/**
 * GET /api/analytics/fuel-anomalies
 * Returns fleet-wide deterministic fuel anomaly report, baseline metrics,
 * and optional resilient Gemini advisory.
 */
analyticsRouter.get('/fuel-anomalies', requireOrgMembership(), async (req: Request, res: Response) => {
  try {
    if (!isAuthorizedForAnalytics(req.user?.role)) {
      return fail(res, 403, 'Forbidden: Insufficient permissions to view fuel anomaly analytics');
    }

    const report = await calculateFuelAnomalies();
    return res.json({
      success: true,
      data: report,
    });
  } catch (err: any) {
    console.error('[Analytics] Fuel anomalies error:', err?.message || err);
    return fail(res, 500, err?.message || 'Failed to generate fuel anomaly report');
  }
});

/**
 * GET /api/analytics/fuel-anomalies/:vehicleId
 * Returns vehicle-specific fuel baseline, anomaly history, and efficiency metrics.
 */
analyticsRouter.get('/fuel-anomalies/:vehicleId', requireOrgMembership(), async (req: Request, res: Response) => {
  try {
    if (!isAuthorizedForAnalytics(req.user?.role)) {
      return fail(res, 403, 'Forbidden: Insufficient permissions to view fuel anomaly analytics');
    }

    const { vehicleId } = req.params;
    const report = await calculateFuelAnomalies();

    const vehicleProfile = report.vehicles.find(
      (v) => v.vehicleID.toLowerCase() === vehicleId.toLowerCase()
    );

    if (!vehicleProfile) {
      return fail(res, 404, `Vehicle ${vehicleId} not found in fuel anomaly profiles`);
    }

    return res.json({
      success: true,
      data: {
        vehicle: vehicleProfile,
        anomalies: vehicleProfile.anomalies,
        fleetSummary: report.fleetSummary,
        aiAdvisory: report.aiAdvisory,
      },
    });
  } catch (err: any) {
    console.error('[Analytics] Vehicle fuel anomaly error:', err?.message || err);
    return fail(res, 500, err?.message || 'Failed to generate vehicle fuel anomaly profile');
  }
});

