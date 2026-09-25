import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors} from '../theme/colors';

type Props = {
  title: string;
  subtitle?: string;
  meta?: string;
};

export default function EntityCard({title, subtitle, meta}: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    gap: 6,
  },
  title: {color: colors.textPrimary, fontSize: 16, fontWeight: '800'},
  subtitle: {color: colors.textSecondary},
  meta: {color: colors.textMuted, fontSize: 12},
});
