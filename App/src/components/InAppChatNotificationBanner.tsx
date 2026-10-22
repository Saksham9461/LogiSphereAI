import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
} from 'react-native';
import { MessageSquare, X, ChevronRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useChatStore from '../store/ChatStore';
import { colors } from '../theme/colors';
import { navigationRef } from '../navigation/navigationRef';

export default function InAppChatNotificationBanner() {
  const inAppMessage = useChatStore((state) => state.activeInAppMessage);
  const dismiss = useChatStore((state) => state.dismissInAppMessage);
  const selectConversation = useChatStore((state) => state.selectConversation);
  const insets = useSafeAreaInsets();

  const translateY = useRef(new Animated.Value(-120)).current;

  useEffect(() => {
    if (inAppMessage) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 40,
      }).start();

      // Auto dismiss after 6 seconds
      const timer = setTimeout(() => {
        dismiss();
      }, 6000);
      return () => clearTimeout(timer);
    } else {
      Animated.timing(translateY, {
        toValue: -140,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [inAppMessage, translateY, dismiss]);

  if (!inAppMessage) return null;

  const handleOpenChat = async () => {
    const { conversationId, participant } = inAppMessage;
    dismiss();
    await selectConversation(conversationId, participant);
    try {
      navigationRef.navigate('Chat');
    } catch (e) {
      console.warn('[InAppChatNotificationBanner] Navigation to Chat failed:', e);
    }
  };

  return (
    <Animated.View
      style={[
        styles.bannerContainer,
        {
          top: insets.top > 0 ? insets.top + 4 : 8,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.bannerContent}>
        <View style={styles.iconCircle}>
          <MessageSquare color="#FFFFFF" size={20} strokeWidth={2.2} />
        </View>

        <Pressable style={styles.textContainer} onPress={handleOpenChat}>
          <View style={styles.headerRow}>
            <Text style={styles.senderName} numberOfLines={1}>
              {inAppMessage.senderName}
            </Text>
            <Text style={styles.badgeText}>NEW MESSAGE</Text>
          </View>
          <Text style={styles.messageText} numberOfLines={2}>
            {inAppMessage.text}
          </Text>
        </Pressable>

        <View style={styles.actionButtons}>
          <Pressable style={styles.replyBtn} onPress={handleOpenChat}>
            <Text style={styles.replyBtnText}>REPLY</Text>
            <ChevronRight color="#FFFFFF" size={14} />
          </Pressable>
          <Pressable style={styles.closeBtn} onPress={dismiss} hitSlop={10}>
            <X color="rgba(255,255,255,0.7)" size={16} />
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 9998,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  bannerContent: {
    backgroundColor: '#0F766E', // Sleek teal
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#14B8A6',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  senderName: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    flex: 1,
    marginRight: 6,
  },
  badgeText: {
    color: '#CCFBF1',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  messageText: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 12.5,
    lineHeight: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  replyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginRight: 6,
  },
  replyBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    marginRight: 2,
  },
  closeBtn: {
    padding: 6,
  },
});
