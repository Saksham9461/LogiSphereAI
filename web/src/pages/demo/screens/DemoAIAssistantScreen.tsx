// ==============================================================================
// LogiSphere AI Demo — Fleet AI Operations Assistant Screen
// 100% Symmetrical with AIAssistantView.tsx layout, styling, and interactions
// ==============================================================================

import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

interface AiAction {
  label: string;
  actionType: 'navigate' | 'track_vehicle';
  route: string;
}

interface AiResponseItem {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
}

interface FleetAiResponse {
  message: string;
  metrics?: Record<string, string | number>;
  items?: AiResponseItem[];
  actions?: AiAction[];
}

interface AiMessageItem {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  response?: FleetAiResponse;
  timestamp: string;
}

interface DemoAIAssistantScreenProps {
  onNavigate: (route: string) => void;
}

export const DemoAIAssistantScreen: React.FC<DemoAIAssistantScreenProps> = ({ onNavigate }) => {
  const defaultSuggestions = [
    'Show active vehicles',
    "Today's trip summary",
    'Track a vehicle',
    'Driver attendance today',
    'Upcoming maintenance',
    'Fuel & expenses summary',
  ];

  const [messages, setMessages] = useState<AiMessageItem[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Welcome to the LogiSphere AI Operations Console. Ask me any natural-language question regarding active dispatches, live GPS tracking, vehicle maintenance, or driver shifts.',
      timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }),
    },
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = (queryText?: string) => {
    const q = (queryText || input).trim();
    if (!q || loading) return;

    setInput('');
    const userMsg: AiMessageItem = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    setTimeout(() => {
      const lower = q.toLowerCase();
      let res: FleetAiResponse;

      if (lower.includes('vehicle') || lower.includes('truck')) {
        res = {
          message: 'Currently, 4 commercial vehicles are actively deployed on scheduled transit corridors, 3 are on standby at regional hubs, and 1 vehicle is undergoing scheduled maintenance overhaul.',
          metrics: {
            'En Route': 4,
            'Hub Standby': 3,
            'Workshop': 1,
            'Fleet Health': '98.4%',
          },
          items: [
            { id: '1', title: 'Freightliner Cascadia (MH-12-RN-4821)', subtitle: 'Ahmedabad → Surat | 62% Completed', badge: 'ON ROUTE', badgeColor: '#10B981' },
            { id: '2', title: 'Volvo FH16 Globetrotter (DL-01-AX-9922)', subtitle: 'Delhi → Jaipur | 45% Completed', badge: 'ON ROUTE', badgeColor: '#10B981' },
            { id: '3', title: 'Isuzu F-Series Flatbed (KA-03-MG-7711)', subtitle: 'Depot Workshop | Engine Diagnostics', badge: 'MAINTENANCE', badgeColor: '#EF4444' },
          ],
          actions: [
            { label: 'View Fleet Vehicles', actionType: 'navigate', route: 'vehicles' },
            { label: 'Live GIS Tracking', actionType: 'track_vehicle', route: 'tracking' },
          ],
        };
      } else if (lower.includes('trip') || lower.includes('dispatch') || lower.includes('today')) {
        res = {
          message: 'All 4 dispatches are proceeding along optimal freight corridors with no critical meteorological delays reported. Fleet on-time delivery efficiency is tracking at 94.2%.',
          metrics: {
            'Active Dispatches': 4,
            'On-Time Performance': '94.2%',
            'Est. Completed Today': '₹1,95,000 Cargo',
          },
          items: [
            { id: 't1', title: 'TRIP-2026-0891 (Electronics & Server Racks)', subtitle: 'Pilot: Marcus Vance | ETA: 4:30 PM', badge: 'IN TRANSIT', badgeColor: '#3B82F6' },
            { id: 't2', title: 'TRIP-2026-0892 (Pharmaceutical Consignment)', subtitle: 'Pilot: Raj Patel | Cold Chain Validated', badge: 'IN TRANSIT', badgeColor: '#3B82F6' },
          ],
          actions: [
            { label: 'Manage All Dispatches', actionType: 'navigate', route: 'trips' },
          ],
        };
      } else if (lower.includes('track') || lower.includes('gps') || lower.includes('gis') || lower.includes('map')) {
        res = {
          message: 'Real-time telemetry stream is active across 4 active GPS transponders. Current lead vehicle Freightliner Cascadia is cruising at 68 km/h along NH-48.',
          metrics: {
            'Live GPS Fixes': 4,
            'Signal Accuracy': '±3.2m HDOP',
            'Avg Speed': '64 km/h',
          },
          items: [
            { id: 'gps-1', title: 'Freightliner Cascadia (MH-12-RN-4821)', subtitle: 'Coordinates: 21.1702° N, 72.8311° E | Heading: South', badge: 'LIVE FIX', badgeColor: '#10B981' },
          ],
          actions: [
            { label: 'Open Live GIS Map', actionType: 'track_vehicle', route: 'tracking' },
          ],
        };
      } else if (lower.includes('attendance') || lower.includes('driver') || lower.includes('duty') || lower.includes('shift')) {
        res = {
          message: '5 certified drivers are on active shift today. All geofence check-ins were authenticated at central distribution terminals with 0 biometric or shift discrepancies.',
          metrics: {
            'On Duty': 5,
            'Actively Piloting': 3,
            'Break / Relief': 2,
            'Avg Safety Score': '94/100',
          },
          items: [
            { id: 'd1', title: 'Raj Patel (Commercial Heavy License)', subtitle: 'Clocked In: 08:00 AM | Surat Geofence Hub', badge: 'ON ROUTE', badgeColor: '#10B981' },
            { id: 'd2', title: 'Marcus Vance (Hazmat Certified)', subtitle: 'Clocked In: 07:45 AM | Mumbai Central Yard', badge: 'ON ROUTE', badgeColor: '#10B981' },
          ],
          actions: [
            { label: 'View Driver Roster', actionType: 'navigate', route: 'drivers' },
            { label: 'Shift Attendance Ledger', actionType: 'navigate', route: 'attendance' },
          ],
        };
      } else if (lower.includes('maintenance') || lower.includes('repair') || lower.includes('service') || lower.includes('health')) {
        res = {
          message: 'Predictive telematics model flagged 1 active work order and 2 scheduled services due within 1,500 kilometers. Fleet mechanical uptime is currently 96.8%.',
          metrics: {
            'Open Work Orders': 1,
            'Pending Services': 2,
            'Next Scheduled': 'Feb 28, 2026',
          },
          items: [
            { id: 'm1', title: 'Isuzu F-Series Flatbed (KA-03-MG-7711)', subtitle: 'Engine Overhaul & Turbo Diagnostics | Est: ₹32,000', badge: 'IN PROGRESS', badgeColor: '#F59E0B' },
            { id: 'm2', title: 'Tata Prima 4028.S (MH-04-AB-1234)', subtitle: 'Brake Pad Replacement & Hydraulic Flush', badge: 'PENDING', badgeColor: '#6B7280' },
          ],
          actions: [
            { label: 'Maintenance Management Hub', actionType: 'navigate', route: 'maintenance' },
          ],
        };
      } else if (lower.includes('fuel') || lower.includes('expense') || lower.includes('cost') || lower.includes('carbon')) {
        res = {
          message: 'Total logged fuel consumption this billing period is 1,220 Liters across 6 logs with an average fleet efficiency of 4.2 km/L. Operational expenditure stands at ₹1,48,500.',
          metrics: {
            'Fuel Spend': '₹1,12,000',
            'Fleet Avg Economy': '4.2 km/L',
            'Operating Cost': '₹1,48,500',
          },
          items: [
            { id: 'f1', title: 'Diesel Refill (180 L) — Freightliner Cascadia', subtitle: 'HPCL Highway Plaza, Vapi | Total: ₹16,560', badge: 'LOGGED', badgeColor: '#10B981' },
            { id: 'f2', title: 'Toll & Waybill Fees (NH-48 Corridor)', subtitle: 'FASTag Auto-Debit | Total: ₹3,200', badge: 'EXPENSE', badgeColor: '#6B7280' },
          ],
          actions: [
            { label: 'Fuel & Expense Ledgers', actionType: 'navigate', route: 'fuel-expenses' },
            { label: 'Carbon Intelligence', actionType: 'navigate', route: 'carbon' },
          ],
        };
      } else {
        res = {
          message: `I analyzed your query: "${q}". All LogiSphere operational telemetry modules (Vehicles, Trips, Drivers, Maintenance, GPS Telematics, and Fuel) are operating with 100% nominal telemetry continuity.`,
          metrics: {
            'Total Fleet': 8,
            'Active Dispatches': 4,
            'Fleet Uptime': '98.4%',
          },
          actions: [
            { label: 'View Command Console', actionType: 'navigate', route: 'dashboard' },
            { label: 'Review Dispatches', actionType: 'navigate', route: 'trips' },
          ],
        };
      }

      const botMsg: AiMessageItem = {
        id: `b-${Date.now()}`,
        sender: 'assistant',
        text: res.message,
        response: res,
        timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }),
      };

      setMessages((prev) => [...prev, botMsg]);
      setLoading(false);
    }, 600);
  };

  return (
    <div>
      {/* Top Action Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#111827', margin: 0 }}>
            AI Fleet Operations Assistant
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: '0.25rem 0 0 0' }}>
            Gemini-powered operations conversational intelligence with full tenancy context.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: '#FEF3C7',
            border: '1px solid #FDE68A',
            color: '#B45309',
            padding: '0.35rem 0.75rem',
            borderRadius: 999,
            fontSize: '0.78rem',
            fontWeight: 700,
          }}
        >
          <Sparkles size={14} />
          <span>Gemini Fleet Engine</span>
        </div>
      </div>

      {/* Main Chat Canvas */}
      <div
        className="app-card ai-chat-canvas"
        style={{
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100vh - 220px)',
          minHeight: 560,
          overflow: 'hidden',
        }}
      >
        {/* Messages Stream */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {messages.map((m) => {
            const isUser = m.sender === 'user';
            return (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isUser ? 'flex-end' : 'flex-start',
                }}
              >
                <div style={{ display: 'flex', gap: '0.75rem', maxWidth: '85%' }}>
                  {!isUser && (
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: '#FEF3C7',
                        color: '#B45309',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      <Sparkles size={16} />
                    </div>
                  )}

                  <div
                    style={{
                      background: isUser ? '#F59E0B' : '#F9FAFB',
                      color: isUser ? '#FFFFFF' : '#111827',
                      border: isUser ? 'none' : '1px solid #E5E7EB',
                      borderRadius: 12,
                      padding: '0.85rem 1.15rem',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>{m.text}</div>

                    {/* AI Metric Highlights */}
                    {m.response?.metrics && Object.keys(m.response.metrics).length > 0 && (
                      <div
                        style={{
                          marginTop: '0.75rem',
                          paddingTop: '0.75rem',
                          borderTop: '1px solid #E5E7EB',
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                          gap: '0.5rem',
                        }}
                      >
                        {Object.entries(m.response.metrics).map(([k, v]) => (
                          <div key={k} style={{ background: '#FFFFFF', padding: '0.45rem 0.65rem', borderRadius: 6, border: '1px solid #E5E7EB' }}>
                            <div style={{ fontSize: '0.68rem', color: '#6B7280', textTransform: 'uppercase', fontWeight: 700 }}>{k}</div>
                            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#111827', marginTop: 2 }}>{v}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* AI Response Items (Cards) */}
                    {m.response?.items && m.response.items.length > 0 && (
                      <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {m.response.items.map((item) => (
                          <div
                            key={item.id}
                            style={{
                              background: '#FFFFFF',
                              padding: '0.65rem 0.85rem',
                              borderRadius: 8,
                              border: '1px solid #E5E7EB',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#111827' }}>
                                {item.title}
                              </div>
                              {item.subtitle && (
                                <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                                  {item.subtitle}
                                </div>
                              )}
                            </div>
                            {item.badge && (
                              <span
                                style={{
                                  background: item.badgeColor || '#FEF3C7',
                                  color: '#FFFFFF',
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  padding: '0.15rem 0.5rem',
                                  borderRadius: 999,
                                }}
                              >
                                {item.badge}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* AI Response Action Buttons */}
                    {m.response?.actions && m.response.actions.length > 0 && (
                      <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {m.response.actions.map((act, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => onNavigate(act.route)}
                            className="btn-secondary"
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', background: '#FFFFFF' }}
                          >
                            <span>{act.label}</span>
                            <ExternalLink size={12} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ fontSize: '0.68rem', color: '#9CA3AF', marginTop: 4, marginInline: '2.5rem' }}>
                  {m.timestamp}
                </div>
              </div>
            );
          })}

          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6B7280', fontSize: '0.85rem' }}>
              <RefreshCw size={16} className="animate-spin" />
              <span>Analyzing live fleet state with Gemini...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion Chips */}
        <div style={{ padding: '0.5rem 1.25rem', borderTop: '1px solid #F3F4F6', display: 'flex', gap: '0.5rem', overflowX: 'auto', background: '#FAFAFA' }}>
          {defaultSuggestions.map((sug, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSend(sug)}
              disabled={loading}
              style={{
                background: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: 999,
                padding: '0.3rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#4B5563',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {sug}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} style={{ padding: '0.85rem 1.25rem', borderTop: '1px solid #E5E7EB', display: 'flex', gap: '0.75rem', background: '#FFFFFF' }}>
          <input
            type="text"
            placeholder="Ask about active vehicles, trip summaries, maintenance, or attendance..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            style={{
              flex: 1,
              padding: '0.65rem 0.85rem',
              borderRadius: 8,
              border: '1px solid #D1D5DB',
              fontSize: '0.875rem',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="btn-primary"
            style={{ padding: '0.65rem 1.25rem' }}
          >
            <Send size={15} />
            <span>Ask AI</span>
          </button>
        </form>
      </div>
    </div>
  );
};
