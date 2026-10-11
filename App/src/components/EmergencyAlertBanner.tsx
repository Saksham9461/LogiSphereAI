import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
} from 'react-native';
import { Siren, X, ChevronRight, MapPin } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAlertStore } from '../store/AlertStore';
import { colors } from '../theme/colors';
import useAuthStore from '../store/AuthStore';
import { rf } from '../theme/responsive';

export default function EmergencyAlertBanner() {
  const activeAlert = useAlertStore((state) => state.activeBannerAlert);
  const dismiss = useAlertStore((state) => state.dismissBannerAlert);
  const setSelectedAlert = useAlertStore((state) => state.setSelectedAlert);
  const user = useAuthStore((state) => state.user);
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const userRole = String(user?.role || '').toUpperCase();
  const isManager = ['ROLE_MANAGER', 'FLEET_MANAGER', 'ROLE_ADMIN', 'ADMIN', 'ROLE_DISPATCHER', 'DISPATCHER', 'MANAGER'].includes(userRole);

  const translateY = useRef(new Animated.Value(-120)).current;

  useEffect(() => {
    if (activeAlert && isManager) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 7,
        tension: 40,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: -140,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [activeAlert, isManager, translateY]);

  if (!activeAlert || !isManager) return null;

  const handleOpenAlert = () => {
    setSelectedAlert(activeAlert);
    dismiss();
    try {
      navigation.navigate('Alerts');
    } catch (_) {}
  };

  const alertTime = new Date(activeAlert.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

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
          <Siren color="#FFFFFF" size={20} strokeWidth={2.5} />
        </View>

        <Pressable style={styles.textContainer} onPress={handleOpenAlert}>
          <View style={styles.headerRow}>
            <Text style={styles.bannerTitle}>🚨 EMERGENCY SOS</Text>
            <Text style={styles.timeText}>{alertTime}</Text>
          </View>
          <Text style={styles.driverName} numberOfLines={1}>
            Driver: {activeAlert.driverName}
          </Text>
          <View style={styles.locRow}>
            <MapPin color="rgba(255,255,255,0.85)" size={12} />
            <Text style={styles.locText} numberOfLines={1}>
              {activeAlert.latitude && activeAlert.longitude
                ? `${activeAlert.latitude.toFixed(4)}, ${activeAlert.longitude.toFixed(4)}`
                : 'Coordinates unavailable'}
            </Text>
          </View>
        </Pressable>

        <View style={styles.actionButtons}>
          <Pressable style={styles.viewBtn} onPress={handleOpenAlert}>
            <Text style={styles.viewBtnText}>VIEW</Text>
            <ChevronRight color="#FFFFFF" size={14} />
          </Pressable>

          <Pressable style={styles.closeBtn} onPress={dismiss} hitSlop={10}>
            <X color="rgba(255,255,255,0.8)" size={18} />
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
    zIndex: 9999,
    elevation: 25,
  },
  bannerContent: {
    backgroundColor: '#DC2626', // High-visibility emergency crimson
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: rf(12),
    letterSpacing: 0.6,
  },
  timeText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: rf(11),
    fontWeight: '600',
  },
  driverName: {
    color: '#FFFFFF',
    fontSize: rf(13),
    fontWeight: '700',
    marginTop: 1,
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  locText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: rf(11),
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 6,
  },
  viewBtn: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: rf(11),
  },
  closeBtn: {
    padding: 4,
  },
});
