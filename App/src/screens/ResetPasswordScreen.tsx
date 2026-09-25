import React, {useState} from 'react';
import {Alert} from 'react-native';
import AppTextInput from '../components/AppTextInput';
import PrimaryButton from '../components/PrimaryButton';
import Screen from '../components/Screen';
import useAuthStore from '../store/AuthStore';

export default function ResetPasswordScreen({route}: any) {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const requestResetPassword = useAuthStore(state => state.requestResetPassword);
  const resetUserPassword = useAuthStore(state => state.resetUserPassword);
  const token = route?.params?.token;

  const handleSubmit = async () => {
    const result = token
      ? await resetUserPassword(token, newPassword)
      : await requestResetPassword(email.trim());
    Alert.alert(result.success ? 'Request sent' : 'Request failed', result.success ? 'Please check the next step.' : result.message);
  };

  return (
    <Screen>
      {token ? (
        <AppTextInput label="New Password" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
      ) : (
        <AppTextInput label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      )}
      <PrimaryButton title={token ? 'Reset Password' : 'Send Reset Email'} onPress={handleSubmit} />
    </Screen>
  );
}
