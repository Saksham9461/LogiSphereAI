import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ShieldAlert, ArrowLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { rf } from '../theme/responsive';

interface AccessDeniedViewProps {
  moduleName?: string;
  requiredRole?: string;
}

export default function AccessDeniedView({ moduleName = 'this screen', requiredRole }: AccessDeniedViewProps) {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Main', { screen: 'Dashboard' });
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.card}>
        <View style={styles.iconBox}>
          <ShieldAlert size={36} color={colors.rose} />
        </View>
        <Text style={styles.title}>Access Restricted</Text>
        <Text style={styles.description}>
          You do not have the required permissions to view {moduleName}.
        </Text>
        {requiredRole && (
          <Text style={styles.meta}>Authorized roles: {requiredRole}</Text>
        )}
        <Pressable style={styles.button} onPress={handleGoBack}>
          <ArrowLeft size={18} color={colors.textPrimary} />
          <Text style={styles.buttonText}>Return to Dashboard</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: rf(24),
  },
  card: {
    width: '100%',
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: rf(16),
    padding: rf(24),
    alignItems: 'center',
  },
  iconBox: {
    width: rf(64),
    height: rf(64),
    borderRadius: rf(32),
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: rf(16),
  },
  title: {
    fontSize: rf(20),
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: rf(8),
    textAlign: 'center',
  },
  description: {
    fontSize: rf(14),
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: rf(16),
    lineHeight: rf(20),
  },
  meta: {
    fontSize: rf(12),
    color: colors.amber,
    marginBottom: rf(20),
    textAlign: 'center',
    fontWeight: '500',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rf(8),
    backgroundColor: colors.borderSoft,
    paddingHorizontal: rf(20),
    paddingVertical: rf(12),
    borderRadius: rf(10),
  },
  buttonText: {
    color: colors.textPrimary,
    fontSize: rf(14),
    fontWeight: '600',
  },
});
