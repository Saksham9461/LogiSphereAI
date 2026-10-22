import { describe, expect, it } from 'vitest';
import {
  CanonicalRole,
  Permission,
  ROLE_PERMISSIONS,
  normalizeRole,
  hasPermission,
  hasAnyPermission,
} from '../src/config/permissions';

// Symmetrical Route Permissions Mapping identical to mobile App
const ROUTE_PERMISSIONS: Record<string, Permission | Permission[]> = {
  Dashboard: [Permission.DASHBOARD_VIEW_FLEET, Permission.DASHBOARD_VIEW_PERSONAL],
  TripDispatcher: [Permission.TRIPS_VIEW, Permission.TRIPS_VIEW_OWN],
  VehicleRegistry: Permission.VEHICLES_VIEW,
  Drivers: Permission.DRIVERS_VIEW,
  LiveTracking: Permission.TRACKING_VIEW_FLEET,
  Maintenance: [Permission.MAINTENANCE_VIEW, Permission.MAINTENANCE_INSPECT],
  FuelExpense: [Permission.FUEL_VIEW, Permission.EXPENSES_VIEW],
  Analytics: [
    Permission.ANALYTICS_VIEW_OPERATIONS,
    Permission.ANALYTICS_VIEW_FINANCE,
    Permission.ANALYTICS_VIEW_SAFETY,
  ],
  CarbonIntelligence: Permission.CARBON_VIEW,
  Alerts: [Permission.ALERTS_VIEW, Permission.ALERTS_VIEW_OWN],
  AttendanceReport: [
    Permission.ATTENDANCE_VIEW,
    Permission.ATTENDANCE_VIEW_ORG,
    Permission.ATTENDANCE_VIEW_LIMITED,
    Permission.ATTENDANCE_VIEW_OWN,
  ],
  Register: [Permission.USERS_MANAGE, Permission.DRIVERS_CREATE],
  Chat: Permission.CHAT_VIEW,
  AIAssistant: Permission.AI_ASSISTANT_QUERY,
};

function isRouteAllowed(role: string | CanonicalRole | undefined, routeName: string): boolean {
  const req = ROUTE_PERMISSIONS[routeName];
  if (!req) return true;
  if (Array.isArray(req)) {
    return hasAnyPermission(role, req);
  }
  return hasPermission(role, req);
}

const ALL_ROUTES = Object.keys(ROUTE_PERMISSIONS);

describe('Mobile App Role-Based UI Visibility Matrix Tests', () => {
  it('1. Driver sees personal routes, personal Attendance History, personal Alerts & SOS, and hides fleet routes', () => {
    const role = CanonicalRole.DRIVER;
    const allowed = ALL_ROUTES.filter(r => isRouteAllowed(role, r));
    const denied = ALL_ROUTES.filter(r => !isRouteAllowed(role, r));

    // Must be allowed (6 screens)
    expect(allowed).toContain('Dashboard');
    expect(allowed).toContain('TripDispatcher');
    expect(allowed).toContain('AttendanceReport');
    expect(allowed).toContain('Chat');
    expect(allowed).toContain('Alerts');
    expect(allowed).toContain('AIAssistant');
    expect(allowed).toHaveLength(6);

    // Must be hidden (8 screens)
    expect(denied).toContain('Register');
    expect(denied).toContain('Drivers');
    expect(denied).toContain('Analytics');
    expect(denied).toContain('FuelExpense');
    expect(denied).toContain('CarbonIntelligence');
    expect(denied).toContain('Maintenance');
    expect(denied).toContain('LiveTracking');
    expect(denied).toContain('VehicleRegistry');
  });

  it('2. Dispatcher sees operational & tracking routes, operational attendance, operational alerts, and hides register / unrestricted finance / maintenance', () => {
    const role = CanonicalRole.DISPATCHER;
    const allowed = ALL_ROUTES.filter(r => isRouteAllowed(role, r));
    const denied = ALL_ROUTES.filter(r => !isRouteAllowed(role, r));

    // Must be allowed (11 screens)
    expect(allowed).toContain('Dashboard');
    expect(allowed).toContain('TripDispatcher');
    expect(allowed).toContain('LiveTracking');
    expect(allowed).toContain('VehicleRegistry');
    expect(allowed).toContain('Drivers');
    expect(allowed).toContain('Alerts');
    expect(allowed).toContain('AttendanceReport');
    expect(allowed).toContain('Analytics');
    expect(allowed).toContain('CarbonIntelligence');
    expect(allowed).toContain('Chat');
    expect(allowed).toContain('AIAssistant');
    expect(allowed).toHaveLength(11);

    // Must be hidden (3 screens)
    expect(denied).toContain('Register');
    expect(denied).toContain('FuelExpense');
    expect(denied).toContain('Maintenance');
  });

  it('3. Safety Officer sees safety, inspection, alerts, attendance audits and compliance reports, and hides register / finance', () => {
    const role = CanonicalRole.SAFETY_OFFICER;
    const allowed = ALL_ROUTES.filter(r => isRouteAllowed(role, r));
    const denied = ALL_ROUTES.filter(r => !isRouteAllowed(role, r));

    // Must be allowed (12 screens)
    expect(allowed).toContain('Dashboard');
    expect(allowed).toContain('VehicleRegistry');
    expect(allowed).toContain('Drivers');
    expect(allowed).toContain('TripDispatcher');
    expect(allowed).toContain('LiveTracking');
    expect(allowed).toContain('Maintenance');
    expect(allowed).toContain('Alerts');
    expect(allowed).toContain('AttendanceReport');
    expect(allowed).toContain('Analytics');
    expect(allowed).toContain('CarbonIntelligence');
    expect(allowed).toContain('Chat');
    expect(allowed).toContain('AIAssistant');
    expect(allowed).toHaveLength(12);

    // Must be hidden (2 screens)
    expect(denied).toContain('Register');
    expect(denied).toContain('FuelExpense');
  });

  it('4. Finance sees fuel, expenses, analytics, maintenance costs, limited attendance, read-only alerts and hides live tracking / register', () => {
    const role = CanonicalRole.FINANCE;
    const allowed = ALL_ROUTES.filter(r => isRouteAllowed(role, r));
    const denied = ALL_ROUTES.filter(r => !isRouteAllowed(role, r));

    // Must be allowed (12 screens)
    expect(allowed).toContain('Dashboard');
    expect(allowed).toContain('FuelExpense');
    expect(allowed).toContain('Analytics');
    expect(allowed).toContain('Maintenance');
    expect(allowed).toContain('VehicleRegistry');
    expect(allowed).toContain('Drivers');
    expect(allowed).toContain('TripDispatcher');
    expect(allowed).toContain('CarbonIntelligence');
    expect(allowed).toContain('Alerts');
    expect(allowed).toContain('AttendanceReport');
    expect(allowed).toContain('Chat');
    expect(allowed).toContain('AIAssistant');
    expect(allowed).toHaveLength(12);

    // Must be hidden (2 screens)
    expect(denied).toContain('LiveTracking');
    expect(denied).toContain('Register');
  });

  it('5. Manager has complete organization purview across all 14 screens', () => {
    const role = CanonicalRole.MANAGER;
    const allowed = ALL_ROUTES.filter(r => isRouteAllowed(role, r));
    expect(allowed).toHaveLength(ALL_ROUTES.length);
    for (const r of ALL_ROUTES) {
      expect(allowed).toContain(r);
    }
  });

  it('6. Unknown or invalid roles strictly fail closed with zero allowed routes', () => {
    expect(normalizeRole(null)).toBe(CanonicalRole.UNAUTHORIZED);
    expect(normalizeRole(undefined)).toBe(CanonicalRole.UNAUTHORIZED);
    expect(normalizeRole('')).toBe(CanonicalRole.UNAUTHORIZED);
    expect(normalizeRole('INVALID_ROLE')).toBe(CanonicalRole.UNAUTHORIZED);
    expect(normalizeRole('hacker')).toBe(CanonicalRole.UNAUTHORIZED);

    const allowed = ALL_ROUTES.filter(r => isRouteAllowed(CanonicalRole.UNAUTHORIZED, r));
    expect(allowed).toHaveLength(0);
  });

  it('7. Action-level authorization is cleanly separated from screen visibility', () => {
    // Attendance Actions
    expect(hasPermission(CanonicalRole.DRIVER, Permission.ATTENDANCE_CLOCK_IN_OUT)).toBe(true);
    expect(hasPermission(CanonicalRole.DRIVER, Permission.ATTENDANCE_VIEW_ORG)).toBe(false);
    expect(hasPermission(CanonicalRole.DRIVER, Permission.ATTENDANCE_EXPORT)).toBe(false);

    expect(hasPermission(CanonicalRole.DISPATCHER, Permission.ATTENDANCE_VIEW_LIMITED)).toBe(true);
    expect(hasPermission(CanonicalRole.DISPATCHER, Permission.ATTENDANCE_EXPORT)).toBe(false);

    expect(hasPermission(CanonicalRole.SAFETY_OFFICER, Permission.ATTENDANCE_VIEW_ORG)).toBe(true);
    expect(hasPermission(CanonicalRole.SAFETY_OFFICER, Permission.ATTENDANCE_EXPORT)).toBe(true);

    expect(hasPermission(CanonicalRole.FINANCE, Permission.ATTENDANCE_EXPORT)).toBe(false);

    expect(hasPermission(CanonicalRole.MANAGER, Permission.ATTENDANCE_VIEW_ORG)).toBe(true);
    expect(hasPermission(CanonicalRole.MANAGER, Permission.ATTENDANCE_EXPORT)).toBe(true);
    expect(hasPermission(CanonicalRole.MANAGER, Permission.ATTENDANCE_MANAGE)).toBe(true);

    // Alert Actions
    expect(hasPermission(CanonicalRole.DRIVER, Permission.SOS_TRIGGER)).toBe(true);
    expect(hasPermission(CanonicalRole.DRIVER, Permission.ALERTS_VIEW_OWN)).toBe(true);
    expect(hasPermission(CanonicalRole.DRIVER, Permission.ALERTS_ACKNOWLEDGE)).toBe(false);
    expect(hasPermission(CanonicalRole.DRIVER, Permission.ALERTS_RESOLVE)).toBe(false);

    expect(hasPermission(CanonicalRole.DISPATCHER, Permission.ALERTS_ACKNOWLEDGE)).toBe(true);
    expect(hasPermission(CanonicalRole.DISPATCHER, Permission.ALERTS_RESOLVE)).toBe(false);

    expect(hasPermission(CanonicalRole.SAFETY_OFFICER, Permission.ALERTS_ACKNOWLEDGE)).toBe(true);
    expect(hasPermission(CanonicalRole.SAFETY_OFFICER, Permission.ALERTS_RESOLVE)).toBe(true);

    expect(hasPermission(CanonicalRole.FINANCE, Permission.ALERTS_VIEW)).toBe(true);
    expect(hasPermission(CanonicalRole.FINANCE, Permission.ALERTS_ACKNOWLEDGE)).toBe(false);
    expect(hasPermission(CanonicalRole.FINANCE, Permission.ALERTS_RESOLVE)).toBe(false);

    expect(hasPermission(CanonicalRole.MANAGER, Permission.ALERTS_RESOLVE)).toBe(true);
  });
});
