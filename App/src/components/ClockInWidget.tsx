import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Modal } from 'react-native';
import { MapPin, CheckCircle, AlertTriangle, LogOut } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { rf } from '../theme/responsive';
import { useAttendanceStore } from '../store/AttendanceStore';
import { handleClockIn, handleClockOut } from '../services/attendanceService';
import MapPreview from './MapPreview';

export default function ClockInWidget() {
  const { status, clockInTime, distanceFromOffice } = useAttendanceStore();
  
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'SUCCESS' | 'ERROR'>('SUCCESS');
  const [lastCheckData, setLastCheckData] = useState<any>(null);

  const onClockInPress = async () => {
    const result = await handleClockIn();
    
    setLastCheckData(result.data);
    
    if (result.success) {
      setModalType('SUCCESS');
      setModalVisible(true);
    } else {
      setModalType('ERROR');
      setModalVisible(true);
    }
  };

  const onClockOutPress = async () => {
    await handleClockOut();
  };

  const isClockedIn = status === 'CLOCKED_IN';
  const isChecking = status === 'CHECKING_LOCATION';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <MapPin color={colors.amber} size={20} />
          <Text style={styles.title}>Attendance</Text>
        </View>
        
      </View>

      <View style={styles.content}>
        {isClockedIn ? (
          <View style={styles.statusBox}>
            <View style={styles.statusRow}>
              <CheckCircle color={colors.success} size={16} />
              <Text style={styles.statusTextSuccess}>● Inside Authorized Area</Text>
            </View>
            <Text style={styles.distanceText}>{distanceFromOffice} m from office</Text>
            <Text style={styles.timeText}>Clocked In: {clockInTime}</Text>
          </View>
        ) : (
          <View style={styles.statusBox}>
            <View style={styles.statusRow}>
              <View style={[styles.dot, { backgroundColor: colors.borderStrong }]} />
              <Text style={styles.statusTextPending}>Ready to clock in</Text>
            </View>
            <Text style={styles.distanceText}>Location verification required</Text>
          </View>
        )}
      </View>

      {!isClockedIn ? (
        <Pressable 
          style={[styles.actionBtn, isChecking && { opacity: 0.7 }]} 
          onPress={onClockInPress}
          disabled={isChecking}
        >
          {isChecking ? (
            <>
              <ActivityIndicator color="#1a1200" style={{ marginRight: rf(8) }} />
              <Text style={styles.actionBtnText}>FETCHING GPS...</Text>
            </>
          ) : (
            <Text style={styles.actionBtnText}>CLOCK IN</Text>
          )}
        </Pressable>
      ) : (
        <Pressable 
          style={[styles.actionBtn, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]} 
          onPress={onClockOutPress}
        >
          <LogOut color={colors.error} size={16} style={{ marginRight: rf(8) }} />
          <Text style={[styles.actionBtnText, { color: colors.error }]}>CLOCK OUT</Text>
        </Pressable>
      )}

      {/* Result Modal */}
      <Modal visible={modalVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {modalType === 'SUCCESS' ? (
              <View style={styles.modalBody}>
                <View style={styles.iconCircleSuccess}>
                  <CheckCircle color={colors.success} size={32} />
                </View>
                <Text style={styles.modalTitle}>Clock In Successful</Text>
                <Text style={styles.modalSubtitle}>You are inside the authorized location.</Text>
                
                {lastCheckData && (
                  <MapPreview 
                    distance={lastCheckData.distance} 
                    requiredRadius={lastCheckData.requiredRadius}
                    isInside={lastCheckData.isInside}
                  />
                )}

                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Distance</Text>
                    <Text style={styles.statVal}>{lastCheckData?.distance} m</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Location</Text>
                    <Text style={styles.statVal} numberOfLines={1}>{lastCheckData?.organizationName}</Text>
                  </View>
                </View>

                <Pressable style={styles.modalBtnSuccess} onPress={() => setModalVisible(false)}>
                  <Text style={styles.modalBtnTextSuccess}>Done</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.modalBody}>
                <View style={styles.iconCircleError}>
                  <AlertTriangle color={colors.error} size={32} />
                </View>
                <Text style={styles.modalTitle}>Location Not Allowed</Text>
                <Text style={styles.modalSubtitle}>You are not within the authorized attendance location.</Text>
                
                {lastCheckData && (
                  <MapPreview 
                    distance={lastCheckData.distance} 
                    requiredRadius={lastCheckData.requiredRadius}
                    isInside={lastCheckData.isInside}
                  />
                )}

                <View style={styles.errorStatsBox}>
                  <Text style={styles.errorStatText}>Required radius: <Text style={styles.bold}>{lastCheckData?.requiredRadius} m</Text></Text>
                  <Text style={styles.errorStatText}>Your distance: <Text style={styles.bold}>{lastCheckData?.distance} m</Text></Text>
                </View>

                <Pressable style={styles.modalBtnError} onPress={() => setModalVisible(false)}>
                  <Text style={styles.modalBtnTextError}>Try Again</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>

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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: rf(16),
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rf(8),
  },
  title: {
    fontSize: rf(16),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  devToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: rf(8),
    padding: rf(2),
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleBtn: {
    paddingHorizontal: rf(8),
    paddingVertical: rf(4),
    borderRadius: rf(6),
  },
  toggleBtnActive: {
    backgroundColor: colors.panel,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleText: {
    fontSize: rf(10),
    fontWeight: '600',
    color: colors.textMuted,
  },
  toggleTextActive: {
    color: colors.textPrimary,
  },
  content: {
    marginBottom: rf(16),
  },
  statusBox: {
    backgroundColor: colors.panel,
    padding: rf(12),
    borderRadius: rf(12),
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rf(8),
    marginBottom: rf(4),
  },
  dot: {
    width: rf(8),
    height: rf(8),
    borderRadius: rf(4),
  },
  statusTextSuccess: {
    fontSize: rf(14),
    fontWeight: '600',
    color: colors.success,
  },
  statusTextPending: {
    fontSize: rf(14),
    fontWeight: '600',
    color: colors.textPrimary,
  },
  distanceText: {
    fontSize: rf(12),
    color: colors.textMuted,
    marginLeft: rf(24),
  },
  timeText: {
    fontSize: rf(12),
    color: colors.textPrimary,
    fontWeight: '500',
    marginLeft: rf(24),
    marginTop: rf(4),
  },
  actionBtn: {
    backgroundColor: colors.amber,
    borderRadius: rf(12),
    height: rf(48),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.amber,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  actionBtnText: {
    color: '#1a1200',
    fontSize: rf(15),
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: rf(24),
    borderTopRightRadius: rf(24),
    padding: rf(24),
    paddingBottom: rf(40),
  },
  modalBody: {
    alignItems: 'center',
    paddingBottom: rf(24),
  },
  iconCircleSuccess: {
    width: rf(64),
    height: rf(64),
    borderRadius: rf(32),
    backgroundColor: `${colors.success}1A`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: rf(16),
  },
  iconCircleError: {
    width: rf(64),
    height: rf(64),
    borderRadius: rf(32),
    backgroundColor: `${colors.error}1A`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: rf(16),
  },
  modalTitle: {
    fontSize: rf(20),
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: rf(8),
  },
  modalSubtitle: {
    fontSize: rf(14),
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: rf(16),
  },
  statsRow: {
    flexDirection: 'row',
    gap: rf(12),
    width: '100%',
    marginBottom: rf(24),
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.panel,
    padding: rf(12),
    borderRadius: rf(12),
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: rf(12),
    color: colors.textMuted,
    marginBottom: rf(4),
  },
  statVal: {
    fontSize: rf(14),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  errorStatsBox: {
    width: '100%',
    backgroundColor: `${colors.error}0A`,
    borderWidth: 1,
    borderColor: `${colors.error}33`,
    borderRadius: rf(12),
    padding: rf(16),
    marginBottom: rf(24),
    alignItems: 'center',
  },
  errorStatText: {
    fontSize: rf(14),
    color: colors.textSecondary,
    marginBottom: rf(4),
  },
  bold: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalBtnSuccess: {
    width: '100%',
    backgroundColor: colors.success,
    height: rf(48),
    borderRadius: rf(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnTextSuccess: {
    color: '#FFF',
    fontSize: rf(16),
    fontWeight: '700',
  },
  modalBtnError: {
    width: '100%',
    backgroundColor: colors.surface,
    height: rf(48),
    borderRadius: rf(12),
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnTextError: {
    color: colors.textPrimary,
    fontSize: rf(16),
    fontWeight: '600',
  }
});
