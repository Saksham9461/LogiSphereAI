import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import {
  X,
  Sparkles,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Navigation,
  Gauge,
  Radio,
  MapPin,
  RefreshCw,
  ShieldAlert,
  Info,
} from 'lucide-react-native';
import client from '../api/axiosClient';
import { GetTripDelayInsights } from '../api/apiPath';
import { colors } from '../theme/colors';
import { rf } from '../theme/responsive';

export interface DelayInsightData {
  tripID: string;
  vehicleID: string;
  vehicleName: string;
  driverID: string;
  driverName: string;
  source: string;
  destination: string;
  tripStatus: string;
  isActive: boolean;
  isTerminal: boolean;
  plannedETA: string;
  estimatedArrivalAt: string;
  predictedDelayMinutes: number;
  delayRisk: 'ON_TIME' | 'LOW_RISK' | 'MODERATE_RISK' | 'HIGH_RISK';
  telemetry: {
    latitude: number | null;
    longitude: number | null;
    currentSpeedKmH: number;
    lastLocationUpdate: string | null;
    freshness: 'LIVE' | 'UPDATING' | 'STALE' | 'NO_SIGNAL';
    distanceRemainingKm: number;
    totalPlannedDistanceKm: number;
    percentCompleted: number;
  };
  reasonCodes: (
    | 'ON_SCHEDULE'
    | 'ROUTE_DEVIATION'
    | 'SLOWER_THAN_EXPECTED_PROGRESS'
    | 'PROLONGED_STOP'
    | 'STALE_LOCATION'
    | 'INSUFFICIENT_DATA'
    | 'TRIP_COMPLETED'
    | 'TRIP_CANCELLED'
  )[];
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  dataQualityIndicator: string;
  aiExplanation: {
    source: 'gemini-1.5-flash' | 'deterministic_fallback';
    explanation: string;
    actionableRecommendations: string[];
    operationalImpact: string;
  };
}

interface TripDelayInsightsModalProps {
  visible: boolean;
  tripId: string | null;
  onClose: () => void;
}

const RISK_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  ON_TIME: {
    label: 'On Schedule',
    color: '#16a34a',
    bg: 'rgba(22, 163, 74, 0.08)',
    border: 'rgba(22, 163, 74, 0.25)',
  },
  LOW_RISK: {
    label: 'Minor Delay Risk',
    color: '#0284c7',
    bg: 'rgba(2, 132, 199, 0.08)',
    border: 'rgba(2, 132, 199, 0.25)',
  },
  MODERATE_RISK: {
    label: 'Moderate Delay Risk',
    color: '#d97706',
    bg: 'rgba(245, 158, 11, 0.1)',
    border: 'rgba(245, 158, 11, 0.3)',
  },
  HIGH_RISK: {
    label: 'Critical Delay Risk',
    color: '#dc2626',
    bg: 'rgba(239, 68, 68, 0.08)',
    border: 'rgba(239, 68, 68, 0.25)',
  },
};

const REASON_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  ON_SCHEDULE: { label: 'On Expected Pace', color: '#16a34a', bg: 'rgba(22, 163, 74, 0.08)' },
  ROUTE_DEVIATION: { label: 'Corridor Deviation (>12km)', color: '#d97706', bg: 'rgba(245, 158, 11, 0.08)' },
  SLOWER_THAN_EXPECTED_PROGRESS: { label: 'Slower Than Expected Pace', color: '#d97706', bg: 'rgba(245, 158, 11, 0.08)' },
  PROLONGED_STOP: { label: 'Prolonged Stationary Stop', color: '#dc2626', bg: 'rgba(239, 68, 68, 0.08)' },
  STALE_LOCATION: { label: 'Intermittent GPS Signal', color: '#6b7280', bg: 'rgba(107, 114, 128, 0.08)' },
  INSUFFICIENT_DATA: { label: 'Insufficient GPS Fix', color: '#6b7280', bg: 'rgba(107, 114, 128, 0.08)' },
  TRIP_COMPLETED: { label: 'Trip Delivered', color: '#16a34a', bg: 'rgba(22, 163, 74, 0.08)' },
  TRIP_CANCELLED: { label: 'Trip Cancelled', color: '#dc2626', bg: 'rgba(239, 68, 68, 0.08)' },
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_HEIGHT = Math.min(Math.round(SCREEN_HEIGHT * 0.82), 680);

export default function TripDelayInsightsModal({
  visible,
  tripId,
  onClose,
}: TripDelayInsightsModalProps) {
  const [data, setData] = useState<DelayInsightData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = useCallback(async () => {
    if (!tripId) return;
    try {
      setError(null);
      const res = await client.get(GetTripDelayInsights(tripId));
      if (res?.data?.success && res.data.data) {
        setData(res.data.data);
      } else {
        setError(res?.data?.message || 'Could not load delay insights.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to fetch delay insights.');
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    if (visible && tripId) {
      setLoading(true);
      fetchInsights();
    } else {
      setData(null);
      setError(null);
    }
  }, [visible, tripId, fetchInsights]);

  const formatTime = (isoString?: string) => {
    if (!isoString) return '--:--';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '--:--';
    }
  };

  const risk = data ? RISK_CONFIG[data.delayRisk] || RISK_CONFIG.ON_TIME : RISK_CONFIG.ON_TIME;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* HEADER */}
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <View style={styles.headerIconWrap}>
                <Sparkles size={16} color={colors.amber} />
              </View>
              <View>
                <Text style={styles.headerTitle}>AI Delay Prediction</Text>
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  {tripId} • {data?.vehicleName || 'Fleet Transit'}
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
              <X size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* BODY */}
          {loading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color={colors.amber} />
              <Text style={styles.loaderText}>Analyzing live GPS telemetry & schedule...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <AlertTriangle size={36} color={colors.rose} />
              <Text style={styles.errorText}>{error}</Text>
              <Pressable style={styles.retryBtn} onPress={fetchInsights}>
                <RefreshCw size={14} color="#1a1200" />
                <Text style={styles.retryBtnText}>Retry Analysis</Text>
              </Pressable>
            </View>
          ) : data ? (
            <ScrollView
              style={styles.scrollContainer}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              bounces={false}
              overScrollMode="never"
            >
              {/* STATUS & RISK BANNER */}
              <View style={[styles.riskBanner, { backgroundColor: risk.bg, borderColor: risk.border }]}>
                <View style={styles.riskBannerTop}>
                  <View style={styles.riskTitleWrap}>
                    <View style={[styles.statusDot, { backgroundColor: risk.color }]} />
                    <Text style={[styles.riskTitle, { color: risk.color }]}>{risk.label}</Text>
                  </View>
                  <View style={styles.confidencePill}>
                    <Text style={styles.confidencePillText}>
                      {data.confidence} CONFIDENCE
                    </Text>
                  </View>
                </View>

                <Text style={styles.riskSubtitle}>
                  {data.predictedDelayMinutes > 0
                    ? `Estimated delay: ~${data.predictedDelayMinutes} min`
                    : 'On track with planned transit duration'}
                </Text>
              </View>

              {/* ROUTE OVERVIEW */}
              <View style={styles.routeBox}>
                <View style={styles.routeItem}>
                  <MapPin size={14} color={colors.amber} />
                  <Text style={styles.routeText} numberOfLines={1}>
                    From: <Text style={styles.boldText}>{data.source}</Text>
                  </Text>
                </View>
                <View style={styles.routeItem}>
                  <Navigation size={14} color={colors.green} />
                  <Text style={styles.routeText} numberOfLines={1}>
                    To: <Text style={styles.boldText}>{data.destination}</Text>
                  </Text>
                </View>
              </View>

              {/* ETA TIMELINE COMPARISON */}
              <View style={styles.etaCard}>
                <View style={styles.etaCol}>
                  <Text style={styles.etaLabel}>Planned ETA</Text>
                  <Text style={styles.etaValue}>{formatTime(data.plannedETA)}</Text>
                  <Text style={styles.etaSub}>Original Schedule</Text>
                </View>

                <View style={styles.etaDivider}>
                  <Clock size={16} color={data.predictedDelayMinutes > 15 ? colors.rose : colors.amber} />
                  {data.predictedDelayMinutes > 0 ? (
                    <Text style={[styles.delayBadge, { color: risk.color }]}>
                      +{data.predictedDelayMinutes}m
                    </Text>
                  ) : (
                    <Text style={[styles.delayBadge, { color: colors.green }]}>On Time</Text>
                  )}
                </View>

                <View style={styles.etaCol}>
                  <Text style={styles.etaLabel}>Revised ETA</Text>
                  <Text style={[styles.etaValue, { color: data.predictedDelayMinutes > 15 ? colors.rose : colors.textPrimary }]}>
                    {formatTime(data.estimatedArrivalAt)}
                  </Text>
                  <Text style={styles.etaSub}>AI Recalculated</Text>
                </View>
              </View>

              {/* PROGRESS & TELEMETRY */}
              <View style={styles.telemetryCard}>
                <View style={styles.progressHeader}>
                  <Text style={styles.sectionHeaderTitle}>Transit Corridor Progress</Text>
                  <Text style={styles.percentText}>{data.telemetry.percentCompleted}%</Text>
                </View>

                {/* Progress Bar */}
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min(100, Math.max(3, data.telemetry.percentCompleted))}%`,
                        backgroundColor: data.predictedDelayMinutes > 30 ? colors.rose : colors.amber,
                      },
                    ]}
                  />
                </View>

                {/* Metrics Grid */}
                <View style={styles.metricsGrid}>
                  <View style={styles.metricItem}>
                    <Gauge size={13} color={colors.blue} />
                    <Text style={styles.metricLabel}>Speed</Text>
                    <Text style={styles.metricValue}>
                      {Math.round(data.telemetry.currentSpeedKmH)} km/h
                    </Text>
                  </View>

                  <View style={styles.metricItem}>
                    <Navigation size={13} color={colors.amber} />
                    <Text style={styles.metricLabel}>Remaining</Text>
                    <Text style={styles.metricValue}>
                      {data.telemetry.distanceRemainingKm} km
                    </Text>
                  </View>

                  <View style={styles.metricItem}>
                    <Radio size={13} color={data.telemetry.freshness === 'LIVE' ? colors.green : colors.textSecondary} />
                    <Text style={styles.metricLabel}>Signal</Text>
                    <Text style={[styles.metricValue, { fontSize: rf(11) }]}>
                      {data.telemetry.freshness}
                    </Text>
                  </View>
                </View>
              </View>

              {/* REASON CODES */}
              <View style={styles.reasonsSection}>
                <Text style={styles.sectionHeaderTitle}>Detected Delay Factors</Text>
                <View style={styles.reasonBadgeWrap}>
                  {data.reasonCodes.map((code) => {
                    const rCfg = REASON_LABELS[code] || { label: code, color: colors.textSecondary, bg: 'rgba(107, 114, 128, 0.08)' };
                    return (
                      <View key={code} style={[styles.reasonBadge, { borderColor: rCfg.color, backgroundColor: rCfg.bg }]}>
                        <View style={[styles.reasonDot, { backgroundColor: rCfg.color }]} />
                        <Text style={[styles.reasonBadgeText, { color: rCfg.color }]}>
                          {rCfg.label}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* GEMINI AI OPERATIONAL RECOMMENDATIONS */}
              <View style={styles.aiGuidanceCard}>
                <View style={styles.aiCardHeader}>
                  <View style={styles.aiCardHeaderLeft}>
                    <Sparkles size={16} color={colors.amber} />
                    <Text style={styles.aiCardTitle}>AI Operational Guidance</Text>
                  </View>
                  <View style={styles.advisoryPill}>
                    <Text style={styles.advisoryPillText}>ADVISORY ONLY</Text>
                  </View>
                </View>

                <Text style={styles.aiExplanationText}>
                  {data.aiExplanation.explanation}
                </Text>

                <Text style={styles.recommendationsTitle}>Actionable Dispatcher Recommendations:</Text>
                {data.aiExplanation.actionableRecommendations.map((rec, idx) => (
                  <View key={idx} style={styles.recItem}>
                    <CheckCircle2 size={13} color={colors.amber} style={{ marginTop: 2 }} />
                    <Text style={styles.recText}>{rec}</Text>
                  </View>
                ))}

                {data.aiExplanation.operationalImpact ? (
                  <View style={styles.impactBox}>
                    <Info size={12} color={colors.textSecondary} />
                    <Text style={styles.impactText}>
                      Impact: {data.aiExplanation.operationalImpact}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* DATA QUALITY FOOTNOTE */}
              <Text style={styles.dataQualityNote}>
                {data.dataQualityIndicator} Predictions are calculated server-side from live GPS and planned transit schedule.
              </Text>
            </ScrollView>
          ) : null}

          {/* FOOTER CLOSE BUTTON */}
          <View style={styles.footer}>
            <Pressable style={styles.footerCloseBtn} onPress={onClose}>
              <Text style={styles.footerCloseBtnText}>Dismiss</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: rf(16),
  },
  modalCard: {
    backgroundColor: colors.panel,
    borderRadius: rf(16),
    borderWidth: 1,
    borderColor: colors.borderSoft,
    width: '100%',
    height: MODAL_HEIGHT,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: rf(18),
    paddingVertical: rf(14),
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    backgroundColor: colors.panel,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rf(10),
    flex: 1,
  },
  headerIconWrap: {
    width: rf(34),
    height: rf(34),
    borderRadius: rf(10),
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: rf(15),
    fontWeight: '800',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: rf(12),
    color: colors.textSecondary,
    marginTop: 1,
  },
  closeBtn: {
    padding: rf(4),
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: rf(12),
    paddingHorizontal: rf(24),
  },
  loaderText: {
    fontSize: rf(13),
    color: colors.textSecondary,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: rf(12),
    margin: rf(16),
    paddingHorizontal: rf(20),
    backgroundColor: 'rgba(239, 68, 68, 0.04)',
    borderRadius: rf(12),
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorText: {
    fontSize: rf(13),
    color: colors.rose,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: rf(18),
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rf(6),
    backgroundColor: colors.amber,
    paddingHorizontal: rf(18),
    paddingVertical: rf(10),
    borderRadius: rf(10),
    marginTop: rf(4),
  },
  retryBtnText: {
    fontSize: rf(13),
    fontWeight: '800',
    color: '#1a1200',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: rf(16),
    gap: rf(14),
  },
  riskBanner: {
    padding: rf(14),
    borderRadius: rf(12),
    borderWidth: 1,
    gap: rf(6),
  },
  riskBannerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: rf(8),
  },
  riskTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rf(8),
    flex: 1,
  },
  statusDot: {
    width: rf(10),
    height: rf(10),
    borderRadius: rf(5),
  },
  riskTitle: {
    fontSize: rf(14),
    fontWeight: '800',
  },
  riskSubtitle: {
    fontSize: rf(12),
    color: colors.textSecondary,
    paddingLeft: rf(18),
    lineHeight: rf(16),
  },
  confidencePill: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    paddingHorizontal: rf(8),
    paddingVertical: rf(4),
    borderRadius: rf(6),
    flexShrink: 0,
  },
  confidencePillText: {
    fontSize: rf(9),
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  routeBox: {
    backgroundColor: colors.surface,
    borderRadius: rf(12),
    padding: rf(12),
    gap: rf(8),
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rf(8),
  },
  routeText: {
    fontSize: rf(12),
    color: colors.textSecondary,
    flex: 1,
  },
  boldText: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  etaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: rf(12),
    padding: rf(14),
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  etaCol: {
    flex: 1,
    alignItems: 'center',
  },
  etaLabel: {
    fontSize: rf(11),
    color: colors.textMuted,
    marginBottom: rf(2),
    fontWeight: '600',
  },
  etaValue: {
    fontSize: rf(17),
    fontWeight: '800',
    color: colors.textPrimary,
  },
  etaSub: {
    fontSize: rf(10),
    color: colors.textSecondary,
    marginTop: rf(2),
  },
  etaDivider: {
    alignItems: 'center',
    paddingHorizontal: rf(8),
    gap: rf(2),
  },
  delayBadge: {
    fontSize: rf(11),
    fontWeight: '800',
  },
  telemetryCard: {
    backgroundColor: colors.surface,
    borderRadius: rf(12),
    padding: rf(14),
    borderWidth: 1,
    borderColor: colors.borderSoft,
    gap: rf(10),
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionHeaderTitle: {
    fontSize: rf(12),
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  percentText: {
    fontSize: rf(13),
    fontWeight: '800',
    color: colors.amber,
  },
  progressBarBg: {
    height: rf(6),
    backgroundColor: colors.borderSoft,
    borderRadius: rf(3),
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: rf(3),
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: rf(8),
    marginTop: rf(4),
  },
  metricItem: {
    flex: 1,
    backgroundColor: colors.panel,
    padding: rf(8),
    borderRadius: rf(8),
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: 'center',
    gap: rf(2),
  },
  metricLabel: {
    fontSize: rf(10),
    color: colors.textMuted,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: rf(12),
    fontWeight: '800',
    color: colors.textPrimary,
  },
  reasonsSection: {
    gap: rf(8),
  },
  reasonBadgeWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rf(6),
  },
  reasonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rf(6),
    borderWidth: 1,
    paddingHorizontal: rf(10),
    paddingVertical: rf(5),
    borderRadius: rf(20),
  },
  reasonDot: {
    width: rf(6),
    height: rf(6),
    borderRadius: rf(3),
  },
  reasonBadgeText: {
    fontSize: rf(11),
    fontWeight: '700',
  },
  aiGuidanceCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: rf(12),
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    padding: rf(14),
    gap: rf(10),
  },
  aiCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aiCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rf(6),
  },
  aiCardTitle: {
    fontSize: rf(13),
    fontWeight: '800',
    color: '#B45309',
  },
  advisoryPill: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: rf(6),
    paddingVertical: rf(2),
    borderRadius: rf(4),
  },
  advisoryPillText: {
    fontSize: rf(8),
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.5,
  },
  aiExplanationText: {
    fontSize: rf(12),
    color: colors.textPrimary,
    lineHeight: rf(17),
  },
  recommendationsTitle: {
    fontSize: rf(11),
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: rf(2),
  },
  recItem: {
    flexDirection: 'row',
    gap: rf(6),
    alignItems: 'flex-start',
  },
  recText: {
    fontSize: rf(11),
    color: colors.textSecondary,
    flex: 1,
    lineHeight: rf(16),
  },
  impactBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rf(6),
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    padding: rf(8),
    borderRadius: rf(8),
    marginTop: rf(4),
  },
  impactText: {
    fontSize: rf(10),
    color: colors.textSecondary,
    flex: 1,
  },
  dataQualityNote: {
    fontSize: rf(10),
    color: colors.textMuted,
    lineHeight: rf(14),
    textAlign: 'center',
    paddingHorizontal: rf(12),
  },
  footer: {
    padding: rf(14),
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  footerCloseBtn: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: rf(10),
    paddingVertical: rf(11),
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerCloseBtnText: {
    fontSize: rf(13),
    fontWeight: '700',
    color: colors.textSecondary,
  },
});
