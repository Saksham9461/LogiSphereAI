import {DarkTheme} from '@react-navigation/native';
import {colors} from './colors';

export const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.amber,
    background: colors.bg,
    card: colors.panel,
    text: colors.textPrimary,
    border: colors.borderSoft,
    notification: colors.rose,
  },
};
