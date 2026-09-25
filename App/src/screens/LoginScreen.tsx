import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppTextInput from '../components/AppTextInput';
import PrimaryButton from '../components/PrimaryButton';
import RoleSelector from '../components/RoleSelector';
import useAuthStore from '../store/AuthStore';
import { colors } from '../theme/colors';
import { roleMap } from '../constants/roles';
import { Check } from 'lucide-react-native';
import { rf } from '../theme/responsive';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Fleet Manager');
  const [rememberMe, setRememberMe] = useState(false);

  const login = useAuthStore(state => state.login);
  const loading = useAuthStore(state => state.loading);
  const error = useAuthStore(state => state.error);

  const { width } = useWindowDimensions();
  const isTablet = width > 768;

  const handleLogin = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      useAuthStore.setState({ error: 'Please enter your email address' });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      useAuthStore.setState({ error: 'Please enter a valid email address' });
      return;
    }
    if (!password) {
      useAuthStore.setState({ error: 'Please enter your password' });
      return;
    }

    const backendRole = roleMap[role] || role;
    await login(trimmedEmail, password, backendRole);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            isTablet && styles.tabletContent,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formContainer}>
            <View style={styles.hero}>
              <Text style={styles.title}>LogiSphere AI</Text>
            </View>

            <View style={styles.formSpace}>
              <AppTextInput
                label="Email"
                value={email}
                onChangeText={text => {
                  setEmail(text);
                  if (error) useAuthStore.setState({ error: null });
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="manager@logisphere.ai"
              />

              <AppTextInput
                label="Password"
                value={password}
                onChangeText={text => {
                  setPassword(text);
                  if (error) useAuthStore.setState({ error: null });
                }}
                secureTextEntry
                placeholder="••••••••"
              />

              <RoleSelector
                value={role}
                onChange={r => {
                  setRole(r);
                  if (error) useAuthStore.setState({ error: null });
                }}
              />
              
              {/* Remember Me Toggle */}
              <Pressable
                style={styles.rememberWrap}
                onPress={() => setRememberMe(!rememberMe)}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                  {rememberMe && <Check size={14} color={colors.bg} strokeWidth={3} />}
                </View>
                <Text style={styles.rememberText}>Remember me</Text>
              </Pressable>
            </View>

            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.buttonSpace}>
              <PrimaryButton
                title={loading ? 'Signing In...' : 'Sign In'}
                onPress={handleLogin}
                disabled={loading}
              />
              <View style={styles.secondaryActions}>
                <PrimaryButton
                  title="Create Account"
                  tone="secondary"
                  onPress={() => {
                    useAuthStore.setState({ error: null });
                    navigation.navigate('Signup');
                  }}
                  disabled={loading}
                />
                <PrimaryButton
                  title="Forgot Password"
                  tone="secondary"
                  onPress={() => {
                    useAuthStore.setState({ error: null });
                    navigation.navigate('ResetPassword');
                  }}
                  disabled={loading}
                />
              </View>
            </View>
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
    flexGrow: 1,
    justifyContent: 'center',
  },
  tabletContent: {
    alignSelf: 'center',
    width: 500,
  },
  formContainer: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    flex: 1,
    justifyContent: 'center',
  },
  hero: {
    gap: 12,
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    color: colors.textPrimary,
    fontSize: rf(34),
    fontWeight: '800',
    letterSpacing: -1,
    textAlign: 'center',
  },
  copy: {
    color: colors.textSecondary,
    lineHeight: 20,
    fontSize: rf(14),
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  formSpace: {
    gap: 16,
    marginBottom: 24,
  },
  rememberWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: colors.amber,
    borderColor: colors.amber,
  },
  rememberText: {
    color: colors.textSecondary,
    fontSize: rf(14),
    fontWeight: '500',
  },
  errorContainer: {
    backgroundColor: 'rgba(251, 100, 116, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(251, 100, 116, 0.3)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  errorText: {
    color: colors.error,
    fontSize: rf(13),
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonSpace: {
    gap: 12,
  },
  secondaryActions: {
    gap: 12,
    marginTop: 8,
  },
});