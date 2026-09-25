import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { Clock, MapPin, CheckCircle } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { rf } from '../theme/responsive';
import { useAttendanceStore } from '../store/AttendanceStore';

export default function AttendanceHistory() {
  const { history } = useAttendanceStore();

  if (history.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Recent Logs</Text>
        <View style={styles.emptyBox}>
          <Clock color={colors.textMuted} size={24} />
          <Text style={styles.emptyText}>No attendance records yet.</Text>
        </View>
      </View>
    );
  }

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.logItem}>
      <View style={styles.logLeft}>
        <Text style={styles.logTime}>{item.clockInTime}</Text>
        <Text style={styles.logAction}>Clocked In</Text>
        {item.clockOutTime && (
          <View style={styles.clockOutBox}>
            <Text style={styles.logTimeOut}>{item.clockOutTime}</Text>
            <Text style={styles.logActionOut}>Clocked Out</Text>
          </View>
        )}
      </View>
      <View style={styles.logDivider} />
      <View style={styles.logRight}>
        <View style={styles.logRow}>
          <MapPin color={colors.textSecondary} size={14} />
          <Text style={styles.logLocation} numberOfLines={1}>{item.locationName}</Text>
        </View>
        <Text style={styles.logDistance}>{item.distanceFromOffice} m from office</Text>
        <View style={styles.logRowSuccess}>
          <CheckCircle color={colors.success} size={12} />
          <Text style={styles.logStatus}>{item.status}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Recent Logs</Text>
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        scrollEnabled={false}
        contentContainerStyle={styles.listContainer}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: rf(16),
    padding: rf(16),
    borderWidth: 1,
    borderColor: colors.borderSoft,
    marginBottom: rf(24),
  },
  sectionTitle: {
    fontSize: rf(16),
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: rf(16),
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: rf(24),
    gap: rf(8),
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: rf(14),
  },
  listContainer: {
    paddingBottom: rf(8),
  },
  logItem: {
    flexDirection: 'row',
  },
  logLeft: {
    width: rf(90),
  },
  logTime: {
    fontSize: rf(14),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  logAction: {
    fontSize: rf(12),
    color: colors.textSecondary,
    marginTop: rf(2),
  },
  clockOutBox: {
    marginTop: rf(12),
  },
  logTimeOut: {
    fontSize: rf(14),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  logActionOut: {
    fontSize: rf(12),
    color: colors.textSecondary,
    marginTop: rf(2),
  },
  logDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: rf(16),
  },
  logRight: {
    flex: 1,
    justifyContent: 'center',
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rf(4),
  },
  logLocation: {
    fontSize: rf(14),
    fontWeight: '600',
    color: colors.textPrimary,
  },
  logDistance: {
    fontSize: rf(12),
    color: colors.textMuted,
    marginTop: rf(2),
    marginLeft: rf(18),
  },
  logRowSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rf(4),
    marginTop: rf(8),
  },
  logStatus: {
    fontSize: rf(11),
    fontWeight: '600',
    color: colors.success,
  },
  separator: {
    height: 1,
    backgroundColor: colors.borderSoft,
    marginVertical: rf(16),
  }
});
