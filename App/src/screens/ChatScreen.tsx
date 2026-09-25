import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, FlatList, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Send } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { rf } from '../theme/responsive';

// Mock Data
const MOCK_MESSAGES = [
  { id: '1', text: 'Hey team, TRP-1004 is delayed due to heavy traffic on I-95.', sender: 'other', timestamp: '10:30 AM', name: 'John Doe' },
  { id: '2', text: 'Noted. Please keep us updated if the ETA changes by more than 15 minutes.', sender: 'me', timestamp: '10:32 AM', name: 'Me' },
  { id: '3', text: 'Will do. Current ETA is now 11:45 AM.', sender: 'other', timestamp: '10:35 AM', name: 'John Doe' },
  { id: '4', text: 'Has the maintenance team checked the engine issue on VAN-02?', sender: 'me', timestamp: '11:00 AM', name: 'Me' },
  { id: '5', text: 'Yes, they replaced the spark plugs. It should be ready for dispatch by 1:00 PM.', sender: 'other', timestamp: '11:05 AM', name: 'Sarah Smith' },
  { id: '6', text: 'Perfect. I will assign it to the afternoon route.', sender: 'me', timestamp: '11:10 AM', name: 'Me' },
];

export default function ChatScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const handleSend = () => {
    if (inputText.trim() === '') return;
    
    const newMessage = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: 'me',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      name: 'Me',
    };
    
    setMessages([...messages, newMessage]);
    setInputText('');
    Keyboard.dismiss();
  };

  const renderMessage = ({ item }: any) => {
    const isMe = item.sender === 'me';
    return (
      <View style={[styles.messageWrapper, isMe ? styles.messageWrapperRight : styles.messageWrapperLeft]}>
        {!isMe && <Text style={styles.senderName}>{item.name}</Text>}
        <View style={[styles.messageBubble, isMe ? styles.messageBubbleRight : styles.messageBubbleLeft]}>
          <Text style={[styles.messageText, isMe ? styles.messageTextRight : styles.messageTextLeft]}>{item.text}</Text>
        </View>
        <Text style={styles.timestamp}>{item.timestamp}</Text>
      </View>
    );
  };

  return (
    <View style={styles.safeArea}>
      <View style={styles.headerRow}>
        <Text style={styles.pageTitle}>Chat</Text>
      </View>

      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 16) + 80 }]}>
          <TextInput
            style={styles.textInput}
            placeholder="Type a message..."
            placeholderTextColor={colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
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
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  headerRow: {
    paddingHorizontal: rf(16),
    paddingTop: rf(16),
    paddingBottom: rf(16),
    backgroundColor: colors.panel,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  pageTitle: {
    color: colors.textPrimary,
    fontSize: rf(28),
    fontWeight: '800',
    letterSpacing: -1,
  },
  container: {
    flex: 1,
  },
  listContent: {
    padding: rf(16),
    gap: rf(12),
  },
  messageWrapper: {
    maxWidth: '80%',
    marginBottom: rf(8),
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
    paddingHorizontal: rf(16),
    paddingVertical: rf(12),
    borderRadius: rf(16),
  },
  messageBubbleLeft: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: rf(4),
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderStyle: 'dashed',
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
    color: '#1a1200', // Dark contrast for amber background
    fontWeight: '500',
  },
  timestamp: {
    fontSize: rf(10),
    color: colors.textMuted,
    marginTop: rf(4),
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: rf(16),
    backgroundColor: colors.panel,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    gap: rf(12),
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: rf(20),
    paddingHorizontal: rf(16),
    paddingTop: rf(12),
    paddingBottom: rf(12),
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
});
