import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {User} from 'lucide-react-native';
import MainTabsNavigator from './MainTabsNavigator';
import useAuthStore from '../store/AuthStore';
import {colors} from '../theme/colors';
import SOSButton from '../components/SOSButton';

export default function MainDrawerNavigator({navigation}: any) {
  const user = useAuthStore(state => state.user);
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={[styles.header, {paddingTop: insets.top + 6}]}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Hey! {user?.name || 'User'}
        </Text>
        <View style={styles.headerRight}>
          <SOSButton />
          <Pressable
            onPress={() => navigation.navigate('Settings')}
            style={styles.profileBtn}
            hitSlop={8}
          >
            <User color={colors.textPrimary} size={20} />
          </Pressable>
        </View>
      </View>

      {/* Main Operations Tabs */}
      <View style={styles.content}>
        <MainTabsNavigator />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    backgroundColor: colors.panel,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginLeft: 12,
  },
  profileBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
});
