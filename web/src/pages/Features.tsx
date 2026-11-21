import React from 'react';
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
} from 'lucide-react';

interface FeaturesProps {
  onNavigate: (route: string) => void;
}

export const Features: React.FC<FeaturesProps> = ({ onNavigate }) => {
  const featureList = [
    {
      id: 'fleet',
      icon: <Truck size={24} />,
      title: 'Fleet Asset Registry & Telemetry',
      badge: 'Core Asset Module',
      colorClass: '',
      summary: 'Comprehensive vehicle tracking from initial onboarding to daily operations.',
      bullets: [
        'Registry of commercial trucks, vans, and utility transports with unique vehicle IDs and registration plates',
        'Load capacity validation ensuring cargo does not exceed vehicle weight limits',
        'Live odometer logging tracking vehicle distance accumulated across completed trips',
        'Real-time status synchronization (Available, On Trip, Maintenance, Retired)',
      ],
    },
    {
      id: 'drivers',
      icon: <Users size={24} />,
      title: 'Driver Management & Duty Compliance',
      badge: 'Personnel & Safety',
      colorClass: 'teal',
      summary: 'End-to-end personnel governance ensuring qualified drivers operate compliant vehicles.',
      bullets: [
        'Driver profiles with license numbers, class ratings, and expiry alerts',
        'Dynamic safety score calculations based on driving records and trip punctuality',
        'Current duty status management (Available, On Trip, Off Duty)',
        'Direct linkage between vehicle assignment, active trips, and driver credentials',
      ],
    },
    {
      id: 'dispatch',
      icon: <Navigation size={24} />,
      title: 'Trip Management & Dispatch Workflow',
      badge: 'Operations Hub',
      colorClass: 'indigo',
      summary: 'Structured dispatch pipeline with automated validation and state progression.',
      bullets: [
        'Trip drafting with cargo weight, source hub, and destination coordinates',
        'Strict lifecycle progression: Draft &rarr; Pending Approval &rarr; Dispatched &rarr; On Trip &rarr; Completed &rarr; Cancelled',
        'Pre-dispatch driver and vehicle availability verification to prevent double-booking',
        'Real-time trip milestone updates with planned distance vs. actual odometer tracking',
      ],
    },
    {
      id: 'tracking',
      icon: <MapPin size={24} />,
      title: 'Live GPS Tracking & Telemetry Stream',
      badge: 'Real-time WebSocket',
      colorClass: 'emerald',
      summary: 'High-frequency GPS coordinate streaming with instant updates on dispatcher consoles.',
      bullets: [
        'Real-time vehicle coordinates streaming over low-latency WebSockets',
        'Dynamic route breadcrumbs showing historical progression along highway corridors',
        'Live speed, heading, and transit status updates visible on unified interactive maps',
        'Immediate notification when vehicle telemetry stalls or exceeds anticipated travel time',
      ],
    },
    {
      id: 'attendance',
      icon: <Clock size={24} />,
      title: 'Geofenced Attendance & Shift Verification',
      badge: 'Fraud Prevention',
      colorClass: 'amber',
      summary: 'Rigorous geofence boundary validation ensuring physical presence during shift clock-in.',
      bullets: [
        'Depot and headquarters geofence perimeter configured via latitude, longitude, and radius (50m - 5000m)',
        'GPS coordinate verification when drivers tap Clock In or Clock Out on their mobile devices',
        'Automatic exception logging when clock-in attempts occur outside approved site perimeters',
        'Automated shift clock-out mechanisms and exportable attendance audit reports',
      ],
    },
    {
      id: 'maintenance',
      icon: <Wrench size={24} />,
      title: 'Vehicle Maintenance & Service Accounting',
      badge: 'Fleet Reliability',
      colorClass: 'rose',
      summary: 'Preventative and reactive service tracking to maximize asset uptime and prevent breakdowns.',
      bullets: [
        'Scheduled maintenance work orders categorized by type (oil, brakes, transmission, inspection)',
        'Service cost ledger calculating lifetime maintenance expenditure per vehicle',
        'Automatic status transition to "Maintenance" locking the vehicle from active dispatch',
        'Preventative maintenance forecast schedules based on mileage intervals and historical wear',
      ],
    },
    {
      id: 'fuel',
      icon: <Fuel size={24} />,
      title: 'Fuel Management & Economy Analytics',
      badge: 'Cost Control',
      colorClass: 'amber',
      summary: 'Refuel logging and consumption analytics to curb excessive fuel burn.',
      bullets: [
        'Fueling logs capturing refuel volume (liters/gallons), total cost, and station location',
        'Odometer reading validation at each refuel event to detect mileage discrepancies',
        'Automated kilometer-per-liter (KPL) consumption calculations across vehicle types',
        'Detection of fuel anomalies and sudden consumption spikes indicating leaks or inefficiencies',
      ],
    },
    {
      id: 'expenses',
      icon: <Receipt size={24} />,
      title: 'Operational Expense & Trip Accounting',
      badge: 'Financial Governance',
      colorClass: 'teal',
      summary: 'Granular transit expense logging categorized by trip and operating organization.',
      bullets: [
        'Trip-specific expense logging for toll fees, highway permits, parking, and driver allowances',
        'Categorized expenditure ledger with receipt notes and approval workflows',
        'Per-kilometer operational cost calculations identifying the true expense of each route',
        'Exportable financial summaries for corporate accounting and tax reporting',
      ],
    },
    {
      id: 'sos',
      icon: <AlertTriangle size={24} />,
      title: 'Emergency SOS & Incident Response',
      badge: 'Driver Safety',
      colorClass: 'rose',
      summary: 'Resilient distress system connecting on-road drivers to platform safety officers.',
      bullets: [
        'One-touch mobile SOS trigger broadcasting distress signals with precise GPS coordinates',
        'Offline SOS queue worker preserving distress payloads locally and syncing when connection resumes',
        'Real-time dispatcher alert banner with visual audio cues and emergency notification broadcast',
        'Structured alert lifecycle: Triggered &rarr; Acknowledged &rarr; Responded &rarr; Resolved with timestamped audit',
      ],
    },
    {
      id: 'chat',
      icon: <MessageSquare size={24} />,
      title: 'Internal Team Communication Channels',
      badge: 'Collaborative Messaging',
      colorClass: 'indigo',
      summary: 'Secure real-time communication between fleet managers, dispatchers, and drivers.',
      bullets: [
        'In-app conversation channels linking drivers directly to their designated trip dispatchers',
        'Low-latency WebSocket message delivery with read receipts and unread badge counters',
        'Thread history preserved within trip context for post-incident audits',
        'Eliminates unmonitored external messaging apps for mission-critical logistics directives',
      ],
    },
    {
      id: 'ai-insights',
      icon: <Sparkles size={24} />,
      title: 'AI Route Assistance & Weather Intelligence',
      badge: 'AI Optimization',
      colorClass: 'emerald',
      summary: 'Intelligent decision support guiding dispatchers with predictive weather and delays.',
      bullets: [
        'Route recommendation analyzing distance, road constraints, and cargo payload profiles',
        'Real-time destination weather forecasting warning dispatchers of hazardous meteorological conditions',
        'Predictive delay estimates considering active highway conditions and weather alerts',
        'AI Assistant chat interface answering fleet operational questions and summarizing telemetry',
      ],
    },
    {
      id: 'analytics',
      icon: <TrendingUp size={24} />,
      title: 'Predictive Analytics & Executive KPIs',
      badge: 'Data Intelligence',
      colorClass: '',
      summary: 'Executive dashboards transforming raw telemetry into strategic logistics intelligence.',
      bullets: [
        'Fleet utilization metrics tracking active operating hours vs. idle vehicle capacity',
        'Maintenance forecasting algorithms calculating remaining operational kilometers before component failure',
        'Driver safety score distributions highlighting training opportunities and recognizing top operators',
        'Aggregated executive KPI summaries covering dispatch velocity, downtime, and operational margins',
      ],
    },
    {
      id: 'carbon',
      icon: <Leaf size={24} />,
      title: 'Carbon Emission Monitoring & Sustainability',
      badge: 'ESG Compliance',
      colorClass: 'teal',
      summary: 'Fleet carbon accounting measuring environmental impact and recommending eco-routes.',
      bullets: [
        'Kilogram CO2 emission calculations based on fuel consumption, vehicle classification, and mileage',
        'Eco-route comparison tools displaying emission differences between shortest vs. greenest pathways',
        'Organizational sustainability targets with monthly progression tracking towards net-zero goals',
        'Emission anomaly detection identifying high-polluting vehicles requiring immediate tuning',
      ],
    },
    {
      id: 'rbac',
      icon: <ShieldCheck size={24} />,
      title: 'Role-Based Access Control (RBAC)',
      badge: 'Security & Governance',
      colorClass: 'emerald',
      summary: 'Fine-grained permissions guaranteeing that users access only authorized operations.',
      bullets: [
        'Pre-configured enterprise roles: Fleet Manager, Dispatcher, Safety Officer, Finance, Driver, Platform Admin',
        'Strict API route guards enforcing role permissions on every backend endpoint',
        'Mobile UI adaptively renders tabs and controls matching the authenticated user’s canonical role',
        'Complete separation between organizational fleet management and platform administrator governance',
      ],
    },
    {
      id: 'multi-tenant',
      icon: <Building2 size={24} />,
      title: 'Multi-Tenant SaaS Architecture',
      badge: 'Enterprise Architecture',
      colorClass: 'indigo',
      summary: 'Rigid organizational data isolation with dedicated onboarding and governance approval.',
      bullets: [
        'Database-level tenant isolation associating vehicles, drivers, trips, and expenses to specific org IDs',
        'Public registration portal for onboarding fleet companies with initial manager credential creation',
        'Protected platform administrator review queue for approving or rejecting new company applications',
        'Audit logging of all administrative actions guaranteeing full regulatory traceability',
      ],
    },
  ];

  return (
    <div className="saas-main-content">
      {/* Header */}
      <section className="saas-section" style={{ paddingBottom: '2rem' }}>
        <div className="saas-container">
          <div className="saas-section-header" style={{ marginBottom: '2rem' }}>
            <span className="saas-badge">
              <Sparkles size={13} />
              Production Feature Suite
            </span>
            <h1 className="saas-section-title" style={{ fontSize: '3rem' }}>
              Built for Modern Logistics Complexity
            </h1>
            <p className="saas-section-subtitle">
              Explore the complete spectrum of capabilities engineered into LogiSphere AI.
              Every module is designed to eliminate friction, enforce compliance, and deliver actionable operational intelligence.
            </p>
          </div>
        </div>
      </section>

      {/* Feature Deep Dive Grid */}
      <section className="saas-section" style={{ paddingTop: '0' }}>
        <div className="saas-container">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            {featureList.map((feature) => (
              <div
                key={feature.id}
                id={feature.id}
                className="saas-card"
                style={{
                  padding: '2.25rem',
                  display: 'grid',
                  gridTemplateColumns: 'minmax(280px, 1fr) 2fr',
                  gap: '2.5rem',
                  alignItems: 'center',
                }}
              >
                {/* Left Column: Icon & Headline */}
                <div>
                  <div className={`saas-card-icon ${feature.colorClass}`} style={{ width: 54, height: 54 }}>
                    {feature.icon}
                  </div>
                  <span className="saas-badge" style={{ marginBottom: '0.75rem' }}>
                    {feature.badge}
                  </span>
                  <h2 style={{ fontSize: '1.45rem', fontWeight: 700, color: '#111827', marginBottom: '0.75rem', lineHeight: 1.3 }}>
                    {feature.title}
                  </h2>
                  <p style={{ color: '#4B5563', fontSize: '0.95rem', lineHeight: 1.6 }}>
                    {feature.summary}
                  </p>
                </div>

                {/* Right Column: Key Implemented Technical Capabilities */}
                <div style={{ background: '#F9FAFB', padding: '1.5rem', borderRadius: 10, border: '1px solid #E5E7EB' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: '#B45309', letterSpacing: '0.05em', marginBottom: '1rem' }}>
                    Implemented Technical Capabilities
                  </div>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {feature.bullets.map((bullet, bIdx) => (
                      <li key={bIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                        <div style={{ color: '#047857', flexShrink: 0, marginTop: 2 }}>
                          <CheckCircle2 size={16} />
                        </div>
                        <span style={{ fontSize: '0.9rem', color: '#374151', lineHeight: 1.5 }}>
                          {bullet}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Box */}
      <section className="saas-container" style={{ marginBottom: '4rem' }}>
        <div className="saas-cta-banner">
          <h2 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#111827', marginBottom: '1rem' }}>
            Empower Your Fleet with LogiSphere AI
          </h2>
          <p style={{ color: '#4B5563', maxWidth: 600, margin: '0 auto 2rem', fontSize: '1rem' }}>
            Ready to integrate these capabilities into your organization’s daily logistics workflow?
            Submit your onboarding registration today.
          </p>
          <button
            type="button"
            className="saas-btn saas-btn-primary saas-btn-lg"
            onClick={() => onNavigate('signup')}
          >
            Register Your Fleet Company
            <ArrowRight size={16} />
          </button>
        </div>
      </section>
    </div>
  );
};
