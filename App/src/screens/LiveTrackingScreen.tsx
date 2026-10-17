import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Truck, MapPin, SearchX, Gauge, User, Radio, Clock } from 'lucide-react-native';
import useTrackingStore, { LiveVehicle } from '../store/TrackingStore';
import useTripStore from '../store/TripStore';
import useVehicleStore from '../store/VehicleStore';
import FleetMap from '../components/FleetMap';
import TripDelayInsightsModal from '../components/TripDelayInsightsModal';
import { colors } from '../theme/colors';
import { rf } from '../theme/responsive';

export default function LiveTrackingScreen({ route }: any) {
  const insets = useSafeAreaInsets();
  const { trips, getTrips } = useTripStore();
  const { vehicles, getVehicles } = useVehicleStore();
  const {
    liveFleet,
    selectedTrip,
    loading: trackingLoading,
    fetchLiveFleet,
    setSelectedTrip,
    subscribeRealtime,
    unsubscribeRealtime,
  } = useTrackingStore();

  const [delayModalTripId, setDelayModalTripId] = useState<string | null>(null);

  const getVehicleDisplayName = useCallback((vID: string, fallbackName?: string) => {
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
  }, [vehicles]);

  const refreshData = useCallback(async () => {
    await Promise.all([fetchLiveFleet(), getTrips(), getVehicles()]);
  }, [fetchLiveFleet, getTrips, getVehicles]);

  useEffect(() => {
    refreshData();
    subscribeRealtime();

    return () => {
      unsubscribeRealtime();
    };
  }, []);



  // Merge trips from TripStore and TrackingStore so that any active trip is immediately visible
  const activeFleet = useMemo(() => {
    const list: LiveVehicle[] = [...liveFleet];

    const activeTripsFromStore = (trips || []).filter((t: any) =>
      [
        'ACCEPTED',
        'ASSIGNED',
        'DISPATCHED',
        'IN_TRANSIT',
        'GOING_TO_PICKUP',
        'ARRIVED_AT_PICKUP',
        'PICKED_UP',
        'ARRIVED_AT_DROP',
      ].includes(String(t.status || '').toUpperCase().replace(/[\s-]+/g, '_'))
    );

    for (const t of activeTripsFromStore) {
      const tId = String(t.tripID || t.tripid || t.id || '');
      if (!tId) continue;

      const alreadyInList = list.some(
        (v) => v.tripID.toLowerCase() === tId.toLowerCase()
      );

      if (!alreadyInList) {
        // Resolve coordinates
        let lat = t.latitude ?? t.sourceLatitude ?? t.sourcelatitude ?? null;
        let lng = t.longitude ?? t.sourceLongitude ?? t.sourcelongitude ?? null;

        if (lat === null || lng === null) {
          const s = String(t.source || '').toLowerCase();
          if (s.includes('gandhinagar')) {
            lat = 23.2156;
            lng = 72.6369;
          } else if (s.includes('ahmedabad')) {
            lat = 23.0225;
            lng = 72.5714;
          } else if (s.includes('surat')) {
            lat = 21.1702;
            lng = 72.8311;
          } else if (s.includes('mumbai')) {
            lat = 19.033;
            lng = 73.0297;
          } else if (s.includes('pune')) {
            lat = 18.5204;
            lng = 73.8567;
          } else if (s.includes('jaipur')) {
            lat = 26.9124;
            lng = 75.7873;
          } else if (s.includes('jodhpur')) {
            lat = 26.2389;
            lng = 73.0243;
          }
        }

        const vID = String(t.vehicleID || t.vehicleid || t.vehicle || 'Vehicle');
        list.push({
          tripID: tId,
          vehicleID: vID,
          vehicleName: getVehicleDisplayName(vID, t.vehicleName || t.registrationNumber),
          registrationNumber: String(t.registrationNumber || ''),
          driverID: String(t.driverID || t.driverid || t.driver || 'Driver'),
          driverName: String(t.driverName || 'Driver'),
          driverPhone: t.driverPhone || t.driverphone || '',
          source: String(t.source || ''),
          destination: String(t.destination || ''),
          status: String(t.status || ''),
          latitude: lat !== null ? Number(lat) : null,
          longitude: lng !== null ? Number(lng) : null,
          speed: Number(t.speed ?? 0),
          accuracy: null,
          heading: null,
          isLive: false,
          freshness: 'NO_SIGNAL',
          lastUpdated: t.updatedAt || t.updatedat || null,
        });
      }
    }

    return list;
  }, [liveFleet, trips]);

  // Auto-focus vehicle or trip when navigated with parameters from AI Assistant
  useEffect(() => {
    const targetTripId = route?.params?.tripID;
    const targetVehicleId = route?.params?.vehicleID;
    if ((targetTripId || targetVehicleId) && activeFleet.length > 0) {
      const found = activeFleet.find(
        (v) =>
          (targetTripId && v.tripID.toLowerCase() === String(targetTripId).toLowerCase()) ||
          (targetVehicleId && v.vehicleID.toLowerCase() === String(targetVehicleId).toLowerCase())
      );
      if (found) {
        setSelectedTrip(found);
      }
    }
  }, [route?.params?.tripID, route?.params?.vehicleID, activeFleet]);

  const getFreshnessConfig = (freshness: LiveVehicle['freshness']) => {
    switch (freshness) {
      case 'LIVE':
        return {
          label: 'LIVE',
          color: '#22c55e',
          bg: 'rgba(34, 197, 94, 0.16)',
          border: 'rgba(34, 197, 94, 0.4)',
        };
      case 'UPDATING':
        return {
          label: 'UPDATING',
          color: colors.amber,
          bg: 'rgba(245, 158, 11, 0.16)',
          border: 'rgba(245, 158, 11, 0.4)',
        };
      case 'STALE':
        return {
          label: 'LOCATION STALE',
          color: '#f97316',
          bg: 'rgba(249, 115, 22, 0.16)',
          border: 'rgba(249, 115, 22, 0.4)',
        };
      case 'NO_SIGNAL':
      default:
        return {
          label: 'NO GPS FIX',
          color: colors.textSecondary,
          bg: 'rgba(148, 163, 184, 0.16)',
          border: 'rgba(148, 163, 184, 0.3)',
        };
    }
  };

  const renderTripCard = ({ item }: { item: LiveVehicle }) => {
    const isSelected = selectedTrip?.tripID === item.tripID;
    const badge = getFreshnessConfig(item.freshness);

    return (
      <Pressable
        style={[styles.tripCard, isSelected && styles.tripCardSelected]}
        onPress={() => setSelectedTrip(item)}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.vehicleBadge, isSelected && { backgroundColor: colors.amber }]}>
            <Truck size={14} color={isSelected ? '#1a1200' : colors.amber} />
            <Text style={[styles.vehicleId, isSelected && { color: '#1a1200' }]}>
              {getVehicleDisplayName(item.vehicleID, item.vehicleName)}
            </Text>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
            <View style={[styles.pulseDot, { backgroundColor: badge.color }]} />
            <Text style={[styles.statusText, { color: badge.color }]}>{badge.label}</Text>
          </View>
        </View>

        <View style={styles.driverSpeedRow}>
          <View style={styles.metaItem}>
            <User size={13} color={colors.textSecondary} />
            <Text style={styles.metaText} numberOfLines={1}>
              {item.driverName || 'Driver'}
            </Text>
          </View>

          <View style={styles.metaItem}>
            <Gauge size={13} color={item.speed > 0 ? colors.blue : colors.textSecondary} />
            <Text
              style={[
                styles.metaText,
                item.speed > 0 && { color: colors.blue, fontWeight: '700' },
              ]}
            >
              {Math.round(item.speed)} km/h
            </Text>
          </View>
        </View>

        <View style={styles.routeContainer}>
          <MapPin size={15} color={colors.textSecondary} />
          <Text style={styles.routeText} numberOfLines={1}>
            {item.source} <Text style={{ color: colors.borderStrong }}>→</Text> {item.destination}
          </Text>
        </View>

        {item.latitude !== null && item.longitude !== null && (
          <View style={styles.telemetryRow}>
            <Radio size={12} color={colors.textMuted} />
            <Text style={styles.telemetryText}>
              GPS: {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
              {item.accuracy ? ` (±${Math.round(item.accuracy)}m)` : ''}
            </Text>
          </View>
        )}

        <View style={styles.cardActionsRow}>
          <Pressable
            style={styles.aiDelayQuickBtn}
            onPress={(e) => {
              e.stopPropagation();
              setDelayModalTripId(item.tripID);
            }}
          >
            <Clock size={12} color={colors.amber} />
            <Text style={styles.aiDelayQuickBtnText}>AI Delay Insights</Text>
          </Pressable>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.screen}>
      <FleetMap
        trips={activeFleet}
        selectedTrip={selectedTrip}
        onSelectTrip={setSelectedTrip}
      />

      <View style={[styles.listSection, { paddingBottom: insets.bottom + 90 }]}>
        <View style={styles.listHeader}>
          <View>
            <Text style={styles.listTitle}>Active Fleet</Text>
            <Text style={styles.listCount}>{activeFleet.length} vehicles on route</Text>
          </View>
        </View>

        {activeFleet.length > 0 ? (
          <FlatList
            data={activeFleet}
            keyExtractor={(item) => item.tripID}
            renderItem={renderTripCard}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={trackingLoading}
                onRefresh={refreshData}
                tintColor={colors.amber}
                colors={[colors.amber]}
              />
            }
          />
        ) : (
          <View style={styles.emptyContainer}>
            <SearchX size={36} color={colors.borderStrong} />
            <Text style={styles.emptyText}>No active trips right now</Text>
            <Text style={styles.emptySubtext}>
              When trips are started by drivers, live vehicle telemetry appears here automatically.
            </Text>
          </View>
        )}
      </View>

      {/* AI DELAY INSIGHTS MODAL */}
      <TripDelayInsightsModal
        visible={Boolean(delayModalTripId)}
        tripId={delayModalTripId}
        onClose={() => setDelayModalTripId(null)}
      />
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
    paddingTop: rf(18),
    paddingBottom: rf(12),
  },
  listTitle: {
    fontSize: rf(19),
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  listCount: {
    fontSize: rf(12),
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: rf(2),
  },
  listContainer: {
    paddingHorizontal: rf(16),
    gap: rf(12),
  },
  tripCard: {
    backgroundColor: colors.panel,
    borderRadius: rf(14),
    padding: rf(14),
    borderWidth: 1,
    borderColor: colors.borderSoft,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tripCardSelected: {
    borderColor: colors.amber,
    backgroundColor: colors.panel,
    shadowColor: colors.amber,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    transform: [{ scale: 1.01 }],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: rf(8),
  },
  vehicleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: rf(9),
    paddingVertical: rf(4),
    borderRadius: rf(7),
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
    paddingHorizontal: rf(7),
    paddingVertical: rf(3),
    borderRadius: rf(6),
    borderWidth: 1,
    gap: rf(5),
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: rf(10),
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  driverSpeedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: rf(8),
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rf(6),
  },
  metaText: {
    fontSize: rf(12),
    color: colors.textSecondary,
    fontWeight: '500',
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rf(7),
    marginBottom: rf(6),
  },
  routeText: {
    flex: 1,
    fontSize: rf(13),
    fontWeight: '600',
    color: colors.textPrimary,
  },
  telemetryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rf(5),
    paddingTop: rf(4),
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  telemetryText: {
    fontSize: rf(10),
    color: colors.textMuted,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: rf(24),
    gap: rf(8),
  },
  emptyText: {
    fontSize: rf(15),
    color: colors.textPrimary,
    fontWeight: '700',
  },
  emptySubtext: {
    fontSize: rf(12),
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: rf(17),
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: rf(8),
    paddingTop: rf(6),
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  aiDelayQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rf(5),
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: rf(10),
    paddingVertical: rf(5),
    borderRadius: rf(6),
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  aiDelayQuickBtnText: {
    fontSize: rf(11),
    fontWeight: '700',
    color: colors.amber,
  },
});
