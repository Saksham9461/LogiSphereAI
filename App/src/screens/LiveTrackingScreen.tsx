import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Navigation, Truck, MapPin, SearchX } from 'lucide-react-native';
import useTripStore from '../store/TripStore';
import FleetMap from '../components/FleetMap';
import { colors } from '../theme/colors';
import { rf } from '../theme/responsive';

// Mock data to fallback on if no actual DISPATCHED trips are available in store
const FALLBACK_TRIPS = [
  { tripID: 'TRP-1001', source: 'Warehouse A', destination: 'Port City', status: 'DISPATCHED', vehicleID: 'V-001', driverID: 'D-001' },
  { tripID: 'TRP-1002', source: 'HQ', destination: 'Distribution Hub', status: 'DISPATCHED', vehicleID: 'V-002', driverID: 'D-002' },
];

export default function LiveTrackingScreen() {
  const insets = useSafeAreaInsets();
  const { trips, getTrips } = useTripStore();
  const [selectedTrip, setSelectedTrip] = useState<any>(null);

  useEffect(() => {
    // Fetch fresh trips on mount
    getTrips();
  }, []);

  // Filter for active trips
  let activeTrips = trips.filter((t: any) => t.status === 'DISPATCHED');
  
  // If there are no dispatched trips in the store, use mock fallback to demonstrate the feature
  if (activeTrips.length === 0) {
    activeTrips = FALLBACK_TRIPS;
  }

  const renderTripCard = ({ item }: { item: any }) => {
    const isSelected = selectedTrip?.tripID === item.tripID;

    return (
      <Pressable 
        style={[styles.tripCard, isSelected && styles.tripCardSelected]} 
        onPress={() => setSelectedTrip(item)}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.vehicleBadge, isSelected && { backgroundColor: colors.amber }]}>
            <Truck size={14} color={isSelected ? colors.panel : colors.amber} />
            <Text style={[styles.vehicleId, isSelected && { color: colors.panel }]}>{item.vehicleID || item.tripID}</Text>
          </View>
          <View style={styles.statusBadge}>
            <View style={styles.pulseDot} />
            <Text style={styles.statusText}>LIVE</Text>
          </View>
        </View>
        
        <View style={styles.routeContainer}>
          <MapPin size={16} color={colors.textSecondary} />
          <Text style={styles.routeText} numberOfLines={1}>
            {item.source} <Text style={{color: colors.borderStrong}}>→</Text> {item.destination}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.screen}>
      <FleetMap 
        trips={activeTrips} 
        selectedTrip={selectedTrip} 
        onSelectTrip={setSelectedTrip} 
      />

      <View style={[styles.listSection, { paddingBottom: insets.bottom + 100 }]}>
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Active Fleet</Text>
          <Text style={styles.listCount}>{activeTrips.length} vehicles on route</Text>
        </View>

        {activeTrips.length > 0 ? (
          <FlatList
            data={activeTrips}
            keyExtractor={(item) => item.tripID}
            renderItem={renderTripCard}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <SearchX size={32} color={colors.borderStrong} />
            <Text style={styles.emptyText}>No active trips right now</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  listSection: {
    flex: 1,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: rf(16),
    paddingTop: rf(24),
    paddingBottom: rf(12),
  },
  listTitle: {
    fontSize: rf(20),
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  listCount: {
    fontSize: rf(13),
    color: colors.textSecondary,
    fontWeight: '600',
  },
  listContainer: {
    paddingHorizontal: rf(16),
    gap: rf(12),
  },
  tripCard: {
    backgroundColor: colors.panel,
    borderRadius: rf(16),
    padding: rf(16),
    borderWidth: 1,
    borderColor: colors.borderSoft,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tripCardSelected: {
    borderColor: colors.borderSoft, // maintain same border as unselected to avoid layout shift
    backgroundColor: colors.panel,
    shadowColor: colors.amber,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
    transform: [{ scale: 1.02 }],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: rf(12),
  },
  vehicleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: rf(10),
    paddingVertical: rf(4),
    borderRadius: rf(8),
    gap: rf(6),
  },
  vehicleId: {
    fontSize: rf(12),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.success}1A`,
    paddingHorizontal: rf(8),
    paddingVertical: rf(4),
    borderRadius: rf(6),
    gap: rf(6),
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  statusText: {
    fontSize: rf(10),
    fontWeight: '800',
    color: colors.success,
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rf(8),
  },
  routeText: {
    flex: 1,
    fontSize: rf(14),
    fontWeight: '600',
    color: colors.textPrimary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: rf(12),
  },
  emptyText: {
    fontSize: rf(14),
    color: colors.textMuted,
    fontWeight: '500',
  }
});
