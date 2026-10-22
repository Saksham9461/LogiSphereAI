import React, { useMemo } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import DashboardScreen from '../screens/DashboardScreen';
import DriversScreen from '../screens/DriversScreen';
import FuelExpenseScreen from '../screens/FuelExpenseScreen';
import MaintenanceScreen from '../screens/MaintenanceScreen';
import TripDispatcherScreen from '../screens/TripDispatcherScreen';
import VehicleRegistryScreen from '../screens/VehicleRegistryScreen';
import CustomTabBar from './CustomTabBar';
import ChatScreen from '../screens/ChatScreen';
import LiveTrackingScreen from '../screens/LiveTrackingScreen';
import AIAssistantScreen from '../screens/AIAssistantScreen';
import AttendanceReportScreen from '../screens/AttendanceReportScreen';
import SignupScreen from '../screens/SignupScreen';
import AlertsScreen from '../screens/AlertsScreen';
import CarbonIntelligenceScreen from '../screens/CarbonIntelligenceScreen';
import AccessDeniedView from '../components/AccessDeniedView';
import { usePermissions, ROLE_PRIMARY_TABS } from '../utils/rbac';

const Tab = createBottomTabNavigator();

const ALL_SCREENS: Record<string, React.ComponentType<any>> = {
  Dashboard: DashboardScreen,
  TripDispatcher: TripDispatcherScreen,
  VehicleRegistry: VehicleRegistryScreen,
  Drivers: DriversScreen,
  AIAssistant: AIAssistantScreen,
  Chat: ChatScreen,
  LiveTracking: LiveTrackingScreen,
  Alerts: AlertsScreen,
  Maintenance: MaintenanceScreen,
  FuelExpense: FuelExpenseScreen,
  Analytics: AnalyticsScreen,
  AttendanceReport: AttendanceReportScreen,
  CarbonIntelligence: CarbonIntelligenceScreen,
  Register: SignupScreen,
};

export default function MainTabsNavigator() {
  const { canonicalRole, isRouteAllowed } = usePermissions();

  const allowedScreens = useMemo(() => {
    // 1. Retrieve the prioritized primary tabs for this role
    const primaryPriority = ROLE_PRIMARY_TABS[canonicalRole] || [];

    // 2. Filter available screens to only those authorized for this role
    const allowedNames = Object.keys(ALL_SCREENS).filter((name) => isRouteAllowed(name));

    // 3. Order: primary priority screens first, followed by secondary allowed screens
    const sortedNames: string[] = [];

    for (const name of primaryPriority) {
      if (allowedNames.includes(name) && !sortedNames.includes(name)) {
        sortedNames.push(name);
      }
    }

    for (const name of allowedNames) {
      if (!sortedNames.includes(name)) {
        sortedNames.push(name);
      }
    }

    return sortedNames.map((name) => ({
      name,
      component: ALL_SCREENS[name],
    }));
  }, [canonicalRole, isRouteAllowed]);

  if (allowedScreens.length === 0) {
    return (
      <AccessDeniedView
        moduleName="Application Navigation"
        requiredRole="Authorized Organization Member"
      />
    );
  }

  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}>
      {allowedScreens.map((screen) => (
        <Tab.Screen
          key={screen.name}
          name={screen.name}
          component={screen.component}
        />
      ))}
    </Tab.Navigator>
  );
}

