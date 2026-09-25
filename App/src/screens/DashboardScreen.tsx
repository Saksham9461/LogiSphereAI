import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  Pressable,
  Platform,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {
  Search,
  Truck,
  CheckCircle2,
  Wrench,
  Users,
  Gauge,
  ListChecks,
  History,
  ChevronDown,
  SearchX,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import ClockInWidget from '../components/ClockInWidget';
import AttendanceHistory from '../components/AttendanceHistory';
import { colors } from '../theme/colors';
import { rf } from '../theme/responsive';
import useDashboardStore from '../store/DashboardStore';
import useTripStore from '../store/TripStore';
import useVehicleStore from '../store/VehicleStore';
import useDriverStore from '../store/DriverStore';

const STATUS_META: Record<string, { color: string; icon: any }> = {
  'On Trip': { color: colors.teal, icon: Truck },
  Completed: { color: colors.success, icon: CheckCircle2 },
  Dispatched: { color: colors.amber, icon: ListChecks },
  Draft: { color: colors.textMuted, icon: History },
};

// --- COMPONENTS ---
const StatCard = ({ title, value, color, icon: Icon }: any) => (
  <View style={[styles.statCard, { borderLeftColor: color }]}>
    <View style={styles.statCardHeader}>
      <Text style={styles.statCardTitle} numberOfLines={2}>{title}</Text>
      <View style={[styles.statCardIconBox, { backgroundColor: `${color}1A`, borderColor: `${color}40` }]}>
        <Icon size={16} color={color} strokeWidth={2.5} />
      </View>
    </View>
    <Text style={styles.statCardValue}>{value}</Text>
  </View>
);

const FilterChip = ({ label, value, options, onChange }: any) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View>
      <Pressable style={styles.filterChip} onPress={() => setIsOpen(true)}>
        {!!label && <Text style={styles.filterChipLabel}>{label}:</Text>}
        <Text style={styles.filterChipValue}>{value}</Text>
        <ChevronDown size={14} color={colors.textMuted} />
      </Pressable>

      <Modal
        visible={isOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setIsOpen(false)}
        >
          <View style={styles.dropdownContainer}>
            <Text style={styles.dropdownTitle}>Select {label}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {options.map((opt: string) => {
                const isActive = opt === value;
                return (
                  <Pressable
                    key={opt}
                    style={[
                      styles.dropdownOption,
                      isActive && { backgroundColor: `${colors.teal}15` },
                    ]}
                    onPress={() => {
                      onChange(opt);
                      setIsOpen(false);
                    }}
                  >
                    <Text style={[styles.dropdownOptionText, isActive && { color: colors.teal }]}>
                      {opt}
                    </Text>
                    {isActive && <CheckCircle2 size={16} color={colors.teal} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const TripCard = ({ trip }: any) => {
  const meta = STATUS_META[trip.status] || STATUS_META['Draft'];
  const Icon = meta.icon;

  return (
    <View style={styles.tripCard}>
      <View style={styles.tripCardHeader}>
        <View style={styles.tripCardIdBox}>
          <Text style={styles.tripCardId}>{trip.id}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${meta.color}15`, borderColor: `${meta.color}40` }]}>
          <Icon size={12} color={meta.color} strokeWidth={2.5} />
          <Text style={[styles.statusText, { color: meta.color }]}>{trip.status}</Text>
        </View>
      </View>
      <View style={styles.tripCardBody}>
        <View style={styles.tripInfoItem}>
          <Text style={styles.tripInfoLabel}>Vehicle</Text>
          <Text style={styles.tripInfoValue}>{trip.vehicle}</Text>
        </View>
        <View style={styles.tripInfoItem}>
          <Text style={styles.tripInfoLabel}>Driver</Text>
          <Text style={styles.tripInfoValue}>{trip.driver}</Text>
        </View>
        <View style={styles.tripInfoItem}>
          <Text style={styles.tripInfoLabel}>ETA</Text>
          <Text style={styles.tripInfoValue}>{trip.eta}</Text>
        </View>
      </View>
    </View>
  );
};

export default function DashboardScreen() {
  const { stats, vehicleStatus, fetchDashboardSummary, loading: loadingSummary, error: summaryError } = useDashboardStore();
  const { trips, getTrips, loading: loadingTrips, error: tripsError } = useTripStore();
  const { vehicles, getVehicles } = useVehicleStore();
  const { drivers, fetchDrivers } = useDriverStore();

  const [search, setSearch] = useState('');
  const [vehicleType, setVehicleType] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch data on screen focus
  useFocusEffect(
    useCallback(() => {
      fetchDashboardSummary();
      getTrips();
      getVehicles();
      if (fetchDrivers) fetchDrivers();
    }, [fetchDashboardSummary, getTrips, getVehicles, fetchDrivers])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchDashboardSummary(),
      getTrips(),
      getVehicles(),
      fetchDrivers ? fetchDrivers() : Promise.resolve(),
    ]);
    setRefreshing(false);
  };

  // Process live trips into TripCard presentation format
  const realTrips = useMemo(() => {
    if (!trips || !Array.isArray(trips) || trips.length === 0) return [];

    return trips.map((t: any) => {
      const tripId = String(t.tripID || t.id || 'TR-00');
      const vId = t.vehicleID || t.vehicleid;
      const dId = t.driverID || t.driverid;

      const matchedVeh = vId ? (vehicles || []).find((v: any) => (v.vehicleID || v.id) === vId) : null;
      const matchedDrv = dId ? (drivers || []).find((d: any) => (d.id || d.userID || d.driverID) === dId) : null;

      const vehicleName = t.vehicleName || t.vehicle || matchedVeh?.name || matchedVeh?.registrationNumber || vId || '--';
      const driverName = t.driverName || t.driver || matchedDrv?.name || dId || '--';

      const rawStatus = String(t.status || 'DRAFT').toUpperCase();
      let statusDisplay = 'Draft';
      if (rawStatus === 'DISPATCHED' || rawStatus === 'ON_TRIP' || rawStatus === 'ON TRIP') statusDisplay = 'On Trip';
      else if (rawStatus === 'COMPLETED') statusDisplay = 'Completed';
      else if (rawStatus === 'CANCELLED') statusDisplay = 'Cancelled';

      return {
        id: tripId,
        vehicle: vehicleName,
        driver: driverName,
        status: statusDisplay,
        rawStatus,
        eta: t.eta || (rawStatus === 'COMPLETED' ? '--' : 'En route'),
        source: t.source || '',
        destination: t.destination || '',
        type: matchedVeh?.type ? (matchedVeh.type.charAt(0).toUpperCase() + matchedVeh.type.slice(1).toLowerCase()) : (t.type || 'Van'),
      };
    });
  }, [trips, vehicles, drivers]);

  // Filtering Logic on Live Data
  const filteredTrips = useMemo(() => {
    return realTrips.filter((trip: any) => {
      const searchLower = search.trim().toLowerCase();
      const matchesSearch =
        !searchLower ||
        trip.id.toLowerCase().includes(searchLower) ||
        trip.vehicle.toLowerCase().includes(searchLower) ||
        trip.driver.toLowerCase().includes(searchLower) ||
        trip.status.toLowerCase().includes(searchLower) ||
        trip.source.toLowerCase().includes(searchLower) ||
        trip.destination.toLowerCase().includes(searchLower);

      const matchesType = vehicleType === 'All' || trip.type.toLowerCase() === vehicleType.toLowerCase();
      const matchesStatus =
        statusFilter === 'All' ||
        trip.status === statusFilter ||
        (statusFilter === 'On Trip' && (trip.status === 'Dispatched' || trip.status === 'On Trip'));

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [realTrips, search, vehicleType, statusFilter]);

  const isLoadingInitial = (loadingSummary || loadingTrips) && !summaryError && (!trips || trips.length === 0);
  const hasError = (summaryError || tripsError) && realTrips.length === 0 && !stats.activeVehicles;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.amber}
            colors={[colors.amber]}
          />
        }
      >
        {/* HEADER & SEARCH */}
        <Text style={styles.pageTitle}>Dashboard</Text>
        <View style={styles.searchContainer}>
          <Search size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search trips, drivers, vehicles..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* ERROR STATE */}
        {hasError ? (
          <View style={styles.errorCard}>
            <AlertTriangle size={24} color={colors.rose} />
            <Text style={styles.errorText}>{summaryError || tripsError || 'Unable to load dashboard metrics.'}</Text>
            <Pressable style={styles.retryButton} onPress={handleRefresh}>
              <RefreshCw size={14} color={colors.textPrimary} />
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        {/* FILTERS */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Filters</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            <FilterChip
              label="Type"
              value={vehicleType}
              onChange={setVehicleType}
              options={['All', 'Van', 'Truck', 'Mini']}
            />
            <FilterChip
              label="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={['All', 'On Trip', 'Completed', 'Dispatched', 'Draft']}
            />
          </ScrollView>
        </View>

        {/* INITIAL LOADING INDICATOR */}
        {isLoadingInitial ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={colors.amber} />
            <Text style={styles.loadingText}>Loading dashboard metrics & trips...</Text>
          </View>
        ) : (
          <>
            {/* STATS & VEHICLE STATUS (Hidden when searching) */}
            {!search && (
              <>
                <ClockInWidget />
                <AttendanceHistory />

                <View style={styles.section}>
                  <Text style={styles.sectionHeader}>Overview</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
                    <StatCard title="Active Vehicles" value={stats.activeVehicles} color={colors.amber} icon={Truck} />
                    <StatCard title="Available Vehicles" value={stats.availableVehicles} color={colors.success} icon={CheckCircle2} />
                    <StatCard title="In Maintenance" value={String(stats.vehiclesInMaintenance).padStart(2, '0')} color={colors.rose} icon={Wrench} />
                    <StatCard title="Active Trips" value={stats.activeTrips} color={colors.teal} icon={ListChecks} />
                    <StatCard title="Previous Trips" value={String(stats.previousTrips).padStart(2, '0')} color={colors.violet} icon={History} />
                    <StatCard title="Drivers on Duty" value={stats.driversOnDuty} color={colors.amber} icon={Users} />
                    <StatCard title="Fleet Util." value={`${stats.fleetUtilization}%`} color={colors.success} icon={Gauge} />
                  </ScrollView>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionHeader}>Vehicle Status</Text>
                  <View style={styles.statusPanel}>
                    {(vehicleStatus && vehicleStatus.length > 0 ? vehicleStatus : [
                      { label: 'Available', value: stats.availableVehicles, max: Math.max(stats.activeVehicles, 1), color: colors.success },
                      { label: 'On Trip', value: stats.activeTrips, max: Math.max(stats.activeVehicles, 1), color: colors.teal },
                      { label: 'In Shop', value: stats.vehiclesInMaintenance, max: Math.max(stats.activeVehicles, 1), color: colors.amber },
                      { label: 'Not Avail', value: 0, max: Math.max(stats.activeVehicles, 1), color: colors.rose },
                    ]).map((row: any) => {
                      const fillPercent = row.max ? Math.min(100, Math.max(0, (row.value / row.max) * 100)) : 0;
                      return (
                        <View key={row.label} style={styles.statusRow}>
                          <Text style={styles.statusLabel}>{row.label}</Text>
                          <View style={styles.progressBarBg}>
                            <View
                              style={[
                                styles.progressBarFill,
                                { width: `${fillPercent}%`, backgroundColor: row.color }
                              ]}
                            />
                          </View>
                          <Text style={styles.statusValue}>{row.value}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </>
            )}

            {/* TRIPS LIST */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>
                {search ? `Search Results (${filteredTrips.length})` : 'Recent Trips'}
              </Text>

              <View style={styles.tripsContainer}>
                {filteredTrips.length > 0 ? (
                  filteredTrips.map((trip: any) => (
                    <TripCard key={trip.id} trip={trip} />
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <View style={styles.emptyStateIconWrapper}>
                      <SearchX size={32} color={colors.textMuted} strokeWidth={1.5} />
                    </View>
                    <Text style={styles.emptyStateTitle}>No results found</Text>
                    <Text style={styles.emptyStateText}>
                      {search ? `We couldn't find any trips matching "${search}".` : "No trips match your current filter settings."}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingBottom: rf(50)
  },
  container: {
    paddingHorizontal: rf(16),
    paddingVertical: rf(24),
    paddingBottom: rf(40),
    flexGrow: 1,
  },
  pageTitle: {
    color: colors.textPrimary,
    fontSize: rf(28),
    fontWeight: '800',
    marginBottom: rf(20),
    letterSpacing: -1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: rf(12),
    paddingHorizontal: rf(16),
    height: rf(52),
    marginBottom: rf(24),
    gap: rf(10),
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: rf(15),
    height: '100%',
  },
  loadingState: { padding: rf(40), alignItems: 'center', justifyContent: 'center', gap: rf(12) },
  loadingText: { color: colors.textMuted, fontSize: rf(14) },
  errorCard: { backgroundColor: 'rgba(251,113,133,0.1)', borderWidth: 1, borderColor: colors.rose, borderRadius: rf(12), padding: rf(16), alignItems: 'center', gap: rf(8), marginBottom: rf(16) },
  errorText: { color: colors.rose, fontSize: rf(14), textAlign: 'center' },
  retryButton: { flexDirection: 'row', alignItems: 'center', gap: rf(6), backgroundColor: colors.panel, paddingHorizontal: rf(12), paddingVertical: rf(6), borderRadius: rf(6), borderWidth: 1, borderColor: colors.border },
  retryButtonText: { color: colors.textPrimary, fontSize: rf(13), fontWeight: '600' },

  section: {
    marginBottom: rf(32),
  },
  sectionHeader: {
    color: colors.textMuted,
    fontSize: rf(12),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: rf(12),
  },
  filterScroll: {
    gap: rf(10),
    alignItems: 'center',
    justifyContent: 'center'
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: rf(20),
    paddingHorizontal: rf(14),
    paddingVertical: rf(8),
    gap: rf(6),
  },
  filterChipLabel: {
    color: colors.textMuted,
    fontSize: rf(12),
    fontWeight: '600',
  },
  filterChipValue: {
    color: colors.teal,
    fontSize: rf(12),
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: rf(20),
  },
  dropdownContainer: {
    width: '100%',
    maxHeight: rf(300),
    backgroundColor: colors.surface,
    borderRadius: rf(16),
    borderWidth: 1,
    borderColor: colors.border,
    padding: rf(16),
    gap: rf(8),
  },
  dropdownTitle: {
    color: colors.textMuted,
    fontSize: rf(12),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: rf(8),
  },
  dropdownOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: rf(12),
    paddingHorizontal: rf(12),
    borderRadius: rf(8),
  },
  dropdownOptionText: {
    color: colors.textPrimary,
    fontSize: rf(14),
    fontWeight: '600',
  },
  statsScroll: {
    gap: rf(12),
  },
  statCard: {
    width: rf(140),
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderRadius: rf(16),
    padding: rf(14),
    justifyContent: 'space-between',
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: rf(12),
    gap: rf(4),
  },
  statCardTitle: {
    flex: 1,
    color: colors.textMuted,
    fontSize: rf(11),
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statCardIconBox: {
    padding: rf(6),
    borderRadius: rf(8),
    borderWidth: 1,
  },
  statCardValue: {
    color: colors.textPrimary,
    fontSize: rf(22),
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statusPanel: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: rf(16),
    padding: rf(16),
    gap: rf(16),
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rf(12),
  },
  statusLabel: {
    width: rf(80),
    color: colors.textSecondary,
    fontSize: rf(13),
    fontWeight: '600',
  },
  progressBarBg: {
    flex: 1,
    height: rf(8),
    backgroundColor: colors.surface,
    borderRadius: rf(4),
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: rf(4),
  },
  statusValue: {
    width: rf(30),
    textAlign: 'right',
    color: colors.textPrimary,
    fontSize: rf(13),
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  tripsContainer: {
    gap: rf(12),
  },
  tripCard: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: rf(16),
    padding: rf(16),
    gap: rf(12),
  },
  tripCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tripCardIdBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: rf(10),
    paddingVertical: rf(4),
    borderRadius: rf(8),
  },
  tripCardId: {
    color: colors.textPrimary,
    fontSize: rf(13),
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rf(4),
    paddingHorizontal: rf(10),
    paddingVertical: rf(4),
    borderRadius: rf(20),
    borderWidth: 1,
  },
  statusText: {
    fontSize: rf(12),
    fontWeight: '700',
  },
  tripCardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: rf(12),
    borderRadius: rf(12),
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  tripInfoItem: {
    gap: rf(2),
  },
  tripInfoLabel: {
    color: colors.textMuted,
    fontSize: rf(11),
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  tripInfoValue: {
    color: colors.textPrimary,
    fontSize: rf(13),
    fontWeight: '600',
  },
  emptyState: {
    padding: rf(40),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: rf(16),
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderStyle: 'dashed',
  },
  emptyStateIconWrapper: {
    width: rf(64),
    height: rf(64),
    borderRadius: rf(32),
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: rf(16),
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  emptyStateTitle: {
    color: colors.textPrimary,
    fontSize: rf(16),
    fontWeight: '700',
    marginBottom: rf(8),
  },
  emptyStateText: {
    color: colors.textMuted,
    fontSize: rf(14),
    textAlign: 'center',
    lineHeight: rf(20),
  },
});
