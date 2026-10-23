/**
 * LogiSphere AI — Strongly-Typed Role-Based Access Control (RBAC) Registry
 * 
 * Implements the single source of truth for authorization according to the
 * Authoritative Role and Feature Access Matrix.
 */

export enum CanonicalRole {
  MANAGER = 'ROLE_MANAGER',
  DISPATCHER = 'ROLE_DISPATCHER',
  SAFETY_OFFICER = 'ROLE_SAFETY_OFFICER',
  FINANCE = 'ROLE_FINANCE',
  DRIVER = 'ROLE_DRIVER',
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',
  UNAUTHORIZED = 'UNAUTHORIZED',
}

/**
 * Normalizes any legacy or variant role strings into canonical enum values.
 * Unknown or invalid roles strictly fail closed to CanonicalRole.UNAUTHORIZED.
 */
export function normalizeRole(rawRole?: string | null): CanonicalRole {
  if (!rawRole) return CanonicalRole.UNAUTHORIZED;
  const upper = rawRole.toUpperCase().trim();

  if (
    upper === 'ROLE_MANAGER' ||
    upper === 'MANAGER' ||
    upper === 'FLEET_MANAGER' ||
    upper === 'ADMIN' ||
    upper === 'ROLE_ADMIN'
  ) {
    return CanonicalRole.MANAGER;
  }

  if (upper === 'ROLE_DISPATCHER' || upper === 'DISPATCHER') {
    return CanonicalRole.DISPATCHER;
  }

  if (
    upper === 'ROLE_SAFETY_OFFICER' ||
    upper === 'SAFETY_OFFICER' ||
    upper === 'SAFETY' ||
    upper === 'ROLE_SAFETY'
  ) {
    return CanonicalRole.SAFETY_OFFICER;
  }

  if (
    upper === 'ROLE_FINANCE' ||
    upper === 'FINANCE' ||
    upper === 'FINANCIAL_ANALYST' ||
    upper === 'ROLE_FINANCIAL_ANALYST' ||
    upper === 'ACCOUNTANT'
  ) {
    return CanonicalRole.FINANCE;
  }

  if (upper === 'ROLE_DRIVER' || upper === 'DRIVER') {
    return CanonicalRole.DRIVER;
  }

  if (
    upper === 'PLATFORM_ADMIN' ||
    upper === 'SUPER_ADMIN' ||
    upper === 'ROLE_SUPER_ADMIN'
  ) {
    return CanonicalRole.PLATFORM_ADMIN;
  }

  return CanonicalRole.UNAUTHORIZED;
}

export enum Permission {
  // Dashboard
  DASHBOARD_VIEW_FLEET = 'dashboard.view.fleet',
  DASHBOARD_VIEW_PERSONAL = 'dashboard.view.personal',

  // Drivers
  DRIVERS_VIEW = 'drivers.view',
  DRIVERS_CREATE = 'drivers.create',
  DRIVERS_UPDATE = 'drivers.update',
  DRIVERS_DEACTIVATE = 'drivers.deactivate',
  DRIVERS_VIEW_OWN = 'drivers.view.own',
  DRIVERS_UPDATE_OWN = 'drivers.update.own',

  // Vehicles
  VEHICLES_VIEW = 'vehicles.view',
  VEHICLES_CREATE = 'vehicles.create',
  VEHICLES_UPDATE = 'vehicles.update',
  VEHICLES_DEACTIVATE = 'vehicles.deactivate',
  VEHICLES_VIEW_ASSIGNED = 'vehicles.view.assigned',

  // Trips
  TRIPS_VIEW = 'trips.view',
  TRIPS_CREATE = 'trips.create',
  TRIPS_ASSIGN = 'trips.assign',
  TRIPS_DISPATCH = 'trips.dispatch',
  TRIPS_UPDATE_STATUS = 'trips.update_status',
  TRIPS_CANCEL = 'trips.cancel',
  TRIPS_VIEW_OWN = 'trips.view.own',

  // Attendance
  ATTENDANCE_VIEW = 'attendance.view',
  ATTENDANCE_VIEW_ORG = 'attendance.view.org',
  ATTENDANCE_VIEW_LIMITED = 'attendance.view.limited',
  ATTENDANCE_VIEW_OWN = 'attendance.view.own',
  ATTENDANCE_MANAGE = 'attendance.manage',
  ATTENDANCE_EXPORT = 'attendance.export',
  ATTENDANCE_CLOCK_IN_OUT = 'attendance.clock_in_out',

  // Live Tracking
  TRACKING_VIEW_FLEET = 'tracking.view.fleet',
  TRACKING_VIEW_ASSIGNED = 'tracking.view.assigned',
  TRACKING_SUBMIT_LOCATION = 'tracking.submit_location',

  // Maintenance
  MAINTENANCE_VIEW = 'maintenance.view',
  MAINTENANCE_VIEW_STATUS = 'maintenance.view.status',
  MAINTENANCE_CREATE = 'maintenance.create',
  MAINTENANCE_UPDATE = 'maintenance.update',
  MAINTENANCE_INSPECT = 'maintenance.inspect',

  // Fuel & Expenses
  FUEL_VIEW = 'fuel.view',
  FUEL_VIEW_LIMITED = 'fuel.view.limited',
  FUEL_CREATE = 'fuel.create',
  FUEL_UPDATE = 'fuel.update',
  FUEL_EXPORT = 'fuel.export',
  EXPENSES_VIEW = 'expenses.view',
  EXPENSES_CREATE = 'expenses.create',
  EXPENSES_UPDATE = 'expenses.update',
  EXPENSES_EXPORT = 'expenses.export',

  // Analytics & AI
  ANALYTICS_VIEW_OPERATIONS = 'analytics.view.operations',
  ANALYTICS_VIEW_FINANCE = 'analytics.view.finance',
  ANALYTICS_VIEW_SAFETY = 'analytics.view.safety',
  ANALYTICS_VIEW_FUEL_ANOMALIES = 'analytics.view.fuel_anomalies',
  ANALYTICS_VIEW_MAINTENANCE_FORECAST = 'analytics.view.maintenance_forecast',
  AI_ASSISTANT_QUERY = 'ai.assistant.query',

  // Carbon Intelligence
  CARBON_VIEW = 'carbon.view',
  CARBON_MANAGE_TARGETS = 'carbon.manage_targets',

  // Chat
  CHAT_VIEW = 'chat.view',
  CHAT_SEND = 'chat.send',

  // SOS & Alerts
  ALERTS_VIEW = 'alerts.view',
  ALERTS_VIEW_OWN = 'alerts.view.own',
  ALERTS_ACKNOWLEDGE = 'alerts.acknowledge',
  ALERTS_RESOLVE = 'alerts.resolve',
  SOS_TRIGGER = 'sos.trigger',

  // Notifications
  NOTIFICATIONS_VIEW_OWN = 'notifications.view.own',

  // Organization & Administration
  ORGANIZATION_VIEW = 'organization.view',
  ORGANIZATION_MANAGE_SETTINGS = 'organization.manage_settings',
  USERS_MANAGE = 'users.manage',
}

/**
 * Authoritative Role-to-Permissions Mapping Table
 */
export const ROLE_PERMISSIONS: Record<CanonicalRole, Permission[]> = {
  [CanonicalRole.MANAGER]: [
    Permission.DASHBOARD_VIEW_FLEET,
    Permission.DRIVERS_VIEW,
    Permission.DRIVERS_CREATE,
    Permission.DRIVERS_UPDATE,
    Permission.DRIVERS_DEACTIVATE,
    Permission.VEHICLES_VIEW,
    Permission.VEHICLES_CREATE,
    Permission.VEHICLES_UPDATE,
    Permission.VEHICLES_DEACTIVATE,
    Permission.TRIPS_VIEW,
    Permission.TRIPS_CREATE,
    Permission.TRIPS_ASSIGN,
    Permission.TRIPS_DISPATCH,
    Permission.TRIPS_UPDATE_STATUS,
    Permission.TRIPS_CANCEL,
    Permission.ATTENDANCE_VIEW,
    Permission.ATTENDANCE_VIEW_ORG,
    Permission.ATTENDANCE_VIEW_LIMITED,
    Permission.ATTENDANCE_VIEW_OWN,
    Permission.ATTENDANCE_MANAGE,
    Permission.ATTENDANCE_EXPORT,
    Permission.ATTENDANCE_CLOCK_IN_OUT,
    Permission.TRACKING_VIEW_FLEET,
    Permission.MAINTENANCE_VIEW,
    Permission.MAINTENANCE_VIEW_STATUS,
    Permission.MAINTENANCE_CREATE,
    Permission.MAINTENANCE_UPDATE,
    Permission.MAINTENANCE_INSPECT,
    Permission.FUEL_VIEW,
    Permission.FUEL_CREATE,
    Permission.FUEL_UPDATE,
    Permission.FUEL_EXPORT,
    Permission.EXPENSES_VIEW,
    Permission.EXPENSES_CREATE,
    Permission.EXPENSES_UPDATE,
    Permission.EXPENSES_EXPORT,
    Permission.ANALYTICS_VIEW_OPERATIONS,
    Permission.ANALYTICS_VIEW_FINANCE,
    Permission.ANALYTICS_VIEW_SAFETY,
    Permission.ANALYTICS_VIEW_FUEL_ANOMALIES,
    Permission.ANALYTICS_VIEW_MAINTENANCE_FORECAST,
    Permission.AI_ASSISTANT_QUERY,
    Permission.CARBON_VIEW,
    Permission.CARBON_MANAGE_TARGETS,
    Permission.CHAT_VIEW,
    Permission.CHAT_SEND,
    Permission.ALERTS_VIEW,
    Permission.ALERTS_VIEW_OWN,
    Permission.ALERTS_ACKNOWLEDGE,
    Permission.ALERTS_RESOLVE,
    Permission.SOS_TRIGGER,
    Permission.NOTIFICATIONS_VIEW_OWN,
    Permission.ORGANIZATION_VIEW,
    Permission.ORGANIZATION_MANAGE_SETTINGS,
    Permission.USERS_MANAGE,
  ],

  [CanonicalRole.DISPATCHER]: [
    Permission.DASHBOARD_VIEW_FLEET,
    Permission.DRIVERS_VIEW, // Read/assign
    Permission.VEHICLES_VIEW, // Operational read
    Permission.TRIPS_VIEW,
    Permission.TRIPS_CREATE,
    Permission.TRIPS_ASSIGN,
    Permission.TRIPS_DISPATCH,
    Permission.TRIPS_UPDATE_STATUS,
    Permission.TRIPS_CANCEL,
    Permission.ATTENDANCE_VIEW,
    Permission.ATTENDANCE_VIEW_LIMITED, // Limited operational attendance
    Permission.ATTENDANCE_VIEW_OWN,
    Permission.ATTENDANCE_CLOCK_IN_OUT,
    Permission.TRACKING_VIEW_FLEET, // All active trips
    Permission.MAINTENANCE_VIEW_STATUS, // Read vehicle operational status
    Permission.FUEL_VIEW_LIMITED, // Limited anomaly view
    Permission.ANALYTICS_VIEW_OPERATIONS,
    Permission.ANALYTICS_VIEW_FUEL_ANOMALIES,
    Permission.AI_ASSISTANT_QUERY,
    Permission.CARBON_VIEW, // Read-only
    Permission.CHAT_VIEW,
    Permission.CHAT_SEND,
    Permission.ALERTS_VIEW,
    Permission.ALERTS_VIEW_OWN,
    Permission.ALERTS_ACKNOWLEDGE,
    Permission.NOTIFICATIONS_VIEW_OWN,
    Permission.ORGANIZATION_VIEW,
  ],

  [CanonicalRole.SAFETY_OFFICER]: [
    Permission.DASHBOARD_VIEW_FLEET, // Safety view
    Permission.DRIVERS_VIEW, // Profile, license expiry, safety score
    Permission.VEHICLES_VIEW, // Read safety details
    Permission.TRIPS_VIEW, // Read for safety auditing
    Permission.TRACKING_VIEW_FLEET, // Live tracking for safety monitoring
    Permission.ATTENDANCE_VIEW,
    Permission.ATTENDANCE_VIEW_ORG, // Compliance audits
    Permission.ATTENDANCE_VIEW_OWN,
    Permission.ATTENDANCE_EXPORT, // Compliance PDF exports
    Permission.MAINTENANCE_VIEW, // Inspect maintenance logs
    Permission.MAINTENANCE_VIEW_STATUS,
    Permission.MAINTENANCE_INSPECT, // Safety inspections
    Permission.ANALYTICS_VIEW_SAFETY,
    Permission.AI_ASSISTANT_QUERY,
    Permission.CARBON_VIEW, // Read if relevant
    Permission.CHAT_VIEW,
    Permission.CHAT_SEND,
    Permission.ALERTS_VIEW,
    Permission.ALERTS_VIEW_OWN,
    Permission.ALERTS_ACKNOWLEDGE, // Incident handling
    Permission.ALERTS_RESOLVE, // Safety incident resolution
    Permission.SOS_TRIGGER,
    Permission.NOTIFICATIONS_VIEW_OWN,
    Permission.ORGANIZATION_VIEW,
    Permission.ATTENDANCE_CLOCK_IN_OUT,
  ],

  [CanonicalRole.FINANCE]: [
    Permission.DASHBOARD_VIEW_FLEET, // Cost view
    Permission.DRIVERS_VIEW, // Limited read for payroll / expense allocation
    Permission.VEHICLES_VIEW, // Cost-related read (acquisition, maintenance cost)
    Permission.TRIPS_VIEW, // Cost-related read (distance, fuel cost)
    Permission.MAINTENANCE_VIEW, // Cost records
    Permission.ATTENDANCE_VIEW,
    Permission.ATTENDANCE_VIEW_OWN,
    Permission.ATTENDANCE_VIEW_LIMITED,
    Permission.FUEL_VIEW, // Full fuel logging & records
    Permission.FUEL_CREATE,
    Permission.FUEL_UPDATE,
    Permission.FUEL_EXPORT,
    Permission.EXPENSES_VIEW, // Full expense logging & records
    Permission.EXPENSES_CREATE,
    Permission.EXPENSES_UPDATE,
    Permission.EXPENSES_EXPORT,
    Permission.ANALYTICS_VIEW_FINANCE,
    Permission.ANALYTICS_VIEW_FUEL_ANOMALIES,
    Permission.ANALYTICS_VIEW_MAINTENANCE_FORECAST,
    Permission.AI_ASSISTANT_QUERY,
    Permission.CARBON_VIEW, // Cost/emissions analysis
    Permission.CHAT_VIEW,
    Permission.CHAT_SEND,
    Permission.ALERTS_VIEW, // Read emergency alerts if needed
    Permission.ALERTS_VIEW_OWN,
    Permission.NOTIFICATIONS_VIEW_OWN,
    Permission.ORGANIZATION_VIEW,
    Permission.ATTENDANCE_CLOCK_IN_OUT,
  ],

  [CanonicalRole.DRIVER]: [
    Permission.DASHBOARD_VIEW_PERSONAL, // Own shift & trip status
    Permission.DRIVERS_VIEW_OWN, // Own profile
    Permission.DRIVERS_UPDATE_OWN, // Own profile edits (phone, etc.)
    Permission.VEHICLES_VIEW_ASSIGNED, // Assigned vehicle only
    Permission.TRIPS_VIEW_OWN, // Assigned trips only
    Permission.TRIPS_UPDATE_STATUS, // In-transit updates only (validated server-side)
    Permission.ATTENDANCE_VIEW,
    Permission.ATTENDANCE_CLOCK_IN_OUT, // Personal shift clock in/out with geofence exception
    Permission.ATTENDANCE_VIEW_OWN, // Own attendance history only
    Permission.TRACKING_VIEW_ASSIGNED, // Own trip tracking
    Permission.TRACKING_SUBMIT_LOCATION, // Ingest GPS for assigned trip
    Permission.MAINTENANCE_VIEW_STATUS, // View assigned vehicle status
    Permission.AI_ASSISTANT_QUERY, // Own-trip assistance only
    Permission.CHAT_VIEW, // Own 1-on-1 conversations only
    Permission.CHAT_SEND,
    Permission.ALERTS_VIEW_OWN,
    Permission.SOS_TRIGGER, // Trigger panic SOS
    Permission.NOTIFICATIONS_VIEW_OWN,
    Permission.ORGANIZATION_VIEW,
  ],

  [CanonicalRole.PLATFORM_ADMIN]: [
    Permission.ORGANIZATION_VIEW,
  ],

  [CanonicalRole.UNAUTHORIZED]: [],
};

/**
 * Checks if a role possesses a specific permission.
 */
export function hasPermission(role: string | CanonicalRole | undefined, permission: Permission): boolean {
  if (!role) return false;
  const canonical = normalizeRole(role);
  const permissions = ROLE_PERMISSIONS[canonical];
  return permissions ? permissions.includes(permission) : false;
}

/**
 * Checks if a role possesses at least one of the specified permissions.
 */
export function hasAnyPermission(role: string | CanonicalRole | undefined, permissions: Permission[]): boolean {
  if (!role) return false;
  return permissions.some(p => hasPermission(role, p));
}
