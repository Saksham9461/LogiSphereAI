import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Modal,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  MapPin,
  CheckCircle,
  AlertTriangle,
  LogOut,
  Truck,
  Compass,
  X,
  Clock,
} from 'lucide-react-native';
import { colors } from '../theme/colors';
import { rf } from '../theme/responsive';
import { useAttendanceStore } from '../store/AttendanceStore';
import useAuthStore from '../store/AuthStore';
import useTripStore from '../store/TripStore';
import {
  handleClockIn,
  handleClockOut,
  fetchAttendanceStatus,
  getActiveTripForDriver,
} from '../services/attendanceService';
import { getCurrentLocation } from '../services/locationService';
import { checkGeofence } from '../services/geofenceService';
import MapPreview from './MapPreview';

export default function ClockInWidget() {
  const { status, clockInTime, distanceFromOffice, loading, fetchStatus, geofence } = useAttendanceStore();
  const user = useAuthStore((s) => s.user);

  // Standard Result Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'SUCCESS' | 'ERROR'>('SUCCESS');
  const [lastCheckData, setLastCheckData] = useState<any>(null);
  const [serverErrorMessage, setServerErrorMessage] = useState<string | null>(null);
  const [actionInFlight, setActionInFlight] = useState(false);

  // Active Trip Geofence Exception Modal state
  const [exceptionModalVisible, setExceptionModalVisible] = useState(false);
  const [pendingAction, setPendingAction] = useState<'CLOCK_IN' | 'CLOCK_OUT'>('CLOCK_IN');
  const [pendingLocation, setPendingLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [pendingTrip, setPendingTrip] = useState<any>(null);
  const [locationDescription, setLocationDescription] = useState('');
  const [exceptionSubmitting, setExceptionSubmitting] = useState(false);
  const [exceptionInlineError, setExceptionInlineError] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useFocusEffect(
    useCallback(() => {
      fetchStatus();
    }, [fetchStatus])
  );

  const isDriver = (() => {
    const role = String(user?.role || '').toUpperCase();
    return role === 'ROLE_DRIVER' || role === 'DRIVER';
  })();

  const onClockInPress = async () => {
    if (actionInFlight || loading || status === 'CLOCKED_IN') return;
    setActionInFlight(true);
    setServerErrorMessage(null);

    try {
      // 1. Obtain driver's current GPS location
      let location: { latitude: number; longitude: number };
      try {
        location = await getCurrentLocation();
      } catch (locErr: any) {
        setActionInFlight(false);
        setServerErrorMessage(locErr?.message || 'Location permission denied or GPS unavailable.');
        setModalType('ERROR');
        setModalVisible(true);
        return;
      }

      // 2. Check if authenticated user is a Driver
      if (isDriver) {
        // 3. Check geofence distance against organization
        const geoTarget = geofence || undefined;
        const geoResult = checkGeofence(location.latitude, location.longitude, geoTarget);

        // 4. Verify if outside permitted radius
        if (!geoResult.isInside) {
          // 5. Verify if driver has an active authorized trip
          const activeTrip = await getActiveTripForDriver(user?.id || user?.userId);
          if (activeTrip) {
            // Scenario A: Outside geofence + active trip -> Display Exception Modal
            setPendingAction('CLOCK_IN');
            setPendingLocation(location);
            setPendingTrip(activeTrip);
            setExceptionInlineError(null);
            setExceptionModalVisible(true);
            setActionInFlight(false);
            return;
          }
        }
      }

      // Scenario B, C, D, E: Normal attendance clock-in flow
      const result = await handleClockIn();
      setLastCheckData(result.data);

      if (result.success) {
        setModalType('SUCCESS');
        setModalVisible(true);
      } else {
        // Double-check: if backend rejected due to outside geofence, and driver has active trip
        if (
          isDriver &&
          result.error &&
          String(result.error).includes('outside the authorized geofence')
        ) {
          const activeTrip = await getActiveTripForDriver(user?.id || user?.userId);
          if (activeTrip) {
            setPendingAction('CLOCK_IN');
            setPendingLocation(location);
            setPendingTrip(activeTrip);
            setExceptionInlineError(null);
            setExceptionModalVisible(true);
            return;
          }
        }

        if (result.error && typeof result.error === 'string' && result.error !== 'OUTSIDE_GEOFENCE') {
          setServerErrorMessage(result.error);
        }
        setModalType('ERROR');
        setModalVisible(true);
      }
    } finally {
      setActionInFlight(false);
    }
  };

  const onClockOutPress = async () => {
    if (actionInFlight || loading || status !== 'CLOCKED_IN') return;
    setActionInFlight(true);

    try {
      // 1. Obtain device GPS location for clock-out verification
      let location: { latitude: number; longitude: number } | null = null;
      try {
        location = await getCurrentLocation();
      } catch (locErr) {
        console.warn('[ClockInWidget] Clock-out GPS acquisition skipped:', locErr);
      }

      // 2. Check if driver is outside geofence with active trip
      if (isDriver && location) {
        const geoTarget = geofence || undefined;
        const geoResult = checkGeofence(location.latitude, location.longitude, geoTarget);

        if (!geoResult.isInside) {
          const activeTrip = await getActiveTripForDriver(user?.id || user?.userId);
          if (activeTrip) {
            // Scenario A (Clock Out): Outside geofence + active trip -> Display Exception Modal
            setPendingAction('CLOCK_OUT');
            setPendingLocation(location);
            setPendingTrip(activeTrip);
            setExceptionInlineError(null);
            setExceptionModalVisible(true);
            setActionInFlight(false);
            return;
          }
        }
      }

      // Normal clock-out execution
      const result = await handleClockOut();
      if (!result.success) {
        // If rejected due to outside geofence, check if eligible for exception
        if (
          isDriver &&
          location &&
          result.message &&
          String(result.message).includes('outside the authorized geofence')
        ) {
          const activeTrip = await getActiveTripForDriver(user?.id || user?.userId);
          if (activeTrip) {
            setPendingAction('CLOCK_OUT');
            setPendingLocation(location);
            setPendingTrip(activeTrip);
            setExceptionInlineError(null);
            setExceptionModalVisible(true);
            return;
          }
        }

        Alert.alert('Clock Out Failed', result.message || 'Unable to clock out session');
      } else {
        // Refresh attendance status and trips
        fetchStatus();
        useTripStore.getState().getTrips();
      }
    } finally {
      setActionInFlight(false);
    }
  };

  const onExceptionSubmit = async () => {
    const trimmedDesc = locationDescription.trim();
    if (!trimmedDesc) {
      setExceptionInlineError('Please describe your current location.');
      return;
    }

    if (!pendingLocation || !pendingTrip) {
      setExceptionInlineError('Missing location or active trip context. Please retry.');
      return;
    }

    setExceptionSubmitting(true);
    setExceptionInlineError(null);

    const tripId = pendingTrip.tripID || pendingTrip.tripid || pendingTrip.id;

    try {
      if (pendingAction === 'CLOCK_IN') {
        const result = await handleClockIn({
          locationDescription: trimmedDesc,
          tripId,
        });

        if (result.success) {
          setExceptionModalVisible(false);
          setLocationDescription('');
          setLastCheckData(result.data);
          setModalType('SUCCESS');
          setModalVisible(true);
          fetchStatus();
          useTripStore.getState().getTrips();
        } else {
          // Preserve input description and show error for retry
          setExceptionInlineError(result.error || 'Clock in exception was rejected by server.');
        }
      } else {
        const result = await handleClockOut({
          locationDescription: trimmedDesc,
          tripId,
        });

        if (result.success) {
          setExceptionModalVisible(false);
          setLocationDescription('');
          fetchStatus();
          useTripStore.getState().getTrips();
          Alert.alert('Clock Out Successful', 'Your active trip attendance exception was recorded.');
        } else {
          // Preserve input description and show error for retry
          setExceptionInlineError(result.message || 'Clock out exception was rejected by server.');
        }
      }
    } catch (err: any) {
      setExceptionInlineError(err?.message || 'Network error while submitting exception. Please retry.');
    } finally {
      setExceptionSubmitting(false);
    }
  };

  const onExceptionCancel = () => {
    if (exceptionSubmitting) return;
    setExceptionModalVisible(false);
    setExceptionInlineError(null);
  };

  const isClockedIn = status === 'CLOCKED_IN';
  const isChecking = status === 'CHECKING_LOCATION' || loading || actionInFlight;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <MapPin color={colors.amber} size={20} />
          <Text style={styles.title}>Attendance</Text>
        </View>
      </View>

      <View style={styles.content}>
        {isClockedIn ? (
          <View style={styles.statusBox}>
            <View style={styles.statusRow}>
              <CheckCircle color={colors.success} size={16} />
              <Text style={styles.statusTextSuccess}>● Inside Authorized Area</Text>
            </View>
            {distanceFromOffice !== null && distanceFromOffice !== undefined ? (
              <Text style={styles.distanceText}>{distanceFromOffice} m from office</Text>
            ) : null}
            <Text style={styles.timeText}>Clocked In: {clockInTime || 'Active Session'}</Text>
          </View>
        ) : (
          <View style={styles.statusBox}>
            <View style={styles.statusRow}>
              <View style={[styles.dot, { backgroundColor: colors.borderStrong }]} />
              <Text style={styles.statusTextPending}>Ready to clock in</Text>
            </View>
            <Text style={styles.distanceText}>Location verification required</Text>
          </View>
        )}
      </View>

      {!isClockedIn ? (
        <Pressable
          style={[styles.actionBtn, isChecking && { opacity: 0.7 }]}
          onPress={onClockInPress}
          disabled={isChecking}
        >
          {isChecking ? (
            <>
              <ActivityIndicator color="#1a1200" style={{ marginRight: rf(8) }} />
              <Text style={styles.actionBtnText}>PROCESSING...</Text>
            </>
          ) : (
            <Text style={styles.actionBtnText}>CLOCK IN</Text>
          )}
        </Pressable>
      ) : (
        <Pressable
          style={[
            styles.actionBtn,
            { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
            (loading || actionInFlight) && { opacity: 0.7 },
          ]}
          onPress={onClockOutPress}
          disabled={loading || actionInFlight}
        >
          {loading ? (
            <ActivityIndicator color={colors.error} style={{ marginRight: rf(8) }} />
          ) : (
            <LogOut color={colors.error} size={16} style={{ marginRight: rf(8) }} />
          )}
          <Text style={[styles.actionBtnText, { color: colors.error }]}>CLOCK OUT</Text>
        </Pressable>
      )}

      {/* ========================================================================= */}
      {/* Active Trip Geofence Exception Modal                                      */}
      {/* ========================================================================= */}
      <Modal
        visible={exceptionModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={onExceptionCancel}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.exceptionModalCard}>
            <ScrollView
              contentContainerStyle={styles.exceptionScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Header Icon & Title */}
              <View style={styles.exceptionHeader}>
                <View style={styles.exceptionIconCircle}>
                  <Compass color={colors.amber} size={28} />
                </View>
                <Pressable
                  style={styles.exceptionCloseBtn}
                  onPress={onExceptionCancel}
                  hitSlop={10}
                  disabled={exceptionSubmitting}
                >
                  <X color={colors.textSecondary} size={20} />
                </Pressable>
              </View>

              <Text style={styles.exceptionTitle}>Outside Organization Location</Text>

              {/* Explanatory Message */}
              <Text style={styles.exceptionMessage}>
                You are currently outside your organization's permitted geofence radius.
                Are you outside the geofence because you have gone out for a delivery or another authorized trip?
              </Text>

              {/* Active Trip Info Badge */}
              {pendingTrip && (
                <View style={styles.tripBadgeCard}>
                  <View style={styles.tripBadgeHeader}>
                    <Truck color={colors.amber} size={16} />
                    <Text style={styles.tripBadgeTitle}>
                      Active Trip: {pendingTrip.tripID || pendingTrip.tripid || pendingTrip.id}
                    </Text>
                    <View style={styles.tripStatusPill}>
                      <Text style={styles.tripStatusPillText}>{pendingTrip.status || 'ACTIVE'}</Text>
                    </View>
                  </View>
                  {(pendingTrip.source || pendingTrip.destination) && (
                    <Text style={styles.tripRouteText} numberOfLines={1}>
                      {pendingTrip.source || 'Origin'} → {pendingTrip.destination || 'Destination'}
                    </Text>
                  )}
                </View>
              )}

              {/* Input Label */}
              <View style={styles.inputLabelRow}>
                <Text style={styles.inputLabel}>Describe Your Current Location</Text>
                <Text style={styles.requiredAsterisk}> *</Text>
              </View>

              {/* Location Description Multiline TextInput */}
              <TextInput
                style={[
                  styles.multilineInput,
                  Boolean(exceptionInlineError) && styles.inputErrorBorder,
                ]}
                placeholder="For example, delivering an order near the customer's location, travelling to a delivery destination, or returning from an assigned trip."
                placeholderTextColor={colors.textMuted}
                multiline={true}
                numberOfLines={4}
                textAlignVertical="top"
                value={locationDescription}
                onChangeText={(txt) => {
                  setLocationDescription(txt);
                  if (exceptionInlineError) setExceptionInlineError(null);
                }}
                editable={!exceptionSubmitting}
              />

              {/* Inline Validation / Error Message */}
              {exceptionInlineError ? (
                <View style={styles.inlineErrorRow}>
                  <AlertTriangle color={colors.error} size={14} />
                  <Text style={styles.inlineErrorText}>{exceptionInlineError}</Text>
                </View>
              ) : null}

              {/* Action Buttons */}
              <View style={styles.exceptionActionsRow}>
                <Pressable
                  style={[styles.cancelBtn, exceptionSubmitting && { opacity: 0.6 }]}
                  onPress={onExceptionCancel}
                  disabled={exceptionSubmitting}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>

                <Pressable
                  style={[styles.submitExceptionBtn, exceptionSubmitting && { opacity: 0.7 }]}
                  onPress={onExceptionSubmit}
                  disabled={exceptionSubmitting}
                >
                  {exceptionSubmitting ? (
                    <ActivityIndicator color="#1a1200" size="small" />
                  ) : (
                    <Text style={styles.submitExceptionBtnText}>
                      {pendingAction === 'CLOCK_IN' ? 'Submit and Clock In' : 'Submit and Clock Out'}
                    </Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================================================= */}
      {/* Standard Success / Error Result Modal                                     */}
      {/* ========================================================================= */}
      <Modal visible={modalVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {modalType === 'SUCCESS' ? (
              <View style={styles.modalBody}>
                <View style={styles.iconCircleSuccess}>
                  <CheckCircle color={colors.success} size={32} />
                </View>
                <Text style={styles.modalTitle}>Clock In Successful</Text>
                <Text style={styles.modalSubtitle}>
                  {lastCheckData?.isException
                    ? 'Attendance recorded outside geofence via authorized trip exception.'
                    : 'You are inside the authorized location.'}
                </Text>

                {lastCheckData && (
                  <MapPreview
                    distance={lastCheckData.distance}
                    requiredRadius={lastCheckData.requiredRadius}
                    isInside={lastCheckData.isInside}
                  />
                )}

                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Distance</Text>
                    <Text style={styles.statVal}>{lastCheckData?.distance ?? 0} m</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Location</Text>
                    <Text style={styles.statVal} numberOfLines={1}>
                      {lastCheckData?.organizationName || 'Authorized Area'}
                    </Text>
                  </View>
                </View>

                <Pressable style={styles.modalBtnSuccess} onPress={() => setModalVisible(false)}>
                  <Text style={styles.modalBtnTextSuccess}>Done</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.modalBody}>
                <View style={styles.iconCircleError}>
                  <AlertTriangle color={colors.error} size={32} />
                </View>
                <Text style={styles.modalTitle}>
                  {serverErrorMessage ? 'Clock In Rejected' : 'Location Not Allowed'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {serverErrorMessage || 'You are not within the authorized attendance location.'}
                </Text>

                {lastCheckData && (
                  <MapPreview
                    distance={lastCheckData.distance}
                    requiredRadius={lastCheckData.requiredRadius}
                    isInside={lastCheckData.isInside}
                  />
                )}

                <View style={styles.errorStatsBox}>
                  <Text style={styles.errorStatText}>
                    Required radius: <Text style={styles.bold}>{lastCheckData?.requiredRadius ?? 200} m</Text>
                  </Text>
                  <Text style={styles.errorStatText}>
                    Your distance:{' '}
                    <Text style={styles.bold}>
                      {lastCheckData?.distance !== undefined && lastCheckData?.distance !== null
                        ? `${lastCheckData.distance} m`
                        : 'Location unavailable'}
                    </Text>
                  </Text>
                </View>

                <Pressable style={styles.modalBtnError} onPress={() => setModalVisible(false)}>
                  <Text style={styles.modalBtnTextError}>Try Again</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: rf(16),
    padding: rf(16),
    borderWidth: 1,
    borderColor: colors.borderSoft,
    marginBottom: rf(24),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: rf(16),
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rf(8),
  },
  title: {
    fontSize: rf(16),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  content: {
    marginBottom: rf(16),
  },
  statusBox: {
    backgroundColor: colors.panel,
    padding: rf(12),
    borderRadius: rf(12),
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rf(8),
    marginBottom: rf(4),
  },
  dot: {
    width: rf(8),
    height: rf(8),
    borderRadius: rf(4),
  },
  statusTextSuccess: {
    fontSize: rf(14),
    fontWeight: '600',
    color: colors.success,
  },
  statusTextPending: {
    fontSize: rf(14),
    fontWeight: '600',
    color: colors.textPrimary,
  },
  distanceText: {
    fontSize: rf(12),
    color: colors.textMuted,
    marginLeft: rf(24),
  },
  timeText: {
    fontSize: rf(12),
    color: colors.textPrimary,
    fontWeight: '500',
    marginLeft: rf(24),
    marginTop: rf(4),
  },
  actionBtn: {
    backgroundColor: colors.amber,
    borderRadius: rf(12),
    height: rf(48),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.amber,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  actionBtnText: {
    color: '#1a1200',
    fontSize: rf(15),
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Modal Overlays
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: rf(24),
    borderTopRightRadius: rf(24),
    padding: rf(24),
    paddingBottom: rf(40),
  },
  modalBody: {
    alignItems: 'center',
    paddingBottom: rf(24),
  },
  iconCircleSuccess: {
    width: rf(64),
    height: rf(64),
    borderRadius: rf(32),
    backgroundColor: `${colors.success}1A`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: rf(16),
  },
  iconCircleError: {
    width: rf(64),
    height: rf(64),
    borderRadius: rf(32),
    backgroundColor: `${colors.error}1A`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: rf(16),
  },
  modalTitle: {
    fontSize: rf(20),
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: rf(8),
  },
  modalSubtitle: {
    fontSize: rf(14),
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: rf(16),
  },
  statsRow: {
    flexDirection: 'row',
    gap: rf(12),
    width: '100%',
    marginBottom: rf(24),
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.panel,
    padding: rf(12),
    borderRadius: rf(12),
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: rf(12),
    color: colors.textMuted,
    marginBottom: rf(4),
  },
  statVal: {
    fontSize: rf(14),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  errorStatsBox: {
    width: '100%',
    backgroundColor: `${colors.error}0A`,
    borderWidth: 1,
    borderColor: `${colors.error}33`,
    borderRadius: rf(12),
    padding: rf(16),
    marginBottom: rf(24),
    alignItems: 'center',
  },
  errorStatText: {
    fontSize: rf(14),
    color: colors.textSecondary,
    marginBottom: rf(4),
  },
  bold: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalBtnSuccess: {
    width: '100%',
    backgroundColor: colors.success,
    height: rf(48),
    borderRadius: rf(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnTextSuccess: {
    color: '#FFF',
    fontSize: rf(16),
    fontWeight: '700',
  },
  modalBtnError: {
    width: '100%',
    backgroundColor: colors.surface,
    height: rf(48),
    borderRadius: rf(12),
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnTextError: {
    color: colors.textPrimary,
    fontSize: rf(16),
    fontWeight: '600',
  },

  // =========================================================================
  // Exception Modal Styles
  // =========================================================================
  exceptionModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: rf(28),
    borderTopRightRadius: rf(28),
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 25,
  },
  exceptionScrollContent: {
    padding: rf(20),
    paddingBottom: Platform.OS === 'ios' ? rf(36) : rf(24),
  },
  exceptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: rf(12),
  },
  exceptionIconCircle: {
    width: rf(48),
    height: rf(48),
    borderRadius: rf(24),
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exceptionCloseBtn: {
    padding: rf(6),
    borderRadius: rf(16),
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  exceptionTitle: {
    fontSize: rf(18),
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: rf(8),
  },
  exceptionMessage: {
    fontSize: rf(13),
    color: colors.textSecondary,
    lineHeight: rf(19),
    marginBottom: rf(14),
  },
  tripBadgeCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: rf(12),
    padding: rf(12),
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: rf(16),
  },
  tripBadgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rf(8),
    marginBottom: rf(4),
  },
  tripBadgeTitle: {
    fontSize: rf(13),
    fontWeight: '700',
    color: '#92400E',
    flex: 1,
  },
  tripStatusPill: {
    backgroundColor: '#FDE68A',
    paddingHorizontal: rf(8),
    paddingVertical: rf(2),
    borderRadius: rf(6),
  },
  tripStatusPillText: {
    fontSize: rf(10),
    fontWeight: '800',
    color: '#78350F',
  },
  tripRouteText: {
    fontSize: rf(12),
    color: '#B45309',
    marginTop: rf(2),
  },
  inputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: rf(6),
  },
  inputLabel: {
    fontSize: rf(13),
    fontWeight: '600',
    color: colors.textPrimary,
  },
  requiredAsterisk: {
    fontSize: rf(13),
    fontWeight: '700',
    color: colors.error,
  },
  multilineInput: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: rf(12),
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: rf(12),
    fontSize: rf(13),
    color: colors.textPrimary,
    minHeight: rf(90),
    textAlignVertical: 'top',
    marginBottom: rf(8),
  },
  inputErrorBorder: {
    borderColor: colors.error,
  },
  inlineErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rf(6),
    marginBottom: rf(12),
  },
  inlineErrorText: {
    fontSize: rf(12),
    color: colors.error,
    fontWeight: '500',
    flex: 1,
  },
  exceptionActionsRow: {
    flexDirection: 'row',
    gap: rf(12),
    marginTop: rf(12),
  },
  cancelBtn: {
    flex: 1,
    height: rf(46),
    borderRadius: rf(12),
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: rf(14),
    fontWeight: '600',
    color: colors.textSecondary,
  },
  submitExceptionBtn: {
    flex: 2,
    height: rf(46),
    borderRadius: rf(12),
    backgroundColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.amber,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  submitExceptionBtnText: {
    fontSize: rf(14),
    fontWeight: '700',
    color: '#1a1200',
  },
});
