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
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import {
  Search,
  FileDown,
  ChevronDown,
  ChevronUp,
  Clock,
  User,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  MapPin,
  Calendar,
  Layers,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react-native';
import { rf } from '../theme/responsive';
import { colors } from '../theme/colors';
import {
  useAttendanceStore,
  GroupedAttendanceReportItem,
  AttendanceSessionReportItem,
} from '../store/AttendanceStore';
import useAuthStore from '../store/AuthStore';

// --- STATUS & DATE CONFIGURATION ---
const STATUS_TABS = [
  { key: 'ALL', label: 'All Records' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'IN_PROGRESS', label: 'Active Shifts' },
  { key: 'AUTO_CLOSED', label: 'Auto Closed' },
];

const DATE_PRESETS = [
  { id: 'ALL', label: 'All Dates' },
  { id: 'TODAY', label: 'Today' },
  { id: '7DAYS', label: 'Last 7 Days' },
  { id: '30DAYS', label: 'Last 30 Days' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  COMPLETED: {
    label: 'Completed',
    color: colors.green,
    bg: 'rgba(74,222,128,0.16)',
    border: 'rgba(74,222,128,0.45)',
  },
  IN_PROGRESS: {
    label: 'Active Shift',
    color: colors.blue,
    bg: 'rgba(56,189,248,0.16)',
    border: 'rgba(56,189,248,0.45)',
  },
  AUTO_CLOSED: {
    label: 'Auto Closed',
    color: colors.amber,
    bg: 'rgba(245,158,11,0.16)',
    border: 'rgba(245,158,11,0.45)',
  },
};

export default function AttendanceReportScreen({ navigation }: any) {
  const user = useAuthStore((state) => state.user);
  const {
    reportItems,
    reportMetrics,
    reportLoading,
    reportExporting,
    reportError,
    expandedRowIds,
    isManager,
    reportFilters,
    fetchReport,
    setReportFilters,
    resetReportFilters,
    toggleRowExpansion,
    expandAllRows,
    collapseAllRows,
    exportPdf,
  } = useAttendanceStore();

  const [search, setSearch] = useState(reportFilters.search || '');
  const [activeTab, setActiveTab] = useState<'ALL' | 'COMPLETED' | 'IN_PROGRESS' | 'AUTO_CLOSED'>(
    (reportFilters.status as any) || 'ALL'
  );
  const [selectedDatePreset, setSelectedDatePreset] = useState('ALL');

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      if (search !== (reportFilters.search || '')) {
        setReportFilters({ search });
        fetchReport({ search, page: 1 });
      }
    }, 350);

    return () => clearTimeout(handler);
  }, [search]);

  // Initial load
  useEffect(() => {
    fetchReport();
  }, []);

  const handleStatusSelect = (statusKey: string) => {
    setActiveTab(statusKey as any);
    setReportFilters({ status: statusKey });
    fetchReport({ status: statusKey, page: 1 });
  };

  const handleDatePresetSelect = (presetId: string) => {
    setSelectedDatePreset(presetId);
    let startDate = '';
    let endDate = '';
    const now = new Date();

    if (presetId === 'TODAY') {
      startDate = now.toISOString().split('T')[0];
      endDate = startDate;
    } else if (presetId === '7DAYS') {
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      startDate = past.toISOString().split('T')[0];
      endDate = now.toISOString().split('T')[0];
    } else if (presetId === '30DAYS') {
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      startDate = past.toISOString().split('T')[0];
      endDate = now.toISOString().split('T')[0];
    }

    setReportFilters({ startDate, endDate });
    fetchReport({ startDate, endDate, page: 1 });
  };

  const handleResetFilters = () => {
    setSearch('');
    setActiveTab('ALL');
    setSelectedDatePreset('ALL');
    resetReportFilters();
  };

  const allExpanded = useMemo(() => {
    if (reportItems.length === 0) return false;
    return reportItems.every((item) => expandedRowIds[item.id]);
  }, [reportItems, expandedRowIds]);

  const handleToggleAll = () => {
    if (allExpanded) {
      collapseAllRows();
    } else {
      expandAllRows();
    }
  };

  const handleExportPdf = async () => {
    const result = await exportPdf();
    if (result.success) {
      Alert.alert(
        'Report Download',
        result.message || 'Your PDF report is downloading to your device.',
        [{ text: 'OK' }]
      );
    }
  };

  const renderSessionItem = (session: AttendanceSessionReportItem) => {
    const isAuto = session.autoClockOut || session.clockOutType === 'AUTOMATIC';
    const isOngoing = !session.clockOutTime;

    return (
      <View key={session.id} style={styles.sessionCard}>
        <View style={styles.sessionHeaderRow}>
          <View style={styles.sessionBadge}>
            <Text style={styles.sessionBadgeText}>Session {session.sessionNumber}</Text>
          </View>
          <View
            style={[
              styles.typePill,
              isAuto
                ? styles.typePillAuto
                : isOngoing
                ? styles.typePillOngoing
                : styles.typePillManual,
            ]}>
            <Text
              style={[
                styles.typePillText,
                isAuto
                  ? styles.typePillTextAuto
                  : isOngoing
                  ? styles.typePillTextOngoing
                  : styles.typePillTextManual,
              ]}>
              {isAuto ? 'Auto Clock-Out (11:59 PM)' : isOngoing ? 'Active Shift' : 'Manual Clock-Out'}
            </Text>
          </View>
        </View>

        <View style={styles.sessionTimeGrid}>
          <View style={styles.timeBox}>
            <Text style={styles.timeLabel}>Clock In</Text>
            <Text style={styles.timeValue}>{session.clockInTime}</Text>
          </View>
          <View style={styles.timeDivider}>
            <Clock color={colors.textMuted} size={14} />
          </View>
          <View style={styles.timeBox}>
            <Text style={styles.timeLabel}>Clock Out</Text>
            <Text style={[styles.timeValue, isOngoing && styles.timeOngoing]}>
              {session.clockOutTime || 'Active'}
            </Text>
          </View>
          <View style={styles.timeBoxRight}>
            <Text style={styles.timeLabel}>Duration</Text>
            <Text style={styles.timeDuration}>{session.duration}</Text>
          </View>
        </View>

        <View style={styles.sessionFooterRow}>
          <View style={styles.locationRow}>
            <MapPin color={colors.textMuted} size={12} />
            <Text style={styles.locationText} numberOfLines={1}>
              {session.locationName}
            </Text>
          </View>
          {session.distanceFromOffice !== undefined && (
            <Text style={styles.distanceText}>{session.distanceFromOffice}m from office</Text>
          )}
        </View>
      </View>
    );
  };

  const renderAttendanceCard = (item: GroupedAttendanceReportItem) => {
    const isExpanded = Boolean(expandedRowIds[item.id]);
    const s = STATUS_CONFIG[item.status] || STATUS_CONFIG.COMPLETED;

    return (
      <View key={item.id} style={styles.tripCard}>
        {/* CARD HEADER */}
        <Pressable
          style={styles.tripCardHeader}
          onPress={() => toggleRowExpansion(item.id)}
          android_ripple={{ color: 'rgba(0,0,0,0.03)' }}>
          <View style={{ flex: 1, paddingRight: rf(8) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: rf(6) }}>
              <Text style={styles.tripIDText} numberOfLines={1}>
                {item.staffName}
              </Text>
              {item.staffRole ? (
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>{item.staffRole}</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.tripAssignText} numberOfLines={1}>
              {item.staffEmail}
            </Text>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: s.bg, borderColor: s.border }]}>
            <Text style={[styles.statusText, { color: s.color }]}>{s.label}</Text>
          </View>
        </Pressable>

        {/* SUMMARY / METRICS BAR */}
        <Pressable
          style={styles.tripCardBody}
          onPress={() => toggleRowExpansion(item.id)}>
          <View style={styles.routeBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: rf(6), flex: 1 }}>
              <Calendar size={16} color={colors.amber} />
              <Text style={styles.routeLocation}>{item.date}</Text>
            </View>
            <Text style={styles.routeArrow}>•</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: rf(6) }}>
              <Clock size={16} color={colors.green} />
              <Text style={styles.durationHighlight}>{item.totalWorkedDuration}</Text>
            </View>
          </View>

          <View style={styles.tripMetaRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: rf(4) }}>
              <Layers size={14} color={colors.textMuted} />
              <Text style={styles.tripMetaText}>
                {item.sessionsCount} {item.sessionsCount === 1 ? 'Session' : 'Sessions'}
              </Text>
            </View>
            {item.hasAutoClockOut && (
              <View style={styles.autoTag}>
                <Text style={styles.autoTagText}>Auto Clock-Out (11:59 PM)</Text>
              </View>
            )}
            <View style={{ marginLeft: 'auto' }}>
              {isExpanded ? (
                <ChevronUp color={colors.amber} size={20} />
              ) : (
                <ChevronDown color={colors.textSecondary} size={20} />
              )}
            </View>
          </View>
        </Pressable>

        {/* EXPANDED SESSIONS */}
        {isExpanded && (
          <View style={styles.expandedContainer}>
            <View style={styles.expandedHeader}>
              <Text style={styles.expandedTitle}>
                Chronological Sessions ({item.sessions.length})
              </Text>
              <Text style={styles.expandedSub}>Total: {item.totalWorkedDuration}</Text>
            </View>
            {item.sessions.map((sess) => renderSessionItem(sess))}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={reportLoading}
            onRefresh={() => fetchReport()}
            colors={[colors.amber]}
            tintColor={colors.amber}
          />
        }>
        {/* HEADER (matching TripDispatcherScreen) */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle}>
              {isManager ? 'Attendance Board' : 'My Attendance'}
            </Text>
            <Text style={styles.pageSubtitle}>
              {isManager
                ? 'Manage fleet attendance & verified shifts'
                : `Logged in as ${user?.name || 'Staff'}`}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: rf(8) }}>
            {/* EXPORT PDF BUTTON */}
            <Pressable
              style={[styles.addButton, reportExporting && styles.addButtonDisabled]}
              onPress={handleExportPdf}
              disabled={reportExporting}>
              {reportExporting ? (
                <ActivityIndicator color="#1a1200" size="small" />
              ) : (
                <>
                  <FileDown size={16} color="#1a1200" strokeWidth={2.5} />
                  <Text style={styles.addButtonText}>Export PDF</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>

        {/* KPI METRIC TILES */}
        {reportMetrics && (
          <View style={styles.kpiGrid}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiValue}>
                {isManager ? reportMetrics.totalStaff : reportMetrics.totalDays}
              </Text>
              <Text style={styles.kpiLabel}>{isManager ? 'Staff Logged' : 'Days Logged'}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={[styles.kpiValue, { color: colors.amber }]}>
                {reportMetrics.totalWorkedHours}h
              </Text>
              <Text style={styles.kpiLabel}>Total Hours</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiValue}>{reportMetrics.totalSessions}</Text>
              <Text style={styles.kpiLabel}>Sessions</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text
                style={[
                  styles.kpiValue,
                  { color: reportMetrics.totalAutoClosed > 0 ? colors.rose : colors.success },
                ]}>
                {reportMetrics.totalAutoClosed}
              </Text>
              <Text style={styles.kpiLabel}>Auto Closed</Text>
            </View>
          </View>
        )}

        {/* SEARCH (matching TripDispatcherScreen) */}
        <View style={styles.searchContainer}>
          <Search size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search staff name, email, date..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Text style={styles.clearText}>Clear</Text>
            </Pressable>
          )}
        </View>

        {/* MODERN SEGMENTED TAB BAR (STATUS) */}
        <View style={styles.segmentedContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.segmentedContent}>
            {STATUS_TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  style={[styles.segmentedTab, isActive && styles.segmentedTabActive]}
                  onPress={() => handleStatusSelect(tab.key)}>
                  <Text style={[styles.segmentedTabText, isActive && styles.segmentedTabTextActive]}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* SECONDARY SEGMENTED TAB BAR (DATE PRESETS) */}
        <View style={styles.dateSegmentedContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateSegmentedContent}>
            {DATE_PRESETS.map((dp) => {
              const isActive = selectedDatePreset === dp.id;
              return (
                <Pressable
                  key={dp.id}
                  style={[styles.dateTab, isActive && styles.dateTabActive]}
                  onPress={() => handleDatePresetSelect(dp.id)}>
                  <Text style={[styles.dateTabText, isActive && styles.dateTabTextActive]}>
                    {dp.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* LIST CONTROLS ROW */}
        <View style={styles.controlRow}>
          <Text style={styles.countText}>Showing {reportItems.length} records</Text>
          <View style={styles.controlBtns}>
            <Pressable style={styles.toggleBtn} onPress={handleToggleAll}>
              <Text style={styles.toggleBtnText}>
                {allExpanded ? 'Collapse All' : 'Expand All'}
              </Text>
            </Pressable>
            {(search || activeTab !== 'ALL' || selectedDatePreset !== 'ALL') && (
              <Pressable style={styles.resetBtn} onPress={handleResetFilters}>
                <RotateCcw size={12} color={colors.textMuted} />
                <Text style={styles.resetBtnText}>Reset</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* ATTENDANCE RECORDS LIST */}
        <View style={styles.listContainer}>
          {reportLoading && reportItems.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.amber} />
              <Text style={styles.loadingText}>Loading attendance board...</Text>
            </View>
          ) : reportError ? (
            <View style={styles.emptyContainer}>
              <AlertTriangle color={colors.error} size={36} />
              <Text style={styles.emptyTitle}>Unable to Load Report</Text>
              <Text style={styles.emptySubtitle}>{reportError}</Text>
              <Pressable style={styles.retryBtn} onPress={() => fetchReport()}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </Pressable>
            </View>
          ) : reportItems.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Clock color={colors.textMuted} size={40} />
              <Text style={styles.emptyTitle}>No Attendance Records Found</Text>
              <Text style={styles.emptySubtitle}>
                No verified records match the current filter or search criteria.
              </Text>
              <Pressable style={styles.retryBtn} onPress={handleResetFilters}>
                <Text style={styles.retryBtnText}>Clear Filters</Text>
              </Pressable>
            </View>
          ) : (
            reportItems.map((item) => renderAttendanceCard(item))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    paddingHorizontal: rf(16),
    paddingVertical: rf(20),
    paddingBottom: rf(120),
    flexGrow: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: rf(16),
  },
  pageTitle: {
    color: colors.textPrimary,
    fontSize: rf(24),
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    color: colors.textMuted,
    fontSize: rf(13),
    marginTop: rf(2),
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.amber,
    paddingHorizontal: rf(14),
    paddingVertical: rf(8),
    borderRadius: rf(8),
    gap: rf(6),
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    color: '#1a1200',
    fontSize: rf(14),
    fontWeight: '700',
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: rf(8),
    marginBottom: rf(16),
  },
  kpiCard: {
    flex: 1,
    backgroundColor: colors.panel,
    borderRadius: rf(12),
    padding: rf(10),
    alignItems: 'center',
    justifyContent:'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  kpiValue: {
    fontSize: rf(16),
    fontWeight: '800',
    color: colors.textPrimary,
  },
  kpiLabel: {
    fontSize: rf(11),
    color: colors.textMuted,
    marginTop: rf(2),
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: rf(12),
    paddingHorizontal: rf(16),
    height: rf(48),
    marginBottom: rf(14),
    gap: rf(10),
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: rf(14),
    height: '100%',
  },
  clearText: {
    color: colors.textMuted,
    fontSize: rf(12),
    fontWeight: '600',
  },
  segmentedContainer: {
    marginBottom: rf(10),
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
  dateSegmentedContainer: {
    marginBottom: rf(14),
    height: rf(38),
  },
  dateSegmentedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rf(6),
    backgroundColor: 'transparent',
    paddingVertical: rf(2),
  },
  dateTab: {
    paddingHorizontal: rf(14),
    height: rf(30),
    borderRadius: rf(16),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  dateTabActive: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.amber,
  },
  dateTabText: {
    color: colors.textSecondary,
    fontSize: rf(12),
    fontWeight: '600',
  },
  dateTabTextActive: {
    color: colors.amber,
    fontWeight: '700',
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: rf(12),
  },
  countText: {
    fontSize: rf(13),
    fontWeight: '600',
    color: colors.textSecondary,
  },
  controlBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rf(8),
  },
  toggleBtn: {
    paddingHorizontal: rf(10),
    paddingVertical: rf(4),
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderRadius: rf(6),
  },
  toggleBtnText: {
    fontSize: rf(12),
    color: colors.amber,
    fontWeight: '700',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rf(4),
    paddingHorizontal: rf(8),
    paddingVertical: rf(4),
    backgroundColor: colors.surfaceRaised,
    borderRadius: rf(6),
  },
  resetBtnText: {
    fontSize: rf(12),
    color: colors.textMuted,
  },
  listContainer: {
    gap: rf(12),
  },
  tripCard: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: rf(16),
    padding: rf(16),
    overflow: 'hidden',
  },
  tripCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: rf(12),
  },
  tripIDText: {
    color: colors.textPrimary,
    fontSize: rf(15),
    fontWeight: '800',
  },
  roleBadge: {
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: rf(6),
    paddingVertical: rf(2),
    borderRadius: rf(4),
  },
  roleBadgeText: {
    fontSize: rf(10),
    fontWeight: '700',
    color: colors.textSecondary,
  },
  tripAssignText: {
    color: colors.textMuted,
    fontSize: rf(12),
    marginTop: rf(2),
  },
  statusBadge: {
    paddingHorizontal: rf(10),
    paddingVertical: rf(4),
    borderRadius: rf(20),
    borderWidth: 1,
  },
  statusText: {
    fontSize: rf(11),
    fontWeight: '700',
  },
  tripCardBody: {
    marginBottom: rf(4),
  },
  routeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: rf(10),
    padding: rf(10),
    gap: rf(8),
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  routeLocation: {
    color: colors.textPrimary,
    fontSize: rf(13),
    fontWeight: '600',
  },
  routeArrow: {
    color: colors.textMuted,
    fontSize: rf(14),
    fontWeight: '700',
  },
  durationHighlight: {
    color: colors.textPrimary,
    fontSize: rf(13),
    fontWeight: '800',
  },
  tripMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rf(12),
    marginTop: rf(10),
  },
  tripMetaText: {
    color: colors.textMuted,
    fontSize: rf(12),
  },
  autoTag: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: rf(6),
    paddingVertical: rf(2),
    borderRadius: rf(4),
  },
  autoTagText: {
    fontSize: rf(10),
    fontWeight: '700',
    color: colors.amber,
  },
  expandedContainer: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    padding: rf(12),
    borderRadius: rf(10),
    marginTop: rf(12),
  },
  expandedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: rf(10),
  },
  expandedTitle: {
    fontSize: rf(11),
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  expandedSub: {
    fontSize: rf(11),
    color: colors.textMuted,
  },
  sessionCard: {
    backgroundColor: colors.panel,
    borderRadius: rf(10),
    padding: rf(10),
    marginBottom: rf(8),
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  sessionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: rf(8),
  },
  sessionBadge: {
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: rf(6),
    paddingVertical: rf(2),
    borderRadius: rf(4),
  },
  sessionBadgeText: {
    fontSize: rf(11),
    fontWeight: '600',
    color: colors.textPrimary,
  },
  typePill: {
    paddingHorizontal: rf(6),
    paddingVertical: rf(2),
    borderRadius: rf(4),
  },
  typePillManual: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  typePillAuto: {
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
  },
  typePillOngoing: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
  },
  typePillText: {
    fontSize: rf(10),
    fontWeight: '700',
  },
  typePillTextManual: {
    color: colors.success,
  },
  typePillTextAuto: {
    color: colors.amber,
  },
  typePillTextOngoing: {
    color: colors.blue,
  },
  sessionTimeGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: rf(8),
  },
  timeBox: {
    flex: 1,
  },
  timeBoxRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  timeDivider: {
    marginHorizontal: rf(8),
  },
  timeLabel: {
    fontSize: rf(10),
    color: colors.textMuted,
    marginBottom: rf(2),
  },
  timeValue: {
    fontSize: rf(13),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  timeOngoing: {
    color: colors.blue,
  },
  timeDuration: {
    fontSize: rf(13),
    fontWeight: '700',
    color: colors.amber,
  },
  sessionFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    paddingTop: rf(6),
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rf(4),
    flex: 1,
    marginRight: rf(8),
  },
  locationText: {
    fontSize: rf(11),
    color: colors.textMuted,
  },
  distanceText: {
    fontSize: rf(10),
    color: colors.textMuted,
  },
  loadingContainer: {
    padding: rf(40),
    alignItems: 'center',
    gap: rf(10),
  },
  loadingText: {
    fontSize: rf(13),
    color: colors.textMuted,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: rf(40),
    paddingHorizontal: rf(20),
    gap: rf(10),
  },
  emptyTitle: {
    fontSize: rf(16),
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: rf(13),
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: rf(18),
  },
  retryBtn: {
    marginTop: rf(8),
    backgroundColor: colors.amber,
    paddingHorizontal: rf(16),
    paddingVertical: rf(8),
    borderRadius: rf(8),
  },
  retryBtnText: {
    color: '#1a1200',
    fontWeight: '700',
    fontSize: rf(13),
  },
});
