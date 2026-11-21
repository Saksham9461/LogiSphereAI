// ==============================================================================
// LogiSphere AI — Web Role-Based Access Control (RBAC) Registry
// 100% Symmetrical with backend/src/config/permissions.ts and App/src/constants/permissions.ts
// Standard erasable syntax (erasableSyntaxOnly compliant)
// ==============================================================================

export const CanonicalRole = {
  MANAGER: 'ROLE_MANAGER',
  DISPATCHER: 'ROLE_DISPATCHER',
  SAFETY_OFFICER: 'ROLE_SAFETY_OFFICER',
  FINANCE: 'ROLE_FINANCE',
  DRIVER: 'ROLE_DRIVER',
  PLATFORM_ADMIN: 'PLATFORM_ADMIN',
  UNAUTHORIZED: 'UNAUTHORIZED',
} as const;

export type CanonicalRole = typeof CanonicalRole[keyof typeof CanonicalRole];

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

export const Permission = {
  // Dashboard
  DASHBOARD_VIEW_FLEET: 'dashboard.view.fleet',
  DASHBOARD_VIEW_PERSONAL: 'dashboard.view.personal',

  // Drivers
  DRIVERS_VIEW: 'drivers.view',
  DRIVERS_CREATE: 'drivers.create',
  DRIVERS_UPDATE: 'drivers.update',
  DRIVERS_DEACTIVATE: 'drivers.deactivate',
  DRIVERS_VIEW_OWN: 'drivers.view.own',
  DRIVERS_UPDATE_OWN: 'drivers.update.own',

  // Vehicles
  VEHICLES_VIEW: 'vehicles.view',
  VEHICLES_CREATE: 'vehicles.create',
  VEHICLES_UPDATE: 'vehicles.update',
  VEHICLES_DEACTIVATE: 'vehicles.deactivate',
  VEHICLES_VIEW_ASSIGNED: 'vehicles.view.assigned',

  // Trips
  TRIPS_VIEW: 'trips.view',
  TRIPS_CREATE: 'trips.create',
  TRIPS_ASSIGN: 'trips.assign',
  TRIPS_DISPATCH: 'trips.dispatch',
  TRIPS_UPDATE_STATUS: 'trips.update_status',
  TRIPS_CANCEL: 'trips.cancel',
  TRIPS_VIEW_OWN: 'trips.view.own',

  // Attendance
  ATTENDANCE_VIEW: 'attendance.view',
  ATTENDANCE_VIEW_ORG: 'attendance.view.org',
  ATTENDANCE_VIEW_LIMITED: 'attendance.view.limited',
  ATTENDANCE_VIEW_OWN: 'attendance.view.own',
  ATTENDANCE_MANAGE: 'attendance.manage',
  ATTENDANCE_EXPORT: 'attendance.export',
  ATTENDANCE_CLOCK_IN_OUT: 'attendance.clock_in_out',

  // Live Tracking
  TRACKING_VIEW_FLEET: 'tracking.view.fleet',
  TRACKING_VIEW_ASSIGNED: 'tracking.view.assigned',
  TRACKING_SUBMIT_LOCATION: 'tracking.submit_location',

  // Maintenance
  MAINTENANCE_VIEW: 'maintenance.view',
  MAINTENANCE_VIEW_STATUS: 'maintenance.view.status',
  MAINTENANCE_CREATE: 'maintenance.create',
  MAINTENANCE_UPDATE: 'maintenance.update',
  MAINTENANCE_INSPECT: 'maintenance.inspect',

  // Fuel & Expenses
  FUEL_VIEW: 'fuel.view',
  FUEL_VIEW_LIMITED: 'fuel.view.limited',
  FUEL_CREATE: 'fuel.create',
  FUEL_UPDATE: 'fuel.update',
  FUEL_EXPORT: 'fuel.export',
  EXPENSES_VIEW: 'expenses.view',
  EXPENSES_CREATE: 'expenses.create',
  EXPENSES_UPDATE: 'expenses.update',
  EXPENSES_EXPORT: 'expenses.export',

  // Analytics & AI
  ANALYTICS_VIEW_OPERATIONS: 'analytics.view.operations',
  ANALYTICS_VIEW_FINANCE: 'analytics.view.finance',
  ANALYTICS_VIEW_SAFETY: 'analytics.view.safety',
  ANALYTICS_VIEW_FUEL_ANOMALIES: 'analytics.view.fuel_anomalies',
  ANALYTICS_VIEW_MAINTENANCE_FORECAST: 'analytics.view.maintenance_forecast',
  AI_ASSISTANT_QUERY: 'ai.assistant.query',

  // Carbon Intelligence
  CARBON_VIEW: 'carbon.view',
  CARBON_MANAGE_TARGETS: 'carbon.manage_targets',

  // Chat
  CHAT_VIEW: 'chat.view',
  CHAT_SEND: 'chat.send',

  // SOS & Alerts
  ALERTS_VIEW: 'alerts.view',
  ALERTS_VIEW_OWN: 'alerts.view.own',
  ALERTS_ACKNOWLEDGE: 'alerts.acknowledge',
  ALERTS_RESOLVE: 'alerts.resolve',
  SOS_TRIGGER: 'sos.trigger',

  // Notifications
  NOTIFICATIONS_VIEW_OWN: 'notifications.view.own',

  // Organization & Administration
  ORGANIZATION_VIEW: 'organization.view',
  ORGANIZATION_MANAGE_SETTINGS: 'organization.manage_settings',
  USERS_MANAGE: 'users.manage',
} as const;

export type Permission = typeof Permission[keyof typeof Permission];

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
    Permission.DRIVERS_VIEW,
    Permission.VEHICLES_VIEW,
    Permission.TRIPS_VIEW,
    Permission.TRIPS_CREATE,
    Permission.TRIPS_ASSIGN,
    Permission.TRIPS_DISPATCH,
    Permission.TRIPS_UPDATE_STATUS,
    Permission.TRIPS_CANCEL,
    Permission.ATTENDANCE_VIEW,
    Permission.ATTENDANCE_VIEW_LIMITED,
    Permission.ATTENDANCE_VIEW_OWN,
    Permission.ATTENDANCE_CLOCK_IN_OUT,
    Permission.TRACKING_VIEW_FLEET,
    Permission.MAINTENANCE_VIEW_STATUS,
    Permission.FUEL_VIEW_LIMITED,
    Permission.ANALYTICS_VIEW_OPERATIONS,
    Permission.ANALYTICS_VIEW_FUEL_ANOMALIES,
    Permission.AI_ASSISTANT_QUERY,
    Permission.CARBON_VIEW,
    Permission.CHAT_VIEW,
    Permission.CHAT_SEND,
    Permission.ALERTS_VIEW,
    Permission.ALERTS_VIEW_OWN,
    Permission.ALERTS_ACKNOWLEDGE,
    Permission.NOTIFICATIONS_VIEW_OWN,
    Permission.ORGANIZATION_VIEW,
  ],

  [CanonicalRole.SAFETY_OFFICER]: [
    Permission.DASHBOARD_VIEW_FLEET,
    Permission.DRIVERS_VIEW,
    Permission.VEHICLES_VIEW,
    Permission.TRIPS_VIEW,
    Permission.TRACKING_VIEW_FLEET,
    Permission.ATTENDANCE_VIEW,
    Permission.ATTENDANCE_VIEW_ORG,
    Permission.ATTENDANCE_VIEW_OWN,
    Permission.ATTENDANCE_EXPORT,
    Permission.MAINTENANCE_VIEW,
    Permission.MAINTENANCE_VIEW_STATUS,
    Permission.MAINTENANCE_INSPECT,
    Permission.ANALYTICS_VIEW_SAFETY,
    Permission.AI_ASSISTANT_QUERY,
    Permission.CARBON_VIEW,
    Permission.CHAT_VIEW,
    Permission.CHAT_SEND,
    Permission.ALERTS_VIEW,
    Permission.ALERTS_VIEW_OWN,
    Permission.ALERTS_ACKNOWLEDGE,
    Permission.ALERTS_RESOLVE,
    Permission.SOS_TRIGGER,
    Permission.NOTIFICATIONS_VIEW_OWN,
    Permission.ORGANIZATION_VIEW,
    Permission.ATTENDANCE_CLOCK_IN_OUT,
  ],

  [CanonicalRole.FINANCE]: [
    Permission.DASHBOARD_VIEW_FLEET,
    Permission.DRIVERS_VIEW,
    Permission.VEHICLES_VIEW,
    Permission.TRIPS_VIEW,
    Permission.MAINTENANCE_VIEW,
    Permission.ATTENDANCE_VIEW,
    Permission.ATTENDANCE_VIEW_OWN,
    Permission.ATTENDANCE_VIEW_LIMITED,
    Permission.FUEL_VIEW,
    Permission.FUEL_CREATE,
    Permission.FUEL_UPDATE,
    Permission.FUEL_EXPORT,
    Permission.EXPENSES_VIEW,
    Permission.EXPENSES_CREATE,
    Permission.EXPENSES_UPDATE,
    Permission.EXPENSES_EXPORT,
    Permission.ANALYTICS_VIEW_FINANCE,
    Permission.ANALYTICS_VIEW_FUEL_ANOMALIES,
    Permission.ANALYTICS_VIEW_MAINTENANCE_FORECAST,
    Permission.AI_ASSISTANT_QUERY,
    Permission.CARBON_VIEW,
    Permission.CHAT_VIEW,
    Permission.CHAT_SEND,
    Permission.ALERTS_VIEW,
    Permission.ALERTS_VIEW_OWN,
    Permission.NOTIFICATIONS_VIEW_OWN,
    Permission.ORGANIZATION_VIEW,
    Permission.ATTENDANCE_CLOCK_IN_OUT,
  ],

  [CanonicalRole.DRIVER]: [
    Permission.DASHBOARD_VIEW_PERSONAL,
    Permission.DRIVERS_VIEW_OWN,
    Permission.DRIVERS_UPDATE_OWN,
    Permission.VEHICLES_VIEW_ASSIGNED,
    Permission.TRIPS_VIEW_OWN,
    Permission.TRIPS_UPDATE_STATUS,
    Permission.ATTENDANCE_VIEW,
    Permission.ATTENDANCE_CLOCK_IN_OUT,
    Permission.ATTENDANCE_VIEW_OWN,
    Permission.TRACKING_VIEW_ASSIGNED,
    Permission.TRACKING_SUBMIT_LOCATION,
    Permission.MAINTENANCE_VIEW_STATUS,
    Permission.AI_ASSISTANT_QUERY,
    Permission.CHAT_VIEW,
    Permission.CHAT_SEND,
    Permission.ALERTS_VIEW_OWN,
    Permission.SOS_TRIGGER,
    Permission.NOTIFICATIONS_VIEW_OWN,
    Permission.ORGANIZATION_VIEW,
  ],

  [CanonicalRole.PLATFORM_ADMIN]: [
    Permission.ORGANIZATION_VIEW,
  ],

  [CanonicalRole.UNAUTHORIZED]: [],
};

export function hasPermission(role: string | CanonicalRole | undefined, permission: Permission): boolean {
  if (!role) return false;
  const canonical = normalizeRole(role);
  const permissions = ROLE_PERMISSIONS[canonical];
  return permissions ? (permissions as readonly Permission[]).includes(permission) : false;
}

export function hasAnyPermission(role: string | CanonicalRole | undefined, permissions: Permission[]): boolean {
  if (!role) return false;
  return permissions.some(p => hasPermission(role, p));
}

export const ROUTE_PERMISSIONS: Record<string, Permission | Permission[]> = {
  dashboard: [Permission.DASHBOARD_VIEW_FLEET, Permission.DASHBOARD_VIEW_PERSONAL],
  trips: [Permission.TRIPS_VIEW, Permission.TRIPS_VIEW_OWN],
  vehicles: Permission.VEHICLES_VIEW,
  drivers: Permission.DRIVERS_VIEW,
  tracking: Permission.TRACKING_VIEW_FLEET,
  attendance: [
    Permission.ATTENDANCE_VIEW,
    Permission.ATTENDANCE_VIEW_ORG,
    Permission.ATTENDANCE_VIEW_LIMITED,
    Permission.ATTENDANCE_VIEW_OWN,
  ],
  maintenance: [Permission.MAINTENANCE_VIEW, Permission.MAINTENANCE_INSPECT, Permission.MAINTENANCE_VIEW_STATUS],
  'fuel-expenses': [Permission.FUEL_VIEW, Permission.EXPENSES_VIEW, Permission.FUEL_VIEW_LIMITED],
  analytics: [
    Permission.ANALYTICS_VIEW_OPERATIONS,
    Permission.ANALYTICS_VIEW_FINANCE,
    Permission.ANALYTICS_VIEW_SAFETY,
  ],
  alerts: [Permission.ALERTS_VIEW, Permission.ALERTS_VIEW_OWN],
  chat: Permission.CHAT_VIEW,
  ai: Permission.AI_ASSISTANT_QUERY,
  carbon: Permission.CARBON_VIEW,
  profile: Permission.NOTIFICATIONS_VIEW_OWN,
};

export function isRouteAllowed(role: string | CanonicalRole | undefined, routeKey: string): boolean {
  const req = ROUTE_PERMISSIONS[routeKey];
  if (!req) return true;
  if (Array.isArray(req)) {
    return hasAnyPermission(role, req);
  }
  return hasPermission(role, req);
}

export interface NavItemConfig {
  key: string;
  label: string;
  iconName: string;
  permission?: Permission | Permission[];
}

export const APP_NAVIGATION_ITEMS: NavItemConfig[] = [
  { key: 'dashboard', label: 'Command Dashboard', iconName: 'LayoutDashboard', permission: [Permission.DASHBOARD_VIEW_FLEET, Permission.DASHBOARD_VIEW_PERSONAL] },
  { key: 'vehicles', label: 'Fleet Registry', iconName: 'Truck', permission: Permission.VEHICLES_VIEW },
  { key: 'drivers', label: 'Driver Operations', iconName: 'Users', permission: Permission.DRIVERS_VIEW },
  { key: 'trips', label: 'Trip Dispatcher', iconName: 'Navigation', permission: [Permission.TRIPS_VIEW, Permission.TRIPS_VIEW_OWN] },
  { key: 'tracking', label: 'Live GIS Telematics', iconName: 'MapPin', permission: Permission.TRACKING_VIEW_FLEET },
  { key: 'attendance', label: 'Geofenced Shifts', iconName: 'Clock', permission: Permission.ATTENDANCE_VIEW },
  { key: 'maintenance', label: 'Maintenance & Health', iconName: 'Wrench', permission: [Permission.MAINTENANCE_VIEW, Permission.MAINTENANCE_VIEW_STATUS] },
  { key: 'fuel-expenses', label: 'Fuel & Expenses', iconName: 'Fuel', permission: [Permission.FUEL_VIEW, Permission.EXPENSES_VIEW] },
  { key: 'alerts', label: 'Emergency Alerts (SOS)', iconName: 'AlertTriangle', permission: [Permission.ALERTS_VIEW, Permission.ALERTS_VIEW_OWN] },
  { key: 'chat', label: 'Team Communications', iconName: 'MessageSquare', permission: Permission.CHAT_VIEW },
  { key: 'ai', label: 'AI Fleet Assistant', iconName: 'Sparkles', permission: Permission.AI_ASSISTANT_QUERY },
  { key: 'carbon', label: 'Carbon Intelligence', iconName: 'Leaf', permission: Permission.CARBON_VIEW },
  { key: 'analytics', label: 'Analytics & KPIs', iconName: 'TrendingUp', permission: [Permission.ANALYTICS_VIEW_OPERATIONS, Permission.ANALYTICS_VIEW_FINANCE, Permission.ANALYTICS_VIEW_SAFETY] },
];

export function getNavItemsForRole(role: string | CanonicalRole | undefined): NavItemConfig[] {
  return APP_NAVIGATION_ITEMS.filter(item => {
    if (!item.permission) return true;
    if (Array.isArray(item.permission)) {
      return hasAnyPermission(role, item.permission);
    }
    return hasPermission(role, item.permission);
  });
}
