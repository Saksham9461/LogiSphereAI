import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  Lock,
  Eye,
  EyeOff,
  Check,
  X,
  AlertTriangle,
  LogOut,
  ShieldCheck,
} from 'lucide-react-native';
import { colors } from '../theme/colors';
import { rf } from '../theme/responsive';
import useAuthStore from '../store/AuthStore';

export default function ChangePasswordScreen() {
  const { changePassword, logout, loading, error: storeError } = useAuthStore();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');

  // Password Requirements Validation
  const checks = useMemo(() => {
    return {
      minLength: newPassword.length >= 8,
      hasUpper: /[A-Z]/.test(newPassword),
      hasLower: /[a-z]/.test(newPassword),
      hasNumber: /[0-9]/.test(newPassword),
      hasSpecial: /[^A-Za-z0-9]/.test(newPassword),
      matchesConfirm: newPassword.length > 0 && newPassword === confirmPassword,
    };
  }, [newPassword, confirmPassword]);

  const isValid =
    checks.minLength &&
    checks.hasUpper &&
    checks.hasLower &&
    checks.hasNumber &&
    checks.hasSpecial &&
    checks.matchesConfirm &&
    currentPassword.length > 0;

  const handleUpdatePassword = async () => {
    setErrorMessage('');
    if (!currentPassword) {
      setErrorMessage('Please enter your current temporary password.');
      return;
    }
    if (!newPassword) {
      setErrorMessage('Please enter a new password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('New password and confirmation do not match.');
      return;
    }
    if (!isValid) {
      setErrorMessage('Please ensure all password security requirements are met.');
      return;
    }

    const result = await changePassword(currentPassword, newPassword);

    if (!result.success) {
      setErrorMessage(result.message || 'Failed to update password.');
    } else {
      Alert.alert('Success', 'Password updated successfully! Welcome to LogiSphere AI.');
    }
  };

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* HEADER */}
          <View style={styles.header}>
            <View style={styles.iconBadge}>
              <ShieldCheck size={rf(32)} color={colors.amber} />
            </View>
            <Text style={styles.title}>Set Your Password</Text>
            <Text style={styles.subtitle}>
              For security, you must create a new password before continuing to your Driver Dashboard.
            </Text>
          </View>

          {/* CARD FORM */}
          <View style={styles.card}>
            {/* ERROR BANNER */}
            {errorMessage || storeError ? (
              <View style={styles.errorBox}>
                <AlertTriangle size={16} color={colors.rose} />
                <Text style={styles.errorText}>{errorMessage || storeError}</Text>
              </View>
            ) : null}

            {/* CURRENT PASSWORD */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Current (Temporary) Password</Text>
              <View style={styles.inputWrapper}>
                <Lock size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Enter temporary password"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showCurrent}
                  autoCapitalize="none"
                />
                <Pressable onPress={() => setShowCurrent(!showCurrent)} style={styles.eyeBtn}>
                  {showCurrent ? <EyeOff size={18} color={colors.textMuted} /> : <Eye size={18} color={colors.textMuted} />}
                </Pressable>
              </View>
            </View>

            {/* NEW PASSWORD */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>New Password</Text>
              <View style={styles.inputWrapper}>
                <Lock size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Create new password"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showNew}
                  autoCapitalize="none"
                />
                <Pressable onPress={() => setShowNew(!showNew)} style={styles.eyeBtn}>
                  {showNew ? <EyeOff size={18} color={colors.textMuted} /> : <Eye size={18} color={colors.textMuted} />}
                </Pressable>
              </View>
            </View>

            {/* CONFIRM PASSWORD */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm New Password</Text>
              <View style={styles.inputWrapper}>
                <Lock size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter new password"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showConfirm}
                  autoCapitalize="none"
                />
                <Pressable onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeBtn}>
                  {showConfirm ? <EyeOff size={18} color={colors.textMuted} /> : <Eye size={18} color={colors.textMuted} />}
                </Pressable>
              </View>
            </View>

            {/* CHECKLIST */}
            <View style={styles.requirementsBox}>
              <Text style={styles.requirementsTitle}>Password Requirements:</Text>
              <RequirementItem label="At least 8 characters long" valid={checks.minLength} />
              <RequirementItem label="Contains an uppercase letter (A-Z)" valid={checks.hasUpper} />
              <RequirementItem label="Contains a lowercase letter (a-z)" valid={checks.hasLower} />
              <RequirementItem label="Contains a number (0-9)" valid={checks.hasNumber} />
              <RequirementItem label="Contains a special character (!@#$%^&*)" valid={checks.hasSpecial} />
              <RequirementItem label="New passwords match" valid={checks.matchesConfirm} />
            </View>

            {/* SUBMIT BUTTON */}
            <Pressable
              style={[styles.submitBtn, (!isValid || loading) && styles.submitBtnDisabled]}
              onPress={handleUpdatePassword}
              disabled={!isValid || loading}
            >
              {loading ? (
                <ActivityIndicator color="#1a1200" />
              ) : (
                <Text style={styles.submitBtnText}>Update Password & Continue</Text>
              )}
            </Pressable>
          </View>

          {/* LOGOUT OPTION */}
          <Pressable style={styles.logoutBtn} onPress={logout}>
            <LogOut size={16} color={colors.textMuted} />
            <Text style={styles.logoutBtnText}>Sign Out</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const RequirementItem = ({ label, valid }: { label: string; valid: boolean }) => (
  <View style={styles.reqItem}>
    {valid ? (
      <View style={[styles.reqBadge, { backgroundColor: 'rgba(74,222,128,0.2)' }]}>
        <Check size={12} color={colors.green} />
      </View>
    ) : (
      <View style={[styles.reqBadge, { backgroundColor: 'rgba(136,145,171,0.15)' }]}>
        <X size={12} color={colors.textMuted} />
      </View>
    )}
    <Text style={[styles.reqText, { color: valid ? colors.green : colors.textMuted }]}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  container: { paddingHorizontal: rf(20), paddingVertical: rf(40), flexGrow: 1, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: rf(24), gap: rf(8) },
  iconBadge: {
    width: rf(64),
    height: rf(64),
    borderRadius: rf(32),
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: rf(8),
  },
  title: { color: colors.textPrimary, fontSize: rf(24), fontWeight: '800', letterSpacing: -0.5, textAlign: 'center' },
  subtitle: { color: colors.textMuted, fontSize: rf(13), textAlign: 'center', lineHeight: rf(18), paddingHorizontal: rf(12) },

  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: rf(20),
    padding: rf(20),
    gap: rf(16),
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rf(8),
    backgroundColor: 'rgba(251,113,133,0.15)',
    borderWidth: 1,
    borderColor: colors.rose,
    borderRadius: rf(10),
    padding: rf(12),
  },
  errorText: { color: colors.rose, fontSize: rf(13), flex: 1, fontWeight: '600' },

  inputGroup: { gap: rf(6) },
  label: { color: colors.textMuted, fontSize: rf(11), textTransform: 'uppercase', fontWeight: '700' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: rf(10),
    paddingHorizontal: rf(12),
    height: rf(48),
  },
  inputIcon: { marginRight: rf(10) },
  input: { flex: 1, color: colors.textPrimary, fontSize: rf(14), height: '100%' },
  eyeBtn: { padding: rf(6) },

  requirementsBox: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: rf(12),
    padding: rf(14),
    gap: rf(8),
    marginTop: rf(4),
  },
  requirementsTitle: { color: colors.textPrimary, fontSize: rf(12), fontWeight: '700', marginBottom: rf(2) },
  reqItem: { flexDirection: 'row', alignItems: 'center', gap: rf(8) },
  reqBadge: { width: rf(18), height: rf(18), borderRadius: rf(9), alignItems: 'center', justifyContent: 'center' },
  reqText: { fontSize: rf(12), fontWeight: '600' },

  submitBtn: {
    backgroundColor: colors.amber,
    height: rf(50),
    borderRadius: rf(12),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: rf(8),
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#1a1200', fontSize: rf(15), fontWeight: '800' },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rf(8),
    marginTop: rf(24),
    paddingVertical: rf(10),
  },
  logoutBtnText: { color: colors.textMuted, fontSize: rf(14), fontWeight: '600' },
});
