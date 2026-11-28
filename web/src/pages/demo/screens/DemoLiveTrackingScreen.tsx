// ==============================================================================
// LogiSphere AI Demo — Live GIS Fleet Telematics Screen
// 100% Symmetrical with LiveTrackingView.tsx in UI, SVG corridor canvas, and metrics
// ==============================================================================

import React, { useState } from 'react';
import {
  MapPin,
  Truck,
  Navigation,
  RefreshCw,
  Radio,
} from 'lucide-react';
import type { LiveVehicle } from '../../../types';

export const DemoLiveTrackingScreen: React.FC = () => {
  const [vehicles] = useState<LiveVehicle[]>([
    {
      tripID: 'trip-001',
      vehicleID: 'veh-truck-11',
      vehicleName: 'Freightliner Cascadia (TRUCK-11)',
      registrationNumber: 'GJ01TR1111',
      driverID: 'drv-raj',
      driverName: 'Raj Patel',
      source: 'Ahmedabad Central Depot',
      destination: 'Surat Distribution Hub',
      status: 'IN_TRANSIT',
      latitude: 22.3072,
      longitude: 73.1812,
      speed: 68,
      accuracy: 5,
      heading: 182,
      isLive: true,
      freshness: 'LIVE',
      lastUpdated: new Date().toISOString(),
    },
    {
      tripID: 'trip-002',
      vehicleID: 'veh-semi-40',
      vehicleName: 'Volvo FH16 Heavy Semi (TRUCK-40)',
      registrationNumber: 'GJ01TR4400',
      driverID: 'drv-marcus',
      driverName: 'Marcus Vance',
      source: 'Kandla Port, Gandhidham',
      destination: 'Mumbai JNPT Container Terminal',
      status: 'IN_TRANSIT',
      latitude: 23.0225,
      longitude: 72.5714,
      speed: 74,
      accuracy: 4,
      heading: 140,
      isLive: true,
      freshness: 'LIVE',
      lastUpdated: new Date().toISOString(),
    },
    {
      tripID: 'trip-007',
      vehicleID: 'veh-cargo-08',
      vehicleName: 'Mahindra Supro Cargo (CARGO-08)',
      registrationNumber: 'GJ05MH8008',
      driverID: 'drv-kavya',
      driverName: 'Kavya Nair',
      source: 'Ahmedabad Textile Market',
      destination: 'Jaipur Pink City Cloth Market',
      status: 'IN_TRANSIT',
      latitude: 24.5854,
      longitude: 73.7125,
      speed: 58,
      accuracy: 6,
      heading: 25,
      isLive: true,
      freshness: 'UPDATING',
      lastUpdated: new Date().toISOString(),
    },
    {
      tripID: 'trip-004',
      vehicleID: 'veh-van-05',
      vehicleName: 'Ford Transit Cargo (VAN-05)',
      registrationNumber: 'GJ01AB1234',
      driverID: 'drv-elena',
      driverName: 'Elena Rostova',
      source: 'Ahmedabad Central Depot',
      destination: 'Gandhinagar Secretariat',
      status: 'ACCEPTED',
      latitude: 23.0350,
      longitude: 72.5850,
      speed: 0,
      accuracy: 8,
      heading: 0,
      isLive: false,
      freshness: 'STALE',
      lastUpdated: new Date().toISOString(),
    },
  ]);

  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(vehicles[0].vehicleID);

  const selectedVehicle = vehicles.find((v) => v.vehicleID === selectedVehicleId) || vehicles[0];

  const getFreshnessBadge = (freshness: string) => {
    switch (freshness) {
      case 'LIVE':
        return <span className="badge badge-success">LIVE GPS</span>;
      case 'UPDATING':
        return <span className="badge badge-info">UPDATING</span>;
      case 'STALE':
        return <span className="badge badge-warning">STALE</span>;
      default:
        return <span className="badge badge-neutral">NO SIGNAL</span>;
    }
  };

  return (
    <div>
      {/* Top Action Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#111827', margin: 0 }}>
            Live GIS Fleet Telematics
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: '0.25rem 0 0 0' }}>
            High-frequency GPS coordinate streams, speed telemetry, and dispatch corridor status.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* WebSocket Live Stream Indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: '#D1FAE5',
              color: '#065F46',
              padding: '0.35rem 0.75rem',
              borderRadius: 999,
              fontSize: '0.78rem',
              fontWeight: 700,
            }}
          >
            <Radio size={14} className="animate-pulse" />
            <span>Telemetry Connected</span>
          </div>

          <button
            type="button"
            onClick={() => {}}
            className="btn-secondary"
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
          >
            <RefreshCw size={14} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Main Split Telematics Canvas */}
      <div className="tracking-two-col-grid" style={{ gap: '1.5rem', alignItems: 'start' }}>
        {/* Left Column: Active Vehicle Stream List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: '#6B7280', letterSpacing: '0.04em' }}>
            En Route Vehicles ({vehicles.length})
          </div>

          {vehicles.map((v) => {
            const isSelected = v.vehicleID === selectedVehicle?.vehicleID;
            return (
              <div
                key={v.vehicleID || v.tripID}
                onClick={() => setSelectedVehicleId(v.vehicleID)}
                style={{
                  background: '#FFFFFF',
                  border: `1.5px solid ${isSelected ? '#F59E0B' : '#E5E7EB'}`,
                  borderRadius: 10,
                  padding: '1rem',
                  cursor: 'pointer',
                  boxShadow: isSelected ? '0 4px 6px -1px rgba(245, 158, 11, 0.15)' : '0 1px 2px rgba(0,0,0,0.03)',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#111827' }}>
                    {v.vehicleName || `Vehicle ${v.vehicleID}`}
                  </div>
                  {getFreshnessBadge(v.freshness)}
                </div>

                <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.5rem' }}>
                  Driver: <strong>{v.driverName || 'Assigned'}</strong> • Plate: <span className="ops-mono">{v.registrationNumber}</span>
                </div>

                <div style={{ background: '#F9FAFB', padding: '0.5rem 0.65rem', borderRadius: 6, fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', color: '#374151' }}>
                  <span>Speed: <strong>{v.speed || 0} km/h</strong></span>
                  <span className="ops-mono">
                    {v.latitude ? `${v.latitude.toFixed(4)}, ${v.longitude?.toFixed(4)}` : 'Signal searching...'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: GIS Telematics Canvas & Metrics */}
        {selectedVehicle && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* GIS Simulated Vector Corridor Map */}
            <div className="app-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div
                style={{
                  height: 380,
                  background: 'linear-gradient(180deg, #F8FAFC 0%, #EDF2F7 100%)',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  borderBottom: '1px solid #E5E7EB',
                }}
              >
                {/* Simulated Geographic Grid Lines */}
                <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.4 }}>
                  <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#CBD5E1" strokeWidth="1" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                  {/* Corridor Route Polyline */}
                  <path
                    d="M 60 300 Q 250 180 450 200 T 800 120"
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="4"
                    strokeDasharray="6 4"
                  />
                </svg>

                {/* Live Vehicle Marker */}
                <div
                  style={{
                    position: 'absolute',
                    top: '48%',
                    left: '46%',
                    transform: 'translate(-50%, -50%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    zIndex: 10,
                  }}
                >
                  <div
                    style={{
                      background: '#F59E0B',
                      color: '#FFFFFF',
                      padding: '0.35rem 0.75rem',
                      borderRadius: 999,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      marginBottom: 6,
                    }}
                  >
                    <Truck size={14} />
                    <span>{selectedVehicle.vehicleName} ({selectedVehicle.speed} km/h)</span>
                  </div>
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: '#D97706',
                      border: '3px solid #FFFFFF',
                      boxShadow: '0 0 0 4px rgba(245, 158, 11, 0.4)',
                    }}
                  />
                </div>

                {/* Corridor Endpoint Pins */}
                <div style={{ position: 'absolute', bottom: 50, left: 50, display: 'flex', alignItems: 'center', gap: 6, background: '#FFFFFF', padding: '0.35rem 0.65rem', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.75rem', fontWeight: 600 }}>
                  <MapPin size={14} color="#10B981" />
                  <span>Origin: {selectedVehicle.source?.split(',')[0]}</span>
                </div>

                <div style={{ position: 'absolute', top: 50, right: 60, display: 'flex', alignItems: 'center', gap: 6, background: '#FFFFFF', padding: '0.35rem 0.65rem', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.75rem', fontWeight: 600 }}>
                  <Navigation size={14} color="#3B82F6" />
                  <span>Destination: {selectedVehicle.destination?.split(',')[0]}</span>
                </div>
              </div>

              {/* Vehicle Telemetry Deck */}
              <div style={{ padding: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', background: '#FFFFFF' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#6B7280', fontWeight: 700 }}>Telemetry Speed</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827', marginTop: 2 }}>
                    {selectedVehicle.speed} <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6B7280' }}>km/h</span>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#6B7280', fontWeight: 700 }}>GPS Latitude</div>
                  <div className="ops-mono" style={{ fontSize: '1.05rem', fontWeight: 700, color: '#111827', marginTop: 4 }}>
                    {selectedVehicle.latitude?.toFixed(6) || 'Signal Pending'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#6B7280', fontWeight: 700 }}>GPS Longitude</div>
                  <div className="ops-mono" style={{ fontSize: '1.05rem', fontWeight: 700, color: '#111827', marginTop: 4 }}>
                    {selectedVehicle.longitude?.toFixed(6) || 'Signal Pending'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#6B7280', fontWeight: 700 }}>Signal Precision</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#065F46', marginTop: 4 }}>
                    {selectedVehicle.accuracy ? `±${selectedVehicle.accuracy}m Precision` : 'Estimated Corridor'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
