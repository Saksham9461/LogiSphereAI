import React, { useState, useEffect, useMemo } from 'react';
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
  FileText,
  UserPlus,
  ShieldAlert,
  Leaf,
} from 'lucide-react-native';
import { colors } from '../theme/colors';
import { rf } from '../theme/responsive';
import { useAttendanceStore } from '../store/AttendanceStore';
import useChatStore from '../store/ChatStore';
import { useAlertStore } from '../store/AlertStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePermissions } from '../utils/rbac';

const { width } = Dimensions.get('window');
const GRID_ITEM_WIDTH = Math.floor((width - 88) / 3);

const getIcon = (routeName: string, color: string, size: number) => {
  switch (routeName) {
    case 'Dashboard':
      return <LayoutDashboard color={color} size={size} />;
    case 'VehicleRegistry':
      return <Truck color={color} size={size} />;
    case 'Drivers':
      return <Users color={color} size={size} />;
    case 'Alerts':
      return <ShieldAlert color={color} size={size} />;
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
    case 'AttendanceReport':
      return <FileText color={color} size={size} />;
    case 'CarbonIntelligence':
      return <Leaf color={color} size={size} />;
    case 'Register':
    case 'Signup':
      return <UserPlus color={color} size={size} />;
    default:
      return <LayoutDashboard color={color} size={size} />;
  }
};

const getLabel = (routeName: string, isDriver: boolean = false) => {
  switch (routeName) {
    case 'Dashboard':
      return 'Dashboard';
    case 'VehicleRegistry':
      return 'Vehicles';
    case 'Drivers':
      return 'Drivers';
    case 'Alerts':
      return 'Alerts';
    case 'TripDispatcher':
      return isDriver ? 'My Trips' : 'Trips';
    case 'Maintenance':
      return 'Maintenance';
    case 'FuelExpense':
      return 'Fuel';
    case 'Analytics':
      return 'Analytics';
    case 'CarbonIntelligence':
      return 'Carbon';
    case 'Chat':
      return 'Chat';
    case 'LiveTracking':
      return 'Tracking';
    case 'AIAssistant':
      return 'AI Assistant';
    case 'AttendanceReport':
      return 'Attendance';
    case 'Register':
    case 'Signup':
      return 'Register';
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
  const activeAlertCount = useAlertStore((s) => s.activeCount);
  const { isDriver, isRouteAllowed } = usePermissions();

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

  // Filter routes strictly according to role authorization
  const allowedRoutes = useMemo(() => {
    return state.routes.filter((route: any) => isRouteAllowed(route.name));
  }, [state.routes, isRouteAllowed]);

  // Partition routes strictly so that the bottom navigation bar invariant is always enforced across all roles:
  // [Screen 1, Screen 2, AIAssistant (center sparks), Screen 3, More (expanded menu with all remaining screens)]
  const { primaryRoutes, secondaryRoutes } = useMemo(() => {
    const aiRoute = allowedRoutes.find((r: any) => r.name === 'AIAssistant');
    const nonAiRoutes = allowedRoutes.filter((r: any) => r.name !== 'AIAssistant');

    const screen1 = nonAiRoutes[0];
    const screen2 = nonAiRoutes[1];
    const screen3 = nonAiRoutes[2];
    const remainingNonAi = nonAiRoutes.slice(3);

    const primary: any[] = [];
    if (screen1) primary.push(screen1);
    if (screen2) primary.push(screen2);
    if (aiRoute) {
      primary.push(aiRoute);
    } else {
      const next = remainingNonAi.shift();
      if (next) primary.push(next);
    }
    if (screen3) primary.push(screen3);

    return {
      primaryRoutes: primary,
      secondaryRoutes: remainingNonAi,
    };
  }, [allowedRoutes]);

  // Check if active screen is in the secondary list
  const currentActiveRoute = state.routes[state.index];
  const isSecondaryActive = secondaryRoutes.some((route: any) => route.key === currentActiveRoute?.key);

  // Screens always accessible regardless of clock-in state
  const CLOCK_IN_EXEMPT = ['Dashboard'];

  const handlePress = (route: any, isFocused: boolean) => {
    if (isMoreOpen) setIsMoreOpen(false);

    // Clock-in gate — show alert, never dim or disable icons
    if (!isClockedIn && !CLOCK_IN_EXEMPT.includes(route.name)) {
      Alert.alert(
        '⏱ Clock In Required',
        'You must clock in before accessing this module.\n\nPlease clock in from the Dashboard to start your shift.',
        [{ text: 'Go to Dashboard', onPress: () => navigation.navigate('Dashboard') }]
      );
      return;
    }

    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  };

  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const currentRouteName = state.routes[state.index]?.name;
  if (currentRouteName === 'Chat' && activeConversationId) {
    return null;
  }

  return (
    <View style={styles.wrapper} pointerEvents="box-none">

      {/* Background Overlay to close menu when tapping outside */}
      <Animated.View style={[styles.overlay, animatedOverlayStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsMoreOpen(false)} />
      </Animated.View>

      {/* Expanded Glassmorphic Menu */}
      <Animated.View style={[styles.expandedMenu, animatedMenuStyle]}>
        <View style={styles.grid}>
          {secondaryRoutes.length > 0 ? (
            secondaryRoutes.map((route: any) => {
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
                    {route.name === 'Alerts' && activeAlertCount > 0 && (
                      <View style={styles.menuBadge}>
                        <Text style={styles.menuBadgeText}>
                          {activeAlertCount > 99 ? '99+' : activeAlertCount}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.gridItemText, { color }]}>{getLabel(route.name, isDriver)}</Text>
                </Pressable>
              );
            })
          ) : (
            <View style={{ width: '100%', padding: 24, alignItems: 'center' }}>
              <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: '600' }}>
                No additional modules available
              </Text>
            </View>
          )}
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
        {primaryRoutes.map((route: any) => {
          const isFocused = currentActiveRoute?.key === route.key;
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
              <Text style={[styles.tabLabel, { color }]}>{getLabel(route.name, isDriver)}</Text>
            </Pressable>
          );
        })}

        {/* More Button - Invariant 5th item across all roles */}
        <Pressable
          style={styles.tabItem}
          onPress={() => {
            if (!isClockedIn) {
              Alert.alert(
                '⏱ Clock In Required',
                'You must clock in before accessing this module.\n\nPlease clock in from the Dashboard to start your shift.',
                [{ text: 'Go to Dashboard', onPress: () => navigation.navigate('Dashboard') }]
              );
              return;
            }
            setIsMoreOpen(!isMoreOpen);
          }}>
          <View style={[styles.activeIndicator, { opacity: (isMoreOpen || isSecondaryActive) ? 1 : 0 }]} />
          {isMoreOpen ? (
            <X color={colors.amber} size={24} />
          ) : (
            <MoreHorizontal color={isSecondaryActive ? colors.amber : colors.textMuted} size={24} />
          )}
          {activeAlertCount > 0 && (
            <View style={styles.moreBadge}>
              <Text style={styles.moreBadgeText}>
                {activeAlertCount > 99 ? '99+' : activeAlertCount}
              </Text>
            </View>
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
  moreBadge: {
    position: 'absolute',
    top: 4,
    right: 18,
    backgroundColor: '#DC2626',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: colors.panel,
  },
  moreBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  menuBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#DC2626',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  menuBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
});
