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
  Droplet,
  Banknote,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { rf } from '../theme/responsive';
import { colors } from '../theme/colors';
import useFuelExpenseStore from '../store/FuelExpenseStore';
import useVehicleStore from '../store/VehicleStore';
import useTripStore from '../store/TripStore';

const inr = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const formatDate = (iso: string) => {
  if (!iso) return 'N/A';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) {
    return String(iso);
  }
};

const totalOf = (e: any) => (Number(e.toll) || 0) + (Number(e.other) || 0) + (Number(e.maint) || 0);

const TotalPill = ({ amount }: { amount: number }) => {
  const color = amount === 0 ? colors.textMuted : amount < 1000 ? colors.green : amount < 10000 ? colors.amber : colors.rose;
  const bg = amount === 0 ? colors.surface : amount < 1000 ? 'rgba(74,222,128,0.14)' : amount < 10000 ? 'rgba(255,176,32,0.14)' : 'rgba(251,113,133,0.16)';
  const border = amount === 0 ? colors.border : `${color}55`;
  return (
    <View style={[styles.totalPill, { backgroundColor: bg, borderColor: border }]}>
      <Text style={[styles.totalPillText, { color }]}>{inr(amount)}</Text>
    </View>
  );
};

export default function FuelExpenseScreen() {
  const {
    fuelLogs,
    expenses,
    fetchFuelLogs,
    fetchExpenses,
    createFuelLog,
    createExpense,
    loadingFuel,
    loadingExpenses,
    fuelError,
    expenseError,
  } = useFuelExpenseStore();

  const { vehicles, getVehicles } = useVehicleStore();
  const { trips, getTrips } = useTripStore();

  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [savingFuel, setSavingFuel] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);

  // Modals
  const [showFuelModal, setShowFuelModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState<{
    visible: boolean;
    type: 'VEHICLE' | 'TRIP';
    target: 'FUEL' | 'EXPENSE';
  } | null>(null);

  // Fuel Form
  const [fVehicleID, setFVehicleID] = useState('');
  const [fVehicleName, setFVehicleName] = useState('');
  const [fDate, setFDate] = useState(new Date().toISOString().slice(0, 10));
  const [fLiters, setFLiters] = useState('');
  const [fCost, setFCost] = useState('');

  // Expense Form
  const [eTripID, setETripID] = useState('');
  const [eTripDisplay, setETripDisplay] = useState('');
  const [eVehicleID, setEVehicleID] = useState('');
  const [eVehicleName, setEVehicleName] = useState('');
  const [eToll, setEToll] = useState('');
  const [eOther, setEOther] = useState('');
  const [eMaint, setEMaint] = useState('');

  // Load live data on screen focus
  useFocusEffect(
    useCallback(() => {
      fetchFuelLogs();
      fetchExpenses();
      getVehicles();
      if (getTrips) getTrips();
    }, [fetchFuelLogs, fetchExpenses, getVehicles, getTrips])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchFuelLogs(),
      fetchExpenses(),
      getVehicles(),
      getTrips ? getTrips() : Promise.resolve(),
    ]);
    setRefreshing(false);
  };

  // Vehicles list for selectors
  const availableVehicles = useMemo(() => {
    if (!vehicles || !Array.isArray(vehicles) || vehicles.length === 0) return [];
    return vehicles.map((v: any) => ({
      vehicleID: String(v.vehicleID || v.id || ''),
      name: String(v.name || v.registrationNumber || v.vehicleID || 'Vehicle'),
      registrationNumber: String(v.registrationNumber || ''),
    }));
  }, [vehicles]);

  // Trips list for selectors
  const availableTrips = useMemo(() => {
    if (!trips || !Array.isArray(trips) || trips.length === 0) return [];
    return trips.map((t: any) => ({
      tripID: String(t.tripID || t.id || ''),
      display: `${t.tripID || t.id || 'Trip'} ${t.source ? `(${t.source} ➔ ${t.destination || ''})` : ''}`,
      vehicleID: String(t.vehicleID || t.vehicleId || ''),
    }));
  }, [trips]);

  // Search filtering
  const q = search.trim().toLowerCase();

  const filteredFuel = useMemo(() => {
    if (!q) return fuelLogs || [];
    return (fuelLogs || []).filter((f: any) =>
      [f.vehicle, f.vehicleID, f.fuelLogId].some(
        (val) => val && String(val).toLowerCase().includes(q)
      )
    );
  }, [fuelLogs, q]);

  const filteredExpenses = useMemo(() => {
    if (!q) return expenses || [];
    return (expenses || []).filter((e: any) =>
      [e.trip, e.tripID, e.vehicle, e.vehicleID, e.expenseId].some(
        (val) => val && String(val).toLowerCase().includes(q)
      )
    );
  }, [expenses, q]);

  // Total summary calculations
  const fuelTotal = (fuelLogs || []).reduce((sum: number, f: any) => sum + (Number(f.cost) || 0), 0);
  const maintTotal = (expenses || []).reduce((sum: number, e: any) => sum + (Number(e.maint) || 0), 0);
  const operationalTotal = fuelTotal + maintTotal;

  // Form Resetters
  const resetFuelForm = () => {
    const defaultVeh = availableVehicles[0];
    setFVehicleID(defaultVeh?.vehicleID || '');
    setFVehicleName(defaultVeh?.name || '');
    setFDate(new Date().toISOString().slice(0, 10));
    setFLiters('');
    setFCost('');
  };

  const resetExpenseForm = () => {
    const defaultVeh = availableVehicles[0];
    const defaultTrip = availableTrips[0];
    setEVehicleID(defaultVeh?.vehicleID || '');
    setEVehicleName(defaultVeh?.name || '');
    setETripID(defaultTrip?.tripID || '');
    setETripDisplay(defaultTrip?.display || '');
    setEToll('');
    setEOther('');
    setEMaint('');
  };

  const handleOpenFuelModal = () => {
    resetFuelForm();
    setShowFuelModal(true);
  };

  const handleOpenExpenseModal = () => {
    resetExpenseForm();
    setShowExpenseModal(true);
  };

  // Submit Fuel
  const handleSaveFuel = async () => {
    const targetVehicleID = fVehicleID || availableVehicles[0]?.vehicleID;
    if (!targetVehicleID) {
      Alert.alert('Validation Error', 'Please select a vehicle.');
      return;
    }
    const litersNum = Number(fLiters);
    if (isNaN(litersNum) || litersNum <= 0) {
      Alert.alert('Validation Error', 'Liters must be a number greater than 0.');
      return;
    }
    const costNum = Number(fCost);
    if (isNaN(costNum) || costNum < 0) {
      Alert.alert('Validation Error', 'Cost must be a valid positive number.');
      return;
    }
    if (!fDate.trim()) {
      Alert.alert('Validation Error', 'Date is required.');
      return;
    }

    try {
      setSavingFuel(true);
      const payload = {
        vehicleID: targetVehicleID,
        date: fDate.trim(),
        liters: litersNum,
        cost: costNum,
      };

      const result = await createFuelLog(payload);
      setSavingFuel(false);

      if (result.success) {
        setShowFuelModal(false);
        resetFuelForm();
        fetchFuelLogs();
      } else {
        Alert.alert('Error', result.message || 'Failed to save fuel log.');
      }
    } catch (err: any) {
      setSavingFuel(false);
      Alert.alert('Error', err?.message || 'Failed to save fuel log.');
    }
  };

  // Submit Expense
  const handleSaveExpense = async () => {
    const targetVehicleID = eVehicleID || availableVehicles[0]?.vehicleID;
    if (!targetVehicleID) {
      Alert.alert('Validation Error', 'Please select a vehicle.');
      return;
    }
    const tollNum = Number(eToll) || 0;
    const otherNum = Number(eOther) || 0;
    const maintNum = Number(eMaint) || 0;

    if (tollNum < 0 || otherNum < 0 || maintNum < 0) {
      Alert.alert('Validation Error', 'Expense amounts cannot be negative.');
      return;
    }
    if (tollNum === 0 && otherNum === 0 && maintNum === 0) {
      Alert.alert('Validation Error', 'Please enter at least one expense amount (Toll, Other, or Maint).');
      return;
    }

    try {
      setSavingExpense(true);
      const payload = {
        vehicleID: targetVehicleID,
        tripID: eTripID || undefined,
        toll: tollNum,
        other: otherNum,
        maint: maintNum,
      };

      const result = await createExpense(payload);
      setSavingExpense(false);

      if (result.success) {
        setShowExpenseModal(false);
        resetExpenseForm();
        fetchExpenses();
      } else {
        Alert.alert('Error', result.message || 'Failed to save expense record.');
      }
    } catch (err: any) {
      setSavingExpense(false);
      Alert.alert('Error', err?.message || 'Failed to save expense record.');
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
          <Text style={styles.pageTitle}>Fuel & Expenses</Text>
        </View>

        {/* SEARCH */}
        <View style={styles.searchContainer}>
          <Search size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search vehicle or trip..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* BUTTON ROW */}
        <View style={styles.actionRow}>
          <Pressable style={styles.actionBtn} onPress={handleOpenFuelModal}>
            <Plus size={16} color="#1a1200" strokeWidth={2.5} />
            <Text style={styles.actionBtnText}>Log Fuel</Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={handleOpenExpenseModal}>
            <Plus size={16} color="#1a1200" strokeWidth={2.5} />
            <Text style={styles.actionBtnText}>Add Expense</Text>
          </Pressable>
        </View>

        {/* FUEL LOGS LIST */}
        <View style={styles.listContainer}>
          <Text style={styles.sectionTitle}>Fuel Logs</Text>
          {fuelError && fuelLogs.length === 0 ? (
            <View style={styles.errorCard}>
              <AlertTriangle size={20} color={colors.rose} />
              <Text style={styles.errorText}>{fuelError}</Text>
              <Pressable style={styles.retryBtn} onPress={() => fetchFuelLogs()}>
                <RefreshCw size={12} color={colors.textPrimary} />
                <Text style={styles.retryBtnText}>Retry</Text>
              </Pressable>
            </View>
          ) : null}

          {loadingFuel && fuelLogs.length === 0 ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="small" color={colors.amber} />
              <Text style={styles.loadingText}>Loading fuel logs...</Text>
            </View>
          ) : filteredFuel.length > 0 ? (
            filteredFuel.map((f: any) => (
              <View key={`fuel-${f.id}`} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardVehicle}>{f.vehicle}</Text>
                  <Text style={styles.cardDate}>{formatDate(f.date)}</Text>
                </View>
                <View style={styles.cardBody}>
                  <View style={styles.metricCol}>
                    <Text style={styles.metricLabel}>Liters</Text>
                    <Text style={styles.metricValue}>{f.liters} L</Text>
                  </View>
                  <View style={[styles.metricCol, { alignItems: 'flex-end' }]}>
                    <Text style={styles.metricLabel}>Cost</Text>
                    <Text style={styles.metricValue}>{inr(f.cost)}</Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Droplet size={32} color={colors.textMuted} strokeWidth={1.5} style={{ marginBottom: rf(12) }} />
              <Text style={styles.emptyStateText}>
                {search ? `No fuel logs matching "${search}".` : 'No fuel logs found. Click "+ Log Fuel" to add an entry.'}
              </Text>
            </View>
          )}
        </View>

        {/* EXPENSES LIST */}
        <View style={[styles.listContainer, { marginTop: rf(24) }]}>
          <Text style={styles.sectionTitle}>Other Expenses</Text>
          {expenseError && expenses.length === 0 ? (
            <View style={styles.errorCard}>
              <AlertTriangle size={20} color={colors.rose} />
              <Text style={styles.errorText}>{expenseError}</Text>
              <Pressable style={styles.retryBtn} onPress={() => fetchExpenses()}>
                <RefreshCw size={12} color={colors.textPrimary} />
                <Text style={styles.retryBtnText}>Retry</Text>
              </Pressable>
            </View>
          ) : null}

          {loadingExpenses && expenses.length === 0 ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="small" color={colors.amber} />
              <Text style={styles.loadingText}>Loading expense records...</Text>
            </View>
          ) : filteredExpenses.length > 0 ? (
            filteredExpenses.map((e: any) => (
              <View key={`exp-${e.id}`} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardVehicle}>{e.trip || e.tripID || 'General Expense'}</Text>
                  <Text style={styles.cardDate}>{e.vehicle}</Text>
                </View>
                <View style={styles.expenseBody}>
                  <View style={styles.expenseRow}>
                    <Text style={styles.expenseLabel}>Toll:</Text>
                    <Text style={styles.expenseValue}>{inr(e.toll)}</Text>
                  </View>
                  <View style={styles.expenseRow}>
                    <Text style={styles.expenseLabel}>Other:</Text>
                    <Text style={styles.expenseValue}>{inr(e.other)}</Text>
                  </View>
                  <View style={styles.expenseRow}>
                    <Text style={styles.expenseLabel}>Maint:</Text>
                    <Text style={styles.expenseValue}>{inr(e.maint)}</Text>
                  </View>
                  <View style={[styles.expenseRow, { borderTopWidth: 1, borderTopColor: colors.borderSoft, paddingTop: rf(12), marginTop: rf(12) }]}>
                    <Text style={[styles.expenseLabel, { fontWeight: '700', color: colors.textPrimary }]}>Total:</Text>
                    <TotalPill amount={totalOf(e)} />
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Banknote size={32} color={colors.textMuted} strokeWidth={1.5} style={{ marginBottom: rf(12) }} />
              <Text style={styles.emptyStateText}>
                {search ? `No expenses matching "${search}".` : 'No expense records found. Click "+ Add Expense" to record toll or misc costs.'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* FIXED FOOTER TOTAL */}
      <View style={styles.footerTotal}>
        <View>
          <Text style={styles.footerTotalLabel}>Total Operational Cost</Text>
          <Text style={styles.footerTotalSub}>(Fuel + Maint)</Text>
        </View>
        <Text style={styles.footerTotalValue}>{inr(operationalTotal)}</Text>
      </View>

      {/* FUEL MODAL */}
      <Modal visible={showFuelModal} transparent={true} animationType="slide" onRequestClose={() => setShowFuelModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.bottomSheetOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => setShowFuelModal(false)} />
          <View style={styles.bottomSheet}>
            <View style={styles.bottomSheetHeader}>
              <View>
                <Text style={styles.bottomSheetTitle}>Log Fuel</Text>
                <Text style={styles.bottomSheetSubtitle}>Record a refuelling entry</Text>
              </View>
              <Pressable onPress={() => setShowFuelModal(false)}>
                <X size={24} color={colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formContainer}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Vehicle *</Text>
                <Pressable
                  style={styles.dropdownInput}
                  onPress={() => setShowDropdown({ visible: true, type: 'VEHICLE', target: 'FUEL' })}
                >
                  <Text style={styles.dropdownInputText}>
                    {fVehicleName || availableVehicles.find((v) => v.vehicleID === fVehicleID)?.name || 'Select Vehicle'}
                  </Text>
                  <ChevronDown size={16} color={colors.textMuted} />
                </Pressable>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Date (YYYY-MM-DD) *</Text>
                <TextInput
                  style={styles.formInput}
                  value={fDate}
                  onChangeText={setFDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Liters *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={fLiters}
                    onChangeText={setFLiters}
                    placeholder="40"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Cost (₹) *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={fCost}
                    onChangeText={setFCost}
                    placeholder="3500"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.bottomSheetFooter}>
              <Pressable style={styles.cancelBtn} onPress={() => setShowFuelModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.saveBtn, savingFuel && { opacity: 0.6 }]}
                onPress={handleSaveFuel}
                disabled={savingFuel}
              >
                {savingFuel ? (
                  <ActivityIndicator size="small" color="#1a1200" />
                ) : (
                  <Text style={styles.saveBtnText}>Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* EXPENSE MODAL */}
      <Modal visible={showExpenseModal} transparent={true} animationType="slide" onRequestClose={() => setShowExpenseModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.bottomSheetOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => setShowExpenseModal(false)} />
          <View style={styles.bottomSheet}>
            <View style={styles.bottomSheetHeader}>
              <View>
                <Text style={styles.bottomSheetTitle}>Add Expense</Text>
                <Text style={styles.bottomSheetSubtitle}>Toll, misc, or linked maintenance</Text>
              </View>
              <Pressable onPress={() => setShowExpenseModal(false)}>
                <X size={24} color={colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formContainer}>
              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Trip (Optional)</Text>
                  <Pressable
                    style={styles.dropdownInput}
                    onPress={() => setShowDropdown({ visible: true, type: 'TRIP', target: 'EXPENSE' })}
                  >
                    <Text style={styles.dropdownInputText}>
                      {eTripDisplay || availableTrips.find((t) => t.tripID === eTripID)?.display || 'Select Trip'}
                    </Text>
                    <ChevronDown size={16} color={colors.textMuted} />
                  </Pressable>
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Vehicle *</Text>
                  <Pressable
                    style={styles.dropdownInput}
                    onPress={() => setShowDropdown({ visible: true, type: 'VEHICLE', target: 'EXPENSE' })}
                  >
                    <Text style={styles.dropdownInputText}>
                      {eVehicleName || availableVehicles.find((v) => v.vehicleID === eVehicleID)?.name || 'Select Vehicle'}
                    </Text>
                    <ChevronDown size={16} color={colors.textMuted} />
                  </Pressable>
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Toll (₹)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={eToll}
                    onChangeText={setEToll}
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Other (₹)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={eOther}
                    onChangeText={setEOther}
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Maint. (₹)</Text>
                <TextInput
                  style={styles.formInput}
                  value={eMaint}
                  onChangeText={setEMaint}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                />
              </View>
            </ScrollView>

            <View style={styles.bottomSheetFooter}>
              <Pressable style={styles.cancelBtn} onPress={() => setShowExpenseModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.saveBtn, savingExpense && { opacity: 0.6 }]}
                onPress={handleSaveExpense}
                disabled={savingExpense}
              >
                {savingExpense ? (
                  <ActivityIndicator size="small" color="#1a1200" />
                ) : (
                  <Text style={styles.saveBtnText}>Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* SHARED DROPDOWN MODAL */}
      <Modal visible={!!showDropdown} transparent={true} animationType="fade" onRequestClose={() => setShowDropdown(null)}>
        <Pressable style={styles.filterModalOverlay} onPress={() => setShowDropdown(null)}>
          <View style={styles.dropdownContainer}>
            <Text style={styles.dropdownTitle}>
              Select {showDropdown?.type === 'VEHICLE' ? 'Vehicle' : 'Trip'}
            </Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {showDropdown?.type === 'VEHICLE' ? (
                availableVehicles.length > 0 ? (
                  availableVehicles.map((v) => (
                    <Pressable
                      key={v.vehicleID}
                      style={styles.dropdownOption}
                      onPress={() => {
                        if (showDropdown.target === 'FUEL') {
                          setFVehicleID(v.vehicleID);
                          setFVehicleName(v.name);
                        } else {
                          setEVehicleID(v.vehicleID);
                          setEVehicleName(v.name);
                        }
                        setShowDropdown(null);
                      }}
                    >
                      <Text style={[styles.dropdownOptionText, { color: colors.textPrimary }]}>
                        {v.name} {v.registrationNumber ? `(${v.registrationNumber})` : ''}
                      </Text>
                    </Pressable>
                  ))
                ) : (
                  <View style={{ padding: rf(20), alignItems: 'center' }}>
                    <Text style={{ color: colors.textMuted, fontSize: rf(14) }}>No vehicles available</Text>
                  </View>
                )
              ) : availableTrips.length > 0 ? (
                availableTrips.map((t) => (
                  <Pressable
                    key={t.tripID}
                    style={styles.dropdownOption}
                    onPress={() => {
                      setETripID(t.tripID);
                      setETripDisplay(t.display);
                      if (t.vehicleID) {
                        setEVehicleID(t.vehicleID);
                        const matchVeh = availableVehicles.find((v) => v.vehicleID === t.vehicleID);
                        if (matchVeh) setEVehicleName(matchVeh.name);
                      }
                      setShowDropdown(null);
                    }}
                  >
                    <Text style={[styles.dropdownOptionText, { color: colors.textPrimary }]}>{t.display}</Text>
                  </Pressable>
                ))
              ) : (
                <View style={{ padding: rf(20), alignItems: 'center' }}>
                  <Text style={{ color: colors.textMuted, fontSize: rf(14) }}>No trips available</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingBottom: rf(40) },
  container: { paddingHorizontal: rf(16), paddingTop: rf(24), paddingBottom: rf(100), flexGrow: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: rf(20) },
  pageTitle: { color: colors.textPrimary, fontSize: rf(28), fontWeight: '800', letterSpacing: -1 },

  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: rf(12), paddingHorizontal: rf(16), height: rf(52), marginBottom: rf(16), gap: rf(10) },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: rf(15), height: '100%' },

  actionRow: { flexDirection: 'row', gap: rf(12), marginBottom: rf(24) },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.amber, paddingVertical: rf(12), borderRadius: rf(10), gap: rf(6) },
  actionBtnText: { color: '#1a1200', fontSize: rf(14), fontWeight: '700' },

  sectionTitle: { color: colors.textPrimary, fontSize: rf(14), fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: rf(12) },
  listContainer: { gap: rf(12) },

  card: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: rf(16), padding: rf(16) },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: rf(12), paddingBottom: rf(12), borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  cardVehicle: { color: colors.textPrimary, fontSize: rf(16), fontWeight: '700' },
  cardDate: { color: colors.textSecondary, fontSize: rf(13) },
  cardBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricCol: { gap: rf(4) },
  metricLabel: { color: colors.textMuted, fontSize: rf(11), textTransform: 'uppercase', fontWeight: '700' },
  metricValue: { color: colors.textPrimary, fontSize: rf(15), fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: '600' },

  expenseBody: { gap: rf(8) },
  expenseRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  expenseLabel: { color: colors.textMuted, fontSize: rf(13) },
  expenseValue: { color: colors.textSecondary, fontSize: rf(13), fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },

  totalPill: { paddingHorizontal: rf(10), paddingVertical: rf(4), borderRadius: rf(20), borderWidth: 1 },
  totalPillText: { fontSize: rf(12), fontWeight: '700', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },

  loadingState: { padding: rf(24), alignItems: 'center', justifyContent: 'center', gap: rf(8) },
  loadingText: { color: colors.textMuted, fontSize: rf(13) },
  errorCard: { backgroundColor: 'rgba(251,113,133,0.1)', borderWidth: 1, borderColor: colors.rose, borderRadius: rf(12), padding: rf(12), alignItems: 'center', gap: rf(6), marginBottom: rf(12) },
  errorText: { color: colors.rose, fontSize: rf(13), textAlign: 'center' },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: rf(4), backgroundColor: colors.panel, paddingHorizontal: rf(10), paddingVertical: rf(4), borderRadius: rf(6), borderWidth: 1, borderColor: colors.border },
  retryBtnText: { color: colors.textPrimary, fontSize: rf(12), fontWeight: '600' },

  emptyState: { padding: rf(32), alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderRadius: rf(16), borderWidth: 1, borderColor: colors.borderSoft, borderStyle: 'dashed' },
  emptyStateText: { color: colors.textMuted, fontSize: rf(14), textAlign: 'center' },

  footerTotal: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.panel, borderTopWidth: 1, borderTopColor: colors.borderStrong, paddingHorizontal: rf(20), paddingBottom: Platform.OS === 'ios' ? rf(34) : rf(20), paddingTop: rf(16), flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerTotalLabel: { color: colors.textPrimary, fontSize: rf(12), fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  footerTotalSub: { color: colors.textMuted, fontSize: rf(11) },
  footerTotalValue: { color: colors.amber, fontSize: rf(22), fontWeight: '700', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },

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
