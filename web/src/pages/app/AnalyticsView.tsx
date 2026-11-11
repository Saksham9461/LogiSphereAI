// ==============================================================================
// LogiSphere AI — Fleet Analytics & KPI Intelligence View
// Symmetrical match with App/src/screens/AnalyticsScreen.tsx
// Integrates with GET /api/analytics
// ==============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  Search,
  RefreshCw,
  AlertTriangle,
  DollarSign,
  Fuel,
  Gauge,
  Percent,
} from 'lucide-react';
import { dashboardService } from '../../services/dashboardService';
import { Loader } from '../../components/Loader';

const COLOR_PALETTE = ['#F43F5E', '#F59E0B', '#3B82F6', '#14B8A6', '#8B5CF6'];

interface KpiItem {
  label: string;
  value: string;
  accent: string;
  icon: React.ElementType;
}

interface MonthlyRevenueItem {
  month: string;
  revenue: number;
}

interface CostliestVehicleItem {
  name: string;
  cost: number;
  color: string;
  vehicleID?: string;
}

export const AnalyticsView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [kpis, setKpis] = useState<KpiItem[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenueItem[]>([]);
  const [costliestVehicles, setCostliestVehicles] = useState<CostliestVehicleItem[]>([]);

  const fetchAnalyticsData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const res: any = await dashboardService.getAnalytics();
      const rawKpis = res.kpis || res.data?.kpis || {};

      const fuelEfficiency = Number(rawKpis.fuelEfficiency ?? 0);
      const fleetUtilization = Number(rawKpis.fleetUtilization ?? 0);
      const operationalCost = Number(rawKpis.operationalCost ?? 0);
      const vehicleROI = Number(rawKpis.vehicleROI ?? 0);

      const parsedKpis: KpiItem[] = [
        {
          label: 'Fuel Efficiency',
          value: `${fuelEfficiency} km/l`,
          accent: '#3B82F6',
          icon: Fuel,
        },
        {
          label: 'Fleet Utilization',
          value: `${fleetUtilization}%`,
          accent: '#10B981',
          icon: Gauge,
        },
        {
          label: 'Operational Cost',
          value: `$${operationalCost.toLocaleString()}`,
          accent: '#F59E0B',
          icon: DollarSign,
        },
        {
          label: 'Vehicle ROI',
          value: `${vehicleROI}%`,
          accent: '#10B981',
          icon: Percent,
        },
      ];

      const rawRevenue = Array.isArray(res.monthlyRevenue || res.data?.monthlyRevenue)
        ? res.monthlyRevenue || res.data?.monthlyRevenue
        : [];

      const parsedRevenue: MonthlyRevenueItem[] = rawRevenue.map((item: any) => ({
        month: String(item.month || 'Jan'),
        revenue: Number(item.revenue ?? 0),
      }));

      const rawVehicles = Array.isArray(res.costliestVehicles || res.data?.costliestVehicles)
        ? res.costliestVehicles || res.data?.costliestVehicles
        : [];

      const parsedVehicles: CostliestVehicleItem[] = rawVehicles.map((v: any, index: number) => ({
        name: String(v.name || v.vehicleID || 'Vehicle'),
        cost: Number(v.cost ?? v.totalCost ?? 0),
        color: COLOR_PALETTE[index % COLOR_PALETTE.length],
        vehicleID: v.vehicleID,
      }));

      setKpis(parsedKpis);
      setMonthlyRevenue(parsedRevenue);
      setCostliestVehicles(parsedVehicles);
    } catch (err: any) {
      console.error('Failed to load fleet analytics:', err);
      setError(
        err?.response?.data?.message ||
        err?.message ||
        'Failed to fetch analytics intelligence'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const filteredVehicles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return costliestVehicles;
    return costliestVehicles.filter(
      (v) => v.name.toLowerCase().includes(q) || (v.vehicleID && v.vehicleID.toLowerCase().includes(q))
    );
  }, [costliestVehicles, search]);

  const maxRevenue = useMemo(() => {
    if (!monthlyRevenue || monthlyRevenue.length === 0) return 1;
    return Math.max(...monthlyRevenue.map((m) => m.revenue), 1);
  }, [monthlyRevenue]);

  const maxCost = useMemo(() => {
    if (!costliestVehicles || costliestVehicles.length === 0) return 1;
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
          onClick={() => fetchAnalyticsData(true)}
          disabled={loading || refreshing}
          className="btn-secondary"
          style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh Analytics'}</span>
        </button>
      </div>

      {/* Error Banner */}
      {error && kpis.length === 0 && (
        <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 8, padding: '1rem', color: '#991B1B', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <AlertTriangle size={18} color="#DC2626" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchAnalyticsData()}
            className="btn-secondary"
            style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Initial Loading State with App Custom Loader */}
      {loading && kpis.length === 0 ? (
        <div className="app-card" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
          <Loader
            inline
            size="large"
            text="Computing Fleet Analytics Reports..."
            subtext="Aggregating telemetry, fuel consumption, and operational cost ledgers"
          />
        </div>
      ) : (
        <>
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
                <span>Monthly Revenue Yield ($ in Thousands)</span>
              </div>
            </div>

            <div style={{ padding: '1rem 0' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-around',
                  height: 220,
                  gap: '1rem',
                  padding: '1rem 0.5rem 0 0.5rem',
                  borderBottom: '1px solid #E5E7EB',
                }}
              >
                {monthlyRevenue.map((item, idx) => {
                  const heightPercent = Math.min(100, Math.max(10, (item.revenue / (maxRevenue * 1.15)) * 100));
                  return (
                    <div
                      key={idx}
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        height: '100%',
                        justifyContent: 'flex-end',
                        maxWidth: 72,
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: '#374151',
                          marginBottom: '0.4rem',
                        }}
                      >
                        ${item.revenue}k
                      </div>
                      <div
                        style={{
                          width: '100%',
                          height: `${heightPercent}%`,
                          background: 'linear-gradient(180deg, #F59E0B 0%, #D97706 100%)',
                          borderRadius: '6px 6px 0 0',
                          transition: 'height 0.3s ease',
                          minHeight: 12,
                        }}
                        title={`${item.month}: $${item.revenue}k`}
                      />
                      <div
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          color: '#6B7280',
                          marginTop: '0.6rem',
                        }}
                      >
                        {item.month}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section: Top Costliest Vehicles with Search Filter */}
          <div className="app-card">
            <div className="app-card-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
              <div className="app-card-title">
                <span>Top Expenditure Fleet Vehicles</span>
              </div>

              {/* Vehicle Search Input */}
              <div style={{ position: 'relative', minWidth: 240 }}>
                <Search size={15} color="#9CA3AF" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Filter vehicle name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.4rem 0.75rem 0.4rem 2rem',
                    fontSize: '0.82rem',
                    borderRadius: 6,
                    border: '1px solid #D1D5DB',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', padding: '0.5rem 0' }}>
              {filteredVehicles.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#6B7280', fontSize: '0.875rem' }}>
                  {search ? `No fleet vehicles match "${search}".` : 'Zero vehicle cost metrics recorded.'}
                </div>
              ) : (
                filteredVehicles.map((v, idx) => {
                  const widthPercent = Math.min(100, Math.max(6, (v.cost / maxCost) * 100));
                  return (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                        <span style={{ fontWeight: 700, color: '#111827' }}>{v.name}</span>
                        <span className="ops-mono" style={{ fontWeight: 700, color: '#111827' }}>
                          ${v.cost.toLocaleString()}
                        </span>
                      </div>
                      <div style={{ width: '100%', height: 10, background: '#F3F4F6', borderRadius: 999, overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${widthPercent}%`,
                            height: '100%',
                            background: v.color,
                            borderRadius: 999,
                            transition: 'width 0.4s ease',
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AnalyticsView;

