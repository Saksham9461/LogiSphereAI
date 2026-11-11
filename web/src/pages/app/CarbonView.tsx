// ==============================================================================
// LogiSphere AI — Carbon Intelligence & Sustainability View
// Fleet emissions analytics, vehicle efficiency profiles, and AI sustainability advisor
// Backed by /api/carbon endpoints
// ==============================================================================

import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Sparkles,
  Truck,
  Target,
  X,
} from 'lucide-react';
import { useAuth } from '../../stores/authStore';
import { carbonService } from '../../services/carbonService';
import type { CarbonOverviewData, VehicleEmissionsRank } from '../../services/carbonService';
import { hasPermission, Permission } from '../../utils/rbac';
import { Loader } from '../../components/Loader';

export const CarbonView: React.FC = () => {
  const { user } = useAuth();
  const canManageTargets = hasPermission(user?.role, Permission.CARBON_MANAGE_TARGETS);

  const [data, setData] = useState<CarbonOverviewData | null>(null);
  const [vehiclesRank, setVehiclesRank] = useState<VehicleEmissionsRank[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Target Modal State
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [targetKg, setTargetKg] = useState('2500');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [overview, ranks] = await Promise.all([
        carbonService.getCarbonOverview(),
        carbonService.getVehicleEmissions(),
      ]);
      setData(overview);
      setVehiclesRank(ranks);
    } catch (err: any) {
      console.error('Failed to load carbon intelligence', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to load carbon data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSetTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await carbonService.setSustainabilityTarget({
        targetCo2Kg: Number(targetKg) || 2500,
      });
      setShowTargetModal(false);
      await fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to update target');
    } finally {
      setSubmitting(false);
    }
  };

  const kpis = data?.kpis;
  const target = data?.targetStatus;
  const advisor = data?.advisorAdvisory;

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
            onClick={fetchData}
            className="btn-secondary"
            disabled={loading}
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          {canManageTargets && (
            <button type="button" onClick={() => setShowTargetModal(true)} className="btn-primary">
              <Target size={16} />
              <span>Set Carbon Budget</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', padding: '0.75rem 1rem', borderRadius: 8, color: '#991B1B', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* Carbon KPI Grid */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Gross Fleet CO2 Emissions</span>
          <div className="kpi-value" style={{ color: '#111827' }}>
            {kpis ? `${kpis.totalCo2Kg.toLocaleString()} kg` : '0 kg'}
          </div>
          <span className="kpi-meta">{kpis?.periodLabel || 'Active operations'}</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Emissions Intensity</span>
          <div className="kpi-value" style={{ color: '#10B981' }}>
            {kpis ? `${kpis.emissionsPerKm} kg/km` : '0.00 kg/km'}
          </div>
          <span className="kpi-meta">Rating: <strong>{kpis?.fleetEfficiencyRating || 'Nominal'}</strong></span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Avg Fleet Fuel Economy</span>
          <div className="kpi-value" style={{ color: '#3B82F6' }}>
            {kpis ? `${kpis.avgFuelEconomyKmpl} km/L` : '0.0 km/L'}
          </div>
          <span className="kpi-meta">{kpis?.totalFuelLiters.toLocaleString() || 0} L consumed</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Monthly Budget Status</span>
          <div className="kpi-value" style={{ color: target?.status === 'EXCEEDED' ? '#EF4444' : '#10B981' }}>
            {target ? `${target.percentUsed}%` : 'On Track'}
          </div>
          <span className="kpi-meta">
            Target: {target?.targetCo2Kg || 2500} kg CO2
          </span>
        </div>
      </div>

      {/* AI Carbon Advisor Recommendation Spotlight */}
      {advisor && (
        <div className="app-card" style={{ background: '#F0FDF4', borderColor: '#BBF7D0', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Sparkles size={18} color="#059669" />
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#065F46', margin: 0 }}>
              AI Carbon Reduction Advisor
            </h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#047857', margin: '0 0 0.85rem 0', lineHeight: 1.5 }}>
            {advisor.summary || 'Corridor optimization and idling prevention can reduce gross fleet greenhouse emissions.'}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' }}>
            {advisor.actionItems?.map((item, idx) => (
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
      )}

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
              {vehiclesRank.length > 0 ? (
                vehiclesRank.map((v) => (
                  <tr key={v.vehicleId}>
                    <td>
                      <div style={{ fontWeight: 700, color: '#111827' }}>{v.name}</div>
                      <div className="ops-mono" style={{ fontSize: '0.72rem', color: '#6B7280' }}>
                        Reg: {v.registrationNumber}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-neutral">{v.type || 'TRUCK'}</span>
                    </td>
                    <td style={{ fontWeight: 700 }}>{v.totalCo2Kg.toLocaleString()} kg</td>
                    <td className="ops-mono">{v.totalDistanceKm.toLocaleString()} km</td>
                    <td className="ops-mono">{v.co2PerKm} kg/km</td>
                    <td>
                      <span
                        className={`badge ${
                          v.efficiencyRating === 'EXCELLENT'
                            ? 'badge-success'
                            : v.efficiencyRating === 'GOOD'
                            ? 'badge-info'
                            : v.efficiencyRating === 'MODERATE'
                            ? 'badge-warning'
                            : 'badge-danger'
                        }`}
                      >
                        {v.efficiencyRating || 'GOOD'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '3.5rem 1rem', textAlign: 'center' }}>
                    <Loader inline text="Computing carbon intelligence & vehicle profiles..." color="#10B981" size="medium" />
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem 1rem', color: '#6B7280' }}>
                    No vehicle emissions profiles available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Set Monthly Target Modal */}
      {showTargetModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                Set Monthly Sustainability Target
              </h2>
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
                  Monthly CO2 Budget Ceiling (kg) *
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
                <button type="button" onClick={() => setShowTargetModal(false)} className="btn-secondary" disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Set Budget Target'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
