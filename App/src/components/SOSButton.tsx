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

  // Strict role requirement: SOS button is visible ONLY to authenticated Drivers
  const role = String(user?.role || '').toUpperCase();
  const isDriver = role === 'ROLE_DRIVER' || role === 'DRIVER';

  if (!isDriver) {
    return null;
  }

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
    if (loading) return;
    setLoading(true);
    try {
      const res = await triggerSOSApi();
      if (res.success && res.alert) {
        const alertTime = new Date(res.alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const locInfo = res.alert.latitude && res.alert.longitude
          ? `\nCoordinates: ${res.alert.latitude.toFixed(4)}, ${res.alert.longitude.toFixed(4)}`
          : '\nLocation: Coordinates unavailable';

        Alert.alert(
          '🚨 EMERGENCY SOS DISPATCHED',
          `Emergency alert registered successfully!\n\nAlert ID: ${res.alert.id}\nTime: ${alertTime}${locInfo}\n\nAuthorized managers and control center have been notified immediately in real time.`,
          [{ text: 'Understood' }]
        );
      } else if (res.queued) {
        // Driver is offline or experienced network failure; request is safely queued locally
        Alert.alert(
          '🚨 EMERGENCY SOS SAVED OFFLINE',
          `No internet connection. SOS saved and will be sent automatically when connectivity returns.\n\nStatus: Pending sync\nTracking ID: ${res.clientRequestId || 'Queued'}\n\n⚠️ Notice: Offline SOS has not reached managers yet. If you are in immediate danger, please call emergency telephone services directly.`,
          [
            { text: 'Understood' },
            {
              text: 'Retry Sync Now',
              onPress: () => {
                const { sosSyncWorker } = require('../services/sosSyncWorker');
                sosSyncWorker.syncPendingSOS('user_retry_press');
              },
            },
          ]
        );
      } else {
        const errorMsg = res.error || 'Failed to dispatch SOS alert to the server.';
        Alert.alert(
          '🚨 Emergency SOS Failed',
          `${errorMsg}\n\nWould you like to retry transmitting the emergency alert immediately?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Retry SOS',
              style: 'destructive',
              onPress: executeSOS,
            },
          ]
        );
      }
    } catch (err: any) {
      const errorMsg = err?.message || 'Unable to complete SOS request.';
      Alert.alert(
        '🚨 Emergency SOS Saved Offline',
        `No internet connection. SOS saved and will be sent automatically when connectivity returns.\n\nStatus: Pending sync\n\n${errorMsg}`,
        [{ text: 'Understood' }]
      );
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
