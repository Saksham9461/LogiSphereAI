import React from 'react';
import {Pressable, StyleSheet, Text} from 'react-native';
import {colors} from '../theme/colors';

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'primary' | 'secondary' | 'danger';
};

export default function PrimaryButton({title, onPress, disabled, tone = 'primary'}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({pressed}) => [
        styles.button,
        styles[tone],
        disabled ? styles.disabled : null,
        pressed ? styles.pressed : null,
      ]}>
      <Text style={[styles.text, tone === 'secondary' ? styles.secondaryText : null]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  primary: {backgroundColor: colors.amber},
  secondary: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  danger: {backgroundColor: colors.error},
  disabled: {opacity: 0.55},
  pressed: {opacity: 0.82},
  text: {color: colors.panel, fontWeight: '800'},
  secondaryText: {color: colors.textPrimary},
});
