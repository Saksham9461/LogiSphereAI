import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  Pressable,
  Modal,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Search,
  Plus,
  X,
  ChevronDown,
  Wrench,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Calendar,
  ShieldAlert,
  Info,
  Layers,
} from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { rf } from '../theme/responsive';
import { colors } from '../theme/colors';
import useMaintenanceStore from '../store/MaintenanceStore';
import useVehicleStore from '../store/VehicleStore';
import client from '../api/axiosClient';
import { GetMaintenanceForecast } from '../api/apiPath';

export interface MaintenanceForecastData {
  forecastMonth: string;
  forecastBudget: number;
  currency: string;
  forecastRange: {
    min: number;
    max: number;
  };
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  historicalMonthly: {
    month: string;
    actualCost: number;
    serviceCount: number;
  }[];
  vehicleProjections: {
    vehicleID: string;
    vehicleName?: string;
    name?: string;
    registrationNumber: string;
    projectedNextMonthCost?: number;
    estimatedNextMonthCost?: number;
    riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
    totalHistoricalCost: number;
    recent90DaysCost?: number;
    recentCost90Days?: number;
    recent90DaysVisits?: number;
    recentVisitCount90Days?: number;
    evidenceReasons?: string[];
    suggestedAction?: string;
  }[];
  aiExplanation: {
    source: string;
    summary?: string;
    executiveSummary?: string;
    costDrivers?: string[];
    actionableSuggestions?: string[];
    budgetRecommendations?: string[];
    riskSummary?: string;
  };
  dataQualityIndicator: string;
}

// --- CONSTANTS ---
const STATUS_STYLES: Record<string, any> = {
  Active: {
    label: 'In Shop',
    bg: 'rgba(255,176,32,0.16)',
    text: colors.amber,
    border: 'rgba(255,176,32,0.45)',
  },
  Completed: {
    label: 'Completed',
    bg: 'rgba(74,222,128,0.16)',
    text: colors.green,
    border: 'rgba(74,222,128,0.45)',
  },
};

const STATUS_OPTIONS = ['Active', 'Completed'];

const inr = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`;

export default function MaintenanceScreen() {
  const {
    maintenanceRecords,
    fetchMaintenance,
    createMaintenance,
    completeMaintenance,
    loading,
    error,
  } = useMaintenanceStore();

  const { vehicles, getVehicles } = useVehicleStore();

  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  // Form State
  const [formVehicleID, setFormVehicleID] = useState('');
  const [formVehicleName, setFormVehicleName] = useState('');
  const [formService, setFormService] = useState('');
  const [formCost, setFormCost] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formStatus, setFormStatus] = useState('Active');

  // AI Maintenance Cost Forecast State
  const [activeTab, setActiveTab] = useState<'RECORDS' | 'FORECAST'>('RECORDS');
  const [forecastData, setForecastData] = useState<MaintenanceForecastData | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState<string | null>(null);

  const fetchForecast = useCallback(async () => {
    try {
      setForecastLoading(true);
      setForecastError(null);
      const res = await client.get(GetMaintenanceForecast);
      if (res?.data?.success && res.data.data) {
        setForecastData(res.data.data);
      } else {
        setForecastError(res?.data?.message || 'Failed to generate maintenance forecast.');
      }
    } catch (err: any) {
      setForecastError(err?.response?.data?.message || err?.message || 'Could not load forecast.');
    } finally {
      setForecastLoading(false);
    }
  }, []);

  // Load records on screen focus
  useFocusEffect(
    useCallback(() => {
      fetchMaintenance();
      getVehicles();
    }, [fetchMaintenance, getVehicles])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    if (activeTab === 'FORECAST') {
      await Promise.all([fetchForecast(), getVehicles()]);
    } else {
      await Promise.all([fetchMaintenance(), getVehicles()]);
    }
    setRefreshing(false);
  };

  // Process available vehicles from VehicleStore
  const availableVehicles = useMemo(() => {
    if (!vehicles || !Array.isArray(vehicles) || vehicles.length === 0) return [];
    return vehicles.map((v: any) => ({
      vehicleID: String(v.vehicleID || v.id || ''),
      name: String(v.name || v.registrationNumber || v.vehicleID || 'Vehicle'),
      registrationNumber: String(v.registrationNumber || ''),
    }));
  }, [vehicles]);

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return maintenanceRecords || [];
    return (maintenanceRecords || []).filter((l: any) =>
      [l.vehicle, l.service, l.serviceType, l.status, l.vehicleID].some(
        (f) => f && String(f).toLowerCase().includes(q)
      )
    );
  }, [maintenanceRecords, search]);

  const canSave = Boolean(
    (formVehicleID || availableVehicles.length > 0) &&
    formService.trim() &&
    formCost.trim() !== '' &&
    !isNaN(Number(formCost)) &&
    Number(formCost) >= 0 &&
    formDate.trim()
  );

  const resetForm = () => {
    const defaultVeh = availableVehicles[0];
    setFormVehicleID(defaultVeh?.vehicleID || '');
    setFormVehicleName(defaultVeh?.name || '');
    setFormService('');
    setFormCost('');
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormStatus('Active');
  };

  const handleOpenAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleSave = async () => {
    const targetVehicleID = formVehicleID || availableVehicles[0]?.vehicleID;
    if (!targetVehicleID) {
      Alert.alert('Validation Error', 'Please select a vehicle.');
      return;
    }
    if (!formService.trim()) {
      Alert.alert('Validation Error', 'Service Type is required.');
      return;
    }
    const costNum = Number(formCost);
    if (isNaN(costNum) || costNum < 0) {
      Alert.alert('Validation Error', 'Cost must be a valid positive number.');
      return;
    }
    if (!formDate.trim()) {
      Alert.alert('Validation Error', 'Date is required.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        vehicleID: targetVehicleID,
        serviceType: formService.trim(),
        cost: costNum,
        date: formDate.trim(),
        status: formStatus === 'Active' ? ('ACTIVE' as const) : ('COMPLETED' as const),
      };

      const result = await createMaintenance(payload);
      setSaving(false);

      if (result.success) {
        setShowAddModal(false);
        resetForm();
        fetchMaintenance();
      } else {
        Alert.alert('Error', result.message || 'Failed to save maintenance record.');
      }
    } catch (err: any) {
      setSaving(false);
      Alert.alert('Error', err?.message || 'Failed to save maintenance record.');
    }
  };

  const handleCompleteMaintenance = (item: any) => {
    Alert.alert(
      'Complete Service',
      `Mark maintenance for "${item.vehicle}" as completed? This vehicle will now become available for trips.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Complete',
          onPress: async () => {
            try {
              setCompletingId(item.id);
              const result = await completeMaintenance(item.id);
              if (result?.success) {
                await Promise.all([fetchMaintenance(), getVehicles()]);
                Alert.alert('Success', `Maintenance completed! ${item.vehicle} is now available for trips.`);
              } else {
                Alert.alert('Error', result?.message || 'Failed to complete maintenance.');
              }
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to complete maintenance.');
            } finally {
              setCompletingId(null);
            }
          },
        },
      ]
    );
  };

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
          <Text style={styles.pageTitle}>Maintenance</Text>
          <Pressable style={styles.addButton} onPress={handleOpenAddModal}>
            <Plus size={16} color="#1a1200" strokeWidth={2.5} />
            <Text style={styles.addButtonText}>Log Service</Text>
          </Pressable>
        </View>

        {/* SEGMENTED TAB SWITCHER */}
        <View style={styles.segmentContainer}>
          <Pressable
            style={[styles.segmentBtn, activeTab === 'RECORDS' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('RECORDS')}
          >
            <Wrench size={14} color={activeTab === 'RECORDS' ? '#1a1200' : colors.textSecondary} />
            <Text style={[styles.segmentBtnText, activeTab === 'RECORDS' && styles.segmentBtnTextActive]}>
              Service Log ({maintenanceRecords?.length || 0})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.segmentBtn, activeTab === 'FORECAST' && styles.segmentBtnActive]}
            onPress={() => {
              setActiveTab('FORECAST');
              if (!forecastData && !forecastLoading) {
                fetchForecast();
              }
            }}
          >
            <Sparkles size={14} color={activeTab === 'FORECAST' ? '#1a1200' : colors.amber} />
            <Text style={[styles.segmentBtnText, activeTab === 'FORECAST' && styles.segmentBtnTextActive]}>
              AI Cost Forecast
            </Text>
          </Pressable>
        </View>

        {activeTab === 'FORECAST' ? (
          <View style={styles.forecastContainer}>
            {forecastLoading && !refreshing ? (
              <View style={styles.loadingState}>
                <ActivityIndicator size="large" color={colors.amber} />
                <Text style={styles.loadingText}>Synthesizing historical records & forecasting next month...</Text>
              </View>
            ) : forecastError ? (
              <View style={styles.errorCard}>
                <AlertTriangle size={24} color={colors.rose} />
                <Text style={styles.errorText}>{forecastError}</Text>
                <Pressable style={styles.retryButton} onPress={fetchForecast}>
                  <RefreshCw size={14} color={colors.textPrimary} />
                  <Text style={styles.retryButtonText}>Retry Forecast</Text>
                </Pressable>
              </View>
            ) : forecastData ? (
              <>
                {/* 1. HERO FORECAST BUDGET CARD */}
                <View style={styles.forecastHeroCard}>
                  <View style={styles.forecastHeroTop}>
                    <View style={styles.forecastHeroIconWrap}>
                      <Calendar size={18} color={colors.amber} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.forecastHeroLabel}>Next Month Budget Forecast</Text>
                      <Text style={styles.forecastHeroMonth}>{forecastData.forecastMonth}</Text>
                    </View>
                    <View
                      style={[
                        styles.confidenceBadge,
                        {
                          backgroundColor:
                            forecastData.confidence === 'HIGH'
                              ? 'rgba(34,197,94,0.15)'
                              : 'rgba(245,158,11,0.15)',
                          borderColor:
                            forecastData.confidence === 'HIGH'
                              ? 'rgba(34,197,94,0.4)'
                              : 'rgba(245,158,11,0.4)',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.confidenceBadgeText,
                          {
                            color:
                              forecastData.confidence === 'HIGH'
                                ? colors.green
                                : colors.amber,
                          },
                        ]}
                      >
                        {forecastData.confidence} CONFIDENCE
                      </Text>
                    </View>
                  </View>

                  <View style={styles.heroAmountRow}>
                    <Text style={styles.heroAmount}>
                      ₹{Number(forecastData.forecastBudget).toLocaleString('en-IN')}
                    </Text>
                    <View style={styles.rangePill}>
                      <Text style={styles.rangePillText}>
                        Range: ₹{Number(forecastData.forecastRange.min).toLocaleString('en-IN')} – ₹{Number(forecastData.forecastRange.max).toLocaleString('en-IN')}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.heroSubtext}>
                    Authoritative baseline computed using exponential decay weighting across actual completed maintenance and expense records.
                  </Text>
                </View>

                {/* 2. HISTORICAL MONTHLY EXPENDITURE TREND */}
                <View style={styles.forecastSectionCard}>
                  <View style={styles.sectionCardHeader}>
                    <TrendingUp size={16} color={colors.blue} />
                    <Text style={styles.sectionCardTitle}>Monthly Spending Actuals</Text>
                  </View>

                  {forecastData.historicalMonthly.length > 0 ? (
                    <View style={styles.monthlyBarsList}>
                      {(() => {
                        const maxCost = Math.max(
                          1,
                          ...forecastData.historicalMonthly.map((m) => m.actualCost)
                        );
                        return forecastData.historicalMonthly.map((m) => {
                          const pct = Math.min(
                            100,
                            Math.max(4, Math.round((m.actualCost / maxCost) * 100))
                          );
                          return (
                            <View key={m.month} style={styles.monthBarRow}>
                              <View style={styles.monthBarLabelCol}>
                                <Text style={styles.monthBarMonth}>{m.month}</Text>
                                <Text style={styles.monthBarVisits}>
                                  {m.serviceCount} service{m.serviceCount === 1 ? '' : 's'}
                                </Text>
                              </View>

                              <View style={styles.monthBarProgressWrap}>
                                <View style={styles.monthBarBg}>
                                  <View style={[styles.monthBarFill, { width: `${pct}%` }]} />
                                </View>
                              </View>

                              <Text style={styles.monthBarAmount}>
                                ₹{Number(m.actualCost).toLocaleString('en-IN')}
                              </Text>
                            </View>
                          );
                        });
                      })()}
                    </View>
                  ) : (
                    <Text style={styles.emptyNoticeText}>No historical maintenance records found.</Text>
                  )}
                </View>

                {/* 3. VEHICLE MAINTENANCE RISK RANKING */}
                <View style={styles.forecastSectionCard}>
                  <View style={styles.sectionCardHeader}>
                    <ShieldAlert size={16} color={colors.amber} />
                    <Text style={styles.sectionCardTitle}>Vehicle Cost & Risk Analysis</Text>
                  </View>

                  <View style={styles.vehicleProjectionsList}>
                    {forecastData.vehicleProjections.map((v) => {
                      const isHigh = v.riskLevel === 'HIGH';
                      const isMed = v.riskLevel === 'MEDIUM';
                      const badgeColor = isHigh
                        ? colors.rose
                        : isMed
                        ? colors.amber
                        : colors.green;
                      const badgeBg = isHigh
                        ? 'rgba(239,68,68,0.14)'
                        : isMed
                        ? 'rgba(245,158,11,0.14)'
                        : 'rgba(34,197,94,0.14)';
                      const badgeBorder = isHigh
                        ? 'rgba(239,68,68,0.35)'
                        : isMed
                        ? 'rgba(245,158,11,0.35)'
                        : 'rgba(34,197,94,0.35)';

                      const vName = v.vehicleName || v.name || 'Fleet Vehicle';
                      const cost90 = Number(v.recent90DaysCost ?? v.recentCost90Days ?? 0);
                      const visits90 = Number(v.recent90DaysVisits ?? v.recentVisitCount90Days ?? 0);
                      const nextCost = Number(v.projectedNextMonthCost ?? v.estimatedNextMonthCost ?? 0);
                      const evidence = Array.isArray(v.evidenceReasons) ? v.evidenceReasons : [];
                      const action = v.suggestedAction || evidence[0] || 'Scheduled inspection recommended';

                      return (
                        <View key={v.vehicleID} style={styles.vehicleRiskCard}>
                          <View style={styles.vehicleRiskTop}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.vehicleRiskName}>{vName}</Text>
                              <Text style={styles.vehicleRiskPlate}>
                                {v.registrationNumber || v.vehicleID}
                              </Text>
                            </View>
                            <View
                              style={[
                                styles.riskLevelBadge,
                                { backgroundColor: badgeBg, borderColor: badgeBorder },
                              ]}
                            >
                              <Text style={[styles.riskLevelText, { color: badgeColor }]}>
                                {v.riskLevel} RISK
                              </Text>
                            </View>
                          </View>

                          <View style={styles.vehicleStatsRow}>
                            <View style={styles.vehicleStatCol}>
                              <Text style={styles.vehicleStatLabel}>90-Day Cost</Text>
                              <Text style={styles.vehicleStatVal}>
                                ₹{cost90.toLocaleString('en-IN')}
                              </Text>
                            </View>
                            <View style={styles.vehicleStatCol}>
                              <Text style={styles.vehicleStatLabel}>Visits</Text>
                              <Text style={styles.vehicleStatVal}>{visits90}</Text>
                            </View>
                            <View style={styles.vehicleStatCol}>
                              <Text style={styles.vehicleStatLabel}>Next Month Proj.</Text>
                              <Text style={[styles.vehicleStatVal, { color: colors.amber }]}>
                                ₹{nextCost.toLocaleString('en-IN')}
                              </Text>
                            </View>
                          </View>

                          {evidence.length > 0 && (
                            <View style={styles.evidenceWrap}>
                              {evidence.map((reason, idx) => (
                                <View key={idx} style={styles.evidencePill}>
                                  <Text style={styles.evidencePillText}>{reason}</Text>
                                </View>
                              ))}
                            </View>
                          )}

                          <View style={styles.suggestedActionBox}>
                            <Info size={13} color={colors.textSecondary} />
                            <Text style={styles.suggestedActionText}>{action}</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>

                {/* 4. GEMINI AI PREDICTIVE ADVISORY */}
                <View style={styles.aiAdvisoryCard}>
                  <View style={styles.aiAdvisoryHeader}>
                    <View style={styles.aiAdvisoryHeaderLeft}>
                      <Sparkles size={16} color={colors.amber} />
                      <Text style={styles.aiAdvisoryTitle}>Gemini AI Maintenance Advisory</Text>
                    </View>
                    <View style={styles.aiAdvisoryPill}>
                      <Text style={styles.aiAdvisoryPillText}>ADVISORY ONLY</Text>
                    </View>
                  </View>

                  <Text style={styles.aiSummaryText}>
                    {forecastData.aiExplanation?.executiveSummary ||
                      forecastData.aiExplanation?.summary ||
                      'Automated maintenance forecast generated from fleet historical records.'}
                  </Text>

                  {Array.isArray(forecastData.aiExplanation?.costDrivers) &&
                    forecastData.aiExplanation.costDrivers.length > 0 && (
                      <View style={styles.costDriversBox}>
                        <Text style={styles.subheadingText}>Primary Cost Drivers:</Text>
                        {forecastData.aiExplanation.costDrivers.map((driver, idx) => (
                          <View key={idx} style={styles.bulletRow}>
                            <View style={styles.bulletDot} />
                            <Text style={styles.bulletText}>{driver}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                  {(() => {
                    const recommendations =
                      forecastData.aiExplanation?.budgetRecommendations ||
                      forecastData.aiExplanation?.actionableSuggestions ||
                      [];
                    if (!Array.isArray(recommendations) || recommendations.length === 0) return null;
                    return (
                      <View style={styles.suggestionsBox}>
                        <Text style={styles.subheadingText}>Actionable Recommendations:</Text>
                        {recommendations.map((sug, idx) => (
                          <View key={idx} style={styles.bulletRow}>
                            <CheckCircle2 size={13} color={colors.green} style={{ marginTop: 2 }} />
                            <Text style={styles.bulletText}>{sug}</Text>
                          </View>
                        ))}
                      </View>
                    );
                  })()}
                </View>

                <Text style={styles.dataQualityFootnote}>
                  {forecastData.dataQualityIndicator} All figures are deterministic, advisory, and read-only.
                </Text>
              </>
            ) : null}
          </View>
        ) : (
          <>
            {/* SEARCH */}
            <View style={styles.searchContainer}>
              <Search size={20} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search vehicle or service..."
                placeholderTextColor={colors.textMuted}
                value={search}
                onChangeText={setSearch}
              />
            </View>

            {/* ERROR STATE */}
            {error && maintenanceRecords.length === 0 ? (
              <View style={styles.errorCard}>
                <AlertTriangle size={24} color={colors.rose} />
                <Text style={styles.errorText}>{error}</Text>
                <Pressable style={styles.retryButton} onPress={() => fetchMaintenance()}>
                  <RefreshCw size={14} color={colors.textPrimary} />
                  <Text style={styles.retryButtonText}>Retry</Text>
                </Pressable>
              </View>
            ) : null}

            {/* LIST */}
            <View style={styles.listContainer}>
              <Text style={styles.sectionTitle}>Service Log</Text>
              {loading && maintenanceRecords.length === 0 ? (
                <View style={styles.loadingState}>
                  <ActivityIndicator size="large" color={colors.amber} />
                  <Text style={styles.loadingText}>Fetching maintenance records...</Text>
                </View>
              ) : filteredLogs.length > 0 ? (
                filteredLogs.map((l: any) => {
                  const s = STATUS_STYLES[l.status] || STATUS_STYLES.Active;
                  const isInShop = l.status === 'Active' || l.rawStatus === 'ACTIVE';
                  const isCompleting = completingId === l.id;

                  return (
                    <View key={l.id} style={styles.logCard}>
                      <View style={styles.logHeader}>
                        <Text style={styles.logVehicle}>{l.vehicle}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: s.bg, borderColor: s.border }]}>
                          <Text style={[styles.statusText, { color: s.text }]}>{s.label}</Text>
                        </View>
                      </View>
                      <View style={styles.logBody}>
                        <View>
                          <Text style={styles.logLabel}>Service Type</Text>
                          <Text style={styles.logValue}>{l.service || l.serviceType}</Text>
                          <Text style={styles.logDateText}>{l.date}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.logLabel}>Cost</Text>
                          <Text style={[styles.logValue, { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }]}>
                            {inr(l.cost)}
                          </Text>
                        </View>
                      </View>

                      {isInShop && (
                        <Pressable
                          style={({ pressed }) => [
                            styles.completeButton,
                            pressed && { opacity: 0.8 },
                            isCompleting && { opacity: 0.6 },
                          ]}
                          disabled={isCompleting}
                          onPress={() => handleCompleteMaintenance(l)}
                        >
                          {isCompleting ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <CheckCircle2 size={16} color="#FFFFFF" strokeWidth={2.5} />
                          )}
                          <Text style={styles.completeButtonText}>
                            {isCompleting ? 'Completing...' : 'Complete Service'}
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyState}>
                  <View style={styles.emptyStateIconWrapper}>
                    <Wrench size={32} color={colors.textMuted} strokeWidth={1.5} />
                  </View>
                  <Text style={styles.emptyStateTitle}>No records found</Text>
                  <Text style={styles.emptyStateText}>
                    {search ? `No matches for "${search}".` : "Fleet is fully operational. Add your first service record to start tracking vehicle maintenance."}
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* ADD LOG MODAL */}
      <Modal visible={showAddModal} transparent={true} animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.bottomSheetOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => setShowAddModal(false)} />
          <View style={styles.bottomSheet}>
            <View style={styles.bottomSheetHeader}>
              <View>
                <Text style={styles.bottomSheetTitle}>Log Service</Text>
                <Text style={styles.bottomSheetSubtitle}>Record vehicle maintenance</Text>
              </View>
              <Pressable onPress={() => setShowAddModal(false)}>
                <X size={24} color={colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formContainer}>
              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Vehicle</Text>
                  <Pressable style={styles.dropdownInput} onPress={() => setShowVehicleDropdown(true)}>
                    <Text style={styles.dropdownInputText}>
                      {formVehicleName || availableVehicles.find(v => v.vehicleID === formVehicleID)?.name || 'Select Vehicle'}
                    </Text>
                    <ChevronDown size={16} color={colors.textMuted} />
                  </Pressable>
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Status</Text>
                  <Pressable style={styles.dropdownInput} onPress={() => setShowStatusDropdown(true)}>
                    <Text style={styles.dropdownInputText}>{formStatus}</Text>
                    <ChevronDown size={16} color={colors.textMuted} />
                  </Pressable>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Service Type</Text>
                <TextInput
                  style={styles.formInput}
                  value={formService}
                  onChangeText={setFormService}
                  placeholder="Oil Change, Engine Repair, etc."
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Cost (₹)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formCost}
                    onChangeText={setFormCost}
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Date (YYYY-MM-DD)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formDate}
                    onChangeText={setFormDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.bottomSheetFooter}>
              <Pressable style={styles.cancelBtn} onPress={() => setShowAddModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.saveBtn, (!canSave || saving) && { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}
                onPress={handleSave}
                disabled={!canSave || saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#1a1200" />
                ) : (
                  <Text style={[styles.saveBtnText, (!canSave || saving) && { color: colors.textMuted }]}>
                    Save Record
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* DROPDOWNS */}
      <Modal visible={showVehicleDropdown} transparent={true} animationType="fade" onRequestClose={() => setShowVehicleDropdown(false)}>
        <Pressable style={styles.filterModalOverlay} onPress={() => setShowVehicleDropdown(false)}>
          <View style={styles.dropdownContainer}>
            <Text style={styles.dropdownTitle}>Select Vehicle</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {availableVehicles.length > 0 ? (
                availableVehicles.map((v) => (
                  <Pressable
                    key={v.vehicleID}
                    style={styles.dropdownOption}
                    onPress={() => {
                      setFormVehicleID(v.vehicleID);
                      setFormVehicleName(v.name);
                      setShowVehicleDropdown(false);
                    }}
                  >
                    <Text style={[styles.dropdownOptionText, { color: v.vehicleID === formVehicleID ? colors.amber : colors.textPrimary }]}>
                      {v.name} {v.registrationNumber ? `(${v.registrationNumber})` : ''}
                    </Text>
                  </Pressable>
                ))
              ) : (
                <View style={{ padding: rf(20), alignItems: 'center' }}>
                  <Text style={{ color: colors.textMuted, fontSize: rf(14) }}>No vehicles available in roster</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={showStatusDropdown} transparent={true} animationType="fade" onRequestClose={() => setShowStatusDropdown(false)}>
        <Pressable style={styles.filterModalOverlay} onPress={() => setShowStatusDropdown(false)}>
          <View style={styles.dropdownContainer}>
            <Text style={styles.dropdownTitle}>Select Status</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {STATUS_OPTIONS.map((s) => (
                <Pressable key={s} style={styles.dropdownOption} onPress={() => { setFormStatus(s); setShowStatusDropdown(false); }}>
                  <Text style={[styles.dropdownOptionText, { color: s === formStatus ? colors.amber : colors.textPrimary }]}>{s}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingBottom: rf(90) },
  container: { paddingHorizontal: rf(16), paddingVertical: rf(24), paddingBottom: rf(40), flexGrow: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: rf(20) },
  pageTitle: { color: colors.textPrimary, fontSize: rf(28), fontWeight: '800', letterSpacing: -1 },
  addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.amber, paddingHorizontal: rf(14), paddingVertical: rf(8), borderRadius: rf(8), gap: rf(6) },
  addButtonText: { color: '#1a1200', fontSize: rf(14), fontWeight: '700' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: rf(12), paddingHorizontal: rf(16), height: rf(52), marginBottom: rf(16), gap: rf(10) },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: rf(15), height: '100%' },

  loadingState: { padding: rf(40), alignItems: 'center', justifyContent: 'center', gap: rf(12) },
  loadingText: { color: colors.textMuted, fontSize: rf(14) },
  errorCard: { backgroundColor: 'rgba(251,113,133,0.1)', borderWidth: 1, borderColor: colors.rose, borderRadius: rf(12), padding: rf(16), alignItems: 'center', gap: rf(8), marginBottom: rf(16) },
  errorText: { color: colors.rose, fontSize: rf(14), textAlign: 'center' },
  retryButton: { flexDirection: 'row', alignItems: 'center', gap: rf(6), backgroundColor: colors.panel, paddingHorizontal: rf(12), paddingVertical: rf(6), borderRadius: rf(6), borderWidth: 1, borderColor: colors.border },
  retryButtonText: { color: colors.textPrimary, fontSize: rf(13), fontWeight: '600' },

  sectionTitle: { color: colors.textPrimary, fontSize: rf(14), fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: rf(12) },
  listContainer: { gap: rf(12) },
  logCard: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: rf(16), padding: rf(16) },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: rf(12) },
  logVehicle: { color: colors.textPrimary, fontSize: rf(16), fontWeight: '700' },
  statusBadge: { paddingHorizontal: rf(10), paddingVertical: rf(4), borderRadius: rf(20), borderWidth: 1 },
  statusText: { fontSize: rf(11), fontWeight: '700' },
  logBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, padding: rf(12), borderRadius: rf(8) },
  logLabel: { color: colors.textMuted, fontSize: rf(11), textTransform: 'uppercase', fontWeight: '700', marginBottom: rf(2) },
  logValue: { color: colors.textPrimary, fontSize: rf(14), fontWeight: '600' },
  logDateText: { color: colors.textMuted, fontSize: rf(12), marginTop: rf(2) },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    paddingVertical: rf(10),
    paddingHorizontal: rf(16),
    borderRadius: rf(10),
    gap: rf(8),
    marginTop: rf(12),
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: rf(14),
    fontWeight: '700',
  },

  emptyState: { padding: rf(40), alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderRadius: rf(16), borderWidth: 1, borderColor: colors.borderSoft, borderStyle: 'dashed', marginTop: rf(8) },
  emptyStateIconWrapper: { width: rf(64), height: rf(64), borderRadius: rf(32), backgroundColor: colors.panel, alignItems: 'center', justifyContent: 'center', marginBottom: rf(16), borderWidth: 1, borderColor: colors.borderSoft },
  emptyStateTitle: { color: colors.textPrimary, fontSize: rf(16), fontWeight: '700', marginBottom: rf(8) },
  emptyStateText: { color: colors.textMuted, fontSize: rf(14), textAlign: 'center', lineHeight: rf(20) },

  bottomSheetOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.2)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: colors.surface, borderTopLeftRadius: rf(24), borderTopRightRadius: rf(24), padding: rf(15), paddingBottom: Platform.OS === 'android' ? rf(55) : rf(32), maxHeight: '90%' },
  bottomSheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: rf(24) },
  bottomSheetTitle: { color: colors.textPrimary, fontSize: rf(20), fontWeight: '700' },
  bottomSheetSubtitle: { color: colors.textMuted, fontSize: rf(13), marginTop: rf(4) },
  formContainer: { gap: rf(16), paddingBottom: rf(20) },
  formRow: { flexDirection: 'row', gap: rf(12) },
  formGroup: { flex: 1, gap: rf(6) },
  formLabel: { color: colors.textMuted, fontSize: rf(11), textTransform: 'uppercase', fontWeight: '700' },
  formInput: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: rf(8), paddingHorizontal: rf(12), height: rf(44), color: colors.textPrimary, fontSize: rf(14) },
  dropdownInput: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: rf(8), paddingHorizontal: rf(12), height: rf(44) },
  dropdownInputText: { color: colors.textPrimary, fontSize: rf(14) },

  bottomSheetFooter: { flexDirection: 'row', gap: rf(20), marginTop: rf(16) },
  cancelBtn: { flex: 1, height: rf(48), backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: rf(12), alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { color: colors.textSecondary, fontSize: rf(15), fontWeight: '600' },
  saveBtn: { flex: 1, height: rf(48), backgroundColor: colors.amber, borderRadius: rf(12), alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#1a1200', fontSize: rf(15), fontWeight: '700' },

  filterModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.2)', justifyContent: 'center', padding: rf(24) },
  dropdownContainer: { backgroundColor: colors.surface, borderRadius: rf(16), borderWidth: 1, borderColor: colors.border, maxHeight: '60%', overflow: 'hidden', paddingVertical: rf(8) },
  dropdownTitle: { color: colors.textMuted, fontSize: rf(12), fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: rf(20), paddingVertical: rf(12), borderBottomWidth: 1, borderBottomColor: colors.borderSoft, marginBottom: rf(8) },
  dropdownOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: rf(14), paddingHorizontal: rf(20) },
  dropdownOptionText: { color: colors.textPrimary, fontSize: rf(15), fontWeight: '600' },

  // Segmented Tab Switcher Styles
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: rf(12),
    padding: rf(4),
    marginBottom: rf(16),
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: rf(10),
    borderRadius: rf(8),
    gap: rf(6),
  },
  segmentBtnActive: {
    backgroundColor: colors.amber,
  },
  segmentBtnText: {
    fontSize: rf(12),
    fontWeight: '700',
    color: colors.textSecondary,
  },
  segmentBtnTextActive: {
    color: '#1a1200',
  },

  // Forecast Dashboard Styles
  forecastContainer: {
    gap: rf(16),
  },
  forecastHeroCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: rf(16),
    padding: rf(16),
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    gap: rf(10),
  },
  forecastHeroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rf(10),
  },
  forecastHeroIconWrap: {
    width: rf(36),
    height: rf(36),
    borderRadius: rf(8),
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  forecastHeroLabel: {
    fontSize: rf(11),
    color: colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  forecastHeroMonth: {
    fontSize: rf(15),
    fontWeight: '800',
    color: colors.textPrimary,
  },
  confidenceBadge: {
    paddingHorizontal: rf(8),
    paddingVertical: rf(4),
    borderRadius: rf(6),
    borderWidth: 1,
  },
  confidenceBadgeText: {
    fontSize: rf(9),
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroAmountRow: {
    marginVertical: rf(4),
    gap: rf(6),
  },
  heroAmount: {
    fontSize: rf(28),
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  rangePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: rf(10),
    paddingVertical: rf(4),
    borderRadius: rf(6),
    alignSelf: 'flex-start',
  },
  rangePillText: {
    fontSize: rf(11),
    fontWeight: '600',
    color: colors.textSecondary,
  },
  heroSubtext: {
    fontSize: rf(11),
    color: colors.textMuted,
    lineHeight: rf(15),
  },

  forecastSectionCard: {
    backgroundColor: colors.panel,
    borderRadius: rf(16),
    padding: rf(16),
    borderWidth: 1,
    borderColor: colors.border,
    gap: rf(12),
  },
  sectionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rf(8),
  },
  sectionCardTitle: {
    fontSize: rf(14),
    fontWeight: '800',
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  monthlyBarsList: {
    gap: rf(12),
  },
  monthBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rf(10),
  },
  monthBarLabelCol: {
    width: rf(80),
  },
  monthBarMonth: {
    fontSize: rf(12),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  monthBarVisits: {
    fontSize: rf(10),
    color: colors.textMuted,
  },
  monthBarProgressWrap: {
    flex: 1,
  },
  monthBarBg: {
    height: rf(8),
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: rf(4),
    overflow: 'hidden',
  },
  monthBarFill: {
    height: '100%',
    backgroundColor: colors.blue,
    borderRadius: rf(4),
  },
  monthBarAmount: {
    fontSize: rf(12),
    fontWeight: '700',
    color: colors.textPrimary,
    minWidth: rf(70),
    textAlign: 'right',
  },
  emptyNoticeText: {
    fontSize: rf(12),
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: rf(12),
  },

  vehicleProjectionsList: {
    gap: rf(10),
  },
  vehicleRiskCard: {
    backgroundColor: colors.surface,
    borderRadius: rf(12),
    padding: rf(12),
    borderWidth: 1,
    borderColor: colors.borderSoft,
    gap: rf(8),
  },
  vehicleRiskTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vehicleRiskName: {
    fontSize: rf(13),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  vehicleRiskPlate: {
    fontSize: rf(11),
    color: colors.textMuted,
    marginTop: 1,
  },
  riskLevelBadge: {
    paddingHorizontal: rf(8),
    paddingVertical: rf(3),
    borderRadius: rf(12),
    borderWidth: 1,
  },
  riskLevelText: {
    fontSize: rf(9),
    fontWeight: '800',
  },
  vehicleStatsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: rf(8),
    padding: rf(8),
  },
  vehicleStatCol: {
    flex: 1,
    alignItems: 'center',
  },
  vehicleStatLabel: {
    fontSize: rf(9),
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  vehicleStatVal: {
    fontSize: rf(12),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  evidenceWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rf(4),
  },
  evidencePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: rf(6),
    paddingVertical: rf(2),
    borderRadius: rf(4),
  },
  evidencePillText: {
    fontSize: rf(9),
    color: colors.textSecondary,
    fontWeight: '500',
  },
  suggestedActionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rf(6),
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    padding: rf(6),
    borderRadius: rf(6),
  },
  suggestedActionText: {
    fontSize: rf(10),
    color: colors.textSecondary,
    flex: 1,
  },

  aiAdvisoryCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.06)',
    borderRadius: rf(16),
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    padding: rf(16),
    gap: rf(10),
  },
  aiAdvisoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aiAdvisoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rf(8),
  },
  aiAdvisoryTitle: {
    fontSize: rf(13),
    fontWeight: '700',
    color: colors.amber,
  },
  aiAdvisoryPill: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: rf(6),
    paddingVertical: rf(2),
    borderRadius: rf(4),
  },
  aiAdvisoryPillText: {
    fontSize: rf(8),
    fontWeight: '700',
    color: colors.amber,
  },
  aiSummaryText: {
    fontSize: rf(12),
    color: colors.textPrimary,
    lineHeight: rf(17),
  },
  subheadingText: {
    fontSize: rf(11),
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: rf(4),
  },
  costDriversBox: {
    gap: rf(4),
  },
  suggestionsBox: {
    gap: rf(4),
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: rf(6),
  },
  bulletDot: {
    width: rf(4),
    height: rf(4),
    borderRadius: rf(2),
    backgroundColor: colors.amber,
    marginTop: rf(6),
  },
  bulletText: {
    fontSize: rf(11),
    color: colors.textSecondary,
    flex: 1,
    lineHeight: rf(16),
  },
  dataQualityFootnote: {
    fontSize: rf(10),
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: rf(16),
    lineHeight: rf(14),
  },
});
