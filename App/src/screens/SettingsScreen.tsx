import React from 'react';
import {Text} from 'react-native';
import PrimaryButton from '../components/PrimaryButton';
import Screen from '../components/Screen';
import useAuthStore from '../store/AuthStore';
import {colors} from '../theme/colors';

export default function SettingsScreen() {
  const logout = useAuthStore(state => state.logout);

  return (
    <Screen>
      <Text style={{color: colors.textPrimary, fontSize: 26, fontWeight: '900'}}>Settings</Text>
      <PrimaryButton title="Sign Out" tone="danger" onPress={logout} />
    </Screen>
  );
}
