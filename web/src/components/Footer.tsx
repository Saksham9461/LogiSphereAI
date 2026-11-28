import React from 'react';
import { Circle, ExternalLink } from 'lucide-react';

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

          {/* 1. PLATFORM */}
          <div className="saas-footer-col">
            <h4>Platform</h4>
            <ul className="saas-footer-links">
              <li>
                <a href="#/home" className="saas-footer-link" onClick={(e) => handleNav('home', e)}>
                  Explore Platform
                </a>
              </li>
              <li>
                <a href="#/features" className="saas-footer-link" onClick={(e) => handleNav('features', e)}>
                  Product Features
                </a>
              </li>
              <li>
                <a href="#/demo-dashboard" className="saas-footer-link" onClick={(e) => handleNav('demo-dashboard', e)}>
                  Interactive Demo
                </a>
              </li>
            </ul>
          </div>

          {/* 2. RESOURCES */}
          <div className="saas-footer-col">
            <h4>Resources</h4>
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
                  Application Status
                </a>
              </li>
              <li>
                <a href="#/support" className="saas-footer-link" onClick={(e) => handleNav('support', e)}>
                  Contact Support
                </a>
              </li>
            </ul>
          </div>

          {/* 3. COMPANY */}
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
                <a href="#/security" className="saas-footer-link" onClick={(e) => handleNav('security', e)}>
                  Security & Compliance
                </a>
              </li>
              <li>
                <a href="#/privacy" className="saas-footer-link" onClick={(e) => handleNav('privacy', e)}>
                  Privacy Policy
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom Section */}
        <div className="saas-footer-bottom">
          <div>
            &copy; 2026 LogiSphere AI. All rights reserved.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
            <a
              href="#/terms"
              className="saas-footer-link"
              onClick={(e) => handleNav('terms', e)}
            >
              Terms of Service
            </a>
            <span style={{ color: '#D1D5DB' }}>&bull;</span>
            <a
              href="https://www.linkedin.com/company/logisphere-ai"
              target="_blank"
              rel="noopener noreferrer"
              className="saas-footer-link"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              title="LogiSphere AI on LinkedIn"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ flexShrink: 0 }}>
                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.69 1.69 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.74v-8.37H5.07v8.37h2.78z" />
              </svg>
              <span>LinkedIn</span>
              <ExternalLink size={12} style={{ opacity: 0.7 }} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
