import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Bot } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { rf } from '../../theme/responsive';

interface VoiceQuestionProps {
  question: string;
  exampleSpoken?: string;
}

export const VoiceQuestion: React.FC<VoiceQuestionProps> = ({
  question,
  exampleSpoken,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.assistantBadge}>
          <Bot size={rf(16)} color={colors.amber} />
          <Text style={styles.assistantTitle}>LogiSphere AI Assistant</Text>
        </View>
      </View>
      <Text style={styles.questionText}>"{question}"</Text>
      {exampleSpoken ? (
        <View style={styles.tipBox}>
          <Text style={styles.tipText}>💡 Tip: {exampleSpoken}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: rf(16),
    padding: rf(16),
    gap: rf(10),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assistantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rf(6),
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: rf(10),
    paddingVertical: rf(4),
    borderRadius: rf(20),
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  assistantTitle: {
    color: colors.amber,
    fontSize: rf(12),
    fontWeight: '700',
  },
  questionText: {
    color: colors.textPrimary,
    fontSize: rf(18),
    fontWeight: '700',
    lineHeight: rf(24),
  },
  tipBox: {
    backgroundColor: colors.panel,
    paddingHorizontal: rf(10),
    paddingVertical: rf(6),
    borderRadius: rf(8),
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  tipText: {
    color: colors.textMuted,
    fontSize: rf(12),
    fontWeight: '500',
  },
});
