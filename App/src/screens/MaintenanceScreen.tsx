import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  Pressable,
  Modal,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Search,
  Plus,
  X,
  ChevronDown,
  Wrench,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { rf } from '../theme/responsive';
import { colors } from '../theme/colors';
import useMaintenanceStore from '../store/MaintenanceStore';
import useVehicleStore from '../store/VehicleStore';

// --- CONSTANTS ---
const STATUS_STYLES: Record<string, any> = {
  Active: {
    label: 'In Shop',
    bg: 'rgba(255,176,32,0.16)',
    text: colors.amber,
    border: 'rgba(255,176,32,0.45)',
  },
  Completed: {
    label: 'Completed',
    bg: 'rgba(74,222,128,0.16)',
    text: colors.green,
    border: 'rgba(74,222,128,0.45)',
  },
};

const STATUS_OPTIONS = ['Active', 'Completed'];

const inr = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`;

export default function MaintenanceScreen() {
  const {
    maintenanceRecords,
    fetchMaintenance,
    createMaintenance,
    loading,
    error,
  } = useMaintenanceStore();

  const { vehicles, getVehicles } = useVehicleStore();

  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  // Form State
  const [formVehicleID, setFormVehicleID] = useState('');
  const [formVehicleName, setFormVehicleName] = useState('');
  const [formService, setFormService] = useState('');
  const [formCost, setFormCost] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formStatus, setFormStatus] = useState('Active');

  // Load records on screen focus
  useFocusEffect(
    useCallback(() => {
      fetchMaintenance();
      getVehicles();
    }, [fetchMaintenance, getVehicles])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchMaintenance(), getVehicles()]);
    setRefreshing(false);
  };

  // Process available vehicles from VehicleStore
  const availableVehicles = useMemo(() => {
    if (!vehicles || !Array.isArray(vehicles) || vehicles.length === 0) return [];
    return vehicles.map((v: any) => ({
      vehicleID: String(v.vehicleID || v.id || ''),
      name: String(v.name || v.registrationNumber || v.vehicleID || 'Vehicle'),
      registrationNumber: String(v.registrationNumber || ''),
    }));
  }, [vehicles]);

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return maintenanceRecords || [];
    return (maintenanceRecords || []).filter((l: any) =>
      [l.vehicle, l.service, l.serviceType, l.status, l.vehicleID].some(
        (f) => f && String(f).toLowerCase().includes(q)
      )
    );
  }, [maintenanceRecords, search]);

  const canSave = Boolean(
    (formVehicleID || availableVehicles.length > 0) &&
    formService.trim() &&
    formCost.trim() !== '' &&
    !isNaN(Number(formCost)) &&
    Number(formCost) >= 0 &&
    formDate.trim()
  );

  const resetForm = () => {
    const defaultVeh = availableVehicles[0];
    setFormVehicleID(defaultVeh?.vehicleID || '');
    setFormVehicleName(defaultVeh?.name || '');
    setFormService('');
    setFormCost('');
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormStatus('Active');
  };

  const handleOpenAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleSave = async () => {
    const targetVehicleID = formVehicleID || availableVehicles[0]?.vehicleID;
    if (!targetVehicleID) {
      Alert.alert('Validation Error', 'Please select a vehicle.');
      return;
    }
    if (!formService.trim()) {
      Alert.alert('Validation Error', 'Service Type is required.');
      return;
    }
    const costNum = Number(formCost);
    if (isNaN(costNum) || costNum < 0) {
      Alert.alert('Validation Error', 'Cost must be a valid positive number.');
      return;
    }
    if (!formDate.trim()) {
      Alert.alert('Validation Error', 'Date is required.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        vehicleID: targetVehicleID,
        serviceType: formService.trim(),
        cost: costNum,
        date: formDate.trim(),
        status: formStatus === 'Active' ? ('ACTIVE' as const) : ('COMPLETED' as const),
      };

      const result = await createMaintenance(payload);
      setSaving(false);

      if (result.success) {
        setShowAddModal(false);
        resetForm();
        fetchMaintenance();
      } else {
        Alert.alert('Error', result.message || 'Failed to save maintenance record.');
      }
    } catch (err: any) {
      setSaving(false);
      Alert.alert('Error', err?.message || 'Failed to save maintenance record.');
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.amber}
            colors={[colors.amber]}
          />
        }
      >
        {/* HEADER */}
        <View style={styles.headerRow}>
          <Text style={styles.pageTitle}>Maintenance</Text>
          <Pressable style={styles.addButton} onPress={handleOpenAddModal}>
            <Plus size={16} color="#1a1200" strokeWidth={2.5} />
            <Text style={styles.addButtonText}>Log Service</Text>
          </Pressable>
        </View>

        {/* SEARCH */}
        <View style={styles.searchContainer}>
          <Search size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search vehicle or service..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* ERROR STATE */}
        {error && maintenanceRecords.length === 0 ? (
          <View style={styles.errorCard}>
            <AlertTriangle size={24} color={colors.rose} />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={() => fetchMaintenance()}>
              <RefreshCw size={14} color={colors.textPrimary} />
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        {/* LIST */}
        <View style={styles.listContainer}>
          <Text style={styles.sectionTitle}>Service Log</Text>
          {loading && maintenanceRecords.length === 0 ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={colors.amber} />
              <Text style={styles.loadingText}>Fetching maintenance records...</Text>
            </View>
          ) : filteredLogs.length > 0 ? (
            filteredLogs.map((l: any) => {
              const s = STATUS_STYLES[l.status] || STATUS_STYLES.Active;
              return (
                <View key={l.id} style={styles.logCard}>
                  <View style={styles.logHeader}>
                    <Text style={styles.logVehicle}>{l.vehicle}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: s.bg, borderColor: s.border }]}>
                      <Text style={[styles.statusText, { color: s.text }]}>{s.label}</Text>
                    </View>
                  </View>
                  <View style={styles.logBody}>
                    <View>
                      <Text style={styles.logLabel}>Service Type</Text>
                      <Text style={styles.logValue}>{l.service || l.serviceType}</Text>
                      <Text style={styles.logDateText}>{l.date}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.logLabel}>Cost</Text>
                      <Text style={[styles.logValue, { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }]}>
                        {inr(l.cost)}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyStateIconWrapper}>
                <Wrench size={32} color={colors.textMuted} strokeWidth={1.5} />
              </View>
              <Text style={styles.emptyStateTitle}>No records found</Text>
              <Text style={styles.emptyStateText}>
                {search ? `No matches for "${search}".` : "Fleet is fully operational. Add your first service record to start tracking vehicle maintenance."}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ADD LOG MODAL */}
      <Modal visible={showAddModal} transparent={true} animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.bottomSheetOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => setShowAddModal(false)} />
          <View style={styles.bottomSheet}>
            <View style={styles.bottomSheetHeader}>
              <View>
                <Text style={styles.bottomSheetTitle}>Log Service</Text>
                <Text style={styles.bottomSheetSubtitle}>Record vehicle maintenance</Text>
              </View>
              <Pressable onPress={() => setShowAddModal(false)}>
                <X size={24} color={colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formContainer}>
              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Vehicle</Text>
                  <Pressable style={styles.dropdownInput} onPress={() => setShowVehicleDropdown(true)}>
                    <Text style={styles.dropdownInputText}>
                      {formVehicleName || availableVehicles.find(v => v.vehicleID === formVehicleID)?.name || 'Select Vehicle'}
                    </Text>
                    <ChevronDown size={16} color={colors.textMuted} />
                  </Pressable>
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Status</Text>
                  <Pressable style={styles.dropdownInput} onPress={() => setShowStatusDropdown(true)}>
                    <Text style={styles.dropdownInputText}>{formStatus}</Text>
                    <ChevronDown size={16} color={colors.textMuted} />
                  </Pressable>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Service Type</Text>
                <TextInput
                  style={styles.formInput}
                  value={formService}
                  onChangeText={setFormService}
                  placeholder="Oil Change, Engine Repair, etc."
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Cost (₹)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formCost}
                    onChangeText={setFormCost}
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Date (YYYY-MM-DD)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formDate}
                    onChangeText={setFormDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.bottomSheetFooter}>
              <Pressable style={styles.cancelBtn} onPress={() => setShowAddModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.saveBtn, (!canSave || saving) && { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}
                onPress={handleSave}
                disabled={!canSave || saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#1a1200" />
                ) : (
                  <Text style={[styles.saveBtnText, (!canSave || saving) && { color: colors.textMuted }]}>
                    Save Record
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* DROPDOWNS */}
      <Modal visible={showVehicleDropdown} transparent={true} animationType="fade" onRequestClose={() => setShowVehicleDropdown(false)}>
        <Pressable style={styles.filterModalOverlay} onPress={() => setShowVehicleDropdown(false)}>
          <View style={styles.dropdownContainer}>
            <Text style={styles.dropdownTitle}>Select Vehicle</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {availableVehicles.length > 0 ? (
                availableVehicles.map((v) => (
                  <Pressable
                    key={v.vehicleID}
                    style={styles.dropdownOption}
                    onPress={() => {
                      setFormVehicleID(v.vehicleID);
                      setFormVehicleName(v.name);
                      setShowVehicleDropdown(false);
                    }}
                  >
                    <Text style={[styles.dropdownOptionText, { color: v.vehicleID === formVehicleID ? colors.amber : colors.textPrimary }]}>
                      {v.name} {v.registrationNumber ? `(${v.registrationNumber})` : ''}
                    </Text>
                  </Pressable>
                ))
              ) : (
                <View style={{ padding: rf(20), alignItems: 'center' }}>
                  <Text style={{ color: colors.textMuted, fontSize: rf(14) }}>No vehicles available in roster</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={showStatusDropdown} transparent={true} animationType="fade" onRequestClose={() => setShowStatusDropdown(false)}>
        <Pressable style={styles.filterModalOverlay} onPress={() => setShowStatusDropdown(false)}>
          <View style={styles.dropdownContainer}>
            <Text style={styles.dropdownTitle}>Select Status</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {STATUS_OPTIONS.map((s) => (
                <Pressable key={s} style={styles.dropdownOption} onPress={() => { setFormStatus(s); setShowStatusDropdown(false); }}>
                  <Text style={[styles.dropdownOptionText, { color: s === formStatus ? colors.amber : colors.textPrimary }]}>{s}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingBottom: rf(90) },
  container: { paddingHorizontal: rf(16), paddingVertical: rf(24), paddingBottom: rf(40), flexGrow: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: rf(20) },
  pageTitle: { color: colors.textPrimary, fontSize: rf(28), fontWeight: '800', letterSpacing: -1 },
  addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.amber, paddingHorizontal: rf(14), paddingVertical: rf(8), borderRadius: rf(8), gap: rf(6) },
  addButtonText: { color: '#1a1200', fontSize: rf(14), fontWeight: '700' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: rf(12), paddingHorizontal: rf(16), height: rf(52), marginBottom: rf(16), gap: rf(10) },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: rf(15), height: '100%' },

  loadingState: { padding: rf(40), alignItems: 'center', justifyContent: 'center', gap: rf(12) },
  loadingText: { color: colors.textMuted, fontSize: rf(14) },
  errorCard: { backgroundColor: 'rgba(251,113,133,0.1)', borderWidth: 1, borderColor: colors.rose, borderRadius: rf(12), padding: rf(16), alignItems: 'center', gap: rf(8), marginBottom: rf(16) },
  errorText: { color: colors.rose, fontSize: rf(14), textAlign: 'center' },
  retryButton: { flexDirection: 'row', alignItems: 'center', gap: rf(6), backgroundColor: colors.panel, paddingHorizontal: rf(12), paddingVertical: rf(6), borderRadius: rf(6), borderWidth: 1, borderColor: colors.border },
  retryButtonText: { color: colors.textPrimary, fontSize: rf(13), fontWeight: '600' },

  sectionTitle: { color: colors.textPrimary, fontSize: rf(14), fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: rf(12) },
  listContainer: { gap: rf(12) },
  logCard: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: rf(16), padding: rf(16) },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: rf(12) },
  logVehicle: { color: colors.textPrimary, fontSize: rf(16), fontWeight: '700' },
  statusBadge: { paddingHorizontal: rf(10), paddingVertical: rf(4), borderRadius: rf(20), borderWidth: 1 },
  statusText: { fontSize: rf(11), fontWeight: '700' },
  logBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, padding: rf(12), borderRadius: rf(8) },
  logLabel: { color: colors.textMuted, fontSize: rf(11), textTransform: 'uppercase', fontWeight: '700', marginBottom: rf(2) },
  logValue: { color: colors.textPrimary, fontSize: rf(14), fontWeight: '600' },
  logDateText: { color: colors.textMuted, fontSize: rf(12), marginTop: rf(2) },

  emptyState: { padding: rf(40), alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderRadius: rf(16), borderWidth: 1, borderColor: colors.borderSoft, borderStyle: 'dashed', marginTop: rf(8) },
  emptyStateIconWrapper: { width: rf(64), height: rf(64), borderRadius: rf(32), backgroundColor: colors.panel, alignItems: 'center', justifyContent: 'center', marginBottom: rf(16), borderWidth: 1, borderColor: colors.borderSoft },
  emptyStateTitle: { color: colors.textPrimary, fontSize: rf(16), fontWeight: '700', marginBottom: rf(8) },
  emptyStateText: { color: colors.textMuted, fontSize: rf(14), textAlign: 'center', lineHeight: rf(20) },

  bottomSheetOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.2)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: colors.surface, borderTopLeftRadius: rf(24), borderTopRightRadius: rf(24), padding: rf(15), paddingBottom: Platform.OS === 'android' ? rf(55) : rf(32), maxHeight: '90%' },
  bottomSheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: rf(24) },
  bottomSheetTitle: { color: colors.textPrimary, fontSize: rf(20), fontWeight: '700' },
  bottomSheetSubtitle: { color: colors.textMuted, fontSize: rf(13), marginTop: rf(4) },
  formContainer: { gap: rf(16), paddingBottom: rf(20) },
  formRow: { flexDirection: 'row', gap: rf(12) },
  formGroup: { flex: 1, gap: rf(6) },
  formLabel: { color: colors.textMuted, fontSize: rf(11), textTransform: 'uppercase', fontWeight: '700' },
  formInput: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: rf(8), paddingHorizontal: rf(12), height: rf(44), color: colors.textPrimary, fontSize: rf(14) },
  dropdownInput: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: rf(8), paddingHorizontal: rf(12), height: rf(44) },
  dropdownInputText: { color: colors.textPrimary, fontSize: rf(14) },

  bottomSheetFooter: { flexDirection: 'row', gap: rf(20), marginTop: rf(16) },
  cancelBtn: { flex: 1, height: rf(48), backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: rf(12), alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { color: colors.textSecondary, fontSize: rf(15), fontWeight: '600' },
  saveBtn: { flex: 1, height: rf(48), backgroundColor: colors.amber, borderRadius: rf(12), alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#1a1200', fontSize: rf(15), fontWeight: '700' },

  filterModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.2)', justifyContent: 'center', padding: rf(24) },
  dropdownContainer: { backgroundColor: colors.surface, borderRadius: rf(16), borderWidth: 1, borderColor: colors.border, maxHeight: '60%', overflow: 'hidden', paddingVertical: rf(8) },
  dropdownTitle: { color: colors.textMuted, fontSize: rf(12), fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: rf(20), paddingVertical: rf(12), borderBottomWidth: 1, borderBottomColor: colors.borderSoft, marginBottom: rf(8) },
  dropdownOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: rf(14), paddingHorizontal: rf(20) },
  dropdownOptionText: { color: colors.textPrimary, fontSize: rf(15), fontWeight: '600' },
});
