// ==============================================================================
// LogiSphere AI Demo — Emergency SOS & Incident Command Screen
// 100% Symmetrical with AlertsView.tsx in UI, SOS banner, trigger modal, and tables
// ==============================================================================

import React, { useState } from 'react';
import {
  AlertTriangle,
  RefreshCw,
  X,
  Radio,
} from 'lucide-react';
import { MOCK_ALERTS } from '../data/alerts.mock';
import type { EmergencyAlert } from '../../../types';
import { notificationStore } from '../../../stores/notificationStore';

export const DemoAlertsScreen: React.FC = () => {
  const [alerts, setAlerts] = useState<EmergencyAlert[]>(() => [...MOCK_ALERTS]);

  // Trigger SOS Modal
  const [showSosModal, setShowSosModal] = useState(false);
  const [sosMessage, setSosMessage] = useState('Vehicle breakdown or urgent distress signal.');

  // Resolve Modal
  const [resolveAlertId, setResolveAlertId] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');

  const handleAcknowledge = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, status: 'ACKNOWLEDGED', acknowledgedByName: 'Demo Dispatcher', acknowledgedAt: new Date().toISOString() }
          : a
      )
    );
  };

  const handleResolveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolveAlertId) return;

    setAlerts((prev) =>
      prev.map((a) =>
        a.id === resolveAlertId
          ? {
              ...a,
              status: 'RESOLVED',
              resolvedByName: 'Demo Dispatcher',
              resolvedAt: new Date().toISOString(),
              resolutionNote: resolutionNote.trim() || 'Distress incident addressed and closed.',
            }
          : a
      )
    );
    setResolveAlertId(null);
    setResolutionNote('');
  };

  const handleTriggerSos = (e: React.FormEvent) => {
    e.preventDefault();
    const newAlert: EmergencyAlert = {
      id: `alert-demo-${Date.now()}`,
      driverId: 'drv-raj',
      driverName: 'Raj Patel',
      tripId: 'trip-001',
      vehicleId: 'veh-truck-11',
      latitude: 22.3072,
      longitude: 73.1812,
      locationStatus: 'PRECISE',
      message: sosMessage.trim(),
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setAlerts((prev) => [newAlert, ...prev]);
    setShowSosModal(false);
    setSosMessage('Vehicle breakdown or urgent distress signal.');

    notificationStore.pushNotification({
      type: 'ALERT',
      title: 'Emergency SOS Broadcast',
      message: newAlert.message,
      driverName: 'Raj Patel (TRUCK-11)',
      routeTarget: 'alerts',
    });
  };

  const activeAlerts = alerts.filter((a) => a.status === 'ACTIVE');

  return (
    <div>
      {/* Top Action Header */}
      <div className="alerts-header-bar">
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#111827', margin: 0 }}>
            Emergency SOS & Incident Command
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: '0.25rem 0 0 0' }}>
            Live distress telemetry, dispatch acknowledgment, and incident resolution audit trail.
          </p>
        </div>

        <div className="alerts-header-actions">
          {/* WebSocket stream status */}
          <div className="alerts-stream-badge">
            <Radio size={14} className="animate-pulse" />
            <span>SOS Stream Active</span>
          </div>

          <div className="alerts-action-buttons">
            <button
              type="button"
              onClick={() => setAlerts([...MOCK_ALERTS])}
              className="btn-secondary alerts-btn"
            >
              <RefreshCw size={14} />
              <span>Reset Demo Data</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSosModal(true)}
              className="btn-danger alerts-btn alerts-trigger-btn"
            >
              <AlertTriangle size={16} />
              <span>Trigger SOS</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Incidents Banner */}
      {activeAlerts.length > 0 && (
        <div
          style={{
            background: '#FEF2F2',
            border: '1.5px solid #FCA5A5',
            borderRadius: 10,
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: '#FEE2E2', padding: '0.5rem', borderRadius: '50%' }}>
              <AlertTriangle size={24} color="#DC2626" className="animate-bounce" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#991B1B' }}>
                {activeAlerts.length} Active Emergency Distress Signal{activeAlerts.length === 1 ? '' : 's'}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#B91C1C' }}>
                Driver distress signals require immediate dispatcher acknowledgment and coordinator outreach.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alerts Ledger Table */}
      <div className="app-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="data-table-container" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Alert Incident</th>
                <th>Reporting Driver</th>
                <th>Distress Message</th>
                <th>Incident Coordinates</th>
                <th>Timestamp</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {alerts.length > 0 ? (
                alerts.map((al) => {
                  const isActive = al.status === 'ACTIVE';
                  const isAck = al.status === 'ACKNOWLEDGED';
                  const isResolved = al.status === 'RESOLVED';

                  return (
                    <tr key={al.id} style={{ background: isActive ? '#FFF7F7' : 'inherit' }}>
                      <td className="ops-mono" style={{ fontWeight: 700, color: '#DC2626' }}>
                        #{al.id.slice(0, 8)}
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#111827' }}>{al.driverName || 'Driver'}</div>
                      </td>
                      <td style={{ maxWidth: 280 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827' }}>
                          {al.message}
                        </div>
                        {al.resolutionNote && (
                          <div style={{ fontSize: '0.72rem', color: '#047857', marginTop: 2 }}>
                            Resolution: {al.resolutionNote}
                          </div>
                        )}
                      </td>
                      <td className="ops-mono">
                        {al.latitude && al.longitude ? (
                          <span>
                            {al.latitude.toFixed(4)}, {al.longitude.toFixed(4)}
                          </span>
                        ) : (
                          <span style={{ color: '#9CA3AF' }}>Unavailable</span>
                        )}
                      </td>
                      <td className="ops-mono" style={{ fontSize: '0.78rem' }}>
                        {new Date(al.createdAt).toLocaleString()}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            isActive ? 'badge-danger' : isAck ? 'badge-warning' : 'badge-success'
                          }`}
                        >
                          {al.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                          {isActive && (
                            <button
                              type="button"
                              onClick={() => handleAcknowledge(al.id)}
                              className="btn-secondary"
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', color: '#D97706' }}
                            >
                              Acknowledge
                            </button>
                          )}

                          {!isResolved && (
                            <button
                              type="button"
                              onClick={() => {
                                setResolveAlertId(al.id);
                                setResolutionNote('');
                              }}
                              className="btn-primary"
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: '#10B981' }}
                            >
                              Resolve
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem 1rem', color: '#6B7280' }}>
                    Zero emergency incidents active. All clear.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trigger SOS Modal */}
      {showSosModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={20} color="#DC2626" />
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#991B1B', margin: 0 }}>
                  Broadcast Emergency SOS
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowSosModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#4B5563', margin: '0 0 1rem 0' }}>
              Broadcasting an emergency SOS immediately alerts all active dispatchers, operations managers, and safety officers with your current device GPS coordinates.
            </p>

            <form onSubmit={handleTriggerSos} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                  Emergency Distress Explanation *
                </label>
                <textarea
                  required
                  rows={3}
                  value={sosMessage}
                  onChange={(e) => setSosMessage(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowSosModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-danger">
                  Broadcast SOS Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resolve Alert Modal */}
      {resolveAlertId && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                Resolve Emergency Distress Incident
              </h2>
              <button
                type="button"
                onClick={() => setResolveAlertId(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleResolveSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                  Incident Resolution Note / Action Taken
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Roadside mobile repair unit dispatched and tyre replaced. Driver verified safe."
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setResolveAlertId(null)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ background: '#10B981' }}>
                  Resolve Incident
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
