import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Alert,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, KeyRound, Mail, Lock } from 'lucide-react-native';
import AppTextInput from '../components/AppTextInput';
import PrimaryButton from '../components/PrimaryButton';
import useAuthStore from '../store/AuthStore';
import { colors } from '../theme/colors';
import { rf } from '../theme/responsive';

export default function ResetPasswordScreen({ route, navigation }: any) {
  const currentUser = useAuthStore(state => state.user);
  const [email, setEmail] = useState(currentUser?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const requestResetPassword = useAuthStore(state => state.requestResetPassword);
  const resetUserPassword = useAuthStore(state => state.resetUserPassword);
  const token = route?.params?.token;

  useEffect(() => {
    if (currentUser?.email && !email) {
      setEmail(currentUser.email);
    }
  }, [currentUser]);

  const handleSubmit = async () => {
    setMessage(null);
    if (!token && !email.trim()) {
      Alert.alert('Required', 'Please enter your registered email address.');
      return;
    }
    if (token && !newPassword.trim()) {
      Alert.alert('Required', 'Please enter your new password.');
      return;
    }

    try {
      setLoading(true);
      const result = token
        ? await resetUserPassword(token, newPassword.trim())
        : await requestResetPassword(email.trim());

      setLoading(false);
      if (result.success) {
        Alert.alert(
          'Request Successful',
          token
            ? 'Your password has been successfully reset! You can now use your new password.'
            : `Password reset instructions have been sent to ${email.trim()}. Please check your inbox.`,
          [
            {
              text: 'OK',
              onPress: () => {
                if (navigation?.canGoBack()) {
                  navigation.goBack();
                }
              },
            },
          ]
        );
      } else {
        Alert.alert('Request Failed', result.message || 'Unable to process password reset request.');
      }
    } catch (err: any) {
      setLoading(false);
      Alert.alert('Error', err?.message || 'Network error.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {navigation?.canGoBack() && (
            <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
              <ArrowLeft size={20} color={colors.textSecondary} />
              <Text style={styles.backText}>Back to Settings</Text>
            </Pressable>
          )}

          <View style={styles.iconContainer}>
            <View style={styles.iconBadge}>
              <KeyRound size={32} color={colors.amber} />
            </View>
          </View>

          <View style={styles.hero}>
            <Text style={styles.title}>{token ? 'Reset Password' : 'Forgot Password'}</Text>
            <Text style={styles.subtitle}>
              {token
                ? 'Enter your new secure password below to regain access to your account.'
                : 'Enter your account email address and we will send you a reset link.'}
            </Text>
          </View>

          <View style={styles.formSpace}>
            {token ? (
              <AppTextInput
                label="New Password"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                placeholder="••••••••"
              />
            ) : (
              <AppTextInput
                label="Registered Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="manager@logisphere.ai"
              />
            )}

            <PrimaryButton
              title={loading ? 'Processing...' : token ? 'Save New Password' : 'Send Reset Instructions'}
              onPress={handleSubmit}
              disabled={loading}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    flexGrow: 1,
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 10,
  },
  backText: {
    color: colors.textSecondary,
    fontSize: rf(14),
    fontWeight: '600',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 40,
  },
  iconBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    color: colors.textPrimary,
    fontSize: rf(26),
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: rf(14),
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  formSpace: {
    gap: 20,
  },
});
