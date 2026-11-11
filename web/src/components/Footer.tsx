import React from 'react';
import { ShieldCheck, Circle } from 'lucide-react';

interface FooterProps {
  onNavigate: (route: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const handleNav = (route: string, e: React.MouseEvent) => {
    e.preventDefault();
    onNavigate(route);
  };

  return (
    <footer className="saas-footer">
      <div className="saas-container">
        <div className="saas-footer-grid">
          {/* Brand Column */}
          <div className="saas-footer-brand">
            <a
              href="#/"
              className="saas-brand"
              onClick={(e) => handleNav('home', e)}
              style={{ marginBottom: '0.5rem' }}
            >
              <img
                src="/logo.png"
                alt="LogiSphere AI"
                style={{
                  width: 32,
                  height: 32,
                  objectFit: 'contain',
                  borderRadius: 6,
                }}
              />
              <div className="saas-brand-text">
                LogiSphere <span style={{ color: '#F59E0B' }}>AI</span>
              </div>
            </a>
            <p>
              Intelligent Fleet Management. Smarter Logistics. Better Decisions.
              A unified platform for tracking, operations, maintenance, and enterprise carbon intelligence.
            </p>
            <div style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10B981', fontSize: '0.8rem', fontWeight: 600 }}>
              <Circle size={8} fill="#10B981" />
              All Core Telemetry & Dispatch Services Operational
            </div>
          </div>

          {/* Product Links */}
          <div className="saas-footer-col">
            <h4>Platform</h4>
            <ul className="saas-footer-links">
              <li>
                <a href="#/features" className="saas-footer-link" onClick={(e) => handleNav('features', e)}>
                  Fleet Management
                </a>
              </li>
              <li>
                <a href="#/features" className="saas-footer-link" onClick={(e) => handleNav('features', e)}>
                  Live GPS Tracking
                </a>
              </li>
              <li>
                <a href="#/features" className="saas-footer-link" onClick={(e) => handleNav('features', e)}>
                  Trip Dispatch & Routing
                </a>
              </li>
              <li>
                <a href="#/features" className="saas-footer-link" onClick={(e) => handleNav('features', e)}>
                  Geofenced Attendance
                </a>
              </li>
              <li>
                <a href="#/features" className="saas-footer-link" onClick={(e) => handleNav('features', e)}>
                  Carbon Intelligence
                </a>
              </li>
            </ul>
          </div>

          {/* Resources & Status */}
          <div className="saas-footer-col">
            <h4>Access & Status</h4>
            <ul className="saas-footer-links">
              <li>
                <a href="#/signin" className="saas-footer-link" onClick={(e) => handleNav('signin', e)}>
                  Sign In
                </a>
              </li>
              <li>
                <a href="#/signup" className="saas-footer-link" onClick={(e) => handleNav('signup', e)}>
                  Register Organization
                </a>
              </li>
              <li>
                <a href="#/check-status" className="saas-footer-link" onClick={(e) => handleNav('check-status', e)}>
                  Check Application Status
                </a>
              </li>
              <li>
                <a href="#/demo-dashboard" className="saas-footer-link" onClick={(e) => handleNav('demo-dashboard', e)}>
                  Static Demo Preview
                </a>
              </li>
              <li>
                <a href="#/admin" className="saas-footer-link" onClick={(e) => handleNav('admin', e)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <ShieldCheck size={13} />
                  Platform Admin
                </a>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div className="saas-footer-col">
            <h4>Company</h4>
            <ul className="saas-footer-links">
              <li>
                <a href="#/about" className="saas-footer-link" onClick={(e) => handleNav('about', e)}>
                  About LogiSphere
                </a>
              </li>
              <li>
                <a href="#/contact" className="saas-footer-link" onClick={(e) => handleNav('contact', e)}>
                  Contact Enterprise Sales
                </a>
              </li>
              <li>
                <a href="#/about" className="saas-footer-link" onClick={(e) => handleNav('about', e)}>
                  Security & Compliance
                </a>
              </li>
              <li>
                <a href="#/features" className="saas-footer-link" onClick={(e) => handleNav('features', e)}>
                  Multi-Tenant RBAC
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="saas-footer-bottom">
          <div>
            &copy; {new Date().getFullYear()} LogiSphere AI Inc. All rights reserved. Enterprise Fleet OS.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <span>Built with precision for mission-critical logistics</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
