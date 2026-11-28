// ==============================================================================
// LogiSphere AI — Notification Bell & Dropdown (NotificationBellDropdown.tsx)
// Provides a real-time notification drawer in the top navigation header
// for WebSocket dispatch messages and emergency SOS incident alerts.
// ==============================================================================

import React, { useState, useRef, useEffect } from 'react';
import { Bell, MessageSquare, AlertTriangle, CheckCheck, Trash2, X } from 'lucide-react';
import { useNotifications, type InAppNotification } from '../../stores/notificationStore';

interface NotificationBellDropdownProps {
  onNavigate?: (route: string) => void;
}

function formatRelativeTime(dateString: string): string {
  try {
    const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (diff < 30) return 'Just now';
    if (diff < 60) return `${diff}s ago`;
    const mins = Math.floor(diff / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(dateString).toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

export const NotificationBellDropdown: React.FC<NotificationBellDropdownProps> = ({ onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleItemClick = (item: InAppNotification) => {
    markAsRead(item.id);
    setIsOpen(false);
    if (onNavigate && item.routeTarget) {
      onNavigate(item.routeTarget);
    }
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="header-bell-btn"
        style={{
          position: 'relative',
          background: isOpen ? '#F3F4F6' : 'transparent',
          border: '1px solid',
          borderColor: isOpen ? '#D1D5DB' : 'transparent',
          borderRadius: 8,
          width: 36,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: unreadCount > 0 ? '#111827' : '#6B7280',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        title="View Notifications"
        aria-label="View notifications"
        aria-expanded={isOpen}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              minWidth: 16,
              height: 16,
              borderRadius: 999,
              background: '#EF4444',
              color: '#FFFFFF',
              fontSize: '0.65rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 3px',
              border: '2px solid #FFFFFF',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className="notification-dropdown-menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 360,
            maxWidth: 'calc(100vw - 2rem)',
            background: '#FFFFFF',
            borderRadius: 12,
            border: '1px solid #E5E7EB',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
            zIndex: 9999,
            overflow: 'hidden',
            animation: 'logisphere-scale-in 0.15s ease-out',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '0.85rem 1rem',
              borderBottom: '1px solid #E5E7EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#F9FAFB',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#111827' }}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    background: '#FEF3C7',
                    color: '#B45309',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '0.1rem 0.45rem',
                    borderRadius: 999,
                    border: '1px solid #FDE68A',
                  }}
                >
                  {unreadCount} unread
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#059669',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    padding: '0.2rem 0.4rem',
                    borderRadius: 4,
                  }}
                  title="Mark all as read"
                >
                  <CheckCheck size={13} />
                  <span>Mark Read</span>
                </button>
              )}

              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#9CA3AF',
                    cursor: 'pointer',
                    padding: '0.2rem',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title="Clear all"
                >
                  <Trash2 size={14} />
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#9CA3AF',
                  cursor: 'pointer',
                  padding: '0.2rem',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Close"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {notifications.length > 0 ? (
              notifications.map((item) => {
                const isAlert = item.type === 'ALERT';
                return (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    style={{
                      padding: '0.85rem 1rem',
                      borderBottom: '1px solid #F3F4F6',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      cursor: 'pointer',
                      background: item.read ? '#FFFFFF' : isAlert ? '#FEF2F2' : '#F0FDF4',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    {/* Icon */}
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: isAlert ? '#FEE2E2' : '#E0E7FF',
                        color: isAlert ? '#DC2626' : '#4F46E5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      {isAlert ? <AlertTriangle size={16} /> : <MessageSquare size={16} />}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: 2 }}>
                        <span
                          style={{
                            fontWeight: item.read ? 600 : 700,
                            fontSize: '0.84rem',
                            color: '#111827',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {isAlert
                            ? item.driverName ? `SOS: ${item.driverName}` : item.title
                            : item.senderName || item.title}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#9CA3AF', whiteSpace: 'nowrap' }}>
                          {formatRelativeTime(item.timestamp)}
                        </span>
                      </div>

                      <div
                        style={{
                          fontSize: '0.78rem',
                          color: '#4B5563',
                          lineHeight: 1.35,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {item.message}
                      </div>
                    </div>

                    {/* Unread indicator dot */}
                    {!item.read && (
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: isAlert ? '#EF4444' : '#10B981',
                          flexShrink: 0,
                          marginTop: 6,
                        }}
                      />
                    )}
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: '#9CA3AF' }}>
                <Bell size={28} color="#D1D5DB" style={{ margin: '0 auto 0.5rem auto' }} />
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>
                  No notifications yet
                </div>
                <div style={{ fontSize: '0.75rem', marginTop: 2 }}>
                  Real-time dispatch messages and SOS alerts will appear here.
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBellDropdown;
