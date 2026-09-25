import React from 'react';
import {ActivityIndicator, Modal, StyleSheet, Text, View} from 'react-native';
import {colors} from '../theme/colors';

type Props = {
  show: boolean;
  text?: string;
};

export default function Loader({show, text = 'Loading'}: Props) {
  return (
    <Modal visible={show} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.panel}>
          <ActivityIndicator color={colors.amber} />
          <Text style={styles.text}>{text}</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  panel: {
    minWidth: 150,
    borderRadius: 12,
    padding: 18,
    gap: 12,
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: {color: colors.textPrimary, fontWeight: '600'},
});
