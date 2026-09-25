export interface MockVehicle {
  tripID: string;
  vehicleID: string;
  driverID: string;
  source: string;
  destination: string;
  status: string;
  latitude: number;
  longitude: number;
  speed: number;
}

// Initial mock vehicle data with realistic coordinates (e.g., Ahmedabad, India)
export const MOCK_VEHICLES: MockVehicle[] = [
  {
    tripID: 'TRP-1001',
    vehicleID: 'V-001',
    driverID: 'D-001',
    source: 'Warehouse A',
    destination: 'Port City',
    status: 'DISPATCHED',
    latitude: 23.0225,
    longitude: 72.5714,
    speed: 42,
  },
  {
    tripID: 'TRP-1002',
    vehicleID: 'V-002',
    driverID: 'D-002',
    source: 'HQ',
    destination: 'Distribution Hub',
    status: 'DISPATCHED',
    latitude: 23.0350,
    longitude: 72.5850,
    speed: 25,
  },
  {
    tripID: 'TRP-1003',
    vehicleID: 'V-003',
    driverID: 'D-003',
    source: 'Factory',
    destination: 'Retail Outlet',
    status: 'DISPATCHED',
    latitude: 23.0150,
    longitude: 72.5600,
    speed: 35,
  }
];
