// ==============================================================================
// LogiSphere AI Demo — Fleet Analytics & KPI Intelligence Screen
// 100% Symmetrical with AnalyticsView.tsx in UI, theme, yield curve, and cost charts
// ==============================================================================

import React, { useMemo } from 'react';
import {
  TrendingUp,
  RefreshCw,
  IndianRupee,
  Fuel,
  Gauge,
  Percent,
} from 'lucide-react';

export const DemoAnalyticsScreen: React.FC = () => {
  const kpis = [
    { label: 'Fuel Efficiency', value: '4.8 km/l', accent: '#3B82F6', icon: Fuel },
    { label: 'Fleet Utilization', value: '71%', accent: '#10B981', icon: Gauge },
    { label: 'Operational Cost', value: '₹1,48,500', accent: '#F59E0B', icon: IndianRupee },
    { label: 'Vehicle ROI', value: '18.4%', accent: '#10B981', icon: Percent },
  ];

  const monthlyRevenue = [
    { month: 'Jun', revenue: 320000 },
    { month: 'Jul', revenue: 410000 },
    { month: 'Aug', revenue: 380000 },
    { month: 'Sep', revenue: 520000 },
    { month: 'Oct', revenue: 610000 },
    { month: 'Nov', revenue: 580000 },
  ];

  const costliestVehicles = [
    { name: 'Freightliner Cascadia (TRUCK-11)', cost: 48500, color: '#F43F5E' },
    { name: 'Volvo FH16 Semi (TRUCK-40)', cost: 38760, color: '#F59E0B' },
    { name: 'Tata Prima 4038.S (TRUCK-22)', cost: 31620, color: '#3B82F6' },
    { name: 'Ashok Leyland 4140 Trailer', cost: 24480, color: '#14B8A6' },
    { name: 'Ford Transit Cargo (VAN-05)', cost: 8670, color: '#8B5CF6' },
  ];

  const maxRevenue = useMemo(() => {
    return Math.max(...monthlyRevenue.map((r) => r.revenue), 1);
  }, [monthlyRevenue]);

  const maxCost = useMemo(() => {
    return Math.max(...costliestVehicles.map((v) => v.cost), 1);
  }, [costliestVehicles]);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <TrendingUp size={24} color="#F59E0B" />
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#111827', margin: 0 }}>
              Fleet Analytics & KPI Intelligence
            </h1>
          </div>
          <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: '0.25rem 0 0 0' }}>
            Operational efficiency, revenue yield curve, and vehicle cost analytics.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {}}
          className="btn-secondary"
          style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}
        >
          <RefreshCw size={14} />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        {kpis.map((kpi, idx) => {
          const IconComp = kpi.icon;
          return (
            <div
              key={idx}
              style={{
                background: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderLeft: `4px solid ${kpi.accent}`,
                borderRadius: 10,
                padding: '1.15rem 1.25rem',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  {kpi.label}
                </span>
                <IconComp size={16} color={kpi.accent} />
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.02em' }}>
                {kpi.value}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '1.75rem', fontStyle: 'italic', paddingLeft: '0.25rem' }}>
        ROI Formula = (Revenue - (Maintenance + Fuel)) / Acquisition Cost
      </div>

      {/* Section: Monthly Revenue Chart */}
      <div className="app-card">
        <div className="app-card-header">
          <div className="app-card-title">
            <TrendingUp size={18} color="#F59E0B" />
            <span>Monthly Revenue Yield (₹ in Thousands)</span>
          </div>
        </div>

        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', gap: '1rem', height: 220, paddingTop: '1.5rem', paddingBottom: '0.5rem', minWidth: 320 }}>
          {monthlyRevenue.map((item) => {
            const heightPct = Math.round((item.revenue / maxRevenue) * 100);
            return (
              <div
                key={item.month}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  flex: 1,
                  height: '100%',
                  justifyContent: 'flex-end',
                  gap: '0.5rem',
                }}
              >
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#4B5563' }}>
                  ₹{(item.revenue / 1000).toFixed(0)}k
                </span>
                <div
                  style={{
                    width: '100%',
                    maxWidth: 48,
                    height: `${heightPct}%`,
                    background: 'linear-gradient(180deg, #F59E0B 0%, #D97706 100%)',
                    borderRadius: '4px 4px 0 0',
                    transition: 'height 0.4s ease-out',
                  }}
                />
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#111827' }}>
                  {item.month}
                </span>
              </div>
            );
          })}
          </div>
        </div>
      </div>

      {/* Section: Highest Operational Cost Vehicles */}
      <div className="app-card">
        <div className="app-card-header">
          <div className="app-card-title">
            <Fuel size={18} color="#F59E0B" />
            <span>Highest Operational Cost Vehicles</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {costliestVehicles.map((veh) => {
            const pct = Math.round((veh.cost / maxCost) * 100);
            return (
              <div key={veh.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                  <span style={{ fontWeight: 700, color: '#111827' }}>{veh.name}</span>
                  <span style={{ fontWeight: 800, color: '#111827' }}>₹{veh.cost.toLocaleString()}</span>
                </div>
                <div style={{ height: 8, background: '#F3F4F6', borderRadius: 999, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${pct}%`,
                      background: veh.color,
                      borderRadius: 999,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
