import React, { useState, useEffect } from 'react';
import { Menu, X, ArrowRight } from 'lucide-react';
import { NotificationBellDropdown } from './notifications/NotificationBellDropdown';

interface NavbarProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentRoute, onNavigate }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Home', route: 'home' },
    { label: 'Features', route: 'features' },
    { label: 'About', route: 'about' },
    { label: 'Contact', route: 'contact' },
    { label: 'Check Status', route: 'check-status' },
  ];

  const handleLinkClick = (route: string) => {
    onNavigate(route);
    setMobileMenuOpen(false);
  };

  const isLinkActive = (route: string) => {
    if (route === 'home') {
      return currentRoute === 'home' || currentRoute === '' || currentRoute === 'root';
    }
    return currentRoute === route;
  };

  // Prevent background scrolling on small devices when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.classList.add('sidebar-open');
      document.documentElement.classList.add('sidebar-open');
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.classList.remove('sidebar-open');
        document.documentElement.classList.remove('sidebar-open');
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [mobileMenuOpen]);

  return (
    <header className="saas-navbar">
      <div className="saas-container">
        <div className="saas-nav-inner">
          {/* Brand Logo */}
          <a
            href="#/"
            className="saas-brand"
            onClick={(e) => {
              e.preventDefault();
              handleLinkClick('home');
            }}
          >
            <img
              src="/logo.png"
              alt="LogiSphere AI"
              style={{
                width: 36,
                height: 36,
                objectFit: 'contain',
                borderRadius: 8,
              }}
            />
            <div className="saas-brand-text">
              LogiSphere <span style={{ color: '#F59E0B' }}>AI</span>
            </div>
          </a>

          {/* Desktop Navigation Links */}
          <nav className="saas-nav-links" aria-label="Main Navigation">
            {navLinks.map((item) => (
              <a
                key={item.route}
                href={`#/${item.route}`}
                className={`saas-nav-link ${isLinkActive(item.route) ? 'active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  handleLinkClick(item.route);
                }}
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Action CTAs */}
          <div className="saas-nav-actions">
            <NotificationBellDropdown onNavigate={handleLinkClick} />
            <a
              href="#/signin"
              className="saas-btn saas-btn-outline saas-btn-sm"
              onClick={(e) => {
                e.preventDefault();
                handleLinkClick('signin');
              }}
            >
              Sign In
            </a>
            <a
              href="#/signup"
              className="saas-btn saas-btn-primary saas-btn-sm"
              onClick={(e) => {
                e.preventDefault();
                handleLinkClick('signup');
              }}
            >
              Get Started
              <ArrowRight size={14} />
            </a>
          </div>

          {/* Mobile Right Controls: Notification Bell + Hamburger Toggle */}
          <div style={{ display: 'none', alignItems: 'center', gap: '0.5rem' }} className="saas-mobile-actions">
            <NotificationBellDropdown onNavigate={handleLinkClick} />
            <button
              type="button"
              className="saas-mobile-toggle"
              aria-label="Toggle navigation menu"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="saas-mobile-menu">
          {navLinks.map((item) => (
            <a
              key={item.route}
              href={`#/${item.route}`}
              className={`saas-mobile-link ${isLinkActive(item.route) ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                handleLinkClick(item.route);
              }}
            >
              {item.label}
            </a>
          ))}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
            <a
              href="#/signin"
              className="saas-btn saas-btn-outline"
              onClick={(e) => {
                e.preventDefault();
                handleLinkClick('signin');
              }}
            >
              Sign In
            </a>
            <a
              href="#/signup"
              className="saas-btn saas-btn-primary"
              onClick={(e) => {
                e.preventDefault();
                handleLinkClick('signup');
              }}
            >
              Get Started (Sign Up)
              <ArrowRight size={14} />
            </a>
          </div>
        </div>
      )}
    </header>
  );
};

