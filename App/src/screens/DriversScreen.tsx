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
  ActivityIndicator,
  Clipboard,
} from 'react-native';
import {
  Search,
  Plus,
  Users,
  X,
  ChevronDown,
  AlertTriangle,
  Mic,
  Edit2,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  KeyRound,
  ShieldCheck,
} from 'lucide-react-native';
import { rf } from '../theme/responsive';
import { colors } from '../theme/colors';
import useDriverStore from '../store/DriverStore';
import useTripStore from '../store/TripStore';
import DriverVoiceRegistrationModal from '../components/DriverVoiceRegistration/DriverVoiceRegistrationModal';

// --- CONSTANTS ---
const STATUS_STYLES: Record<string, any> = {
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
  'Off Duty': {
    bg: 'rgba(136,145,171,0.14)',
    text: colors.textSecondary,
    border: 'rgba(136,145,171,0.4)',
  },
  Suspended: {
    bg: 'rgba(251,146,60,0.14)',
    text: colors.amber,
    border: 'rgba(251,146,60,0.4)',
  },
};

const STATUS_OPTIONS = ['Available', 'On Trip', 'Off Duty', 'Suspended'];

function isExpired(expiry: string) {
  if (!expiry || typeof expiry !== 'string') return false;
  const parts = expiry.split('/').map(Number);
  if (!parts || parts.length < 2) return false;
  const [mm, yyyy] = parts;
  if (!mm || !yyyy) return false;
  const endOfMonth = new Date(yyyy, mm, 0, 23, 59, 59);
  return endOfMonth < new Date();
}

const countCompletedTripsForDriver = (driver: any, allTrips: any[]) => {
  if (!driver) return 0;
  const driverID = String(driver.id || driver.driverID || driver.userID || '').toLowerCase();
  const driverEmail = String(driver.email || '').toLowerCase();
  const driverName = String(driver.name || '').toLowerCase();

  const completedCountFromStore = Array.isArray(allTrips)
    ? allTrips.filter((t: any) => {
        const tDriverID = String(t.driverID || t.driverid || t.driver?.id || t.driver?.userID || '').toLowerCase();
        const tDriverEmail = String(t.driverEmail || t.driver?.email || '').toLowerCase();
        const tDriverName = String(t.driverName || t.driver?.name || '').toLowerCase();

        const matchesDriver =
          (driverID && tDriverID === driverID) ||
          (driverEmail && tDriverEmail === driverEmail) ||
          (driverName && tDriverName === driverName);

        const status = String(t.status || '').toUpperCase();
        const isCompleted = status === 'DELIVERED' || status === 'COMPLETED';

        return matchesDriver && isCompleted;
      }).length
    : 0;

  return Math.max(Number(driver?.trips ?? 0), completedCountFromStore);
};

// --- COMPONENTS ---
const DriverCard = ({
  driver,
  trips = [],
  onEdit,
  onDelete,
}: {
  driver: any;
  trips?: any[];
  onEdit: (driver: any) => void;
  onDelete: (id: string) => void;
}) => {
  const driverID = driver.id || driver.driverID || driver.userID;
  const displayStatus = (driver.status || driver.driverStatus || 'Available')
    .replace(/_/g, ' ')
    .replace(/\w\S*/g, (w: string) => w.replace(/^\w/, (c) => c.toUpperCase()));

  const style = STATUS_STYLES[displayStatus] || STATUS_STYLES.Available;
  const expired = isExpired(driver.licenseExpiryDate);
  const completedTripsCount = countCompletedTripsForDriver(driver, trips);

  return (
    <View style={styles.driverCard}>
      {/* Header */}
      <View style={styles.driverCardHeader}>
        <View style={styles.driverCardLicenseBox}>
          <Text style={styles.driverCardLicense}>{driver.licenseNo || 'N/A'}</Text>
        </View>
        <View style={styles.headerRightActions}>
          <View style={[styles.statusBadge, { backgroundColor: style.bg, borderColor: style.border }]}>
            <Text style={[styles.statusText, { color: style.text }]}>{displayStatus}</Text>
          </View>
          <View style={styles.driverActions}>
            <Pressable style={styles.iconButton} onPress={() => onEdit(driver)}>
              <Edit2 size={15} color={colors.textMuted} />
            </Pressable>
            <Pressable
              style={styles.iconButton}
              onPress={() => {
                Alert.alert(
                  'Delete Driver',
                  `Are you sure you want to delete driver ${driver.name || 'this record'}?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => onDelete(driverID) },
                  ]
                );
              }}
            >
              <Trash2 size={15} color={colors.rose} />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Body */}
      <View style={styles.driverCardBody}>
        <View style={styles.driverMainInfo}>
          <Text style={styles.driverName}>{driver.name || 'Unnamed Driver'}</Text>
          <Text style={styles.driverContact}>{driver.phoneNo || 'No Contact'}</Text>
          {driver.email ? <Text style={styles.driverEmailText}>{driver.email}</Text> : null}
        </View>
        <View style={styles.driverExpiryWrapper}>
          <Text style={[styles.expiryText, { color: expired ? colors.rose : colors.textSecondary }]}>
            Exp: {driver.licenseExpiryDate || 'N/A'}
          </Text>
          {expired && (
            <View style={styles.expiredTag}>
              <AlertTriangle size={12} color={colors.rose} />
              <Text style={styles.expiredTagText}>Expired</Text>
            </View>
          )}
        </View>
      </View>

      {/* Footer */}
      <View style={styles.driverCardFooter}>
        <View style={styles.footerItem}>
          <Text style={styles.footerLabel}>Trips</Text>
          <Text style={styles.footerValue}>{completedTripsCount}</Text>
        </View>
        <View style={styles.footerItem}>
          <Text style={styles.footerLabel}>Safety</Text>
          <Text style={[styles.footerValue, { color: colors.teal }]}>{driver.safetyScore ?? 100}%</Text>
        </View>
      </View>
    </View>
  );
};

export default function DriversScreen() {
  const { drivers, fetchDrivers, registerDriver, updateDriver, deleteDriver, loading, error } = useDriverStore();
  const { trips, getTrips } = useTripStore();

  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState<any>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formLicense, setFormLicense] = useState('');
  const [formExpiry, setFormExpiry] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formTrips, setFormTrips] = useState('0');
  const [formSafety, setFormSafety] = useState('100');
  const [formStatus, setFormStatus] = useState('Available');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);

  // Credential Modal State (short-lived)
  const [createdCredentials, setCreatedCredentials] = useState<{
    name: string;
    email: string;
    temporaryPassword: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchDrivers();
    getTrips();
  }, [fetchDrivers, getTrips]);

  const filteredDrivers = useMemo(() => {
    return (drivers || []).filter((d: any) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      const nameVal = (d.name || '').toLowerCase();
      const licenseVal = (d.licenseNo || '').toLowerCase();
      const contactVal = (d.phoneNo || '').toLowerCase();
      const emailVal = (d.email || '').toLowerCase();

      return nameVal.includes(q) || licenseVal.includes(q) || contactVal.includes(q) || emailVal.includes(q);
    });
  }, [drivers, search]);

  const openAddModal = () => {
    setEditingDriver(null);
    setFormName('');
    setFormEmail('');
    setFormLicense('');
    setFormExpiry('');
    setFormContact('');
    setFormTrips('0');
    setFormSafety('100');
    setFormStatus('Available');
    setShowModal(true);
  };

  const openEditModal = (driver: any) => {
    setEditingDriver(driver);
    setFormName(driver.name || '');
    setFormEmail(driver.email || '');
    setFormLicense(driver.licenseNo || '');
    setFormExpiry(driver.licenseExpiryDate || '');
    setFormContact(driver.phoneNo || '');
    const computedTrips = countCompletedTripsForDriver(driver, trips);
    setFormTrips(String(computedTrips));
    setFormSafety(driver.safetyScore !== undefined ? String(driver.safetyScore) : '100');
    const rawStatus = driver.status || driver.driverStatus || 'Available';
    const displayStatus = rawStatus
      .replace(/_/g, ' ')
      .replace(/\w\S*/g, (w: string) => w.replace(/^\w/, (c) => c.toUpperCase()));
    setFormStatus(displayStatus);
    setShowModal(true);
  };

  const handleOpenVoiceRegistration = () => {
    setShowModal(false);
    setShowVoiceModal(true);
  };

  const handleSwitchToManual = (prefilledData?: any) => {
    setShowVoiceModal(false);
    if (prefilledData) {
      if (prefilledData.name) setFormName(prefilledData.name);
      if (prefilledData.licenseNumber) setFormLicense(prefilledData.licenseNumber);
      if (prefilledData.licenseExpiry) setFormExpiry(prefilledData.licenseExpiry);
      if (prefilledData.contact) setFormContact(prefilledData.contact);
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    const nameClean = formName.trim();
    const emailClean = formEmail.trim().toLowerCase();
    const licenseClean = formLicense.trim();
    const expiryClean = formExpiry.trim();
    const contactClean = formContact.trim();

    if (!nameClean || !licenseClean || !expiryClean) {
      Alert.alert('Validation Error', 'Name, License No., and Expiry are required.');
      return;
    }
    if (!editingDriver && !emailClean) {
      Alert.alert('Validation Error', 'Email Address is required for driver login account.');
      return;
    }

    const payload = {
      name: nameClean,
      email: emailClean || editingDriver?.email || `${nameClean.toLowerCase().replace(/[^a-z0-9]/g, '') || 'driver'}.${Date.now().toString(36)}@logisphere.ai`,
      phoneNo: contactClean,
      licenseNo: licenseClean,
      licenseExpiryDate: expiryClean,
      role: 'ROLE_DRIVER',
      status: formStatus.toUpperCase().replace(/\s+/g, '_'),
      driverStatus: formStatus.toUpperCase().replace(/\s+/g, '_'),
      safetyScore: Number(formSafety) || 100,
      trips: Number(formTrips) || 0,
    };

    let result;
    if (editingDriver) {
      const driverID = editingDriver.id || editingDriver.driverID || editingDriver.userID;
      result = await updateDriver(driverID, payload);
    } else {
      result = await registerDriver(payload);
    }

    if (result.success) {
      await fetchDrivers();
      setShowModal(false);

      if (!editingDriver && result.data?.credentials?.temporaryPassword) {
        setCreatedCredentials({
          name: nameClean,
          email: result.data.credentials.email || emailClean,
          temporaryPassword: result.data.credentials.temporaryPassword,
        });
      } else if (!editingDriver && result.credentials?.temporaryPassword) {
        setCreatedCredentials({
          name: nameClean,
          email: result.credentials.email || emailClean,
          temporaryPassword: result.credentials.temporaryPassword,
        });
      }
    } else {
      Alert.alert('Error', result.message || 'Failed to save driver');
    }
  };

  const handleCopyCredentials = () => {
    if (!createdCredentials) return;
    Clipboard.setString(createdCredentials.temporaryPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async (driverID: string) => {
    const result = await deleteDriver(driverID);
    if (result.success) {
      await fetchDrivers();
    } else {
      Alert.alert('Error', result.message || 'Failed to delete driver');
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* HEADER */}
        <View style={styles.headerRow}>
          <Text style={styles.pageTitle}>Drivers</Text>
          <Pressable style={styles.addButton} onPress={openAddModal}>
            <Plus size={16} color="#1a1200" strokeWidth={2.5} />
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
        </View>

        {/* SEARCH */}
        <View style={styles.searchContainer}>
          <Search size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search name, license or contact..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* ERROR STATE */}
        {error && drivers.length === 0 ? (
          <View style={styles.errorCard}>
            <AlertTriangle size={24} color={colors.rose} />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={() => fetchDrivers()}>
              <RefreshCw size={14} color={colors.textPrimary} />
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        {/* LIST */}
        <View style={styles.listContainer}>
          {loading && drivers.length === 0 ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={colors.amber} />
              <Text style={styles.loadingText}>Fetching drivers roster...</Text>
            </View>
          ) : filteredDrivers.length > 0 ? (
            filteredDrivers.map((driver: any) => (
              <DriverCard
                key={driver.id || driver.driverID || driver.userID || driver.email}
                driver={driver}
                trips={trips}
                onEdit={openEditModal}
                onDelete={handleDelete}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyStateIconWrapper}>
                <Users size={32} color={colors.textMuted} strokeWidth={1.5} />
              </View>
              <Text style={styles.emptyStateTitle}>No drivers found</Text>
              <Text style={styles.emptyStateText}>
                {search ? `We couldn't find any drivers matching "${search}".` : "Your roster is empty."}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ADD/EDIT DRIVER MODAL */}
      <Modal visible={showModal} transparent={true} animationType="slide" onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.bottomSheetOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => setShowModal(false)} />
          <View style={styles.bottomSheet}>
            <View style={styles.bottomSheetHeader}>
              <View>
                <Text style={styles.bottomSheetTitle}>{editingDriver ? 'Update Driver' : 'New Driver'}</Text>
                <Text style={styles.bottomSheetSubtitle}>Fill in driver details below</Text>
              </View>
              <Pressable onPress={() => setShowModal(false)}>
                <X size={24} color={colors.textMuted} />
              </Pressable>
            </View>

            {!editingDriver ? (
              <Pressable 
                style={styles.voiceButton} 
                onPress={handleOpenVoiceRegistration}
              >
                <Mic size={18} color="#1a1200" strokeWidth={2.5} />
                <Text style={styles.voiceButtonText}>
                  Add Driver with Voice
                </Text>
              </Pressable>
            ) : null}

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formContainer}>
              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Full Name *</Text>
                  <TextInput style={styles.formInput} value={formName} onChangeText={setFormName} placeholder="Driver name" placeholderTextColor={colors.textMuted} />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>License No. *</Text>
                  <TextInput style={styles.formInput} value={formLicense} onChangeText={setFormLicense} placeholder="DL-00000" placeholderTextColor={colors.textMuted} />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Expiry (MM/YYYY) *</Text>
                  <TextInput style={styles.formInput} value={formExpiry} onChangeText={setFormExpiry} placeholder="12/2028" placeholderTextColor={colors.textMuted} />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Contact Phone</Text>
                  <TextInput style={styles.formInput} value={formContact} onChangeText={setFormContact} placeholder="98765xxxxx" placeholderTextColor={colors.textMuted} keyboardType="phone-pad" />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Login Email Address {!editingDriver ? '*' : ''}</Text>
                <TextInput
                  style={styles.formInput}
                  value={formEmail}
                  onChangeText={setFormEmail}
                  placeholder="driver@example.com"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!editingDriver}
                />
              </View>

              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Trips Compl.</Text>
                  <TextInput
                    style={[
                      styles.formInput,
                      { color: colors.textPrimary, opacity: 1, backgroundColor: colors.panel },
                    ]}
                    value={formTrips}
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    editable={false}
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Safety (%)</Text>
                  <TextInput style={styles.formInput} value={formSafety} onChangeText={setFormSafety} placeholder="100" placeholderTextColor={colors.textMuted} keyboardType="numeric" />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Status</Text>
                  <Pressable style={styles.dropdownInput} onPress={() => setShowStatusDropdown(true)}>
                    <Text style={styles.dropdownInputText}>{formStatus}</Text>
                    <ChevronDown size={16} color={colors.textMuted} />
                  </Pressable>
                </View>
              </View>
            </ScrollView>

            <View style={styles.bottomSheetFooter}>
              <Pressable style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.saveBtn, loading && { opacity: 0.6 }]} onPress={handleSave} disabled={loading}>
                <Text style={styles.saveBtnText}>{loading ? 'Saving...' : editingDriver ? 'Update Driver' : 'Save Driver'}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* CREDENTIALS DIALOG (Shown ONCE after driver creation) */}
      <Modal
        visible={!!createdCredentials}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCreatedCredentials(null)}
      >
        <View style={styles.credOverlay}>
          <View style={styles.credDialog}>
            <View style={styles.credIconHeader}>
              <ShieldCheck size={36} color={colors.green} />
            </View>
            <Text style={styles.credTitle}>Driver Account Created ✓</Text>
            <Text style={styles.credSubtitle}>Temporary credentials generated successfully.</Text>

            {createdCredentials ? (
              <View style={styles.credBox}>
                <View style={styles.credItem}>
                  <Text style={styles.credLabel}>Driver Name:</Text>
                  <Text style={styles.credValName}>{createdCredentials.name}</Text>
                </View>

                <View style={styles.credItem}>
                  <Text style={styles.credLabel}>Login Email:</Text>
                  <Text style={styles.credValText}>{createdCredentials.email}</Text>
                </View>

                <View style={styles.credItem}>
                  <Text style={styles.credLabel}>Temporary Password:</Text>
                  <View style={styles.credPassBadge}>
                    <KeyRound size={16} color={colors.amber} />
                    <Text style={styles.credValPass}>{createdCredentials.temporaryPassword}</Text>
                  </View>
                </View>
              </View>
            ) : null}

            <View style={styles.credNoticeBox}>
              <AlertTriangle size={16} color={colors.amber} style={{ marginTop: 2 }} />
              <Text style={styles.credNoticeText}>
                ⚠️ Share these credentials securely with the driver. The driver will be required to change the password after first login.
              </Text>
            </View>

            <View style={styles.credActions}>
              <Pressable style={styles.copyBtn} onPress={handleCopyCredentials}>
                {copied ? <Check size={18} color="#1a1200" /> : <Copy size={18} color="#1a1200" />}
                <Text style={styles.copyBtnText}>{copied ? 'Copied!' : 'Copy Credentials'}</Text>
              </Pressable>

              <Pressable style={styles.doneBtn} onPress={() => setCreatedCredentials(null)}>
                <Text style={styles.doneBtnText}>Done</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* STATUS SELECTION MODAL (For Add Driver Form) */}
      <Modal visible={showStatusDropdown} transparent={true} animationType="fade" onRequestClose={() => setShowStatusDropdown(false)}>
        <Pressable style={styles.filterModalOverlay} onPress={() => setShowStatusDropdown(false)}>
          <View style={styles.dropdownContainer}>
            <Text style={styles.dropdownTitle}>Select Status</Text>
            {STATUS_OPTIONS.map((opt) => (
              <Pressable
                key={opt}
                style={styles.dropdownOption}
                onPress={() => {
                  setFormStatus(opt);
                  setShowStatusDropdown(false);
                }}
              >
                <Text style={[styles.dropdownOptionText, { color: opt === formStatus ? colors.amber : colors.textPrimary }]}>{opt}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* VOICE DRIVER REGISTRATION MODAL */}
      <DriverVoiceRegistrationModal
        visible={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        onSwitchToManual={handleSwitchToManual}
        onDriverCreated={(creds) => setCreatedCredentials(creds)}
      />

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
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: rf(12), paddingHorizontal: rf(16), height: rf(52), marginBottom: rf(20), gap: rf(10) },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: rf(15), height: '100%' },

  listContainer: { gap: rf(12) },
  driverCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: rf(16), overflow: 'hidden' },
  driverCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: rf(16), paddingVertical: rf(12), backgroundColor: colors.panel, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  driverCardLicenseBox: { backgroundColor: colors.bg, paddingHorizontal: rf(8), paddingVertical: rf(4), borderRadius: rf(6), borderWidth: 1, borderColor: colors.border },
  driverCardLicense: { color: colors.textMuted, fontSize: rf(12), fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: '700' },
  headerRightActions: { flexDirection: 'row', alignItems: 'center', gap: rf(8) },
  driverActions: { flexDirection: 'row', gap: rf(6) },
  iconButton: { padding: rf(5), backgroundColor: colors.bg, borderRadius: rf(6), borderWidth: 1, borderColor: colors.border },
  driverCardBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: rf(16), borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  driverMainInfo: { gap: rf(4) },
  driverName: { color: colors.textPrimary, fontSize: rf(16), fontWeight: '700' },
  driverContact: { color: colors.textSecondary, fontSize: rf(13) },
  driverEmailText: { color: colors.textMuted, fontSize: rf(12) },
  driverExpiryWrapper: { alignItems: 'flex-end', gap: rf(4) },
  expiryText: { fontSize: rf(13), fontWeight: '600' },
  expiredTag: { flexDirection: 'row', alignItems: 'center', gap: rf(4), backgroundColor: 'rgba(251,113,133,0.15)', paddingHorizontal: rf(6), paddingVertical: rf(2), borderRadius: rf(4) },
  expiredTagText: { color: colors.rose, fontSize: rf(10), fontWeight: '700', textTransform: 'uppercase' },

  statusBadge: { paddingHorizontal: rf(10), paddingVertical: rf(4), borderRadius: rf(20), borderWidth: 1 },
  statusText: { fontSize: rf(12), fontWeight: '700' },

  driverCardFooter: { flexDirection: 'row', justifyContent: 'space-between', padding: rf(16), backgroundColor: colors.panel },
  footerItem: { gap: rf(2) },
  footerLabel: { color: colors.textMuted, fontSize: rf(10), textTransform: 'uppercase', fontWeight: '700' },
  footerValue: { color: colors.textPrimary, fontSize: rf(13), fontWeight: '600' },

  loadingState: { padding: rf(40), alignItems: 'center', justifyContent: 'center', gap: rf(12) },
  loadingText: { color: colors.textMuted, fontSize: rf(14) },
  errorCard: { backgroundColor: 'rgba(251,113,133,0.1)', borderWidth: 1, borderColor: colors.rose, borderRadius: rf(12), padding: rf(16), alignItems: 'center', gap: rf(8), marginBottom: rf(16) },
  errorText: { color: colors.rose, fontSize: rf(14), textAlign: 'center' },
  retryButton: { flexDirection: 'row', alignItems: 'center', gap: rf(6), backgroundColor: colors.panel, paddingHorizontal: rf(12), paddingVertical: rf(6), borderRadius: rf(6), borderWidth: 1, borderColor: colors.border },
  retryButtonText: { color: colors.textPrimary, fontSize: rf(13), fontWeight: '600' },

  emptyState: { padding: rf(40), alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderRadius: rf(16), borderWidth: 1, borderColor: colors.borderSoft, borderStyle: 'dashed', marginTop: rf(8) },
  emptyStateIconWrapper: { width: rf(64), height: rf(64), borderRadius: rf(32), backgroundColor: colors.panel, alignItems: 'center', justifyContent: 'center', marginBottom: rf(16), borderWidth: 1, borderColor: colors.borderSoft },
  emptyStateTitle: { color: colors.textPrimary, fontSize: rf(16), fontWeight: '700', marginBottom: rf(8) },
  emptyStateText: { color: colors.textMuted, fontSize: rf(14), textAlign: 'center', lineHeight: rf(20) },

  bottomSheetOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.2)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: colors.surface, borderTopLeftRadius: rf(24), borderTopRightRadius: rf(24), padding: rf(15), paddingBottom: Platform.OS === 'android' ? rf(55) : rf(32), maxHeight: '90%' },
  bottomSheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: rf(24) },
  bottomSheetTitle: { color: colors.textPrimary, fontSize: rf(20), fontWeight: '700' },
  bottomSheetSubtitle: { color: colors.textMuted, fontSize: rf(13), marginTop: rf(4) },
  
  voiceButton: {
    backgroundColor: colors.amber,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: rf(12),
    borderRadius: rf(10),
    marginBottom: rf(16),
    gap: rf(8),
    elevation: 2,
    shadowColor: colors.amber,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  voiceButtonText: {
    color: '#1a1200',
    fontSize: rf(14),
    fontWeight: '800',
  },

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

  // CREDENTIALS MODAL STYLES
  credOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: rf(20) },
  credDialog: { backgroundColor: colors.surface, borderRadius: rf(20), borderWidth: 1, borderColor: colors.border, padding: rf(20), gap: rf(14), alignItems: 'center' },
  credIconHeader: { width: rf(56), height: rf(56), borderRadius: rf(28), backgroundColor: 'rgba(74,222,128,0.15)', borderWidth: 1, borderColor: 'rgba(74,222,128,0.3)', alignItems: 'center', justifyContent: 'center' },
  credTitle: { color: colors.textPrimary, fontSize: rf(20), fontWeight: '800' },
  credSubtitle: { color: colors.textMuted, fontSize: rf(13), textAlign: 'center' },
  credBox: { width: '100%', backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: rf(14), padding: rf(16), gap: rf(12) },
  credItem: { gap: rf(2) },
  credLabel: { color: colors.textMuted, fontSize: rf(11), textTransform: 'uppercase', fontWeight: '700' },
  credValName: { color: colors.textPrimary, fontSize: rf(16), fontWeight: '700' },
  credValText: { color: colors.textPrimary, fontSize: rf(14), fontWeight: '600' },
  credPassBadge: { flexDirection: 'row', alignItems: 'center', gap: rf(8), backgroundColor: 'rgba(245,158,11,0.15)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.4)', paddingHorizontal: rf(12), paddingVertical: rf(8), borderRadius: rf(8), marginTop: rf(4) },
  credValPass: { color: colors.amber, fontSize: rf(16), fontWeight: '800', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', letterSpacing: 1 },
  credNoticeBox: { flexDirection: 'row', gap: rf(8), backgroundColor: 'rgba(245,158,11,0.1)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)', padding: rf(12), borderRadius: rf(10) },
  credNoticeText: { color: colors.amber, fontSize: rf(12), flex: 1, lineHeight: rf(16), fontWeight: '600' },
  credActions: { flexDirection: 'row', gap: rf(12), width: '100%', marginTop: rf(4) },
  copyBtn: { flex: 1, height: rf(48), backgroundColor: colors.amber, borderRadius: rf(12), flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rf(6) },
  copyBtnText: { color: '#1a1200', fontSize: rf(14), fontWeight: '800' },
  doneBtn: { flex: 1, height: rf(48), backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: rf(12), alignItems: 'center', justifyContent: 'center' },
  doneBtnText: { color: colors.textPrimary, fontSize: rf(14), fontWeight: '700' },
});
