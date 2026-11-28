// ==============================================================================
// LogiSphere AI Demo — Dashboard Summary Mock Fixtures
// Immutable seed data — never mutate directly; clone into screen state
// ==============================================================================

export const MOCK_DASHBOARD = {
  stats: {
    activeVehicles: 3,
    availableVehicles: 3,
    vehiclesInMaintenance: 1,
    activeTrips: 4,
    previousTrips: 2,
    driversOnDuty: 5,
    fleetUtilization: 71,
  },
  vehicleStatus: [
    { label: 'On Trip', value: 3, max: 7, color: '#14B8A6' },
    { label: 'Available', value: 3, max: 7, color: '#10B981' },
    { label: 'Maintenance', value: 1, max: 7, color: '#F43F5E' },
  ],
  recentTrips: [
    {
      id: 'trip-001',
      vehicleName: 'Freightliner Cascadia (TRUCK-11)',
      driverName: 'Raj Patel',
      source: 'Ahmedabad Central Depot',
      destination: 'Surat Distribution Hub',
      status: 'IN_TRANSIT',
      progressPercent: 62,
    },
    {
      id: 'trip-002',
      vehicleName: 'Volvo FH16 Heavy Semi (TRUCK-40)',
      driverName: 'Marcus Vance',
      source: 'Kandla Port, Gandhidham',
      destination: 'Mumbai JNPT Container Terminal',
      status: 'GOING_TO_PICKUP',
      progressPercent: 15,
    },
    {
      id: 'trip-003',
      vehicleName: 'Ashok Leyland 4140 Trailer (TRL-33)',
      driverName: 'Deepak Mehta',
      source: 'Vadodara Industrial Estate',
      destination: 'Pune Chakan Auto Zone',
      status: 'DELIVERED',
      progressPercent: 100,
    },
    {
      id: 'trip-007',
      vehicleName: 'Mahindra Supro Cargo (CARGO-08)',
      driverName: 'Kavya Nair',
      source: 'Ahmedabad Textile Market',
      destination: 'Jaipur Pink City Cloth Market',
      status: 'PICKED_UP',
      progressPercent: 38,
    },
    {
      id: 'trip-004',
      vehicleName: 'Ford Transit Cargo (VAN-05)',
      driverName: 'Elena Rostova',
      source: 'Ahmedabad Central Depot',
      destination: 'Gandhinagar Govt. Secretariat',
      status: 'ACCEPTED',
      progressPercent: 0,
    },
  ],
};
