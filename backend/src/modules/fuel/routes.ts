import { Router } from 'express';
import { db } from '../../config/database';
import {
  requireOrgMembership,
  requireOrgPermission,
  optionalAuth,
  getTrustedOrgId,
  Permission,
  CanonicalRole,
  hasPermission,
  normalizeRole,
} from '../../middleware/auth';
import { fail } from '../../utils/http';

export const fuelRouter = Router();

const decorate = (r: any, vehMap?: Map<string, any>) => {
  if (!r) return null;
  const vId = r.vehicleID || r.vehicleid;
  const fId = r.fuelLogId || r.fuellogid || r.id;
  const vehicleObj = vId && vehMap ? vehMap.get(String(vId).toLowerCase()) : null;

  return {
    ...r,
    id: fId,
    fuelLogId: fId,
    vehicleID: vId,
    date: r.date,
    liters: Number(r.liters) || 0,
    cost: Number(r.cost ?? r.fuelCost) || 0,
    vehicle: vehicleObj?.name || vId || 'Vehicle',
  };
};

fuelRouter.get('/', optionalAuth, async (req, res) => {
  const orgId = req.user ? getTrustedOrgId(req) : null;
  const [allVehicles, rawRecords] = await Promise.all([
    db.list('vehicles', orgId ? { organization_id: orgId } : undefined),
    db.list('fuel_logs', orgId ? { organization_id: orgId } : undefined),
  ]);

  const vehMap = new Map<string, any>();
  for (const v of allVehicles || []) {
    if (v.vehicleID) vehMap.set(String(v.vehicleID).toLowerCase(), v);
    if (v.vehicleid) vehMap.set(String(v.vehicleid).toLowerCase(), v);
    if (v.id) vehMap.set(String(v.id).toLowerCase(), v);
  }

  if (req.user) {
    const currentRole = normalizeRole(req.user?.role);
    const currentUserId = req.user?.id || req.user?.userId;

    if (currentRole === CanonicalRole.DISPATCHER || currentRole === CanonicalRole.SAFETY_OFFICER) {
      return fail(res, 403, 'Forbidden: Insufficient permissions to view fuel financial logs');
    }

    let records = rawRecords || [];

    if (currentRole === CanonicalRole.DRIVER) {
      const allTrips = await db.list('trips', orgId ? { organization_id: orgId } : undefined);
      const driverVehIds = new Set<string>();
      for (const t of allTrips || []) {
        const tDriver = String(t.driverID || t.driverid || t.driver?.id || '').toLowerCase();
        if (tDriver === String(currentUserId).toLowerCase()) {
          const vId = t.vehicleID || t.vehicleid || t.vehicle?.id;
          if (vId) driverVehIds.add(String(vId).toLowerCase());
        }
      }
      records = records.filter((r: any) => {
        const vId = String(r.vehicleID || r.vehicleid || '').toLowerCase();
        return driverVehIds.has(vId);
      });
    }

    const decorated = records.map((r: any) => decorate(r, vehMap));
    return res.json(decorated.filter(Boolean));
  }

  const decorated = (rawRecords || []).map((r: any) => decorate(r, vehMap));
  res.json(decorated.filter(Boolean));
});

fuelRouter.post('/create', optionalAuth, async (req, res) => {
  if (req.user) {
    const callerRole = normalizeRole(req.user.role);
    if (!hasPermission(callerRole, Permission.FUEL_CREATE) && callerRole !== CanonicalRole.MANAGER && !req.user.isPlatformAdmin) {
      return fail(res, 403, 'Forbidden: insufficient role permissions to create fuel log');
    }
  }
  const orgId = req.user ? getTrustedOrgId(req) : null;
  const created = await db.insert('fuel_logs', {
    fuelLogId: db.makeId('fuel-'),
    organization_id: orgId,
    ...req.body,
    cost: req.body.cost ?? req.body.fuelCost,
  });
  const decorated = await decorate(created);
  res.status(201).json(decorated);
});

// GET /api/fuel/report/export-pdf - Export fuel and expenses report as PDF
fuelRouter.get('/report/export-pdf', optionalAuth, async (req, res) => {
  try {
    let token = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : req.query.token;

    let user = req.user;
    if (!user && typeof token === 'string' && token.trim()) {
      try {
        const decoded = (await import('jsonwebtoken')).default.verify(token.trim(), (await import('../../config/env')).env.JWT_SECRET) as any;
        if (decoded && (decoded.userId || decoded.id)) {
          user = {
            ...decoded,
            userId: decoded.userId || decoded.id,
            id: decoded.userId || decoded.id,
            role: decoded.role || 'USER',
          };
        }
      } catch (_) {}
    }

    if (!user) {
      return fail(res, 401, 'Authentication required');
    }

    const currentRole = normalizeRole(user.role);
    if (!hasPermission(currentRole, Permission.FUEL_EXPORT) && currentRole !== CanonicalRole.MANAGER && !user.isPlatformAdmin) {
      return fail(res, 403, 'Forbidden: Insufficient permissions to export fuel and expense reports');
    }

    const orgId = user ? getTrustedOrgId({ ...req, user } as any) : null;
    const [allVehicles, rawFuel, rawExpenses] = await Promise.all([
      db.list('vehicles', orgId ? { organization_id: orgId } : undefined),
      db.list('fuel_logs', orgId ? { organization_id: orgId } : undefined),
      db.list('expense_records', orgId ? { organization_id: orgId } : undefined),
    ]);

    const vehMap = new Map<string, any>();
    for (const v of allVehicles || []) {
      if (v.vehicleID) vehMap.set(String(v.vehicleID).toLowerCase(), v);
      if (v.vehicleid) vehMap.set(String(v.vehicleid).toLowerCase(), v);
      if (v.id) vehMap.set(String(v.id).toLowerCase(), v);
    }

    const { generateFuelExpensePdf } = await import('./pdfGenerator');
    type FuelItem = import('./pdfGenerator').FuelLogReportItem;
    type ExpenseItem = import('./pdfGenerator').ExpenseReportItem;

    let fuelList: FuelItem[] = (rawFuel || []).map((r: any) => {
      const vId = r.vehicleID || r.vehicleid;
      const vObj = vId ? vehMap.get(String(vId).toLowerCase()) : null;
      return {
        id: r.id || r.fuelLogId || r.fuellogid,
        fuelLogId: r.fuelLogId || r.fuellogid || r.id,
        vehicleID: vId,
        vehicleName: vObj?.name || vObj?.registrationnumber || vObj?.registrationNumber || vId || 'Vehicle',
        date: r.date ? String(r.date).slice(0, 10) : '',
        liters: Number(r.liters) || 0,
        cost: Number(r.cost ?? r.fuelCost) || 0,
      };
    });

    let expenseList: ExpenseItem[] = (rawExpenses || []).map((r: any) => {
      const vId = r.vehicleID || r.vehicleid;
      const vObj = vId ? vehMap.get(String(vId).toLowerCase()) : null;
      const toll = Number(r.toll) || 0;
      const other = Number(r.other) || 0;
      const maint = Number(r.maint) || 0;
      return {
        id: r.id || r.expenseId || r.expenseid,
        expenseId: r.expenseId || r.expenseid || r.id,
        vehicleID: vId,
        vehicleName: vObj?.name || vObj?.registrationnumber || vObj?.registrationNumber || vId || 'Vehicle',
        tripID: r.tripID || r.tripid,
        toll,
        other,
        maint,
        total: toll + other + maint,
        date: r.date || r.created_at || r.createdAt,
      };
    });

    // Drivers view only their vehicles/trips
    if (currentRole === CanonicalRole.DRIVER) {
      const allTrips = await db.list('trips', orgId ? { organization_id: orgId } : undefined);
      const driverVehIds = new Set<string>();
      const driverTripIds = new Set<string>();
      const currentUserId = user.id || user.userId;
      for (const t of allTrips || []) {
        const tDriver = String(t.driverID || t.driverid || t.driver?.id || '').toLowerCase();
        if (tDriver === String(currentUserId).toLowerCase()) {
          const vId = t.vehicleID || t.vehicleid || t.vehicle?.id;
          if (vId) driverVehIds.add(String(vId).toLowerCase());
          const trId = t.tripID || t.tripid || t.id;
          if (trId) driverTripIds.add(String(trId).toLowerCase());
        }
      }
      fuelList = fuelList.filter((f: FuelItem) => driverVehIds.has(String(f.vehicleID).toLowerCase()));
      expenseList = expenseList.filter((e: ExpenseItem) => driverTripIds.has(String(e.tripID).toLowerCase()));
    }

    // Apply search filter if supplied
    const { search, startDate, endDate } = req.query;
    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim().toLowerCase();
      fuelList = fuelList.filter(
        (f: FuelItem) =>
          String(f.vehicleName).toLowerCase().includes(q) ||
          String(f.vehicleID).toLowerCase().includes(q)
      );
      expenseList = expenseList.filter(
        (e: ExpenseItem) =>
          String(e.vehicleName).toLowerCase().includes(q) ||
          String(e.vehicleID).toLowerCase().includes(q) ||
          String(e.tripID || '').toLowerCase().includes(q)
      );
    }

    if (startDate || endDate) {
      if (startDate) {
        fuelList = fuelList.filter((f: FuelItem) => f.date >= String(startDate));
      }
      if (endDate) {
        fuelList = fuelList.filter((f: FuelItem) => f.date <= String(endDate));
      }
    }

    let dateRangeText = '';
    if (startDate && endDate) {
      dateRangeText = `${startDate} to ${endDate}`;
    } else if (startDate) {
      dateRangeText = `From ${startDate}`;
    } else if (endDate) {
      dateRangeText = `Until ${endDate}`;
    }

    const doc = generateFuelExpensePdf(fuelList, expenseList, {
      title: currentRole === CanonicalRole.DRIVER ? 'MY FUEL & EXPENSES AUDIT REPORT' : 'FLEET FUEL & EXPENSES AUDIT REPORT',
      generatedBy: user.email || user.userId,
      userRole: currentRole === CanonicalRole.MANAGER ? 'Fleet Management' : user.role,
      searchQuery: typeof search === 'string' ? search : undefined,
      dateRangeText,
    });

    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const filename = `Fuel_Expenses_Report_${year}-${month}-${day}_${Date.now()}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);
    doc.end();
  } catch (error: any) {
    console.error('[Fuel & Expense Export PDF Error]:', error);
    return fail(res, 500, error.message || 'Failed to export fuel & expenses report as PDF');
  }
});

