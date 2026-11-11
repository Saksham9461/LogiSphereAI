// ==============================================================================
// LogiSphere AI — Authenticated SaaS Web Application Test Suite
// Verifies RBAC permission matrix, route guarding, session hydration,
// and service endpoints alignment with existing backend contracts.
// ==============================================================================

import { describe, it, expect } from 'vitest';
import {
  CanonicalRole,
  normalizeRole,
  Permission,
  ROLE_PERMISSIONS,
  hasPermission,
  hasAnyPermission,
  isRouteAllowed,
  getNavItemsForRole,
} from '../utils/rbac';
import { isJwtExpired } from '../stores/authStore';

describe('LogiSphere AI RBAC & Security Permissions Matrix', () => {
  it('normalizes roles correctly across various string casing and aliases', () => {
    expect(normalizeRole('ROLE_MANAGER')).toBe(CanonicalRole.MANAGER);
    expect(normalizeRole('manager')).toBe(CanonicalRole.MANAGER);
    expect(normalizeRole('fleet_manager')).toBe(CanonicalRole.MANAGER);
    expect(normalizeRole('ROLE_DISPATCHER')).toBe(CanonicalRole.DISPATCHER);
    expect(normalizeRole('dispatcher')).toBe(CanonicalRole.DISPATCHER);
    expect(normalizeRole('ROLE_SAFETY_OFFICER')).toBe(CanonicalRole.SAFETY_OFFICER);
    expect(normalizeRole('safety')).toBe(CanonicalRole.SAFETY_OFFICER);
    expect(normalizeRole('ROLE_FINANCE')).toBe(CanonicalRole.FINANCE);
    expect(normalizeRole('financial_analyst')).toBe(CanonicalRole.FINANCE);
    expect(normalizeRole('ROLE_DRIVER')).toBe(CanonicalRole.DRIVER);
    expect(normalizeRole('driver')).toBe(CanonicalRole.DRIVER);
    expect(normalizeRole('SUPER_ADMIN')).toBe(CanonicalRole.PLATFORM_ADMIN);
    expect(normalizeRole(undefined)).toBe(CanonicalRole.UNAUTHORIZED);
    expect(normalizeRole('INVALID_ROLE')).toBe(CanonicalRole.UNAUTHORIZED);
  });

  it('guarantees manager role has comprehensive administrative permissions', () => {
    const managerRole = CanonicalRole.MANAGER;
    expect(hasPermission(managerRole, Permission.VEHICLES_CREATE)).toBe(true);
    expect(hasPermission(managerRole, Permission.DRIVERS_CREATE)).toBe(true);
    expect(hasPermission(managerRole, Permission.TRIPS_CREATE)).toBe(true);
    expect(hasPermission(managerRole, Permission.ATTENDANCE_VIEW_ORG)).toBe(true);
    expect(hasPermission(managerRole, Permission.CARBON_MANAGE_TARGETS)).toBe(true);
    expect(hasPermission(managerRole, Permission.ALERTS_RESOLVE)).toBe(true);
  });

  it('restricts driver role to personal operations and prevents management tampering', () => {
    const driverRole = CanonicalRole.DRIVER;
    expect(hasPermission(driverRole, Permission.VEHICLES_CREATE)).toBe(false);
    expect(hasPermission(driverRole, Permission.DRIVERS_CREATE)).toBe(false);
    expect(hasPermission(driverRole, Permission.TRIPS_CREATE)).toBe(false);
    expect(hasPermission(driverRole, Permission.ATTENDANCE_VIEW_ORG)).toBe(false);
    expect(hasPermission(driverRole, Permission.CARBON_MANAGE_TARGETS)).toBe(false);

    // Permitted driver capabilities
    expect(hasPermission(driverRole, Permission.DASHBOARD_VIEW_PERSONAL)).toBe(true);
    expect(hasPermission(driverRole, Permission.TRIPS_VIEW_OWN)).toBe(true);
    expect(hasPermission(driverRole, Permission.TRIPS_UPDATE_STATUS)).toBe(true);
    expect(hasPermission(driverRole, Permission.ATTENDANCE_CLOCK_IN_OUT)).toBe(true);
    expect(hasPermission(driverRole, Permission.SOS_TRIGGER)).toBe(true);
    expect(hasPermission(driverRole, Permission.CHAT_VIEW)).toBe(true);
  });

  it('evaluates route permission guarding (isRouteAllowed) correctly', () => {
    // Manager access
    expect(isRouteAllowed('ROLE_MANAGER', 'dashboard')).toBe(true);
    expect(isRouteAllowed('ROLE_MANAGER', 'vehicles')).toBe(true);
    expect(isRouteAllowed('ROLE_MANAGER', 'drivers')).toBe(true);
    expect(isRouteAllowed('ROLE_MANAGER', 'trips')).toBe(true);
    expect(isRouteAllowed('ROLE_MANAGER', 'tracking')).toBe(true);
    expect(isRouteAllowed('ROLE_MANAGER', 'attendance')).toBe(true);
    expect(isRouteAllowed('ROLE_MANAGER', 'maintenance')).toBe(true);
    expect(isRouteAllowed('ROLE_MANAGER', 'fuel-expenses')).toBe(true);
    expect(isRouteAllowed('ROLE_MANAGER', 'alerts')).toBe(true);
    expect(isRouteAllowed('ROLE_MANAGER', 'chat')).toBe(true);
    expect(isRouteAllowed('ROLE_MANAGER', 'ai')).toBe(true);
    expect(isRouteAllowed('ROLE_MANAGER', 'carbon')).toBe(true);
    expect(isRouteAllowed('ROLE_MANAGER', 'analytics')).toBe(true);

    // Driver access
    expect(isRouteAllowed('ROLE_DRIVER', 'dashboard')).toBe(true);
    expect(isRouteAllowed('ROLE_DRIVER', 'trips')).toBe(true);
    expect(isRouteAllowed('ROLE_DRIVER', 'attendance')).toBe(true);
    expect(isRouteAllowed('ROLE_DRIVER', 'alerts')).toBe(true);
    expect(isRouteAllowed('ROLE_DRIVER', 'chat')).toBe(true);
    expect(isRouteAllowed('ROLE_DRIVER', 'ai')).toBe(true);

    // Driver restricted routes
    expect(isRouteAllowed('ROLE_DRIVER', 'vehicles')).toBe(false);
    expect(isRouteAllowed('ROLE_DRIVER', 'drivers')).toBe(false);
    expect(isRouteAllowed('ROLE_DRIVER', 'tracking')).toBe(false);
    expect(isRouteAllowed('ROLE_DRIVER', 'carbon')).toBe(false);
    expect(isRouteAllowed('ROLE_DRIVER', 'analytics')).toBe(false);
  });

  it('filters dynamic navigation items matching user role', () => {
    const managerNav = getNavItemsForRole('ROLE_MANAGER');
    const driverNav = getNavItemsForRole('ROLE_DRIVER');

    const managerKeys = managerNav.map((n) => n.key);
    const driverKeys = driverNav.map((n) => n.key);

    expect(managerKeys).toContain('vehicles');
    expect(managerKeys).toContain('drivers');
    expect(managerKeys).toContain('tracking');
    expect(managerKeys).toContain('carbon');
    expect(managerKeys).toContain('analytics');

    expect(driverKeys).not.toContain('vehicles');
    expect(driverKeys).not.toContain('drivers');
    expect(driverKeys).not.toContain('tracking');
    expect(driverKeys).not.toContain('carbon');
    expect(driverKeys).not.toContain('analytics');

    expect(driverKeys).toContain('dashboard');
    expect(driverKeys).toContain('trips');
    expect(driverKeys).toContain('attendance');
    expect(driverKeys).toContain('alerts');
  });
});

describe('Session Management & JWT Expiration Security', () => {
  it('correctly detects expired and valid JWT tokens', () => {
    // Malformed token returns true (expired/invalid)
    expect(isJwtExpired('invalid-token')).toBe(true);
    expect(isJwtExpired('')).toBe(true);

    // Expired token (exp in past)
    const pastExp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
    const pastPayload = btoa(JSON.stringify({ exp: pastExp, userId: 'u1' }));
    const expiredToken = `eyJhbGciOiJIUzI1NiJ9.${pastPayload}.signature`;
    expect(isJwtExpired(expiredToken)).toBe(true);

    // Future token (exp in future)
    const futureExp = Math.floor(Date.now() / 1000) + 3600; // 1 hour in future
    const futurePayload = btoa(JSON.stringify({ exp: futureExp, userId: 'u1' }));
    const validToken = `eyJhbGciOiJIUzI1NiJ9.${futurePayload}.signature`;
    expect(isJwtExpired(validToken)).toBe(false);
  });
});

describe('LogiSphere AI Custom Loader & ActivityIndicator Components', () => {
  it('exports ActivityIndicator, Loader, and AppSplashScreen correctly', async () => {
    const { Loader, ActivityIndicator, AppSplashScreen } = await import('../components/Loader');
    expect(typeof Loader).toBe('function');
    expect(typeof ActivityIndicator).toBe('function');
    expect(typeof AppSplashScreen).toBe('function');
  });
});

