import React, { useEffect, useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  Pressable,
  Modal,
  Platform,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import {
  Search,
  Plus,
  X,
  Edit2,
  Trash2,
  ChevronDown,
  CheckCircle2,
  Truck,
} from 'lucide-react-native';
import useVehicleStore from '../store/VehicleStore';
import { colors } from '../theme/colors';
import { rf } from '../theme/responsive';

// --- MOCK CONSTANTS ---
const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  Available: {
    bg: 'rgba(74,222,128,0.14)',
    text: colors.green,
    border: 'rgba(74,222,128,0.4)',
  },
  'On Trip': {
    bg: 'rgba(56,189,248,0.14)',
    text: colors.blue,
    border: 'rgba(56,189,248,0.4)',
  },
  'In Shop': {
    bg: 'rgba(255,176,32,0.14)',
    text: colors.amber,
    border: 'rgba(255,176,32,0.4)',
  },
  Retired: {
    bg: 'rgba(251,113,133,0.14)',
    text: colors.rose,
    border: 'rgba(251,113,133,0.4)',
  },
};

const STATUS_OPTIONS = ['All', 'Available', 'On Trip', 'In Shop', 'Retired'];
const VEHICLE_TYPES = ['Van', 'Truck', 'Mini'];

// --- COMPONENTS ---
const FilterChip = ({ label, value, options, onChange }: any) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View>
      <Pressable style={styles.filterChip} onPress={() => setIsOpen(true)}>
        {!!label && <Text style={styles.filterChipLabel}>{label}:</Text>}
        <Text style={styles.filterChipValue}>{value}</Text>
        <ChevronDown size={14} color={colors.textMuted} />
      </Pressable>

      <Modal visible={isOpen} transparent={true} animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <Pressable style={styles.filterModalOverlay} onPress={() => setIsOpen(false)}>
          <View style={styles.dropdownContainer}>
            <Text style={styles.dropdownTitle}>Select {label}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {options.map((opt: string) => {
                const isActive = opt === value;
                return (
                  <Pressable
                    key={opt}
                    style={[styles.dropdownOption, isActive && { backgroundColor: `${colors.teal}15` }]}
                    onPress={() => {
                      onChange(opt);
                      setIsOpen(false);
                    }}
                  >
                    <Text style={[styles.dropdownOptionText, isActive && { color: colors.teal }]}>{opt}</Text>
                    {isActive && <CheckCircle2 size={16} color={colors.teal} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const VehicleCard = ({ vehicle, onEdit, onDelete }: any) => {
  const statusRaw = vehicle.status || 'Available';
  const displayStatus = statusRaw.includes('_')
    ? statusRaw.replace(/_/g, ' ').replace(/\w\S*/g, (w: string) => (w.replace(/^\w/, (c) => c.toUpperCase())))
    : statusRaw;
  const statusStyle = STATUS_STYLES[displayStatus] || STATUS_STYLES.Available;

  const regNo = vehicle.reg || vehicle.registrationNumber || vehicle.registrationNo || 'N/A';
  const name = vehicle.name || vehicle.vehicleName || 'Unnamed';
  const cost = vehicle.acquisitionCost ? Number(vehicle.acquisitionCost).toLocaleString('en-IN') : '0';
  const odometer = vehicle.odometer ? Number(vehicle.odometer).toLocaleString('en-IN') : '0';

  return (
    <View style={styles.vehicleCard}>
      <View style={styles.vehicleCardHeader}>
        <View style={styles.vehicleCardRegBox}>
          <Text style={styles.vehicleCardReg}>{regNo}</Text>
        </View>
        <View style={styles.vehicleActions}>
          <Pressable style={styles.iconButton} onPress={() => onEdit(vehicle)}>
            <Edit2 size={16} color={colors.textMuted} />
          </Pressable>
          <Pressable style={styles.iconButton} onPress={() => {
            Alert.alert(
              'Delete Vehicle',
              `Are you sure you want to delete ${regNo}?`,
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => onDelete(vehicle.vehicleID) },
              ]
            );
          }}>
            <Trash2 size={16} color={colors.rose} />
          </Pressable>
        </View>
      </View>

      <View style={styles.vehicleCardBody}>
        <View style={styles.vehicleMainInfo}>
          <Text style={styles.vehicleName}>{name}</Text>
          <Text style={styles.vehicleType}>{vehicle.type || 'N/A'}</Text>
        </View>

        <View style={styles.statusBadgeWrapper}>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>{displayStatus}</Text>
          </View>
        </View>
      </View>

      <View style={styles.vehicleCardFooter}>
        <View style={styles.footerItem}>
          <Text style={styles.footerLabel}>Capacity</Text>
          <Text style={styles.footerValue}>{vehicle.maxLoadCapacity || vehicle.capacity || 'N/A'} kg</Text>
        </View>
        <View style={styles.footerItem}>
          <Text style={styles.footerLabel}>Odometer</Text>
          <Text style={styles.footerValue}>{odometer} km</Text>
        </View>
        <View style={styles.footerItem}>
          <Text style={styles.footerLabel}>Cost</Text>
          <Text style={styles.footerValue}>₹{cost}</Text>
        </View>
      </View>
    </View>
  );
};

// --- PAGE ---
// Added a comment to trigger a Metro Bundler Fast Refresh
export default function VehicleRegistryScreen() {
  const { vehicles, getVehicles, registerVehicle, updateVehicle, deleteVehicle, loading, error } = useVehicleStore();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<any>(null);

  // Form State
  const [formReg, setFormReg] = useState('');
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('Van');
  const [formCapacity, setFormCapacity] = useState('');
  const [formOdo, setFormOdo] = useState('');
  const [formCost, setFormCost] = useState('');
  const [formStatus, setFormStatus] = useState('Available');

  useEffect(() => {
    getVehicles();
  }, [getVehicles]);

  const typeOptions = useMemo(() => {
    return ['All', ...Array.from(new Set((vehicles || []).map((v: any) => v.type || 'Van')))];
  }, [vehicles]);

  const filteredVehicles = useMemo(() => {
    return (vehicles || []).filter((v: any) => {
      const displayStatus = (v.status || '').replace(/_/g, ' ').replace(/\w\S*/g, (w: string) => (w.replace(/^\w/, (c) => c.toUpperCase())));

      const matchesType = typeFilter === 'All' || v.type === typeFilter;
      const matchesStatus = statusFilter === 'All' || displayStatus === statusFilter;

      const q = search.trim().toLowerCase();
      const regVal = (v.reg || v.registrationNumber || v.registrationNo || '').toLowerCase();
      const nameVal = (v.name || v.vehicleName || '').toLowerCase();
      const matchesSearch = !q || regVal.includes(q) || nameVal.includes(q);

      return matchesType && matchesStatus && matchesSearch;
    });
  }, [vehicles, search, typeFilter, statusFilter]);

  const openAddModal = () => {
    setEditingVehicle(null);
    setFormReg('');
    setFormName('');
    setFormType('Van');
    setFormCapacity('');
    setFormOdo('');
    setFormCost('');
    setFormStatus('Available');
    setShowModal(true);
  };

  const openEditModal = (v: any) => {
    setEditingVehicle(v);
    setFormReg(v.registrationNumber || v.reg || '');
    setFormName(v.name || v.vehicleName || '');
    setFormType(v.type || 'Van');
    setFormCapacity(v.maxLoadCapacity ? String(v.maxLoadCapacity) : '');
    setFormOdo(v.odometer ? String(v.odometer) : '');
    setFormCost(v.acquisitionCost ? String(v.acquisitionCost) : '');
    const displayStatus = (v.status || 'Available').replace(/_/g, ' ').replace(/\w\S*/g, (w: string) => (w.replace(/^\w/, (c) => c.toUpperCase())));
    setFormStatus(displayStatus);
    setShowModal(true);
  };

  const handleSave = async () => {
    const regClean = formReg.trim().toUpperCase();
    const nameClean = formName.trim();
    const capNum = Number(formCapacity);
    const odoNum = Number(formOdo || '0');
    const costNum = Number(formCost || '0');

    if (!regClean) {
      Alert.alert('Validation Error', 'Registration Number is required.');
      return;
    }
    if (!nameClean) {
      Alert.alert('Validation Error', 'Vehicle Name is required.');
      return;
    }
    if (!formType) {
      Alert.alert('Validation Error', 'Vehicle Type is required.');
      return;
    }
    if (isNaN(capNum) || capNum <= 0) {
      Alert.alert('Validation Error', 'Maximum Load Capacity must be a valid positive number (> 0).');
      return;
    }
    if (isNaN(odoNum) || odoNum < 0) {
      Alert.alert('Validation Error', 'Odometer must be a valid non-negative number (>= 0).');
      return;
    }
    if (isNaN(costNum) || costNum < 0) {
      Alert.alert('Validation Error', 'Acquisition Cost must be a valid non-negative number (>= 0).');
      return;
    }

    const payload = {
      registrationNumber: regClean,
      name: nameClean,
      type: formType.toUpperCase(),
      maxLoadCapacity: capNum,
      odometer: odoNum,
      acquisitionCost: costNum,
      status: formStatus.toUpperCase().replace(/\s+/g, '_'),
    };

    let result;
    if (editingVehicle) {
      result = await updateVehicle(editingVehicle.vehicleID, payload);
    } else {
      result = await registerVehicle(payload);
    }

    if (result.success) {
      await getVehicles();
      setShowModal(false);
    } else {
      Alert.alert('Error', result.message || 'Failed to save vehicle');
    }
  };

  const handleDelete = async (vehicleID: string) => {
    const result = await deleteVehicle(vehicleID);
    if (result.success) {
      await getVehicles();
    } else {
      Alert.alert('Error', result.message || 'Failed to delete vehicle');
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* HEADER */}
        <View style={styles.headerRow}>
          <Text style={styles.pageTitle}>Vehicle Registry</Text>
          <Pressable style={styles.addButton} onPress={openAddModal}>
            <Plus size={16} color="#1a1200" strokeWidth={2.5} />
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
        </View>

        {/* SEARCH & FILTERS */}
        <View style={styles.searchContainer}>
          <Search size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search reg. no or name..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll} style={{ flexGrow: 0 }}>
          <FilterChip label="Type" value={typeFilter} options={typeOptions} onChange={setTypeFilter} />
          <FilterChip label="Status" value={statusFilter} options={STATUS_OPTIONS} onChange={setStatusFilter} />
        </ScrollView>

        {/* LIST */}
        <View style={styles.listContainer}>
          {filteredVehicles.length > 0 ? (
            filteredVehicles.map((vehicle: any) => (
              <VehicleCard
                key={vehicle.vehicleID || vehicle.id}
                vehicle={vehicle}
                onEdit={openEditModal}
                onDelete={handleDelete}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyStateIconWrapper}>
                <Truck size={32} color={colors.textMuted} strokeWidth={1.5} />
              </View>
              <Text style={styles.emptyStateTitle}>No vehicles found</Text>
              <Text style={styles.emptyStateText}>
                {search ? `We couldn't find any vehicles matching "${search}".` : "No vehicles match your current filter settings."}
              </Text>
            </View>
          )}
        </View>

      </ScrollView>

      {/* ADD/EDIT MODAL */}
      <Modal visible={showModal} transparent={true} animationType="slide" onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.bottomSheetOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => setShowModal(false)} />
          <View style={styles.bottomSheet}>
            <View style={styles.bottomSheetHeader}>
              <View>
                <Text style={styles.bottomSheetTitle}>{editingVehicle ? 'Update Vehicle' : 'New Vehicle'}</Text>
                <Text style={styles.bottomSheetSubtitle}>Fill in vehicle details below</Text>
              </View>
              <Pressable onPress={() => setShowModal(false)}>
                <X size={24} color={colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formContainer}>
              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Reg. No.</Text>
                  <TextInput style={styles.formInput} value={formReg} onChangeText={setFormReg} placeholder="GJ01AB000" placeholderTextColor={colors.textMuted} />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Name / Model</Text>
                  <TextInput style={styles.formInput} value={formName} onChangeText={setFormName} placeholder="VAN-06" placeholderTextColor={colors.textMuted} />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Type</Text>
                  <FilterChip label="" value={formType} options={VEHICLE_TYPES} onChange={setFormType} />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Capacity (kg)</Text>
                  <TextInput style={styles.formInput} value={formCapacity} onChangeText={setFormCapacity} placeholder="500" keyboardType="numeric" placeholderTextColor={colors.textMuted} />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Odometer (km)</Text>
                  <TextInput style={styles.formInput} value={formOdo} onChangeText={setFormOdo} placeholder="0" keyboardType="numeric" placeholderTextColor={colors.textMuted} />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Cost (₹)</Text>
                  <TextInput style={styles.formInput} value={formCost} onChangeText={setFormCost} placeholder="0" keyboardType="numeric" placeholderTextColor={colors.textMuted} />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Status</Text>
                <FilterChip label="" value={formStatus} options={STATUS_OPTIONS.filter((s) => s !== 'All')} onChange={setFormStatus} />
              </View>
            </ScrollView>

            <View style={styles.bottomSheetFooter}>
              <Pressable style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.saveBtn, loading && { opacity: 0.6 }]} onPress={handleSave} disabled={loading}>
                <Text style={styles.saveBtnText}>{loading ? 'Saving...' : editingVehicle ? 'Update Vehicle' : 'Save Vehicle'}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
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
  filterScroll: { gap: rf(10), marginBottom: rf(24) },
  filterChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: rf(8), paddingHorizontal: rf(12), paddingVertical: rf(10), gap: rf(6), height: rf(44) },
  filterChipLabel: { color: colors.textMuted, fontSize: rf(13) },
  filterChipValue: { color: colors.textPrimary, fontSize: rf(13), fontWeight: '600' },
  filterModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.2)', justifyContent: 'center', padding: rf(24) },
  bottomSheetOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.2)', justifyContent: 'flex-end' },
  dropdownContainer: { backgroundColor: colors.surface, borderRadius: rf(16), borderWidth: 1, borderColor: colors.border, maxHeight: '60%', overflow: 'hidden', paddingVertical: rf(8) },
  dropdownTitle: { color: colors.textMuted, fontSize: rf(12), fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: rf(20), paddingVertical: rf(12), borderBottomWidth: 1, borderBottomColor: colors.borderSoft, marginBottom: rf(8) },
  dropdownOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: rf(14), paddingHorizontal: rf(20) },
  dropdownOptionText: { color: colors.textPrimary, fontSize: rf(15), fontWeight: '600' },
  listContainer: { gap: rf(12) },
  vehicleCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: rf(16), overflow: 'hidden' },
  vehicleCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: rf(16), paddingVertical: rf(12), backgroundColor: colors.panel, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  vehicleCardRegBox: { backgroundColor: colors.bg, paddingHorizontal: rf(8), paddingVertical: rf(4), borderRadius: rf(6), borderWidth: 1, borderColor: colors.border },
  vehicleCardReg: { color: colors.textMuted, fontSize: rf(12), fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: '700' },
  vehicleActions: { flexDirection: 'row', gap: rf(8) },
  iconButton: { padding: rf(6), backgroundColor: colors.bg, borderRadius: rf(6), borderWidth: 1, borderColor: colors.border },
  vehicleCardBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: rf(16), borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  vehicleMainInfo: { gap: rf(4) },
  vehicleName: { color: colors.textPrimary, fontSize: rf(16), fontWeight: '700' },
  vehicleType: { color: colors.textSecondary, fontSize: rf(13) },
  statusBadgeWrapper: { alignItems: 'flex-end' },
  statusBadge: { paddingHorizontal: rf(10), paddingVertical: rf(4), borderRadius: rf(20), borderWidth: 1 },
  statusText: { fontSize: rf(12), fontWeight: '700' },
  vehicleCardFooter: { flexDirection: 'row', justifyContent: 'space-between', padding: rf(16), backgroundColor: colors.panel },
  footerItem: { gap: rf(2) },
  footerLabel: { color: colors.textMuted, fontSize: rf(10), textTransform: 'uppercase', fontWeight: '700' },
  footerValue: { color: colors.textPrimary, fontSize: rf(13), fontWeight: '600' },
  emptyState: { padding: rf(40), alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderRadius: rf(16), borderWidth: 1, borderColor: colors.borderSoft, borderStyle: 'dashed', marginTop: rf(8) },
  emptyStateIconWrapper: { width: rf(64), height: rf(64), borderRadius: rf(32), backgroundColor: colors.panel, alignItems: 'center', justifyContent: 'center', marginBottom: rf(16), borderWidth: 1, borderColor: colors.borderSoft },
  emptyStateTitle: { color: colors.textPrimary, fontSize: rf(16), fontWeight: '700', marginBottom: rf(8) },
  emptyStateText: { color: colors.textMuted, fontSize: rf(14), textAlign: 'center', lineHeight: rf(20) },
  bottomSheet: { backgroundColor: colors.surface, borderTopLeftRadius: rf(24), borderTopRightRadius: rf(24), padding: rf(15), paddingBottom: Platform.OS === 'android' ? rf(55) : rf(32), maxHeight: '90%' },
  bottomSheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: rf(24) },
  bottomSheetTitle: { color: colors.textPrimary, fontSize: rf(20), fontWeight: '700' },
  bottomSheetSubtitle: { color: colors.textMuted, fontSize: rf(13), marginTop: rf(4) },
  formContainer: { gap: rf(16), paddingBottom: rf(20) },
  formRow: { flexDirection: 'row', gap: rf(12) },
  formGroup: { flex: 1, gap: rf(6) },
  formLabel: { color: colors.textMuted, fontSize: rf(11), textTransform: 'uppercase', fontWeight: '700' },
  formInput: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: rf(8), paddingHorizontal: rf(12), height: rf(44), color: colors.textPrimary, fontSize: rf(14) },
  bottomSheetFooter: { flexDirection: 'row', gap: rf(20), marginTop: rf(16) },
  cancelBtn: { flex: 1, height: rf(48), backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: rf(12), alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { color: colors.textSecondary, fontSize: rf(15), fontWeight: '600' },
  saveBtn: { flex: 1, height: rf(48), backgroundColor: colors.amber, borderRadius: rf(12), alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#1a1200', fontSize: rf(15), fontWeight: '700' },
});
