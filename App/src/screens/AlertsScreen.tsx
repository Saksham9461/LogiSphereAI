import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Dimensions,
  Platform,
  Alert,
  StatusBar,
} from 'react-native';
import {
  Siren,
  Search,
  CheckCircle2,
  Clock,
  MapPin,
  Calendar,
  AlertTriangle,
  RefreshCw,
  Eye,
  Check,
  ShieldCheck,
  X,
  User,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Map, Camera, Marker } from '@maplibre/maplibre-react-native';
import { MAPTILER_API_KEY } from '../config/env';
import { rf } from '../theme/responsive';
import { colors } from '../theme/colors';
import { useAlertStore, EmergencyAlert, AlertStatusFilter } from '../store/AlertStore';
import useAuthStore from '../store/AuthStore';
import { offlineSOSQueue, QueuedSOSRequest } from '../services/offlineSOSQueue';
import { sosSyncWorker } from '../services/sosSyncWorker';
import { usePermissions, Permission } from '../utils/rbac';

const { width, height } = Dimensions.get('window');

const STATUS_FILTERS: { key: AlertStatusFilter; label: string }[] = [
  { key: 'ALL', label: 'All Alerts' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'ACKNOWLEDGED', label: 'Acknowledged' },
  { key: 'RESOLVED', label: 'Resolved' },
];

export default function AlertsScreen() {
  const {
    alerts,
    activeCount,
    totalCount,
    loading,
    refreshing,
    statusFilter,
    searchQuery,
    isManager,
    selectedAlert,
    fetchAlerts,
    setStatusFilter,
    setSearchQuery,
    setSelectedAlert,
    acknowledgeAlert,
    resolveAlert,
  } = useAlertStore();

  const currentUser = useAuthStore((state) => state.user);
  const insets = useSafeAreaInsets();
  const { can } = usePermissions();
  const canViewOrgAlerts = can(Permission.ALERTS_VIEW);
  const canAcknowledge = can(Permission.ALERTS_ACKNOWLEDGE);
  const canResolve = can(Permission.ALERTS_RESOLVE);

  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [resolveModalVisible, setResolveModalVisible] = useState(false);
  const [resolveNote, setResolveNote] = useState('');
  const [resolvingAlertId, setResolvingAlertId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [queuedRequests, setQueuedRequests] = useState<QueuedSOSRequest[]>([]);
  const [retryingQueue, setRetryingQueue] = useState(false);

  // Subscribe to durable offline SOS queue (for authenticated drivers)
  useEffect(() => {
    const currentDriverId = currentUser?.id || currentUser?.userId;
    if (!currentDriverId || canViewOrgAlerts) {
      setQueuedRequests([]);
      return;
    }

    const unsub = offlineSOSQueue.subscribeQueue((queue) => {
      const driverItems = queue.filter(
        (item) => String(item.driverId).toLowerCase() === String(currentDriverId).toLowerCase()
      );
      setQueuedRequests(driverItems);
    });

    return () => unsub();
  }, [currentUser, canViewOrgAlerts]);

  // Fetch alerts on screen focus and poll periodically so alerts arrive in real-time
  useFocusEffect(
    useCallback(() => {
      fetchAlerts();
      const interval = setInterval(() => {
        fetchAlerts();
      }, 5000);
      return () => clearInterval(interval);
    }, [fetchAlerts])
  );

  const handleManualSyncQueue = async () => {
    setRetryingQueue(true);
    await sosSyncWorker.syncPendingSOS('user_manual_screen_retry');
    await fetchAlerts();
    setRetryingQueue(false);
  };

  const handleRefresh = async () => {
    await fetchAlerts(true);
    if (!canViewOrgAlerts) {
      await sosSyncWorker.syncPendingSOS('pull_to_refresh');
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    setActionLoadingId(alertId);
    const res = await acknowledgeAlert(alertId);
    setActionLoadingId(null);
    if (!res.success) {
      Alert.alert('Action Failed', res.message || 'Unable to acknowledge alert.');
    }
  };

  const openResolveModal = (alertId: string) => {
    setResolvingAlertId(alertId);
    setResolveNote('');
    setResolveModalVisible(true);
  };

  const submitResolve = async () => {
    if (!resolvingAlertId) return;
    setActionLoadingId(resolvingAlertId);
    const res = await resolveAlert(resolvingAlertId, resolveNote.trim() || undefined);
    setActionLoadingId(null);
    setResolveModalVisible(false);
    setResolvingAlertId(null);
    if (!res.success) {
      Alert.alert('Action Failed', res.message || 'Unable to resolve alert.');
    }
  };

  const openMap = (alert: EmergencyAlert) => {
    setSelectedAlert(alert);
    setMapModalVisible(true);
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <View style={[styles.badge, styles.badgeActive]}>
            <View style={styles.pulseDot} />
            <Text style={styles.badgeActiveText}>ACTIVE</Text>
          </View>
        );
      case 'ACKNOWLEDGED':
        return (
          <View style={[styles.badge, styles.badgeAck]}>
            <Clock size={11} color="#B45309" strokeWidth={2.5} />
            <Text style={styles.badgeAckText}>ACKNOWLEDGED</Text>
          </View>
        );
      case 'RESOLVED':
        return (
          <View style={[styles.badge, styles.badgeResolved]}>
            <Check size={11} color="#047857" strokeWidth={2.5} />
            <Text style={styles.badgeResolvedText}>RESOLVED</Text>
          </View>
        );
      default:
        return null;
    }
  };

  const renderLocationFreshness = (alert: EmergencyAlert) => {
    if (alert.locationStatus === 'PRECISE' && alert.latitude && alert.longitude) {
      return (
        <View style={styles.locBadge}>
          <View style={[styles.locDot, { backgroundColor: '#10B981' }]} />
          <Text style={styles.locBadgeText}>Precise GPS</Text>
        </View>
      );
    }
    if (alert.locationStatus === 'LAST_KNOWN' && alert.latitude && alert.longitude) {
      return (
        <View style={styles.locBadge}>
          <View style={[styles.locDot, { backgroundColor: '#F59E0B' }]} />
          <Text style={styles.locBadgeText}>Last Known Location</Text>
        </View>
      );
    }
    return (
      <View style={styles.locBadge}>
        <View style={[styles.locDot, { backgroundColor: '#EF4444' }]} />
        <Text style={[styles.locBadgeText, { color: '#EF4444' }]}>Coordinates Unavailable</Text>
      </View>
    );
  };

  const formatActorName = (nameOrId?: string | null, namedFallback?: string | null) => {
    if (namedFallback && namedFallback.trim()) return namedFallback.trim();
    if (!nameOrId || !nameOrId.trim()) return 'Pending';
    const val = nameOrId.trim();
    const currentId = currentUser?.id || currentUser?.userId;
    if (currentId && val.toLowerCase() === String(currentId).toLowerCase()) {
      return currentUser?.name || currentUser?.email || 'Fleet Manager';
    }
    const isId = val.startsWith('usr-') || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
    if (isId) {
      return 'Fleet Manager';
    }
    return val;
  };

  const formatAuditTimestamp = (isoString?: string | null) => {
    if (!isoString) return '--';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      const dateStr = d.toLocaleDateString();
      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      return `${dateStr}, ${timeStr}`;
    } catch {
      return isoString;
    }
  };

  const mapStyleUrl = `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_API_KEY}`;

  return (
    <View style={styles.container}>
      {/* SCREEN HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <View style={styles.titleRow}>
            <Siren color="#EF4444" size={24} strokeWidth={2.5} />
            <Text style={styles.screenTitle}>Emergency Alerts</Text>
          </View>
          <Text style={styles.roleSubtext}>
            {canViewOrgAlerts ? 'Fleet Control Center • Incident Monitoring' : 'My Emergency SOS Records'}
          </Text>
        </View>

        <View style={styles.headerRight}>
          {activeCount > 0 ? (
            <View style={styles.activePill}>
              <View style={styles.activePillDot} />
              <Text style={styles.activePillText}>{activeCount} Active</Text>
            </View>
          ) : (
            <View style={styles.allClearPill}>
              <CheckCircle2 color="#10B981" size={13} />
              <Text style={styles.allClearText}>All Clear</Text>
            </View>
          )}

          <Pressable style={styles.refreshBtn} onPress={handleRefresh} hitSlop={8}>
            <RefreshCw color={colors.textPrimary} size={18} />
          </Pressable>
        </View>
      </View>

      {/* SEARCH INPUT */}
      <View style={styles.searchSection}>
        <View style={styles.searchBox}>
          <Search color={colors.textMuted} size={18} />
          <TextInput
            style={styles.searchInput}
            placeholder={canViewOrgAlerts ? "Search by driver or status..." : "Search alerts..."}
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={(txt) => {
              setSearchQuery(txt);
              fetchAlerts();
            }}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => { setSearchQuery(''); fetchAlerts(); }}>
              <X color={colors.textMuted} size={16} />
            </Pressable>
          )}
        </View>
      </View>

      {/* MODERN SEGMENTED TAB BAR */}
      <View style={styles.segmentedContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmentedContent}>
          {STATUS_FILTERS.map((tab) => {
            const isActive = statusFilter === tab.key;
            return (
              <Pressable
                key={tab.key}
                style={[styles.segmentedTab, isActive && styles.segmentedTabActive]}
                onPress={() => setStatusFilter(tab.key)}
              >
                <Text style={[styles.segmentedTabText, isActive && styles.segmentedTabTextActive]}>
                  {tab.label}
                  {tab.key === 'ACTIVE' && activeCount > 0 ? ` (${activeCount})` : ''}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ALERT LIST */}
      <ScrollView
        contentContainerStyle={styles.listContent}
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
        {/* PENDING OFFLINE SOS QUEUE CARDS (DRIVERS ONLY) */}
        {!isManager && queuedRequests.map((req) => {
          const reqDate = new Date(req.createdAt).toLocaleDateString();
          const reqTime = new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          return (
            <View key={req.clientRequestId} style={[styles.alertCard, styles.alertCardPendingSync]}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <View style={[styles.driverAvatar, { backgroundColor: '#FEF3C7' }]}>
                    <RefreshCw color="#D97706" size={16} />
                  </View>
                  <View>
                    <Text style={styles.driverNameText}>
                      {currentUser?.name || currentUser?.email || 'Driver'}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardHeaderRight}>
                  <View style={styles.badgePendingSync}>
                    <Clock size={12} color="#92400E" />
                    <Text style={styles.badgePendingSyncText}>
                      {req.status === 'SYNCING' ? 'SYNCING...' : 'PENDING SYNC'}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Calendar size={13} color={colors.textSecondary} />
                  <Text style={styles.metaText}>{reqDate}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Clock size={13} color={colors.textSecondary} />
                  <Text style={styles.metaText}>{reqTime}</Text>
                </View>
                <View style={[styles.locBadge, { backgroundColor: '#FEF3C7' }]}>
                  <Text style={[styles.locBadgeText, { color: '#92400E' }]}>OFFLINE QUEUE</Text>
                </View>
              </View>

              <View style={styles.pendingOfflineNoticeBox}>
                <AlertTriangle size={15} color="#D97706" />
                <Text style={styles.pendingOfflineNoticeText}>
                  No internet connection. SOS saved and will be sent automatically when connectivity returns.
                </Text>
              </View>

              {req.lastError && req.retryCount > 0 && (
                <View style={styles.pendingRetryInfoBox}>
                  <Text style={styles.pendingRetryInfoText}>
                    Retry count: {req.retryCount} • {req.lastError}
                  </Text>
                </View>
              )}

              <View style={styles.cardActions}>
                <Pressable
                  style={[styles.btnAction, styles.btnSyncNow]}
                  onPress={handleManualSyncQueue}
                  disabled={retryingQueue || req.status === 'SYNCING'}
                >
                  {retryingQueue || req.status === 'SYNCING' ? (
                    <ActivityIndicator size="small" color="#92400E" />
                  ) : (
                    <>
                      <RefreshCw size={14} color="#92400E" />
                      <Text style={styles.btnSyncNowText}>Retry Sync Now</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          );
        })}

        {loading && alerts.length === 0 && queuedRequests.length === 0 ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#EF4444" />
            <Text style={styles.loadingText}>Loading emergency alerts...</Text>
          </View>
        ) : alerts.length === 0 && queuedRequests.length === 0 ? (
          <View style={styles.emptyCard}>
            <ShieldCheck color="#10B981" size={48} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No Emergency Alerts</Text>
            <Text style={styles.emptySubtitle}>
              {statusFilter !== 'ALL'
                ? `No alerts found with status "${statusFilter}".`
                : isManager
                ? 'No emergency SOS signals have been registered for your fleet.'
                : 'You have not submitted any emergency SOS alerts.'}
            </Text>
          </View>
        ) : (
          alerts.map((alert) => {
            const dateStr = new Date(alert.createdAt).toLocaleDateString();
            const timeStr = new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const hasCoords = alert.latitude !== null && alert.longitude !== null;
            const isActing = actionLoadingId === alert.id;

            return (
              <View key={alert.id} style={[styles.alertCard, alert.status === 'ACTIVE' && styles.alertCardActive]}>
                {/* CARD HEADER */}
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <View style={[styles.driverAvatar, alert.status === 'ACTIVE' && { backgroundColor: '#FEE2E2' }]}>
                      <User color={alert.status === 'ACTIVE' ? '#EF4444' : colors.textPrimary} size={16} />
                    </View>
                    <View>
                      <Text style={styles.driverNameText}>{alert.driverName}</Text>
                    </View>
                  </View>

                  <View style={styles.cardHeaderRight}>
                    {renderStatusBadge(alert.status)}
                  </View>
                </View>

                {/* DATE, TIME & LOCATION BADGES */}
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Calendar size={13} color={colors.textSecondary} />
                    <Text style={styles.metaText}>{dateStr}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Clock size={13} color={colors.textSecondary} />
                    <Text style={styles.metaText}>{timeStr}</Text>
                  </View>
                  {renderLocationFreshness(alert)}
                </View>



                {/* EMERGENCY MESSAGE */}
                {alert.message && (
                  <View style={styles.messageBox}>
                    <Text style={styles.messageText}>{alert.message}</Text>
                  </View>
                )}

                {/* HORIZONTALLY SCROLLABLE ALERT DETAILS TABLE */}
                <View style={styles.tableWrapper}>
                  {/* <Text style={styles.tableHintText}>← Swipe horizontally for full record details →</Text> */}
                  <ScrollView
                    horizontal
                    nestedScrollEnabled={true}
                    showsHorizontalScrollIndicator={true}
                    contentContainerStyle={styles.tableScrollContent}
                  >
                    <View style={styles.detailTable}>
                      {/* Table Header */}
                      <View style={styles.tableRowHeader}>
                        <Text style={[styles.colHeader, { width: 120 }]}>Driver</Text>
                        <Text style={[styles.colHeader, { width: 95 }]}>Date</Text>
                        <Text style={[styles.colHeader, { width: 85 }]}>Time</Text>
                        <Text style={[styles.colHeader, { width: 105 }]}>Latitude</Text>
                        <Text style={[styles.colHeader, { width: 105 }]}>Longitude</Text>
                        <Text style={[styles.colHeader, { width: 80 }]}>Accuracy</Text>
                        <Text style={[styles.colHeader, { width: 110 }]}>Status</Text>
                      </View>

                      {/* Table Data Row */}
                      <View style={styles.tableRowData}>
                        <Text style={[styles.colCell, { width: 120, fontWeight: '700' }]} numberOfLines={1}>
                          {alert.driverName}
                        </Text>
                        <Text style={[styles.colCell, { width: 95 }]}>{dateStr}</Text>
                        <Text style={[styles.colCell, { width: 85 }]}>{timeStr}</Text>
                        <Text style={[styles.colCell, { width: 105, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }]}>
                          {alert.latitude !== null ? alert.latitude.toFixed(5) : '--'}
                        </Text>
                        <Text style={[styles.colCell, { width: 105, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }]}>
                          {alert.longitude !== null ? alert.longitude.toFixed(5) : '--'}
                        </Text>
                        <Text style={[styles.colCell, { width: 80 }]}>
                          {alert.locationAccuracy !== null && alert.locationAccuracy !== undefined ? `±${Math.round(alert.locationAccuracy)}m` : '--'}
                        </Text>
                        <Text style={[styles.colCell, { width: 110, fontWeight: '700' }]}>
                          {alert.status}
                        </Text>
                      </View>
                    </View>
                  </ScrollView>
                </View>

                {/* RESOLUTION AUDIT NOTE */}
                {alert.status === 'RESOLVED' && alert.resolutionNote && (
                  <View style={styles.resolutionBox}>
                    <ShieldCheck size={14} color="#047857" />
                    <Text style={styles.resolutionText}>Resolution: {alert.resolutionNote}</Text>
                  </View>
                )}

                {/* ACTION BUTTONS */}
                <View style={styles.cardActions}>
                  {hasCoords ? (
                    <Pressable
                      style={[styles.btnAction, styles.btnMap]}
                      onPress={() => openMap(alert)}
                    >
                      <MapPin size={14} color="#FFFFFF" />
                      <Text style={styles.btnMapText}>View on Map</Text>
                    </Pressable>
                  ) : (
                    <View style={[styles.btnAction, styles.btnDisabled]}>
                      <MapPin size={14} color={colors.textMuted} />
                      <Text style={styles.btnDisabledText}>No GPS</Text>
                    </View>
                  )}

                  {canAcknowledge && alert.status === 'ACTIVE' && (
                    <Pressable
                      style={[styles.btnAction, styles.btnAck]}
                      onPress={() => handleAcknowledge(alert.id)}
                      disabled={isActing}
                    >
                      {isActing ? (
                        <ActivityIndicator size="small" color="#B45309" />
                      ) : (
                        <>
                          <Clock size={14} color="#B45309" />
                          <Text style={styles.btnAckText}>Acknowledge</Text>
                        </>
                      )}
                    </Pressable>
                  )}

                  {canResolve && (alert.status === 'ACTIVE' || alert.status === 'ACKNOWLEDGED') && (
                    <Pressable
                      style={[styles.btnAction, styles.btnResolve]}
                      onPress={() => openResolveModal(alert.id)}
                      disabled={isActing}
                    >
                      <Check size={14} color="#047857" />
                      <Text style={styles.btnResolveText}>Resolve</Text>
                    </Pressable>
                  )}

                  <Pressable
                    style={[styles.btnAction, styles.btnDetails]}
                    onPress={() => setSelectedAlert(alert)}
                  >
                    <Eye size={14} color={colors.textPrimary} />
                    <Text style={styles.btnDetailsText}>Audit Log</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* MAP MODAL */}
      <Modal
        visible={mapModalVisible}
        animationType="slide"
        transparent={false}
        statusBarTranslucent={true}
        onRequestClose={() => setMapModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <StatusBar barStyle="dark-content" backgroundColor={colors.panel} translucent={true} />

          {/* Modal Header */}
          <View style={[styles.modalHeader, { paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 36 : 44) + 10 }]}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.modalTitle} numberOfLines={1}>🚨 Emergency Location</Text>
              <Text style={styles.modalSub} numberOfLines={1}>
                {selectedAlert?.driverName} • Recorded Coordinates
              </Text>
            </View>
            <Pressable
              style={styles.modalCloseBtn}
              onPress={() => setMapModalVisible(false)}
              hitSlop={10}
            >
              <X color={colors.textPrimary} size={22} />
            </Pressable>
          </View>

          {/* Interactive Map */}
          {selectedAlert?.latitude && selectedAlert?.longitude ? (
            <View style={styles.mapContainer}>
              <Map style={styles.mapView} mapStyle={mapStyleUrl} logo={false} attribution={false}>
                <Camera
                  initialViewState={{
                    center: [selectedAlert.longitude, selectedAlert.latitude],
                    zoom: 15,
                  }}
                />
                <Marker
                  id="emergency-marker"
                  lngLat={[selectedAlert.longitude, selectedAlert.latitude]}
                >
                  <View style={styles.emergencyMarkerWrapper}>
                    <View style={styles.pulseRing} />
                    <View style={styles.emergencyMarker}>
                      <Siren color="#FFFFFF" size={18} strokeWidth={2.5} />
                    </View>
                  </View>
                </Marker>
              </Map>

              {/* Float Card with Exact GPS metadata */}
              <View style={[styles.mapInfoCard, { bottom: Math.max(insets.bottom, 16) + 16 }]}>
                <View style={styles.mapInfoRow}>
                  <Text style={styles.mapInfoLabel}>Exact Coordinates:</Text>
                  <Text style={styles.mapInfoVal}>
                    {selectedAlert.latitude.toFixed(6)}, {selectedAlert.longitude.toFixed(6)}
                  </Text>
                </View>
                {selectedAlert.locationAccuracy && (
                  <View style={styles.mapInfoRow}>
                    <Text style={styles.mapInfoLabel}>GPS Accuracy:</Text>
                    <Text style={styles.mapInfoVal}>±{selectedAlert.locationAccuracy} meters</Text>
                  </View>
                )}
                <View style={styles.mapInfoRow}>
                  <Text style={styles.mapInfoLabel}>Capture Timestamp:</Text>
                  <Text style={styles.mapInfoVal}>
                    {new Date(selectedAlert.createdAt).toLocaleString()}
                  </Text>
                </View>
                <Text style={styles.mapNotice}>
                  * Centered on exact recorded SOS coordinates. Does not imply driver's current position if vehicle moved.
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.noCoordsContainer}>
              <AlertTriangle size={48} color="#EF4444" />
              <Text style={styles.noCoordsTitle}>Coordinates Not Recorded</Text>
              <Text style={styles.noCoordsSub}>
                The driver's device was unable to lock a GPS signal when the emergency SOS was transmitted.
              </Text>
            </View>
          )}
        </View>
      </Modal>

      {/* RESOLVE ALERT MODAL */}
      <Modal
        visible={resolveModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setResolveModalVisible(false)}
      >
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogCard}>
            <View style={styles.dialogHeader}>
              <ShieldCheck color="#10B981" size={24} />
              <Text style={styles.dialogTitle}>Resolve Emergency Alert</Text>
            </View>
            <Text style={styles.dialogDesc}>
              Provide an audit resolution note explaining the resolution action taken (e.g. roadside assistance arrived, false alarm verified).
            </Text>

            <TextInput
              style={styles.dialogInput}
              placeholder="e.g. Tow truck dispatched, driver safe at depot..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              value={resolveNote}
              onChangeText={setResolveNote}
            />

            <View style={styles.dialogActions}>
              <Pressable
                style={styles.dialogCancelBtn}
                onPress={() => setResolveModalVisible(false)}
              >
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </Pressable>

              <Pressable style={styles.dialogConfirmBtn} onPress={submitResolve}>
                <Text style={styles.dialogConfirmText}>Confirm Resolution</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* AUDIT LOG MODAL */}
      <Modal
        visible={Boolean(selectedAlert && !mapModalVisible && !resolveModalVisible)}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedAlert(null)}
      >
        <View style={styles.auditOverlay}>
          <View style={[styles.auditSheet, { paddingBottom: Math.max(insets.bottom, 16) + 20 }]}>
            <View style={styles.auditHeader}>
              <View>
                <Text style={styles.auditTitle}>Alert Audit Record</Text>
                <Text style={styles.auditId}>ID: {selectedAlert?.id}</Text>
              </View>
              <Pressable onPress={() => setSelectedAlert(null)} hitSlop={10}>
                <X color={colors.textPrimary} size={22} />
              </Pressable>
            </View>

            <ScrollView style={styles.auditBody}>
              <View style={styles.auditRow}>
                <Text style={styles.auditLabel}>Driver Name:</Text>
                <Text style={styles.auditValue}>{selectedAlert?.driverName}</Text>
              </View>
              <View style={styles.auditRow}>
                <Text style={styles.auditLabel}>Status:</Text>
                <Text style={styles.auditValue}>{selectedAlert?.status}</Text>
              </View>
              <View style={styles.auditRow}>
                <Text style={styles.auditLabel}>Created At:</Text>
                <Text style={styles.auditValue}>{formatAuditTimestamp(selectedAlert?.createdAt)}</Text>
              </View>
              <View style={styles.auditRow}>
                <Text style={styles.auditLabel}>Latitude:</Text>
                <Text style={styles.auditValue}>{selectedAlert?.latitude ?? 'Unavailable'}</Text>
              </View>
              <View style={styles.auditRow}>
                <Text style={styles.auditLabel}>Longitude:</Text>
                <Text style={styles.auditValue}>{selectedAlert?.longitude ?? 'Unavailable'}</Text>
              </View>
              <View style={styles.auditRow}>
                <Text style={styles.auditLabel}>Acknowledged By:</Text>
                <Text style={styles.auditValue}>
                  {formatActorName(selectedAlert?.acknowledgedBy, selectedAlert?.acknowledgedByName)}
                </Text>
              </View>
              <View style={styles.auditRow}>
                <Text style={styles.auditLabel}>Acknowledged At:</Text>
                <Text style={styles.auditValue}>{formatAuditTimestamp(selectedAlert?.acknowledgedAt)}</Text>
              </View>
              <View style={styles.auditRow}>
                <Text style={styles.auditLabel}>Resolved By:</Text>
                <Text style={styles.auditValue}>
                  {formatActorName(selectedAlert?.resolvedBy, selectedAlert?.resolvedByName)}
                </Text>
              </View>
              <View style={styles.auditRow}>
                <Text style={styles.auditLabel}>Resolved At:</Text>
                <Text style={styles.auditValue}>{formatAuditTimestamp(selectedAlert?.resolvedAt)}</Text>
              </View>
              {selectedAlert?.resolutionNote && (
                <View style={styles.auditRow}>
                  <Text style={styles.auditLabel}>Resolution Note:</Text>
                  <Text style={styles.auditValue}>{selectedAlert?.resolutionNote}</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    backgroundColor: colors.panel,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  headerTitleContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  screenTitle: {
    fontSize: rf(20),
    fontWeight: '800',
    color: colors.textPrimary,
  },
  roleSubtext: {
    fontSize: rf(11),
    color: colors.textMuted,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  activePillDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  activePillText: {
    color: '#B91C1C',
    fontSize: rf(11),
    fontWeight: '800',
  },
  allClearPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  allClearText: {
    color: '#065F46',
    fontSize: rf(11),
    fontWeight: '700',
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: colors.panel,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: rf(12),
    paddingHorizontal: 14,
    height: rf(46),
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: rf(13),
    color: colors.textPrimary,
  },
  segmentedContainer: {
    backgroundColor: colors.panel,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
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
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: rf(13),
    color: colors.textMuted,
  },
  emptyCard: {
    backgroundColor: colors.panel,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: rf(16),
    fontWeight: '800',
    color: colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: rf(12),
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  alertCard: {
    backgroundColor: colors.panel,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  alertCardActive: {
    borderColor: '#EF4444',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  driverAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverNameText: {
    fontSize: rf(14),
    fontWeight: '800',
    color: colors.textPrimary,
  },
  alertIdText: {
    fontSize: rf(10),
    color: colors.textMuted,
    marginTop: 1,
  },
  cardHeaderRight: {
    marginLeft: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeActive: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
  },
  badgeActiveText: {
    color: '#DC2626',
    fontWeight: '900',
    fontSize: rf(10),
    letterSpacing: 0.5,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#DC2626',
  },
  badgeAck: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  badgeAckText: {
    color: '#B45309',
    fontWeight: '800',
    fontSize: rf(10),
  },
  badgeResolved: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#6EE7B7',
  },
  badgeResolvedText: {
    color: '#047857',
    fontWeight: '800',
    fontSize: rf(10),
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: rf(11),
    color: colors.textSecondary,
    fontWeight: '500',
  },
  locBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.bg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  locDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  locBadgeText: {
    fontSize: rf(10),
    color: colors.textSecondary,
    fontWeight: '600',
  },
  tripVehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.bg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  infoPillText: {
    fontSize: rf(11),
    fontWeight: '600',
    color: colors.textPrimary,
  },
  messageBox: {
    backgroundColor: '#FFF7ED',
    borderLeftWidth: 3,
    borderLeftColor: '#F97316',
    padding: 8,
    borderRadius: 6,
    marginBottom: 10,
  },
  messageText: {
    fontSize: rf(12),
    color: '#9A3412',
    fontWeight: '600',
  },
  tableWrapper: {
    marginVertical: 6,
    backgroundColor: colors.bg,
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  tableHintText: {
    fontSize: rf(10),
    color: colors.textMuted,
    marginBottom: 6,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  tableScrollContent: {
    paddingBottom: 4,
  },
  detailTable: {
    minWidth: 900,
  },
  tableRowHeader: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.04)',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  colHeader: {
    fontSize: rf(11),
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRowData: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  colCell: {
    fontSize: rf(12),
    color: colors.textPrimary,
  },
  resolutionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    padding: 8,
    borderRadius: 8,
    marginTop: 6,
  },
  resolutionText: {
    fontSize: rf(11),
    color: '#065F46',
    fontWeight: '600',
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  btnAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  btnMap: {
    backgroundColor: '#3B82F6',
  },
  btnMapText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: rf(11),
  },
  btnDisabled: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  btnDisabledText: {
    color: colors.textMuted,
    fontSize: rf(11),
    fontWeight: '600',
  },
  btnAck: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  btnAckText: {
    color: '#B45309',
    fontWeight: '700',
    fontSize: rf(11),
  },
  btnResolve: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#6EE7B7',
  },
  btnResolveText: {
    color: '#047857',
    fontWeight: '700',
    fontSize: rf(11),
  },
  btnDetails: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    marginLeft: 'auto',
  },
  btnDetailsText: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: rf(11),
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  modalHeader: {
    backgroundColor: colors.panel,
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  modalTitle: {
    fontSize: rf(17),
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalSub: {
    fontSize: rf(12),
    color: colors.textMuted,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapContainer: {
    flex: 1,
  },
  mapView: {
    flex: 1,
  },
  emergencyMarkerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(239, 68, 68, 0.35)',
  },
  emergencyMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 8,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
  },
  mapInfoCard: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: colors.panel,
    borderRadius: 16,
    padding: 14,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  mapInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  mapInfoLabel: {
    fontSize: rf(12),
    color: colors.textMuted,
    fontWeight: '600',
  },
  mapInfoVal: {
    fontSize: rf(12),
    color: colors.textPrimary,
    fontWeight: '700',
  },
  mapNotice: {
    fontSize: rf(10),
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: 6,
  },
  noCoordsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  noCoordsTitle: {
    fontSize: rf(18),
    fontWeight: '800',
    color: colors.textPrimary,
  },
  noCoordsSub: {
    fontSize: rf(13),
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  dialogCard: {
    backgroundColor: colors.panel,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    gap: 12,
  },
  dialogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dialogTitle: {
    fontSize: rf(16),
    fontWeight: '800',
    color: colors.textPrimary,
  },
  dialogDesc: {
    fontSize: rf(12),
    color: colors.textSecondary,
    lineHeight: 18,
  },
  dialogInput: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 10,
    padding: 10,
    fontSize: rf(13),
    color: colors.textPrimary,
    textAlignVertical: 'top',
    minHeight: 70,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
  },
  dialogCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  dialogCancelText: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: rf(13),
  },
  dialogConfirmBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  dialogConfirmText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: rf(13),
  },
  auditOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  auditSheet: {
    backgroundColor: colors.panel,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.75,
    padding: 20,
  },
  auditHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    paddingBottom: 10,
  },
  auditTitle: {
    fontSize: rf(17),
    fontWeight: '800',
    color: colors.textPrimary,
  },
  auditId: {
    fontSize: rf(11),
    color: colors.textMuted,
    marginTop: 2,
  },
  auditBody: {
    paddingBottom: 20,
  },
  auditRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.03)',
  },
  auditLabel: {
    fontSize: rf(12),
    color: colors.textMuted,
    fontWeight: '600',
  },
  auditValue: {
    fontSize: rf(12),
    color: colors.textPrimary,
    fontWeight: '700',
    maxWidth: '60%',
    textAlign: 'right',
  },
  alertCardPendingSync: {
    borderLeftColor: '#F59E0B',
    borderLeftWidth: 4,
    borderColor: '#FCD34D',
    backgroundColor: '#FFFDF5',
  },
  pendingTrackingIdText: {
    fontSize: rf(10),
    color: colors.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 2,
  },
  badgePendingSync: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  badgePendingSyncText: {
    fontSize: rf(11),
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.5,
  },
  pendingOfflineNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  pendingOfflineNoticeText: {
    flex: 1,
    fontSize: rf(12),
    color: '#92400E',
    fontWeight: '600',
    lineHeight: 16,
  },
  pendingRetryInfoBox: {
    marginTop: 6,
    paddingHorizontal: 4,
  },
  pendingRetryInfoText: {
    fontSize: rf(11),
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  btnSyncNow: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  btnSyncNowText: {
    fontSize: rf(12),
    fontWeight: '700',
    color: '#92400E',
  },
});
