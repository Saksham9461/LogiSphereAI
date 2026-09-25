import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Pressable,
} from 'react-native';
import { Search, AlertTriangle, RefreshCw } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { rf } from '../theme/responsive';
import { colors } from '../theme/colors';
import useAnalyticsStore from '../store/AnalyticsStore';

// --- COMPONENTS ---
const KpiCard = ({ label, value, accent }: { label: string; value: string; accent: string }) => (
  <View style={[styles.kpiCard, { borderLeftColor: accent }]}>
    <Text style={styles.kpiLabel}>{label}</Text>
    <Text style={styles.kpiValue}>{value}</Text>
  </View>
);

const CustomBarChart = ({ data }: { data: { month: string; revenue: number }[] }) => {
  const maxRevenue = useMemo(() => {
    if (!data || data.length === 0) return 1;
    return Math.max(...data.map((m) => m.revenue), 1);
  }, [data]);

  return (
    <View style={styles.chartContainer}>
      <View style={styles.barsArea}>
        {data.map((item, i) => {
          const heightPercent = Math.min(100, Math.max(8, (item.revenue / (maxRevenue * 1.1)) * 100));
          return (
            <View key={item.month || i} style={styles.barWrapper}>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { height: `${heightPercent}%` }]} />
              </View>
              <Text style={styles.barLabel}>{item.month}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

export default function AnalyticsScreen() {
  const {
    kpis,
    monthlyRevenue,
    costliestVehicles,
    fetchAnalytics,
    loading,
    error,
  } = useAnalyticsStore();

  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchAnalytics();
    }, [fetchAnalytics])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
  };

  const filteredVehicles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return costliestVehicles || [];
    return (costliestVehicles || []).filter((v: any) =>
      v.name && v.name.toLowerCase().includes(q)
    );
  }, [costliestVehicles, search]);

  const maxCost = useMemo(() => {
    if (!costliestVehicles || costliestVehicles.length === 0) return 1;
    return Math.max(...costliestVehicles.map((v: any) => v.cost), 1);
  }, [costliestVehicles]);

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
        {/* HEADER */}
        <View style={styles.headerRow}>
          <Text style={styles.pageTitle}>Analytics</Text>
        </View>

        {/* SEARCH */}
        <View style={styles.searchContainer}>
          <Search size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search vehicle..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* ERROR STATE */}
        {error && kpis.length === 0 ? (
          <View style={styles.errorCard}>
            <AlertTriangle size={24} color={colors.rose} />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={() => fetchAnalytics()}>
              <RefreshCw size={14} color={colors.textPrimary} />
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        {/* INITIAL LOADING STATE */}
        {loading && kpis.length === 0 ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={colors.amber} />
            <Text style={styles.loadingText}>Loading analytics reports...</Text>
          </View>
        ) : (
          <>
            {/* KPIs */}
            <View style={styles.kpiGrid}>
              {kpis.map((kpi: any, i: number) => (
                <View key={kpi.label || i} style={styles.kpiCol}>
                  <KpiCard label={kpi.label} value={kpi.value} accent={kpi.accent} />
                </View>
              ))}
            </View>
            <Text style={styles.roiNote}>
              ROI = (Revenue - (Maintenance + Fuel)) / Acquisition Cost
            </Text>

            {/* CHARTS & LISTS */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>Monthly Revenue (Lakhs)</Text>
              <CustomBarChart data={monthlyRevenue} />
            </View>

            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>Top Costliest Vehicles</Text>
              <View style={styles.costList}>
                {filteredVehicles.length === 0 ? (
                  <Text style={styles.emptyText}>
                    {search ? `No vehicles match "${search}".` : 'No vehicle cost metrics recorded yet.'}
                  </Text>
                ) : null}
                {filteredVehicles.map((v: any) => {
                  const widthPercent = Math.min(100, Math.max(5, (v.cost / maxCost) * 100));
                  return (
                    <View key={v.name} style={styles.costItem}>
                      <View style={styles.costItemHeader}>
                        <Text style={styles.costItemName}>{v.name}</Text>
                        <Text style={styles.costItemValue}>₹{v.cost.toLocaleString('en-IN')}</Text>
                      </View>
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${widthPercent}%`, backgroundColor: v.color }]} />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingBottom: rf(50) },
  container: { paddingHorizontal: rf(16), paddingTop: rf(24), paddingBottom: rf(40), flexGrow: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: rf(20) },
  pageTitle: { color: colors.textPrimary, fontSize: rf(28), fontWeight: '800', letterSpacing: -1 },

  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: rf(12), paddingHorizontal: rf(16), height: rf(52), marginBottom: rf(24), gap: rf(10) },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: rf(15), height: '100%' },

  loadingState: { padding: rf(40), alignItems: 'center', justifyContent: 'center', gap: rf(12) },
  loadingText: { color: colors.textMuted, fontSize: rf(14) },
  errorCard: { backgroundColor: 'rgba(251,113,133,0.1)', borderWidth: 1, borderColor: colors.rose, borderRadius: rf(12), padding: rf(16), alignItems: 'center', gap: rf(8), marginBottom: rf(16) },
  errorText: { color: colors.rose, fontSize: rf(14), textAlign: 'center' },
  retryButton: { flexDirection: 'row', alignItems: 'center', gap: rf(6), backgroundColor: colors.panel, paddingHorizontal: rf(12), paddingVertical: rf(6), borderRadius: rf(6), borderWidth: 1, borderColor: colors.border },
  retryButtonText: { color: colors.textPrimary, fontSize: rf(13), fontWeight: '600' },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: rf(12) },
  kpiCol: { width: '48%' }, // Fits 2 per row
  kpiCard: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 4, borderRadius: rf(12), padding: rf(16) },
  kpiLabel: { color: colors.textMuted, fontSize: rf(11), textTransform: 'uppercase', fontWeight: '700' },
  kpiValue: { color: colors.textPrimary, fontSize: rf(24), fontWeight: '800', marginTop: rf(8), letterSpacing: -0.5 },
  roiNote: { color: colors.textMuted, fontSize: rf(12), marginTop: rf(12), marginBottom: rf(32), fontStyle: 'italic' },

  sectionBlock: { marginBottom: rf(32) },
  sectionTitle: { color: colors.textPrimary, fontSize: rf(14), fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: rf(16) },

  chartContainer: { height: rf(200), backgroundColor: colors.panel, borderRadius: rf(16), borderWidth: 1, borderColor: colors.borderSoft, paddingHorizontal: rf(16), paddingVertical: rf(20) },
  barsArea: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderBottomWidth: 1, borderBottomColor: colors.borderSoft, paddingBottom: rf(4) },
  barWrapper: { alignItems: 'center', flex: 1 },
  barTrack: { flex: 1, width: rf(24), justifyContent: 'flex-end', alignItems: 'center' },
  barFill: { width: '100%', backgroundColor: colors.blue, borderTopLeftRadius: rf(6), borderTopRightRadius: rf(6) },
  barLabel: { color: colors.textMuted, fontSize: rf(11), marginTop: rf(8) },

  costList: { backgroundColor: colors.panel, borderRadius: rf(16), borderWidth: 1, borderColor: colors.borderSoft, padding: rf(16), gap: rf(20) },
  costItem: { width: '100%' },
  costItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: rf(8) },
  costItemName: { color: colors.textPrimary, fontSize: rf(15), fontWeight: '700' },
  costItemValue: { color: colors.textSecondary, fontSize: rf(13), fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: '600' },
  progressTrack: { height: rf(12), backgroundColor: colors.surface, borderRadius: rf(6), overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: rf(6) },
  emptyText: { color: colors.textMuted, fontSize: rf(14), textAlign: 'center' },
});
