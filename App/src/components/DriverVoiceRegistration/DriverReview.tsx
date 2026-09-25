import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
} from 'react-native';
import { CheckCircle2, Edit3, ArrowLeft, Save } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { rf } from '../../theme/responsive';
import { DriverVoiceFormData } from '../../types/driverVoice';

interface DriverReviewProps {
  formData: DriverVoiceFormData;
  onUpdateField: (key: keyof DriverVoiceFormData, val: any) => void;
  onBack: () => void;
  onSave: () => void;
  isSaving: boolean;
}

export const DriverReview: React.FC<DriverReviewProps> = ({
  formData,
  onUpdateField,
  onBack,
  onSave,
  isSaving,
}) => {
  const [editingKey, setEditingKey] = useState<keyof DriverVoiceFormData | null>(null);
  const [tempVal, setTempVal] = useState('');

  const startEdit = (key: keyof DriverVoiceFormData, currentVal: any) => {
    setEditingKey(key);
    setTempVal(String(currentVal ?? ''));
  };

  const saveEdit = () => {
    if (editingKey) {
      onUpdateField(editingKey, tempVal);
      setEditingKey(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <CheckCircle2 size={rf(28)} color={colors.teal} />
        <View>
          <Text style={styles.title}>Review Driver Details</Text>
          <Text style={styles.subtitle}>Verify all info before saving to system roster</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {/* NAME */}
        <View style={styles.itemCard}>
          <Text style={styles.itemLabel}>NAME</Text>
          {editingKey === 'name' ? (
            <View style={styles.inlineEditRow}>
              <TextInput
                style={styles.input}
                value={tempVal}
                onChangeText={setTempVal}
                autoFocus
              />
              <Pressable style={styles.doneBtn} onPress={saveEdit}>
                <Text style={styles.doneBtnText}>Save</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.valueRow}>
              <Text style={styles.itemValue}>{formData.name || 'Not provided'}</Text>
              <Pressable style={styles.editIconBtn} onPress={() => startEdit('name', formData.name)}>
                <Edit3 size={rf(16)} color={colors.amber} />
              </Pressable>
            </View>
          )}
        </View>

        {/* LICENSE NUMBER */}
        <View style={styles.itemCard}>
          <Text style={styles.itemLabel}>DRIVING LICENCE NUMBER</Text>
          {editingKey === 'licenseNumber' ? (
            <View style={styles.inlineEditRow}>
              <TextInput
                style={styles.input}
                value={tempVal}
                onChangeText={setTempVal}
                autoFocus
              />
              <Pressable style={styles.doneBtn} onPress={saveEdit}>
                <Text style={styles.doneBtnText}>Save</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.valueRow}>
              <Text style={styles.itemValue}>{formData.licenseNumber || 'Not provided'}</Text>
              <Pressable style={styles.editIconBtn} onPress={() => startEdit('licenseNumber', formData.licenseNumber)}>
                <Edit3 size={rf(16)} color={colors.amber} />
              </Pressable>
            </View>
          )}
        </View>

        {/* EXPIRY DATE */}
        <View style={styles.itemCard}>
          <Text style={styles.itemLabel}>LICENCE EXPIRY DATE</Text>
          {editingKey === 'licenseExpiry' ? (
            <View style={styles.inlineEditRow}>
              <TextInput
                style={styles.input}
                value={tempVal}
                onChangeText={setTempVal}
                placeholder="MM/YYYY"
                autoFocus
              />
              <Pressable style={styles.doneBtn} onPress={saveEdit}>
                <Text style={styles.doneBtnText}>Save</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.valueRow}>
              <Text style={styles.itemValue}>{formData.licenseExpiry || 'Not provided'}</Text>
              <Pressable style={styles.editIconBtn} onPress={() => startEdit('licenseExpiry', formData.licenseExpiry)}>
                <Edit3 size={rf(16)} color={colors.amber} />
              </Pressable>
            </View>
          )}
        </View>

        {/* CONTACT */}
        <View style={styles.itemCard}>
          <Text style={styles.itemLabel}>CONTACT PHONE</Text>
          {editingKey === 'contact' ? (
            <View style={styles.inlineEditRow}>
              <TextInput
                style={styles.input}
                value={tempVal}
                onChangeText={setTempVal}
                keyboardType="phone-pad"
                autoFocus
              />
              <Pressable style={styles.doneBtn} onPress={saveEdit}>
                <Text style={styles.doneBtnText}>Save</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.valueRow}>
              <Text style={styles.itemValue}>{formData.contact || 'Not provided'}</Text>
              <Pressable style={styles.editIconBtn} onPress={() => startEdit('contact', formData.contact)}>
                <Edit3 size={rf(16)} color={colors.amber} />
              </Pressable>
            </View>
          )}
        </View>

        {/* SYSTEM DEFAULTS */}
        <View style={styles.rowTwoCols}>
          <View style={[styles.itemCard, { flex: 1 }]}>
            <Text style={styles.itemLabel}>TRIPS COMPLETED</Text>
            <Text style={styles.systemValue}>{formData.tripsCompleted ?? 0}</Text>
          </View>
          <View style={[styles.itemCard, { flex: 1 }]}>
            <Text style={styles.itemLabel}>SAFETY SCORE</Text>
            <Text style={[styles.systemValue, { color: colors.teal }]}>{formData.safetyScore ?? 100}%</Text>
          </View>
        </View>

        <View style={styles.itemCard}>
          <Text style={styles.itemLabel}>INITIAL STATUS</Text>
          <Text style={styles.systemValue}>{formData.status || 'Available'}</Text>
        </View>
      </ScrollView>

      {/* FOOTER ACTIONS */}
      <View style={styles.footer}>
        <Pressable style={styles.backBtn} onPress={onBack} disabled={isSaving}>
          <ArrowLeft size={rf(18)} color={colors.textSecondary} />
          <Text style={styles.backBtnText}>Back</Text>
        </Pressable>

        <Pressable
          style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
          onPress={onSave}
          disabled={isSaving}
        >
          <Save size={rf(18)} color="#1a1200" strokeWidth={2.5} />
          <Text style={styles.saveBtnText}>
            {isSaving ? 'Registering...' : 'Save Driver'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: rf(16),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rf(12),
    backgroundColor: colors.surface,
    padding: rf(16),
    borderRadius: rf(16),
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  title: {
    color: colors.textPrimary,
    fontSize: rf(18),
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: rf(12),
    marginTop: rf(2),
  },
  list: {
    gap: rf(12),
    paddingBottom: rf(16),
  },
  itemCard: {
    backgroundColor: colors.surface,
    padding: rf(14),
    borderRadius: rf(12),
    borderWidth: 1,
    borderColor: colors.border,
    gap: rf(4),
  },
  rowTwoCols: {
    flexDirection: 'row',
    gap: rf(12),
  },
  itemLabel: {
    color: colors.textMuted,
    fontSize: rf(10),
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  valueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemValue: {
    color: colors.textPrimary,
    fontSize: rf(16),
    fontWeight: '700',
  },
  systemValue: {
    color: colors.textPrimary,
    fontSize: rf(15),
    fontWeight: '700',
    marginTop: rf(2),
  },
  editIconBtn: {
    padding: rf(6),
    backgroundColor: colors.panel,
    borderRadius: rf(8),
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  inlineEditRow: {
    flexDirection: 'row',
    gap: rf(8),
    alignItems: 'center',
    marginTop: rf(4),
  },
  input: {
    flex: 1,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.amber,
    borderRadius: rf(8),
    paddingHorizontal: rf(10),
    height: rf(40),
    color: colors.textPrimary,
    fontSize: rf(14),
    fontWeight: '600',
  },
  doneBtn: {
    backgroundColor: colors.amber,
    paddingHorizontal: rf(14),
    height: rf(40),
    borderRadius: rf(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    color: '#1a1200',
    fontSize: rf(13),
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    gap: rf(12),
    marginTop: 'auto',
  },
  backBtn: {
    flex: 1,
    flexDirection: 'row',
    height: rf(48),
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: rf(12),
    alignItems: 'center',
    justifyContent: 'center',
    gap: rf(6),
  },
  backBtnText: {
    color: colors.textSecondary,
    fontSize: rf(15),
    fontWeight: '700',
  },
  saveBtn: {
    flex: 1.5,
    flexDirection: 'row',
    height: rf(48),
    backgroundColor: colors.amber,
    borderRadius: rf(12),
    alignItems: 'center',
    justifyContent: 'center',
    gap: rf(8),
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#1a1200',
    fontSize: rf(15),
    fontWeight: '800',
  },
});
