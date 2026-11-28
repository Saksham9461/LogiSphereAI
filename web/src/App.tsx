// ==============================================================================
// LogiSphere AI — Complete SaaS Website & Authenticated Application Entry
// Comprehensive Enterprise Platform Routing:
// Public Marketing Routes:
// - #/ or #/home           : SaaS Enterprise Landing Page
// - #/features             : Deep-Dive Product Capabilities
// - #/about                : Mission, Architecture & Security
// - #/contact              : Enterprise Consultation Inquiry
// - #/signin               : Authenticated Sign In Experience (POST /api/auth/login)
// - #/signup or #/register : Preserved Multi-Tenant Organization Registration
// - #/check-status         : Dedicated Application & Approval Status Lookup
// - #/demo-dashboard       : Simulated Executive Console Preview
// - #/registration-success : Preserved Registration Confirmation
// - #/admin                : Protected Platform Admin Approval Portal
// Authenticated Operations Modules (Guarded by RBAC & Session State):
// - #/dashboard            : Fleet Operations Command Console
// - #/vehicles             : Commercial Fleet Registry (CRUD)
// - #/drivers              : Driver Operations Roster & Credentials
// - #/trips                : Trip Dispatcher, Delay AI & Weather
// - #/tracking             : Live GIS Telematics & WebSocket Stream
// - #/attendance           : Geofenced Shift Verification & Reports
// - #/maintenance          : Maintenance Work Orders & Predictive Health
// - #/fuel-expenses        : Fuel Logs & Expense Accounting
// - #/alerts               : Emergency SOS Incident Command
// - #/chat                 : Real-time Team Communications
// - #/ai                   : AI Fleet Operations Assistant (Gemini)
// - #/carbon               : Carbon Intelligence & Decarbonization
// - #/profile              : Account Profile & Password Management
// ==============================================================================

import { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { Features } from './pages/Features';
import { About } from './pages/About';
import { Contact } from './pages/Contact';
import { Support } from './pages/Support';
import { Security } from './pages/Security';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { TermsOfService } from './pages/TermsOfService';
import { SignIn } from './pages/SignIn';
import { DemoShell } from './pages/demo/DemoShell';
import { CheckStatus } from './pages/CheckStatus';
import { OrganizationRegistration } from './pages/OrganizationRegistration';
import { RegistrationConfirmation } from './pages/RegistrationConfirmation';
import { AdminLogin } from './pages/admin/AdminLogin';
import { AdminApprovalDashboard } from './pages/admin/AdminApprovalDashboard';
import { adminService } from './services/adminService';
import { alertService } from './services/alertService';
import { chatService } from './services/chatService';
import { InAppNotificationBanner } from './components/notifications/InAppNotificationBanner';
import { notificationStore } from './stores/notificationStore';

// Authenticated Application Views
import { AppShell } from './components/app/AppShell';
import { DashboardView } from './pages/app/DashboardView';
import { VehiclesView } from './pages/app/VehiclesView';
import { DriversView } from './pages/app/DriversView';
import { AddStaffView } from './pages/app/AddStaffView';
import { TripsView } from './pages/app/TripsView';
import { LiveTrackingView } from './pages/app/LiveTrackingView';
import { AttendanceView } from './pages/app/AttendanceView';
import { MaintenanceView } from './pages/app/MaintenanceView';
import { FuelExpenseView } from './pages/app/FuelExpenseView';
import { AlertsView } from './pages/app/AlertsView';
import { ChatView } from './pages/app/ChatView';
import { AIAssistantView } from './pages/app/AIAssistantView';
import { CarbonView } from './pages/app/CarbonView';
import { ProfileView } from './pages/app/ProfileView';
import { AnalyticsView } from './pages/app/AnalyticsView';

import { useAuth } from './stores/authStore';
import { isRouteAllowed } from './utils/rbac';
import type { OrgRegistrationResponseData, AdminUser } from './types';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { AppSplashScreen } from './components/Loader';

const APP_ROUTES = new Set([
  'dashboard',
  'vehicles',
  'drivers',
  'add-staff',
  'trips',
  'tracking',
  'attendance',
  'maintenance',
  'fuel-expenses',
  'alerts',
  'chat',
  'ai',
  'carbon',
  'profile',
  'analytics',
]);

export function App() {
  const { user, isAuthenticated, loading: authLoading, logout } = useAuth();
  const [route, setRoute] = useState<string>('home');
  const [registeredOrg, setRegisteredOrg] = useState<OrgRegistrationResponseData | null>(() => {
    try {
      const saved = sessionStorage.getItem('last_registered_org');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [checkingSession, setCheckingSession] = useState<boolean>(true);

  // 1. Session verification: Check active platform admin session on boot
  useEffect(() => {
    let isMounted = true;
    adminService.verifyAdminSession().then((verifiedAdmin) => {
      if (isMounted) {
        if (verifiedAdmin) {
          setAdminUser(verifiedAdmin);
        }
        setCheckingSession(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Global real-time WebSocket connection for in-website notifications across ALL screens
  useEffect(() => {
    const cleanupAlerts = alertService.connectAlertsWs({
      onAlertCreated: (data: any) => {
        notificationStore.pushNotification({
          type: 'ALERT',
          title: 'Emergency Distress Signal Broadcast',
          message: data?.message || 'Driver distress signal requires immediate dispatcher acknowledgment.',
          driverName: data?.driverName ? `Driver: ${data.driverName}` : 'Driver Distress Signal',
          vehiclePlate: data?.vehicleId || undefined,
          routeTarget: 'alerts',
          alertId: data?.id,
        });
      },
    });

    const cleanupChat = chatService.connectChatWs({
      onMessageReceived: (data: any) => {
        notificationStore.pushNotification({
          type: 'CHAT',
          title: 'Team Dispatch Message',
          message: data?.message || 'New dispatch message received.',
          senderName: data?.senderName || 'Colleague',
          routeTarget: 'chat',
          conversationId: data?.conversationId,
        });
      },
    });

    return () => {
      cleanupAlerts();
      cleanupChat();
    };
  }, []);

  // 2. Hash router: sync with URL hash, handle deep links and back/forward navigation
  const syncRouteWithHash = useCallback(() => {
    const rawHash = window.location.hash.replace(/^#\/?/, '').trim();
    const currentPath = rawHash.split('?')[0].toLowerCase();

    if (!currentPath || currentPath === 'home' || currentPath === 'explore' || currentPath === 'platform') {
      setRoute('home');
    } else if (currentPath === 'features') {
      setRoute('features');
    } else if (currentPath === 'about') {
      setRoute('about');
    } else if (currentPath === 'contact' || currentPath === 'contact-sales' || currentPath === 'sales') {
      setRoute('contact');
    } else if (currentPath === 'support' || currentPath === 'contact-support' || currentPath === 'help') {
      setRoute('support');
    } else if (currentPath === 'security' || currentPath === 'compliance' || currentPath === 'security-compliance') {
      setRoute('security');
    } else if (currentPath === 'privacy' || currentPath === 'privacy-policy') {
      setRoute('privacy');
    } else if (currentPath === 'terms' || currentPath === 'terms-of-service') {
      setRoute('terms');
    } else if (currentPath === 'signin' || currentPath === 'login') {
      if (isAuthenticated) {
        setRoute('dashboard');
      } else {
        setRoute('signin');
      }
    } else if (currentPath === 'signup' || currentPath === 'register') {
      setRoute('signup');
    } else if (currentPath === 'check-status' || currentPath === 'status') {
      setRoute('check-status');
    } else if (currentPath === 'demo-dashboard' || currentPath === 'dashboard-preview' || currentPath === 'demo') {
      setRoute('demo-dashboard');
    } else if (currentPath === 'registration-success') {
      let currentOrg = registeredOrg;
      if (!currentOrg) {
        try {
          const saved = sessionStorage.getItem('last_registered_org');
          if (saved) {
            currentOrg = JSON.parse(saved);
            setRegisteredOrg(currentOrg);
          }
        } catch {
          currentOrg = null;
        }
      }

      if (currentOrg) {
        setRoute('registration-success');
      } else {
        window.location.hash = '#/signup';
      }
    } else if (currentPath.startsWith('admin')) {
      setRoute('admin');
    } else if (APP_ROUTES.has(currentPath)) {
      if (!isAuthenticated && !authLoading) {
        window.location.hash = '#/signin';
        setRoute('signin');
      } else {
        setRoute(currentPath);
      }
    } else {
      // Default fallback for unknown routes: redirect to Home
      setRoute('home');
    }
  }, [registeredOrg, isAuthenticated, authLoading]);

  useEffect(() => {
    syncRouteWithHash();
    window.addEventListener('hashchange', syncRouteWithHash);
    return () => window.removeEventListener('hashchange', syncRouteWithHash);
  }, [syncRouteWithHash]);

  const handleNavigate = (newRoute: string) => {
    setRoute(newRoute);
    window.location.hash = `#/${newRoute}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRegistrationSuccess = (data: OrgRegistrationResponseData) => {
    try {
      sessionStorage.setItem('last_registered_org', JSON.stringify(data));
    } catch {
      // safely ignored
    }
    setRegisteredOrg(data);
    setRoute('registration-success');
    window.location.hash = '#/registration-success';
  };

  const handleRegisterAnother = () => {
    setRegisteredOrg(null);
    try {
      sessionStorage.removeItem('last_registered_org');
    } catch {
      // safely ignored
    }
    setRoute('signup');
    window.location.hash = '#/signup';
  };

  const handleSignInSuccess = (_email: string) => {
    setRoute('dashboard');
    window.location.hash = '#/dashboard';
  };

  const handleSignOut = async () => {
    await logout();
    setRoute('home');
    window.location.hash = '#/home';
  };

  const handleDemoSignOut = () => {
    setRoute('home');
    window.location.hash = '#/home';
  };

  const handleAdminLoginSuccess = (admin: AdminUser) => {
    setAdminUser(admin);
    window.location.hash = '#/admin';
  };

  const handleAdminLogout = () => {
    adminService.logoutAdmin();
    setAdminUser(null);
    window.location.hash = '#/admin';
  };

  const renderScreen = () => {
    // Route: `#/admin` (Platform Governance & Approval Dashboard)
    if (route === 'admin') {
      if (checkingSession) {
        return (
          <AppSplashScreen
            title="LogiSphere Admin"
            subtitle="Verifying platform administrator credentials..."
          />
        );
      }

      if (!adminUser) {
        return (
          <AdminLogin
            onSuccess={handleAdminLoginSuccess}
            onExit={() => handleNavigate('home')}
          />
        );
      }

      return (
        <AdminApprovalDashboard
          adminUser={adminUser}
          onLogout={handleAdminLogout}
        />
      );
    }

    // Route: `#/demo-dashboard` or `#/demo` (Simulated Executive Interactive Demo Replica)
    if (route === 'demo-dashboard') {
      return (
        <DemoShell
          onSignOut={handleDemoSignOut}
          onNavigateHome={() => handleNavigate('home')}
        />
      );
    }

    // Authenticated Operations Application (Inside Executive AppShell)
    if (APP_ROUTES.has(route)) {
      if (authLoading) {
        return (
          <AppSplashScreen
            title="LogiSphere AI"
            subtitle="Verifying operational fleet session..."
          />
        );
      }

      if (isAuthenticated) {
        const isAllowed = isRouteAllowed(user?.role, route);

        return (
          <AppShell currentRoute={route} onNavigate={handleNavigate} onSignOut={handleSignOut}>
            {!isAllowed ? (
              <div className="app-card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
                <div style={{ background: '#FEE2E2', width: 56, height: 56, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
                  <ShieldAlert size={28} color="#DC2626" />
                </div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#111827', marginBottom: '0.5rem' }}>
                  Access Restricted
                </h2>
                <p style={{ color: '#4B5563', maxWidth: 460, margin: '0 auto 1.5rem auto', fontSize: '0.9rem', lineHeight: 1.5 }}>
                  Your assigned role (<strong>{user?.role?.replace(/ROLE_/g, '').replace(/_/g, ' ')}</strong>) does not have authorization to view this module.
                </p>
                <button
                  type="button"
                  onClick={() => handleNavigate('dashboard')}
                  className="btn-primary"
                >
                  <ArrowLeft size={16} />
                  <span>Return to Command Console</span>
                </button>
              </div>
            ) : (
              <>
                {route === 'dashboard' && <DashboardView onNavigate={handleNavigate} />}
                {route === 'vehicles' && <VehiclesView />}
                {route === 'drivers' && <DriversView onNavigate={handleNavigate} />}
                {route === 'add-staff' && <AddStaffView onNavigate={handleNavigate} />}
                {route === 'trips' && <TripsView />}
                {route === 'tracking' && <LiveTrackingView />}
                {route === 'attendance' && <AttendanceView />}
                {route === 'maintenance' && <MaintenanceView />}
                {route === 'fuel-expenses' && <FuelExpenseView />}
                {route === 'alerts' && <AlertsView />}
                {route === 'chat' && <ChatView />}
                {route === 'ai' && <AIAssistantView onNavigate={handleNavigate} />}
                {route === 'carbon' && <CarbonView />}
                {route === 'profile' && <ProfileView />}
                {route === 'analytics' && <AnalyticsView />}
              </>
            )}
          </AppShell>
        );
      }
    }

    // Render SaaS Website Shell (Navbar + Content + Footer)
    return (
      <div className="saas-layout">
        <Navbar currentRoute={route} onNavigate={handleNavigate} />

        <main style={{ minHeight: 'calc(100vh - 72px - 280px)' }}>
          {route === 'home' && <Home onNavigate={handleNavigate} />}
          {route === 'features' && <Features onNavigate={handleNavigate} />}
          {route === 'about' && <About onNavigate={handleNavigate} />}
          {route === 'contact' && <Contact onNavigate={handleNavigate} />}
          {route === 'support' && <Support onNavigate={handleNavigate} />}
          {route === 'security' && <Security onNavigate={handleNavigate} />}
          {route === 'privacy' && <PrivacyPolicy onNavigate={handleNavigate} />}
          {route === 'terms' && <TermsOfService onNavigate={handleNavigate} />}
          {route === 'signin' && (
            <SignIn
              onNavigate={handleNavigate}
              onLoginSuccess={handleSignInSuccess}
            />
          )}
          {route === 'signup' && (
            <div style={{ padding: '2.5rem 1rem 4rem' }}>
              <OrganizationRegistration
                onSuccess={handleRegistrationSuccess}
                onNavigateStatus={() => handleNavigate('check-status')}
              />
            </div>
          )}
          {route === 'check-status' && <CheckStatus onNavigate={handleNavigate} />}
          {route === 'registration-success' && registeredOrg && (
            <div style={{ padding: '2.5rem 1rem 4rem' }}>
              <RegistrationConfirmation
                data={registeredOrg}
                onRegisterAnother={handleRegisterAnother}
              />
            </div>
          )}
        </main>

        <Footer onNavigate={handleNavigate} />
      </div>
    );
  };

  return (
    <>
      <InAppNotificationBanner onNavigate={handleNavigate} />
      {renderScreen()}
    </>
  );
}

export default App;
