import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
} from 'react-native';
import { ROLES } from '../constants/roles';
import { colors } from '../theme/colors';
import { ChevronDown, Check } from 'lucide-react-native';

type Props = {
  value: string;
  onChange: (roleName: string) => void;
};

export default function RoleSelector({ value, onChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedRole = ROLES.find(r => r.name === value) || ROLES[0];

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Role</Text>
      
      <Pressable
        style={styles.trigger}
        onPress={() => setIsOpen(true)}
      >
        <View style={styles.triggerContent}>
          <Text style={styles.triggerText}>{selectedRole.name}</Text>
          <Text style={styles.triggerCode}>{selectedRole.code}</Text>
        </View>
        <ChevronDown size={20} color={colors.textSecondary} />
      </Pressable>

      <Modal
        visible={isOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setIsOpen(false)}
        >
          <View style={styles.dropdownContainer}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {ROLES.map(role => {
                const isActive = role.name === value;
                return (
                  <Pressable
                    key={role.name}
                    style={[
                      styles.option,
                      isActive && { backgroundColor: `${role.color}15` },
                    ]}
                    onPress={() => {
                      onChange(role.name);
                      setIsOpen(false);
                    }}
                  >
                    <View style={styles.optionContent}>
                      <Text style={[styles.optionTitle, isActive && { color: role.color }]}>
                        {role.name}
                      </Text>
                      <View style={[styles.codeBadge, { backgroundColor: `${role.color}15` }]}>
                        <Text style={[styles.codeBadgeText, { color: role.color }]}>
                          {role.code}
                        </Text>
                      </View>
                    </View>
                    {isActive && <Check size={18} color={role.color} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  label: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },
  trigger: {
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    justifyContent: 'space-between',
  },
  triggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  triggerText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  triggerCode: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: 'Courier',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  dropdownContainer: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: '60%',
    overflow: 'hidden',
    paddingVertical: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  codeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  codeBadgeText: {
    fontSize: 10,
    fontFamily: 'Courier',
    fontWeight: '700',
  },
});
