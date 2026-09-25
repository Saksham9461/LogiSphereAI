import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import { Map, Camera, Marker } from '@maplibre/maplibre-react-native';
import { MAPTILER_API_KEY } from '../config/env';
import { MockVehicle, MOCK_VEHICLES } from '../data/mockVehicles';
import { colors } from '../theme/colors';
import { rf } from '../theme/responsive';
import { Truck } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const MAP_HEIGHT = rf(300);

interface FleetMapProps {
  trips: any[];
  selectedTrip: any | null;
  onSelectTrip: (trip: any) => void;
  style?: any;
}

export default function FleetMap({ trips, selectedTrip, onSelectTrip, style }: FleetMapProps) {
  const cameraRef = useRef<any>(null); // Type is CameraRef, but any is safe here

  // We manage the local state of vehicles for mock movement simulation
  const [vehicles, setVehicles] = useState<MockVehicle[]>(MOCK_VEHICLES);

  // Mock movement simulation loop
  useEffect(() => {
    // Only run movement if there are vehicles to move
    if (vehicles.length === 0) return;

    const intervalId = setInterval(() => {
      setVehicles(prevVehicles =>
        prevVehicles.map(vehicle => {
          // Add a tiny random offset to simulate movement
          // Using a small random factor to change lat/lng
          const latOffset = (Math.random() - 0.5) * 0.0005;
          const lngOffset = (Math.random() - 0.5) * 0.0005;

          return {
            ...vehicle,
            latitude: vehicle.latitude + latOffset,
            longitude: vehicle.longitude + lngOffset,
          };
        })
      );
    }, 3000); // update every 3 seconds

    return () => clearInterval(intervalId);
  }, []);

  // Update camera when a trip is selected
  useEffect(() => {
    if (selectedTrip && cameraRef.current) {
      // Find the corresponding mock vehicle to get its current coordinates
      const targetVehicle = vehicles.find(v => v.tripID === selectedTrip.tripID);
      
      if (targetVehicle && cameraRef.current) {
        cameraRef.current.flyTo({
          center: [targetVehicle.longitude, targetVehicle.latitude],
          zoom: 14,
          duration: 1000,
        });
      }
    }
  }, [selectedTrip, vehicles]);

  // Center on all vehicles initially
  useEffect(() => {
    if (!selectedTrip && vehicles.length > 0 && cameraRef.current) {
      cameraRef.current.fitBounds(
        [minLon, minLat, maxLon, maxLat],
        { padding: { top: 50, bottom: 50, left: 50, right: 50 }, duration: 1000 }
      );
    }
  }, []);

  const styleURL = `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_API_KEY}`;

  // Calculate default bounds if no selection
  const lons = vehicles.map(v => v.longitude);
  const lats = vehicles.map(v => v.latitude);
  const minLon = Math.min(...lons) || 72.5;
  const maxLon = Math.max(...lons) || 72.6;
  const minLat = Math.min(...lats) || 23.0;
  const maxLat = Math.max(...lats) || 23.1;

  return (
    <View style={[styles.container, style]}>
      <Map
        style={styles.map}
        mapStyle={styleURL}
        logo={false}
        attribution={false}
      >
        <Camera
          ref={cameraRef}
          initialViewState={
            selectedTrip 
              ? {
                  center: [
                    vehicles.find(v => v.tripID === selectedTrip.tripID)?.longitude || 72.5714, 
                    vehicles.find(v => v.tripID === selectedTrip.tripID)?.latitude || 23.0225
                  ],
                  zoom: 14
                }
              : {
                  bounds: [minLon, minLat, maxLon, maxLat],
                  padding: { left: 50, right: 50, top: 50, bottom: 50 }
                }
          }
        />

        {vehicles.map(vehicle => {
          const isSelected = selectedTrip?.tripID === vehicle.tripID;
          
          return (
            <Marker
              key={vehicle.tripID}
              id={`marker-${vehicle.tripID}`}
              lngLat={[vehicle.longitude, vehicle.latitude]}
              onPress={() => onSelectTrip(vehicle)} // Synchronize map tap with list
            >
              <View 
                style={[
                  styles.markerContainer, 
                  isSelected && styles.markerContainerSelected
                ]}
              >
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
  }
});
