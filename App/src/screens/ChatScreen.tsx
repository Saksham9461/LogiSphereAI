import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Send, MessageSquare, Check, CheckCheck, User, Circle, Plus, RefreshCw } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { rf } from '../theme/responsive';
import useAuthStore from '../store/AuthStore';
import useChatStore, { ChatUser, ChatMessage, ConversationSummary } from '../store/ChatStore';
import { formatLocalMessageTime } from '../utils/chatTimeUtils';

export default function ChatScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const currentUser = useAuthStore((state) => state.user);

  const {
    connectionStatus,
    conversations,
    activeConversationId,
    activeParticipant,
    messages,
    rosterUsers,
    onlineUserIds,
    typingStates,
    loading,
    initSocket,
    fetchConversations,
    fetchRosterUsers,
    selectConversation,
    startConversationWithUser,
    sendMessage,
    sendTypingIndicator,
  } = useChatStore();

  const [inputText, setInputText] = useState('');
  const [showRosterModal, setShowRosterModal] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<any>(null);

  useEffect(() => {
    initSocket();
    fetchConversations();
    fetchRosterUsers();
  }, []);

  // Handle active message list for current open conversation
  const currentMessages = activeConversationId ? messages[activeConversationId] || [] : [];
  const isTyping = activeConversationId ? Boolean(typingStates[activeConversationId]) : false;
  const isParticipantOnline = activeParticipant ? onlineUserIds.has(activeParticipant.id) : false;

  const handleTextChange = (text: string) => {
    setInputText(text);

    // Trigger typing status
    sendTypingIndicator(true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingIndicator(false);
    }, 2000);
  };

  const handleSend = () => {
    const text = inputText.trim();
    if (!text) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    sendTypingIndicator(false);

    sendMessage(text);
    setInputText('');
  };

  const handleSelectRosterUser = async (user: ChatUser) => {
    setShowRosterModal(false);
    const convId = await startConversationWithUser(user.id);
    if (convId) {
      selectConversation(convId, user);
    }
  };

  const renderStatusIndicator = (msg: ChatMessage, isMe: boolean) => {
    if (!isMe) return null;
    if (msg.status === 'READ') {
      return <CheckCheck size={14} color={colors.amber} style={styles.statusTick} />;
    }
    if (msg.status === 'DELIVERED') {
      return <CheckCheck size={14} color={colors.textMuted} style={styles.statusTick} />;
    }
    return <Check size={14} color={colors.textMuted} style={styles.statusTick} />;
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMe = item.senderId === currentUser?.id || item.senderId === currentUser?.userID;
    const formattedTime = formatLocalMessageTime(item.createdAt);

    return (
      <View style={[styles.messageWrapper, isMe ? styles.messageWrapperRight : styles.messageWrapperLeft]}>
        {!isMe && activeParticipant && (
          <Text style={styles.senderName}>{activeParticipant.name}</Text>
        )}
        <View style={[styles.messageBubble, isMe ? styles.messageBubbleRight : styles.messageBubbleLeft]}>
          <Text style={[styles.messageText, isMe ? styles.messageTextRight : styles.messageTextLeft]}>
            {item.message}
          </Text>
        </View>
        <View style={[styles.timeRow, isMe ? styles.timeRowRight : styles.timeRowLeft]}>
          <Text style={styles.timestamp}>{formattedTime}</Text>
          {renderStatusIndicator(item, isMe)}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.safeArea}>
      {/* App Header */}
      <View style={[styles.headerRow, { paddingTop: Math.max(insets.top, rf(12)) }]}>
        <View style={styles.headerLeft}>
          {activeConversationId ? (
            <Pressable
              style={styles.backBtn}
              onPress={() => useChatStore.setState({ activeConversationId: null, activeParticipant: null })}
            >
              <ChevronLeft color={colors.textPrimary} size={24} />
            </Pressable>
          ) : (
            <MessageSquare color={colors.amber} size={26} style={{ marginRight: rf(8) }} />
          )}

          {activeParticipant ? (
            <View style={styles.participantHeaderInfo}>
              <View style={styles.participantNameRow}>
                <Text style={styles.headerParticipantName} numberOfLines={1}>
                  {activeParticipant.name}
                </Text>
                <View
                  style={[
                    styles.onlineDot,
                    { backgroundColor: isParticipantOnline ? colors.green : colors.textMuted },
                  ]}
                />
              </View>
              <Text style={styles.headerParticipantRole}>
                {isTyping
                  ? 'typing...'
                  : isParticipantOnline
                  ? 'Online'
                  : 'Offline • 24h Message Policy Active'}
              </Text>
            </View>
          ) : (
            <Text style={styles.pageTitle}>Messages</Text>
          )}
        </View>

        <View style={styles.headerRightActions}>
          <Pressable style={styles.iconBtn} onPress={() => fetchConversations()}>
            <RefreshCw color={colors.textMuted} size={20} />
          </Pressable>
          <Pressable style={styles.newChatBtn} onPress={() => setShowRosterModal(true)}>
            <Plus color="#FFFFFF" size={18} />
            <Text style={styles.newChatBtnText}>New Chat</Text>
          </Pressable>
        </View>
      </View>

      {/* Connection Banner */}
      {connectionStatus !== 'CONNECTED' && (
        <View style={styles.connectionBanner}>
          <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: rf(8) }} />
          <Text style={styles.connectionBannerText}>
            {connectionStatus === 'CONNECTING' ? 'Connecting to real-time chat server...' : 'Reconnecting...'}
          </Text>
        </View>
      )}

      {!activeConversationId ? (
        /* Conversation List View */
        <View style={styles.container}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Conversations</Text>
            <Text style={styles.policySubtext}>Messages auto-expire after 24 hours</Text>
          </View>

          {loading && conversations.length === 0 ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={colors.amber} />
            </View>
          ) : conversations.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MessageSquare size={48} color={colors.borderSoft} style={{ marginBottom: rf(12) }} />
              <Text style={styles.emptyTitle}>No Recent Conversations</Text>
              <Text style={styles.emptySubtext}>
                Start a 1-on-1 real-time chat with a Fleet Manager, Dispatcher, or Driver.
              </Text>
              <Pressable style={styles.startChatBtn} onPress={() => setShowRosterModal(true)}>
                <Text style={styles.startChatBtnText}>Start New Chat</Text>
              </Pressable>
            </View>
          ) : (
            <FlatList
              data={conversations}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.convListContent}
              renderItem={({ item }) => {
                const isOnline = onlineUserIds.has(item.participant.id);
                const lastTime = formatLocalMessageTime(item.lastMessage?.createdAt);

                return (
                  <Pressable
                    style={styles.convCard}
                    onPress={() => selectConversation(item.id, item.participant)}
                  >
                    <View style={styles.avatarContainer}>
                      <View style={styles.avatarCircle}>
                        <User color={colors.textPrimary} size={22} />
                      </View>
                      <View
                        style={[
                          styles.onlineBadge,
                          { backgroundColor: isOnline ? colors.green : colors.textMuted },
                        ]}
                      />
                    </View>

                    <View style={styles.convDetails}>
                      <View style={styles.convTopRow}>
                        <Text style={styles.participantName}>{item.participant.name}</Text>
                        <Text style={styles.convTime}>{lastTime}</Text>
                      </View>
                      <View style={styles.convBottomRow}>
                        <Text style={styles.lastMsgText} numberOfLines={1}>
                          {item.lastMessage ? item.lastMessage.message : 'No messages within 24h'}
                        </Text>
                        {item.unreadCount > 0 && (
                          <View style={styles.unreadBadge}>
                            <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </Pressable>
                );
              }}
            />
          )}
        </View>
      ) : (
        /* Active Conversation Chat Room */
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <FlatList
            ref={flatListRef}
            data={currentMessages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messageListContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={styles.emptyMessagesContainer}>
                <Text style={styles.emptyMessagesText}>
                  Send a message to start conversation.
                </Text>
                <Text style={styles.emptyMessagesSub}>
                  Messages are persisted in Supabase and auto-deleted after 24 hours.
                </Text>
              </View>
            }
          />

          {isTyping && (
            <View style={styles.typingIndicatorBar}>
              <Text style={styles.typingText}>{activeParticipant?.name} is typing...</Text>
            </View>
          )}

          {/* Bottom Input Field */}
          <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 16) + 70 }]}>
            <TextInput
              style={styles.textInput}
              placeholder="Type a message..."
              placeholderTextColor={colors.textMuted}
              value={inputText}
              onChangeText={handleTextChange}
              multiline
            />
            <Pressable
              style={[styles.sendBtn, !inputText.trim() && { backgroundColor: colors.border }]}
              onPress={handleSend}
              disabled={!inputText.trim()}
            >
              <Send color="#FFFFFF" size={20} />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* Select Contact Roster Modal */}
      <Modal visible={showRosterModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Recipient</Text>
              <Pressable onPress={() => setShowRosterModal(false)}>
                <Text style={styles.modalCloseBtn}>Close</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.rosterList}>
              {rosterUsers.map((user) => {
                const isOnline = onlineUserIds.has(user.id);
                return (
                  <Pressable
                    key={user.id}
                    style={styles.rosterCard}
                    onPress={() => handleSelectRosterUser(user)}
                  >
                    <View style={styles.avatarContainer}>
                      <View style={styles.avatarCircle}>
                        <User color={colors.textPrimary} size={20} />
                      </View>
                      <View
                        style={[
                          styles.onlineBadge,
                          { backgroundColor: isOnline ? colors.green : colors.textMuted },
                        ]}
                      />
                    </View>
                    <View style={{ flex: 1, marginLeft: rf(12) }}>
                      <Text style={styles.rosterName}>{user.name}</Text>
                      <Text style={styles.rosterRole}>
                        {user.role} • {isOnline ? 'Online' : 'Offline'}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: rf(16),
    paddingBottom: rf(14),
    backgroundColor: colors.panel,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    elevation: 3,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backBtn: {
    padding: rf(4),
    marginRight: rf(8),
  },
  pageTitle: {
    color: colors.textPrimary,
    fontSize: rf(24),
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  participantHeaderInfo: {
    flexDirection: 'column',
  },
  participantNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerParticipantName: {
    color: colors.textPrimary,
    fontSize: rf(18),
    fontWeight: '700',
    marginRight: rf(6),
  },
  onlineDot: {
    width: rf(8),
    height: rf(8),
    borderRadius: rf(4),
  },
  headerParticipantRole: {
    color: colors.textMuted,
    fontSize: rf(11),
    fontWeight: '500',
    marginTop: rf(2),
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rf(8),
  },
  iconBtn: {
    padding: rf(8),
    borderRadius: rf(20),
    backgroundColor: colors.surface,
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.amber,
    paddingHorizontal: rf(12),
    paddingVertical: rf(8),
    borderRadius: rf(20),
    gap: rf(4),
  },
  newChatBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: rf(12),
  },
  connectionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D97706',
    paddingVertical: rf(6),
    paddingHorizontal: rf(16),
  },
  connectionBannerText: {
    color: '#FFFFFF',
    fontSize: rf(12),
    fontWeight: '600',
  },
  container: {
    flex: 1,
  },
  sectionHeader: {
    paddingHorizontal: rf(16),
    paddingTop: rf(16),
    paddingBottom: rf(8),
  },
  sectionTitle: {
    fontSize: rf(16),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  policySubtext: {
    fontSize: rf(11),
    color: colors.textMuted,
    marginTop: rf(2),
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: rf(32),
  },
  emptyTitle: {
    fontSize: rf(18),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptySubtext: {
    fontSize: rf(13),
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: rf(6),
    lineHeight: rf(18),
  },
  startChatBtn: {
    marginTop: rf(20),
    backgroundColor: colors.amber,
    paddingHorizontal: rf(24),
    paddingVertical: rf(12),
    borderRadius: rf(12),
  },
  startChatBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: rf(14),
  },
  convListContent: {
    paddingHorizontal: rf(16),
    paddingBottom: rf(80),
  },
  convCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: rf(14),
    backgroundColor: colors.surface,
    borderRadius: rf(16),
    marginBottom: rf(10),
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarCircle: {
    width: rf(44),
    height: rf(44),
    borderRadius: rf(22),
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: rf(10),
    height: rf(10),
    borderRadius: rf(5),
    borderWidth: 1.5,
    borderColor: colors.bg,
  },
  convDetails: {
    flex: 1,
    marginLeft: rf(12),
  },
  convTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: rf(4),
  },
  participantName: {
    fontSize: rf(15),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  convTime: {
    fontSize: rf(11),
    color: colors.textMuted,
  },
  convBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMsgText: {
    fontSize: rf(13),
    color: colors.textSecondary,
    flex: 1,
    marginRight: rf(8),
  },
  unreadBadge: {
    backgroundColor: colors.amber,
    borderRadius: rf(10),
    paddingHorizontal: rf(8),
    paddingVertical: rf(2),
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: rf(11),
    fontWeight: '800',
  },
  messageListContent: {
    padding: rf(16),
    gap: rf(10),
  },
  messageWrapper: {
    maxWidth: '82%',
    marginBottom: rf(6),
  },
  messageWrapperLeft: {
    alignSelf: 'flex-start',
  },
  messageWrapperRight: {
    alignSelf: 'flex-end',
  },
  senderName: {
    fontSize: rf(11),
    color: colors.textMuted,
    marginBottom: rf(4),
    marginLeft: rf(4),
    fontWeight: '600',
  },
  messageBubble: {
    paddingHorizontal: rf(14),
    paddingVertical: rf(10),
    borderRadius: rf(16),
  },
  messageBubbleLeft: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: rf(4),
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  messageBubbleRight: {
    backgroundColor: colors.amber,
    borderBottomRightRadius: rf(4),
  },
  messageText: {
    fontSize: rf(14),
    lineHeight: rf(20),
  },
  messageTextLeft: {
    color: colors.textPrimary,
  },
  messageTextRight: {
    color: '#1a1200',
    fontWeight: '500',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: rf(2),
    gap: rf(4),
  },
  timeRowLeft: {
    alignSelf: 'flex-start',
    marginLeft: rf(4),
  },
  timeRowRight: {
    alignSelf: 'flex-end',
    marginRight: rf(4),
  },
  timestamp: {
    fontSize: rf(10),
    color: colors.textMuted,
  },
  statusTick: {
    marginLeft: rf(2),
  },
  emptyMessagesContainer: {
    paddingVertical: rf(40),
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyMessagesText: {
    color: colors.textSecondary,
    fontSize: rf(14),
    fontWeight: '600',
  },
  emptyMessagesSub: {
    color: colors.textMuted,
    fontSize: rf(11),
    textAlign: 'center',
    marginTop: rf(4),
    paddingHorizontal: rf(32),
  },
  typingIndicatorBar: {
    paddingHorizontal: rf(16),
    paddingVertical: rf(6),
  },
  typingText: {
    fontSize: rf(12),
    color: colors.amber,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: rf(14),
    backgroundColor: colors.panel,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    gap: rf(10),
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: rf(20),
    paddingHorizontal: rf(16),
    paddingTop: rf(10),
    paddingBottom: rf(10),
    minHeight: rf(44),
    maxHeight: rf(100),
    color: colors.textPrimary,
    fontSize: rf(14),
  },
  sendBtn: {
    width: rf(44),
    height: rf(44),
    borderRadius: rf(22),
    backgroundColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.panel,
    borderTopLeftRadius: rf(24),
    borderTopRightRadius: rf(24),
    maxHeight: '80%',
    padding: rf(20),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: rf(16),
  },
  modalTitle: {
    fontSize: rf(18),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalCloseBtn: {
    color: colors.amber,
    fontSize: rf(14),
    fontWeight: '700',
  },
  rosterList: {
    marginBottom: rf(20),
  },
  rosterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: rf(12),
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  rosterName: {
    fontSize: rf(15),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  rosterRole: {
    fontSize: rf(12),
    color: colors.textMuted,
    marginTop: rf(2),
  },
});
