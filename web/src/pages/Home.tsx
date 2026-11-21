import React, { useState } from 'react';
import {
  Truck,
  Users,
  Navigation,
  MapPin,
  Clock,
  Wrench,
  Fuel,
  Receipt,
  AlertTriangle,
  MessageSquare,
  Sparkles,
  TrendingUp,
  Leaf,
  ShieldCheck,
  Building2,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Activity,
  Layers,
  Cpu,
} from 'lucide-react';

interface HomeProps {
  onNavigate: (route: string) => void;
}

export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const capabilities = [
    {
      icon: <Truck size={22} />,
      title: 'Fleet Management',
      desc: 'Centralized registry of heavy commercial trucks, vans, and utility vehicles with load capacities, status lifecycles, and odometer history.',
      colorClass: '',
    },
    {
      icon: <Users size={22} />,
      title: 'Driver Management',
      desc: 'Driver profiles, licensing verification, compliance expiry tracking, safety scores, and real-time duty status management.',
      colorClass: 'teal',
    },
    {
      icon: <Navigation size={22} />,
      title: 'Trip Management & Dispatch',
      desc: 'End-to-end trip lifecycle from draft scheduling to cargo loading, dispatch approvals, active routing, and trip completion.',
      colorClass: 'indigo',
    },
    {
      icon: <MapPin size={22} />,
      title: 'Live GPS Tracking',
      desc: 'Streaming GPS telemetry and coordinates with breadcrumb navigation and WebSocket tracking feeds across active journeys.',
      colorClass: 'emerald',
    },
    {
      icon: <Clock size={22} />,
      title: 'Geofenced Attendance',
      desc: 'Automated clock-in and clock-out with coordinate validation against company operating hubs, geofence radius checks, and exception logging.',
      colorClass: 'amber',
    },
    {
      icon: <Wrench size={22} />,
      title: 'Vehicle Maintenance Management',
      desc: 'Scheduled servicing, preventative work orders, component repair logs, and maintenance cost accounting per vehicle.',
      colorClass: 'rose',
    },
    {
      icon: <Fuel size={22} />,
      title: 'Fuel Management',
      desc: 'Fuel refill logs with odometer verification, fuel volume tracking, fueling cost calculation, and mileage efficiency analysis.',
      colorClass: 'amber',
    },
    {
      icon: <Receipt size={22} />,
      title: 'Expense Management',
      desc: 'Itemized operational ledger covering tolls, highway transit permits, driver allowances, and per-trip cost attribution.',
      colorClass: 'teal',
    },
    {
      icon: <AlertTriangle size={22} />,
      title: 'Emergency SOS Alerts',
      desc: 'Instant driver emergency distress triggers with offline queue synchronization, dispatcher push alerts, and rapid resolution tracking.',
      colorClass: 'rose',
    },
    {
      icon: <MessageSquare size={22} />,
      title: 'Internal Team Communication',
      desc: 'Encrypted, channel-based chat between fleet managers, dispatch coordinators, and on-duty drivers directly inside the platform.',
      colorClass: 'indigo',
    },
    {
      icon: <Sparkles size={22} />,
      title: 'AI-Powered Insights',
      desc: 'Intelligent route recommendation, dynamic delay forecasts, and destination weather intelligence for mission-critical dispatch decisions.',
      colorClass: 'emerald',
    },
    {
      icon: <TrendingUp size={22} />,
      title: 'Predictive Analytics',
      desc: 'Data-driven forecasting for component wear, preventative maintenance triggers, and historical fleet utilization telemetry.',
      colorClass: '',
    },
    {
      icon: <Leaf size={22} />,
      title: 'Carbon Emission Monitoring',
      desc: 'Fleet carbon footprint calculations based on vehicle fuel types, eco-route comparison, and organizational sustainability targets.',
      colorClass: 'teal',
    },
    {
      icon: <ShieldCheck size={22} />,
      title: 'Role-Based Access Control',
      desc: 'Strict authorization matrix separating Fleet Managers, Dispatchers, Safety Officers, Finance Analysts, Drivers, and Platform Admins.',
      colorClass: 'emerald',
    },
    {
      icon: <Building2 size={22} />,
      title: 'Multi-Organization Architecture',
      desc: 'Secure tenant isolation with dedicated organization workspaces, onboarding review workflows, and centralized platform governance.',
      colorClass: 'indigo',
    },
  ];

  const faqs = [
    {
      q: 'How does an organization onboard onto LogiSphere AI?',
      a: 'Organizations submit their company details and initial manager profile via our secure registration portal. Each application is reviewed and approved by platform administrators to ensure regulatory compliance and multi-tenant data segregation before fleet operations begin.',
    },
    {
      q: 'How does the geofenced attendance system work?',
      a: 'During onboarding, your operating headquarters or depot coordinates and geofence radius are configured. When drivers or staff clock in or out via the mobile application, their GPS coordinates are mathematically validated against the site perimeter, flagging any out-of-bounds exceptions.',
    },
    {
      q: 'Can our drivers use the mobile application in areas with poor cellular coverage?',
      a: 'Yes. LogiSphere AI includes an offline emergency queue (SOS sync worker) and resilient local caching. If a driver triggers an SOS or submits critical telemetry while offline, the payload is safely persisted and automatically synced once network connectivity is restored.',
    },
    {
      q: 'What AI capabilities are integrated into trip dispatch?',
      a: 'LogiSphere AI incorporates route recommendation models that analyze distance, vehicle load, and historical travel speeds, paired with live destination weather forecasting and delay prediction to help dispatchers make proactive routing choices.',
    },
    {
      q: 'How is organizational and fleet data secured?',
      a: 'Every database query and API endpoint enforces multi-tenant organization boundaries and cryptographic JSON Web Token verification. Drivers only see their assigned trips, managers govern only their authorized fleet, and platform administrative actions are recorded in immutable audit logs.',
    },
  ];

  return (
    <div className="saas-main-content">
      {/* 1. HERO SECTION */}
      <section className="saas-hero">
        <div className="saas-container">
          <div className="saas-hero-content">
            <span className="saas-badge">
              <Sparkles size={13} />
              Enterprise Fleet Operations System
            </span>

            <h1 className="saas-hero-title">
              Intelligent Fleet Management.{' '}
              <span className="saas-hero-gradient-text">
                Smarter Logistics. Better Decisions.
              </span>
            </h1>

            <p className="saas-hero-subtitle">
              LogiSphere AI unifies fleet telemetry, trip dispatch, geofenced driver attendance,
              preventative maintenance, and carbon intelligence into a high-performance operating system.
            </p>

            <div className="saas-hero-cta">
              <button
                type="button"
                className="saas-btn saas-btn-primary saas-btn-lg"
                onClick={() => onNavigate('signup')}
              >
                Get Started
                <ArrowRight size={16} />
              </button>
              <button
                type="button"
                className="saas-btn saas-btn-secondary saas-btn-lg"
                onClick={() => onNavigate('features')}
              >
                Explore Features
              </button>
              <button
                type="button"
                className="saas-btn saas-btn-outline saas-btn-lg"
                onClick={() => onNavigate('demo-dashboard')}
              >
                <Activity size={16} style={{ color: '#06B6D4' }} />
                View Live Demo
              </button>
            </div>

            <div className="saas-hero-trust">
              <div className="saas-hero-trust-item">
                <CheckCircle2 size={16} style={{ color: '#10B981' }} />
                <span>Multi-Tenant Architecture</span>
              </div>
              <div className="saas-hero-trust-item">
                <CheckCircle2 size={16} style={{ color: '#10B981' }} />
                <span>End-to-End RBAC Security</span>
              </div>
              <div className="saas-hero-trust-item">
                <CheckCircle2 size={16} style={{ color: '#10B981' }} />
                <span>Offline SOS Resilience</span>
              </div>
            </div>
          </div>

          {/* Visually Impressive Fleet Dashboard Preview */}
          <div className="saas-preview-wrap">
            <div className="saas-preview-frame">
              <div className="saas-preview-topbar">
                <div className="saas-preview-dots">
                  <span className="saas-preview-dot red" />
                  <span className="saas-preview-dot yellow" />
                  <span className="saas-preview-dot green" />
                </div>
                <div style={{ fontSize: '0.8rem', color: '#4B5563', fontWeight: 600 }}>
                  LogiSphere Command Center &mdash; Operations Console
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#047857', fontWeight: 600 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }} />
                  Telemetry Live (30s sync)
                </div>
              </div>

              <div className="saas-preview-body">
                {/* Metric Summary Ribbon matching mobile StatCards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div className="ops-stat-card" style={{ '--stat-accent': '#14B8A6' } as any}>
                    <div className="ops-stat-header">
                      <span className="ops-stat-title">Active Fleet</span>
                      <Truck size={15} color="#0F766E" />
                    </div>
                    <div className="ops-stat-value">4 / 5 Active</div>
                    <div className="ops-stat-sub" style={{ color: '#0F766E' }}>80.0% Fleet Utilization</div>
                  </div>

                  <div className="ops-stat-card" style={{ '--stat-accent': '#F59E0B' } as any}>
                    <div className="ops-stat-header">
                      <span className="ops-stat-title">Dispatches</span>
                      <Navigation size={15} color="#B45309" />
                    </div>
                    <div className="ops-stat-value">3 En Route</div>
                    <div className="ops-stat-sub" style={{ color: '#B45309' }}>98.6% On-Schedule Rate</div>
                  </div>

                  <div className="ops-stat-card" style={{ '--stat-accent': '#10B981' } as any}>
                    <div className="ops-stat-header">
                      <span className="ops-stat-title">Geofence Shifts</span>
                      <Clock size={15} color="#065F46" />
                    </div>
                    <div className="ops-stat-value">100% In-Bounds</div>
                    <div className="ops-stat-sub" style={{ color: '#065F46' }}>0 Perimeter Exceptions</div>
                  </div>

                  <div className="ops-stat-card" style={{ '--stat-accent': '#3B82F6' } as any}>
                    <div className="ops-stat-header">
                      <span className="ops-stat-title">Eco Efficiency</span>
                      <Leaf size={15} color="#1D4ED8" />
                    </div>
                    <div className="ops-stat-value">-16.4% CO2</div>
                    <div className="ops-stat-sub" style={{ color: '#1D4ED8' }}>Eco-Route Adherence</div>
                  </div>
                </div>

                {/* Sub-Panel Layout: Live Dispatch Feed & Map Preview */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '1.25rem', textAlign: 'left' }}>
                  {/* Live Dispatch Feed */}
                  <div style={{ background: '#F9FAFB', borderRadius: 10, border: '1px solid #E5E7EB', padding: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#111827' }}>Active Dispatches & GPS Telemetry</span>
                      <span className="ops-status-badge ops-status-ontrip" style={{ fontSize: '0.7rem' }}>Live Stream</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: '#FFFFFF', borderRadius: 8, border: '1px solid #E5E7EB', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                        <div>
                          <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.85rem' }}>
                            <span className="ops-id-box" style={{ marginRight: 6 }}>trp-1001</span>
                            Freightliner Cascadia (TRUCK-11)
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: 2 }}>Warehouse A &rarr; Port City Terminal (Raj Patel)</div>
                        </div>
                        <span className="ops-status-badge ops-status-ontrip" style={{ fontSize: '0.7rem' }}>En Route &bull; 81%</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: '#FFFFFF', borderRadius: 8, border: '1px solid #E5E7EB', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                        <div>
                          <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.85rem' }}>
                            <span className="ops-id-box" style={{ marginRight: 6 }}>trp-1002</span>
                            Volvo FH16 Semi (TRUCK-40)
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: 2 }}>Central Depot A &rarr; Eastern Rail Hub (Marcus Vance)</div>
                        </div>
                        <span className="ops-status-badge ops-status-ontrip" style={{ fontSize: '0.7rem' }}>In Transit &bull; 32%</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: '#FFFFFF', borderRadius: 8, border: '1px solid #E5E7EB', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                        <div>
                          <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.85rem' }}>
                            <span className="ops-id-box" style={{ marginRight: 6 }}>trp-1000</span>
                            Ford Transit Cargo (VAN-05)
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: 2 }}>Regional Depot B &rarr; Warehouse A (Elena Rostova)</div>
                        </div>
                        <span className="ops-status-badge ops-status-completed" style={{ fontSize: '0.7rem' }}>Delivered &bull; 100%</span>
                      </div>
                    </div>
                  </div>

                  {/* Telemetry & Driver Health */}
                  <div style={{ background: '#F9FAFB', borderRadius: 10, border: '1px solid #E5E7EB', padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#111827' }}>AI Route Optimization</span>
                        <Sparkles size={14} color="#D97706" />
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#4B5563', lineHeight: 1.5, marginBottom: '1rem' }}>
                        Autonomous dispatch model analyzed highway precipitation on Route 7 and recommended a low-drag bypass corridor for <strong style={{ color: '#111827' }}>trp-1001</strong>, preventing an estimated 28-minute delay.
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.35rem' }}>
                        <span>Fleet Safety Score</span>
                        <span style={{ color: '#047857', fontWeight: 700 }}>96.4 / 100</span>
                      </div>
                      <div style={{ width: '100%', height: 6, background: '#E5E7EB', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: '96.4%', height: '100%', background: 'linear-gradient(90deg, #10B981, #06B6D4)' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. PRODUCT OVERVIEW */}
      <section className="saas-section" style={{ background: '#F9FAFB' }}>
        <div className="saas-container">
          <div className="saas-section-header">
            <span className="saas-badge">
              <Layers size={13} />
              Unified Operating System
            </span>
            <h2 className="saas-section-title">Engineered for Complete Fleet Control</h2>
            <p className="saas-section-subtitle">
              Eliminate disjointed spreadsheets, paper logbooks, and fragmented tracking links.
              LogiSphere AI integrates your entire operational hierarchy under one enterprise platform.
            </p>
          </div>

          <div className="saas-grid-4">
            <div className="saas-card">
              <div className="saas-card-icon">
                <Truck size={22} />
              </div>
              <h3 className="saas-card-title">Vehicles & Assets</h3>
              <p className="saas-card-desc">
                Full lifecycle management for heavy trucks, vans, and utility units with load specifications and maintenance history.
              </p>
            </div>

            <div className="saas-card">
              <div className="saas-card-icon teal">
                <Users size={22} />
              </div>
              <h3 className="saas-card-title">Drivers & Duty</h3>
              <p className="saas-card-desc">
                Driver records, licensing expiry alerts, real-time safety scores, and geofence-verified shifts.
              </p>
            </div>

            <div className="saas-card">
              <div className="saas-card-icon indigo">
                <Navigation size={22} />
              </div>
              <h3 className="saas-card-title">Trips & Dispatch</h3>
              <p className="saas-card-desc">
                Structured dispatch workflows, cargo weight validation, route recommendations, and live milestone updates.
              </p>
            </div>

            <div className="saas-card">
              <div className="saas-card-icon emerald">
                <MapPin size={22} />
              </div>
              <h3 className="saas-card-title">GPS & Telemetry</h3>
              <p className="saas-card-desc">
                WebSocket-powered location streaming, breadcrumbs, and live delay intelligence across every active transit.
              </p>
            </div>

            <div className="saas-card">
              <div className="saas-card-icon amber">
                <Clock size={22} />
              </div>
              <h3 className="saas-card-title">Attendance & Geofencing</h3>
              <p className="saas-card-desc">
                Strict coordinate radius checks ensuring staff clock in and clock out exclusively inside approved depot boundaries.
              </p>
            </div>

            <div className="saas-card">
              <div className="saas-card-icon rose">
                <AlertTriangle size={22} />
              </div>
              <h3 className="saas-card-title">Emergency SOS</h3>
              <p className="saas-card-desc">
                High-priority incident response with offline queue synchronization for zero packet loss during roadside distress.
              </p>
            </div>

            <div className="saas-card">
              <div className="saas-card-icon teal">
                <Fuel size={22} />
              </div>
              <h3 className="saas-card-title">Fuel & Expenses</h3>
              <p className="saas-card-desc">
                Fuel logs with odometer checks, toll permit tracking, and per-trip cost attribution for precise financial control.
              </p>
            </div>

            <div className="saas-card">
              <div className="saas-card-icon indigo">
                <Cpu size={22} />
              </div>
              <h3 className="saas-card-title">AI & Analytics</h3>
              <p className="saas-card-desc">
                Predictive maintenance forecasts, destination weather intelligence, and carbon emission analytics.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CAPABILITIES & FEATURES SHOWCASE */}
      <section className="saas-section">
        <div className="saas-container">
          <div className="saas-section-header">
            <span className="saas-badge saas-badge-success">
              <CheckCircle2 size={13} />
              Implemented Capabilities
            </span>
            <h2 className="saas-section-title">Built for Production Demands</h2>
            <p className="saas-section-subtitle">
              Every feature below is actively implemented and verified in the LogiSphere AI platform backend
              and mobile application ecosystem.
            </p>
          </div>

          <div className="saas-grid-3">
            {capabilities.map((cap) => (
              <div key={cap.title} className="saas-card">
                <div className={`saas-card-icon ${cap.colorClass}`}>{cap.icon}</div>
                <h3 className="saas-card-title">{cap.title}</h3>
                <p className="saas-card-desc">{cap.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS */}
      <section className="saas-section" style={{ background: '#F9FAFB' }}>
        <div className="saas-container">
          <div className="saas-section-header">
            <span className="saas-badge">
              <Navigation size={13} />
              System Architecture
            </span>
            <h2 className="saas-section-title">How LogiSphere AI Works</h2>
            <p className="saas-section-subtitle">
              From corporate onboarding to live dispatch, LogiSphere streamlines every phase of logistics governance.
            </p>
          </div>

          <div className="saas-grid-4">
            <div className="saas-step-card">
              <div className="saas-step-num">01</div>
              <h3 className="saas-card-title">Onboard Organization</h3>
              <p className="saas-card-desc">
                Register your fleet company, define operating headquarters coordinates, configure geofence radius, and designate the initial manager.
              </p>
            </div>

            <div className="saas-step-card">
              <div className="saas-step-num">02</div>
              <h3 className="saas-card-title">Register Assets & Drivers</h3>
              <p className="saas-card-desc">
                Enroll trucks, vans, and utility units into the registry with load limits and add drivers with verified licenses.
              </p>
            </div>

            <div className="saas-step-card">
              <div className="saas-step-num">03</div>
              <h3 className="saas-card-title">Dispatch with Live AI</h3>
              <p className="saas-card-desc">
                Create trips with AI route assistance, track live GPS streams via WebSockets, and maintain real-time dispatcher chat.
              </p>
            </div>

            <div className="saas-step-card">
              <div className="saas-step-num">04</div>
              <h3 className="saas-card-title">Audit, Maintain & Optimize</h3>
              <p className="saas-card-desc">
                Review maintenance forecasts, verify geofenced attendance logs, track fuel efficiency, and monitor sustainability targets.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. WHY CHOOSE LOGISPHERE AI */}
      <section className="saas-section">
        <div className="saas-container">
          <div className="saas-grid-2" style={{ alignItems: 'center' }}>
            <div>
              <span className="saas-badge">
                <ShieldCheck size={13} />
                Enterprise Reliability
              </span>
              <h2 className="saas-section-title" style={{ textAlign: 'left', marginTop: '1rem' }}>
                Why Logistics Leaders Choose LogiSphere AI
              </h2>
              <p className="saas-card-desc" style={{ fontSize: '1.05rem', marginBottom: '1.75rem' }}>
                Legacy telematics platforms are slow, complex, and uncoordinated. LogiSphere AI delivers
                a reactive, cloud-native architecture that bridges mobile drivers and executive managers.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#D1FAE5', color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid #A7F3D0' }}>
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <h4 style={{ color: '#111827', fontWeight: 600, fontSize: '1rem', marginBottom: '0.25rem' }}>Zero Telemetry Dropouts</h4>
                    <p style={{ color: '#4B5563', fontSize: '0.9rem', lineHeight: 1.5 }}>
                      Mobile offline queueing stores critical SOS alerts and syncs automatically when network reconnects.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#DBEAFE', color: '#1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid #BFDBFE' }}>
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <h4 style={{ color: '#111827', fontWeight: 600, fontSize: '1rem', marginBottom: '0.25rem' }}>Strict Geofence Accuracy</h4>
                    <p style={{ color: '#4B5563', fontSize: '0.9rem', lineHeight: 1.5 }}>
                      Drivers can only clock in when physically within the company geofence radius, reducing attendance fraud.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#CCFBF1', color: '#0F766E', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid #99F6E4' }}>
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <h4 style={{ color: '#111827', fontWeight: 600, fontSize: '1rem', marginBottom: '0.25rem' }}>Proactive Maintenance Forecasts</h4>
                    <p style={{ color: '#4B5563', fontSize: '0.9rem', lineHeight: 1.5 }}>
                      Identify brake, tire, and oil service windows before catastrophic breakdowns halt deliveries.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Impact Metric Box */}
            <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E5E7EB', padding: '2.5rem', boxShadow: 'var(--saas-shadow-card)' }}>
              <div style={{ fontSize: '0.85rem', color: '#B45309', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Operational Efficiency Benchmarks
              </div>

              <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: '#111827', fontWeight: 600 }}>Punctual Delivery Rate</span>
                    <span style={{ color: '#047857', fontWeight: 700 }}>99.4%</span>
                  </div>
                  <div style={{ width: '100%', height: 8, background: '#E5E7EB', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: '99.4%', height: '100%', background: '#10B981' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: '#111827', fontWeight: 600 }}>Unplanned Downtime Reduction</span>
                    <span style={{ color: '#1D4ED8', fontWeight: 700 }}>-38%</span>
                  </div>
                  <div style={{ width: '100%', height: 8, background: '#E5E7EB', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: '78%', height: '100%', background: '#3B82F6' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: '#111827', fontWeight: 600 }}>Fuel & Idle Consumption Savings</span>
                    <span style={{ color: '#0F766E', fontWeight: 700 }}>-18.5%</span>
                  </div>
                  <div style={{ width: '100%', height: 8, background: '#E5E7EB', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: '65%', height: '100%', background: '#14B8A6' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FAQ SECTION */}
      <section className="saas-section" style={{ background: '#F9FAFB' }}>
        <div className="saas-container-narrow">
          <div className="saas-section-header">
            <span className="saas-badge">
              <Users size={13} />
              Clear Answers
            </span>
            <h2 className="saas-section-title">Frequently Asked Questions</h2>
            <p className="saas-section-subtitle">
              Have questions regarding organization onboarding, security, or deployment? Find answers below.
            </p>
          </div>

          <div>
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={faq.q} className="saas-faq-item">
                  <button
                    type="button"
                    className="saas-faq-btn"
                    onClick={() => toggleFaq(idx)}
                    aria-expanded={isOpen}
                  >
                    <span>{faq.q}</span>
                    {isOpen ? <ChevronUp size={18} color="#D97706" /> : <ChevronDown size={18} color="#6B7280" />}
                  </button>
                  {isOpen && <div className="saas-faq-content">{faq.a}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. CTA BANNER */}
      <section className="saas-container">
        <div className="saas-cta-banner">
          <span className="saas-badge" style={{ background: '#FEF3C7', color: '#B45309', borderColor: 'rgba(245, 158, 11, 0.4)' }}>
            Elevate Fleet Operations
          </span>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#111827', margin: '1rem 0 1rem', letterSpacing: '-0.02em' }}>
            Ready to Transform Your Logistics?
          </h2>
          <p style={{ maxWidth: 640, margin: '0 auto 2rem', color: '#4B5563', fontSize: '1.05rem', lineHeight: 1.6 }}>
            Submit your company registration in minutes. Join forward-thinking transport fleets running on LogiSphere AI.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="saas-btn saas-btn-primary saas-btn-lg"
              onClick={() => onNavigate('signup')}
            >
              Register Your Company Now
              <ArrowRight size={16} />
            </button>
            <button
              type="button"
              className="saas-btn saas-btn-secondary saas-btn-lg"
              onClick={() => onNavigate('check-status')}
            >
              Check Existing Status
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

