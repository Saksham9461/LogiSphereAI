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
import { roleMap } from '../constants/roles';
import useAuthStore from '../store/AuthStore';
import { colors } from '../theme/colors';
import { rf } from '../theme/responsive';
import { ArrowLeft } from 'lucide-react-native';

export default function SignupScreen({ navigation }: any) {
  const signup = useAuthStore(state => state.signup);
  const loading = useAuthStore(state => state.loading);
  const error = useAuthStore(state => state.error);

  const [name, setName] = useState('');
  const [phoneNo, setPhoneNo] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Dispatcher');
  const [licenseNo, setLicenseNo] = useState('');
  const [licenseExpiryDate, setLicenseExpiryDate] = useState('');

  const { width } = useWindowDimensions();
  const isTablet = width > 768;

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phoneNo.trim();
    const trimmedPassword = password.trim();

    if (!trimmedName || trimmedName.length < 2) {
      useAuthStore.setState({ error: 'Please enter a valid full name.' });
      return;
    }
    const cleanPhone = trimmedPhone.replace(/[\s-]/g, '');
    if (!cleanPhone || !/^\d{10}$/.test(cleanPhone)) {
      useAuthStore.setState({ error: 'Please enter a valid 10-digit phone number.' });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      useAuthStore.setState({ error: 'Please enter a valid email address.' });
      return;
    }
    if (!trimmedPassword || trimmedPassword.length < 6) {
      useAuthStore.setState({ error: 'Password must be at least 6 characters long.' });
      return;
    }
    if ((role === 'Driver' || role === 'ROLE_DRIVER') && !licenseNo.trim()) {
      useAuthStore.setState({ error: 'License number is required for Driver role.' });
      return;
    }

    const payload: Record<string, unknown> = {
      name: trimmedName,
      email: trimmedEmail,
      password: trimmedPassword,
      phoneNo: cleanPhone,
      role: roleMap[role] || role,
      licenseNo: role === 'Driver' ? licenseNo.trim() : undefined,
      licenseExpiryDate: role === 'Driver' && licenseExpiryDate ? new Date(licenseExpiryDate).toISOString() : undefined,
    };

    await signup(payload);
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
            <Pressable
              style={styles.backButton}
              onPress={() => {
                useAuthStore.setState({ error: null });
                navigation.goBack();
              }}
            >
              <ArrowLeft size={20} color={colors.textSecondary} />
              <Text style={styles.backText}>Back to Sign In</Text>
            </Pressable>

            <View style={styles.hero}>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Join LogiSphere AI to manage your fleet & drivers</Text>
            </View>

            <View style={styles.formSpace}>
              <AppTextInput
                label="Full Name"
                value={name}
                onChangeText={text => {
                  setName(text);
                  if (error) useAuthStore.setState({ error: null });
                }}
                placeholder="John Doe"
              />

              <AppTextInput
                label="Phone Number"
                value={phoneNo}
                onChangeText={text => {
                  setPhoneNo(text);
                  if (error) useAuthStore.setState({ error: null });
                }}
                keyboardType="phone-pad"
                placeholder="9876543210"
              />

              <AppTextInput
                label="Email Address"
                value={email}
                onChangeText={text => {
                  setEmail(text);
                  if (error) useAuthStore.setState({ error: null });
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="john.doe@logisphere.ai"
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

              {role === 'Driver' && (
                <>
                  <AppTextInput
                    label="License Number"
                    value={licenseNo}
                    onChangeText={text => {
                      setLicenseNo(text);
                      if (error) useAuthStore.setState({ error: null });
                    }}
                    placeholder="DL-1420110012345"
                  />
                  <AppTextInput
                    label="License Expiry Date"
                    value={licenseExpiryDate}
                    onChangeText={text => {
                      setLicenseExpiryDate(text);
                      if (error) useAuthStore.setState({ error: null });
                    }}
                    placeholder="YYYY-MM-DD"
                  />
                </>
              )}
            </View>

            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.buttonSpace}>
              <PrimaryButton
                title={loading ? 'Creating Account...' : 'Register'}
                onPress={handleSubmit}
                disabled={loading}
              />
              <PrimaryButton
                title="Already have an account? Sign In"
                tone="secondary"
                onPress={() => {
                  useAuthStore.setState({ error: null });
                  navigation.navigate('Login');
                }}
                disabled={loading}
              />
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
    paddingVertical: 20,
  },
  tabletContent: {
    alignSelf: 'center',
    width: 500,
  },
  formContainer: {
    paddingHorizontal: 24,
    flex: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    paddingVertical: 8,
  },
  backText: {
    color: colors.textSecondary,
    fontSize: rf(14),
    fontWeight: '500',
  },
  hero: {
    gap: 6,
    marginBottom: 28,
  },
  title: {
    color: colors.textPrimary,
    fontSize: rf(28),
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: rf(14),
  },
  formSpace: {
    gap: 16,
    marginBottom: 24,
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
    marginBottom: 32,
  },
});
