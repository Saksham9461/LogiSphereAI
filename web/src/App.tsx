// ==============================================================================
// LogiSphere AI — Complete SaaS Website & Routing Entry
// Professional Enterprise Platform Navigation:
// - #/ or #/home           : SaaS Enterprise Landing Page
// - #/features             : Deep-Dive Product Capabilities
// - #/about                : Mission, Architecture & Security
// - #/contact              : Enterprise Consultation Inquiry
// - #/signin               : Static Sign In Experience (Navigates to Demo Dashboard)
// - #/signup or #/register : Preserved Multi-Tenant Organization Registration
// - #/check-status         : Dedicated Application & Approval Status Lookup
// - #/demo-dashboard       : Simulated Executive Console with Static Telemetry
// - #/registration-success : Preserved Registration Confirmation
// - #/admin                : Protected Platform Admin Approval Portal
// ==============================================================================

import { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { Features } from './pages/Features';
import { About } from './pages/About';
import { Contact } from './pages/Contact';
import { SignIn } from './pages/SignIn';
import { DemoDashboard } from './pages/DemoDashboard';
import { CheckStatus } from './pages/CheckStatus';
import { OrganizationRegistration } from './pages/OrganizationRegistration';
import { RegistrationConfirmation } from './pages/RegistrationConfirmation';
import { AdminLogin } from './pages/admin/AdminLogin';
import { AdminApprovalDashboard } from './pages/admin/AdminApprovalDashboard';
import { adminService } from './services/adminService';
import type { OrgRegistrationResponseData, AdminUser } from './types';

export function App() {
  const [route, setRoute] = useState<string>('home');
  const [demoUserEmail, setDemoUserEmail] = useState<string>('manager@logisphere.ai');
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
    adminService.verifyAdminSession().then(verifiedAdmin => {
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

  // 2. Hash router: sync with URL hash, handle deep links and back/forward navigation
  const syncRouteWithHash = useCallback(() => {
    const rawHash = window.location.hash.replace(/^#\/?/, '').trim();
    const currentPath = rawHash.split('?')[0].toLowerCase();

    if (!currentPath || currentPath === 'home') {
      setRoute('home');
    } else if (currentPath === 'features') {
      setRoute('features');
    } else if (currentPath === 'about') {
      setRoute('about');
    } else if (currentPath === 'contact') {
      setRoute('contact');
    } else if (currentPath === 'signin' || currentPath === 'login') {
      setRoute('signin');
    } else if (currentPath === 'signup' || currentPath === 'register') {
      setRoute('signup');
    } else if (currentPath === 'check-status' || currentPath === 'status') {
      setRoute('check-status');
    } else if (currentPath === 'demo-dashboard' || currentPath === 'dashboard-preview') {
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
    } else {
      // Default fallback for unknown routes: redirect to Home
      setRoute('home');
    }
  }, [registeredOrg]);

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

  const handleSignInSuccess = (email: string) => {
    setDemoUserEmail(email);
    setRoute('demo-dashboard');
    window.location.hash = '#/demo-dashboard';
  };

  const handleDemoSignOut = () => {
    setRoute('signin');
    window.location.hash = '#/signin';
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

  // Route: `#/admin` (Platform Governance & Approval Dashboard)
  if (route === 'admin') {
    if (checkingSession) {
      return (
        <div
          style={{
            minHeight: '100vh',
            background: '#F3F4F6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#4B5563',
            fontSize: '0.9rem',
          }}
        >
          <span>Verifying administrator session...</span>
        </div>
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

  // Route: `#/demo-dashboard` (Simulated Executive Dashboard Preview)
  if (route === 'demo-dashboard') {
    return (
      <DemoDashboard
        userEmail={demoUserEmail}
        onSignOut={handleDemoSignOut}
        onNavigateHome={() => handleNavigate('home')}
      />
    );
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
}

export default App;
