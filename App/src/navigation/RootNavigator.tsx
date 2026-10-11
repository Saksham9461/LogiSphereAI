import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import useAuthStore from '../store/AuthStore';
import AuthNavigator from './AuthNavigator';
import MainDrawerNavigator from './MainDrawerNavigator';
import SettingsScreen from '../screens/SettingsScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import AttendanceReportScreen from '../screens/AttendanceReportScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import SplashScreen from '../screens/SplashScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const authStatus = useAuthStore(state => state.authStatus);
  const token = useAuthStore(state => state.token);
  const user = useAuthStore(state => state.user);

  const mustChangePassword = Boolean(user?.mustChangePassword || user?.must_change_password);

  return (
    <Stack.Navigator screenOptions={{headerShown: false, animation: 'fade'}}>
      {authStatus === 'initializing' ? (
        <Stack.Screen name="Splash" component={SplashScreen} />
      ) : authStatus !== 'authenticated' || !token ? (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : mustChangePassword ? (
        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ gestureEnabled: false }} />
      ) : (
        <Stack.Group screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Main" component={MainDrawerNavigator} options={{ headerShown: false }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="AttendanceReport" component={AttendanceReportScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ headerShown: false }} />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}
