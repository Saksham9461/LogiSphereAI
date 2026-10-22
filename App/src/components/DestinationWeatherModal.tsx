import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
  CloudSun,
  Sun,
  Cloud,
  CloudRain,
  CloudLightning,
  CloudDrizzle,
  CloudFog,
  Snowflake,
  Wind,
  Droplets,
  Eye,
  Thermometer,
  MapPin,
  RefreshCw,
  AlertTriangle,
  Info,
  ShieldAlert,
  WifiOff,
  CheckCircle2,
} from 'lucide-react-native';
import client from '../api/axiosClient';
import { GetDestinationWeather } from '../api/apiPath';
import { colors } from '../theme/colors';
import { rf } from '../theme/responsive';
import {
  buildWeatherStorageKey,
  getMobileCachedWeather,
  saveMobileCachedWeather,
  coalesceMobileWeatherRequest,
} from '../utils/weatherCache';

export interface DestinationWeatherModalProps {
  visible: boolean;
  trip: any | null;
  onClose: () => void;
}

interface NormalizedWeatherClient {
  locationName: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  condition: {
    main: string;
    description: string;
    icon: string;
    iconCategory: string;
  };
  temperature: {
    current: number;
    feelsLike: number;
    tempMin?: number;
    tempMax?: number;
  };
  humidity: number;
  windSpeedKmh: number;
  windSpeedMs: number;
  windDirectionDeg?: number;
  visibilityKm: number | null;
  precipitationMm: number | null;
  hasPrecipitation: boolean;
  advisory: {
    severity: 'NORMAL' | 'ADVISORY' | 'WARNING' | 'ALERT';
    message: string;
  };
  lastUpdated: string;
  isCached: boolean;
  isStale: boolean;
  dataSource: 'openweather' | 'cache_fallback';
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_HEIGHT = Math.min(Math.round(SCREEN_HEIGHT * 0.82), 680);

const SEVERITY_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string; pillColor: string }
> = {
  NORMAL: {
    label: 'Normal Conditions',
    color: '#16a34a',
    bg: 'rgba(22, 163, 74, 0.08)',
    border: 'rgba(22, 163, 74, 0.25)',
    pillColor: '#16a34a',
  },
  ADVISORY: {
    label: 'Weather Advisory',
    color: '#0284c7',
    bg: 'rgba(2, 132, 199, 0.08)',
    border: 'rgba(2, 132, 199, 0.25)',
    pillColor: '#0284c7',
  },
  WARNING: {
    label: 'Caution Recommended',
    color: '#d97706',
    bg: 'rgba(245, 158, 11, 0.1)',
    border: 'rgba(245, 158, 11, 0.3)',
    pillColor: '#d97706',
  },
  ALERT: {
    label: 'Severe Weather Alert',
    color: '#dc2626',
    bg: 'rgba(239, 68, 68, 0.08)',
    border: 'rgba(239, 68, 68, 0.25)',
    pillColor: '#dc2626',
  },
};

export default function DestinationWeatherModal({
  visible,
  trip,
  onClose,
}: DestinationWeatherModalProps) {
  const [data, setData] = useState<NormalizedWeatherClient | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOfflineCached, setIsOfflineCached] = useState(false);
  const [lastUpdatedDisplay, setLastUpdatedDisplay] = useState<string>('');

  const tripId = useMemo(() => {
    if (!trip) return null;
    return String(trip.tripID || trip.tripid || trip.id || '').trim();
  }, [trip]);

  const destinationName = useMemo(() => {
    return trip?.destination || trip?.dropLocation || 'Destination';
  }, [trip]);

  const destLat = useMemo(() => {
    const lat = Number(trip?.destinationLatitude ?? trip?.destinationlatitude);
    return isNaN(lat) ? null : lat;
  }, [trip]);

  const destLon = useMemo(() => {
    const lon = Number(trip?.destinationLongitude ?? trip?.destinationlongitude);
    return isNaN(lon) ? null : lon;
  }, [trip]);

  const storageKey = useMemo(() => {
    return buildWeatherStorageKey(tripId, destLat, destLon);
  }, [tripId, destLat, destLon]);

  const formatTimestamp = (isoString?: string): string => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const fetchWeather = useCallback(
    async (isManualRefresh = false) => {
      if (!tripId && destLat === null) {
        setError('Destination coordinates unavailable for this trip.');
        return;
      }

      if (isManualRefresh) {
        setRefreshing(true);
      } else if (!data) {
        setLoading(true);
      }

      setError(null);

      // 1. Try mobile cache first for instantaneous rendering
      if (!isManualRefresh) {
        try {
          const cachedResult = await getMobileCachedWeather(storageKey);
          if (cachedResult && cachedResult.cached.data) {
            setData(cachedResult.cached.data);
            setIsOfflineCached(Boolean(cachedResult.cached.isOffline));
            setLastUpdatedDisplay(formatTimestamp(cachedResult.cached.data.lastUpdated));

            // If local cache is still fresh (< 10 min), we can display without waiting for network
            if (cachedResult.isFresh) {
              setLoading(false);
              return;
            }
          }
        } catch {
          // Non-blocking mobile cache read
        }
      }

      // 2. Coalesce network fetch to avoid double-requesting
      try {
        const cleanTripId = tripId ? tripId.replace(/^#/, '') : '';
        const endpoint = GetDestinationWeather(cleanTripId, destLat, destLon);

        const response = await coalesceMobileWeatherRequest(storageKey, async () => {
          return await client.get(endpoint);
        });

        if (response?.data?.success && response.data.data) {
          const freshData: NormalizedWeatherClient = response.data.data;
          setData(freshData);
          setIsOfflineCached(false);
          setLastUpdatedDisplay(formatTimestamp(freshData.lastUpdated));

          // Save fresh response into mobile storage
          saveMobileCachedWeather(storageKey, freshData).catch(() => {});
        } else {
          throw new Error(response?.data?.message || 'Could not load destination weather.');
        }
      } catch (err: any) {
        const message =
          err?.response?.data?.message ||
          err?.message ||
          'Failed to retrieve destination weather.';

        // If we already have cached data in memory or storage, keep showing it with offline badge
        if (data) {
          setIsOfflineCached(true);
        } else {
          // Attempt last-resort stale read from AsyncStorage
          const staleFallback = await getMobileCachedWeather(storageKey);
          if (staleFallback && staleFallback.cached.data) {
            setData(staleFallback.cached.data);
            setIsOfflineCached(true);
            setLastUpdatedDisplay(formatTimestamp(staleFallback.cached.data.lastUpdated));
          } else {
            setError(message);
          }
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [tripId, destLat, destLon, storageKey, data]
  );

  useEffect(() => {
    if (visible && (tripId || destLat !== null)) {
      fetchWeather(false);
    } else {
      setData(null);
      setError(null);
      setIsOfflineCached(false);
      setLoading(false);
      setRefreshing(false);
    }
  }, [visible, tripId]);

  const severity = data
    ? SEVERITY_CONFIG[data.advisory?.severity] || SEVERITY_CONFIG.NORMAL
    : SEVERITY_CONFIG.NORMAL;

  const renderWeatherIcon = (category: string, size = 32) => {
    switch (category) {
      case 'clear':
        return <Sun size={size} color="#f59e0b" />;
      case 'clouds':
        return <Cloud size={size} color="#38bdf8" />;
      case 'rain':
        return <CloudRain size={size} color="#0284c7" />;
      case 'drizzle':
        return <CloudDrizzle size={size} color="#38bdf8" />;
      case 'thunderstorm':
        return <CloudLightning size={size} color="#eab308" />;
      case 'snow':
        return <Snowflake size={size} color="#93c5fd" />;
      case 'mist':
        return <CloudFog size={size} color="#94a3b8" />;
      default:
        return <CloudSun size={size} color="#38bdf8" />;
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* HEADER (Reuses TripDelayInsightsModal structure & aesthetics) */}
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <View style={styles.headerIconWrap}>
                <CloudSun size={18} color={colors.blue} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  Destination Weather
                </Text>
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  {destinationName} • {tripId || 'Transit'}
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
              <ActivityIndicator size="large" color={colors.blue} />
              <Text style={styles.loaderText}>
                Fetching destination meteorological telemetry...
              </Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <AlertTriangle size={36} color={colors.rose} />
              <Text style={styles.errorText}>{error}</Text>
              <Pressable style={styles.retryBtn} onPress={() => fetchWeather(true)}>
                <RefreshCw size={14} color="#1a1200" />
                <Text style={styles.retryBtnText}>Retry Weather</Text>
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
              {/* ADVISORY & CONDITION BANNER (Consistent with AI Delay riskBanner pattern) */}
              <View
                style={[
                  styles.riskBanner,
                  { backgroundColor: severity.bg, borderColor: severity.border },
                ]}
              >
                <View style={styles.riskBannerTop}>
                  <View style={styles.riskTitleWrap}>
                    <View style={[styles.statusDot, { backgroundColor: severity.color }]} />
                    <Text style={[styles.riskTitle, { color: severity.color }]}>
                      {severity.label}
                    </Text>
                  </View>

                  {/* Freshness Badge */}
                  <View style={styles.confidencePill}>
                    {isOfflineCached ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <WifiOff size={10} color="#d97706" />
                        <Text style={[styles.confidencePillText, { color: '#d97706' }]}>
                          OFFLINE DATA
                        </Text>
                      </View>
                    ) : data.isStale ? (
                      <Text style={[styles.confidencePillText, { color: '#d97706' }]}>
                        CACHED (STALE)
                      </Text>
                    ) : data.isCached ? (
                      <Text style={[styles.confidencePillText, { color: '#0284c7' }]}>
                        CACHED
                      </Text>
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <View style={[styles.liveDot, { backgroundColor: '#16a34a' }]} />
                        <Text style={[styles.confidencePillText, { color: '#16a34a' }]}>
                          LIVE WEATHER
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Deterministic Safety Advisory */}
                <Text style={styles.advisoryMessageText}>
                  {data.advisory?.message || 'Weather advisory unavailable.'}
                </Text>
              </View>

              {/* PRIMARY WEATHER METRICS (Visually matching etaCard) */}
              <View style={styles.weatherCard}>
                <View style={styles.weatherConditionCol}>
                  <View style={styles.conditionIconWrap}>
                    {renderWeatherIcon(data.condition.iconCategory, 36)}
                  </View>
                  <Text style={styles.conditionMainText}>{data.condition.main}</Text>
                  <Text style={styles.conditionDescText}>
                    {data.condition.description.charAt(0).toUpperCase() +
                      data.condition.description.slice(1)}
                  </Text>
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.tempCol}>
                  <Text style={styles.tempCurrentText}>
                    {Math.round(data.temperature.current)}°C
                  </Text>
                  <Text style={styles.tempFeelsLikeText}>
                    Feels like {Math.round(data.temperature.feelsLike)}°C
                  </Text>
                  {data.temperature.tempMin !== undefined &&
                  data.temperature.tempMax !== undefined ? (
                    <Text style={styles.tempRangeText}>
                      H: {Math.round(data.temperature.tempMax)}° • L:{' '}
                      {Math.round(data.temperature.tempMin)}°
                    </Text>
                  ) : null}
                </View>
              </View>

              {/* ENVIRONMENTAL TELEMETRY GRID (Matches telemetryCard style) */}
              <View style={styles.telemetryCard}>
                <View style={styles.progressHeader}>
                  <Text style={styles.sectionHeaderTitle}>ENVIRONMENTAL TELEMETRY</Text>
                  <Pressable
                    onPress={() => fetchWeather(true)}
                    disabled={refreshing}
                    hitSlop={8}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  >
                    <RefreshCw
                      size={12}
                      color={colors.blue}
                      style={refreshing ? { transform: [{ rotate: '45deg' }] } : undefined}
                    />
                    <Text style={{ fontSize: rf(11), color: colors.blue, fontWeight: '700' }}>
                      {refreshing ? 'Refreshing...' : 'Refresh'}
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.metricsGrid}>
                  {/* Humidity */}
                  <View style={styles.metricItem}>
                    <View style={styles.metricIconBox}>
                      <Droplets size={16} color="#0284c7" />
                    </View>
                    <View>
                      <Text style={styles.metricLabel}>Humidity</Text>
                      <Text style={styles.metricValue}>{data.humidity}%</Text>
                    </View>
                  </View>

                  {/* Wind Speed */}
                  <View style={styles.metricItem}>
                    <View style={styles.metricIconBox}>
                      <Wind size={16} color="#0ea5e9" />
                    </View>
                    <View>
                      <Text style={styles.metricLabel}>Wind Speed</Text>
                      <Text style={styles.metricValue}>{data.windSpeedKmh} km/h</Text>
                    </View>
                  </View>

                  {/* Visibility */}
                  <View style={styles.metricItem}>
                    <View style={styles.metricIconBox}>
                      <Eye size={16} color="#8b5cf6" />
                    </View>
                    <View>
                      <Text style={styles.metricLabel}>Visibility</Text>
                      <Text style={styles.metricValue}>
                        {data.visibilityKm !== null ? `${data.visibilityKm} km` : 'Standard'}
                      </Text>
                    </View>
                  </View>

                  {/* Precipitation */}
                  <View style={styles.metricItem}>
                    <View style={styles.metricIconBox}>
                      <CloudRain
                        size={16}
                        color={data.hasPrecipitation ? '#0284c7' : colors.textMuted}
                      />
                    </View>
                    <View>
                      <Text style={styles.metricLabel}>Rain / Precip</Text>
                      <Text style={styles.metricValue}>
                        {data.precipitationMm !== null
                          ? `${data.precipitationMm} mm`
                          : data.hasPrecipitation
                          ? 'Active'
                          : '0.0 mm'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* DESTINATION LOCATION CARD (Matches routeBox style) */}
              <View style={styles.routeBox}>
                <View style={styles.routeItem}>
                  <MapPin size={16} color={colors.amber} />
                  <Text style={styles.routeText} numberOfLines={1}>
                    Destination:{' '}
                    <Text style={styles.boldText}>{destinationName}</Text>
                  </Text>
                </View>
                <View style={{ paddingLeft: rf(24) }}>
                  <Text style={styles.coordSubText}>
                    GPS: {data.coordinates.latitude.toFixed(4)},{' '}
                    {data.coordinates.longitude.toFixed(4)}
                  </Text>
                  {lastUpdatedDisplay ? (
                    <Text style={styles.timestampSubText}>
                      {isOfflineCached ? 'Offline data — ' : ''}Last updated at{' '}
                      {lastUpdatedDisplay}
                    </Text>
                  ) : null}
                </View>
              </View>
            </ScrollView>
          ) : null}
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
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
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
    gap: rf(8),
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
    width: rf(8),
    height: rf(8),
    borderRadius: rf(4),
  },
  liveDot: {
    width: rf(6),
    height: rf(6),
    borderRadius: rf(3),
  },
  riskTitle: {
    fontSize: rf(13),
    fontWeight: '800',
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
    letterSpacing: 0.5,
  },
  advisoryMessageText: {
    fontSize: rf(12),
    color: colors.textSecondary,
    lineHeight: rf(17),
    fontWeight: '500',
  },
  weatherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: rf(12),
    padding: rf(14),
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  weatherConditionCol: {
    flex: 1,
    alignItems: 'center',
  },
  conditionIconWrap: {
    marginBottom: rf(4),
  },
  conditionMainText: {
    fontSize: rf(14),
    fontWeight: '800',
    color: colors.textPrimary,
  },
  conditionDescText: {
    fontSize: rf(11),
    color: colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  cardDivider: {
    width: 1,
    height: '75%',
    backgroundColor: colors.borderSoft,
    marginHorizontal: rf(8),
  },
  tempCol: {
    flex: 1,
    alignItems: 'center',
  },
  tempCurrentText: {
    fontSize: rf(28),
    fontWeight: '900',
    color: colors.textPrimary,
    lineHeight: rf(32),
  },
  tempFeelsLikeText: {
    fontSize: rf(11),
    color: colors.textSecondary,
    marginTop: rf(2),
    fontWeight: '600',
  },
  tempRangeText: {
    fontSize: rf(10),
    color: colors.textMuted,
    marginTop: rf(3),
  },
  telemetryCard: {
    backgroundColor: colors.surface,
    borderRadius: rf(12),
    padding: rf(14),
    borderWidth: 1,
    borderColor: colors.borderSoft,
    gap: rf(12),
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
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rf(10),
  },
  metricItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: rf(8),
    backgroundColor: colors.panel,
    padding: rf(10),
    borderRadius: rf(10),
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  metricIconBox: {
    width: rf(30),
    height: rf(30),
    borderRadius: rf(8),
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    justifyContent: 'center',
    alignItems: 'center',
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
    marginTop: 1,
  },
  routeBox: {
    backgroundColor: colors.surface,
    borderRadius: rf(12),
    padding: rf(12),
    gap: rf(6),
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
  coordSubText: {
    fontSize: rf(10),
    color: colors.textMuted,
    fontWeight: '500',
  },
  timestampSubText: {
    fontSize: rf(10),
    color: colors.textMuted,
    marginTop: 2,
    fontStyle: 'italic',
  },
});
