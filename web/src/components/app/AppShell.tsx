// ==============================================================================
// LogiSphere AI — Executive Authenticated Application Shell
// Role-aware responsive navigation, live telemetry clock, emergency SOS ribbon,
// collapsible desktop sidebar, and mobile drawer matching App/src/ architecture.
// ==============================================================================

import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Truck,
  Users,
  Navigation,
  MapPin,
  Clock,
  Wrench,
  Fuel,
  AlertTriangle,
  MessageSquare,
  Sparkles,
  Leaf,
  TrendingUp,
  LogOut,
  Menu,
  X,
  Building2,
  Shield,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../stores/authStore';
import { CanonicalRole, getNavItemsForRole, normalizeRole } from '../../utils/rbac';
import { alertService } from '../../services/alertService';

// Icon map for dynamic navigation
const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard,
  Truck,
  Users,
  Navigation,
  MapPin,
  Clock,
  Wrench,
  Fuel,
  AlertTriangle,
  MessageSquare,
  Sparkles,
  Leaf,
  TrendingUp,
};

interface AppShellProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentRoute,
  onNavigate,
  children,
}) => {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  );
  const [liveTime, setLiveTime] = useState('');
  const [activeAlertCount, setActiveAlertCount] = useState(0);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Resize listener for responsive desktop collapse vs mobile drawer (768px mobile breakpoint)
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) {
        setMobileOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Derive allowed navigation items from RBAC
  const navItems = getNavItemsForRole(user?.role);
  const canonicalRole = normalizeRole(user?.role);

  // Live operational clock
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setLiveTime(
        now.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  // Poll and subscribe to Emergency Alerts
  useEffect(() => {
    let cleanupWs: (() => void) | undefined;

    const fetchCounts = async () => {
      try {
        const count = await alertService.getActiveCount();
        setActiveAlertCount(count);
      } catch {
        // Fallback gracefully
      }
    };

    fetchCounts();
    const pollInterval = setInterval(fetchCounts, 30000);

    // Live WebSocket connection for SOS notifications
    cleanupWs = alertService.connectAlertsWs({
      onAlertCreated: () => {
        setActiveAlertCount((prev) => prev + 1);
      },
      onAlertResolved: () => {
        setActiveAlertCount((prev) => Math.max(0, prev - 1));
      },
    });

    return () => {
      clearInterval(pollInterval);
      if (cleanupWs) cleanupWs();
    };
  }, []);

  const handleNavClick = (key: string) => {
    onNavigate(key);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const handleToggleSidebar = () => {
    if (isMobile) {
      setMobileOpen((prev) => !prev);
    } else {
      setDesktopCollapsed((prev) => !prev);
    }
  };

  const getRoleBadgeStyle = (role: CanonicalRole) => {
    switch (role) {
      case CanonicalRole.MANAGER:
        return { bg: '#FEF3C7', color: '#92400E', border: '#FDE68A', label: 'Fleet Manager' };
      case CanonicalRole.DISPATCHER:
        return { bg: '#DBEAFE', color: '#1E40AF', border: '#BFDBFE', label: 'Dispatcher' };
      case CanonicalRole.SAFETY_OFFICER:
        return { bg: '#FEE2E2', color: '#991B1B', border: '#FECACA', label: 'Safety Officer' };
      case CanonicalRole.FINANCE:
        return { bg: '#E0E7FF', color: '#3730A3', border: '#C7D2FE', label: 'Financial Analyst' };
      case CanonicalRole.DRIVER:
        return { bg: '#D1FAE5', color: '#065F46', border: '#A7F3D0', label: 'Fleet Driver' };
      default:
        return { bg: '#F3F4F6', color: '#374151', border: '#E5E7EB', label: 'User' };
    }
  };

  const roleStyle = getRoleBadgeStyle(canonicalRole);
  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'US';

  const orgName = user?.organizationName || 'LogiSphere Fleet Operations';

  return (
    <div className="app-layout">
      {/* Mobile Backdrop (ONLY on mobile screens <= 1024px when drawer is open) */}
      {isMobile && mobileOpen && (
        <div
          className="sidebar-mobile-backdrop"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Responsive Left Sidebar (collapsible desktop rail / slide-in mobile drawer) */}
      <aside
        className={`app-sidebar ${isMobile && mobileOpen ? 'open' : ''} ${
          !isMobile && desktopCollapsed ? 'collapsed' : ''
        }`}
      >
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <img
            src="/logo.png"
            alt="LogiSphere AI"
            style={{ width: 34, height: 34, objectFit: 'contain', flexShrink: 0 }}
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
          />
          <div className="sidebar-full-only" style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#111827', letterSpacing: '-0.02em' }}>
              LogiSphere<span style={{ color: '#F59E0B' }}> AI</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Enterprise SaaS
            </div>
          </div>

          {/* Close button for mobile drawer */}
          {isMobile && (
            <button
              type="button"
              className="mobile-close-btn"
              onClick={() => setMobileOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#6B7280',
                cursor: 'pointer',
                padding: '0.25rem',
              }}
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Organization Tenancy Context Badge */}
        <div
          style={{
            padding: desktopCollapsed && !isMobile ? '0.75rem 0.5rem' : '0.75rem 1rem',
            margin: desktopCollapsed && !isMobile ? '0.75rem 0.5rem 0 0.5rem' : '0.75rem 0.75rem 0 0.75rem',
            background: '#F9FAFB',
            border: '1px solid #E5E7EB',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: desktopCollapsed && !isMobile ? 'center' : 'flex-start',
            gap: '0.5rem',
          }}
          title={orgName}
        >
          <Building2 size={16} color="#6B7280" style={{ flexShrink: 0 }} />
          <div className="sidebar-full-only" style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: '0.72rem',
                color: '#6B7280',
                textTransform: 'uppercase',
                fontWeight: 700,
                letterSpacing: '0.04em',
              }}
            >
              Active Organization
            </div>
            <div
              style={{
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#111827',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={orgName}
            >
              {orgName}
            </div>
          </div>
        </div>

        {/* Dynamic RBAC Nav Items */}
        <nav className="sidebar-nav">
          <div
            className="sidebar-full-only"
            style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: '#9CA3AF',
              letterSpacing: '0.06em',
              padding: '0.5rem 0.5rem 0.25rem 0.5rem',
            }}
          >
            Operations Modules
          </div>

          {navItems.map((item) => {
            const IconComponent = ICON_MAP[item.iconName] || LayoutDashboard;
            const isActive = currentRoute === item.key;
            const isAlertItem = item.key === 'alerts';

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleNavClick(item.key)}
                className={`sidebar-item ${isActive ? 'active' : ''}`}
                title={desktopCollapsed && !isMobile ? item.label : undefined}
              >
                <IconComponent
                  size={18}
                  style={{ flexShrink: 0 }}
                  color={isActive ? '#B45309' : isAlertItem && activeAlertCount > 0 ? '#DC2626' : '#6B7280'}
                />
                <span className="sidebar-full-only" style={{ flex: 1, textAlign: 'left' }}>
                  {item.label}
                </span>
                {isAlertItem && activeAlertCount > 0 && (
                  <span
                    style={{
                      background: '#EF4444',
                      color: '#FFFFFF',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      padding: '0.1rem 0.45rem',
                      borderRadius: 999,
                      animation: 'pulse 2s infinite',
                      flexShrink: 0,
                    }}
                  >
                    {activeAlertCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer with Sign Out */}
        <div className="sidebar-footer">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: desktopCollapsed && !isMobile ? 'center' : 'flex-start',
              gap: '0.75rem',
              marginBottom: '0.75rem',
              width: '100%',
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: '#FEF3C7',
                border: '1px solid #FDE68A',
                color: '#B45309',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '0.85rem',
                flexShrink: 0,
              }}
              title={user?.name || user?.email}
            >
              {initials}
            </div>
            <div className="sidebar-full-only" style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: '#111827',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {user?.name || user?.email}
              </div>
              <div
                style={{
                  fontSize: '0.72rem',
                  color: roleStyle.color,
                  fontWeight: 600,
                }}
              >
                {roleStyle.label}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            className="btn-secondary"
            style={{
              width: '100%',
              justifyContent: 'center',
              fontSize: '0.8rem',
              padding: desktopCollapsed && !isMobile ? '0.45rem 0' : '0.45rem',
            }}
            title="Sign Out"
          >
            <LogOut size={15} style={{ flexShrink: 0 }} />
            <span className="sidebar-full-only">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Operations Canvas */}
      <div className="app-main">
        {/* Top Header */}
        <header className="app-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              type="button"
              onClick={handleToggleSidebar}
              style={{
                background: 'none',
                border: 'none',
                color: '#4B5563',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '0.25rem',
                borderRadius: 6,
              }}
              className="sidebar-toggle-btn"
              title={isMobile ? 'Toggle menu' : desktopCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label="Toggle navigation menu"
            >
              <Menu size={22} />
            </button>

            {/* Breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
              <span style={{ color: '#6B7280' }}>LogiSphere</span>
              <ChevronRight size={14} color="#9CA3AF" />
              <span style={{ fontWeight: 700, color: '#111827', textTransform: 'capitalize' }}>
                {currentRoute.replace(/-/g, ' ')}
              </span>
            </div>
          </div>

          {/* Right Header Status Ribbon */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Live Operational Clock */}
            <div
              className="ops-mono"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#4B5563',
                background: '#F9FAFB',
                padding: '0.35rem 0.65rem',
                borderRadius: 6,
                border: '1px solid #E5E7EB',
              }}
            >
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: '#10B981',
                }}
              />
              <span>{liveTime || '00:00:00'}</span>
            </div>

            {/* Active Emergency SOS Alert Pill */}
            {activeAlertCount > 0 && (
              <button
                type="button"
                onClick={() => onNavigate('alerts')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: '#FEE2E2',
                  border: '1px solid #FECACA',
                  color: '#DC2626',
                  borderRadius: 999,
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <AlertTriangle size={15} />
                <span>{activeAlertCount} SOS Alert{activeAlertCount === 1 ? '' : 's'} Active</span>
              </button>
            )}

            {/* Role Badge */}
            <div
              style={{
                background: roleStyle.bg,
                color: roleStyle.color,
                border: `1px solid ${roleStyle.border}`,
                padding: '0.25rem 0.65rem',
                borderRadius: 999,
                fontSize: '0.75rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <Shield size={13} />
              <span>{roleStyle.label}</span>
            </div>

            {/* User Profile Pill */}
            <button
              type="button"
              onClick={() => onNavigate('profile')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '0.25rem',
              }}
              title="View Account Profile"
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: '#F59E0B',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                }}
              >
                {initials}
              </div>
            </button>
          </div>
        </header>

        {/* Global Emergency Alert Banner if any SOS is active */}
        {!bannerDismissed && activeAlertCount > 0 && currentRoute !== 'alerts' && (
          <div
            style={{
              background: '#FEF2F2',
              borderBottom: '1px solid #FCA5A5',
              padding: '0.75rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#991B1B',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem' }}>
              <AlertTriangle size={18} color="#DC2626" style={{ flexShrink: 0 }} />
              <span>
                <strong>CRITICAL NOTICE:</strong> {activeAlertCount} active Emergency SOS incident(s) require
                dispatch review and coordinator acknowledgement.
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => onNavigate('alerts')}
                className="btn-danger"
                style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
              >
                Review SOS Alerts
              </button>
              <button
                type="button"
                onClick={() => setBannerDismissed(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#991B1B',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0.3rem',
                  borderRadius: 6,
                  transition: 'all 0.15s ease',
                }}
                title="Dismiss Notice"
                aria-label="Dismiss Emergency Notice"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
};
