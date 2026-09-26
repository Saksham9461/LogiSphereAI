import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import { Map, Camera, Marker, GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';
import { MAPTILER_API_KEY } from '../config/env';
import { MockVehicle, MOCK_VEHICLES } from '../data/mockVehicles';
import { colors } from '../theme/colors';
import { rf } from '../theme/responsive';
import { Truck, MapPin } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const MAP_HEIGHT = rf(300);

export interface RouteLineItem {
  id: string;
  coordinates: [number, number][]; // GeoJSON [[lng, lat], ...]
  isRecommended?: boolean;
  isSelected?: boolean;
}

interface FleetMapProps {
  trips: any[];
  selectedTrip: any | null;
  onSelectTrip: (trip: any) => void;
  style?: any;
  routeLines?: RouteLineItem[];
  selectedRouteId?: string;
  recommendedRouteId?: string;
  originCoords?: { latitude: number; longitude: number };
  destCoords?: { latitude: number; longitude: number };
}

export default function FleetMap({
  trips,
  selectedTrip,
  onSelectTrip,
  style,
  routeLines = [],
  selectedRouteId,
  recommendedRouteId,
  originCoords,
  destCoords,
}: FleetMapProps) {
  const cameraRef = useRef<any>(null);
  const [vehicles, setVehicles] = useState<MockVehicle[]>(MOCK_VEHICLES);

  // Mock movement simulation loop
  useEffect(() => {
    if (vehicles.length === 0) return;

    const intervalId = setInterval(() => {
      setVehicles(prevVehicles =>
        prevVehicles.map(vehicle => {
          const latOffset = (Math.random() - 0.5) * 0.0005;
          const lngOffset = (Math.random() - 0.5) * 0.0005;

          return {
            ...vehicle,
            latitude: vehicle.latitude + latOffset,
            longitude: vehicle.longitude + lngOffset,
          };
        })
      );
    }, 3000);

    return () => clearInterval(intervalId);
  }, []);

  // Update camera when a trip or route is selected
  useEffect(() => {
    if (originCoords && destCoords && cameraRef.current) {
      const minLon = Math.min(originCoords.longitude, destCoords.longitude) - 0.05;
      const maxLon = Math.max(originCoords.longitude, destCoords.longitude) + 0.05;
      const minLat = Math.min(originCoords.latitude, destCoords.latitude) - 0.05;
      const maxLat = Math.max(originCoords.latitude, destCoords.latitude) + 0.05;

      cameraRef.current.fitBounds([minLon, minLat, maxLon, maxLat], {
        padding: { top: 60, bottom: 60, left: 60, right: 60 },
        duration: 1000,
      });
    } else if (selectedTrip && cameraRef.current) {
      const targetVehicle = vehicles.find(v => v.tripID === selectedTrip.tripID);
      if (targetVehicle) {
        cameraRef.current.flyTo({
          center: [targetVehicle.longitude, targetVehicle.latitude],
          zoom: 14,
          duration: 1000,
        });
      }
    }
  }, [selectedTrip, vehicles, originCoords, destCoords]);

  const styleURL = `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_API_KEY}`;

  const lons = vehicles.map(v => v.longitude);
  const lats = vehicles.map(v => v.latitude);
  const minLon = Math.min(...lons) || 72.5;
  const maxLon = Math.max(...lons) || 72.6;
  const minLat = Math.min(...lats) || 23.0;
  const maxLat = Math.max(...lats) || 23.1;

  // Separate route lines into selected and unselected for proper z-index rendering
  const unselectedRoutes = routeLines.filter(r => r.id !== selectedRouteId);
  const selectedRoute = routeLines.find(r => r.id === selectedRouteId);

  return (
    <View style={[styles.container, style]}>
      <Map style={styles.map} mapStyle={styleURL} logo={false} attribution={false}>
        <Camera
          ref={cameraRef}
          initialViewState={
            originCoords && destCoords
              ? {
                  bounds: [
                    Math.min(originCoords.longitude, destCoords.longitude) - 0.05,
                    Math.min(originCoords.latitude, destCoords.latitude) - 0.05,
                    Math.max(originCoords.longitude, destCoords.longitude) + 0.05,
                    Math.max(originCoords.latitude, destCoords.latitude) + 0.05,
                  ],
                  padding: { left: 40, right: 40, top: 40, bottom: 40 },
                }
              : selectedTrip
              ? {
                  center: [
                    vehicles.find(v => v.tripID === selectedTrip.tripID)?.longitude || 72.5714,
                    vehicles.find(v => v.tripID === selectedTrip.tripID)?.latitude || 23.0225,
                  ],
                  zoom: 14,
                }
              : {
                  bounds: [minLon, minLat, maxLon, maxLat],
                  padding: { left: 50, right: 50, top: 50, bottom: 50 },
                }
          }
        />

        {/* 1. DRAW UNSELECTED ROUTE POLYLINES (BACKGROUND) */}
        {unselectedRoutes.map(route => {
          if (!route.coordinates || route.coordinates.length < 2) return null;
          const geoJson: any = {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: route.coordinates,
            },
            properties: {},
          };

          return (
            <GeoJSONSource key={`source-${route.id}`} id={`source-${route.id}`} data={geoJson}>
              <Layer
                id={`line-${route.id}`}
                type="line"
                paint={{
                  'line-color': '#64748b',
                  'line-width': 4,
                  'line-opacity': 0.6,
                }}
              />
            </GeoJSONSource>
          );
        })}

        {/* 2. DRAW SELECTED / RECOMMENDED ROUTE POLYLINE (FOREGROUND & HIGHLIGHTED) */}
        {selectedRoute && selectedRoute.coordinates.length >= 2 && (
          <GeoJSONSource
            key={`source-${selectedRoute.id}`}
            id={`source-${selectedRoute.id}`}
            data={{
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: selectedRoute.coordinates,
              },
              properties: {},
            }}
          >
            <Layer
              id={`line-${selectedRoute.id}`}
              type="line"
              paint={{
                'line-color': selectedRoute.id === recommendedRouteId ? '#22c55e' : '#f59e0b',
                'line-width': 6,
                'line-opacity': 0.9,
              }}
            />
          </GeoJSONSource>
        )}

        {/* 3. ORIGIN & DESTINATION MARKERS FOR ROUTE INTELLIGENCE */}
        {originCoords && (
          <Marker id="origin-marker" lngLat={[originCoords.longitude, originCoords.latitude]}>
            <View style={[styles.customPin, { backgroundColor: colors.amber }]}>
              <MapPin size={14} color="#1a1200" />
            </View>
          </Marker>
        )}

        {destCoords && (
          <Marker id="dest-marker" lngLat={[destCoords.longitude, destCoords.latitude]}>
            <View style={[styles.customPin, { backgroundColor: colors.green }]}>
              <MapPin size={14} color="#fff" />
            </View>
          </Marker>
        )}

        {/* 4. VEHICLE MARKERS */}
        {vehicles.map(vehicle => {
          const isSelected = selectedTrip?.tripID === vehicle.tripID;

          return (
            <Marker
              key={vehicle.tripID}
              id={`marker-${vehicle.tripID}`}
              lngLat={[vehicle.longitude, vehicle.latitude]}
              onPress={() => onSelectTrip(vehicle)}
            >
              <View style={[styles.markerContainer, isSelected && styles.markerContainerSelected]}>
                <Truck size={14} color={colors.panel} />
                {isSelected && (
                  <View style={styles.markerInfo}>
                    <Text style={styles.markerText}>{vehicle.vehicleID}</Text>
                    <Text style={styles.markerSpeed}>{Math.round(vehicle.speed)} km/h</Text>
                  </View>
                )}
              </View>
            </Marker>
          );
        })}
      </Map>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: MAP_HEIGHT,
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  map: {
    flex: 1,
  },
  customPin: {
    padding: rf(6),
    borderRadius: rf(20),
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
  },
  markerContainer: {
    backgroundColor: colors.blue,
    padding: rf(8),
    borderRadius: rf(20),
    borderWidth: 2,
    borderColor: colors.panel,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  markerContainerSelected: {
    backgroundColor: colors.amber,
    transform: [{ scale: 1.1 }],
    zIndex: 10,
  },
  markerInfo: {
    marginLeft: rf(6),
  },
  markerText: {
    color: colors.panel,
    fontSize: rf(12),
    fontWeight: '700',
  },
  markerSpeed: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: rf(10),
    fontWeight: '500',
  },
});
