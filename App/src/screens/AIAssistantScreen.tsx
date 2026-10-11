import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Sparkles,
  ArrowUp,
  MapPin,
  Truck,
  RotateCcw,
  Navigation,
  CircleAlert,
  Radio,
  Clock,
  Layers,
  Mic,
  MicOff,
} from 'lucide-react-native';
import { colors } from '../theme/colors';
import { rf } from '../theme/responsive';
import useAuthStore from '../store/AuthStore';
import {
  FleetAiResponse,
  AiAction,
  AiConversationContext,
  queryFleetAi,
} from '../services/fleetAiService';

interface ChatMessage {
  id: string;
  isUser: boolean;
  text: string;
  response?: FleetAiResponse;
  timestamp: string;
  isError?: boolean;
  failedQuery?: string;
}

// Manager & Dispatcher quick action catalogue (10 fleet-specific operations)
const MANAGER_PRIMARY_CHIPS = [
  '🚚 Show active vehicles',
  "🛣️ Today's trip summary",
  '📍 Track a vehicle',
  '⏱️ Driver attendance',
];

const MANAGER_MORE_CHIPS = [
  '🔧 Upcoming maintenance',
  '⛽ Fuel & expenses',
  '📊 Driver performance',
  '🚨 Fleet alerts',
  '🛣️ Route intelligence',
  '📋 Ask about a trip',
];

// Driver quick action catalogue (strictly driver-authorized)
const DRIVER_PRIMARY_CHIPS = [
  '🚚 My current trip',
  '📋 My assigned trips',
  '⏱️ My attendance',
  '🚛 My vehicle details',
];

const DRIVER_MORE_CHIPS = [
  '📜 My trip history',
  '⚠️ Report an issue',
];

export default function AIAssistantScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const userRole = String(user?.role || 'ROLE_DRIVER').toUpperCase();
  const isDriver = userRole === 'ROLE_DRIVER' || userRole === 'DRIVER';
  const isManager = ['ROLE_MANAGER', 'FLEET_MANAGER', 'ROLE_DISPATCHER', 'DISPATCHER', 'ADMIN'].includes(userRole);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [showAllActions, setShowAllActions] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [conversationContext, setConversationContext] = useState<AiConversationContext>({});

  const flatListRef = useRef<FlatList>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for active intelligence badge
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.25,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  // Role metadata
  const roleBadge = useMemo(() => {
    if (isManager) return { label: 'FLEET MANAGER', color: colors.amber, bg: 'rgba(245, 158, 11, 0.12)' };
    if (isDriver) return { label: 'DRIVER', color: colors.blue, bg: 'rgba(59, 130, 246, 0.12)' };
    return { label: 'DISPATCHER', color: colors.teal, bg: 'rgba(20, 184, 166, 0.12)' };
  }, [isManager, isDriver]);

  // Active quick action sets
  const primaryChips = isDriver ? DRIVER_PRIMARY_CHIPS : MANAGER_PRIMARY_CHIPS;
  const moreChips = isDriver ? DRIVER_MORE_CHIPS : MANAGER_MORE_CHIPS;

  const sendMessage = useCallback(
    async (textToSend: string) => {
      const cleanText = textToSend.trim();
      if (!cleanText || isThinking) return;

      const userMsg: ChatMessage = {
        id: `usr-${Date.now()}`,
        isUser: true,
        text: cleanText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInputText('');
      setIsThinking(true);
      setVoiceNotice(null);

      // Build conversation history slice (last 3 messages)
      const history = messages.slice(-3).map((m) => ({
        role: m.isUser ? ('user' as const) : ('assistant' as const),
        content: m.text,
      }));

      try {
        const response = await queryFleetAi(cleanText, conversationContext, history);

        // Update conversation context if provided in response
        if (response.context) {
          setConversationContext((prev) => ({
            ...prev,
            ...response.context,
          }));
        }

        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          isUser: false,
          text: response.message,
          response,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages((prev) => [...prev, aiMsg]);
      } catch (err: any) {
        const errMsg =
          err?.response?.data?.message ||
          'Unable to analyze fleet intelligence. Please check your connection and retry.';

        const errorMsg: ChatMessage = {
          id: `err-${Date.now()}`,
          isUser: false,
          text: errMsg,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isError: true,
          failedQuery: cleanText,
        };

        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsThinking(false);
      }
    },
    [isThinking, messages, conversationContext]
  );

  const handleAction = useCallback(
    (action: AiAction) => {
      if (!action) return;

      if (action.actionType === 'track_vehicle') {
        const payload = action.payload || {};
        navigation?.navigate('LiveTracking', {
          vehicleID: payload.vehicleID,
          tripID: payload.tripID,
        });
      } else if (action.actionType === 'navigate') {
        const payload = action.payload || {};
        if (payload.screen) {
          navigation?.navigate(payload.screen, payload);
        }
      } else if (action.actionType === 'query' && action.payload?.query) {
        sendMessage(action.payload.query);
      }
    },
    [navigation, sendMessage]
  );

  const resetThread = useCallback(() => {
    setMessages([]);
    setConversationContext({});
    setInputText('');
    setVoiceNotice(null);
  }, []);

  const handleMicPress = useCallback(() => {
    // Non-blocking voice handler
    setVoiceNotice('Voice recognition listening. Say your fleet question...');
    setTimeout(() => {
      setVoiceNotice('Microphone standby. You can tap any quick action or type above.');
      setTimeout(() => setVoiceNotice(null), 3500);
    }, 2000);
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, isThinking]);

  // Render individual chat message
  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.isUser;
    const resp = item.response;

    return (
      <View style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowAI]}>
        {!isUser && (
          <View style={styles.aiAvatarBox}>
            <Sparkles size={14} color={colors.amber} />
          </View>
        )}

        <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
          {/* Main Answer Text */}
          <Text style={[isUser ? styles.userMessageText : styles.aiMessageText]}>
            {item.text}
          </Text>

          {/* 1. Metrics Pill Row */}
          {!isUser && resp?.metrics && Object.keys(resp.metrics).length > 0 && (
            <View style={styles.metricsGrid}>
              {Object.entries(resp.metrics).map(([key, val], idx) => (
                <View key={idx} style={styles.metricPill}>
                  <Text style={styles.metricKey}>{key}</Text>
                  <Text style={styles.metricVal}>{String(val)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* 2. Structured Vehicle or Tracking Telemetry Card */}
          {!isUser && (resp?.type === 'tracking' || resp?.type === 'vehicle_card') && resp?.items && resp.items.length > 0 && (
            <View style={styles.structuredCardContainer}>
              {resp.items.slice(0, 2).map((vItem, idx) => (
                <View key={idx} style={styles.telemetryCard}>
                  <View style={styles.telemetryHeader}>
                    <View style={styles.telemetryTitleRow}>
                      <Truck size={16} color={colors.amber} />
                      <Text style={styles.telemetryTitle}>{vItem.title}</Text>
                    </View>
                    {vItem.badge && (
                      <View style={[styles.statusBadge, { backgroundColor: vItem.badgeColor ? `${vItem.badgeColor}20` : 'rgba(16, 185, 129, 0.15)' }]}>
                        <View style={[styles.dotIndicator, { backgroundColor: vItem.badgeColor || colors.success }]} />
                        <Text style={[styles.statusBadgeText, { color: vItem.badgeColor || colors.success }]}>
                          {vItem.badge}
                        </Text>
                      </View>
                    )}
                  </View>

                  {vItem.subtitle && (
                    <Text style={styles.telemetrySubtitle}>{vItem.subtitle}</Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* 3. Structured Trip Card */}
          {!isUser && resp?.type === 'trip_card' && resp?.items && resp.items.length > 0 && (
            <View style={styles.structuredCardContainer}>
              {resp.items.slice(0, 1).map((tItem, idx) => (
                <View key={idx} style={styles.tripCard}>
                  <View style={styles.telemetryHeader}>
                    <View style={styles.telemetryTitleRow}>
                      <Navigation size={15} color={colors.blue} />
                      <Text style={styles.tripCardTitle}>{tItem.title}</Text>
                    </View>
                    {tItem.badge && (
                      <View style={[styles.statusBadge, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                        <Text style={[styles.statusBadgeText, { color: colors.blue }]}>
                          {tItem.badge}
                        </Text>
                      </View>
                    )}
                  </View>
                  {tItem.subtitle && (
                    <Text style={styles.tripRouteText}>{tItem.subtitle}</Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* 4. Structured Bounded List Card */}
          {!isUser && resp?.type === 'list' && resp?.items && resp.items.length > 0 && (
            <View style={styles.listContainer}>
              {resp.items.slice(0, 3).map((listItem, idx) => (
                <View key={idx} style={styles.listItemCard}>
                  <View style={styles.listItemHeader}>
                    <Text style={styles.listItemTitle} numberOfLines={1}>
                      {listItem.title}
                    </Text>
                    {listItem.badge && (
                      <Text style={[styles.listItemBadge, { color: listItem.badgeColor || colors.amber }]}>
                        {listItem.badge}
                      </Text>
                    )}
                  </View>
                  {listItem.subtitle && (
                    <Text style={styles.listItemSubtitle} numberOfLines={1}>
                      {listItem.subtitle}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* 5. Next Action Buttons */}
          {!isUser && resp?.actions && resp.actions.length > 0 && (
            <View style={styles.actionsRow}>
              {resp.actions.map((act, idx) => (
                <Pressable
                  key={idx}
                  style={[styles.actionButton, act.actionType === 'track_vehicle' ? styles.actionButtonPrimary : styles.actionButtonSecondary]}
                  onPress={() => handleAction(act)}
                >
                  {act.actionType === 'track_vehicle' ? (
                    <MapPin size={13} color="#FFFFFF" />
                  ) : (
                    <Layers size={13} color={colors.textPrimary} />
                  )}
                  <Text style={[styles.actionButtonText, act.actionType === 'track_vehicle' && styles.actionButtonTextPrimary]}>
                    {act.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* 6. Error & Retry Action */}
          {item.isError && (
            <View style={styles.errorBox}>
              <CircleAlert size={14} color={colors.error} />
              <Pressable
                style={styles.retryBtn}
                onPress={() => item.failedQuery && sendMessage(item.failedQuery)}
              >
                <RotateCcw size={13} color={colors.amber} />
                <Text style={styles.retryBtnText}>Retry query</Text>
              </Pressable>
            </View>
          )}

          {/* Timestamp */}
          <Text style={[styles.timestampText, isUser ? styles.timestampUser : styles.timestampAI]}>
            {item.timestamp}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Header bar with title, status and reset thread */}
      <View style={styles.headerBar}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>AI Assistant</Text>
          <View style={styles.liveIndicator}>
            <Animated.View style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]} />
            <Text style={styles.liveText}>Intelligence Online</Text>
          </View>
        </View>

        {messages.length > 0 && (
          <Pressable style={styles.resetBtn} onPress={resetThread} hitSlop={8}>
            <RotateCcw size={16} color={colors.textSecondary} />
            <Text style={styles.resetBtnText}>New Thread</Text>
          </Pressable>
        )}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex1}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.chatScroll}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.welcomeBox}>
              <View style={styles.welcomeIconRing}>
                <Sparkles size={30} color={colors.amber} />
              </View>

              <View style={[styles.roleBadgeBox, { backgroundColor: roleBadge.bg }]}>
                <Text style={[styles.roleBadgeText, { color: roleBadge.color }]}>
                  {roleBadge.label}
                </Text>
              </View>

              <Text style={styles.welcomeHeading}>
                {isManager
                  ? `Welcome, ${user?.name || 'Manager'}`
                  : isDriver
                  ? `Welcome, Driver ${user?.name || ''}`
                  : `Hello, ${user?.name || 'Dispatcher'}`}
              </Text>

              <Text style={styles.welcomeSubheading}>
                {isManager
                  ? 'Fleet Intelligence Assistant'
                  : isDriver
                  ? 'Personal Driver Assistant'
                  : 'Dispatch Operations Assistant'}
              </Text>

              <Text style={styles.welcomeIntroText}>
                {isManager
                  ? 'Real-time telemetry, trip statuses, driver attendance, and predictive fleet analytics.'
                  : 'Instant assistance with your current trip, vehicle details, attendance clock-ins, and routes.'}
              </Text>

              {/* Quick Actions in Empty State */}
              <View style={styles.emptyQuickActionsWrapper}>
                <Text style={styles.emptyQuickActionsTitle}>Tap a quick action to start:</Text>
                <View style={styles.chipsContainer}>
                  {primaryChips.map((chip, index) => (
                    <Pressable
                      key={index}
                      style={styles.actionChip}
                      onPress={() => sendMessage(chip)}
                    >
                      <Text style={styles.actionChipText}>{chip}</Text>
                    </Pressable>
                  ))}
                  {showAllActions &&
                    moreChips.map((chip, index) => (
                      <Pressable
                        key={`more-${index}`}
                        style={styles.actionChip}
                        onPress={() => sendMessage(chip)}
                      >
                        <Text style={styles.actionChipText}>{chip}</Text>
                      </Pressable>
                    ))}
                </View>

                {moreChips.length > 0 && (
                  <Pressable
                    style={styles.moreActionsToggle}
                    onPress={() => setShowAllActions((prev) => !prev)}
                  >
                    <Text style={styles.moreActionsToggleText}>
                      {showAllActions ? 'Show fewer actions' : `+ More actions (${moreChips.length})`}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          }
          ListFooterComponent={
            <View>
              {/* Thinking / Loading indicator */}
              {isThinking && (
                <View style={[styles.messageRow, styles.messageRowAI]}>
                  <View style={styles.aiAvatarBox}>
                    <Sparkles size={14} color={colors.amber} />
                  </View>
                  <View style={[styles.bubble, styles.aiBubble, styles.thinkingBubble]}>
                    <ActivityIndicator size="small" color={colors.amber} />
                    <Text style={styles.thinkingText}>Querying real-time fleet data...</Text>
                  </View>
                </View>
              )}

              {/* Suggestions strip when messages exist */}
              {messages.length > 0 && (
                <View style={styles.conversationChipsWrapper}>
                  <View style={styles.chipsContainer}>
                    {primaryChips.slice(0, 3).map((chip, index) => (
                      <Pressable
                        key={index}
                        style={styles.actionChipCompact}
                        onPress={() => sendMessage(chip)}
                      >
                        <Text style={styles.actionChipCompactText}>{chip}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
            </View>
          }
        />

        {/* Voice notification tooltip if active */}
        {voiceNotice && (
          <View style={styles.voiceNoticeBox}>
            <Radio size={13} color={colors.amber} />
            <Text style={styles.voiceNoticeText}>{voiceNotice}</Text>
          </View>
        )}

        {/* Bottom Input Area */}
        <View style={[styles.inputBar, { marginBottom: Math.max(insets.bottom, 6) + rf(62) }]}>
          <TextInput
            style={styles.inputField}
            value={inputText}
            onChangeText={setInputText}
            placeholder={
              isDriver
                ? 'Ask about your trip, vehicle, or attendance...'
                : 'Ask about vehicles, trips, maintenance...'
            }
            placeholderTextColor={colors.textMuted}
            onSubmitEditing={() => sendMessage(inputText)}
            returnKeyType="send"
            editable={!isThinking}
          />

          {/* Microphone helper button */}
          <Pressable style={styles.micButton} onPress={handleMicPress} hitSlop={6}>
            <Mic size={18} color={colors.textSecondary} />
          </Pressable>

          {/* Send Button */}
          <Pressable
            style={[styles.sendButton, (!inputText.trim() || isThinking) && styles.sendButtonDisabled]}
            onPress={() => sendMessage(inputText)}
            disabled={!inputText.trim() || isThinking}
          >
            <ArrowUp size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex1: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: rf(20),
    paddingTop: Platform.OS === 'ios' ? rf(14) : rf(12),
    paddingBottom: rf(10),
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    backgroundColor: colors.panel,
  },
  headerLeft: {
    flexDirection: 'column',
  },
  headerTitle: {
    fontSize: rf(22),
    fontWeight: '800',
    color: colors.textPrimary,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: rf(2),
  },
  liveDot: {
    width: rf(6),
    height: rf(6),
    borderRadius: rf(3),
    backgroundColor: colors.success,
    marginRight: rf(6),
  },
  liveText: {
    fontSize: rf(11),
    color: colors.textSecondary,
    fontWeight: '500',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    paddingVertical: rf(6),
    paddingHorizontal: rf(10),
    borderRadius: rf(14),
    borderWidth: 1,
    borderColor: colors.borderSoft,
    gap: rf(4),
  },
  resetBtnText: {
    fontSize: rf(12),
    color: colors.textSecondary,
    fontWeight: '600',
  },
  chatScroll: {
    padding: rf(16),
    paddingBottom: rf(24),
  },
  welcomeBox: {
    alignItems: 'center',
    paddingVertical: rf(16),
    paddingHorizontal: rf(8),
  },
  welcomeIconRing: {
    width: rf(60),
    height: rf(60),
    borderRadius: rf(30),
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: rf(12),
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  roleBadgeBox: {
    paddingVertical: rf(3),
    paddingHorizontal: rf(10),
    borderRadius: rf(12),
    marginBottom: rf(8),
  },
  roleBadgeText: {
    fontSize: rf(11),
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  welcomeHeading: {
    fontSize: rf(20),
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: rf(4),
    textAlign: 'center',
  },
  welcomeSubheading: {
    fontSize: rf(14),
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: rf(8),
  },
  welcomeIntroText: {
    fontSize: rf(13),
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: rf(19),
    paddingHorizontal: rf(16),
    marginBottom: rf(20),
  },
  emptyQuickActionsWrapper: {
    width: '100%',
    backgroundColor: colors.panel,
    borderRadius: rf(16),
    padding: rf(16),
    borderWidth: 1,
    borderColor: colors.borderSoft,
    marginBottom:rf(20)
  },
  emptyQuickActionsTitle: {
    fontSize: rf(13),
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: rf(12),
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rf(8),
  },
  actionChip: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    paddingVertical: rf(8),
    paddingHorizontal: rf(12),
    borderRadius: rf(20),
  },
  actionChipText: {
    color: colors.textPrimary,
    fontSize: rf(12),
    fontWeight: '500',
  },
  moreActionsToggle: {
    alignSelf: 'center',
    marginTop: rf(12),
    paddingVertical: rf(4),
  },
  moreActionsToggleText: {
    fontSize: rf(12),
    fontWeight: '600',
    color: colors.amber,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: rf(16),
    alignItems: 'flex-end',
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowAI: {
    justifyContent: 'flex-start',
  },
  aiAvatarBox: {
    width: rf(28),
    height: rf(28),
    borderRadius: rf(14),
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: rf(8),
    marginBottom: rf(4),
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  bubble: {
    maxWidth: '85%',
    paddingHorizontal: rf(14),
    paddingVertical: rf(10),
    borderRadius: rf(16),
  },
  userBubble: {
    backgroundColor: colors.blue || '#3B82F6',
    borderBottomRightRadius: rf(4),
  },
  aiBubble: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderBottomLeftRadius: rf(4),
  },
  userMessageText: {
    color: '#FFFFFF',
    fontSize: rf(14),
    lineHeight: rf(20),
  },
  aiMessageText: {
    color: colors.textPrimary,
    fontSize: rf(14),
    lineHeight: rf(20),
  },
  timestampText: {
    fontSize: rf(10),
    marginTop: rf(4),
    alignSelf: 'flex-end',
  },
  timestampUser: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  timestampAI: {
    color: colors.textMuted,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rf(6),
    marginTop: rf(10),
  },
  metricPill: {
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: rf(10),
    paddingVertical: rf(6),
    borderRadius: rf(10),
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  metricKey: {
    fontSize: rf(10),
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  metricVal: {
    fontSize: rf(13),
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: rf(2),
  },
  structuredCardContainer: {
    marginTop: rf(10),
    gap: rf(8),
  },
  telemetryCard: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: rf(12),
    padding: rf(10),
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  telemetryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  telemetryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rf(6),
  },
  telemetryTitle: {
    fontSize: rf(13),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  telemetrySubtitle: {
    fontSize: rf(11),
    color: colors.textSecondary,
    marginTop: rf(4),
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: rf(2),
    paddingHorizontal: rf(6),
    borderRadius: rf(8),
    gap: rf(4),
  },
  dotIndicator: {
    width: rf(5),
    height: rf(5),
    borderRadius: rf(2.5),
  },
  statusBadgeText: {
    fontSize: rf(10),
    fontWeight: '700',
  },
  tripCard: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: rf(12),
    padding: rf(10),
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  tripCardTitle: {
    fontSize: rf(13),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  tripRouteText: {
    fontSize: rf(11),
    color: colors.textSecondary,
    marginTop: rf(4),
  },
  listContainer: {
    marginTop: rf(10),
    gap: rf(6),
  },
  listItemCard: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: rf(10),
    padding: rf(8),
    borderLeftWidth: 3,
    borderLeftColor: colors.amber,
  },
  listItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listItemTitle: {
    fontSize: rf(12),
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  listItemBadge: {
    fontSize: rf(10),
    fontWeight: '700',
    marginLeft: rf(6),
  },
  listItemSubtitle: {
    fontSize: rf(11),
    color: colors.textMuted,
    marginTop: rf(2),
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rf(8),
    marginTop: rf(10),
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: rf(6),
    paddingHorizontal: rf(10),
    borderRadius: rf(14),
    gap: rf(4),
  },
  actionButtonPrimary: {
    backgroundColor: colors.amber,
  },
  actionButtonSecondary: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  actionButtonText: {
    fontSize: rf(11),
    fontWeight: '600',
    color: colors.textPrimary,
  },
  actionButtonTextPrimary: {
    color: '#FFFFFF',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: rf(8),
    paddingTop: rf(6),
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rf(4),
  },
  retryBtnText: {
    fontSize: rf(11),
    fontWeight: '600',
    color: colors.amber,
  },
  thinkingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rf(8),
    paddingVertical: rf(10),
  },
  thinkingText: {
    fontSize: rf(12),
    color: colors.textMuted,
  },
  conversationChipsWrapper: {
    marginTop: rf(8),
    marginBottom: rf(8),
  },
  actionChipCompact: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    paddingVertical: rf(5),
    paddingHorizontal: rf(10),
    borderRadius: rf(16),
  },
  actionChipCompactText: {
    color: colors.textSecondary,
    fontSize: rf(11),
    fontWeight: '500',
  },
  voiceNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rf(6),
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: rf(16),
    paddingVertical: rf(6),
    borderTopWidth: 1,
    borderTopColor: 'rgba(245, 158, 11, 0.2)',
  },
  voiceNoticeText: {
    fontSize: rf(11),
    color: colors.amber,
    fontWeight: '500',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rf(12),
    paddingVertical: rf(10),
    paddingBottom: Platform.OS === 'ios' ? rf(24) : rf(10),
    backgroundColor: colors.panel,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    gap: rf(8),
  },
  inputField: {
    flex: 1,
    backgroundColor: colors.surfaceRaised,
    color: colors.textPrimary,
    borderRadius: rf(20),
    paddingHorizontal: rf(16),
    paddingVertical: Platform.OS === 'ios' ? rf(10) : rf(8),
    fontSize: rf(13),
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  micButton: {
    width: rf(36),
    height: rf(36),
    borderRadius: rf(18),
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  sendButton: {
    width: rf(38),
    height: rf(38),
    borderRadius: rf(19),
    backgroundColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
});
