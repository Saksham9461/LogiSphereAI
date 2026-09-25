export const linking = {
  prefixes: ['transitops://'],
  config: {
    screens: {
      Auth: {
        screens: {
          Login: '',
          Signup: 'signup',
          ResetPassword: 'reset-password/:token',
        },
      },
      Main: {
        screens: {
          Dashboard: 'dashboard',
          VehicleRegistry: 'vehicle-registry',
          Drivers: 'drivers',
          TripDispatcher: 'trip-dispatcher',
          Maintenance: 'maintenance',
          FuelExpense: 'fuel-expense',
          Analytics: 'analytics',
          Settings: 'settings',
        },
      },
    },
  },
};
