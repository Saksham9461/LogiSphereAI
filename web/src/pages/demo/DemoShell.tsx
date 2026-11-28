// ==============================================================================
// LogiSphere AI Demo Shell
// 100% Symmetrical with AppShell.tsx structure, styling, theme, and logo
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
} from 'lucide-react';

// Demo screens
import { DemoDashboardScreen } from './screens/DemoDashboardScreen';
import { DemoVehiclesScreen } from './screens/DemoVehiclesScreen';
import { DemoDriversScreen } from './screens/DemoDriversScreen';
import { DemoTripsScreen } from './screens/DemoTripsScreen';
import { DemoAttendanceScreen } from './screens/DemoAttendanceScreen';
import { DemoMaintenanceScreen } from './screens/DemoMaintenanceScreen';
import { DemoFuelExpenseScreen } from './screens/DemoFuelExpenseScreen';
import { DemoAlertsScreen } from './screens/DemoAlertsScreen';
import { DemoAnalyticsScreen } from './screens/DemoAnalyticsScreen';
import { DemoCarbonScreen } from './screens/DemoCarbonScreen';
import { DemoAIAssistantScreen } from './screens/DemoAIAssistantScreen';
import { DemoChatScreen } from './screens/DemoChatScreen';
import { DemoLiveTrackingScreen } from './screens/DemoLiveTrackingScreen';
import { DemoProfileScreen } from './screens/DemoProfileScreen';

interface DemoShellProps {
  onSignOut: () => void;
  onNavigateHome: () => void;
}

const DEMO_NAV = [
  { key: 'dashboard', label: 'Command Console', Icon: LayoutDashboard },
  { key: 'trips', label: 'Dispatch Operations', Icon: Navigation },
  { key: 'tracking', label: 'Live GIS Tracking', Icon: MapPin },
  { key: 'vehicles', label: 'Fleet Vehicles', Icon: Truck },
  { key: 'drivers', label: 'Driver Operations', Icon: Users },
  { key: 'attendance', label: 'Attendance & Shifts', Icon: Clock },
  { key: 'maintenance', label: 'Maintenance Hub', Icon: Wrench },
  { key: 'fuel-expenses', label: 'Fuel & Expenses', Icon: Fuel },
  { key: 'carbon', label: 'Carbon Intelligence', Icon: Leaf },
  { key: 'analytics', label: 'Fleet Analytics', Icon: TrendingUp },
  { key: 'alerts', label: 'Emergency Alerts', Icon: AlertTriangle },
  { key: 'ai', label: 'AI Operations Agent', Icon: Sparkles },
  { key: 'chat', label: 'Team Dispatch Chat', Icon: MessageSquare },
];

export const DemoShell: React.FC<DemoShellProps> = ({ onSignOut, onNavigateHome }) => {
  const [currentRoute, setCurrentRoute] = useState('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  );
  const [liveTime, setLiveTime] = useState('');
  const activeAlertCount = 1;

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) setMobileOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Live operational clock (strictly 12-hour format: hh:mm:ss AM/PM)
  useEffect(() => {
    const update = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      const formattedHours = String(hours ? hours : 12).padStart(2, '0');
      setLiveTime(`${formattedHours}:${minutes}:${seconds} ${ampm}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleNavClick = (key: string) => {
    setCurrentRoute(key);
    if (isMobile) setMobileOpen(false);
  };

  const handleToggleSidebar = () => {
    if (isMobile) {
      setMobileOpen((prev) => !prev);
    } else {
      setDesktopCollapsed((prev) => !prev);
    }
  };

  const currentNav = DEMO_NAV.find((n) => n.key === currentRoute) || DEMO_NAV[0];

  const renderScreen = () => {
    switch (currentRoute) {
      case 'dashboard': return <DemoDashboardScreen key="dashboard" onNavigate={setCurrentRoute} />;
      case 'vehicles': return <DemoVehiclesScreen key="vehicles" />;
      case 'drivers': return <DemoDriversScreen key="drivers" />;
      case 'trips': return <DemoTripsScreen key="trips" />;
      case 'tracking': return <DemoLiveTrackingScreen key="tracking" />;
      case 'attendance': return <DemoAttendanceScreen key="attendance" />;
      case 'maintenance': return <DemoMaintenanceScreen key="maintenance" />;
      case 'fuel-expenses': return <DemoFuelExpenseScreen key="fuel-expenses" />;
      case 'alerts': return <DemoAlertsScreen key="alerts" />;
      case 'analytics': return <DemoAnalyticsScreen key="analytics" />;
      case 'carbon': return <DemoCarbonScreen key="carbon" />;
      case 'ai': return <DemoAIAssistantScreen key="ai" onNavigate={setCurrentRoute} />;
      case 'chat': return <DemoChatScreen key="chat" />;
      case 'profile': return <DemoProfileScreen key="profile" />;
      default: return <DemoDashboardScreen key="dashboard-default" onNavigate={setCurrentRoute} />;
    }
  };

  return (
    <div className="app-layout">
      {/* Mobile Backdrop */}
      {isMobile && mobileOpen && (
        <div
          className="sidebar-mobile-backdrop"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Responsive Left Sidebar (matching AppShell.tsx exactly) */}
      <aside
        className={`app-sidebar ${isMobile && mobileOpen ? 'open' : ''} ${
          !isMobile && desktopCollapsed ? 'collapsed' : ''
        }`}
      >
        {/* Sidebar Header with LogiSphere AI Logo */}
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
          title="LogiSphere Demo Fleet Operations"
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
            >
              LogiSphere Demo Fleet
            </div>
          </div>
        </div>

        {/* Dynamic Nav Items */}
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

          {DEMO_NAV.map((item) => {
            const IconComponent = item.Icon;
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
                  <span className="sidebar-badge">
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
              title="Demo Manager"
            >
              DM
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
                Demo Manager
              </div>
              <div
                style={{
                  fontSize: '0.72rem',
                  color: '#92400E',
                  fontWeight: 600,
                }}
              >
                Fleet Manager
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => { onSignOut(); onNavigateHome(); }}
            className="btn-secondary"
            style={{
              width: '100%',
              justifyContent: 'center',
              fontSize: '0.8rem',
              padding: desktopCollapsed && !isMobile ? '0.45rem 0' : '0.45rem',
            }}
          >
            <LogOut size={16} />
            <span className="sidebar-full-only">Exit Demo</span>
          </button>
        </div>
      </aside>

      {/* Main App Container */}
      <div className="app-main">
        {/* Top Header matching AppShell */}
        <header className="app-header">
          {/* Left section: Toggle & Route Breadcrumbs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              type="button"
              className="sidebar-toggle-btn"
              onClick={handleToggleSidebar}
              title={desktopCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label="Toggle navigation sidebar"
            >
              <Menu size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
              <span className="header-breadcrumb-root" style={{ color: '#6B7280' }}>Operations</span>
              <span className="header-breadcrumb-root" style={{ color: '#9CA3AF' }}>/</span>
              <span style={{ fontWeight: 600, color: '#111827' }}>
                {currentNav.label}
              </span>
            </div>
          </div>

          {/* Right section: Clock, SOS Alert Pill, Role, Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Live Operational Clock */}
            <div
              className="ops-mono header-clock"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#374151',
                background: '#F3F4F6',
                padding: '0.35rem 0.75rem',
                borderRadius: 8,
                border: '1px solid #E5E7EB',
              }}
              title="LogiSphere Operational Telemetry Time (12-hour)"
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#10B981',
                }}
              />
              <span>{liveTime || '12:00:00 AM'}</span>
            </div>

            {/* Active Emergency SOS Alert Pill */}
            {activeAlertCount > 0 && (
              <button
                type="button"
                onClick={() => setCurrentRoute('alerts')}
                className="header-sos-pill"
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
                <span className="header-sos-text">{activeAlertCount} SOS Alert Active</span>
                <span className="header-sos-badge">{activeAlertCount}</span>
              </button>
            )}

            {/* Role Badge */}
            <div
              className="header-role-badge"
              style={{
                background: '#FEF3C7',
                color: '#92400E',
                border: '1px solid #FDE68A',
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
              <span>Fleet Manager</span>
            </div>

            {/* User Profile Pill */}
            <button
              type="button"
              onClick={() => setCurrentRoute('profile')}
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
                DM
              </div>
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="app-content">{renderScreen()}</main>
      </div>
    </div>
  );
};
