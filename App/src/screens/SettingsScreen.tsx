import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  KeyRound,
  Lock,
  LogOut,
  ChevronRight,
  Shield,
  User,
  CheckCircle2,
  Mail,
  Info,
  ArrowLeft,
} from 'lucide-react-native';
import useAuthStore from '../store/AuthStore';
import { colors } from '../theme/colors';
import { rf } from '../theme/responsive';

export default function SettingsScreen({ navigation }: any) {
  const { user, logout, requestResetPassword } = useAuthStore();
  const [sendingReset, setSendingReset] = useState(false);
  const insets = useSafeAreaInsets();

  const handleQuickReset = async () => {
    if (!user?.email) {
      navigation.navigate('ResetPassword');
      return;
    }

    Alert.alert(
      'Reset Password',
      `Send password reset instructions to ${user.email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Reset Email',
          onPress: async () => {
            try {
              setSendingReset(true);
              const result = await requestResetPassword(user.email);
              setSendingReset(false);
              Alert.alert(
                result.success ? 'Email Sent' : 'Request Failed',
                result.success
                  ? `Password reset instructions have been sent to ${user.email}. Please check your inbox.`
                  : result.message || 'Unable to send reset instructions.'
              );
            } catch (err: any) {
              setSendingReset(false);
              Alert.alert('Error', err?.message || 'Network error.');
            }
          },
        },
      ]
    );
  };

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'LS';

  return (
    <View style={styles.screen}>
      {/* Top Header Bar with Back Navigation */}
      <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
        {navigation?.canGoBack?.() ? (
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={10}
          >
            <ArrowLeft size={20} color={colors.textPrimary} />
          </Pressable>
        ) : (
          <View style={{ width: 36 }} />
        )}
        <Text style={styles.topBarTitle}>Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* User Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.profileDetails}>
            <Text style={styles.profileName}>{user?.name || 'Administrator'}</Text>
            <Text style={styles.profileEmail}>{user?.email || 'admin@logisphere.ai'}</Text>
            <View style={styles.roleBadge}>
              <Shield size={12} color={colors.amber} />
              <Text style={styles.roleText}>{user?.role || 'FLEET_MANAGER'}</Text>
            </View>
          </View>
        </View>

        {/* SECTION: Security & Password */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SECURITY & CREDENTIALS</Text>

          {/* 1. Forgot Password Option */}
          <Pressable
            style={styles.cardItem}
            onPress={() => navigation.navigate('ResetPassword')}
          >
            <View style={[styles.itemIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
              <KeyRound size={22} color={colors.amber} />
            </View>
            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>Forgot Password</Text>
              <Text style={styles.itemSubtitle}>
                Request a password reset link to your email address
              </Text>
            </View>
            <ChevronRight size={20} color={colors.textMuted} />
          </Pressable>

          {/* Quick Action: Send reset email for current account directly */}
          <Pressable
            style={styles.quickResetBar}
            onPress={handleQuickReset}
            disabled={sendingReset}
          >
            <Mail size={16} color={colors.amber} />
            <Text style={styles.quickResetText}>
              {sendingReset ? 'Sending reset instructions...' : 'Send reset link to current email'}
            </Text>
            {sendingReset && <ActivityIndicator size="small" color={colors.amber} />}
          </Pressable>

          {/* 2. Change Password Option */}
          <Pressable
            style={[styles.cardItem, { marginTop: 12 }]}
            onPress={() => navigation.navigate('ChangePassword')}
          >
            <View style={[styles.itemIconBox, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
              <Lock size={22} color={colors.blue} />
            </View>
            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>Change Password</Text>
              <Text style={styles.itemSubtitle}>
                Update your existing login password
              </Text>
            </View>
            <ChevronRight size={20} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* SECTION: App Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SYSTEM & PREFERENCES</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Platform</Text>
            <Text style={styles.infoValue}>LogiSphere AI Fleet Suite</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Time Zone</Text>
            <Text style={styles.infoValue}>Asia/Kolkata (IST)</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status</Text>
            <View style={styles.statusPill}>
              <CheckCircle2 size={12} color={colors.green} />
              <Text style={styles.statusPillText}>Operational</Text>
            </View>
          </View>
        </View>

        {/* SECTION: Sign Out */}
        <View style={[styles.section, { marginTop: 12 }]}>
          <Pressable
            style={styles.signOutBtn}
            onPress={() => {
              Alert.alert('Sign Out', 'Are you sure you want to log out of LogiSphere AI?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign Out', style: 'destructive', onPress: logout },
              ]);
            }}
          >
            <LogOut size={20} color="#EF4444" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    backgroundColor: colors.panel,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    color: colors.textPrimary,
    fontSize: rf(18),
    fontWeight: '700',
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 60,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.panel,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
    gap: 16,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.amber,
  },
  avatarText: {
    color: colors.amber,
    fontSize: rf(18),
    fontWeight: '800',
  },
  profileDetails: {
    flex: 1,
    gap: 3,
  },
  profileName: {
    color: colors.textPrimary,
    fontSize: rf(16),
    fontWeight: '700',
  },
  profileEmail: {
    color: colors.textMuted,
    fontSize: rf(12),
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: 4,
  },
  roleText: {
    color: colors.amber,
    fontSize: rf(10.5),
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: rf(11.5),
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 4,
  },
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.panel,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 14,
  },
  itemIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    color: colors.textPrimary,
    fontSize: rf(15),
    fontWeight: '700',
  },
  itemSubtitle: {
    color: colors.textMuted,
    fontSize: rf(12),
    marginTop: 2,
    lineHeight: 16,
  },
  quickResetBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 8,
    gap: 8,
  },
  quickResetText: {
    color: colors.amber,
    fontSize: rf(12),
    fontWeight: '600',
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.panel,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    color: colors.textSecondary,
    fontSize: rf(13),
    fontWeight: '500',
  },
  infoValue: {
    color: colors.textPrimary,
    fontSize: rf(13),
    fontWeight: '600',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 222, 128, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  statusPillText: {
    color: colors.green,
    fontSize: rf(11),
    fontWeight: '700',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 14,
    paddingVertical: 14,
    gap: 10,
  },
  signOutText: {
    color: '#EF4444',
    fontSize: rf(15),
    fontWeight: '700',
  },
});
