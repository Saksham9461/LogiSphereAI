import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions, Alert } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import {
  LayoutDashboard,
  Truck,
  Users,
  Map,
  Wrench,
  Fuel,
  BarChart3,
  MoreHorizontal,
  X,
  MessageSquare,
  Sparkles,
} from 'lucide-react-native';
import { colors } from '../theme/colors';
import { rf } from '../theme/responsive';
import { useAttendanceStore } from '../store/AttendanceStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const GRID_ITEM_WIDTH = Math.floor((width - 88) / 3); // (width - 32 for menu - 32 for padding - 24 for gaps) / 3

const getIcon = (routeName: string, color: string, size: number) => {
  switch (routeName) {
    case 'Dashboard':
      return <LayoutDashboard color={color} size={size} />;
    case 'VehicleRegistry':
      return <Truck color={color} size={size} />;
    case 'Drivers':
      return <Users color={color} size={size} />;
    case 'TripDispatcher':
      return <Map color={color} size={size} />;
    case 'Maintenance':
      return <Wrench color={color} size={size} />;
    case 'FuelExpense':
      return <Fuel color={color} size={size} />;
    case 'Analytics':
      return <BarChart3 color={color} size={size} />;
    case 'Chat':
      return <MessageSquare color={color} size={size} />;
    case 'LiveTracking':
      return <Map color={color} size={size} />;
    case 'AIAssistant':
      return <Sparkles color={color} size={size} />;
    default:
      return <LayoutDashboard color={color} size={size} />;
  }
};

const getLabel = (routeName: string) => {
  switch (routeName) {
    case 'Dashboard':
      return 'Dashboard';
    case 'VehicleRegistry':
      return 'Vehicles';
    case 'Drivers':
      return 'Drivers';
    case 'TripDispatcher':
      return 'Trips';
    case 'Maintenance':
      return 'Maintenance';
    case 'FuelExpense':
      return 'Fuel';
    case 'Analytics':
      return 'Analytics';
    case 'Chat':
      return 'Chat';
    case 'LiveTracking':
      return 'Tracking';
    case 'AIAssistant':
      return 'AI Assistant';
    default:
      return routeName;
  }
};

export default function CustomTabBar({ state, descriptors, navigation }: any) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const animation = useSharedValue(0);
  const { status } = useAttendanceStore();
  const isClockedIn = status === 'CLOCKED_IN';
  const insets = useSafeAreaInsets();

  useEffect(() => {
    animation.value = withTiming(isMoreOpen ? 1 : 0, {
      duration: 250,
      easing: Easing.out(Easing.ease),
    });
  }, [isMoreOpen, animation]);

  const animatedMenuStyle = useAnimatedStyle(() => {
    const translateY = interpolate(animation.value, [0, 1], [30, 0], Extrapolation.CLAMP);
    const opacity = interpolate(animation.value, [0, 1], [0, 1], Extrapolation.CLAMP);
    const scale = interpolate(animation.value, [0, 1], [0.95, 1], Extrapolation.CLAMP);

    return {
      opacity,
      transform: [{ translateY }, { scale }],
      pointerEvents: isMoreOpen ? 'auto' : 'none',
    };
  });

  const animatedOverlayStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(animation.value, [0, 1], [0, 1], Extrapolation.CLAMP),
      pointerEvents: isMoreOpen ? 'auto' : 'none',
    };
  });

  const primaryRoutes = state.routes.slice(0, 4);
  const secondaryRoutes = state.routes.slice(4);

  // Check if active screen is in the secondary list
  const isSecondaryActive = secondaryRoutes.some((route: any) => route.key === state.routes[state.index].key);

  const handlePress = (route: any, isFocused: boolean) => {
    // TEMPORARILY DISABLED: Clock-in check
    // if (route.name !== 'Dashboard' && !isClockedIn) {
    //   Alert.alert('Clock In Required', 'Please clock in first to access other features.');
    //   if (isMoreOpen) setIsMoreOpen(false);
    //   return;
    // }

    if (isMoreOpen) setIsMoreOpen(false);

    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  };

  return (
    <View style={styles.wrapper} pointerEvents="box-none">

      {/* Background Overlay to close menu when tapping outside */}
      <Animated.View style={[styles.overlay, animatedOverlayStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsMoreOpen(false)} />
      </Animated.View>

      {/* Expanded Glassmorphic Menu */}
      <Animated.View style={[styles.expandedMenu, animatedMenuStyle]}>
        <View style={styles.grid}>
          {secondaryRoutes.map((route: any, index: number) => {
            const isFocused = state.index === state.routes.findIndex((r: any) => r.key === route.key);
            const color = isFocused ? colors.amber : colors.textPrimary;
            const bg = isFocused ? 'rgba(245, 158, 11, 0.15)' : 'rgba(0, 0, 0, 0.03)';

            return (
              <Pressable
                key={route.key}
                style={[styles.gridItem, { backgroundColor: bg }]}
                onPress={() => handlePress(route, isFocused)}>
                <View style={[styles.iconBox, isFocused && { backgroundColor: 'transparent' }]}>
                  {getIcon(route.name, color, 24)}
                </View>
                <Text style={[styles.gridItemText, { color }]}>{getLabel(route.name)}</Text>
              </Pressable>
            );
          })}
        </View>
      </Animated.View>

      {/* Bottom Tab Bar (Flush with bottom, rounded top) */}
      <View style={[
        styles.pillContainer, 
        { 
          paddingBottom: insets.bottom > 0 ? insets.bottom : 12,
          height: 64 + (insets.bottom > 0 ? insets.bottom : 12)
        }
      ]}>
        {primaryRoutes.map((route: any, index: number) => {
          const isFocused = state.index === index;
          const color = isFocused ? colors.amber : colors.textMuted;

          if (route.name === 'AIAssistant') {
            return (
              <View key={route.key} style={styles.tabItem}>
                <Pressable
                  style={styles.fabBump}
                  onPress={() => handlePress(route, isFocused)}>
                  <View style={[styles.fabButton, isFocused && { transform: [{ scale: 1.05 }] }]}>
                    <Sparkles color={colors.panel} size={28} />
                  </View>
                </Pressable>
              </View>
            );
          }

          return (
            <Pressable
              key={route.key}
              style={styles.tabItem}
              onPress={() => handlePress(route, isFocused)}>
              <View style={[styles.activeIndicator, { opacity: isFocused ? 1 : 0 }]} />
              {getIcon(route.name, color, 22)}
              <Text style={[styles.tabLabel, { color }]}>{getLabel(route.name)}</Text>
            </Pressable>
          );
        })}

        {/* More Button */}
        <Pressable
          style={styles.tabItem}
          onPress={() => setIsMoreOpen(!isMoreOpen)}>
          <View style={[styles.activeIndicator, { opacity: (isMoreOpen || isSecondaryActive) ? 1 : 0 }]} />
          {isMoreOpen ? (
            <X color={colors.amber} size={24} />
          ) : (
            <MoreHorizontal color={isSecondaryActive ? colors.amber : colors.textMuted} size={24} />
          )}
          <Text style={[styles.tabLabel, { color: (isMoreOpen || isSecondaryActive) ? colors.amber : colors.textMuted }]}>
            More
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    bottom: -100,
    left: 0,
    right: 0,
    height: Dimensions.get('window').height + 200,
    width: '100%',
  },
  pillContainer: {
    flexDirection: 'row',
    backgroundColor: colors.panel,
    width: '100%',
    paddingTop: 8,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50, // Fixed height for alignment
  },
  fabBump: {
    position: 'absolute',
    top: -30,
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  fabButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#C84B31', // Matching the red/orange from the reference
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C84B31',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  activeIndicator: {
    position: 'absolute',
    top: -8,
    width: 24,
    height: 4,
    backgroundColor: colors.amber,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },
  expandedMenu: {
    width: width - 32,
    backgroundColor: '#FFFFFF',
    borderRadius: rf(24),
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    padding: 16,
    marginBottom: 16, // gap between menu and pill
    elevation: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    width: GRID_ITEM_WIDTH,
    aspectRatio: 1, // square-ish
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  gridItemText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
