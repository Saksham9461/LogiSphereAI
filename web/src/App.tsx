// ==============================================================================
// LogiSphere AI — Clean Web Application & Routing Entry
// Strictly adheres to minimal architecture:
// 1. Public organization registration: #/register
// 2. Registration confirmation: #/registration-success
// 3. Protected admin approval portal: #/admin
// Root route #/ and unknown/old dashboard routes redirect to #/register
// ==============================================================================

import { useState, useEffect } from 'react';
import { OrganizationRegistration } from './pages/OrganizationRegistration';
import { RegistrationConfirmation } from './pages/RegistrationConfirmation';
import { AdminLogin } from './pages/admin/AdminLogin';
import { AdminApprovalDashboard } from './pages/admin/AdminApprovalDashboard';
import { adminService } from './services/adminService';
import type { OrgRegistrationResponseData, AdminUser } from './types';

export function App() {
  const [route, setRoute] = useState<string>('register');
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

  // 2. Hash router: sync with URL hash, handle redirects
  useEffect(() => {
    const handleHashSync = () => {
      const rawHash = window.location.hash.replace(/^#\/?/, '').trim();
      const currentPath = rawHash.split('?')[0];

      if (currentPath === 'register') {
        setRoute('register');
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
          // If no successful registration data, redirect to registration
          window.location.hash = '#/register';
        }
      } else if (currentPath.startsWith('admin')) {
        setRoute('admin');
      } else {
        // Root route #/ and unknown or old dashboard routes redirect to #/register
        window.location.hash = '#/register';
      }
    };

    handleHashSync();
    window.addEventListener('hashchange', handleHashSync);
    return () => window.removeEventListener('hashchange', handleHashSync);
  }, [registeredOrg]);

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
    setRoute('register');
    window.location.hash = '#/register';
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

  // Route: `#/admin`
  if (route === 'admin') {
    if (checkingSession) {
      return (
        <div
          style={{
            minHeight: '100vh',
            background: '#0a0f1d',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94a3b8',
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
          onExit={() => {
            window.location.hash = '#/register';
          }}
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

  // Route: `#/registration-success`
  const activeRegisteredOrg =
    registeredOrg ||
    (() => {
      try {
        const saved = sessionStorage.getItem('last_registered_org');
        return saved ? JSON.parse(saved) : null;
      } catch {
        return null;
      }
    })();

  if (route === 'registration-success' && activeRegisteredOrg) {
    return (
      <div className="public-portal-wrapper">
        <header className="public-header-bar">
          <div className="public-header-brand">
            <span style={{ color: '#3b82f6', fontWeight: 800 }}>LogiSphere</span> AI
          </div>
          <span className="public-header-tag">Registration Status</span>
        </header>
        <RegistrationConfirmation
          data={activeRegisteredOrg}
          onRegisterAnother={handleRegisterAnother}
        />
      </div>
    );
  }

  // Route: `#/register` (Default & Redirect Target)
  return (
    <div className="public-portal-wrapper">
      <header className="public-header-bar">
        <div className="public-header-brand">
          <span style={{ color: '#3b82f6', fontWeight: 800 }}>LogiSphere</span> AI
        </div>
        <span className="public-header-tag">Company Onboarding</span>
      </header>
      <OrganizationRegistration
        onSuccess={handleRegistrationSuccess}
      />
    </div>
  );
}

export default App;
