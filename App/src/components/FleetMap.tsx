import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import { Map, Camera, Marker, GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';
import { MAPTILER_API_KEY } from '../config/env';
import { colors } from '../theme/colors';
import { rf } from '../theme/responsive';
import { Truck, MapPin } from 'lucide-react-native';
import useVehicleStore from '../store/VehicleStore';

const { width } = Dimensions.get('window');
const MAP_HEIGHT = rf(310);

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
  trips = [],
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
  const vehicles = useVehicleStore((state) => state.vehicles);

  const getVehicleDisplayName = (vID: string, fallbackName?: string) => {
    const cleanId = String(vID || '').trim();
    const found = (vehicles || []).find(
      (v: any) =>
        String(v.vehicleID || v.vehicleid || v.id).toLowerCase() === cleanId.toLowerCase()
    );
    if (found?.name) return found.name;
    if (fallbackName && !fallbackName.toLowerCase().startsWith('veh-')) {
      return fallbackName;
    }
    if (found?.registrationNumber) return found.registrationNumber;
    return fallbackName || cleanId || 'Vehicle';
  };

  // Extract real coordinates only — NEVER hardcode mock coordinates for unrecorded locations
  const realMapVehicles = (trips || [])
    .map((t: any) => {
      const lat =
        t.latitude !== undefined && t.latitude !== null
          ? Number(t.latitude)
          : t.sourceLatitude !== undefined && t.sourceLatitude !== null
          ? Number(t.sourceLatitude)
          : t.sourcelatitude !== undefined && t.sourcelatitude !== null
          ? Number(t.sourcelatitude)
          : null;

      const lng =
        t.longitude !== undefined && t.longitude !== null
          ? Number(t.longitude)
          : t.sourceLongitude !== undefined && t.sourceLongitude !== null
          ? Number(t.sourceLongitude)
          : t.sourcelongitude !== undefined && t.sourcelongitude !== null
          ? Number(t.sourcelongitude)
          : null;

      if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) {
        return null;
      }

      const vID = String(t.vehicleID || t.vehicleid || t.vehicle || 'Vehicle');
      const vName = getVehicleDisplayName(vID, t.vehicleName || t.registrationNumber);

      return {
        tripID: String(t.tripID || t.tripid || t.id),
        vehicleID: vID,
        vehicleName: vName,
        driverID: String(t.driverID || t.driverid || t.driver || 'Driver'),
        driverName: String(t.driverName || 'Driver'),
        source: String(t.source || ''),
        destination: String(t.destination || ''),
        status: String(t.status || ''),
        latitude: lat,
        longitude: lng,
        speed: Number(t.speed ?? 0),
        freshness: t.freshness || (t.isLive ? 'LIVE' : 'UPDATING'),
        isLive: Boolean(t.isLive),
      };
    })
    .filter(Boolean) as any[];

  // Smoothly move camera when selectedTrip changes without reloading the map
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
      const targetVehicle = realMapVehicles.find(
        (v) => v.tripID === String(selectedTrip.tripID || selectedTrip.id)
      );
      if (targetVehicle) {
        cameraRef.current.flyTo({
          center: [targetVehicle.longitude, targetVehicle.latitude],
          zoom: 14.5,
          duration: 900,
        });
      }
    }
  }, [selectedTrip, originCoords, destCoords]);

  const styleURL = `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_API_KEY}`;

  const lons = realMapVehicles.map((v) => v.longitude);
  const lats = realMapVehicles.map((v) => v.latitude);
  const minLon = lons.length > 0 ? Math.min(...lons) - 0.03 : 72.5;
  const maxLon = lons.length > 0 ? Math.max(...lons) + 0.03 : 72.6;
  const minLat = lats.length > 0 ? Math.min(...lats) - 0.03 : 23.0;
  const maxLat = lats.length > 0 ? Math.max(...lats) + 0.03 : 23.1;

  const unselectedRoutes = routeLines.filter((r) => r.id !== selectedRouteId);
  const selectedRoute = routeLines.find((r) => r.id === selectedRouteId);

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
              : selectedTrip && selectedTrip.latitude && selectedTrip.longitude
              ? {
                  center: [Number(selectedTrip.longitude), Number(selectedTrip.latitude)],
                  zoom: 14.5,
                }
              : realMapVehicles.length > 0
              ? {
                  bounds: [minLon, minLat, maxLon, maxLat],
                  padding: { left: 50, right: 50, top: 50, bottom: 50 },
                }
              : {
                  center: [72.5714, 23.0225],
                  zoom: 11,
                }
          }
        />

        {/* 1. UNSELECTED ROUTES */}
        {unselectedRoutes.map((route) => {
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

        {/* 2. SELECTED ROUTE */}
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

        {/* 3. ORIGIN & DESTINATION PINS */}
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

        {/* 4. REAL-TIME VEHICLE MARKERS */}
        {realMapVehicles.map((vehicle) => {
          const isSelected = String(selectedTrip?.tripID || selectedTrip?.id) === vehicle.tripID;
          const isLive = vehicle.freshness === 'LIVE';

          return (
            <Marker
              key={vehicle.tripID}
              id={`marker-${vehicle.tripID}`}
              lngLat={[vehicle.longitude, vehicle.latitude]}
              onPress={() => onSelectTrip(vehicle)}
            >
              <View
                style={[
                  styles.markerContainer,
                  isSelected && styles.markerContainerSelected,
                  isLive && !isSelected && styles.markerContainerLive,
                ]}
              >
                <Truck size={14} color={isSelected ? '#1a1200' : colors.panel} />
                {isSelected ? (
                  <View style={styles.markerInfo}>
                    <Text style={[styles.markerText, isSelected && { color: '#1a1200' }]}>
                      {vehicle.vehicleName || getVehicleDisplayName(vehicle.vehicleID)}
                    </Text>
                    <Text style={[styles.markerSpeed, isSelected && { color: 'rgba(0,0,0,0.7)' }]}>
                      {Math.round(vehicle.speed)} km/h {isLive ? '• LIVE' : ''}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.miniBadge}>
                    <View
                      style={[
                        styles.indicatorDot,
                        { backgroundColor: isLive ? '#22c55e' : '#f59e0b' },
                      ]}
                    />
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
    paddingHorizontal: rf(8),
    paddingVertical: rf(6),
    borderRadius: rf(20),
    borderWidth: 2,
    borderColor: colors.panel,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 6,
  },
  markerContainerLive: {
    backgroundColor: '#0284c7',
    borderColor: '#38bdf8',
  },
  markerContainerSelected: {
    backgroundColor: colors.amber,
    borderColor: '#fef08a',
    transform: [{ scale: 1.12 }],
    zIndex: 20,
  },
  miniBadge: {
    marginLeft: rf(4),
  },
  indicatorDot: {
    width: rf(6),
    height: rf(6),
    borderRadius: rf(3),
  },
  markerInfo: {
    marginLeft: rf(6),
  },
  markerText: {
    color: colors.panel,
    fontSize: rf(11),
    fontWeight: '700',
  },
  markerSpeed: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: rf(9),
    fontWeight: '600',
  },
});
