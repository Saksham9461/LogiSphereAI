import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Dimensions,
  Alert,
} from 'react-native';
import {
  Leaf,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Award,
  Compass,
  Sparkles,
  Target,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Fuel,
  Truck,
  Wrench,
  CheckCircle2,
  X,
  Calendar,
} from 'lucide-react-native';
import { colors } from '../theme/colors';
import { rf } from '../theme/responsive';
import useCarbonStore from '../store/CarbonStore';
import useAuthStore from '../store/AuthStore';

const { width } = Dimensions.get('window');

export default function CarbonIntelligenceScreen({ navigation }: any) {
  const user = useAuthStore((s) => s.user);
  const isManager = ['ROLE_MANAGER', 'ROLE_DISPATCHER', 'ROLE_ADMIN', 'MANAGER', 'ADMIN'].includes(
    String(user?.role || '').toUpperCase()
  );

  const {
    loading,
    refreshing,
    submittingTarget,
    comparingRoute,
    error,
    periodKey,
    kpis,
    overview,
    vehicles,
    trips,
    anomalies,
    recommendations,
    target,
    timeSeries,
    ecoRouteComparison,
    fetchCarbonOverview,
    setPeriodKey,
    saveTarget,
    compareEcoRoute,
    clearError,
  } = useCarbonStore();

  const [targetModalVisible, setTargetModalVisible] = useState(false);
  const [newTargetKg, setNewTargetKg] = useState('');
  const [newThresholdPercent, setNewThresholdPercent] = useState('80');
  const [targetNotes, setTargetNotes] = useState('');

  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'VEHICLES' | 'ADVISOR' | 'ECO_ROUTE'>('OVERVIEW');

  useEffect(() => {
    fetchCarbonOverview(periodKey);
  }, []);

  const onRefresh = useCallback(async () => {
    await fetchCarbonOverview(periodKey);
  }, [periodKey]);

  const handleOpenTargetModal = () => {
    if (target) {
      setNewTargetKg(String(target.targetCo2Kg || ''));
      setNewThresholdPercent(String(target.alertThresholdPercent || '80'));
      setTargetNotes(target.notes || '');
    } else {
      setNewTargetKg('1500');
      setNewThresholdPercent('80');
      setTargetNotes('');
    }
    setTargetModalVisible(true);
  };

  const handleSaveTarget = async () => {
    const val = Number(newTargetKg);
    if (!val || val <= 0) {
      Alert.alert('Invalid Target', 'Please enter a positive CO₂ target in kilograms.');
      return;
    }
    const success = await saveTarget(val, Number(newThresholdPercent) || 80, targetNotes);
    if (success) {
      setTargetModalVisible(false);
      Alert.alert('Success', 'Monthly sustainability target configured.');
    }
  };

  const handleRunSampleEcoRoute = async () => {
    await compareEcoRoute('TRP-CURRENT', 'TRUCK', [
      {
        id: 'rt_city',
        label: 'Route 1 (City Center Corridor)',
        distanceMeters: 42000,
        durationSeconds: 3400,
        trafficDelaySeconds: 780,
      },
      {
        id: 'rt_bypass',
        label: 'Route 2 (Green Ring Bypass)',
        distanceMeters: 46500,
        durationSeconds: 3100,
        trafficDelaySeconds: 120,
      },
      {
        id: 'rt_highway',
        label: 'Route 3 (Expressway)',
        distanceMeters: 49000,
        durationSeconds: 3250,
        trafficDelaySeconds: 180,
      },
    ]);
  };

  // Maximum emissions for trend bar chart scaling
  const maxSeriesCo2 = useMemo(() => {
    if (!timeSeries || timeSeries.length === 0) return 1;
    return Math.max(...timeSeries.map((p) => p.co2Kg), 1);
  }, [timeSeries]);

  const isGeminiSource = overview?.advisorAdvisory?.source === 'gemini';

  return (
    <View style={styles.screen}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.leafIconBadge}>
            <Leaf color={colors.green} size={22} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Carbon Intelligence</Text>
            <Text style={styles.headerSubtitle}>Fleet Sustainability & Emissions</Text>
          </View>
        </View>

        <Pressable style={styles.refreshBtn} onPress={onRefresh} hitSlop={10}>
          <RefreshCw color={colors.textSecondary} size={18} />
        </Pressable>
      </View>

      {/* Period Filter Selector */}
      <View style={styles.periodSelectorContainer}>
        {(['7D', '30D', '90D', 'ALL'] as const).map((key) => {
          const isActive = periodKey === key;
          const label = key === '7D' ? '7 Days' : key === '30D' ? '30 Days' : key === '90D' ? '90 Days' : 'All';
          return (
            <Pressable
              key={key}
              style={[styles.periodPill, isActive && styles.periodPillActive]}
              onPress={() => setPeriodKey(key)}
            >
              <Text style={[styles.periodPillText, isActive && styles.periodPillTextActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Segmented Screen Tabs */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tabItem, activeTab === 'OVERVIEW' && styles.tabItemActive]}
          onPress={() => setActiveTab('OVERVIEW')}
        >
          <Text style={[styles.tabText, activeTab === 'OVERVIEW' && styles.tabTextActive]}>Overview</Text>
        </Pressable>
        <Pressable
          style={[styles.tabItem, activeTab === 'VEHICLES' && styles.tabItemActive]}
          onPress={() => setActiveTab('VEHICLES')}
        >
          <Text style={[styles.tabText, activeTab === 'VEHICLES' && styles.tabTextActive]}>Vehicles</Text>
        </Pressable>
        <Pressable
          style={[styles.tabItem, activeTab === 'ADVISOR' && styles.tabItemActive]}
          onPress={() => setActiveTab('ADVISOR')}
        >
          <Text style={[styles.tabText, activeTab === 'ADVISOR' && styles.tabTextActive]}>AI Advisor</Text>
        </Pressable>
        <Pressable
          style={[styles.tabItem, activeTab === 'ECO_ROUTE' && styles.tabItemActive]}
          onPress={() => setActiveTab('ECO_ROUTE')}
        >
          <Text style={[styles.tabText, activeTab === 'ECO_ROUTE' && styles.tabTextActive]}>Eco-Route</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green} />}
      >
        {/* Loading Spinner */}
        {loading && !refreshing && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.green} />
            <Text style={styles.loadingText}>Calculating fleet emissions & auditing telemetry...</Text>
          </View>
        )}

        {/* Error Banner with Retry */}
        {error && !loading && (
          <View style={styles.errorCard}>
            <AlertTriangle color={colors.error} size={22} />
            <View style={styles.errorTextContainer}>
              <Text style={styles.errorTitle}>Telemetry Error</Text>
              <Text style={styles.errorMessage}>{error}</Text>
            </View>
            <Pressable style={styles.retryBtn} onPress={onRefresh}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </Pressable>
          </View>
        )}

        {!loading && (
          <>
            {/* Engine Status & Confidence Pill Bar */}
            <View style={styles.statusPillRow}>
              <View style={[styles.engineBadge, isGeminiSource ? styles.badgeGemini : styles.badgeDeterministic]}>
                {isGeminiSource ? <Sparkles color={colors.violet} size={13} /> : <ShieldCheck color={colors.green} size={13} />}
                <Text style={[styles.engineBadgeText, { color: isGeminiSource ? colors.violet : colors.green }]}>
                  {isGeminiSource ? 'Gemini AI Enriched' : 'Grounded Deterministic Engine'}
                </Text>
              </View>

              {kpis && (
                <View style={styles.confidenceBadge}>
                  <Text style={styles.confidenceBadgeText}>
                    Data Confidence: {kpis.dataConfidenceScore}% ({kpis.confidenceRating})
                  </Text>
                </View>
              )}
            </View>

            {/* TAB 1: OVERVIEW */}
            {activeTab === 'OVERVIEW' && (
              <>
                {/* Primary CO2 KPI Highlight Card */}
                <View style={styles.primaryKpiCard}>
                  <View style={styles.primaryKpiTop}>
                    <Text style={styles.primaryKpiLabel}>TOTAL FLEET EMISSIONS</Text>
                    {kpis?.periodOverPeriodDeltaPercent !== undefined && (
                      <View
                        style={[
                          styles.deltaBadge,
                          kpis.periodOverPeriodDeltaPercent <= 0 ? styles.deltaBadgeDown : styles.deltaBadgeUp,
                        ]}
                      >
                        {kpis.periodOverPeriodDeltaPercent <= 0 ? (
                          <TrendingDown color={colors.green} size={14} />
                        ) : (
                          <TrendingUp color={colors.rose} size={14} />
                        )}
                        <Text
                          style={[
                            styles.deltaBadgeText,
                            { color: kpis.periodOverPeriodDeltaPercent <= 0 ? colors.green : colors.rose },
                          ]}
                        >
                          {Math.abs(kpis.periodOverPeriodDeltaPercent)}% vs Prev Window
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.primaryKpiValueRow}>
                    <Text style={styles.primaryKpiValue}>{kpis?.totalCo2Kg?.toLocaleString('en-IN') || 0}</Text>
                    <Text style={styles.primaryKpiUnit}>kg CO₂</Text>
                    <Text style={styles.primaryKpiSubUnit}>({kpis?.totalCo2Tonnes || 0} tonnes)</Text>
                  </View>

                  {/* Actual vs Estimated Meter */}
                  <View style={styles.dataQualityMeterContainer}>
                    <View style={styles.dataQualityBarTrack}>
                      <View
                        style={[
                          styles.dataQualityBarFill,
                          { width: `${Math.min(100, Math.max(5, kpis?.actualDataPercentage || 0))}%` },
                        ]}
                      />
                    </View>
                    <View style={styles.dataQualityLabels}>
                      <Text style={styles.dataQualityActualText}>
                        ● Actual Fuel: {kpis?.actualCo2Kg || 0} kg ({kpis?.actualDataPercentage || 0}%)
                      </Text>
                      <Text style={styles.dataQualityEstText}>
                        ● Estimated: {kpis?.estimatedCo2Kg || 0} kg
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Sub KPI 3-Column Grid */}
                <View style={styles.kpiGrid}>
                  <View style={styles.subKpiCard}>
                    <Text style={styles.subKpiLabel}>Emissions / KM</Text>
                    <Text style={styles.subKpiValue}>{kpis?.emissionsPerKm || 0}</Text>
                    <Text style={styles.subKpiUnit}>kg CO₂/km</Text>
                  </View>

                  <View style={styles.subKpiCard}>
                    <Text style={styles.subKpiLabel}>Total Distance</Text>
                    <Text style={styles.subKpiValue}>{kpis?.totalDistanceKm?.toLocaleString('en-IN') || 0}</Text>
                    <Text style={styles.subKpiUnit}>km logged</Text>
                  </View>

                  <View style={styles.subKpiCard}>
                    <Text style={styles.subKpiLabel}>Fuel Cost</Text>
                    <Text style={styles.subKpiValue}>₹{kpis?.totalFuelCostINR?.toLocaleString('en-IN') || 0}</Text>
                    <Text style={styles.subKpiUnit}>{kpis?.totalFuelLiters || 0} Liters</Text>
                  </View>
                </View>

                {/* Sustainability Target / Carbon Budget Card */}
                <View style={styles.targetCard}>
                  <View style={styles.targetCardHeader}>
                    <View style={styles.targetCardTitleGroup}>
                      <Target color={colors.amber} size={18} />
                      <Text style={styles.targetCardTitle}>Monthly Carbon Budget</Text>
                    </View>
                    {isManager && (
                      <Pressable style={styles.setTargetBtn} onPress={handleOpenTargetModal}>
                        <Text style={styles.setTargetBtnText}>{target ? 'Edit Budget' : '+ Set Budget'}</Text>
                      </Pressable>
                    )}
                  </View>

                  {target ? (
                    <>
                      <View style={styles.targetProgressRow}>
                        <Text style={styles.targetConsumedText}>{target.percentageConsumed}% Consumed</Text>
                        <View
                          style={[
                            styles.targetStatusBadge,
                            target.status === 'EXCEEDED'
                              ? styles.badgeExceeded
                              : target.status === 'AT_RISK'
                              ? styles.badgeAtRisk
                              : styles.badgeOnTrack,
                          ]}
                        >
                          <Text
                            style={[
                              styles.targetStatusBadgeText,
                              target.status === 'EXCEEDED'
                                ? styles.textExceeded
                                : target.status === 'AT_RISK'
                                ? styles.textAtRisk
                                : styles.textOnTrack,
                            ]}
                          >
                            {target.status.replace('_', ' ')}
                          </Text>
                        </View>
                      </View>

                      {/* Progress Bar */}
                      <View style={styles.targetBarTrack}>
                        <View
                          style={[
                            styles.targetBarFill,
                            {
                              width: `${Math.min(100, target.percentageConsumed)}%`,
                              backgroundColor:
                                target.status === 'EXCEEDED'
                                  ? colors.rose
                                  : target.status === 'AT_RISK'
                                  ? colors.amber
                                  : colors.green,
                            },
                          ]}
                        />
                      </View>

                      <View style={styles.targetDetailsRow}>
                        <Text style={styles.targetDetailText}>
                          Emitted: {target.emissionsToDateKg} / {target.targetCo2Kg} kg
                        </Text>
                        <Text style={styles.targetDetailText}>Remaining: {target.remainingAllowanceKg} kg</Text>
                      </View>

                      {target.projectedPeriodEndKg > 0 && (
                        <Text style={styles.targetProjectedText}>
                          Projected month-end emissions: ~{target.projectedPeriodEndKg} kg
                        </Text>
                      )}
                    </>
                  ) : (
                    <View style={styles.targetEmptyState}>
                      <Text style={styles.targetEmptyText}>
                        No monthly carbon budget configured for this reporting cycle.
                      </Text>
                      {isManager && (
                        <Pressable style={styles.targetSetupAction} onPress={handleOpenTargetModal}>
                          <Text style={styles.targetSetupActionText}>Configure Target Limit</Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                </View>

                {/* Emissions Trend Chart */}
                <View style={styles.chartCard}>
                  <Text style={styles.chartTitle}>Daily Emissions Trend (kg CO₂)</Text>
                  {timeSeries && timeSeries.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartScroll}>
                      <View style={styles.chartBarsArea}>
                        {timeSeries.map((point, idx) => {
                          const heightPct = Math.min(100, Math.max(8, (point.co2Kg / maxSeriesCo2) * 100));
                          const dateLabel = point.date.slice(5); // MM-DD
                          return (
                            <View key={point.date || idx} style={styles.chartBarCol}>
                              <Text style={styles.chartBarValue}>{Math.round(point.co2Kg)}</Text>
                              <View style={styles.chartBarTrack}>
                                <View style={[styles.chartBarFill, { height: `${heightPct}%` }]} />
                              </View>
                              <Text style={styles.chartBarLabel}>{dateLabel}</Text>
                            </View>
                          );
                        })}
                      </View>
                    </ScrollView>
                  ) : (
                    <Text style={styles.emptyNote}>No daily emissions recorded for this date range.</Text>
                  )}
                </View>

                {/* Anomalies Preview */}
                {anomalies && anomalies.length > 0 && (
                  <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                      <AlertTriangle color={colors.rose} size={18} />
                      <Text style={styles.sectionTitle}>Emissions Anomalies ({anomalies.length})</Text>
                    </View>

                    {anomalies.slice(0, 3).map((anom) => (
                      <View key={anom.id} style={styles.anomalyCard}>
                        <View style={styles.anomalyTop}>
                          <Text style={styles.anomalyVehicle}>{anom.vehicleName}</Text>
                          <View
                            style={[
                              styles.severityPill,
                              anom.severity === 'HIGH' ? styles.severityHigh : styles.severityMed,
                            ]}
                          >
                            <Text
                              style={[
                                styles.severityPillText,
                                { color: anom.severity === 'HIGH' ? colors.rose : colors.amber },
                              ]}
                            >
                              {anom.severity} SEVERITY
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.anomalyReason}>{anom.evidenceReason}</Text>
                        <Text style={styles.anomalyImpact}>{anom.operationalImpact}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}

            {/* TAB 2: VEHICLES */}
            {activeTab === 'VEHICLES' && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                  <Truck color={colors.blue} size={18} />
                  <Text style={styles.sectionTitle}>Fleet Vehicle Carbon Rankings</Text>
                </View>

                {vehicles && vehicles.length > 0 ? (
                  vehicles.map((v) => (
                    <View key={v.vehicleID} style={styles.vehicleRankCard}>
                      <View style={styles.rankBadge}>
                        <Text style={styles.rankBadgeText}>#{v.rank}</Text>
                      </View>

                      <View style={styles.vehicleInfo}>
                        <View style={styles.vehicleNameRow}>
                          <Text style={styles.vehicleNameText}>{v.name}</Text>
                          <View
                            style={[
                              styles.ratingBadge,
                              v.efficiencyRating === 'EXCELLENT'
                                ? styles.ratingExcellent
                                : v.efficiencyRating === 'GOOD'
                                ? styles.ratingGood
                                : v.efficiencyRating === 'AVERAGE'
                                ? styles.ratingAverage
                                : styles.ratingPoor,
                            ]}
                          >
                            <Text style={styles.ratingBadgeText}>{v.efficiencyRating}</Text>
                          </View>
                        </View>

                        <Text style={styles.vehicleSubText}>
                          {v.registrationNumber} • {v.type} ({v.fuelType})
                        </Text>

                        <View style={styles.vehicleMetricsRow}>
                          <View style={styles.vehMetricItem}>
                            <Text style={styles.vehMetricLabel}>Total CO₂</Text>
                            <Text style={styles.vehMetricValue}>{v.totalCo2Kg} kg</Text>
                          </View>
                          <View style={styles.vehMetricItem}>
                            <Text style={styles.vehMetricLabel}>Rate</Text>
                            <Text style={styles.vehMetricValue}>{v.avgEmissionsPerKm || '—'} kg/km</Text>
                          </View>
                          <View style={styles.vehMetricItem}>
                            <Text style={styles.vehMetricLabel}>Distance</Text>
                            <Text style={styles.vehMetricValue}>{v.totalDistanceKm} km</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyNote}>No vehicle emission data recorded for this window.</Text>
                )}
              </View>
            )}

            {/* TAB 3: AI CARBON ADVISOR */}
            {activeTab === 'ADVISOR' && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                  <Sparkles color={colors.violet} size={18} />
                  <Text style={styles.sectionTitle}>AI Carbon Advisor Recommendations</Text>
                </View>

                {overview?.advisorAdvisory?.executiveSummary ? (
                  <View style={styles.executiveSummaryCard}>
                    <Text style={styles.executiveSummaryText}>{overview.advisorAdvisory.executiveSummary}</Text>
                  </View>
                ) : null}

                {recommendations && recommendations.length > 0 ? (
                  recommendations.map((rec) => (
                    <View key={rec.id} style={styles.recommendationCard}>
                      <View style={styles.recHeaderRow}>
                        <View style={styles.recPriorityPill}>
                          <Text style={styles.recPriorityText}>{rec.priority} PRIORITY</Text>
                        </View>
                        <Text style={styles.recCategory}>{rec.category.replace(/_/g, ' ')}</Text>
                      </View>

                      <Text style={styles.recTitle}>{rec.title}</Text>
                      <Text style={styles.recArea}>Target Area: {rec.area}</Text>

                      <View style={styles.recSection}>
                        <Text style={styles.recSectionLabel}>OBSERVATION & EVIDENCE</Text>
                        <Text style={styles.recSectionText}>{rec.evidence}</Text>
                      </View>

                      <View style={styles.recSection}>
                        <Text style={styles.recSectionLabel}>ACTIONABLE INTERVENTION</Text>
                        <Text style={styles.recSectionText}>{rec.actionableStep}</Text>
                      </View>

                      {/* Potential Savings Box */}
                      {(rec.estimatedCo2SavingsKg || rec.estimatedCostSavingsINR) && (
                        <View style={styles.savingsBox}>
                          {rec.estimatedCo2SavingsKg && (
                            <View style={styles.savingsItem}>
                              <Text style={styles.savingsLabel}>Potential CO₂ Reduction</Text>
                              <Text style={styles.savingsValue}>~{rec.estimatedCo2SavingsKg} kg</Text>
                            </View>
                          )}
                          {rec.estimatedCostSavingsINR && (
                            <View style={styles.savingsItem}>
                              <Text style={styles.savingsLabel}>Est. Fuel Savings</Text>
                              <Text style={styles.savingsValue}>₹{rec.estimatedCostSavingsINR}</Text>
                            </View>
                          )}
                        </View>
                      )}

                      {/* Deep-link Action Button */}
                      {rec.navigationTarget?.screen && (
                        <Pressable
                          style={styles.actionLinkBtn}
                          onPress={() => {
                            try {
                              navigation.navigate(rec.navigationTarget!.screen, {
                                id: rec.navigationTarget!.id,
                              });
                            } catch {
                              navigation.navigate(rec.navigationTarget!.screen);
                            }
                          }}
                        >
                          <Text style={styles.actionLinkText}>Open {rec.navigationTarget.screen}</Text>
                          <ArrowRight color={colors.blue} size={16} />
                        </Pressable>
                      )}
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyNote}>
                    No anomalous emissions or efficiency penalties detected for this period. Fleet operating at nominal baselines!
                  </Text>
                )}
              </View>
            )}

            {/* TAB 4: ECO-ROUTE INTELLIGENCE */}
            {activeTab === 'ECO_ROUTE' && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                  <Compass color={colors.teal} size={18} />
                  <Text style={styles.sectionTitle}>Eco-Route Intelligence Simulator</Text>
                </View>

                <View style={styles.ecoRouteIntroCard}>
                  <Text style={styles.ecoRouteIntroText}>
                    Simulate dispatch corridors to compare highway, city center, and bypass routing. The engine evaluates
                    cruising efficiency against urban traffic idling penalties.
                  </Text>
                  <Pressable
                    style={styles.runEcoSimBtn}
                    onPress={handleRunSampleEcoRoute}
                    disabled={comparingRoute}
                  >
                    {comparingRoute ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.runEcoSimBtnText}>Run Corridor Simulation</Text>
                    )}
                  </Pressable>
                </View>

                {ecoRouteComparison && (
                  <View style={styles.ecoComparisonCard}>
                    <Text style={styles.ecoExplanationTitle}>OPTIMAL GREEN ROUTE</Text>
                    <Text style={styles.ecoExplanationText}>{ecoRouteComparison.tradeoffExplanation}</Text>

                    {/* Savings Highlight */}
                    <View style={styles.ecoSavingsRow}>
                      <View style={styles.ecoSavingsBox}>
                        <Text style={styles.ecoSavingsLabel}>CO₂ Saved</Text>
                        <Text style={styles.ecoSavingsVal}>
                          {ecoRouteComparison.summary.potentialCo2SavingsKg} kg
                        </Text>
                      </View>
                      <View style={styles.ecoSavingsBox}>
                        <Text style={styles.ecoSavingsLabel}>Fuel Saved</Text>
                        <Text style={styles.ecoSavingsVal}>
                          {ecoRouteComparison.summary.potentialFuelSavingsLiters} L
                        </Text>
                      </View>
                      <View style={styles.ecoSavingsBox}>
                        <Text style={styles.ecoSavingsLabel}>Cost Saved</Text>
                        <Text style={styles.ecoSavingsVal}>
                          ₹{ecoRouteComparison.summary.potentialCostSavingsINR}
                        </Text>
                      </View>
                    </View>

                    {/* Candidate Routes List */}
                    <Text style={styles.candidateHeader}>Evaluated Routes:</Text>
                    {ecoRouteComparison.routes.map((rt) => (
                      <View
                        key={rt.id}
                        style={[styles.routeCandidateRow, rt.isGreenest && styles.routeCandidateGreenest]}
                      >
                        <View style={styles.candidateLeft}>
                          <Text style={styles.candidateLabel}>{rt.label}</Text>
                          <Text style={styles.candidateSub}>
                            {rt.distanceKm} km • {Math.round(rt.durationSeconds / 60)} mins • {rt.estimatedFuelLiters} L fuel
                          </Text>
                        </View>
                        <View style={styles.candidateRight}>
                          <Text style={styles.candidateCo2}>{rt.estimatedCo2Kg} kg CO₂</Text>
                          {rt.isGreenest && (
                            <View style={styles.greenestPill}>
                              <Text style={styles.greenestPillText}>GREENEST</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Target Setting Modal */}
      <Modal visible={targetModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Carbon Budget</Text>
              <Pressable onPress={() => setTargetModalVisible(false)} hitSlop={10}>
                <X color={colors.textSecondary} size={20} />
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>Monthly Target CO₂ Limit (kg)</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              placeholder="e.g. 1500"
              placeholderTextColor={colors.textMuted}
              value={newTargetKg}
              onChangeText={setNewTargetKg}
            />

            <Text style={styles.inputLabel}>Warning Alert Threshold (%)</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              placeholder="e.g. 80"
              placeholderTextColor={colors.textMuted}
              value={newThresholdPercent}
              onChangeText={setNewThresholdPercent}
            />

            <Text style={styles.inputLabel}>Notes / Purpose (Optional)</Text>
            <TextInput
              style={[styles.modalInput, { height: 60 }]}
              multiline
              placeholder="e.g. Q4 Corporate Scope 1 Reduction Goal"
              placeholderTextColor={colors.textMuted}
              value={targetNotes}
              onChangeText={setTargetNotes}
            />

            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setTargetModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalSaveBtn, submittingTarget && styles.btnDisabled]}
                onPress={handleSaveTarget}
                disabled={submittingTarget}
              >
                {submittingTarget ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalSaveText}>Save Target</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.panel,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  leafIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: rf(18),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: rf(12),
    color: colors.textSecondary,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodSelectorContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.panel,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  periodPill: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
  },
  periodPillActive: {
    backgroundColor: colors.green,
  },
  periodPillText: {
    fontSize: rf(12),
    fontWeight: '600',
    color: colors.textSecondary,
  },
  periodPillTextActive: {
    color: '#FFFFFF',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.panel,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: colors.green,
  },
  tabText: {
    fontSize: rf(13),
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.green,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: rf(13),
    color: colors.textSecondary,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  errorTextContainer: {
    flex: 1,
  },
  errorTitle: {
    fontSize: rf(13),
    fontWeight: '700',
    color: colors.error,
  },
  errorMessage: {
    fontSize: rf(12),
    color: colors.textPrimary,
  },
  retryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.error,
    borderRadius: 6,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: rf(12),
    fontWeight: '600',
  },
  statusPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  engineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  badgeGemini: {
    backgroundColor: '#EDE9FE',
  },
  badgeDeterministic: {
    backgroundColor: '#DCFCE7',
  },
  engineBadgeText: {
    fontSize: rf(11),
    fontWeight: '600',
  },
  confidenceBadge: {
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  confidenceBadgeText: {
    fontSize: rf(11),
    color: colors.textSecondary,
    fontWeight: '500',
  },
  primaryKpiCard: {
    backgroundColor: colors.panel,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  primaryKpiTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  primaryKpiLabel: {
    fontSize: rf(11),
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  deltaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  deltaBadgeDown: {
    backgroundColor: '#DCFCE7',
  },
  deltaBadgeUp: {
    backgroundColor: '#FEE2E2',
  },
  deltaBadgeText: {
    fontSize: rf(11),
    fontWeight: '600',
  },
  primaryKpiValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 14,
  },
  primaryKpiValue: {
    fontSize: rf(32),
    fontWeight: '800',
    color: colors.textPrimary,
  },
  primaryKpiUnit: {
    fontSize: rf(16),
    fontWeight: '600',
    color: colors.green,
  },
  primaryKpiSubUnit: {
    fontSize: rf(13),
    color: colors.textMuted,
  },
  dataQualityMeterContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    paddingTop: 12,
  },
  dataQualityBarTrack: {
    height: 8,
    backgroundColor: '#E0E7FF',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  dataQualityBarFill: {
    height: '100%',
    backgroundColor: colors.green,
  },
  dataQualityLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dataQualityActualText: {
    fontSize: rf(11),
    color: colors.green,
    fontWeight: '600',
  },
  dataQualityEstText: {
    fontSize: rf(11),
    color: colors.textMuted,
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  subKpiCard: {
    flex: 1,
    backgroundColor: colors.panel,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  subKpiLabel: {
    fontSize: rf(11),
    color: colors.textMuted,
    marginBottom: 4,
  },
  subKpiValue: {
    fontSize: rf(17),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subKpiUnit: {
    fontSize: rf(10),
    color: colors.textSecondary,
    marginTop: 2,
  },
  targetCard: {
    backgroundColor: colors.panel,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  targetCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  targetCardTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  targetCardTitle: {
    fontSize: rf(14),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  setTargetBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: colors.surfaceRaised,
  },
  setTargetBtnText: {
    fontSize: rf(12),
    fontWeight: '600',
    color: colors.blue,
  },
  targetProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  targetConsumedText: {
    fontSize: rf(13),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  targetStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeOnTrack: {
    backgroundColor: '#DCFCE7',
  },
  badgeAtRisk: {
    backgroundColor: '#FEF3C7',
  },
  badgeExceeded: {
    backgroundColor: '#FEE2E2',
  },
  targetStatusBadgeText: {
    fontSize: rf(10),
    fontWeight: '700',
  },
  textOnTrack: {
    color: colors.green,
  },
  textAtRisk: {
    color: colors.amber,
  },
  textExceeded: {
    color: colors.rose,
  },
  targetBarTrack: {
    height: 8,
    backgroundColor: colors.surfaceRaised,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  targetBarFill: {
    height: '100%',
  },
  targetDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  targetDetailText: {
    fontSize: rf(11),
    color: colors.textSecondary,
  },
  targetProjectedText: {
    fontSize: rf(11),
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  targetEmptyState: {
    paddingVertical: 8,
    gap: 8,
  },
  targetEmptyText: {
    fontSize: rf(12),
    color: colors.textMuted,
  },
  targetSetupAction: {
    alignSelf: 'flex-start',
    backgroundColor: colors.amber,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  targetSetupActionText: {
    color: '#FFFFFF',
    fontSize: rf(12),
    fontWeight: '600',
  },
  chartCard: {
    backgroundColor: colors.panel,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  chartTitle: {
    fontSize: rf(13),
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 14,
  },
  chartScroll: {
    paddingBottom: 4,
  },
  chartBarsArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 140,
    gap: 12,
    paddingHorizontal: 4,
  },
  chartBarCol: {
    alignItems: 'center',
    width: 32,
  },
  chartBarValue: {
    fontSize: rf(9),
    color: colors.textMuted,
    marginBottom: 4,
  },
  chartBarTrack: {
    width: 14,
    height: 95,
    backgroundColor: colors.surfaceRaised,
    borderRadius: 7,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  chartBarFill: {
    width: '100%',
    backgroundColor: colors.green,
    borderRadius: 7,
  },
  chartBarLabel: {
    fontSize: rf(9),
    color: colors.textSecondary,
    marginTop: 6,
  },
  sectionContainer: {
    gap: 10,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: rf(15),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  anomalyCard: {
    backgroundColor: colors.panel,
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: colors.rose,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    gap: 6,
  },
  anomalyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  anomalyVehicle: {
    fontSize: rf(13),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  severityPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  severityHigh: {
    backgroundColor: '#FEE2E2',
  },
  severityMed: {
    backgroundColor: '#FEF3C7',
  },
  severityPillText: {
    fontSize: rf(9),
    fontWeight: '800',
  },
  anomalyReason: {
    fontSize: rf(12),
    color: colors.textPrimary,
  },
  anomalyImpact: {
    fontSize: rf(11),
    color: colors.textMuted,
  },
  vehicleRankCard: {
    flexDirection: 'row',
    backgroundColor: colors.panel,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    gap: 12,
    alignItems: 'center',
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeText: {
    fontSize: rf(13),
    fontWeight: '800',
    color: colors.textPrimary,
  },
  vehicleInfo: {
    flex: 1,
    gap: 4,
  },
  vehicleNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vehicleNameText: {
    fontSize: rf(14),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  ratingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  ratingExcellent: {
    backgroundColor: '#DCFCE7',
  },
  ratingGood: {
    backgroundColor: '#DBEAFE',
  },
  ratingAverage: {
    backgroundColor: '#FEF3C7',
  },
  ratingPoor: {
    backgroundColor: '#FEE2E2',
  },
  ratingBadgeText: {
    fontSize: rf(10),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  vehicleSubText: {
    fontSize: rf(11),
    color: colors.textMuted,
  },
  vehicleMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  vehMetricItem: {
    alignItems: 'flex-start',
  },
  vehMetricLabel: {
    fontSize: rf(10),
    color: colors.textMuted,
  },
  vehMetricValue: {
    fontSize: rf(12),
    fontWeight: '600',
    color: colors.textPrimary,
  },
  executiveSummaryCard: {
    backgroundColor: '#EDE9FE',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  executiveSummaryText: {
    fontSize: rf(12),
    color: '#4C1D95',
    lineHeight: 18,
    fontWeight: '500',
  },
  recommendationCard: {
    backgroundColor: colors.panel,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    gap: 8,
  },
  recHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recPriorityPill: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  recPriorityText: {
    fontSize: rf(9),
    fontWeight: '800',
    color: colors.rose,
  },
  recCategory: {
    fontSize: rf(10),
    fontWeight: '600',
    color: colors.textMuted,
  },
  recTitle: {
    fontSize: rf(14),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  recArea: {
    fontSize: rf(11),
    color: colors.blue,
    fontWeight: '600',
  },
  recSection: {
    gap: 2,
  },
  recSectionLabel: {
    fontSize: rf(10),
    fontWeight: '700',
    color: colors.textMuted,
  },
  recSectionText: {
    fontSize: rf(12),
    color: colors.textPrimary,
    lineHeight: 17,
  },
  savingsBox: {
    flexDirection: 'row',
    backgroundColor: '#DCFCE7',
    borderRadius: 8,
    padding: 10,
    gap: 16,
    marginTop: 4,
  },
  savingsItem: {
    flex: 1,
  },
  savingsLabel: {
    fontSize: rf(10),
    color: '#166534',
  },
  savingsValue: {
    fontSize: rf(13),
    fontWeight: '700',
    color: '#14532D',
  },
  actionLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  actionLinkText: {
    fontSize: rf(12),
    fontWeight: '600',
    color: colors.blue,
  },
  ecoRouteIntroCard: {
    backgroundColor: colors.panel,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    gap: 12,
  },
  ecoRouteIntroText: {
    fontSize: rf(12),
    color: colors.textSecondary,
    lineHeight: 18,
  },
  runEcoSimBtn: {
    backgroundColor: colors.teal,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  runEcoSimBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: rf(13),
  },
  ecoComparisonCard: {
    backgroundColor: colors.panel,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    gap: 12,
    marginTop: 10,
  },
  ecoExplanationTitle: {
    fontSize: rf(11),
    fontWeight: '800',
    color: colors.green,
    letterSpacing: 0.6,
  },
  ecoExplanationText: {
    fontSize: rf(13),
    color: colors.textPrimary,
    lineHeight: 19,
  },
  ecoSavingsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  ecoSavingsBox: {
    flex: 1,
    backgroundColor: '#DCFCE7',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  ecoSavingsLabel: {
    fontSize: rf(10),
    color: '#166534',
  },
  ecoSavingsVal: {
    fontSize: rf(14),
    fontWeight: '800',
    color: '#14532D',
    marginTop: 2,
  },
  candidateHeader: {
    fontSize: rf(12),
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 4,
  },
  routeCandidateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: colors.surfaceRaised,
    borderRadius: 10,
    alignItems: 'center',
  },
  routeCandidateGreenest: {
    borderWidth: 1.5,
    borderColor: colors.green,
    backgroundColor: '#F0FDF4',
  },
  candidateLeft: {
    flex: 1,
    gap: 2,
  },
  candidateLabel: {
    fontSize: rf(13),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  candidateSub: {
    fontSize: rf(11),
    color: colors.textMuted,
  },
  candidateRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  candidateCo2: {
    fontSize: rf(13),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  greenestPill: {
    backgroundColor: colors.green,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  greenestPillText: {
    fontSize: rf(9),
    color: '#fff',
    fontWeight: '800',
  },
  emptyNote: {
    fontSize: rf(12),
    color: colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: colors.panel,
    borderRadius: 16,
    padding: 20,
    gap: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: rf(16),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  inputLabel: {
    fontSize: rf(12),
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 4,
  },
  modalInput: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: rf(14),
    color: colors.textPrimary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: rf(13),
    color: colors.textSecondary,
    fontWeight: '600',
  },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.green,
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: rf(13),
    color: '#FFFFFF',
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
