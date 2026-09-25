import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { rf } from '../../theme/responsive';

interface VoiceProgressProps {
  currentIndex: number;
  totalFields: number;
  currentLabel: string;
}

export const VoiceProgress: React.FC<VoiceProgressProps> = ({
  currentIndex,
  totalFields,
  currentLabel,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.textRow}>
        <Text style={styles.stepText}>
          Question {currentIndex + 1} of {totalFields}
        </Text>
        <Text style={styles.labelText}>{currentLabel}</Text>
      </View>
      <View style={styles.dotsContainer}>
        {Array.from({ length: totalFields }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index === currentIndex && styles.activeDot,
              index < currentIndex && styles.completedDot,
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: rf(12),
    gap: rf(8),
  },
  textRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepText: {
    color: colors.amber,
    fontSize: rf(12),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  labelText: {
    color: colors.textMuted,
    fontSize: rf(12),
    fontWeight: '600',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rf(6),
  },
  dot: {
    flex: 1,
    height: rf(4),
    borderRadius: rf(2),
    backgroundColor: colors.borderSoft,
  },
  activeDot: {
    backgroundColor: colors.amber,
    height: rf(6),
  },
  completedDot: {
    backgroundColor: colors.teal,
  },
});
