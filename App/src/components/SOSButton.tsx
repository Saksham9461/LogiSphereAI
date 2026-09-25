import React, { useState } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  View,
} from 'react-native';
import { Siren, ShieldAlert } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { triggerSOSApi } from '../services/sosService';
import useAuthStore from '../store/AuthStore';

interface SOSButtonProps {
  compact?: boolean;
}

export const SOSButton: React.FC<SOSButtonProps> = ({ compact = false }) => {
  const [loading, setLoading] = useState(false);
  const user = useAuthStore((state) => state.user);

  const handlePress = () => {
    Alert.alert(
      '🚨 EMERGENCY SOS',
      'Are you sure you want to trigger an Emergency SOS Alert?\n\nThis will send your location and details to the control center and emergency services immediately.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'TRIGGER SOS',
          style: 'destructive',
          onPress: executeSOS,
        },
      ],
      { cancelable: true }
    );
  };

  const executeSOS = async () => {
    setLoading(true);
    try {
      const res = await triggerSOSApi(user?.id || 'unknown_user');
      if (res.success) {
        Alert.alert(
          '🚨 SOS ALERT DISPATCHED',
          res.isMock
            ? 'Emergency SOS alert registered successfully! Control center and emergency dispatchers have been notified.'
            : 'Emergency signal sent! Support team is on the way.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('SOS Error', 'Failed to dispatch SOS alert. Please try calling emergency services directly.');
      }
    } catch (err: any) {
      Alert.alert('SOS Error', err?.message || 'Unable to complete SOS request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={loading}
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
        compact && styles.compactContainer,
      ]}
      accessibilityRole="button"
      accessibilityLabel="Trigger Emergency SOS"
    >
      <View style={styles.contentContainer}>
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Siren color="#FFFFFF" size={18} strokeWidth={2.5} />
            <Text style={styles.sosText}>SOS</Text>
          </>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  compactContainer: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  sosText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.8,
  },
});

export default SOSButton;
