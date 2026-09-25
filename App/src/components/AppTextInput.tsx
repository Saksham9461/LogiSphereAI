import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View, Pressable } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { colors } from '../theme/colors';

type Props = TextInputProps & {
  label: string;
  error?: string;
  isPassword?: boolean;
  rightElement?: React.ReactNode;
};

export default function AppTextInput({
  label,
  error,
  style,
  isPassword,
  secureTextEntry,
  rightElement,
  ...props
}: Props) {
  const [showPassword, setShowPassword] = useState(false);

  const isPasswordInput = isPassword || secureTextEntry !== undefined;
  const effectiveSecureTextEntry = isPasswordInput ? !showPassword : false;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputContainer}>
        <TextInput
          placeholderTextColor={colors.textMuted}
          style={[
            styles.input,
            (isPasswordInput || rightElement) ? styles.inputWithRight : null,
            error ? styles.inputError : null,
            style,
          ]}
          secureTextEntry={effectiveSecureTextEntry}
          {...props}
        />
        {isPasswordInput ? (
          <Pressable
            style={styles.rightIconPressable}
            onPress={() => setShowPassword(!showPassword)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {showPassword ? (
              <EyeOff size={18} color={colors.amber} />
            ) : (
              <Eye size={18} color={colors.textMuted} />
            )}
          </Pressable>
        ) : rightElement ? (
          <View style={styles.rightIconPressable}>{rightElement}</View>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  label: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },
  inputContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    color: colors.textPrimary,
    paddingHorizontal: 14,
  },
  inputWithRight: {
    paddingRight: 44,
  },
  rightIconPressable: {
    position: 'absolute',
    right: 14,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputError: { borderColor: colors.error },
  error: { color: colors.error, fontSize: 12 },
});
