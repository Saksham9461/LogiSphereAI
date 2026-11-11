// ==============================================================================
// LogiSphere AI — Fleet AI Operations Assistant View
// Conversational Natural Language Querying backed by POST /api/ai/query
// ==============================================================================

import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../stores/authStore';
import { aiService } from '../../services/aiService';
import type { FleetAiResponse } from '../../types';
import { CanonicalRole, normalizeRole } from '../../utils/rbac';

interface AiMessageItem {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  response?: FleetAiResponse;
  timestamp: string;
}

interface AIAssistantViewProps {
  onNavigate: (route: string) => void;
}

export const AIAssistantView: React.FC<AIAssistantViewProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const canonicalRole = normalizeRole(user?.role);
  const isDriver = canonicalRole === CanonicalRole.DRIVER;

  const defaultSuggestions = isDriver
    ? [
        'My current trip',
        'My assigned trips',
        'My attendance',
        'My vehicle details',
        'My trip history',
      ]
    : [
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
      text: isDriver
        ? "Hello! I am your LogiSphere Fleet Assistant. You can ask me about your assigned trips, your current vehicle, or your today's attendance status."
        : 'Welcome to the LogiSphere AI Operations Console. Ask me any natural-language question regarding active dispatches, live GPS tracking, vehicle maintenance, or driver shifts.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastContext, setLastContext] = useState<any>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (queryText?: string) => {
    const q = (queryText || input).trim();
    if (!q || loading) return;

    setInput('');
    const userMsg: AiMessageItem = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await aiService.queryFleetAi(q, lastContext);
      if (res.context) {
        setLastContext(res.context);
      }

      const botMsg: AiMessageItem = {
        id: `b-${Date.now()}`,
        sender: 'assistant',
        text: res.message || 'Analysis complete.',
        response: res,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: AiMessageItem = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: err?.response?.data?.message || err?.message || 'Sorry, I encountered an error executing that fleet query.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
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
        className="app-card"
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
                            onClick={() => {
                              if (act.actionType === 'track_vehicle') {
                                onNavigate('tracking');
                              } else if (act.actionType === 'navigate') {
                                const screen = act.payload?.screen;
                                if (screen === 'TripDispatcher') onNavigate('trips');
                                else if (screen === 'AttendanceReport') onNavigate('attendance');
                                else if (screen === 'Maintenance') onNavigate('maintenance');
                                else if (screen === 'Chat') onNavigate('chat');
                              }
                            }}
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
