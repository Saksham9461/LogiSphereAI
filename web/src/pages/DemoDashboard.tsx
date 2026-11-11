// ==============================================================================
// LogiSphere AI — Senior Developer Fleet Operations Command Console
// High-density enterprise telemetry, GIS corridor tracking, geofenced attendance,
// and real-time dispatch management directly matching App/src/ design patterns.
// ==============================================================================

import React, { useState, useMemo, useEffect } from 'react';
import {
  Truck,
  Navigation,
  Clock,
  Wrench,
  Sparkles,
  Leaf,
  LogOut,
  Search,
  CheckCircle2,
  TrendingUp,
  MapPin,
  Menu,
  X,
  ShieldCheck,
  Play,
  Pause,
} from 'lucide-react';

interface DemoDashboardProps {
  userEmail?: string;
  onSignOut: () => void;
  onNavigateHome: () => void;
}

// Mobile App STATUS_META parity
const STATUS_META: Record<string, { color: string; label: string; icon: any }> = {
  ON_TRIP: { color: '#14B8A6', label: 'On Trip', icon: Truck },
  COMPLETED: { color: '#10B981', label: 'Completed', icon: CheckCircle2 },
  DISPATCHED: { color: '#F59E0B', label: 'Dispatched', icon: Navigation },
  MAINTENANCE: { color: '#F43F5E', label: 'Maintenance', icon: Wrench },
  DRAFT: { color: '#6B7280', label: 'Draft', icon: Clock },
};

export const DemoDashboard: React.FC<DemoDashboardProps> = ({
  userEmail = 'manager@logisphere.ai',
  onSignOut,
  onNavigateHome,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'tracking' | 'trips' | 'vehicles' | 'attendance'>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [selectedTrip, setSelectedTrip] = useState<any | null>(null);
  const [isLiveStreaming, setIsLiveStreaming] = useState(true);
  const [simulatedClock, setSimulatedClock] = useState('');
  const [selectedVehicleOnMap, setSelectedVehicleOnMap] = useState<string | null>('veh-truck-11');
  const [showInsightModal, setShowInsightModal] = useState(false);

  // Live ticking operational clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setSimulatedClock(now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Authentic Seed Fleet Vehicles (aligned with backend/supabase/seed.sql)
  const initialVehicles = [
    {
      id: 'veh-truck-11',
      name: 'Freightliner Cascadia (TRUCK-11)',
      reg: 'GJ01TR1111',
      type: 'TRUCK',
      capacity: '3,000 kg',
      odo: 182450,
      status: 'ON_TRIP',
      assignedDriver: 'Raj Patel',
      driverId: 'drv-raj',
      fuelLevel: '78%',
      fuelEcon: '4.1 km/L',
      speed: 68,
      lat: 23.0225,
      lng: 72.5714,
      health: '98% Nominal',
      location: 'Interstate 80 &bull; Milepost 142',
    },
    {
      id: 'veh-van-05',
      name: 'Ford Transit Cargo (VAN-05)',
      reg: 'GJ01AB1234',
      type: 'VAN',
      capacity: '900 kg',
      odo: 74120,
      status: 'AVAILABLE',
      assignedDriver: 'Elena Rostova',
      driverId: 'drv-elena',
      fuelLevel: '92%',
      fuelEcon: '9.8 km/L',
      speed: 0,
      lat: 23.0350,
      lng: 72.5850,
      health: '100% Ready',
      location: 'Central Depot A Bay 04',
    },
    {
      id: 'veh-semi-40',
      name: 'Volvo FH16 Heavy Semi (TRUCK-40)',
      reg: 'GJ01TR4400',
      type: 'TRUCK',
      capacity: '28,000 kg',
      odo: 215800,
      status: 'ON_TRIP',
      assignedDriver: 'Marcus Vance',
      driverId: 'drv-marcus',
      fuelLevel: '64%',
      fuelEcon: '3.4 km/L',
      speed: 74,
      lat: 23.0150,
      lng: 72.5600,
      health: '94% Nominal',
      location: 'Port Access Highway 4',
    },
    {
      id: 'veh-flat-14',
      name: 'Isuzu F-Series Flatbed (FLAT-14)',
      reg: 'GJ01FL9021',
      type: 'TRUCK',
      capacity: '14,000 kg',
      odo: 198340,
      status: 'MAINTENANCE',
      assignedDriver: 'Unassigned',
      driverId: 'none',
      fuelLevel: '45%',
      fuelEcon: '4.8 km/L',
      speed: 0,
      lat: 23.0410,
      lng: 72.5920,
      health: 'Service Window Open',
      location: 'Maintenance Workshop Bay 2',
    },
    {
      id: 'veh-cargo-08',
      name: 'Mercedes Sprinter Van (VAN-08)',
      reg: 'GJ01VN8812',
      type: 'VAN',
      capacity: '1,800 kg',
      odo: 31400,
      status: 'DISPATCHED',
      assignedDriver: 'Sarah Jenkins',
      driverId: 'drv-sarah',
      fuelLevel: '85%',
      fuelEcon: '10.2 km/L',
      speed: 38,
      lat: 23.0280,
      lng: 72.5670,
      health: '99% Nominal',
      location: 'City Distribution Corridor 2',
    },
  ];

  // Authentic Seed Dispatches (aligned with backend/supabase/seed.sql)
  const initialTrips = [
    {
      id: 'trp-1001',
      vehicleId: 'veh-truck-11',
      vehicleName: 'TRUCK-11 (GJ01TR1111)',
      driverName: 'Raj Patel',
      driverScore: 96,
      source: 'Warehouse A',
      destination: 'Port City Terminal',
      cargoWeight: '1,400 kg',
      plannedDistance: '84 km',
      completedDistance: '68 km',
      progressPercent: 81,
      status: 'ON_TRIP',
      eta: '18 mins remaining',
      weather: '26°C Clear',
      delayRisk: 'Low',
      delayForecast: '0 mins',
      carbonSaving: '14.2 kg CO2',
    },
    {
      id: 'trp-1002',
      vehicleId: 'veh-semi-40',
      vehicleName: 'TRUCK-40 (GJ01TR4400)',
      driverName: 'Marcus Vance',
      driverScore: 94,
      source: 'Central Depot A',
      destination: 'Eastern Rail Hub',
      cargoWeight: '22,400 kg',
      plannedDistance: '142 km',
      completedDistance: '45 km',
      progressPercent: 32,
      status: 'ON_TRIP',
      eta: '1 hr 12m',
      weather: '24°C Overcast',
      delayRisk: 'Moderate',
      delayForecast: '+8 mins (Highway work)',
      carbonSaving: '28.5 kg CO2',
    },
    {
      id: 'trp-1003',
      vehicleId: 'veh-cargo-08',
      vehicleName: 'VAN-08 (GJ01VN8812)',
      driverName: 'Sarah Jenkins',
      driverScore: 98,
      source: 'Warehouse A',
      destination: 'Metro Distribution 4',
      cargoWeight: '940 kg',
      plannedDistance: '36 km',
      completedDistance: '4 km',
      progressPercent: 11,
      status: 'DISPATCHED',
      eta: '35 mins',
      weather: '25°C Fair',
      delayRisk: 'Low',
      delayForecast: '0 mins',
      carbonSaving: '6.4 kg CO2',
    },
    {
      id: 'trp-1000',
      vehicleId: 'veh-van-05',
      vehicleName: 'VAN-05 (GJ01AB1234)',
      driverName: 'Elena Rostova',
      driverScore: 99,
      source: 'Regional Depot B',
      destination: 'Warehouse A',
      cargoWeight: '480 kg',
      plannedDistance: '58 km',
      completedDistance: '58 km',
      progressPercent: 100,
      status: 'COMPLETED',
      eta: 'Delivered 32m ago',
      weather: '25°C Clear',
      delayRisk: 'None',
      delayForecast: 'On Schedule',
      carbonSaving: '12.8 kg CO2',
    },
  ];

  // Geofence attendance records matching ClockInWidget
  const attendanceRecords = [
    {
      driverName: 'Raj Patel',
      driverId: 'drv-raj',
      clockInTime: '06:45:12 AM',
      geofenceStatus: 'VERIFIED_IN_BOUNDS',
      distanceFromDepot: '14 meters from Depot A Beacon',
      depot: 'Depot A (Main Gate)',
      activeShift: '05 hrs 32 mins',
    },
    {
      driverName: 'Marcus Vance',
      driverId: 'drv-marcus',
      clockInTime: '07:10:04 AM',
      geofenceStatus: 'VERIFIED_IN_BOUNDS',
      distanceFromDepot: '28 meters from Depot A Beacon',
      depot: 'Depot A (Loading Bay)',
      activeShift: '05 hrs 07 mins',
    },
    {
      driverName: 'Sarah Jenkins',
      driverId: 'drv-sarah',
      clockInTime: '08:00:22 AM',
      geofenceStatus: 'VERIFIED_IN_BOUNDS',
      distanceFromDepot: '6 meters from Depot A Beacon',
      depot: 'Depot A (Dispatcher Desk)',
      activeShift: '04 hrs 17 mins',
    },
    {
      driverName: 'Elena Rostova',
      driverId: 'drv-elena',
      clockInTime: '06:30:19 AM',
      geofenceStatus: 'VERIFIED_IN_BOUNDS',
      distanceFromDepot: '42 meters from Depot B Beacon',
      depot: 'Regional Depot B',
      activeShift: '05 hrs 47 mins',
    },
  ];

  // Filtered Trips list
  const filteredTrips = useMemo(() => {
    return initialTrips.filter((trip) => {
      const matchesSearch =
        !searchQuery ||
        trip.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trip.vehicleName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trip.driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trip.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trip.source.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'ALL' || trip.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter]);

  // Filtered Vehicles list
  const filteredVehicles = useMemo(() => {
    return initialVehicles.filter((veh) => {
      const matchesSearch =
        !searchQuery ||
        veh.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        veh.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        veh.reg.toLowerCase().includes(searchQuery.toLowerCase()) ||
        veh.assignedDriver.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'ALL' || veh.status === statusFilter;
      const matchesType = typeFilter === 'ALL' || veh.type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [searchQuery, statusFilter, typeFilter]);

  const activeVehicleData = initialVehicles.find((v) => v.id === selectedVehicleOnMap) || initialVehicles[0];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F3F4F6', color: '#111827', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      {/* Sidebar Navigation */}
      <aside
        style={{
          width: 260,
          backgroundColor: '#FFFFFF',
          borderRight: '1px solid #E5E7EB',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '1.25rem 0.85rem',
          position: sidebarOpen ? 'fixed' : 'relative',
          inset: sidebarOpen ? '0 auto 0 0' : undefined,
          zIndex: 1100,
          transition: 'all 0.25s ease',
          boxShadow: sidebarOpen ? '0 20px 25px -5px rgba(0, 0, 0, 0.1)' : 'none',
        }}
      >
        <div>
          {/* Brand & Organization Title */}
          <div style={{ padding: '0.25rem 0.65rem 1.25rem', borderBottom: '1px solid #E5E7EB', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <img
                  src="/logo.png"
                  alt="LogiSphere"
                  style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 6 }}
                />
                <div>
                  <div style={{ color: '#111827', fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.02em' }}>
                    LogiSphere <span style={{ color: '#F59E0B' }}>AI</span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Fleet Command OS
                  </div>
                </div>
              </div>
              {sidebarOpen && (
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Active Org Context */}
            <div style={{ marginTop: '0.85rem', padding: '0.5rem 0.65rem', background: '#F9FAFB', borderRadius: 8, border: '1px solid #E5E7EB' }}>
              <div style={{ fontSize: '0.68rem', color: '#6B7280', textTransform: 'uppercase', fontWeight: 700 }}>Tenant Context</div>
              <div style={{ fontSize: '0.825rem', color: '#111827', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>
                LogiSphere Logistics Ltd
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                padding: '0.65rem 0.75rem',
                borderRadius: 8,
                fontSize: '0.875rem',
                fontWeight: 600,
                color: activeTab === 'overview' ? '#B45309' : '#4B5563',
                backgroundColor: activeTab === 'overview' ? '#FEF3C7' : 'transparent',
                border: activeTab === 'overview' ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid transparent',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
            >
              <TrendingUp size={16} color={activeTab === 'overview' ? '#D97706' : '#6B7280'} />
              Fleet Operations
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('tracking')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                padding: '0.65rem 0.75rem',
                borderRadius: 8,
                fontSize: '0.875rem',
                fontWeight: 600,
                color: activeTab === 'tracking' ? '#B45309' : '#4B5563',
                backgroundColor: activeTab === 'tracking' ? '#FEF3C7' : 'transparent',
                border: activeTab === 'tracking' ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid transparent',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
            >
              <MapPin size={16} color={activeTab === 'tracking' ? '#D97706' : '#6B7280'} />
              Live GIS Telematics
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('trips')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                padding: '0.65rem 0.75rem',
                borderRadius: 8,
                fontSize: '0.875rem',
                fontWeight: 600,
                color: activeTab === 'trips' ? '#B45309' : '#4B5563',
                backgroundColor: activeTab === 'trips' ? '#FEF3C7' : 'transparent',
                border: activeTab === 'trips' ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid transparent',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
            >
              <Navigation size={16} color={activeTab === 'trips' ? '#D97706' : '#6B7280'} />
              Trip Dispatchers
              <span className="ops-mono" style={{ marginLeft: 'auto', fontSize: '0.7rem', padding: '1px 6px', borderRadius: 4, background: '#F3F4F6', color: '#4B5563' }}>
                {initialTrips.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('vehicles')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                padding: '0.65rem 0.75rem',
                borderRadius: 8,
                fontSize: '0.875rem',
                fontWeight: 600,
                color: activeTab === 'vehicles' ? '#B45309' : '#4B5563',
                backgroundColor: activeTab === 'vehicles' ? '#FEF3C7' : 'transparent',
                border: activeTab === 'vehicles' ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid transparent',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
            >
              <Truck size={16} color={activeTab === 'vehicles' ? '#D97706' : '#6B7280'} />
              Vehicle Registry
              <span className="ops-mono" style={{ marginLeft: 'auto', fontSize: '0.7rem', padding: '1px 6px', borderRadius: 4, background: '#F3F4F6', color: '#4B5563' }}>
                {initialVehicles.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('attendance')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                padding: '0.65rem 0.75rem',
                borderRadius: 8,
                fontSize: '0.875rem',
                fontWeight: 600,
                color: activeTab === 'attendance' ? '#B45309' : '#4B5563',
                backgroundColor: activeTab === 'attendance' ? '#FEF3C7' : 'transparent',
                border: activeTab === 'attendance' ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid transparent',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
            >
              <Clock size={16} color={activeTab === 'attendance' ? '#D97706' : '#6B7280'} />
              Geofenced Shifts
            </button>
          </nav>
        </div>

        {/* Manager Account & Exit Action */}
        <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem', padding: '0 0.25rem' }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#FEF3C7', color: '#B45309', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
              FM
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827' }}>Fleet Operations</div>
              <div style={{ fontSize: '0.725rem', color: '#6B7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {userEmail}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="saas-btn saas-btn-outline saas-btn-sm"
            style={{ width: '100%', justifyContent: 'flex-start', gap: '0.5rem', fontSize: '0.8rem' }}
            onClick={onSignOut}
          >
            <LogOut size={14} />
            Sign Out (Exit Console)
          </button>
        </div>
      </aside>

      {/* Main Command Console */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowX: 'hidden' }}>
        {/* Executive Header Bar */}
        <header
          style={{
            height: 64,
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 1.5rem',
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}
        >
          {/* Left Title & Status Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              type="button"
              className="saas-mobile-toggle"
              style={{ display: 'block', color: '#4B5563' }}
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h1 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>
                Operations Command Center
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '2px 8px', borderRadius: 4, background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
                <span className="ops-live-dot" />
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#065F46', textTransform: 'uppercase' }}>
                  Live Telemetry (30s)
                </span>
              </div>
            </div>
          </div>

          {/* Right Status Badges & Tools */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div className="ops-mono" style={{ fontSize: '0.8rem', color: '#4B5563', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={14} color="#6B7280" />
              <span>{simulatedClock}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                className="saas-btn saas-btn-secondary saas-btn-sm"
                onClick={() => setIsLiveStreaming(!isLiveStreaming)}
                title={isLiveStreaming ? 'Pause streaming updates' : 'Resume streaming updates'}
              >
                {isLiveStreaming ? <Pause size={13} /> : <Play size={13} />}
                <span>{isLiveStreaming ? 'Live' : 'Paused'}</span>
              </button>
              <button
                type="button"
                className="saas-btn saas-btn-outline saas-btn-sm"
                onClick={onNavigateHome}
              >
                Website Home
              </button>
            </div>
          </div>
        </header>

        {/* Console Body */}
        <main style={{ padding: '1.75rem 1.5rem 3rem', flex: 1, maxWidth: 1400, width: '100%', margin: '0 auto' }}>
          {/* Emergency SOS & System Status Banner (Matching mobile EmergencyAlertBanner.tsx) */}
          <div
            style={{
              background: '#ECFDF5',
              border: '1px solid #A7F3D0',
              borderRadius: 10,
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.5rem',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <ShieldCheck size={18} color="#10B981" />
              <div style={{ fontSize: '0.825rem', color: '#065F46' }}>
                <strong style={{ color: '#047857' }}>Fleet Security Nominal:</strong> 0 active emergency alerts &bull; Offline SOS synchronization worker operational &bull; GPS tracking active on {initialVehicles.filter(v => v.status === 'ON_TRIP').length} transit corridors.
              </div>
            </div>

            <span className="ops-mono" style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 700, background: '#D1FAE5', padding: '2px 8px', borderRadius: 4, border: '1px solid #A7F3D0' }}>
              GEOFENCE_ACTIVE (500M)
            </span>
          </div>

          {/* Top KPI Ribbon (Directly mirroring StatCard in App/src/screens/DashboardScreen.tsx) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
            {/* StatCard 1: Active Fleet */}
            <div className="ops-stat-card" style={{ '--stat-accent': '#14B8A6' } as any}>
              <div className="ops-stat-header">
                <span className="ops-stat-title">Fleet Vehicles</span>
                <div className="ops-stat-icon-box" style={{ background: '#CCFBF1', border: '1px solid rgba(20, 184, 166, 0.3)' }}>
                  <Truck size={16} color="#0F766E" strokeWidth={2.5} />
                </div>
              </div>
              <div className="ops-stat-value">4 / 5 Active</div>
              <div className="ops-stat-sub" style={{ color: '#0F766E' }}>
                <span>80.0% Fleet Utilization &bull; 1 Servicing</span>
              </div>
            </div>

            {/* StatCard 2: Trips & Dispatch */}
            <div className="ops-stat-card" style={{ '--stat-accent': '#F59E0B' } as any}>
              <div className="ops-stat-header">
                <span className="ops-stat-title">Active Dispatches</span>
                <div className="ops-stat-icon-box" style={{ background: '#FEF3C7', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                  <Navigation size={16} color="#B45309" strokeWidth={2.5} />
                </div>
              </div>
              <div className="ops-stat-value">3 En Route</div>
              <div className="ops-stat-sub" style={{ color: '#B45309' }}>
                <span>1 Completed &bull; 98.6% On-Schedule Rate</span>
              </div>
            </div>

            {/* StatCard 3: Geofenced Attendance */}
            <div className="ops-stat-card" style={{ '--stat-accent': '#10B981' } as any}>
              <div className="ops-stat-header">
                <span className="ops-stat-title">Depot Geofence</span>
                <div className="ops-stat-icon-box" style={{ background: '#D1FAE5', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  <Clock size={16} color="#065F46" strokeWidth={2.5} />
                </div>
              </div>
              <div className="ops-stat-value">100% In-Bounds</div>
              <div className="ops-stat-sub" style={{ color: '#065F46' }}>
                <span>4 Drivers Verified &bull; Zero Violations</span>
              </div>
            </div>

            {/* StatCard 4: Carbon Intelligence */}
            <div className="ops-stat-card" style={{ '--stat-accent': '#3B82F6' } as any}>
              <div className="ops-stat-header">
                <span className="ops-stat-title">Carbon Efficiency</span>
                <div className="ops-stat-icon-box" style={{ background: '#DBEAFE', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                  <Leaf size={16} color="#1D4ED8" strokeWidth={2.5} />
                </div>
              </div>
              <div className="ops-stat-value">-16.4% CO2</div>
              <div className="ops-stat-sub" style={{ color: '#1D4ED8' }}>
                <span>61.9 kg Saved &bull; Eco Route Adherence</span>
              </div>
            </div>
          </div>

          {/* Interactive GIS Telematics Map + Real-Time Telemetry Feed */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '1.5rem', marginBottom: '1.75rem' }}>
            {/* Vector Telematics Corridor Map */}
            <div className="saas-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: 0 }}>
                    Live Corridor Telemetry & Transit Vectors
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: 2 }}>
                    GPS streaming coordinates with depot geofence perimeters (500m radius)
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="ops-mono" style={{ fontSize: '0.7rem', padding: '3px 8px', borderRadius: 4, background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', fontWeight: 700 }}>
                    14 SATS LOCKED
                  </span>
                </div>
              </div>

              {/* Vector SVG Telematics Canvas */}
              <div className="ops-map-canvas" style={{ flex: 1, minHeight: 320, padding: '1rem', position: 'relative' }}>
                <svg viewBox="0 0 600 320" style={{ width: '100%', height: '100%' }}>
                  <defs>
                    <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#14B8A6" stopOpacity="0.9" />
                      <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.9" />
                    </linearGradient>
                    <radialGradient id="geofenceGlowGreen" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#10B981" stopOpacity="0.2" />
                      <stop offset="85%" stopColor="#10B981" stopOpacity="0.05" />
                      <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="geofenceGlowBlue" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.2" />
                      <stop offset="85%" stopColor="#3B82F6" stopOpacity="0.05" />
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  {/* Canvas Grid Background Lines */}
                  <line x1="50" y1="50" x2="550" y2="50" stroke="#E2E8F0" strokeDasharray="3 3" strokeWidth="1" />
                  <line x1="50" y1="150" x2="550" y2="150" stroke="#E2E8F0" strokeDasharray="3 3" strokeWidth="1" />
                  <line x1="50" y1="250" x2="550" y2="250" stroke="#E2E8F0" strokeDasharray="3 3" strokeWidth="1" />
                  <line x1="150" y1="30" x2="150" y2="290" stroke="#E2E8F0" strokeDasharray="3 3" strokeWidth="1" />
                  <line x1="300" y1="30" x2="300" y2="290" stroke="#E2E8F0" strokeDasharray="3 3" strokeWidth="1" />
                  <line x1="450" y1="30" x2="450" y2="290" stroke="#E2E8F0" strokeDasharray="3 3" strokeWidth="1" />

                  {/* Geofence Ring 1: Warehouse A */}
                  <circle cx="90" cy="180" r="55" fill="url(#geofenceGlowGreen)" stroke="#10B981" strokeWidth="1.5" strokeDasharray="4 3" />
                  <circle cx="90" cy="180" r="4" fill="#10B981" />
                  <text x="90" y="248" fill="#111827" fontSize="11" fontWeight="700" textAnchor="middle">Warehouse A (Depot)</text>
                  <text x="90" y="262" fill="#6B7280" fontSize="9" textAnchor="middle">23.0225° N, 72.5714° E</text>

                  {/* Geofence Ring 2: Port City Terminal */}
                  <circle cx="510" cy="80" r="50" fill="url(#geofenceGlowBlue)" stroke="#3B82F6" strokeWidth="1.5" strokeDasharray="4 3" />
                  <circle cx="510" cy="80" r="4" fill="#3B82F6" />
                  <text x="510" y="145" fill="#111827" fontSize="11" fontWeight="700" textAnchor="middle">Port Terminal City</text>
                  <text x="510" y="159" fill="#6B7280" fontSize="9" textAnchor="middle">Maritime Freight Corridor</text>

                  {/* Transit Corridor Path (Warehouse A -> Port City) */}
                  <path
                    d="M 90 180 Q 260 220 380 130 T 510 80"
                    fill="none"
                    stroke="#E2E8F0"
                    strokeWidth="5"
                  />
                  <path
                    d="M 90 180 Q 260 220 380 130 T 510 80"
                    fill="none"
                    stroke="url(#routeGradient)"
                    strokeWidth="3.5"
                    strokeDasharray="8 6"
                  />

                  {/* Moving Vehicle 1: TRUCK-11 (Raj Patel) */}
                  <g
                    transform="translate(380, 130)"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelectedVehicleOnMap('veh-truck-11')}
                  >
                    <circle cx="0" cy="0" r="14" fill="#FFFFFF" stroke="#14B8A6" strokeWidth="3" />
                    <circle cx="0" cy="0" r="22" fill="none" stroke="#14B8A6" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />
                    <text x="0" y="4" fill="#0F766E" fontSize="10" fontWeight="800" textAnchor="middle">11</text>

                    {/* Telemetry Pin Label */}
                    <rect x="18" y="-22" width="130" height="36" rx="6" fill="#FFFFFF" stroke="#14B8A6" strokeWidth="1.5" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.06))" />
                    <text x="26" y="-8" fill="#111827" fontSize="9.5" fontWeight="700">TRP-1001 &bull; 68 km/h</text>
                    <text x="26" y="7" fill="#6B7280" fontSize="8">Raj Patel (Score: 96)</text>
                  </g>

                  {/* Moving Vehicle 2: TRUCK-40 (Marcus Vance) */}
                  <g
                    transform="translate(260, 220)"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelectedVehicleOnMap('veh-semi-40')}
                  >
                    <circle cx="0" cy="0" r="13" fill="#FFFFFF" stroke="#F59E0B" strokeWidth="3" />
                    <text x="0" y="4" fill="#B45309" fontSize="9" fontWeight="800" textAnchor="middle">40</text>
                    <rect x="-105" y="14" width="120" height="32" rx="6" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="1.5" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.06))" />
                    <text x="-98" y="27" fill="#111827" fontSize="9" fontWeight="700">TRP-1002 &bull; 74 km/h</text>
                    <text x="-98" y="39" fill="#6B7280" fontSize="8">Marcus Vance (32%)</text>
                  </g>
                </svg>

                {/* Bottom Overlay Telemetry Pill */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 12,
                    left: 12,
                    right: 12,
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid #E5E7EB',
                    borderRadius: 8,
                    padding: '0.65rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span className="ops-id-box">{activeVehicleData.id}</span>
                    <span style={{ color: '#111827', fontWeight: 700, fontSize: '0.85rem' }}>{activeVehicleData.name}</span>
                    <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>Driver: {activeVehicleData.assignedDriver}</span>
                  </div>

                  <div className="ops-mono" style={{ fontSize: '0.775rem', color: '#047857', display: 'flex', gap: '1rem', fontWeight: 600 }}>
                    <span>SPEED: {activeVehicleData.speed} KM/H</span>
                    <span>ODO: {activeVehicleData.odo.toLocaleString()} KM</span>
                    <span>FUEL: {activeVehicleData.fuelLevel}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Geofenced Attendance & Shift Verification Panel */}
            <div className="saas-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: 0 }}>
                    Geofenced Shift Verification
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: 2 }}>
                    Coordinate validation matching mobile ClockInWidget
                  </div>
                </div>

                <span className="ops-status-badge ops-status-completed">
                  <CheckCircle2 size={12} />
                  PERIMETER_SECURE
                </span>
              </div>

              {/* Depot Status Box */}
              <div style={{ background: '#F9FAFB', borderRadius: 8, border: '1px solid #E5E7EB', padding: '0.85rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.775rem' }}>
                  <span style={{ color: '#6B7280' }}>Depot Geofence Center</span>
                  <span className="ops-mono" style={{ color: '#111827', fontWeight: 700 }}>23.0225° N, 72.5714° E</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.775rem' }}>
                  <span style={{ color: '#6B7280' }}>Operating Perimeter Radius</span>
                  <span className="ops-mono" style={{ color: '#047857', fontWeight: 700 }}>500 METERS</span>
                </div>
              </div>

              {/* Roster of active clocked-in drivers */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', overflowY: 'auto', flex: 1, maxHeight: 220 }}>
                {attendanceRecords.map((rec) => (
                  <div
                    key={rec.driverId}
                    style={{
                      background: '#F9FAFB',
                      border: '1px solid #E5E7EB',
                      borderRadius: 8,
                      padding: '0.65rem 0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ color: '#111827', fontWeight: 600, fontSize: '0.85rem' }}>{rec.driverName}</div>
                      <div style={{ fontSize: '0.725rem', color: '#047857', fontWeight: 500, marginTop: 2 }}>{rec.distanceFromDepot}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="ops-mono" style={{ fontSize: '0.75rem', color: '#4B5563', fontWeight: 600 }}>{rec.clockInTime}</div>
                      <div style={{ fontSize: '0.7rem', color: '#6B7280' }}>Shift: {rec.activeShift}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Real Dispatches Table matching TripCard & TripStore */}
          <div className="saas-card" style={{ padding: '1.5rem', marginBottom: '1.75rem' }}>
            {/* Table Control Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                  Active Transit Dispatches & Fleet Routing
                </h3>
                <div style={{ fontSize: '0.775rem', color: '#6B7280', marginTop: 2 }}>
                  Showing {filteredTrips.length} active routes synchronized with driver mobile devices
                </div>
              </div>

              {/* Filters */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                {/* Search */}
                <div className="saas-input-wrap" style={{ width: 220 }}>
                  <Search size={14} className="saas-input-icon" />
                  <input
                    type="text"
                    className="saas-input"
                    style={{ padding: '0.45rem 0.75rem 0.45rem 2.25rem', fontSize: '0.825rem' }}
                    placeholder="Search trips, vehicles..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Status Filter Tabs */}
                <div style={{ display: 'flex', background: '#F3F4F6', borderRadius: 8, padding: 3, border: '1px solid #E5E7EB' }}>
                  {['ALL', 'ON_TRIP', 'DISPATCHED', 'COMPLETED'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFilter(st)}
                      style={{
                        padding: '0.35rem 0.75rem',
                        borderRadius: 6,
                        fontSize: '0.75rem',
                        fontWeight: statusFilter === st ? 700 : 500,
                        border: 'none',
                        cursor: 'pointer',
                        background: statusFilter === st ? '#F59E0B' : 'transparent',
                        color: statusFilter === st ? '#FFFFFF' : '#4B5563',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {st.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Table Grid */}
            <div className="ops-table-container">
              <table className="ops-table">
                <thead>
                  <tr>
                    <th>Trip ID</th>
                    <th>Vehicle & Plate</th>
                    <th>Driver & Score</th>
                    <th>Corridor (Source &rarr; Dest)</th>
                    <th>Status</th>
                    <th>Progress</th>
                    <th>ETA & Weather</th>
                    <th>AI Insights</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrips.map((trip) => {
                    const statusMeta = STATUS_META[trip.status] || STATUS_META.DRAFT;
                    const StatusIcon = statusMeta.icon;

                    return (
                      <tr key={trip.id}>
                        {/* Trip ID */}
                        <td>
                          <span className="ops-id-box">{trip.id}</span>
                        </td>

                        {/* Vehicle */}
                        <td>
                          <div style={{ color: '#111827', fontWeight: 600 }}>{trip.vehicleName}</div>
                          <div className="ops-mono" style={{ fontSize: '0.725rem', color: '#6B7280' }}>Payload: {trip.cargoWeight}</div>
                        </td>

                        {/* Driver */}
                        <td>
                          <div style={{ color: '#111827', fontWeight: 600 }}>{trip.driverName}</div>
                          <div style={{ fontSize: '0.725rem', color: '#047857', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                            <ShieldCheck size={12} />
                            Score: {trip.driverScore}/100
                          </div>
                        </td>

                        {/* Corridor */}
                        <td>
                          <div style={{ color: '#111827', fontWeight: 500 }}>
                            {trip.source} &rarr; {trip.destination}
                          </div>
                          <div className="ops-mono" style={{ fontSize: '0.725rem', color: '#6B7280' }}>
                            {trip.completedDistance} / {trip.plannedDistance}
                          </div>
                        </td>

                        {/* Status */}
                        <td>
                          <span
                            className="ops-status-badge"
                            style={{
                              backgroundColor: `${statusMeta.color}18`,
                              borderColor: `${statusMeta.color}40`,
                              color: statusMeta.color,
                            }}
                          >
                            <StatusIcon size={12} strokeWidth={2.5} />
                            {statusMeta.label}
                          </span>
                        </td>

                        {/* Progress */}
                        <td style={{ minWidth: 120 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 4 }}>
                            <span className="ops-mono" style={{ fontWeight: 600, color: '#111827' }}>{trip.progressPercent}%</span>
                          </div>
                          <div style={{ width: '100%', height: 6, background: '#E5E7EB', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${trip.progressPercent}%`, height: '100%', background: statusMeta.color }} />
                          </div>
                        </td>

                        {/* ETA & Weather */}
                        <td>
                          <div style={{ color: '#111827', fontSize: '0.8rem', fontWeight: 600 }}>{trip.eta}</div>
                          <div style={{ fontSize: '0.725rem', color: '#6B7280' }}>{trip.weather}</div>
                        </td>

                        {/* Action: Open Delay Insights Modal */}
                        <td>
                          <button
                            type="button"
                            className="saas-btn saas-btn-sm"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', gap: 4, background: '#FEF3C7', color: '#B45309', border: '1px solid rgba(245, 158, 11, 0.4)' }}
                            onClick={() => {
                              setSelectedTrip(trip);
                              setShowInsightModal(true);
                            }}
                          >
                            <Sparkles size={12} color="#D97706" />
                            Delay AI
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Vehicle Inventory Registry */}
          <div className="saas-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                  Fleet Vehicle Registry & Health Telemetry
                </h3>
                <div style={{ fontSize: '0.775rem', color: '#6B7280', marginTop: 2 }}>
                  Showing {filteredVehicles.length} registered commercial transports
                </div>
              </div>

              {/* Classification filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D1D5DB',
                    color: '#111827',
                    fontSize: '0.8rem',
                    padding: '0.4rem 0.75rem',
                    borderRadius: 6,
                    fontWeight: 500,
                  }}
                >
                  <option value="ALL">All Vehicle Types</option>
                  <option value="TRUCK">Heavy Freight Trucks</option>
                  <option value="VAN">Transit Cargo Vans</option>
                </select>
              </div>
            </div>

            <div className="ops-table-container">
              <table className="ops-table">
                <thead>
                  <tr>
                    <th>Vehicle ID</th>
                    <th>Model & Plate</th>
                    <th>Classification</th>
                    <th>Max Payload</th>
                    <th>Odometer</th>
                    <th>Fuel Level</th>
                    <th>Assigned Driver</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVehicles.map((veh) => {
                    const statusMeta = STATUS_META[veh.status] || STATUS_META.DRAFT;
                    return (
                      <tr key={veh.id}>
                        <td><span className="ops-id-box">{veh.id}</span></td>
                        <td>
                          <div style={{ color: '#111827', fontWeight: 600 }}>{veh.name}</div>
                          <div className="ops-mono" style={{ fontSize: '0.725rem', color: '#6B7280' }}>Plate: {veh.reg}</div>
                        </td>
                        <td><span className="ops-mono" style={{ color: '#4B5563', fontWeight: 600 }}>{veh.type}</span></td>
                        <td style={{ color: '#111827' }}>{veh.capacity}</td>
                        <td className="ops-mono" style={{ color: '#111827' }}>{veh.odo.toLocaleString()} km</td>
                        <td>
                          <div className="ops-mono" style={{ color: '#111827', fontWeight: 600 }}>{veh.fuelLevel}</div>
                          <div style={{ fontSize: '0.7rem', color: '#047857', fontWeight: 600 }}>{veh.fuelEcon}</div>
                        </td>
                        <td>
                          <div style={{ color: '#111827', fontWeight: 500 }}>{veh.assignedDriver}</div>
                        </td>
                        <td>
                          <span
                            className="ops-status-badge"
                            style={{
                              backgroundColor: `${statusMeta.color}18`,
                              borderColor: `${statusMeta.color}40`,
                              color: statusMeta.color,
                            }}
                          >
                            {statusMeta.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* AI Delay & Route Insights Modal (Mirroring mobile TripDelayInsightsModal.tsx) */}
      {showInsightModal && selectedTrip && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(17, 24, 39, 0.45)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '1rem' }}>
          <div className="saas-card" style={{ maxWidth: 560, width: '100%', position: 'relative', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', padding: '2rem' }}>
            <button
              type="button"
              onClick={() => setShowInsightModal(false)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FEF3C7', color: '#B45309', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                <Sparkles size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                  Trip AI Route & Delay Intelligence
                </h3>
                <span className="ops-mono" style={{ fontSize: '0.75rem', color: '#B45309', fontWeight: 600 }}>
                  {selectedTrip.id} &bull; {selectedTrip.vehicleName}
                </span>
              </div>
            </div>

            {/* Insight Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ background: '#F9FAFB', padding: '1rem', borderRadius: 8, border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '0.75rem', color: '#6B7280', textTransform: 'uppercase', fontWeight: 700 }}>Delay Probability</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: selectedTrip.delayRisk === 'Low' ? '#047857' : '#D97706', marginTop: 4 }}>
                  {selectedTrip.delayRisk} Risk
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: 2 }}>{selectedTrip.delayForecast}</div>
              </div>

              <div style={{ background: '#F9FAFB', padding: '1rem', borderRadius: 8, border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '0.75rem', color: '#6B7280', textTransform: 'uppercase', fontWeight: 700 }}>Destination Weather</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0284C7', marginTop: 4 }}>
                  {selectedTrip.weather}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#047857', marginTop: 2, fontWeight: 500 }}>Zero meteorological hazards</div>
              </div>
            </div>

            {/* AI Recommendation Box */}
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#B45309', marginBottom: 4 }}>
                Optimal Dispatch Corridor Recommendation:
              </div>
              <p style={{ fontSize: '0.85rem', color: '#78350F', lineHeight: 1.5, margin: 0 }}>
                Vehicle is progressing along the optimal eco-corridor from <strong>{selectedTrip.source}</strong> to <strong>{selectedTrip.destination}</strong>. Average travel speed of {activeVehicleData.speed} km/h is within green target parameters, yielding an estimated {selectedTrip.carbonSaving} carbon savings.
              </p>
            </div>

            <button
              type="button"
              className="saas-btn saas-btn-primary"
              style={{ width: '100%', fontWeight: 700 }}
              onClick={() => setShowInsightModal(false)}
            >
              Acknowledge & Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
