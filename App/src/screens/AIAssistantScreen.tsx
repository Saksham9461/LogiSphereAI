import React, { useState, useRef, useEffect } from 'react';
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
} from 'react-native';
import { Sparkles, ArrowUp } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { rf } from '../theme/responsive';
import { mockAiAssistantService, AIResponse } from '../services/mockAiAssistantService';

interface Message {
  id: string;
  isUser: boolean;
  text: string;
  response?: AIResponse;
}

const INITIAL_SUGGESTIONS = [
  '🚚 Show active vehicles',
  '🛣️ Show today\'s trip summary',
  '👨‍✈️ Show driver performance',
  '🔧 Show upcoming maintenance',
  '⛽ Show today\'s fuel summary',
];

export default function AIAssistantScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(INITIAL_SUGGESTIONS);
  
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = { id: Date.now().toString(), isUser: true, text: text.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setSuggestions([]); // Clear suggestions while thinking
    setIsThinking(true);

    try {
      const response = await mockAiAssistantService(text);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        isUser: false,
        text: response.message,
        response,
      };
      
      setMessages((prev) => [...prev, aiMessage]);
      setSuggestions(INITIAL_SUGGESTIONS); // Always show all options
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        isUser: false,
        text: 'Something went wrong while analyzing your fleet. Please try again.',
      };
      setMessages((prev) => [...prev, errorMessage]);
      setSuggestions(INITIAL_SUGGESTIONS);
    } finally {
      setIsThinking(false);
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, isThinking]);

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.isUser;
    return (
      <View style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowAI]}>
        {!isUser && (
          <View style={styles.aiAvatarBox}>
            <Sparkles size={14} color={colors.amber} />
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
          <Text style={[isUser ? styles.userMessageText : styles.aiMessageText]}>
            {item.text}
          </Text>
          
          {/* Example of Rich Data Card Rendering Based on Intent Type */}
          {!isUser && item.response?.type === 'vehicle_list' && item.response.data && (
            <View style={styles.richDataContainer}>
              {item.response.data.map((vehicle: any, index: number) => (
                <View key={index} style={styles.richDataCard}>
                  <Text style={styles.richDataCardTitle}>🚚 {vehicle.id}</Text>
                  <Text style={styles.richDataCardSubtitle}>{vehicle.status} • {vehicle.speed}</Text>
                </View>
              ))}
            </View>
          )}

          {!isUser && item.response?.type === 'maintenance_alert' && item.response.data && (
            <View style={styles.richDataContainer}>
              {item.response.data.map((vehicle: any, index: number) => (
                <View key={index} style={[styles.richDataCard, { borderLeftColor: colors.rose }]}>
                  <Text style={styles.richDataCardTitle}>🔧 {vehicle.id}</Text>
                  <Text style={[styles.richDataCardSubtitle, { color: colors.rose }]}>Due in: {vehicle.dueIn}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.pageTitle}>AI Assistant</Text>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={styles.flex1}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.chatContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.welcomeContainer}>
              <View style={styles.welcomeIconBox}>
                <Sparkles size={32} color={colors.amber} />
              </View>
              <Text style={styles.welcomeTitle}>Hello, I'm LogiSphere AI</Text>
              <Text style={styles.welcomeSubtitle}>
                Your intelligent fleet assistant.
              </Text>
              <Text style={styles.welcomeBody}>
                I can help you understand vehicles, drivers, trips, fuel and maintenance.
              </Text>
            </View>
          }
          ListFooterComponent={
            <View>
              {isThinking && (
                <View style={[styles.messageRow, styles.messageRowAI]}>
                  <View style={styles.aiAvatarBox}>
                    <Sparkles size={14} color={colors.amber} />
                  </View>
                  <View style={[styles.bubble, styles.aiBubble, styles.thinkingBubble]}>
                    <ActivityIndicator size="small" color={colors.amber} />
                    <Text style={styles.thinkingText}>Analyzing fleet data...</Text>
                  </View>
                </View>
              )}
              {suggestions.length > 0 && (
                <View style={styles.suggestionsWrapper}>
                  {messages.length === 0 && <Text style={styles.suggestionsLabel}>Quick Actions</Text>}
                  <View style={styles.suggestionsContainer}>
                    {suggestions.map((suggestion, index) => (
                      <Pressable
                        key={index}
                        style={styles.suggestionChip}
                        onPress={() => sendMessage(suggestion)}
                      >
                        <Text style={styles.suggestionChipText}>{suggestion}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
            </View>
          }
        />

        {/* Input Area */}
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask LogiSphere AI..."
            placeholderTextColor={colors.textMuted}
            onSubmitEditing={() => sendMessage(inputText)}
            returnKeyType="send"
          />
          <Pressable 
            style={[styles.sendButton, !inputText.trim() && { opacity: 0.5 }]} 
            onPress={() => sendMessage(inputText)}
            disabled={!inputText.trim() || isThinking}
          >
            <ArrowUp size={20} color={colors.panel} />
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
  pageTitle: {
    fontSize: rf(28),
    fontWeight: '800',
    color: colors.textPrimary,
    paddingHorizontal: rf(24),
    paddingTop: Platform.OS === 'ios' ? rf(20) : rf(10),
    paddingBottom: rf(10),
  },
  chatContainer: {
    padding: rf(24),
    paddingBottom: rf(40),
  },
  welcomeContainer: {
    alignItems: 'center',
    marginTop: rf(20),
    marginBottom: rf(40),
  },
  welcomeIconBox: {
    width: rf(64),
    height: rf(64),
    borderRadius: rf(32),
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: rf(16),
  },
  welcomeTitle: {
    fontSize: rf(20),
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: rf(8),
  },
  welcomeSubtitle: {
    fontSize: rf(16),
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: rf(12),
  },
  welcomeBody: {
    fontSize: rf(14),
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: rf(22),
    paddingHorizontal: rf(20),
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
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: rf(16),
    paddingVertical: rf(12),
    borderRadius: rf(16),
  },
  userBubble: {
    backgroundColor: colors.blue || '#4F46E5', // Fallback if blue is undefined
    borderBottomRightRadius: rf(4),
  },
  aiBubble: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderBottomLeftRadius: rf(4),
  },
  thinkingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: rf(8),
    paddingHorizontal: rf(12),
  },
  thinkingText: {
    marginLeft: rf(8),
    color: colors.textMuted,
    fontSize: rf(14),
  },
  userMessageText: {
    color: colors.panel,
    fontSize: rf(15),
    lineHeight: rf(22),
  },
  aiMessageText: {
    color: colors.textPrimary,
    fontSize: rf(15),
    lineHeight: rf(22),
  },
  richDataContainer: {
    marginTop: rf(12),
    gap: rf(8),
  },
  richDataCard: {
    backgroundColor: colors.bg,
    padding: rf(12),
    borderRadius: rf(8),
    borderLeftWidth: 3,
    borderLeftColor: colors.amber,
  },
  richDataCardTitle: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: rf(14),
    marginBottom: rf(4),
  },
  richDataCardSubtitle: {
    color: colors.textSecondary,
    fontSize: rf(12),
  },
  suggestionsWrapper: {
    marginTop: rf(16),
  },
  suggestionsLabel: {
    color: colors.textSecondary,
    fontSize: rf(14),
    fontWeight: '600',
    marginBottom: rf(12),
  },
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rf(10),
  },
  suggestionChip: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    paddingVertical: rf(10),
    paddingHorizontal: rf(14),
    borderRadius: rf(20),
  },
  suggestionChipText: {
    color: colors.textPrimary,
    fontSize: rf(13),
    fontWeight: '500',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: rf(16),
    paddingBottom: Platform.OS === 'ios' ? rf(32) : rf(16),
    backgroundColor: colors.surfaceRaised,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.bg,
    color: colors.textPrimary,
    borderRadius: rf(24),
    paddingHorizontal: rf(20),
    paddingVertical: Platform.OS === 'ios' ? rf(14) : rf(10),
    fontSize: rf(15),
    borderWidth: 1,
    borderColor: colors.borderSoft,
    marginRight: rf(12),
  },
  sendButton: {
    width: rf(44),
    height: rf(44),
    borderRadius: rf(22),
    backgroundColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
