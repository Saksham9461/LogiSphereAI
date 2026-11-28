// ==============================================================================
// LogiSphere AI Demo — Carbon Intelligence & Sustainability Screen
// 100% Symmetrical with CarbonView.tsx in UI, AI advisor, and emissions rankings
// ==============================================================================

import React, { useState } from 'react';
import {
  RefreshCw,
  Sparkles,
  Truck,
  Target,
  X,
} from 'lucide-react';

export const DemoCarbonScreen: React.FC = () => {
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [targetKg, setTargetKg] = useState('2500');

  const ranks = [
    {
      vehicleId: 'veh-truck-11',
      name: 'Freightliner Cascadia (TRUCK-11)',
      registrationNumber: 'GJ01TR1111',
      type: 'TRUCK',
      totalCo2Kg: 580,
      totalDistanceKm: 2680,
      co2PerKm: 0.216,
      efficiencyRating: 'GOOD',
    },
    {
      vehicleId: 'veh-semi-40',
      name: 'Volvo FH16 Heavy Semi (TRUCK-40)',
      registrationNumber: 'GJ01TR4400',
      type: 'TRUCK',
      totalCo2Kg: 920,
      totalDistanceKm: 3450,
      co2PerKm: 0.267,
      efficiencyRating: 'MODERATE',
    },
    {
      vehicleId: 'veh-cargo-08',
      name: 'Mahindra Supro Cargo (CARGO-08)',
      registrationNumber: 'GJ05MH8008',
      type: 'VAN',
      totalCo2Kg: 140,
      totalDistanceKm: 1890,
      co2PerKm: 0.074,
      efficiencyRating: 'EXCELLENT',
    },
    {
      vehicleId: 'veh-van-05',
      name: 'Ford Transit Cargo (VAN-05)',
      registrationNumber: 'GJ01AB1234',
      type: 'VAN',
      totalCo2Kg: 210,
      totalDistanceKm: 2100,
      co2PerKm: 0.100,
      efficiencyRating: 'EXCELLENT',
    },
  ];

  const advisor = {
    summary:
      'Routing heavy freight (TRUCK-11 and TRUCK-40) via peripheral bypass bypasses around Surat and Vadodara reduces estimated highway idling by 14% (~240 kg CO2 saved monthly).',
    actionItems: [
      {
        title: 'Bypass Congestion Corridor NH-48',
        impact: 'HIGH',
        description: 'Schedule dispatch departures outside of peak metropolitan windows (08:00 - 10:30 AM).',
      },
      {
        title: 'Idle RPM Cutoff Calibration',
        impact: 'MEDIUM',
        description: 'Enforce automatic 5-minute engine cutoffs during bay loading and weighbridge queues.',
      },
      {
        title: 'Tyre Pressure Telematics Monitoring',
        impact: 'MEDIUM',
        description: 'Ensure trailer duals stay within nominal 110 PSI threshold to preserve optimal fuel economy.',
      },
    ],
  };

  const handleSetTarget = (e: React.FormEvent) => {
    e.preventDefault();
    setShowTargetModal(false);
  };

  return (
    <div>
      {/* Top Action Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#111827', margin: 0 }}>
            Carbon Intelligence & Sustainability
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: '0.25rem 0 0 0' }}>
            Fleet greenhouse gas accounting, vehicle fuel efficiency ratings, and decarbonization advice.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={() => {}}
            className="btn-secondary"
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setShowTargetModal(true)}
            className="btn-primary"
            style={{ background: '#059669', borderColor: '#059669' }}
          >
            <Target size={15} />
            <span>Set Carbon Target</span>
          </button>
        </div>
      </div>

      {/* Carbon KPI Grid */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Gross Fleet CO2 Emissions</span>
          <div className="kpi-value" style={{ color: '#111827' }}>
            1,850 kg
          </div>
          <span className="kpi-meta">Scope 1 mobile combustion</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Emissions Intensity</span>
          <div className="kpi-value" style={{ color: '#10B981' }}>
            0.18 kg/km
          </div>
          <span className="kpi-meta">Rating: <strong>Optimal Tier-1</strong></span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Avg Fleet Fuel Economy</span>
          <div className="kpi-value" style={{ color: '#3B82F6' }}>
            4.8 km/L
          </div>
          <span className="kpi-meta">1,120 L consumed</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Monthly Budget Status</span>
          <div className="kpi-value" style={{ color: '#10B981' }}>
            74% Used
          </div>
          <span className="kpi-meta">Target: {targetKg} kg CO2</span>
        </div>
      </div>

      {/* AI Carbon Advisor Recommendation Spotlight */}
      <div className="app-card" style={{ background: '#F0FDF4', borderColor: '#BBF7D0', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <Sparkles size={18} color="#059669" />
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#065F46', margin: 0 }}>
            AI Carbon Reduction Advisor
          </h3>
        </div>
        <p style={{ fontSize: '0.85rem', color: '#047857', margin: '0 0 0.85rem 0', lineHeight: 1.5 }}>
          {advisor.summary}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' }}>
          {advisor.actionItems.map((item, idx) => (
            <div key={idx} style={{ background: '#FFFFFF', padding: '0.75rem', borderRadius: 8, border: '1px solid #D1FAE5' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#111827' }}>{item.title}</div>
                <span className={`badge ${item.impact === 'HIGH' ? 'badge-success' : 'badge-neutral'}`}>
                  {item.impact} IMPACT
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#4B5563', lineHeight: 1.4 }}>
                {item.description}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Vehicle Carbon Profile Rankings */}
      <div className="app-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="app-card-header" style={{ padding: '1rem 1.25rem', marginBottom: 0 }}>
          <div className="app-card-title">
            <Truck size={18} color="#F59E0B" />
            <span>Commercial Vehicle Emissions & Efficiency Profiles</span>
          </div>
        </div>

        <div className="data-table-container" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Class</th>
                <th>Total CO2 Emitted</th>
                <th>Odometer Distance</th>
                <th>CO2 per Kilometer</th>
                <th>Efficiency Rating</th>
              </tr>
            </thead>
            <tbody>
              {ranks.map((v) => (
                <tr key={v.vehicleId}>
                  <td>
                    <div style={{ fontWeight: 700, color: '#111827' }}>{v.name}</div>
                    <div className="ops-mono" style={{ fontSize: '0.72rem', color: '#6B7280' }}>
                      Reg: {v.registrationNumber}
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-neutral">{v.type}</span>
                  </td>
                  <td style={{ fontWeight: 700 }}>{v.totalCo2Kg} kg</td>
                  <td className="ops-mono">{v.totalDistanceKm.toLocaleString()} km</td>
                  <td className="ops-mono">{v.co2PerKm} kg/km</td>
                  <td>
                    <span
                      className={`badge ${
                        v.efficiencyRating === 'EXCELLENT'
                          ? 'badge-success'
                          : v.efficiencyRating === 'GOOD'
                          ? 'badge-info'
                          : 'badge-warning'
                      }`}
                    >
                      {v.efficiencyRating}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Set Sustainability Target Modal */}
      {showTargetModal && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: 440 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Target size={18} color="#059669" />
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                  Set Sustainability Target
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowTargetModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSetTarget} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                  Monthly Fleet CO2 Ceiling (kg)
                </label>
                <input
                  type="number"
                  min="100"
                  required
                  value={targetKg}
                  onChange={(e) => setTargetKg(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowTargetModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ background: '#059669', borderColor: '#059669' }}>
                  Save Target
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
