import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Mic } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { rf } from '../../theme/responsive';

interface VoiceListeningIndicatorProps {
  isListening: boolean;
  statusText?: string;
  subText?: string;
  partialTranscript?: string;
}

export const VoiceListeningIndicator: React.FC<VoiceListeningIndicatorProps> = ({
  isListening,
  statusText = 'Listening...',
  subText = 'Speak now',
  partialTranscript,
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    if (isListening) {
      scale.value = withRepeat(
        withTiming(1.25, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      opacity.value = withRepeat(
        withTiming(0.15, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      scale.value = withTiming(1, { duration: 300 });
      opacity.value = withTiming(0, { duration: 300 });
    }
  }, [isListening, scale, opacity]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.micCircleWrapper}>
        <Animated.View style={[styles.pulseRing, pulseStyle]} />
        <View style={[styles.micCircle, isListening && styles.micCircleActive]}>
          <Mic
            size={rf(32)}
            color={isListening ? '#FFFFFF' : colors.amber}
            strokeWidth={2.2}
          />
        </View>
      </View>

      <View style={styles.textWrapper}>
        <Text style={styles.statusText}>{statusText}</Text>
        {subText ? <Text style={styles.subText}>{subText}</Text> : null}
      </View>

      {isListening && partialTranscript ? (
        <View style={styles.partialBox}>
          <Text style={styles.partialText}>"{partialTranscript}"</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: rf(16),
    gap: rf(12),
  },
  micCircleWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: rf(96),
    height: rf(96),
  },
  pulseRing: {
    position: 'absolute',
    width: rf(90),
    height: rf(90),
    borderRadius: rf(45),
    backgroundColor: colors.amber,
  },
  micCircle: {
    width: rf(72),
    height: rf(72),
    borderRadius: rf(36),
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  micCircleActive: {
    backgroundColor: colors.amber,
    borderColor: colors.amber,
  },
  textWrapper: {
    alignItems: 'center',
    gap: rf(2),
  },
  statusText: {
    color: colors.textPrimary,
    fontSize: rf(16),
    fontWeight: '700',
  },
  subText: {
    color: colors.textMuted,
    fontSize: rf(13),
  },
  partialBox: {
    backgroundColor: colors.panel,
    paddingHorizontal: rf(14),
    paddingVertical: rf(8),
    borderRadius: rf(12),
    borderWidth: 1,
    borderColor: colors.borderSoft,
    marginTop: rf(4),
  },
  partialText: {
    color: colors.teal,
    fontSize: rf(15),
    fontWeight: '600',
    fontStyle: 'italic',
  },
});
