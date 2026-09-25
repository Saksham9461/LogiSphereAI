import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
} from 'react-native';
import { RefreshCw, Edit3, Check, Volume2 } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { rf } from '../../theme/responsive';

interface VoiceResultCardProps {
  rawSpeech: string;
  normalizedValue: string;
  fieldLabel: string;
  placeholder?: string;
  isEditing: boolean;
  onRetry: () => void;
  onEditToggle: () => void;
  onConfirm: (finalValue: string) => void;
  validationError?: string;
}

export const VoiceResultCard: React.FC<VoiceResultCardProps> = ({
  rawSpeech,
  normalizedValue,
  fieldLabel,
  placeholder,
  isEditing,
  onRetry,
  onEditToggle,
  onConfirm,
  validationError,
}) => {
  const [editedText, setEditedText] = useState(normalizedValue);

  useEffect(() => {
    setEditedText(normalizedValue);
  }, [normalizedValue]);

  const handleConfirmPress = () => {
    onConfirm(isEditing ? editedText : normalizedValue);
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.heardHeader}>
          <Volume2 size={rf(16)} color={colors.teal} />
          <Text style={styles.heardLabel}>You said:</Text>
        </View>
        <Text style={styles.fieldTag}>{fieldLabel}</Text>
      </View>

      <View style={styles.speechBox}>
        <Text style={styles.rawSpeechText}>"{rawSpeech || '...'}"</Text>
      </View>

      {isEditing ? (
        <View style={styles.editContainer}>
          <Text style={styles.editInputLabel}>Edit Value Manually:</Text>
          <TextInput
            style={[styles.editInput, validationError && styles.editInputError]}
            value={editedText}
            onChangeText={setEditedText}
            placeholder={placeholder || 'Enter value'}
            placeholderTextColor={colors.textMuted}
            autoFocus
          />
        </View>
      ) : (
        <View style={styles.normalizedBox}>
          <Text style={styles.normalizedLabel}>Parsed Value:</Text>
          <Text style={styles.normalizedValueText}>{normalizedValue || rawSpeech}</Text>
        </View>
      )}

      {validationError ? (
        <Text style={styles.errorText}>⚠️ {validationError}</Text>
      ) : null}

      {/* ACTION BUTTONS: [ Retry ] [ Edit ] [ Confirm ] */}
      <View style={styles.actionsRow}>
        <Pressable style={styles.retryButton} onPress={onRetry}>
          <RefreshCw size={rf(16)} color={colors.textSecondary} />
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>

        <Pressable style={styles.editButton} onPress={onEditToggle}>
          <Edit3 size={rf(16)} color={colors.amber} />
          <Text style={styles.editText}>{isEditing ? 'Cancel Edit' : 'Edit'}</Text>
        </Pressable>

        <Pressable style={styles.confirmButton} onPress={handleConfirmPress}>
          <Check size={rf(18)} color="#1a1200" strokeWidth={3} />
          <Text style={styles.confirmText}>Confirm</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: rf(16),
    padding: rf(16),
    gap: rf(12),
    marginVertical: rf(8),
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rf(6),
  },
  heardLabel: {
    color: colors.teal,
    fontSize: rf(13),
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  fieldTag: {
    color: colors.textMuted,
    fontSize: rf(11),
    fontWeight: '600',
    backgroundColor: colors.panel,
    paddingHorizontal: rf(8),
    paddingVertical: rf(2),
    borderRadius: rf(6),
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  speechBox: {
    backgroundColor: colors.panel,
    padding: rf(12),
    borderRadius: rf(10),
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  rawSpeechText: {
    color: colors.textPrimary,
    fontSize: rf(16),
    fontWeight: '600',
    fontStyle: 'italic',
  },
  normalizedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(20, 184, 166, 0.08)',
    padding: rf(12),
    borderRadius: rf(10),
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.25)',
  },
  normalizedLabel: {
    color: colors.textMuted,
    fontSize: rf(12),
    fontWeight: '600',
  },
  normalizedValueText: {
    color: colors.textPrimary,
    fontSize: rf(16),
    fontWeight: '800',
  },
  editContainer: {
    gap: rf(6),
  },
  editInputLabel: {
    color: colors.textMuted,
    fontSize: rf(11),
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  editInput: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.amber,
    borderRadius: rf(8),
    paddingHorizontal: rf(12),
    height: rf(46),
    color: colors.textPrimary,
    fontSize: rf(15),
    fontWeight: '600',
  },
  editInputError: {
    borderColor: colors.rose,
  },
  errorText: {
    color: colors.rose,
    fontSize: rf(12),
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: rf(10),
    marginTop: rf(4),
  },
  retryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: rf(42),
    borderRadius: rf(10),
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    gap: rf(6),
  },
  retryText: {
    color: colors.textSecondary,
    fontSize: rf(13),
    fontWeight: '700',
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: rf(42),
    borderRadius: rf(10),
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    gap: rf(6),
  },
  editText: {
    color: colors.amber,
    fontSize: rf(13),
    fontWeight: '700',
  },
  confirmButton: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: rf(42),
    borderRadius: rf(10),
    backgroundColor: colors.amber,
    gap: rf(6),
  },
  confirmText: {
    color: '#1a1200',
    fontSize: rf(14),
    fontWeight: '800',
  },
});
