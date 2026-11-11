// ==============================================================================
// LogiSphere AI — Emergency SOS & Fleet Alerts View
// Real-time emergency incident monitoring, acknowledgement, and resolution
// Backed by /api/alerts, /api/sos, and /ws/alerts WebSocket stream
// ==============================================================================

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  RefreshCw,
  X,
  Radio,
} from 'lucide-react';
import { useAuth } from '../../stores/authStore';
import { alertService } from '../../services/alertService';
import type { EmergencyAlert } from '../../types';
import { hasPermission, Permission } from '../../utils/rbac';
import { Loader } from '../../components/Loader';

export const AlertsView: React.FC = () => {
  const { user } = useAuth();
  const canAcknowledge = hasPermission(user?.role, Permission.ALERTS_ACKNOWLEDGE);
  const canResolve = hasPermission(user?.role, Permission.ALERTS_RESOLVE);
  const canTriggerSos = hasPermission(user?.role, Permission.SOS_TRIGGER);

  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  // Trigger SOS Modal
  const [showSosModal, setShowSosModal] = useState(false);
  const [sosMessage, setSosMessage] = useState('Vehicle breakdown or urgent distress signal.');
  const [sosSubmitting, setSosSubmitting] = useState(false);

  // Resolve Modal
  const [resolveAlertId, setResolveAlertId] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [resolving, setResolving] = useState(false);

  const fetchAlerts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await alertService.getAlerts();
      setAlerts(data);
    } catch (err: any) {
      console.error('Failed to load emergency alerts', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to load fleet alerts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();

    // Subscribe to Live Alerts WebSocket
    const cleanupWs = alertService.connectAlertsWs({
      onConnected: () => setWsConnected(true),
      onDisconnected: () => setWsConnected(false),
      onAlertCreated: (newAlert) => {
        setAlerts((prev) => [newAlert, ...prev]);
      },
      onAlertAcknowledged: (ackAlert) => {
        setAlerts((prev) =>
          prev.map((a) => (a.id === ackAlert.id ? { ...a, status: 'ACKNOWLEDGED', acknowledgedByName: ackAlert.acknowledgedByName } : a))
        );
      },
      onAlertResolved: (resAlert) => {
        setAlerts((prev) =>
          prev.map((a) => (a.id === resAlert.id ? { ...a, status: 'RESOLVED', resolvedByName: resAlert.resolvedByName, resolutionNote: resAlert.resolutionNote } : a))
        );
      },
    });

    return () => {
      if (cleanupWs) cleanupWs();
    };
  }, []);

  const handleAcknowledge = async (id: string) => {
    try {
      await alertService.acknowledgeAlert(id);
      await fetchAlerts();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to acknowledge alert');
    }
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolveAlertId) return;

    setResolving(true);
    try {
      await alertService.resolveAlert(resolveAlertId, resolutionNote.trim());
      setResolveAlertId(null);
      setResolutionNote('');
      await fetchAlerts();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to resolve alert');
    } finally {
      setResolving(false);
    }
  };

  const handleTriggerSos = async (e: React.FormEvent) => {
    e.preventDefault();
    setSosSubmitting(true);

    let lat = 37.7749;
    let lng = -122.4194;

    if (navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {
        // Fallback default
      }
    }

    try {
      await alertService.triggerSos({
        message: sosMessage.trim(),
        latitude: lat,
        longitude: lng,
      });
      setShowSosModal(false);
      setSosMessage('Vehicle breakdown or urgent distress signal.');
      await fetchAlerts();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to broadcast emergency SOS');
    } finally {
      setSosSubmitting(false);
    }
  };

  const activeAlerts = alerts.filter((a) => a.status === 'ACTIVE');

  return (
    <div>
      {/* Top Action Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#111827', margin: 0 }}>
            Emergency SOS & Incident Command
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: '0.25rem 0 0 0' }}>
            Live distress telemetry, dispatch acknowledgment, and incident resolution audit trail.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* WebSocket stream status */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: wsConnected ? '#D1FAE5' : '#F3F4F6',
              color: wsConnected ? '#065F46' : '#6B7280',
              padding: '0.35rem 0.75rem',
              borderRadius: 999,
              fontSize: '0.78rem',
              fontWeight: 700,
            }}
          >
            <Radio size={14} className={wsConnected ? 'animate-pulse' : ''} />
            <span>{wsConnected ? 'SOS Stream Active' : 'Connecting...'}</span>
          </div>

          <button
            type="button"
            onClick={fetchAlerts}
            className="btn-secondary"
            disabled={loading}
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          {canTriggerSos && (
            <button
              type="button"
              onClick={() => setShowSosModal(true)}
              className="btn-danger"
              style={{ padding: '0.5rem 1rem' }}
            >
              <AlertTriangle size={16} />
              <span>Trigger SOS</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', padding: '0.75rem 1rem', borderRadius: 8, color: '#991B1B', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

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
                {(canAcknowledge || canResolve) && <th style={{ textAlign: 'right' }}>Actions</th>}
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
                        <div className="ops-mono" style={{ fontSize: '0.72rem', color: '#6B7280' }}>
                          ID: {al.driverId}
                        </div>
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
                      {(canAcknowledge || canResolve) && (
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                            {isActive && canAcknowledge && (
                              <button
                                type="button"
                                onClick={() => handleAcknowledge(al.id)}
                                className="btn-secondary"
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', color: '#D97706' }}
                              >
                                Acknowledge
                              </button>
                            )}

                            {!isResolved && canResolve && (
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
                      )}
                    </tr>
                  );
                })
              ) : loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3.5rem 1rem', textAlign: 'center' }}>
                    <Loader inline text="Loading emergency alerts..." color="#EF4444" size="medium" />
                  </td>
                </tr>
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
                <button type="button" onClick={() => setShowSosModal(false)} className="btn-secondary" disabled={sosSubmitting}>
                  Cancel
                </button>
                <button type="submit" className="btn-danger" disabled={sosSubmitting}>
                  {sosSubmitting ? 'Broadcasting...' : 'Broadcast SOS Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resolve Incident Modal */}
      {resolveAlertId && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                Resolve Emergency Incident
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
                  Resolution Notes & Remediation Summary *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Assistance dispatched; roadside mechanic resolved flat tire. Vehicle back on transit corridor."
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setResolveAlertId(null)} className="btn-secondary" disabled={resolving}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={resolving}>
                  {resolving ? 'Resolving...' : 'Confirm Incident Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
