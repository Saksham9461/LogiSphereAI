import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import useAuthStore from '../store/AuthStore';
import AuthNavigator from './AuthNavigator';
import MainDrawerNavigator from './MainDrawerNavigator';
import ProfileScreen from '../screens/ProfileScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const token = useAuthStore(state => state.token);
  const user = useAuthStore(state => state.user);

  const mustChangePassword = Boolean(user?.mustChangePassword || user?.must_change_password);

  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      {!token ? (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : mustChangePassword ? (
        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ gestureEnabled: false }} />
      ) : (
        <Stack.Group>
          <Stack.Screen name="Main" component={MainDrawerNavigator} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}
