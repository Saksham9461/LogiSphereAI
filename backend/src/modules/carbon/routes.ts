import { Router, Request, Response } from 'express';
import { optionalAuth, authenticate, authorize, getTrustedOrgId } from '../../middleware/auth';
import { fail } from '../../utils/http';
import { carbonService } from './carbonService';

export const carbonRouter = Router();

/**
 * Helper to check if user has manager, dispatcher, or admin role.
 */
function isAuthorizedManager(role?: string): boolean {
  if (!role) return false;
  const r = role.toUpperCase().trim();
  return (
    r === 'ROLE_MANAGER' ||
    r === 'ROLE_DISPATCHER' ||
    r === 'ROLE_ADMIN' ||
    r === 'MANAGER' ||
    r === 'FLEET_MANAGER' ||
    r === 'DISPATCHER' ||
    r === 'ADMIN'
  );
}

/**
 * GET /api/carbon/overview (or GET /api/carbon)
 * Complete Carbon Intelligence overview including KPIs, breakdowns,
 * target progress, anomalies, and AI Carbon Advisor insights.
 */
carbonRouter.get(['/', '/overview'], optionalAuth, async (req: Request, res: Response) => {
  try {
    const orgId = getTrustedOrgId(req);
    const { startDate, endDate, vehicleId, driverId } = req.query;

    // RBAC: If a driver is logged in without manager role, scope queries strictly to their own driver ID
    let scopedDriverId = typeof driverId === 'string' ? driverId : undefined;
    if (req.user && !isAuthorizedManager(req.user.role)) {
      scopedDriverId = req.user.userId || req.user.id;
    }

    const overview = await carbonService.getCarbonOverview({
      orgId,
      startDate: typeof startDate === 'string' ? startDate : undefined,
      endDate: typeof endDate === 'string' ? endDate : undefined,
      vehicleId: typeof vehicleId === 'string' ? vehicleId : undefined,
      driverId: scopedDriverId,
    });

    return res.json({
      success: true,
      data: overview,
    });
  } catch (err: any) {
    console.error('[CarbonRouter] Overview error:', err?.message || err);
    return fail(res, 500, err?.message || 'Failed to generate carbon intelligence overview');
  }
});

/**
 * GET /api/carbon/vehicles
 * Vehicle carbon emissions ranking and efficiency profiles.
 */
carbonRouter.get('/vehicles', optionalAuth, async (req: Request, res: Response) => {
  try {
    const orgId = getTrustedOrgId(req);
    const { startDate, endDate } = req.query;

    const overview = await carbonService.getCarbonOverview({
      orgId,
      startDate: typeof startDate === 'string' ? startDate : undefined,
      endDate: typeof endDate === 'string' ? endDate : undefined,
    });

    return res.json({
      success: true,
      data: overview.breakdowns.topEmittingVehicles,
      summary: {
        totalVehicles: overview.breakdowns.topEmittingVehicles.length,
        fleetAverageEmissionsPerKm: overview.kpis.emissionsPerKm,
      },
    });
  } catch (err: any) {
    console.error('[CarbonRouter] Vehicles error:', err?.message || err);
    return fail(res, 500, err?.message || 'Failed to fetch vehicle carbon data');
  }
});

/**
 * GET /api/carbon/trips
 * Detailed trip emissions records with actual vs estimated classification.
 */
carbonRouter.get('/trips', optionalAuth, async (req: Request, res: Response) => {
  try {
    const orgId = getTrustedOrgId(req);
    const { startDate, endDate, vehicleId, driverId } = req.query;

    let scopedDriverId = typeof driverId === 'string' ? driverId : undefined;
    if (req.user && !isAuthorizedManager(req.user.role)) {
      scopedDriverId = req.user.userId || req.user.id;
    }

    const overview = await carbonService.getCarbonOverview({
      orgId,
      startDate: typeof startDate === 'string' ? startDate : undefined,
      endDate: typeof endDate === 'string' ? endDate : undefined,
      vehicleId: typeof vehicleId === 'string' ? vehicleId : undefined,
      driverId: scopedDriverId,
    });

    return res.json({
      success: true,
      data: overview.breakdowns.topEmittingTrips,
      totalCount: overview.breakdowns.topEmittingTrips.length,
    });
  } catch (err: any) {
    console.error('[CarbonRouter] Trips error:', err?.message || err);
    return fail(res, 500, err?.message || 'Failed to fetch trip emissions');
  }
});

/**
 * GET /api/carbon/advisor
 * AI Carbon Advisor recommendations with resilient deterministic fallback.
 */
carbonRouter.get('/advisor', optionalAuth, async (req: Request, res: Response) => {
  try {
    const orgId = getTrustedOrgId(req);
    const overview = await carbonService.getCarbonOverview({ orgId });

    return res.json({
      success: true,
      data: overview.advisorAdvisory,
    });
  } catch (err: any) {
    console.error('[CarbonRouter] Advisor error:', err?.message || err);
    return fail(res, 500, err?.message || 'Failed to generate carbon advisor recommendations');
  }
});

/**
 * GET /api/carbon/anomalies
 * Statistical and behavioral carbon anomalies detected across fleet.
 */
carbonRouter.get('/anomalies', optionalAuth, async (req: Request, res: Response) => {
  try {
    const orgId = getTrustedOrgId(req);
    const overview = await carbonService.getCarbonOverview({ orgId });

    return res.json({
      success: true,
      data: overview.anomaliesSummary.recentAnomalies,
      totalCount: overview.anomaliesSummary.totalAnomalies,
    });
  } catch (err: any) {
    console.error('[CarbonRouter] Anomalies error:', err?.message || err);
    return fail(res, 500, err?.message || 'Failed to fetch carbon anomalies');
  }
});

/**
 * GET /api/carbon/targets
 * Current organization sustainability target and budget progress.
 */
carbonRouter.get('/targets', optionalAuth, async (req: Request, res: Response) => {
  try {
    const orgId = getTrustedOrgId(req);
    const overview = await carbonService.getCarbonOverview({ orgId });

    return res.json({
      success: true,
      data: overview.targetStatus,
    });
  } catch (err: any) {
    console.error('[CarbonRouter] Targets GET error:', err?.message || err);
    return fail(res, 500, err?.message || 'Failed to fetch sustainability target');
  }
});

/**
 * POST /api/carbon/targets (or PUT)
 * Define or update monthly sustainability targets (Managers and Dispatchers only).
 */
const handleSetTarget = async (req: Request, res: Response) => {
  try {
    if (req.user && !isAuthorizedManager(req.user.role)) {
      return fail(res, 403, 'Forbidden: Only managers and dispatchers are authorized to configure sustainability targets');
    }

    const orgId = getTrustedOrgId(req);
    const { targetCo2Kg, period, alertThresholdPercent, notes } = req.body || {};

    if (!targetCo2Kg || isNaN(Number(targetCo2Kg)) || Number(targetCo2Kg) <= 0) {
      return fail(res, 400, 'targetCo2Kg must be a positive number');
    }

    const now = new Date();
    const resolvedPeriod = period || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const savedTarget = await carbonService.setSustainabilityTarget({
      orgId,
      period: resolvedPeriod,
      targetCo2Kg: Number(targetCo2Kg),
      alertThresholdPercent: alertThresholdPercent ? Number(alertThresholdPercent) : 80,
      notes: notes || '',
      userId: req.user?.userId || req.user?.id,
    });

    return res.status(200).json({
      success: true,
      message: 'Sustainability target successfully updated',
      data: savedTarget,
    });
  } catch (err: any) {
    console.error('[CarbonRouter] Targets POST error:', err?.message || err);
    return fail(res, 500, err?.message || 'Failed to configure sustainability target');
  }
};

carbonRouter.post('/targets', authenticate, handleSetTarget);
carbonRouter.put('/targets', authenticate, handleSetTarget);

/**
 * POST /api/carbon/eco-route-compare
 * Multi-route comparison evaluating distance, fuel burn, emissions, and trade-offs.
 */
carbonRouter.post('/eco-route-compare', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { tripID, vehicleID, vehicleType, candidateRoutes } = req.body || {};

    if (!Array.isArray(candidateRoutes) || candidateRoutes.length === 0) {
      return fail(res, 400, 'candidateRoutes must be a non-empty array of routes');
    }

    const comparison = await carbonService.compareEcoRoutes({
      tripID,
      vehicleID,
      vehicleType,
      candidateRoutes,
    });

    return res.json({
      success: true,
      data: comparison,
    });
  } catch (err: any) {
    console.error('[CarbonRouter] Eco-route compare error:', err?.message || err);
    return fail(res, 500, err?.message || 'Failed to compare eco-routes');
  }
});

/**
 * GET /api/carbon/report
 * Formal executive Sustainability & Carbon Intelligence Report.
 */
carbonRouter.get('/report', optionalAuth, async (req: Request, res: Response) => {
  try {
    const orgId = getTrustedOrgId(req);
    const { startDate, endDate } = req.query;

    const report = await carbonService.generateSustainabilityReport({
      orgId,
      startDate: typeof startDate === 'string' ? startDate : undefined,
      endDate: typeof endDate === 'string' ? endDate : undefined,
    });

    return res.json({
      success: true,
      data: report,
    });
  } catch (err: any) {
    console.error('[CarbonRouter] Report error:', err?.message || err);
    return fail(res, 500, err?.message || 'Failed to generate sustainability report');
  }
});
