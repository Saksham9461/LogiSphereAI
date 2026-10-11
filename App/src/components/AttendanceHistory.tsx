import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Clock, MapPin, CheckCircle } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { rf } from '../theme/responsive';
import { useAttendanceStore } from '../store/AttendanceStore';

function isRecordFromToday(item: any): boolean {
  if (!item) return false;

  const now = new Date();
  const timeZone = 'Asia/Kolkata';

  let todayKolkata = '';
  try {
    todayKolkata = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
  } catch (_) {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    todayKolkata = `${y}-${m}-${d}`;
  }

  const localY = now.getFullYear();
  const localM = String(now.getMonth() + 1).padStart(2, '0');
  const localD = String(now.getDate()).padStart(2, '0');
  const todayLocal = `${localY}-${localM}-${localD}`;

  // 1. Check timestamp (createdAt / created_at / createdat)
  const timestamp = item.createdAt || item.created_at || item.createdat;
  if (timestamp) {
    try {
      const d = new Date(timestamp);
      if (!isNaN(d.getTime())) {
        let recKolkata = '';
        try {
          recKolkata = new Intl.DateTimeFormat('en-CA', {
            timeZone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          }).format(d);
        } catch (_) {
          recKolkata = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }
        if (recKolkata === todayKolkata || recKolkata === todayLocal) {
          return true;
        }

        const recLocal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (recLocal === todayLocal || recLocal === todayKolkata) {
          return true;
        }
      }
    } catch (_) {}
  }

  // 2. Check item.date string
  const rawDate = typeof item.date === 'string' ? item.date.trim() : '';
  if (rawDate) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      return rawDate === todayKolkata || rawDate === todayLocal;
    }

    const parts = rawDate.split(/[/.-]/);
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        const p1 = parts[0].padStart(2, '0');
        const p2 = parts[1].padStart(2, '0');
        const y = parts[2];
        if (`${y}-${p2}-${p1}` === todayKolkata || `${y}-${p2}-${p1}` === todayLocal) {
          return true;
        }
        if (`${y}-${p1}-${p2}` === todayKolkata || `${y}-${p1}-${p2}` === todayLocal) {
          return true;
        }
      } else if (parts[0].length === 4) {
        const y = parts[0];
        const m = parts[1].padStart(2, '0');
        const d = parts[2].padStart(2, '0');
        if (`${y}-${m}-${d}` === todayKolkata || `${y}-${m}-${d}` === todayLocal) {
          return true;
        }
      }
    }

    const todayIN = now.toLocaleDateString('en-IN');
    const todayDef = now.toLocaleDateString();
    if (rawDate === todayIN || rawDate === todayDef) {
      return true;
    }
  }

  // 3. Newly created in-memory session without explicit date
  if (!timestamp && !rawDate && item.clockInTime) {
    return true;
  }

  return false;
}

export default function AttendanceHistory() {
  const { history, fetchStatus, loading } = useAttendanceStore();

  // Automatically fetch attendance data on initial mount and when app resumes
  useEffect(() => {
    fetchStatus();

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        fetchStatus();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [fetchStatus]);

  // Automatically fetch attendance data whenever the user navigates/reaches this screen,
  // and keep polling every 15s while the user remains on the screen
  useFocusEffect(
    useCallback(() => {
      fetchStatus();
      const interval = setInterval(() => {
        fetchStatus();
      }, 15000);
      return () => {
        clearInterval(interval);
      };
    }, [fetchStatus])
  );

  const todayLogs = React.useMemo(() => {
    return (history || []).filter(isRecordFromToday);
  }, [history]);

  if (loading && todayLogs.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Recent Logs</Text>
        <View style={styles.emptyBox}>
          <ActivityIndicator size="small" color={colors.amber} />
          <Text style={styles.emptyText}>Loading today's logs...</Text>
        </View>
      </View>
    );
  }

  if (todayLogs.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Recent Logs</Text>
        <View style={styles.emptyBox}>
          <Clock color={colors.textMuted} size={24} />
          <Text style={styles.emptyText}>No attendance records for today.</Text>
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
            <Text style={styles.logActionOut}>
              {item.autoClockOut ? 'Auto Clock-Out' : 'Clocked Out'}
            </Text>
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
        data={todayLogs}
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
  },
});
