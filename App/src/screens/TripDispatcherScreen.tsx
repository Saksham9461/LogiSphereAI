import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  Pressable,
  Modal,
  Platform,
  Alert,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import {
  Search,
  Plus,
  X,
  Check,
  ChevronDown,
  CircleCheck,
  Map,
  Navigation,
  Bell,
  PackageCheck,
  Truck,
  MapPin,
  CheckCircle2,
  XCircle,
  LocateFixed,
  Sparkles,
  Clock,
  Route,
  AlertCircle,
} from 'lucide-react-native';
import { rf } from '../theme/responsive';
import { colors } from '../theme/colors';
import useTripStore from '../store/TripStore';
import useVehicleStore from '../store/VehicleStore';
import useDriverStore from '../store/DriverStore';
import useAuthStore from '../store/AuthStore';
import useNotificationStore from '../store/NotificationStore';
import FleetMap from '../components/FleetMap';
import client from '../api/axiosClient';
import { RouteRecommendation } from '../api/apiPath';
import { openGoogleMapsNavigation } from '../utils/navigationUtils';
import { decodePolyline } from '../utils/polylineUtils';
import { searchLocations, getPlaceDetails, LocationResult, PRESET_LOCATIONS } from '../services/locationService';

// --- LIFECYCLE STATUS CONFIGURATION ---
const TRIP_STATUS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  PENDING_APPROVAL: { label: 'Pending Approval', color: colors.amber, bg: 'rgba(245,158,11,0.16)', border: 'rgba(245,158,11,0.45)' },
  ACCEPTED: { label: 'Accepted', color: colors.blue, bg: 'rgba(56,189,248,0.16)', border: 'rgba(56,189,248,0.45)' },
  ASSIGNED: { label: 'Assigned', color: colors.blue, bg: 'rgba(56,189,248,0.16)', border: 'rgba(56,189,248,0.45)' },
  GOING_TO_PICKUP: { label: 'Going to Pickup', color: '#a855f7', bg: 'rgba(168,85,247,0.16)', border: 'rgba(168,85,247,0.45)' },
  ARRIVED_AT_PICKUP: { label: 'Arrived at Pickup', color: '#ec4899', bg: 'rgba(236,72,153,0.16)', border: 'rgba(236,72,153,0.45)' },
  PICKED_UP: { label: 'Cargo Picked Up', color: '#3b82f6', bg: 'rgba(59,130,246,0.16)', border: 'rgba(59,130,246,0.45)' },
  IN_TRANSIT: { label: 'In Transit', color: colors.blue, bg: 'rgba(56,189,248,0.16)', border: 'rgba(56,189,248,0.45)' },
  ARRIVED_AT_DROP: { label: 'Arrived at Drop', color: '#10b981', bg: 'rgba(16,185,129,0.16)', border: 'rgba(16,185,129,0.45)' },
  DELIVERED: { label: 'Delivered', color: colors.green, bg: 'rgba(74,222,128,0.16)', border: 'rgba(74,222,128,0.45)' },
  COMPLETED: { label: 'Delivered', color: colors.green, bg: 'rgba(74,222,128,0.16)', border: 'rgba(74,222,128,0.45)' },
  REJECTED: { label: 'Rejected', color: colors.rose, bg: 'rgba(251,113,133,0.18)', border: 'rgba(251,113,133,0.45)' },
  CANCELLED: { label: 'Cancelled', color: colors.rose, bg: 'rgba(251,113,133,0.18)', border: 'rgba(251,113,133,0.45)' },
  DRAFT: { label: 'Draft', color: colors.textSecondary, bg: 'rgba(136,145,171,0.16)', border: 'rgba(136,145,171,0.4)' },
  DISPATCHED: { label: 'Dispatched', color: colors.blue, bg: 'rgba(56,189,248,0.16)', border: 'rgba(56,189,248,0.45)' },
};

// --- HELPER TO FORMAT DISPLAY TRIP ID ---
function formatDisplayTripId(id: string): string {
  if (!id) return '#TRP-1000';
  const str = String(id).trim();

  // If short format like TRP-1001, trp-1001, #TRP-1001
  if (/^#?trp-?\d{3,6}$/i.test(str)) {
    return str.toUpperCase().replace(/^#?TRP/, '#TRP').replace('--', '-');
  }

  // If long UUID format like trp-17a56ae9-4fea-4609-9c70-e7e33708b7c1
  const parts = str.split('-');
  const lastPart = parts[parts.length - 1] || str;
  const hexNum = parseInt(lastPart.slice(-4), 16);
  if (!isNaN(hexNum) && hexNum > 0) {
    const numCode = 1000 + (hexNum % 8999);
    return `#TRP-${numCode}`;
  }

  return `#TRP-${lastPart.slice(0, 5).toUpperCase()}`;
}

export default function TripDispatcherScreen() {
  const user = useAuthStore(state => state.user);
  const isDriver = user?.role === 'ROLE_DRIVER';

  const {
    trips,
    loading: tripsLoading,
    getTrips,
    registerTrip,
    acceptTrip,
    rejectTrip,
    startPickupNavigation,
    markArrivedAtPickup,
    confirmPickup,
    startDelivery,
    markArrivedAtDrop,
    confirmDelivery,
    cancelTrip,
  } = useTripStore();

  const { vehicles, getVehicles } = useVehicleStore();
  const { drivers, getDrivers } = useDriverStore();
  const { notifications, unreadCount, getNotifications, markAsRead } = useNotificationStore();

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'ACTIVE' | 'COMPLETED'>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Form State
  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [cargoWeight, setCargoWeight] = useState('700');
  const [plannedDistance, setPlannedDistance] = useState('38');

  // Location Autocomplete State
  const [pickupInput, setPickupInput] = useState('Gandhinagar Depot, Gandhinagar, Gujarat');
  const [pickupLocation, setPickupLocation] = useState<LocationResult | null>(PRESET_LOCATIONS[0]);
  const [pickupSuggestions, setPickupSuggestions] = useState<LocationResult[]>([]);
  const [pickupSearching, setPickupSearching] = useState(false);

  const [dropInput, setDropInput] = useState('Ahmedabad Hub, Ahmedabad, Gujarat');
  const [dropLocation, setDropLocation] = useState<LocationResult | null>(PRESET_LOCATIONS[1]);
  const [dropSuggestions, setDropSuggestions] = useState<LocationResult[]>([]);
  const [dropSearching, setDropSearching] = useState(false);

  // Dropdowns
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
  const [showDriverDropdown, setShowDriverDropdown] = useState(false);

  // Confirmation Modals
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmText: string;
    onConfirm: () => Promise<void>;
  } | null>(null);

  // Action Modal State (Cancel / Complete with odometer & fuel)
  const [actionModal, setActionModal] = useState<{ visible: boolean; type: 'CANCEL'; trip: any } | null>(null);
  const [actionOdo, setActionOdo] = useState('');
  const [actionFuel, setActionFuel] = useState('0');

  const [mapModalTrip, setMapModalTrip] = useState<any | null>(null);

  // AI Route Intelligence Modal State
  const [routeModal, setRouteModal] = useState<{
    visible: boolean;
    trip: any;
    loading: boolean;
    error: string | null;
    origin: { latitude: number; longitude: number } | null;
    destination: { latitude: number; longitude: number } | null;
    routes: Array<{
      id: string;
      distanceMeters: number;
      durationSeconds: number;
      trafficDelaySeconds: number;
      label: string;
      encodedPolyline: string;
    }>;
    recommendation: {
      routeId: string;
      reason: string;
      confidence: string;
      source: string;
    } | null;
    selectedRouteId: string | null;
  }>({
    visible: false,
    trip: null,
    loading: false,
    error: null,
    origin: null,
    destination: null,
    routes: [],
    recommendation: null,
    selectedRouteId: null,
  });

  const handleFetchRouteIntelligence = async (t: any) => {
    const tID = t.tripID || t.tripid || t.id;
    setRouteModal({
      visible: true,
      trip: t,
      loading: true,
      error: null,
      origin: null,
      destination: null,
      routes: [],
      recommendation: null,
      selectedRouteId: null,
    });

    try {
      const res = await client.post(RouteRecommendation, {
        tripID: tID,
      });

      if (res.data?.success && res.data?.data) {
        const data = res.data.data;
        const recId = data.recommendation?.routeId || (data.routes?.[0]?.id ?? null);
        setRouteModal({
          visible: true,
          trip: t,
          loading: false,
          error: null,
          origin: data.origin,
          destination: data.destination,
          routes: data.routes || [],
          recommendation: data.recommendation || null,
          selectedRouteId: recId,
        });
      } else {
        setRouteModal(prev => ({
          ...prev,
          loading: false,
          error: res.data?.message || 'Route intelligence is temporarily unavailable',
        }));
      }
    } catch (err: any) {
      console.warn('[TripDispatcherScreen] Route intelligence fetch error:', err?.message || err);
      setRouteModal(prev => ({
        ...prev,
        loading: false,
        error: 'Route intelligence is temporarily unavailable. You can continue with standard navigation.',
      }));
    }
  };

  const refreshAll = useCallback(async () => {
    await Promise.all([getTrips(), getVehicles(), getDrivers(), getNotifications()]);
  }, [getTrips, getVehicles, getDrivers, getNotifications]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Debounced search for Pickup Location
  useEffect(() => {
    const q = pickupInput.trim();
    if (!q || (pickupLocation && q === pickupLocation.address.trim())) {
      setPickupSuggestions([]);
      setPickupSearching(false);
      return;
    }

    setPickupSearching(true);
    let isCancelled = false;

    const timer = setTimeout(async () => {
      try {
        const results = await searchLocations(q);
        if (!isCancelled) {
          setPickupSuggestions(results);
        }
      } catch (err) {
        if (!isCancelled) {
          setPickupSuggestions([]);
        }
      } finally {
        if (!isCancelled) {
          setPickupSearching(false);
        }
      }
    }, 300);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
      setPickupSearching(false);
    };
  }, [pickupInput, pickupLocation]);

  // Debounced search for Drop Location
  useEffect(() => {
    const q = dropInput.trim();
    if (!q || (dropLocation && q === dropLocation.address.trim())) {
      setDropSuggestions([]);
      setDropSearching(false);
      return;
    }

    setDropSearching(true);
    let isCancelled = false;

    const timer = setTimeout(async () => {
      try {
        const results = await searchLocations(q);
        if (!isCancelled) {
          setDropSuggestions(results);
        }
      } catch (err) {
        if (!isCancelled) {
          setDropSuggestions([]);
        }
      } finally {
        if (!isCancelled) {
          setDropSearching(false);
        }
      }
    }, 300);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
      setDropSearching(false);
    };
  }, [dropInput, dropLocation]);

  // Normalize backend data
  const normalizedVehicles = useMemo(() => {
    return (vehicles || []).map((v: any) => ({
      vehicleID: String(v.vehicleID ?? v.vehicleid ?? v.id ?? v.registrationNumber ?? ''),
      name: v.name ?? v.registrationNumber ?? '',
      capacity: Number(v.capacity ?? v.maxLoadCapacity ?? v.maxloadcapacity ?? 0),
      odometer: Number(v.odometer ?? v.currentOdometer ?? 0),
      status: String(v.status ?? v.state ?? 'AVAILABLE').toUpperCase(),
    }));
  }, [vehicles]);

  const normalizedDrivers = useMemo(() => {
    return (drivers || []).map((d: any, i: number) => ({
      driverID: String(d.driverID ?? d.driverid ?? d.id ?? `driver-${i}`),
      name: d.name ?? d.fullName ?? `Driver ${i + 1}`,
      status: String(d.status ?? d.state ?? 'AVAILABLE').toUpperCase(),
    }));
  }, [drivers]);

  const availableVehicles = useMemo(() => normalizedVehicles.filter((v: any) => v.status === 'AVAILABLE'), [normalizedVehicles]);
  const availableDrivers = useMemo(() => normalizedDrivers.filter((d: any) => d.status === 'AVAILABLE'), [normalizedDrivers]);

  useEffect(() => {
    if (!vehicleId && availableVehicles.length > 0) setVehicleId(availableVehicles[0].vehicleID);
  }, [availableVehicles, vehicleId]);

  useEffect(() => {
    if (!driverId && availableDrivers.length > 0) setDriverId(availableDrivers[0].driverID);
  }, [availableDrivers, driverId]);

  const selectedVehicle = availableVehicles.find((v: any) => v.vehicleID === vehicleId);
  const selectedDriver = availableDrivers.find((d: any) => d.driverID === driverId);

  const cargo = Number(cargoWeight) || 0;
  const overCapacity = selectedVehicle ? cargo > selectedVehicle.capacity : false;
  const overBy = selectedVehicle ? cargo - selectedVehicle.capacity : 0;

  // Validation requiring valid selected locations with latitude & longitude
  const canDispatch = Boolean(
    pickupLocation &&
    dropLocation &&
    selectedVehicle &&
    selectedDriver &&
    cargo > 0 &&
    !overCapacity &&
    !submitting
  );

  const vehicleLabel = (vID: string) => normalizedVehicles.find((v: any) => v.vehicleID === String(vID))?.name ?? vID ?? null;
  const driverLabel = (dID: string) => normalizedDrivers.find((d: any) => d.driverID === String(dID))?.name ?? dID ?? null;

  // Filter trips for display
  const displayTrips = useMemo(() => {
    let sourceList = trips || [];

    // Driver sees ONLY trips assigned to them
    if (isDriver && user?.id) {
      sourceList = sourceList.filter((t: any) => {
        const assignedId = String(t.driverID ?? t.driverid ?? '');
        const currentUserId = String(user.id || user.driverID || '');
        return assignedId === currentUserId;
      });
    }

    // Apply status tab filter
    if (activeTab === 'PENDING') {
      sourceList = sourceList.filter((t: any) => t.status === 'PENDING_APPROVAL');
    } else if (activeTab === 'ACTIVE') {
      sourceList = sourceList.filter((t: any) =>
        ['ACCEPTED', 'ASSIGNED', 'GOING_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED_AT_DROP', 'DISPATCHED'].includes(t.status)
      );
    } else if (activeTab === 'COMPLETED') {
      sourceList = sourceList.filter((t: any) => ['DELIVERED', 'COMPLETED', 'REJECTED', 'CANCELLED'].includes(t.status));
    }

    // Apply text search
    const q = search.trim().toLowerCase();
    if (!q) return sourceList;
    return sourceList.filter((t: any) =>
      [t.tripID ?? t.tripid, t.source, t.destination, t.status, vehicleLabel(t.vehicleID ?? t.vehicleid), driverLabel(t.driverID ?? t.driverid)]
        .filter(Boolean)
        .some((f) => String(f).toLowerCase().includes(q))
    );
  }, [trips, isDriver, user, activeTab, search, normalizedVehicles, normalizedDrivers]);

  const resetForm = () => {
    setPickupInput(PRESET_LOCATIONS[0].address);
    setPickupLocation(PRESET_LOCATIONS[0]);
    setPickupSuggestions([]);

    setDropInput(PRESET_LOCATIONS[1].address);
    setDropLocation(PRESET_LOCATIONS[1]);
    setDropSuggestions([]);

    setVehicleId(availableVehicles[0] ? availableVehicles[0].vehicleID : '');
    setDriverId(availableDrivers[0] ? availableDrivers[0].driverID : '');
    setCargoWeight('700');
    setPlannedDistance('38');
  };

  const handleCreateTrip = async () => {
    if (!pickupLocation) {
      Alert.alert('Location Required', 'Please select a pickup location from the search suggestions.');
      return;
    }
    if (!dropLocation) {
      Alert.alert('Location Required', 'Please select a drop location from the search suggestions.');
      return;
    }
    if (!canDispatch) return;
    setSubmitting(true);

    const payload = {
      source: pickupLocation.address,
      sourceLatitude: pickupLocation.latitude,
      sourceLongitude: pickupLocation.longitude,
      sourcePlaceId: pickupLocation.placeId,

      destination: dropLocation.address,
      destinationLatitude: dropLocation.latitude,
      destinationLongitude: dropLocation.longitude,
      destinationPlaceId: dropLocation.placeId,

      vehicleID: selectedVehicle.vehicleID,
      driverID: selectedDriver.driverID,
      cargoWeight: cargo,
      plannedDistance: Number(plannedDistance) || 0,
      startingOdometer: selectedVehicle.odometer ?? 0,
      status: 'PENDING_APPROVAL',
    };

    const result = await registerTrip(payload);
    setSubmitting(false);

    if (result.success) {
      await refreshAll();
      setShowAddModal(false);
      resetForm();
      Alert.alert('Trip Created', 'Trip created with location coordinates and submitted for Manager approval.');
    } else {
      Alert.alert('Trip Creation Failed', result.message || 'Could not create trip');
    }
  };

  // Lifecycle Action Handlers
  const handleManagerAccept = async (tID: string) => {
    setActionLoadingId(tID);
    const result = await acceptTrip(tID);
    setActionLoadingId(null);
    if (result.success) {
      await refreshAll();
    } else {
      Alert.alert('Accept Failed', result.message || 'Could not accept trip');
    }
  };

  const handleManagerReject = async (tID: string) => {
    setActionLoadingId(tID);
    const result = await rejectTrip(tID);
    setActionLoadingId(null);
    if (result.success) {
      await refreshAll();
    } else {
      Alert.alert('Reject Failed', result.message || 'Could not reject trip');
    }
  };

  const handleGoToPickup = async (t: any) => {
    const tID = t.tripID || t.tripid;
    setActionLoadingId(tID);
    const result = await startPickupNavigation(tID);
    setActionLoadingId(null);
    if (result.success) {
      await refreshAll();
      const sLat = t.sourceLatitude ?? t.sourcelatitude;
      const sLng = t.sourceLongitude ?? t.sourcelongitude;
      openGoogleMapsNavigation(
        t.source,
        sLat !== undefined && sLng !== undefined ? { latitude: Number(sLat), longitude: Number(sLng) } : undefined
      );
    } else {
      Alert.alert('Action Failed', result.message || 'Could not update status');
    }
  };

  const handleArrivedAtPickup = async (tID: string) => {
    setActionLoadingId(tID);
    const result = await markArrivedAtPickup(tID);
    setActionLoadingId(null);
    if (result.success) {
      await refreshAll();
    } else {
      Alert.alert('Action Failed', result.message || 'Could not update status');
    }
  };

  const handleConfirmPickupPrompt = (tID: string) => {
    setConfirmModal({
      visible: true,
      title: 'Confirm Cargo Pickup',
      message: 'Confirm that the cargo has been picked up?',
      confirmText: 'Confirm Pickup',
      onConfirm: async () => {
        setActionLoadingId(tID);
        const result = await confirmPickup(tID);
        setActionLoadingId(null);
        setConfirmModal(null);
        if (result.success) {
          await refreshAll();
        } else {
          Alert.alert('Action Failed', result.message || 'Could not confirm pickup');
        }
      },
    });
  };

  const handleGoToDrop = async (t: any) => {
    const tID = t.tripID || t.tripid;
    setActionLoadingId(tID);
    const result = await startDelivery(tID);
    setActionLoadingId(null);
    if (result.success) {
      await refreshAll();
      const dLat = t.destinationLatitude ?? t.destinationlatitude;
      const dLng = t.destinationLongitude ?? t.destinationlongitude;
      openGoogleMapsNavigation(
        t.destination,
        dLat !== undefined && dLng !== undefined ? { latitude: Number(dLat), longitude: Number(dLng) } : undefined
      );
    } else {
      Alert.alert('Action Failed', result.message || 'Could not update status');
    }
  };

  const handleArrivedAtDrop = async (tID: string) => {
    setActionLoadingId(tID);
    const result = await markArrivedAtDrop(tID);
    setActionLoadingId(null);
    if (result.success) {
      await refreshAll();
    } else {
      Alert.alert('Action Failed', result.message || 'Could not update status');
    }
  };

  const handleConfirmDeliveryPrompt = (tID: string) => {
    setConfirmModal({
      visible: true,
      title: 'Confirm Delivery',
      message: 'Confirm that the item has been delivered?',
      confirmText: 'Confirm Delivery',
      onConfirm: async () => {
        setActionLoadingId(tID);
        const result = await confirmDelivery(tID);
        setActionLoadingId(null);
        setConfirmModal(null);
        if (result.success) {
          await refreshAll();
          Alert.alert('Trip Delivered', 'Trip marked as DELIVERED successfully.');
        } else {
          Alert.alert('Delivery Failed', result.message || 'Could not confirm delivery');
        }
      },
    });
  };

  const handleCancelConfirm = async () => {
    if (!actionModal) return;
    setSubmitting(true);
    const tID = actionModal.trip.tripID || actionModal.trip.tripid;
    const result = await cancelTrip(tID, actionOdo || '0', actionFuel || '0');
    setSubmitting(false);

    if (result.success) {
      setActionModal(null);
      await refreshAll();
    } else {
      Alert.alert('Cancel Failed', result.message || 'Could not cancel trip');
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.pageTitle}>{isDriver ? 'My Trips' : 'Live Trip Board'}</Text>
            <Text style={styles.pageSubtitle}>
              {isDriver ? `Logged in as ${user?.name || 'Driver'}` : 'Manage fleet trip lifecycles'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: rf(8) }}>
            {/* NOTIFICATION BELL */}
            <Pressable style={styles.iconBtn} onPress={() => setShowNotifModal(true)}>
              <Bell size={20} color={colors.textPrimary} />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount}</Text>
                </View>
              )}
            </Pressable>

            {/* CREATE TRIP (MANAGER ONLY) */}
            {!isDriver && (
              <Pressable style={styles.addButton} onPress={() => setShowAddModal(true)}>
                <Plus size={16} color="#1a1200" strokeWidth={2.5} />
                <Text style={styles.addButtonText}>Add Trip</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* SEARCH */}
        <View style={styles.searchContainer}>
          <Search size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search trip ID, source, destination..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* MODERN SEGMENTED TAB BAR */}
        <View style={styles.segmentedContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmentedContent}>
            {[
              { key: 'ALL', label: 'All Trips' },
              { key: 'PENDING', label: 'Pending Approval' },
              { key: 'ACTIVE', label: 'Active Trips' },
              { key: 'COMPLETED', label: 'Completed' },
            ].map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  style={[styles.segmentedTab, isActive && styles.segmentedTabActive]}
                  onPress={() => setActiveTab(tab.key as any)}
                >
                  <Text style={[styles.segmentedTabText, isActive && styles.segmentedTabTextActive]}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* TRIP LIST */}
        <View style={styles.listContainer}>
          {tripsLoading && displayTrips.length === 0 ? (
            <View style={{ padding: rf(40), alignItems: 'center' }}>
              <ActivityIndicator size="large" color={colors.amber} />
            </View>
          ) : displayTrips.length > 0 ? (
            displayTrips.map((t: any) => {
              const tID = t.tripID || t.tripid || t.id;
              const vLabel = vehicleLabel(t.vehicleID || t.vehicleid);
              const dLabel = driverLabel(t.driverID || t.driverid);
              const statusKey = String(t.status || 'PENDING_APPROVAL').toUpperCase();
              const s = TRIP_STATUS[statusKey] || TRIP_STATUS.PENDING_APPROVAL;
              const isActionBusy = actionLoadingId === tID;

              return (
                <View key={tID} style={styles.tripCard}>
                  {/* CARD HEADER */}
                  <View style={styles.tripCardHeader}>
                    <View style={{ flex: 1, paddingRight: rf(8) }}>
                      <Text style={styles.tripIDText} numberOfLines={1} ellipsizeMode="tail">
                        {formatDisplayTripId(tID)}
                      </Text>
                      <Text style={styles.tripAssignText} numberOfLines={1} ellipsizeMode="tail">
                        {vLabel ? `${vLabel} • Driver: ${dLabel ?? '—'}` : 'Unassigned'}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: s.bg, borderColor: s.border }]}>
                      <Text style={[styles.statusText, { color: s.color }]}>{s.label}</Text>
                    </View>
                  </View>

                  {/* ROUTE BOX */}
                  <View style={styles.tripCardBody}>
                    <View style={styles.routeBox}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: rf(6), flex: 1 }}>
                        <MapPin size={16} color={colors.amber} />
                        <Text style={styles.routeLocation} numberOfLines={1}>{t.source}</Text>
                      </View>
                      <Text style={styles.routeArrow}>→</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: rf(6), flex: 1 }}>
                        <MapPin size={16} color={colors.green} />
                        <Text style={styles.routeLocation} numberOfLines={1}>{t.destination}</Text>
                      </View>
                    </View>
                    <View style={styles.tripMetaRow}>
                      <Text style={styles.tripMetaText}>Cargo: {t.cargoWeight || 0} kg</Text>
                      {t.plannedDistance ? <Text style={styles.tripMetaText}>Distance: {t.plannedDistance} km</Text> : null}
                    </View>
                  </View>

                  {/* LIFECYCLE CONTROLS FOOTER */}
                  <View style={styles.tripCardFooter}>
                    <View style={{ flexDirection: 'row', gap: rf(6), alignItems: 'center' }}>
                      <Pressable
                        style={styles.mapBtn}
                        onPress={() => setMapModalTrip(t)}
                      >
                        <Map size={16} color={colors.blue} />
                        <Text style={styles.mapBtnText}>Map</Text>
                      </Pressable>

                      {['ACCEPTED', 'ASSIGNED', 'GOING_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED_AT_DROP', 'DISPATCHED'].includes(statusKey) && (
                        <Pressable
                          style={styles.aiRouteBtn}
                          onPress={() => handleFetchRouteIntelligence(t)}
                        >
                          <Sparkles size={14} color="#1a1200" />
                          <Text style={styles.aiRouteBtnText}>AI Route</Text>
                        </Pressable>
                      )}
                    </View>

                    {/* MANAGER CONTROLS FOR PENDING_APPROVAL */}
                    {!isDriver && statusKey === 'PENDING_APPROVAL' && (
                      <View style={{ flexDirection: 'row', gap: rf(8) }}>
                        <Pressable
                          style={[styles.actionBtn, { backgroundColor: colors.rose, borderColor: colors.rose }]}
                          onPress={() => handleManagerReject(tID)}
                          disabled={isActionBusy}
                        >
                          <XCircle size={16} color="#fff" />
                          <Text style={styles.actionBtnTextWhite}>Reject</Text>
                        </Pressable>
                        <Pressable
                          style={[styles.actionBtn, { backgroundColor: colors.green, borderColor: colors.green }]}
                          onPress={() => handleManagerAccept(tID)}
                          disabled={isActionBusy}
                        >
                          <CheckCircle2 size={16} color="#fff" />
                          <Text style={styles.actionBtnTextWhite}>Accept Trip</Text>
                        </Pressable>
                      </View>
                    )}

                    {/* DRIVER STEP-BY-STEP CONTROLS */}
                    {isDriver && (
                      <View style={{ flex: 1, marginLeft: rf(8) }}>
                        {(statusKey === 'ACCEPTED' || statusKey === 'ASSIGNED') && (
                          <Pressable
                            style={styles.stepBtnPrimary}
                            onPress={() => handleGoToPickup(t)}
                            disabled={isActionBusy}
                          >
                            <Navigation size={16} color="#1a1200" />
                            <Text style={styles.stepBtnPrimaryText}>Go to Pickup</Text>
                          </Pressable>
                        )}

                        {statusKey === 'GOING_TO_PICKUP' && (
                          <Pressable
                            style={styles.stepBtnPrimary}
                            onPress={() => handleArrivedAtPickup(tID)}
                            disabled={isActionBusy}
                          >
                            <Check size={16} color="#1a1200" />
                            <Text style={styles.stepBtnPrimaryText}>I've Arrived</Text>
                          </Pressable>
                        )}

                        {statusKey === 'ARRIVED_AT_PICKUP' && (
                          <Pressable
                            style={styles.stepBtnSuccess}
                            onPress={() => handleConfirmPickupPrompt(tID)}
                            disabled={isActionBusy}
                          >
                            <PackageCheck size={16} color="#fff" />
                            <Text style={styles.actionBtnTextWhite}>Confirm Item Picked</Text>
                          </Pressable>
                        )}

                        {statusKey === 'PICKED_UP' && (
                          <Pressable
                            style={styles.stepBtnPrimary}
                            onPress={() => handleGoToDrop(t)}
                            disabled={isActionBusy}
                          >
                            <Navigation size={16} color="#1a1200" />
                            <Text style={styles.stepBtnPrimaryText}>Go to Drop Location</Text>
                          </Pressable>
                        )}

                        {statusKey === 'IN_TRANSIT' && (
                          <Pressable
                            style={styles.stepBtnPrimary}
                            onPress={() => handleArrivedAtDrop(tID)}
                            disabled={isActionBusy}
                          >
                            <Check size={16} color="#1a1200" />
                            <Text style={styles.stepBtnPrimaryText}>I've Arrived</Text>
                          </Pressable>
                        )}

                        {statusKey === 'ARRIVED_AT_DROP' && (
                          <Pressable
                            style={styles.stepBtnSuccess}
                            onPress={() => handleConfirmDeliveryPrompt(tID)}
                            disabled={isActionBusy}
                          >
                            <CheckCircle2 size={16} color="#fff" />
                            <Text style={styles.actionBtnTextWhite}>Confirm Delivery</Text>
                          </Pressable>
                        )}

                        {(statusKey === 'DELIVERED' || statusKey === 'COMPLETED') && (
                          <View style={styles.completedBanner}>
                            <CheckCircle2 size={16} color={colors.green} />
                            <Text style={styles.completedBannerText}>Trip Completed</Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* MANAGER CANCEL FOR ACTIVE TRIPS */}
                    {!isDriver && ['ACCEPTED', 'ASSIGNED', 'GOING_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED_AT_DROP'].includes(statusKey) && (
                      <Pressable
                        style={[styles.actionBtn, { backgroundColor: 'rgba(251,113,133,0.1)', borderColor: colors.rose }]}
                        onPress={() => {
                          setActionOdo(String(t.startingOdometer ?? '0'));
                          setActionFuel('0');
                          setActionModal({ visible: true, type: 'CANCEL', trip: t });
                        }}
                      >
                        <X size={16} color={colors.rose} />
                        <Text style={{ color: colors.rose, fontSize: rf(13), fontWeight: '700' }}>Cancel</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyStateIconWrapper}>
                <Truck size={32} color={colors.textMuted} strokeWidth={1.5} />
              </View>
              <Text style={styles.emptyStateTitle}>No trips found</Text>
              <Text style={styles.emptyStateText}>
                {search ? `No trips matching "${search}".` : "No trips in this view."}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* CONFIRMATION DIALOG MODAL */}
      <Modal visible={!!confirmModal} transparent={true} animationType="fade" onRequestClose={() => setConfirmModal(null)}>
        <View style={styles.filterModalOverlay}>
          <View style={styles.actionModalContainer}>
            <Text style={styles.actionModalTitle}>{confirmModal?.title}</Text>
            <Text style={styles.actionModalSubtitle}>{confirmModal?.message}</Text>
            <View style={[styles.bottomSheetFooter, { marginTop: rf(16) }]}>
              <Pressable style={styles.cancelBtn} onPress={() => setConfirmModal(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.saveBtn}
                onPress={() => confirmModal?.onConfirm()}
              >
                <Text style={styles.saveBtnText}>{confirmModal?.confirmText}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* NOTIFICATIONS MODAL */}
      <Modal visible={showNotifModal} transparent={true} animationType="slide" onRequestClose={() => setShowNotifModal(false)}>
        <View style={styles.bottomSheetOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => setShowNotifModal(false)} />
          <View style={[styles.bottomSheet, { maxHeight: '70%' }]}>
            <View style={styles.bottomSheetHeader}>
              <View>
                <Text style={styles.bottomSheetTitle}>Notifications</Text>
                <Text style={styles.bottomSheetSubtitle}>{unreadCount} unread update(s)</Text>
              </View>
              <Pressable onPress={() => setShowNotifModal(false)}>
                <X size={24} color={colors.textMuted} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ gap: rf(10), paddingBottom: rf(20) }}>
              {notifications.map((n) => (
                <Pressable
                  key={n.id}
                  style={[styles.notifCard, !n.read && styles.notifCardUnread]}
                  onPress={() => markAsRead(n.id)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.notifTitle}>{n.title}</Text>
                    <Text style={styles.notifMessage}>{n.message}</Text>
                    <Text style={styles.notifTime}>{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                  </View>
                  {!n.read && <View style={styles.unreadDot} />}
                </Pressable>
              ))}
              {notifications.length === 0 && (
                <Text style={{ color: colors.textMuted, textAlign: 'center', marginVertical: rf(20) }}>
                  No notifications yet.
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Map Modal */}
      <Modal visible={!!mapModalTrip} animationType="slide" transparent={false}>
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          <View style={styles.mapModalHeader}>
            <Text style={styles.modalTitle}>Route: {mapModalTrip?.tripID || mapModalTrip?.tripid}</Text>
            <Pressable onPress={() => setMapModalTrip(null)}>
              <X size={24} color={colors.textPrimary} />
            </Pressable>
          </View>
          {mapModalTrip && (
            <FleetMap
              trips={[mapModalTrip]}
              selectedTrip={mapModalTrip}
              onSelectTrip={() => {}}
              style={{ flex: 1, height: '100%' }}
            />
          )}
        </View>
      </Modal>

      {/* AI ROUTE INTELLIGENCE MODAL */}
      <Modal visible={routeModal.visible} animationType="slide" transparent={false} onRequestClose={() => setRouteModal(prev => ({ ...prev, visible: false }))}>
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          {/* HEADER */}
          <View style={styles.mapModalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: rf(8) }}>
              <View style={{ width: rf(32), height: rf(32), borderRadius: rf(16), backgroundColor: 'rgba(245,158,11,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={18} color={colors.amber} />
              </View>
              <View>
                <Text style={styles.modalTitle}>AI Route Intelligence</Text>
                <Text style={{ color: colors.textMuted, fontSize: rf(11) }}>
                  Trip: {formatDisplayTripId(routeModal.trip?.tripID || routeModal.trip?.tripid)}
                </Text>
              </View>
            </View>
            <Pressable onPress={() => setRouteModal(prev => ({ ...prev, visible: false }))}>
              <X size={24} color={colors.textPrimary} />
            </Pressable>
          </View>

          {routeModal.loading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: rf(12) }}>
              <ActivityIndicator size="large" color={colors.amber} />
              <Text style={{ color: colors.textPrimary, fontSize: rf(15), fontWeight: '700' }}>Analyzing Google Traffic & Routes...</Text>
              <Text style={{ color: colors.textMuted, fontSize: rf(12) }}>Gemini AI is calculating the optimal path</Text>
            </View>
          ) : routeModal.error ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: rf(30), gap: rf(12) }}>
              <AlertCircle size={48} color={colors.rose} />
              <Text style={{ color: colors.textPrimary, fontSize: rf(16), fontWeight: '700', textAlign: 'center' }}>Route Analysis Unavailable</Text>
              <Text style={{ color: colors.textMuted, fontSize: rf(13), textAlign: 'center' }}>{routeModal.error}</Text>
              <Pressable style={styles.saveBtn} onPress={() => handleFetchRouteIntelligence(routeModal.trip)}>
                <Text style={styles.saveBtnText}>Try Again</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: rf(30) }}>
              {/* MAPLIBRE MAP WITH ROUTE POLYLINES */}
              <FleetMap
                trips={routeModal.trip ? [routeModal.trip] : []}
                selectedTrip={routeModal.trip}
                onSelectTrip={() => {}}
                style={{ height: rf(260) }}
                routeLines={routeModal.routes.map(r => ({
                  id: r.id,
                  coordinates: decodePolyline(r.encodedPolyline),
                  isRecommended: r.id === routeModal.recommendation?.routeId,
                  isSelected: r.id === routeModal.selectedRouteId,
                }))}
                selectedRouteId={routeModal.selectedRouteId || undefined}
                recommendedRouteId={routeModal.recommendation?.routeId}
                originCoords={routeModal.origin || undefined}
                destCoords={routeModal.destination || undefined}
              />

              <View style={{ padding: rf(16), gap: rf(12) }}>
                {/* GEMINI AI RECOMMENDATION BANNER */}
                {routeModal.recommendation && (
                  <View style={styles.aiRecommendationCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: rf(6) }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: rf(6) }}>
                        <Sparkles size={16} color="#1a1200" />
                        <Text style={styles.aiCardTagText}>★ AI RECOMMENDED ROUTE</Text>
                      </View>
                      <View style={styles.aiConfidenceBadge}>
                        <Text style={styles.aiConfidenceText}>{routeModal.recommendation.confidence.toUpperCase()} CONFIDENCE</Text>
                      </View>
                    </View>
                    <Text style={styles.aiReasonText}>{routeModal.recommendation.reason}</Text>
                  </View>
                )}

                <Text style={{ color: colors.textMuted, fontSize: rf(12), fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: rf(4) }}>
                  Available Alternative Routes ({routeModal.routes.length})
                </Text>

                {/* ROUTE CARDS */}
                {routeModal.routes.map(r => {
                  const isSelected = r.id === routeModal.selectedRouteId;
                  const isRec = r.id === routeModal.recommendation?.routeId;
                  const distKm = (r.distanceMeters / 1000).toFixed(1);
                  const durMin = Math.round(r.durationSeconds / 60);
                  const durHours = Math.floor(durMin / 60);
                  const durRemainderMin = durMin % 60;
                  const durationFormatted = durHours > 0 ? `${durHours}h ${durRemainderMin}m` : `${durMin} min`;

                  return (
                    <Pressable
                      key={r.id}
                      style={[styles.routeOptionCard, isSelected && styles.routeOptionCardSelected]}
                      onPress={() => setRouteModal(prev => ({ ...prev, selectedRouteId: r.id }))}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: rf(6) }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: rf(8) }}>
                          <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                            {isSelected && <View style={styles.radioInner} />}
                          </View>
                          <Text style={[styles.routeOptionLabel, isSelected && { color: colors.textPrimary }]}>{r.label}</Text>
                        </View>
                        {isRec && (
                          <View style={styles.recommendedPill}>
                            <Sparkles size={10} color="#1a1200" />
                            <Text style={styles.recommendedPillText}>AI Pick</Text>
                          </View>
                        )}
                      </View>

                      <View style={{ flexDirection: 'row', gap: rf(16), marginLeft: rf(26), marginTop: rf(2) }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: rf(4) }}>
                          <Clock size={14} color={isSelected ? colors.amber : colors.textMuted} />
                          <Text style={styles.routeMetricText}>{durationFormatted}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: rf(4) }}>
                          <Route size={14} color={colors.textMuted} />
                          <Text style={styles.routeMetricText}>{distKm} km</Text>
                        </View>
                        {r.trafficDelaySeconds > 0 && (
                          <Text style={{ color: colors.rose, fontSize: rf(12), fontWeight: '600' }}>
                            +{Math.round(r.trafficDelaySeconds / 60)}m delay
                          </Text>
                        )}
                      </View>
                    </Pressable>
                  );
                })}

                {/* START NAVIGATION BUTTON */}
                <Pressable
                  style={[styles.stepBtnPrimary, { marginTop: rf(12), height: rf(48) }]}
                  onPress={() => {
                    if (routeModal.trip) {
                      const targetCoords = routeModal.destination || {
                        latitude: Number(routeModal.trip.destinationLatitude ?? routeModal.trip.destinationlatitude ?? 23.0225),
                        longitude: Number(routeModal.trip.destinationLongitude ?? routeModal.trip.destinationlongitude ?? 72.5714),
                      };
                      openGoogleMapsNavigation(routeModal.trip.destination || 'Destination', targetCoords);
                    }
                  }}
                >
                  <Navigation size={18} color="#1a1200" />
                  <Text style={[styles.stepBtnPrimaryText, { fontSize: rf(15) }]}>Start Navigation</Text>
                </Pressable>
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* ACTION MODAL (Cancel Trip) */}
      <Modal visible={!!actionModal} transparent={true} animationType="fade" onRequestClose={() => setActionModal(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.filterModalOverlay}>
          <View style={styles.actionModalContainer}>
            <Text style={styles.actionModalTitle}>Cancel Trip</Text>
            <Text style={styles.actionModalSubtitle}>{actionModal?.trip?.tripID || actionModal?.trip?.tripid}</Text>

            <View style={{ gap: rf(6) }}>
              <Text style={styles.formLabel}>Current Odometer (km)</Text>
              <TextInput style={styles.formInput} value={actionOdo} onChangeText={setActionOdo} keyboardType="numeric" />
            </View>

            <View style={[styles.bottomSheetFooter, { marginTop: rf(24) }]}>
              <Pressable style={styles.cancelBtn} onPress={() => setActionModal(null)}>
                <Text style={styles.cancelBtnText}>Back</Text>
              </Pressable>
              <Pressable style={[styles.saveBtn, { backgroundColor: colors.rose }]} onPress={handleCancelConfirm}>
                <Text style={[styles.saveBtnText, { color: '#fff' }]}>{submitting ? '...' : 'Confirm Cancel'}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ADD TRIP MODAL WITH LOCATION AUTOCOMPLETE */}
      <Modal visible={showAddModal} transparent={true} animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.bottomSheetOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => setShowAddModal(false)} />
          <View style={styles.bottomSheet}>
            <View style={styles.bottomSheetHeader}>
              <View>
                <Text style={styles.bottomSheetTitle}>Create Trip</Text>
                <Text style={styles.bottomSheetSubtitle}>Search pickup/drop locations for GPS navigation</Text>
              </View>
              <Pressable onPress={() => setShowAddModal(false)}>
                <X size={24} color={colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formContainer} nestedScrollEnabled={true}>
              {/* PICKUP LOCATION AUTOCOMPLETE */}
              <View style={styles.formGroup}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.formLabel}>Pickup Location</Text>
                  {pickupLocation ? (
                    <View style={styles.locationBadgeSuccess}>
                      <CircleCheck size={12} color={colors.green} />
                      <Text style={styles.locationBadgeText}>GPS Ready ({pickupLocation.latitude.toFixed(3)}, {pickupLocation.longitude.toFixed(3)})</Text>
                    </View>
                  ) : (
                    <Text style={styles.locationWarningText}>* Select from suggestions</Text>
                  )}
                </View>

                <View style={styles.searchBoxInputWrapper}>
                  <MapPin size={16} color={pickupLocation ? colors.amber : colors.textMuted} />
                  <TextInput
                    style={styles.searchBoxInput}
                    value={pickupInput}
                    onChangeText={(text) => {
                      setPickupInput(text);
                      if (pickupLocation && text !== pickupLocation.address) {
                        setPickupLocation(null);
                      }
                    }}
                    placeholder="🔍 Search pickup location..."
                    placeholderTextColor={colors.textMuted}
                  />
                  {pickupSearching && <ActivityIndicator size="small" color={colors.amber} />}
                </View>

                {/* Pickup Suggestions Dropdown */}
                {pickupSuggestions.length > 0 && (
                  <View style={styles.suggestionsContainer}>
                    {pickupSuggestions.map((item, index) => (
                      <Pressable
                        key={item.placeId || `p-${index}`}
                        style={styles.suggestionRow}
                        onPress={async () => {
                          setPickupSearching(true);
                          const details = await getPlaceDetails(item);
                          setPickupLocation(details);
                          setPickupInput(details.address);
                          setPickupSuggestions([]);
                          setPickupSearching(false);
                        }}
                      >
                        <LocateFixed size={14} color={colors.amber} style={{ marginTop: 2 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.suggestionTitle} numberOfLines={1}>
                            {item.mainText || item.name || item.address}
                          </Text>
                          <Text style={styles.suggestionCoords} numberOfLines={1}>
                            {item.secondaryText || item.address}
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              {/* DROP LOCATION AUTOCOMPLETE */}
              <View style={styles.formGroup}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.formLabel}>Drop Location</Text>
                  {dropLocation ? (
                    <View style={styles.locationBadgeSuccess}>
                      <CircleCheck size={12} color={colors.green} />
                      <Text style={styles.locationBadgeText}>GPS Ready ({dropLocation.latitude.toFixed(3)}, {dropLocation.longitude.toFixed(3)})</Text>
                    </View>
                  ) : (
                    <Text style={styles.locationWarningText}>* Select from suggestions</Text>
                  )}
                </View>

                <View style={styles.searchBoxInputWrapper}>
                  <MapPin size={16} color={dropLocation ? colors.green : colors.textMuted} />
                  <TextInput
                    style={styles.searchBoxInput}
                    value={dropInput}
                    onChangeText={(text) => {
                      setDropInput(text);
                      if (dropLocation && text !== dropLocation.address) {
                        setDropLocation(null);
                      }
                    }}
                    placeholder="🔍 Search drop location..."
                    placeholderTextColor={colors.textMuted}
                  />
                  {dropSearching && <ActivityIndicator size="small" color={colors.green} />}
                </View>

                {/* Drop Suggestions Dropdown */}
                {dropSuggestions.length > 0 && (
                  <View style={styles.suggestionsContainer}>
                    {dropSuggestions.map((item, index) => (
                      <Pressable
                        key={item.placeId || `d-${index}`}
                        style={styles.suggestionRow}
                        onPress={async () => {
                          setDropSearching(true);
                          const details = await getPlaceDetails(item);
                          setDropLocation(details);
                          setDropInput(details.address);
                          setDropSuggestions([]);
                          setDropSearching(false);
                        }}
                      >
                        <LocateFixed size={14} color={colors.green} style={{ marginTop: 2 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.suggestionTitle} numberOfLines={1}>
                            {item.mainText || item.name || item.address}
                          </Text>
                          <Text style={styles.suggestionCoords} numberOfLines={1}>
                            {item.secondaryText || item.address}
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Vehicle (Available Only)</Text>
                <Pressable style={styles.dropdownInput} onPress={() => setShowVehicleDropdown(true)}>
                  <Text style={styles.dropdownInputText} numberOfLines={1}>
                    {selectedVehicle ? `${selectedVehicle.name} (${selectedVehicle.capacity} kg)` : 'No available vehicles'}
                  </Text>
                  <ChevronDown size={16} color={colors.textMuted} />
                </Pressable>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Driver (Available Only)</Text>
                <Pressable style={styles.dropdownInput} onPress={() => setShowDriverDropdown(true)}>
                  <Text style={styles.dropdownInputText} numberOfLines={1}>
                    {selectedDriver ? selectedDriver.name : 'No available drivers'}
                  </Text>
                  <ChevronDown size={16} color={colors.textMuted} />
                </Pressable>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Cargo Weight (kg)</Text>
                  <TextInput style={[styles.formInput, overCapacity && { borderColor: colors.rose, borderWidth: 1 }]} value={cargoWeight} onChangeText={setCargoWeight} placeholder="0" placeholderTextColor={colors.textMuted} keyboardType="numeric" />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Planned Distance (km)</Text>
                  <TextInput style={styles.formInput} value={plannedDistance} onChangeText={setPlannedDistance} placeholder="0" placeholderTextColor={colors.textMuted} keyboardType="numeric" />
                </View>
              </View>

              {/* Validation Alert */}
              {selectedVehicle && cargo > 0 && (
                overCapacity ? (
                  <View style={styles.capacityAlertError}>
                    <Text style={styles.capacityTextError}>Max Capacity: {selectedVehicle.capacity} kg</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: rf(6), marginTop: rf(4) }}>
                      <X size={14} color={colors.rose} strokeWidth={3} />
                      <Text style={styles.capacityTextErrorBold}>Exceeded by {overBy} kg</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.capacityAlertSuccess}>
                    <CircleCheck size={14} color={colors.green} />
                    <Text style={styles.capacityTextSuccess}>Within capacity ({selectedVehicle.capacity - cargo} kg spare)</Text>
                  </View>
                )
              )}
            </ScrollView>

            <View style={styles.bottomSheetFooter}>
              <Pressable style={styles.cancelBtn} onPress={() => setShowAddModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.saveBtn, !canDispatch && { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]} onPress={handleCreateTrip} disabled={!canDispatch}>
                <Text style={[styles.saveBtnText, !canDispatch && { color: colors.textMuted }]}>
                  {submitting ? '...' : 'Submit Trip'}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* VEHICLE SELECTION MODAL */}
      <Modal visible={showVehicleDropdown} transparent={true} animationType="fade" onRequestClose={() => setShowVehicleDropdown(false)}>
        <Pressable style={styles.filterModalOverlay} onPress={() => setShowVehicleDropdown(false)}>
          <View style={styles.dropdownContainer}>
            <Text style={styles.dropdownTitle}>Select Vehicle</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {availableVehicles.map((v: any) => (
                <Pressable key={v.vehicleID} style={styles.dropdownOption} onPress={() => { setVehicleId(v.vehicleID); setShowVehicleDropdown(false); }}>
                  <Text style={[styles.dropdownOptionText, { color: v.vehicleID === vehicleId ? colors.amber : colors.textPrimary }]}>{v.name} ({v.capacity} kg)</Text>
                </Pressable>
              ))}
              {availableVehicles.length === 0 && <Text style={[styles.dropdownOptionText, { padding: rf(16) }]}>No vehicles available</Text>}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* DRIVER SELECTION MODAL */}
      <Modal visible={showDriverDropdown} transparent={true} animationType="fade" onRequestClose={() => setShowDriverDropdown(false)}>
        <Pressable style={styles.filterModalOverlay} onPress={() => setShowDriverDropdown(false)}>
          <View style={styles.dropdownContainer}>
            <Text style={styles.dropdownTitle}>Select Driver</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {availableDrivers.map((d: any) => (
                <Pressable key={d.driverID} style={styles.dropdownOption} onPress={() => { setDriverId(d.driverID); setShowDriverDropdown(false); }}>
                  <Text style={[styles.dropdownOptionText, { color: d.driverID === driverId ? colors.amber : colors.textPrimary }]}>{d.name}</Text>
                </Pressable>
              ))}
              {availableDrivers.length === 0 && <Text style={[styles.dropdownOptionText, { padding: rf(16) }]}>No drivers available</Text>}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  container: { paddingHorizontal: rf(16), paddingVertical: rf(24), paddingBottom: rf(40), flexGrow: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: rf(16) },
  pageTitle: { color: colors.textPrimary, fontSize: rf(24), fontWeight: '800', letterSpacing: -0.5 },
  pageSubtitle: { color: colors.textMuted, fontSize: rf(13), marginTop: rf(2) },
  
  iconBtn: { width: rf(40), height: rf(40), borderRadius: rf(20), backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -2, right: -2, backgroundColor: colors.rose, borderRadius: rf(9), width: rf(18), height: rf(18), alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#fff', fontSize: rf(10), fontWeight: '800' },

  addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.amber, paddingHorizontal: rf(14), paddingVertical: rf(8), borderRadius: rf(8), gap: rf(6) },
  addButtonText: { color: '#1a1200', fontSize: rf(14), fontWeight: '700' },
  
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: rf(12), paddingHorizontal: rf(16), height: rf(48), marginBottom: rf(16), gap: rf(10) },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: rf(14), height: '100%' },

  segmentedContainer: {
    marginBottom: rf(16),
    height: rf(44),
  },
  segmentedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rf(6),
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: rf(12),
    padding: rf(4),
  },
  segmentedTab: {
    paddingHorizontal: rf(16),
    height: rf(34),
    borderRadius: rf(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedTabActive: {
    backgroundColor: colors.amber,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentedTabText: {
    color: colors.textMuted,
    fontSize: rf(13),
    fontWeight: '600',
  },
  segmentedTabTextActive: {
    color: '#1a1200',
    fontWeight: '800',
  },
  
  listContainer: { gap: rf(12) },
  tripCard: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: rf(16), padding: rf(16) },
  tripCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: rf(12) },
  tripIDText: { color: colors.textPrimary, fontSize: rf(15), fontWeight: '800' },
  tripAssignText: { color: colors.textMuted, fontSize: rf(12), marginTop: rf(2) },
  statusBadge: { paddingHorizontal: rf(10), paddingVertical: rf(4), borderRadius: rf(20), borderWidth: 1 },
  statusText: { fontSize: rf(11), fontWeight: '700' },

  tripCardBody: { marginBottom: rf(14) },
  routeBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: rf(10), padding: rf(10), gap: rf(8) },
  routeLocation: { color: colors.textPrimary, fontSize: rf(13), fontWeight: '600' },
  routeArrow: { color: colors.textMuted, fontSize: rf(14), fontWeight: '700' },
  tripMetaRow: { flexDirection: 'row', gap: rf(16), marginTop: rf(8) },
  tripMetaText: { color: colors.textMuted, fontSize: rf(12) },

  tripCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.borderSoft, paddingTop: rf(12) },
  mapBtn: { flexDirection: 'row', alignItems: 'center', gap: rf(4), paddingHorizontal: rf(10), paddingVertical: rf(6), borderRadius: rf(8), backgroundColor: 'rgba(56,189,248,0.1)', borderWidth: 1, borderColor: 'rgba(56,189,248,0.3)' },
  mapBtnText: { color: colors.blue, fontSize: rf(12), fontWeight: '700' },

  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: rf(4), paddingHorizontal: rf(12), paddingVertical: rf(8), borderRadius: rf(8), borderWidth: 1 },
  actionBtnTextWhite: { color: '#fff', fontSize: rf(13), fontWeight: '700' },

  stepBtnPrimary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rf(6), backgroundColor: colors.amber, paddingVertical: rf(10), paddingHorizontal: rf(14), borderRadius: rf(10) },
  stepBtnPrimaryText: { color: '#1a1200', fontSize: rf(14), fontWeight: '800' },

  stepBtnSuccess: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rf(6), backgroundColor: colors.green, paddingVertical: rf(10), paddingHorizontal: rf(14), borderRadius: rf(10) },

  completedBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rf(6), backgroundColor: 'rgba(74,222,128,0.12)', borderWidth: 1, borderColor: colors.green, paddingVertical: rf(8), borderRadius: rf(8) },
  completedBannerText: { color: colors.green, fontSize: rf(13), fontWeight: '700' },

  emptyState: { padding: rf(40), alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderRadius: rf(16), borderWidth: 1, borderColor: colors.borderSoft, borderStyle: 'dashed', marginTop: rf(8) },
  emptyStateIconWrapper: { width: rf(64), height: rf(64), borderRadius: rf(32), backgroundColor: colors.panel, alignItems: 'center', justifyContent: 'center', marginBottom: rf(16), borderWidth: 1, borderColor: colors.borderSoft },
  emptyStateTitle: { color: colors.textPrimary, fontSize: rf(16), fontWeight: '700', marginBottom: rf(8) },
  emptyStateText: { color: colors.textMuted, fontSize: rf(14), textAlign: 'center' },

  mapModalHeader: { paddingTop: Platform.OS === 'ios' ? rf(60) : rf(40), paddingHorizontal: rf(20), paddingBottom: rf(16), flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.panel, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  modalTitle: { fontSize: rf(16), fontWeight: '800', color: colors.textPrimary },

  bottomSheetOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: colors.surface, borderTopLeftRadius: rf(24), borderTopRightRadius: rf(24), padding: rf(20), paddingBottom: Platform.OS === 'android' ? rf(55) : rf(32), maxHeight: '90%' },
  bottomSheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: rf(20) },
  bottomSheetTitle: { color: colors.textPrimary, fontSize: rf(20), fontWeight: '800' },
  bottomSheetSubtitle: { color: colors.textMuted, fontSize: rf(13), marginTop: rf(2) },
  formContainer: { gap: rf(14), paddingBottom: rf(16) },
  formRow: { flexDirection: 'row', gap: rf(12) },
  formGroup: { flex: 1, gap: rf(6) },
  formLabel: { color: colors.textMuted, fontSize: rf(11), textTransform: 'uppercase', fontWeight: '700' },
  formInput: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: rf(8), paddingHorizontal: rf(12), height: rf(44), color: colors.textPrimary, fontSize: rf(14) },
  
  // Search Box Autocomplete Styles
  searchBoxInputWrapper: { flexDirection: 'row', alignItems: 'center', gap: rf(8), backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: rf(8), paddingHorizontal: rf(12), height: rf(44) },
  searchBoxInput: { flex: 1, color: colors.textPrimary, fontSize: rf(13), height: '100%' },
  locationBadgeSuccess: { flexDirection: 'row', alignItems: 'center', gap: rf(4), backgroundColor: 'rgba(74,222,128,0.1)', paddingHorizontal: rf(6), paddingVertical: rf(2), borderRadius: rf(6) },
  locationBadgeText: { color: colors.green, fontSize: rf(10), fontWeight: '700' },
  locationWarningText: { color: colors.rose, fontSize: rf(10), fontWeight: '600' },
  
  suggestionsContainer: { backgroundColor: colors.panel, borderRadius: rf(8), borderWidth: 1, borderColor: colors.border, marginTop: rf(4), overflow: 'hidden' },
  suggestionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: rf(8), padding: rf(10), borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  suggestionTitle: { color: colors.textPrimary, fontSize: rf(13), fontWeight: '600' },
  suggestionCoords: { color: colors.textMuted, fontSize: rf(11), marginTop: rf(2) },

  dropdownInput: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: rf(8), paddingHorizontal: rf(12), height: rf(44) },
  dropdownInputText: { color: colors.textPrimary, fontSize: rf(14) },

  bottomSheetFooter: { flexDirection: 'row', gap: rf(12), marginTop: rf(16) },
  cancelBtn: { flex: 1, height: rf(44), backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: rf(10), alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { color: colors.textSecondary, fontSize: rf(14), fontWeight: '600' },
  saveBtn: { flex: 1, height: rf(44), backgroundColor: colors.amber, borderRadius: rf(10), alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#1a1200', fontSize: rf(14), fontWeight: '800' },

  filterModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'center', padding: rf(20) },
  dropdownContainer: { backgroundColor: colors.surface, borderRadius: rf(16), borderWidth: 1, borderColor: colors.border, maxHeight: '60%', overflow: 'hidden', paddingVertical: rf(8) },
  dropdownTitle: { color: colors.textMuted, fontSize: rf(12), fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: rf(20), paddingVertical: rf(12), borderBottomWidth: 1, borderBottomColor: colors.borderSoft, marginBottom: rf(8) },
  dropdownOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: rf(14), paddingHorizontal: rf(20) },
  dropdownOptionText: { color: colors.textPrimary, fontSize: rf(14), fontWeight: '600' },

  capacityAlertError: { backgroundColor: 'rgba(251,113,133,0.08)', borderWidth: 1, borderColor: colors.rose, borderRadius: rf(8), padding: rf(12), marginTop: rf(4) },
  capacityTextError: { color: colors.textSecondary, fontSize: rf(12) },
  capacityTextErrorBold: { color: colors.rose, fontSize: rf(12), fontWeight: '700' },
  capacityAlertSuccess: { flexDirection: 'row', alignItems: 'center', gap: rf(8), backgroundColor: 'rgba(74,222,128,0.08)', borderWidth: 1, borderColor: 'rgba(74,222,128,0.4)', borderRadius: rf(8), padding: rf(12), marginTop: rf(4) },
  capacityTextSuccess: { color: colors.green, fontSize: rf(12) },

  actionModalContainer: { backgroundColor: colors.surface, borderRadius: rf(16), padding: rf(20), width: '100%', borderWidth: 1, borderColor: colors.border },
  actionModalTitle: { color: colors.textPrimary, fontSize: rf(18), fontWeight: '800' },
  actionModalSubtitle: { color: colors.textMuted, fontSize: rf(13), marginVertical: rf(8) },

  notifCard: { backgroundColor: colors.panel, borderRadius: rf(10), padding: rf(12), borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: rf(8) },
  notifCardUnread: { borderColor: colors.amber, backgroundColor: 'rgba(245,158,11,0.08)' },
  notifTitle: { color: colors.textPrimary, fontSize: rf(14), fontWeight: '700' },
  notifMessage: { color: colors.textSecondary, fontSize: rf(12), marginTop: rf(2) },
  notifTime: { color: colors.textMuted, fontSize: rf(10), marginTop: rf(4) },
  unreadDot: { width: rf(8), height: rf(8), borderRadius: rf(4), backgroundColor: colors.amber },

  // AI Route Intelligence Styles
  aiRouteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rf(4),
    paddingHorizontal: rf(10),
    paddingVertical: rf(6),
    borderRadius: rf(8),
    backgroundColor: colors.amber,
  },
  aiRouteBtnText: { color: '#1a1200', fontSize: rf(12), fontWeight: '700' },

  aiRecommendationCard: {
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.4)',
    borderRadius: rf(12),
    padding: rf(14),
  },
  aiCardTagText: { color: '#1a1200', fontSize: rf(11), fontWeight: '800', letterSpacing: 0.5 },
  aiConfidenceBadge: {
    backgroundColor: colors.amber,
    paddingHorizontal: rf(8),
    paddingVertical: rf(2),
    borderRadius: rf(10),
  },
  aiConfidenceText: { color: '#1a1200', fontSize: rf(9), fontWeight: '800' },
  aiReasonText: { color: colors.textPrimary, fontSize: rf(13), fontWeight: '600', marginTop: rf(4) },

  routeOptionCard: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: rf(12),
    padding: rf(14),
  },
  routeOptionCardSelected: {
    borderColor: colors.amber,
    backgroundColor: 'rgba(245,158,11,0.06)',
  },
  routeOptionLabel: { color: colors.textMuted, fontSize: rf(14), fontWeight: '700' },
  radioCircle: {
    width: rf(18),
    height: rf(18),
    borderRadius: rf(9),
    borderWidth: 2,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: { borderColor: colors.amber },
  radioInner: { width: rf(10), height: rf(10), borderRadius: rf(5), backgroundColor: colors.amber },
  recommendedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rf(4),
    backgroundColor: colors.amber,
    paddingHorizontal: rf(8),
    paddingVertical: rf(2),
    borderRadius: rf(8),
  },
  recommendedPillText: { color: '#1a1200', fontSize: rf(10), fontWeight: '800' },
  routeMetricText: { color: colors.textSecondary, fontSize: rf(13), fontWeight: '600' },
});
