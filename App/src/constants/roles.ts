import {colors} from '../theme/colors';

export const ROLES = [
  {name: 'Fleet Manager', value: 'ROLE_MANAGER', code: 'FM-01', color: colors.amber},
  {name: 'Dispatcher', value: 'ROLE_DISPATCHER', code: 'DP-02', color: colors.teal},
  {name: 'Safety Officer', value: 'ROLE_SAFETY_OFFICER', code: 'SO-03', color: colors.rose},
  {name: 'Financial Analyst', value: 'ROLE_FINANCE', code: 'FA-04', color: colors.violet},
  {name: 'Driver', value: 'ROLE_DRIVER', code: 'DR-05', color: colors.success},
];

export const roleMap = ROLES.reduce<Record<string, string>>((acc, role) => {
  acc[role.name] = role.value;
  return acc;
}, {});
