// ==============================================================================
// LogiSphere AI — In-Website Floating Notification Banner (InAppNotificationBanner.tsx)
// 100% Symmetrical with App/src/components/InAppChatNotificationBanner.tsx
// Displays real-time WebSocket chat messages and emergency SOS alerts with
// auto-dismiss, interactive reply/respond navigation, and responsive touch layout.
// ==============================================================================

import React from 'react';
import { MessageSquare, AlertTriangle, X, ChevronRight, Radio } from 'lucide-react';
import { useNotifications } from '../../stores/notificationStore';

interface InAppNotificationBannerProps {
  onNavigate?: (route: string) => void;
}

export const InAppNotificationBanner: React.FC<InAppNotificationBannerProps> = ({ onNavigate }) => {
  const { activeBanner, dismissBanner, markAsRead } = useNotifications();

  if (!activeBanner) return null;

  const isAlert = activeBanner.type === 'ALERT';

  const handleAction = () => {
    markAsRead(activeBanner.id);
    dismissBanner();
    if (onNavigate && activeBanner.routeTarget) {
      onNavigate(activeBanner.routeTarget);
    }
  };

  return (
    <div
      className="in-app-banner-overlay"
      role="alert"
      aria-live="assertive"
      style={{
        position: 'fixed',
        top: '1rem',
        right: '1.25rem',
        zIndex: 99999,
        maxWidth: 440,
        width: 'calc(100% - 2.5rem)',
        animation: 'logisphere-slide-down 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div
        className="in-app-banner-card"
        style={{
          background: isAlert
            ? 'linear-gradient(135deg, #1E1B4B 0%, #111827 100%)'
            : 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          color: '#FFFFFF',
          borderRadius: 12,
          padding: '0.85rem 1rem',
          boxShadow: isAlert
            ? '0 20px 25px -5px rgba(220, 38, 38, 0.25), 0 8px 10px -6px rgba(220, 38, 38, 0.2), 0 0 0 1.5px #EF4444'
            : '0 20px 25px -5px rgba(15, 23, 42, 0.3), 0 8px 10px -6px rgba(15, 23, 42, 0.2), 0 0 0 1.5px rgba(255, 255, 255, 0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem',
          boxSizing: 'border-box',
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* Leading Icon Badge */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: isAlert ? '#DC2626' : '#0D9488',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: isAlert ? '0 0 12px rgba(239, 68, 68, 0.6)' : '0 0 10px rgba(13, 148, 136, 0.4)',
          }}
        >
          {isAlert ? (
            <AlertTriangle size={20} className="animate-pulse" />
          ) : (
            <MessageSquare size={20} />
          )}
        </div>

        {/* Content Body */}
        <div
          onClick={handleAction}
          style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
          title={isAlert ? 'Click to inspect emergency SOS alert' : 'Click to reply to chat message'}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: 2 }}>
            <span
              style={{
                fontSize: '0.65rem',
                fontWeight: 800,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                padding: '0.1rem 0.4rem',
                borderRadius: 4,
                background: isAlert ? 'rgba(239, 68, 68, 0.25)' : 'rgba(13, 148, 136, 0.3)',
                color: isAlert ? '#FCA5A5' : '#5EEAD4',
                border: `1px solid ${isAlert ? 'rgba(239, 68, 68, 0.4)' : 'rgba(13, 148, 136, 0.4)'}`,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
              }}
            >
              <Radio size={10} className="animate-pulse" />
              <span>{isAlert ? 'CRITICAL SOS' : 'DISPATCH CHAT'}</span>
            </span>

            <span
              style={{
                fontWeight: 700,
                fontSize: '0.85rem',
                color: '#F9FAFB',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {isAlert
                ? activeBanner.driverName || activeBanner.title
                : activeBanner.senderName || 'Team Message'}
            </span>
          </div>

          <div
            style={{
              fontSize: '0.8rem',
              color: '#CBD5E1',
              lineHeight: 1.35,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {activeBanner.message}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
          <button
            type="button"
            onClick={handleAction}
            style={{
              background: isAlert ? '#EF4444' : '#0D9488',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 6,
              padding: '0.35rem 0.6rem',
              fontSize: '0.72rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              letterSpacing: '0.03em',
              transition: 'opacity 0.15s ease',
            }}
          >
            <span>{isAlert ? 'VIEW' : 'REPLY'}</span>
            <ChevronRight size={13} />
          </button>

          <button
            type="button"
            onClick={dismissBanner}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '0.3rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 4,
            }}
            title="Dismiss notification"
            aria-label="Dismiss notification"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default InAppNotificationBanner;
