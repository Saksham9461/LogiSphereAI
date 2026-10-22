import { useMemo } from 'react';
import useAuthStore from '../store/AuthStore';
import {
  CanonicalRole,
  Permission,
  hasPermission,
  hasAnyPermission,
  normalizeRole,
  ROLE_PERMISSIONS,
  ROUTE_PERMISSIONS,
  isRouteAllowed,
  ROLE_PRIMARY_TABS,
} from '../constants/permissions';

export {
  CanonicalRole,
  Permission,
  hasPermission,
  hasAnyPermission,
  normalizeRole,
  ROLE_PERMISSIONS,
  ROUTE_PERMISSIONS,
  isRouteAllowed,
  ROLE_PRIMARY_TABS,
};

/**
 * Convenience helper to test if a given role possesses a specific permission.
 */
export function can(userRole: string | CanonicalRole | undefined, permission: Permission): boolean {
  return hasPermission(userRole, permission);
}

/**
 * Convenience helper to test if a given role possesses at least one of the permissions.
 */
export function canAny(userRole: string | CanonicalRole | undefined, permissions: Permission[]): boolean {
  return hasAnyPermission(userRole, permissions);
}

/**
 * React hook to access role permissions and helper methods from the active auth state.
 */
export function usePermissions() {
  const user = useAuthStore(state => state.user);
  const rawRole = user?.role;

  const canonicalRole = useMemo(() => normalizeRole(rawRole), [rawRole]);

  const permissions = useMemo(() => ROLE_PERMISSIONS[canonicalRole] || [], [canonicalRole]);

  const canCheck = useMemo(
    () => (permission: Permission) => hasPermission(canonicalRole, permission),
    [canonicalRole]
  );

  const canAnyCheck = useMemo(
    () => (perms: Permission[]) => hasAnyPermission(canonicalRole, perms),
    [canonicalRole]
  );

  const isAllowedRouteCheck = useMemo(
    () => (routeName: string) => isRouteAllowed(canonicalRole, routeName),
    [canonicalRole]
  );

  return {
    user,
    role: rawRole,
    canonicalRole,
    permissions,
    can: canCheck,
    canAny: canAnyCheck,
    isRouteAllowed: isAllowedRouteCheck,
    isDriver: canonicalRole === CanonicalRole.DRIVER,
    isManager: canonicalRole === CanonicalRole.MANAGER,
    isDispatcher: canonicalRole === CanonicalRole.DISPATCHER,
    isSafetyOfficer: canonicalRole === CanonicalRole.SAFETY_OFFICER,
    isFinance: canonicalRole === CanonicalRole.FINANCE,
    isPlatformAdmin: canonicalRole === CanonicalRole.PLATFORM_ADMIN,
  };
}
